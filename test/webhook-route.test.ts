import { createHmac } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/webhooks/quicknode/route";
import { readLatestEvents } from "@/lib/events-db";

const originalWebhookToken = process.env.QN_WEBHOOK_SECURITY_TOKEN;
const originalTursoDatabaseUrl = process.env.TURSO_DATABASE_URL;
const originalTursoAuthToken = process.env.TURSO_AUTH_TOKEN;

afterEach(() => {
  restoreEnv("QN_WEBHOOK_SECURITY_TOKEN", originalWebhookToken);
  restoreEnv("TURSO_DATABASE_URL", originalTursoDatabaseUrl);
  restoreEnv("TURSO_AUTH_TOKEN", originalTursoAuthToken);
});

describe("Quicknode webhook route", () => {
  it("accepts a valid Quicknode HMAC signature", async () => {
    process.env.QN_WEBHOOK_SECURITY_TOKEN = "test-token";
    process.env.TURSO_DATABASE_URL = testDatabaseUrl();
    delete process.env.TURSO_AUTH_TOKEN;
    const payload = JSON.stringify({
      block_number: 970844555,
      block_time: "2026-04-24T09:49:04.793314856",
      matchedEvents: [
        {
          hash: "0x52788c70e83330c053f20439dde98b02015c005683364f92f64137c3a7370aaa",
          inner: {
            LedgerUpdate: {
              delta: {
                amount: "12.5",
                token: "USDC",
                type: "send",
                user: "0x91c65e75f9a869900859ce66bd8719555e66e9c3"
              }
            }
          }
        }
      ]
    });
    const nonce = "nonce-1";
    const timestamp = "1760000000";
    const signature = sign(payload, nonce, timestamp, "test-token");

    const response = await POST(
      new Request("http://localhost/api/webhooks/quicknode", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-qn-signature": signature,
          "x-qn-nonce": nonce,
          "x-qn-timestamp": timestamp
        },
        body: payload
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      accepted: 1,
      persisted: 1,
      storage: "db"
    });

    const stored = await readLatestEvents();
    expect(stored.events[0]).toMatchObject({
      eventType: "send",
      wallet: "0x91c65e75f9a869900859ce66bd8719555e66e9c3"
    });
  });

  it("rejects requests missing Quicknode signature headers when token is configured", async () => {
    process.env.QN_WEBHOOK_SECURITY_TOKEN = "test-token";

    const response = await POST(
      new Request("http://localhost/api/webhooks/quicknode", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}"
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: "missing quicknode signature headers"
    });
  });
});

function sign(payload: string, nonce: string, timestamp: string, secret: string) {
  return createHmac("sha256", Buffer.from(secret))
    .update(Buffer.from(nonce + timestamp + payload))
    .digest("hex");
}

function testDatabaseUrl() {
  const path = join(mkdtempSync(join(tmpdir(), "smart-money-webhook-")), "events.db");
  return `file:${path}`;
}

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}
