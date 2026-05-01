import { normalizeAddress } from "@/lib/address";
import {
  getAllowUnlistedWalletProfiles,
  getLeaderboardCacheTtlMs,
  getWalletProfileCacheTtlMs
} from "@/lib/config";
import {
  fixtureEnrichment,
  fixtureEvents,
  fixtureRecentFills,
  fixtureWallets
} from "@/lib/data/fixtures";
import { getEventLimit, readLatestEvents } from "@/lib/events-db";
import { getHyperliquidEnrichment } from "@/lib/hyperliquid";
import { toNumber } from "@/lib/number";
import { displayNamesQuery, leaderboardQuery, recentFillsQuery } from "@/lib/queries";
import { runSqlExplorerQuery } from "@/lib/quicknode-sql";
import { mapLeaderboardRow, rankWallets, type RawLeaderboardRow } from "@/lib/scoring";
import type {
  EventsResponse,
  LeaderboardResponse,
  LeaderboardWallet,
  RecentFill,
  WalletProfileResponse
} from "@/lib/types";

type DisplayNameRow = {
  user: string;
  display_name: string;
};

type RecentFillRow = {
  time: string;
  coin: string;
  side: "B" | "A";
  dir: string;
  price: unknown;
  size: unknown;
  closed_pnl: unknown;
  fee: unknown;
  is_liquidation: unknown;
  start_position: unknown;
  hash?: string;
};

const globalDataCache = globalThis as typeof globalThis & {
  __smartMoneyLeaderboardCache?: {
    expiresAt: number;
    response: LeaderboardResponse;
  };
  __smartMoneyWalletProfileCache?: Map<
    string,
    {
      expiresAt: number;
      response: WalletProfileResponse;
    }
  >;
};

export async function getLeaderboard(): Promise<LeaderboardResponse> {
  const cached = globalDataCache.__smartMoneyLeaderboardCache;
  if (cached && cached.expiresAt > Date.now()) return cached.response;

  try {
    const response = await getLiveLeaderboardSnapshot();
    globalDataCache.__smartMoneyLeaderboardCache = {
      response,
      expiresAt: Date.now() + getLeaderboardCacheTtlMs()
    };
    return response;
  } catch (error) {
    const fallback = {
      source: "fixture" as const,
      generatedAt: new Date().toISOString(),
      wallets: fixtureWallets,
      warning: error instanceof Error ? error.message : "Unable to load live leaderboard"
    };
    globalDataCache.__smartMoneyLeaderboardCache = {
      response: fallback,
      expiresAt: Date.now() + getLeaderboardCacheTtlMs()
    };
    return fallback;
  }
}

export async function getLiveLeaderboardSnapshot(
  options: { force?: boolean } = {}
): Promise<LeaderboardResponse> {
  if (!options.force) {
    const cached = globalDataCache.__smartMoneyLeaderboardCache;
    if (cached && cached.response.source === "live" && cached.expiresAt > Date.now()) {
      return cached.response;
    }
  }

  const response = await runSqlExplorerQuery<RawLeaderboardRow>(leaderboardQuery());
  const wallets = response.data.map((row) => mapLeaderboardRow(row, toNumber));
  const namedWallets = await attachDisplayNames(rankWallets(wallets));

  const leaderboard = {
    source: "live" as const,
    generatedAt: new Date().toISOString(),
    wallets: namedWallets
  };

  globalDataCache.__smartMoneyLeaderboardCache = {
    response: leaderboard,
    expiresAt: Date.now() + getLeaderboardCacheTtlMs()
  };

  return leaderboard;
}

