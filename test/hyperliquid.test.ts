import { describe, expect, it } from "vitest";
import { mapEnrichment } from "@/lib/hyperliquid";

describe("mapEnrichment", () => {
  it("maps SDK account data into compact wallet enrichment", () => {
    const enrichment = mapEnrichment(
      {
        crossMarginSummary: {
          accountValue: "1000.5",
          totalMarginUsed: "200.25",
          totalNtlPos: "5000"
        },
        withdrawable: "700.25",
        assetPositions: [
          {
            position: {
              coin: "BTC",
              szi: "0.5",
              entryPx: "90000",
              positionValue: "45000",
              unrealizedPnl: "1234.5",
              returnOnEquity: "0.12",
              leverage: { value: 5 },
              marginUsed: "9000"
            }
          }
        ]
      },
      [{ coin: "BTC" }, { coin: "ETH" }],
      {
        userAddRate: "0.0001",
        userCrossRate: "0.00035"
      }
    );

    expect(enrichment).toMatchObject({
      source: "sdk",
      accountValue: 1000.5,
      withdrawable: 700.25,
      marginUsed: 200.25,
      notionalExposure: 5000,
      openOrderCount: 2,
      makerFeeRate: 0.0001,
      takerFeeRate: 0.00035
    });
    expect(enrichment.positions[0]).toMatchObject({
      coin: "BTC",
      size: 0.5,
      entryPrice: 90000,
      unrealizedPnl: 1234.5,
      returnOnEquityPct: 12
    });
  });
});
