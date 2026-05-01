import { createClient, type Client, type Row } from "@libsql/client";
import { getTursoAuthToken, getTursoDatabaseUrl } from "@/lib/config";
import type { NormalizedEvent } from "@/lib/types";

const DEFAULT_EVENT_LIMIT = 100;
const MAX_EVENT_LIMIT = 100;

const globalEventsDb = globalThis as typeof globalThis & {
  __smartMoneyEventsDb?: {
    client: Client;
    url: string;
    authToken: string;
    initialized?: Promise<void>;
  };
};

export function isEventDatabaseConfigured() {
  return Boolean(getTursoDatabaseUrl());
}

export function getEventLimit(value: string | number | null | undefined) {
  const parsed =
    typeof value === "number" ? value : Number.parseInt(typeof value === "string" ? value : "", 10);

  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_EVENT_LIMIT;
  return Math.min(Math.floor(parsed), MAX_EVENT_LIMIT);
}

export function createEventsClient(options?: { url?: string; authToken?: string }) {
  const url = options?.url ?? getTursoDatabaseUrl();
  const authToken = options?.authToken ?? getTursoAuthToken();

  if (!url) return undefined;

  return createClient({
    url,
    authToken: authToken || undefined
  });
}

export function getEventsClient() {
  const url = getTursoDatabaseUrl();
  const authToken = getTursoAuthToken();

  if (!url) return undefined;

  const cached = globalEventsDb.__smartMoneyEventsDb;
  if (cached && cached.url === url && cached.authToken === authToken && !cached.client.closed) {
    return cached.client;
  }

  const client = createEventsClient({ url, authToken });
  if (!client) return undefined;

  globalEventsDb.__smartMoneyEventsDb = {
    client,
    url,
    authToken
  };

  return client;
}

export async function initEventsTable(client = getEventsClient()) {
  if (!client) return false;

  const cached = globalEventsDb.__smartMoneyEventsDb;
  if (cached?.client === client) {
    cached.initialized ??= createEventsSchema(client);
    await cached.initialized;
    return true;
  }

  await createEventsSchema(client);
  return true;
}

export async function insertEvents(events: NormalizedEvent[], client = getEventsClient()) {
  if (!client || events.length === 0) return { configured: Boolean(client), inserted: 0 };

  await initEventsTable(client);

  const results = await client.batch(
    events.map((event) => ({
      sql: `
        INSERT INTO events (
          id,
          block_number,
          block_time,
          tx_hash,
          kind,
          event_type,
          wallet,
          counterparty,
          amount,
          amount_usd,
          token,
          description,
          received_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO NOTHING
      `,
      args: [
        event.id,
        event.blockNumber,
        event.blockTime,
        event.txHash,
        event.kind,
        event.eventType,
        event.wallet,
        event.counterparty ?? null,
        event.amount ?? null,
        event.amountUsd ?? null,
        event.token ?? null,
        event.description,
        event.receivedAt
      ]
    })),
    "write"
  );

  return {
    configured: true,
    inserted: results.reduce((sum, result) => sum + result.rowsAffected, 0)
  };
}

export async function readLatestEvents(limit = DEFAULT_EVENT_LIMIT, client = getEventsClient()) {
  if (!client) return { configured: false as const, events: [] };

  await initEventsTable(client);

  const response = await client.execute({
    sql: `
      SELECT
        id,
        block_number,
        block_time,
        tx_hash,
        kind,
        event_type,
        wallet,
        counterparty,
        amount,
        amount_usd,
        token,
        description,
        received_at
      FROM events
      ORDER BY received_at DESC, block_number DESC, id DESC
      LIMIT ?
    `,
    args: [getEventLimit(limit)]
  });

  return {
    configured: true as const,
    events: response.rows.map(mapEventRow)
  };
}

async function createEventsSchema(client: Client) {
  await client.batch(
    [
      `
        CREATE TABLE IF NOT EXISTS events (
          id TEXT PRIMARY KEY,
          block_number INTEGER NOT NULL,
          block_time TEXT NOT NULL,
          tx_hash TEXT NOT NULL,
          kind TEXT NOT NULL,
          event_type TEXT NOT NULL,
          wallet TEXT NOT NULL,
          counterparty TEXT,
          amount REAL,
          amount_usd REAL,
          token TEXT,
          description TEXT NOT NULL,
          received_at TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `,
      "CREATE INDEX IF NOT EXISTS events_received_at_idx ON events(received_at DESC)",
      "CREATE INDEX IF NOT EXISTS events_wallet_idx ON events(wallet)"
    ],
    "write"
  );
}

function mapEventRow(row: Row): NormalizedEvent {
  return {
    id: String(row.id),
    blockNumber: Number(row.block_number),
    blockTime: String(row.block_time),
    txHash: String(row.tx_hash),
    kind: String(row.kind),
    eventType: String(row.event_type),
    wallet: String(row.wallet),
    counterparty: optionalString(row.counterparty),
    amount: optionalNumber(row.amount),
    amountUsd: optionalNumber(row.amount_usd),
    token: optionalString(row.token),
    description: String(row.description),
    receivedAt: String(row.received_at)
  };
}

function optionalString(value: unknown) {
  return value === null || value === undefined ? undefined : String(value);
}

function optionalNumber(value: unknown) {
  if (value === null || value === undefined) return undefined;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}
