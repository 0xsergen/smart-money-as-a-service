import { afterEach, describe, expect, it } from "vitest";
import { GET } from "@/app/api/jobs/score-wallets/route";

const originalCronSecret = process.env.CRON_SECRET;
const originalQuicknodeApiKey = process.env.QUICKNODE_API_KEY;

afterEach(() => {
  restoreEnv("CRON_SECRET", originalCronSecret);
  restoreEnv("QUICKNODE_API_KEY", originalQuicknodeApiKey);
});

describe("score-wallets job route", () => {
  it("rejects missing bearer auth", async () => {
    process.env.CRON_SECRET = "test-secret";
    process.env.QUICKNODE_API_KEY = "test-key";

    const response = await GET(new Request("http://localhost/api/jobs/score-wallets"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("unauthorized");
  });

  it("fails closed when the cron secret is missing", async () => {
    process.env.CRON_SECRET = "";

    const response = await GET(new Request("http://localhost/api/jobs/score-wallets"));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toBe("CRON_SECRET is not configured");
  });
});

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}
