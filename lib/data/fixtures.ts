import type { LeaderboardWallet, NormalizedEvent, RecentFill, WalletEnrichment } from "@/lib/types";
import { rankWallets, scoreWalletBreakdown } from "@/lib/scoring";

const rawWallets: LeaderboardWallet[] = [
  {
    user: "0x5b5d51203a0f9079f8aeb098a6523a13f298c060",
    displayName: "DeltaHouse",
    cumulativePnl: 1849200,
    cumulativeFees: 128400,
    netPnl: 1720800,
    totalVolume: 94200000,
    totalFills: 6420,
    activeDays: 24,
    winningDays: 19,
    winRatePct: 79.2,
    score: 0,
    scoreBreakdown: emptyScoreBreakdown()
  },
  {
    user: "0x91c65e75f9a869900859ce66bd8719555e66e9c3",
    displayName: "RangeHunter",
    cumulativePnl: 982000,
    cumulativeFees: 88400,
    netPnl: 893600,
    totalVolume: 31200000,
    totalFills: 2190,
    activeDays: 21,
    winningDays: 16,
    winRatePct: 76.2,
    score: 0,
    scoreBreakdown: emptyScoreBreakdown()
  },
  {
    user: "0x82cd5683ef2013c30915cd84c940f378ad782d4b",
    displayName: "VaultCompass",
    cumulativePnl: 744100,
    cumulativeFees: 42200,
    netPnl: 701900,
    totalVolume: 18700000,
    totalFills: 612,
    activeDays: 17,
    winningDays: 13,
    winRatePct: 76.5,
    score: 0,
    scoreBreakdown: emptyScoreBreakdown()
  },
  {
    user: "0xd93afcb4a933394963ab2a44c83de29073ae226a",
    displayName: "PerpSignal",
    cumulativePnl: 629300,
    cumulativeFees: 93900,
    netPnl: 535400,
    totalVolume: 75500000,
    totalFills: 17840,
    activeDays: 28,
    winningDays: 18,
    winRatePct: 64.3,
    score: 0,
    scoreBreakdown: emptyScoreBreakdown()
  },
  {
    user: "0x42be63db85e660e1cede260b10a66baae89bc3c8",
    displayName: "ConvexityDesk",
    cumulativePnl: 512800,
    cumulativeFees: 51700,
    netPnl: 461100,
    totalVolume: 22600000,
    totalFills: 1450,
    activeDays: 14,
    winningDays: 11,
    winRatePct: 78.6,
    score: 0,
    scoreBreakdown: emptyScoreBreakdown()
  },
  {
    user: "0xbbb9b4f5b99283da5538214e0b9ebe4ffd0a6895",
    displayName: "BasisPilot",
    cumulativePnl: 438400,
    cumulativeFees: 34800,
    netPnl: 403600,
    totalVolume: 11100000,
    totalFills: 772,
    activeDays: 12,
    winningDays: 9,
    winRatePct: 75,
    score: 0,
    scoreBreakdown: emptyScoreBreakdown()
  }
];

export const fixtureWallets = rankWallets(
  rawWallets.map((wallet) => {
    const scoreBreakdown = scoreWalletBreakdown(wallet);
    return {
      ...wallet,
      scoreBreakdown,
      score: scoreBreakdown.total
    };
  })
);

export const fixtureRecentFills: Record<string, RecentFill[]> = {
  "0x5b5d51203a0f9079f8aeb098a6523a13f298c060": [
    {
      time: "2026-04-30T10:41:18.000Z",
      coin: "BTC",
      side: "B",
      dir: "Open Long",
      price: 94120,
      size: 4.2,
      closedPnl: 0,
      fee: 182.4,
      isLiquidation: false,
      startPosition: 1.1,
      hash: "0x7a3d7c7b6d48d765e34b7335512c9164d517ff88a8f2c65ca364a95deefb1234"
    },
    {
      time: "2026-04-30T09:18:42.000Z",
      coin: "ETH",
      side: "A",
      dir: "Close Short",
      price: 3124.8,
      size: 82,
      closedPnl: 24840,
      fee: 96.5,
      isLiquidation: false,
      startPosition: -82,
      hash: "0x9c53fef17fd3be79ea7e1cc067ddc7af5e415f40b135c4377598ab44edcaf001"
    }
  ],
  "0x91c65e75f9a869900859ce66bd8719555e66e9c3": [
    {
      time: "2026-04-30T08:33:09.000Z",
      coin: "HYPE",
      side: "B",
      dir: "Close Short",
      price: 28.44,
      size: 12800,
      closedPnl: 18420,
      fee: 61.2,
      isLiquidation: false,
      startPosition: -12800,
      hash: "0x52788c70e83330c053f20439dde98b02015c005683364f92f64137c3a7370aaa"
    }
  ]
};

