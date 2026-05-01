import { HyperliquidSDK } from "@quicknode/hyperliquid-sdk";
import { getHyperliquidRpcUrl } from "@/lib/config";
import { toNumber } from "@/lib/number";
import type { WalletEnrichment, WalletPosition } from "@/lib/types";

type UnknownRecord = Record<string, unknown>;

export async function getHyperliquidEnrichment(address: string): Promise<WalletEnrichment> {
  const endpoint = getHyperliquidRpcUrl();

  if (!endpoint) {
    return {
      source: "unavailable",
      positions: [],
      warning: "QUICKNODE_HYPERLIQUID_RPC_URL is not configured"
    };
  }

  try {
    const sdk = new HyperliquidSDK(endpoint, { timeout: 10_000 });
    const [clearinghouseState, openOrders, userFees] = await Promise.all([
      sdk.info.clearinghouseState(address),
      sdk.info.openOrders(address),
      sdk.info.userFees(address)
    ]);

    return mapEnrichment(clearinghouseState, openOrders, userFees);
  } catch (error) {
    return {
      source: "unavailable",
      positions: [],
      warning: error instanceof Error ? error.message : "Unable to load Hyperliquid enrichment"
    };
  }
}

export function mapEnrichment(
  clearinghouseState: UnknownRecord,
  openOrders: UnknownRecord[],
  userFees: UnknownRecord
): WalletEnrichment {
  const marginSummary = readRecord(
    clearinghouseState.crossMarginSummary ?? clearinghouseState.marginSummary
  );
  const positions = Array.isArray(clearinghouseState.assetPositions)
    ? clearinghouseState.assetPositions
        .map(mapPosition)
        .filter((position): position is WalletPosition => Boolean(position))
        .sort((a, b) => Math.abs(b.positionValue ?? 0) - Math.abs(a.positionValue ?? 0))
        .slice(0, 3)
    : [];

  const feeSchedule = readRecord(userFees.feeSchedule);

  return {
    source: "sdk",
    accountValue: readOptionalNumber(marginSummary.accountValue),
    withdrawable: readOptionalNumber(clearinghouseState.withdrawable),
    marginUsed: readOptionalNumber(
      marginSummary.totalMarginUsed ?? clearinghouseState.marginUsed
    ),
    notionalExposure: readOptionalNumber(
      marginSummary.totalNtlPos ?? marginSummary.totalNotionalPosition
    ),
    openOrderCount: openOrders.length,
    makerFeeRate: readOptionalNumber(
      userFees.makerFeeRate ?? userFees.userAddRate ?? feeSchedule.add
    ),
    takerFeeRate: readOptionalNumber(
      userFees.takerFeeRate ?? userFees.userCrossRate ?? feeSchedule.cross
    ),
    positions
  };
}

function mapPosition(raw: unknown): WalletPosition | undefined {
  const wrapper = readRecord(raw);
  const position = readRecord(wrapper.position ?? raw);
  const leverage = readRecord(position.leverage);
  const coin = typeof position.coin === "string" ? position.coin : "";
  if (!coin) return undefined;

  return {
    coin,
    size: toNumber(position.szi ?? position.size),
    entryPrice: readOptionalNumber(position.entryPx ?? position.entryPrice),
    positionValue: readOptionalNumber(position.positionValue),
    unrealizedPnl: readOptionalNumber(position.unrealizedPnl),
    returnOnEquityPct: readOptionalNumber(position.returnOnEquity, (value) => value * 100),
    leverage: readOptionalNumber(leverage.value ?? position.leverage),
    marginUsed: readOptionalNumber(position.marginUsed)
  };
}

function readRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function readOptionalNumber(value: unknown, transform?: (value: number) => number) {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = toNumber(value, Number.NaN);
  if (!Number.isFinite(parsed)) return undefined;
  return transform ? transform(parsed) : parsed;
}
