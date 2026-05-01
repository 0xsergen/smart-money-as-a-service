import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as leaderboardGET } from "@/app/api/leaderboard/route";
import { GET as walletGET } from "@/app/api/wallets/[address]/route";

vi.mock("@x402/next", () => ({
  withX402:
    (handler: (request: NextRequest) => Promise<Response>, routeConfig: unknown) =>
    async (request: NextRequest) => {
      if (request.headers.get("payment-signature")) return handler(request);

      return new Response(JSON.stringify({ routeConfig }), {
        status: 402,
        headers: { "content-type": "application/json" }
      });
    }
}));

const originalQuicknodeApiKey = process.env.QUICKNODE_API_KEY;
const originalX402PayToAddress = process.env.X402_PAY_TO_ADDRESS;
const originalX402PriceUsd = process.env.X402_PRICE_USD;
const originalX402Network = process.env.X402_NETWORK;
const originalX402FacilitatorUrl = process.env.X402_FACILITATOR_URL;
const originalAllowUnlisted = process.env.ALLOW_UNLISTED_WALLET_PROFILES;

afterEach(() => {
  restoreEnv("QUICKNODE_API_KEY", originalQuicknodeApiKey);
  restoreEnv("X402_PAY_TO_ADDRESS", originalX402PayToAddress);
  restoreEnv("X402_PRICE_USD", originalX402PriceUsd);
  restoreEnv("X402_NETWORK", originalX402Network);
  restoreEnv("X402_FACILITATOR_URL", originalX402FacilitatorUrl);
  restoreEnv("ALLOW_UNLISTED_WALLET_PROFILES", originalAllowUnlisted);
});

describe("API route hardening", () => {
  it("keeps dashboard leaderboard API free of x402 payment", async () => {
    delete process.env.X402_PAY_TO_ADDRESS;
    process.env.QUICKNODE_API_KEY = "";

    const response = await leaderboardGET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.source).toBe("fixture");
  });

  it("requires x402 payment on paid public APIs", async () => {
    process.env.X402_PAY_TO_ADDRESS = "0x1111111111111111111111111111111111111111";
    process.env.X402_PRICE_USD = "$0.01";
    process.env.X402_NETWORK = "eip155:84532";
    process.env.X402_FACILITATOR_URL = "https://x402.org/facilitator";
    process.env.QUICKNODE_API_KEY = "";

    const { GET } = await import("@/app/api/paid/leaderboard/route");
    const response = await GET(
      new NextRequest("http://localhost/api/paid/leaderboard")
    );

    expect(response.status).toBe(402);
  });

  it("rejects invalid selected wallet addresses", async () => {
    const response = await walletGET(
      new Request("http://localhost/api/wallets/not-a-wallet"),
      { params: Promise.resolve({ address: "not-a-wallet" }) }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: "Invalid wallet address" });
  });

  it("rejects dashboard wallet profiles outside the cached leaderboard by default", async () => {
    process.env.QUICKNODE_API_KEY = "";
    process.env.ALLOW_UNLISTED_WALLET_PROFILES = "0";

    const response = await walletGET(
      new Request("http://localhost/api/wallets/0x1111111111111111111111111111111111111111"),
      { params: Promise.resolve({ address: "0x1111111111111111111111111111111111111111" }) }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Wallet is not in the current leaderboard"
    });
  });
});

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}
