import { describe, expect, it } from "vitest";
import { rankWallets, scoreWallet, scoreWalletBreakdown } from "@/lib/scoring";

describe("scoreWallet", () => {
  it("rewards profitable, consistent wallets", () => {
    const strong = scoreWallet({
      netPnl: 1_000_000,
      totalVolume: 30_000_000,
      totalFills: 2_000,
      activeDays: 22,
      winRatePct: 75
    });

    const weak = scoreWallet({
      netPnl: 25_000,
      totalVolume: 2_000_000,
      totalFills: 2_000,
      activeDays: 6,
      winRatePct: 52
    });

    expect(strong).toBeGreaterThan(weak);
  });

  it("returns a component breakdown matching the final score", () => {
    const breakdown = scoreWalletBreakdown({
      netPnl: 1_000_000,
      totalVolume: 30_000_000,
      totalFills: 2_000,
      activeDays: 22,
      winRatePct: 75
    });

    expect(breakdown.total).toBe(
      scoreWallet({
        netPnl: 1_000_000,
        totalVolume: 30_000_000,
        totalFills: 2_000,
        activeDays: 22,
        winRatePct: 75
      })
    );
    expect(breakdown.pnl).toBeGreaterThan(0);
    expect(breakdown.winRate).toBeGreaterThan(0);
    expect(breakdown.consistency).toBeGreaterThan(0);
    expect(breakdown.volume).toBeGreaterThan(0);
  });

  it("applies an activity penalty to extreme fill counts", () => {
    const normal = scoreWallet({
      netPnl: 600_000,
      totalVolume: 20_000_000,
      totalFills: 5_000,
      activeDays: 20,
      winRatePct: 70
    });

    const noisy = scoreWallet({
      netPnl: 600_000,
      totalVolume: 20_000_000,
      totalFills: 70_000,
      activeDays: 20,
      winRatePct: 70
    });

    expect(noisy).toBeLessThan(normal);
  });
});

describe("rankWallets", () => {
  it("sorts by score, then net pnl", () => {
    const ranked = rankWallets([
      wallet("0x1111111111111111111111111111111111111111", 10, 900),
      wallet("0x2222222222222222222222222222222222222222", 20, 100),
      wallet("0x3333333333333333333333333333333333333333", 20, 300)
    ]);

    expect(ranked.map((entry) => entry.user)).toEqual([
      "0x3333333333333333333333333333333333333333",
      "0x2222222222222222222222222222222222222222",
      "0x1111111111111111111111111111111111111111"
    ]);
  });
});

function wallet(user: string, score: number, netPnl: number) {
  return {
    user,
    cumulativePnl: netPnl,
    cumulativeFees: 0,
    netPnl,
    totalVolume: 1,
    totalFills: 1,
    activeDays: 1,
    winningDays: 1,
    winRatePct: 100,
    score,
    scoreBreakdown: {
      pnl: 0,
      winRate: 0,
      consistency: 0,
      volume: 0,
      activityPenalty: 0,
      total: score
    }
  };
}