export const fixtureEvents: NormalizedEvent[] = [
  {
    id: "fixture-970844555-0",
    blockNumber: 970844555,
    blockTime: "2026-04-24T09:49:04.793Z",
    txHash: "0x52788c70e83330c053f20439dde98b02015c005683364f92f64137c3a7370aaa",
    kind: "LedgerUpdate",
    eventType: "send",
    wallet: "0x91c65e75f9a869900859ce66bd8719555e66e9c3",
    counterparty: "0x82cd5683ef2013c30915cd84c940f378ad782d4b",
    amount: 12.5,
    amountUsd: 12.5,
    token: "USDC",
    description: "RangeHunter sent 12.5 USDC",
    receivedAt: "2026-04-30T12:00:00.000Z"
  },
  {
    id: "fixture-970844811-0",
    blockNumber: 970844811,
    blockTime: "2026-04-24T09:52:28.112Z",
    txHash: "0xba9bcc1734fd7ac2bc15042ee1903102104a00fccff099945e647769f3f154ad",
    kind: "LedgerUpdate",
    eventType: "vaultWithdraw",
    wallet: "0xbbb9b4f5b99283da5538214e0b9ebe4ffd0a6895",
    counterparty: "0x1e37a337ed460039d1b15bd3bc489de789768d5e",
    amountUsd: 1965.000895,
    token: "USDC",
    description: "BasisPilot withdrew 1.97K USD from a vault",
    receivedAt: "2026-04-30T12:01:00.000Z"
  }
];

export const fixtureEnrichment: Record<string, WalletEnrichment> = {
  "0x5b5d51203a0f9079f8aeb098a6523a13f298c060": {
    source: "fixture",
    accountValue: 4_820_000,
    withdrawable: 2_940_000,
    marginUsed: 1_120_000,
    notionalExposure: 13_400_000,
    openOrderCount: 7,
    makerFeeRate: 0.0001,
    takerFeeRate: 0.00035,
    positions: [
      {
        coin: "BTC",
        size: 5.3,
        entryPrice: 92_840,
        positionValue: 498_836,
        unrealizedPnl: 67_840,
        returnOnEquityPct: 18.4,
        leverage: 5,
        marginUsed: 99_767
      },
      {
        coin: "ETH",
        size: -120,
        entryPrice: 3_181,
        positionValue: 374_976,
        unrealizedPnl: 22_140,
        returnOnEquityPct: 11.8,
        leverage: 4,
        marginUsed: 93_744
      },
      {
        coin: "HYPE",
        size: 18_400,
        entryPrice: 27.4,
        positionValue: 523_296,
        unrealizedPnl: 41_920,
        returnOnEquityPct: 16.1,
        leverage: 3,
        marginUsed: 174_432
      }
    ]
  },
  "0x91c65e75f9a869900859ce66bd8719555e66e9c3": {
    source: "fixture",
    accountValue: 1_940_000,
    withdrawable: 1_120_000,
    marginUsed: 420_000,
    notionalExposure: 4_900_000,
    openOrderCount: 3,
    makerFeeRate: 0.00012,
    takerFeeRate: 0.00038,
    positions: [
      {
        coin: "HYPE",
        size: 12_800,
        entryPrice: 27.01,
        positionValue: 364_032,
        unrealizedPnl: 18_420,
        returnOnEquityPct: 13.2,
        leverage: 3,
        marginUsed: 121_344
      }
    ]
  }
};

function emptyScoreBreakdown() {
  return {
    pnl: 0,
    winRate: 0,
    consistency: 0,
    volume: 0,
    activityPenalty: 0,
    total: 0
  };
}
