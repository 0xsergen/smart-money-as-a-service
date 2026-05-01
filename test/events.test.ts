import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { normalizeQuicknodeWebhook } from "@/lib/events";
import { createEventsClient, initEventsTable, insertEvents, readLatestEvents } from "@/lib/events-db";

const clients: ReturnType<typeof createEventsClient>[] = [];

afterEach(() => {
  for (const client of clients) {
    if (client && !client.closed) client.close();
  }
  clients.length = 0;
});

describe("normalizeQuicknodeWebhook", () => {
  it("normalizes LedgerUpdate transfer payloads", () => {
    const events = normalizeQuicknodeWebhook(
      {
        block_number: 970844555,
        block_time: "2026-04-24T09:49:04.793314856",
        matchedEvents: [
          {
            hash: "0x52788c70e83330c053f20439dde98b02015c005683364f92f64137c3a7370aaa",
            inner: {
              LedgerUpdate: {
                delta: {
                  amount: "12.5",
                  destination: "0x82cd5683ef2013c30915cd84c940f378ad782d4b",
                  token: "USDC",
                  type: "send",
                  usdcValue: "12.5",
                  user: "0x91c65e75f9a869900859ce66bd8719555e66e9c3"
                },
                users: [
                  "0x91c65e75f9a869900859ce66bd8719555e66e9c3",
                  "0x82cd5683ef2013c30915cd84c940f378ad782d4b"
                ]
              }
            }
          }
        ]
      },
      "2026-04-30T00:00:00.000Z"
    );

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      blockNumber: 970844555,
      kind: "LedgerUpdate",
      eventType: "send",
      wallet: "0x91c65e75f9a869900859ce66bd8719555e66e9c3",
      counterparty: "0x82cd5683ef2013c30915cd84c940f378ad782d4b",
      amount: 12.5,
      amountUsd: 12.5,
      token: "USDC"
    });
  });

  it("handles non-ledger events without throwing", () => {
    const events = normalizeQuicknodeWebhook({
      block_number: 1,
      matchedEvents: [
        {
          hash: "0x000",
          inner: {
            CDeposit: {
              user: "0xd93afcb4a933394963ab2a44c83de29073ae226a",
              amount: "11.12345049"
            }
          }
        }
      ]
    });

    expect(events[0]?.kind).toBe("CDeposit");
    expect(events[0]?.wallet).toBe("0xd93afcb4a933394963ab2a44c83de29073ae226a");
  });

  it("inserts and deduplicates repeated webhook deliveries in libSQL", async () => {
    const [event] = normalizeQuicknodeWebhook(
      {
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
      },
      "2026-04-30T00:00:00.000Z"
    );

    const client = testClient();
    await initEventsTable(client);
    await insertEvents([event], client);
    await insertEvents([event], client);

    const latest = await readLatestEvents(100, client);

    expect(latest.events.filter((stored) => stored.id === event.id)).toHaveLength(1);
    expect(latest.events[0]).toMatchObject({
      id: event.id,
      wallet: "0x91c65e75f9a869900859ce66bd8719555e66e9c3",
      eventType: "send"
    });
  });
});

function testClient() {
  const path = join(mkdtempSync(join(tmpdir(), "smart-money-events-")), "events.db");
  const client = createEventsClient({ url: `file:${path}` });
  clients.push(client);
  if (!client) throw new Error("Unable to create test event database");
  return client;
}
