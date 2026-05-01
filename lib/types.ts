export type DataSource = "live" | "fixture";

export type ScoreBreakdown = {
  pnl: number;
  winRate: number;
  consistency: number;
  volume: number;
  activityPenalty: number;
  total: number;
};

export type LeaderboardWallet = {
  user: string;
  displayName?: string;
  cumulativePnl: number;
  cumulativeFees: number;
  netPnl: number;
  totalVolume: number;
  totalFills: number;
  activeDays: number;
  winningDays: number;
  winRatePct: number;
  score: number;
  scoreBreakdown: ScoreBreakdown;
};

export type RecentFill = {
  time: string;
  coin: string;
  side: "B" | "A";
  dir: string;
  price: number;
  size: number;
  closedPnl: number;
  fee: number;
  isLiquidation: boolean;
  startPosition: number;
  hash?: string;
};

export type WalletProfile = {
  wallet: LeaderboardWallet;
  recentFills: RecentFill[];
  enrichment?: WalletEnrichment;
};

export type LeaderboardResponse = {
  source: DataSource;
  generatedAt: string;
  wallets: LeaderboardWallet[];
  warning?: string;
};

export type WalletProfileResponse = {
  source: DataSource;
  generatedAt: string;
  profile: WalletProfile;
  warning?: string;
};

export type NormalizedEvent = {
  id: string;
  blockNumber: number;
  blockTime: string;
  txHash: string;
  kind: string;
  eventType: string;
  wallet: string;
  counterparty?: string;
  amount?: number;
  amountUsd?: number;
  token?: string;
  description: string;
  receivedAt: string;
};

export type EventsResponse = {
  source: "db" | "fixture";
  generatedAt: string;
  events: NormalizedEvent[];
  warning?: string;
};

export type WalletEnrichmentSource = "sdk" | "fixture" | "unavailable";

export type WalletPosition = {
  coin: string;
  size: number;
  entryPrice?: number;
  positionValue?: number;
  unrealizedPnl?: number;
  returnOnEquityPct?: number;
  leverage?: number;
  marginUsed?: number;
};

export type WalletEnrichment = {
  source: WalletEnrichmentSource;
  accountValue?: number;
  withdrawable?: number;
  marginUsed?: number;
  notionalExposure?: number;
  openOrderCount?: number;
  makerFeeRate?: number;
  takerFeeRate?: number;
  positions: WalletPosition[];
  warning?: string;
};