export async function getWalletProfile(
  address: string,
  options: { allowUnlisted?: boolean } = {}
): Promise<WalletProfileResponse> {
  const normalizedAddress = normalizeAddress(address);
  const leaderboard = await getLeaderboard();
  const leaderboardWallet = leaderboard.wallets.find((entry) => entry.user === normalizedAddress);
  const allowUnlisted = options.allowUnlisted ?? getAllowUnlistedWalletProfiles();

  if (!allowUnlisted && !leaderboardWallet) {
    throw new Error("Wallet is not in the current leaderboard");
  }

  const cached = getCachedWalletProfile(normalizedAddress);
  if (cached) return cached;

  const wallet = leaderboardWallet ?? fallbackWallet(normalizedAddress);

  if (leaderboard.source === "fixture") {
    return cacheWalletProfile(normalizedAddress, {
      source: "fixture",
      generatedAt: new Date().toISOString(),
      profile: {
        wallet,
        recentFills: fixtureRecentFills[normalizedAddress] ?? [],
        enrichment: fixtureEnrichment[normalizedAddress] ?? {
          source: "fixture",
          positions: [],
          warning: "No fixture enrichment is available for this wallet"
        }
      },
      warning: leaderboard.warning
    });
  }

  try {
    const [response, enrichment] = await Promise.all([
      runSqlExplorerQuery<RecentFillRow>(recentFillsQuery(normalizedAddress)),
      getHyperliquidEnrichment(normalizedAddress)
    ]);

    return cacheWalletProfile(normalizedAddress, {
      source: "live",
      generatedAt: new Date().toISOString(),
      profile: {
        wallet,
        recentFills: response.data.map(mapRecentFill),
        enrichment
      }
    });
  } catch (error) {
    return cacheWalletProfile(normalizedAddress, {
      source: "fixture",
      generatedAt: new Date().toISOString(),
      profile: {
        wallet,
        recentFills: fixtureRecentFills[normalizedAddress] ?? [],
        enrichment: fixtureEnrichment[normalizedAddress] ?? {
          source: "unavailable",
          positions: [],
          warning: "Unable to load live wallet enrichment"
        }
      },
      warning: error instanceof Error ? error.message : "Unable to load live wallet profile"
    });
  }
}

export async function getRecentEvents(options: { limit?: number } = {}): Promise<EventsResponse> {
  try {
    const result = await readLatestEvents(getEventLimit(options.limit));
    const events = result.events;

    return {
      source: result.configured && events.length > 0 ? "db" : "fixture",
      generatedAt: new Date().toISOString(),
      events: result.configured && events.length > 0 ? events : fixtureEvents.slice(0, getEventLimit(options.limit))
    };
  } catch (error) {
    return {
      source: "fixture",
      generatedAt: new Date().toISOString(),
      events: fixtureEvents.slice(0, getEventLimit(options.limit)),
      warning: error instanceof Error ? error.message : "Unable to load persisted events"
    };
  }
}

function getCachedWalletProfile(address: string) {
  const cache = globalDataCache.__smartMoneyWalletProfileCache;
  const cached = cache?.get(address);
  if (cached && cached.expiresAt > Date.now()) return cached.response;
  return undefined;
}

function cacheWalletProfile(address: string, response: WalletProfileResponse) {
  const cache = globalDataCache.__smartMoneyWalletProfileCache ?? new Map();
  cache.set(address, {
    expiresAt: Date.now() + getWalletProfileCacheTtlMs(),
    response
  });
  globalDataCache.__smartMoneyWalletProfileCache = cache;
  return response;
}

async function attachDisplayNames(wallets: LeaderboardWallet[]) {
  if (wallets.length === 0) return wallets;

  try {
    const response = await runSqlExplorerQuery<DisplayNameRow>(
      displayNamesQuery(wallets.map((wallet) => wallet.user))
    );
    const names = new Map(
      response.data.map((row) => [row.user.toLowerCase(), row.display_name] as const)
    );

    return wallets.map((wallet) => ({
      ...wallet,
      displayName: names.get(wallet.user) || wallet.displayName
    }));
  } catch {
    return wallets;
  }
}

function mapRecentFill(row: RecentFillRow): RecentFill {
  return {
    time: row.time,
    coin: row.coin,
    side: row.side,
    dir: row.dir,
    price: toNumber(row.price),
    size: toNumber(row.size),
    closedPnl: toNumber(row.closed_pnl),
    fee: toNumber(row.fee),
    isLiquidation: Boolean(toNumber(row.is_liquidation)),
    startPosition: toNumber(row.start_position),
    hash: row.hash
  };
}

function fallbackWallet(address: string): LeaderboardWallet {
  return {
    user: address,
    cumulativePnl: 0,
    cumulativeFees: 0,
    netPnl: 0,
    totalVolume: 0,
    totalFills: 0,
    activeDays: 0,
    winningDays: 0,
    winRatePct: 0,
    score: 0,
    scoreBreakdown: {
      pnl: 0,
      winRate: 0,
      consistency: 0,
      volume: 0,
      activityPenalty: 0,
      total: 0
    }
  };
}
