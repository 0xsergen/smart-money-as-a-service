import type { LeaderboardWallet } from "@/lib/types";
import { round } from "@/lib/number";

export type RawLeaderboardRow = {
  user: string;
  display_name?: string;
  cumulative_pnl: unknown;
  cumulative_fees: unknown;
  net_pnl: unknown;
  total_volume: unknown;
  total_fills: unknown;
  active_days: unknown;
  winning_days: unknown;
  win_rate_pct: unknown;
};

type NumericReader = (value: unknown) => number;

export function scoreWallet(input: {
  netPnl: number;
  totalVolume: number;
  totalFills: number;
  activeDays: number;
  winRatePct: number;
}) {
  return scoreWalletBreakdown(input).total;
}

export function scoreWalletBreakdown(input: {
  netPnl: number;
  totalVolume: number;
  totalFills: number;
  activeDays: number;
  winRatePct: number;
}) {
  const pnlComponent = Math.log10(Math.max(input.netPnl, 0) + 1) * 18;
  const winRateComponent = Math.max(0, input.winRatePct - 45) * 0.9;
  const consistencyComponent = Math.min(input.activeDays, 30) * 1.5;
  const volumeComponent = Math.log10(Math.max(input.totalVolume, 1)) * 4;
  const activityPenalty =
    input.totalFills > 20_000 ? Math.min(18, (input.totalFills - 20_000) / 2_500) : 0;
  const total = round(
    Math.max(
      0,
      pnlComponent + winRateComponent + consistencyComponent + volumeComponent - activityPenalty
    ),
    1
  );

  return {
    pnl: round(pnlComponent, 1),
    winRate: round(winRateComponent, 1),
    consistency: round(consistencyComponent, 1),
    volume: round(volumeComponent, 1),
    activityPenalty: round(activityPenalty, 1),
    total
  };
}

export function mapLeaderboardRow(row: RawLeaderboardRow, toNumeric: NumericReader) {
  const wallet: LeaderboardWallet = {
    user: row.user.toLowerCase(),
    displayName: row.display_name || undefined,
    cumulativePnl: round(toNumeric(row.cumulative_pnl), 2),
    cumulativeFees: round(toNumeric(row.cumulative_fees), 2),
    netPnl: round(toNumeric(row.net_pnl), 2),
    totalVolume: round(toNumeric(row.total_volume), 2),
    totalFills: Math.round(toNumeric(row.total_fills)),
    activeDays: Math.round(toNumeric(row.active_days)),
    winningDays: Math.round(toNumeric(row.winning_days)),
    winRatePct: round(toNumeric(row.win_rate_pct), 1),
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

  wallet.scoreBreakdown = scoreWalletBreakdown(wallet);
  wallet.score = wallet.scoreBreakdown.total;
  return wallet;
}

export function rankWallets(wallets: LeaderboardWallet[]) {
  return [...wallets].sort((a, b) => b.score - a.score || b.netPnl - a.netPnl);
}
