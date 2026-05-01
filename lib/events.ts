import { toNumber } from "@/lib/number";
import type { NormalizedEvent } from "@/lib/types";

type WebhookPayload = {
  block_number?: number;
  block_time?: string;
  matchedEvents?: Array<{
    time?: string;
    hash?: string;
    inner?: Record<string, unknown>;
  }>;
};

type LedgerDelta = Record<string, unknown> & {
  type?: string;
  user?: string;
  destination?: string;
  amount?: string;
  usdcValue?: string;
  usdc?: string;
  token?: string;
  requestedUsd?: string;
  netWithdrawnUsd?: string;
  vault?: string;
};

export function normalizeQuicknodeWebhook(payload: unknown, receivedAt = new Date().toISOString()) {
  const body = payload as WebhookPayload;
  const matchedEvents = Array.isArray(body.matchedEvents) ? body.matchedEvents : [];

  return matchedEvents.map((event, index): NormalizedEvent => {
    const inner = event.inner ?? {};
    const kind = Object.keys(inner)[0] ?? "Unknown";
    const value = inner[kind] as Record<string, unknown> | undefined;
    const blockNumber = toNumber(body.block_number);
    const blockTime = body.block_time ?? event.time ?? receivedAt;
    const txHash = event.hash ?? "0x0000000000000000000000000000000000000000000000000000000000000000";

    if (kind === "LedgerUpdate" && value) {
      const delta = (value.delta ?? {}) as LedgerDelta;
      const users = Array.isArray(value.users) ? (value.users as string[]) : [];
      const wallet = String(delta.user ?? users[0] ?? "unknown").toLowerCase();
      const counterparty = String(delta.destination ?? delta.vault ?? users.find((user) => user !== wallet) ?? "");
      const eventType = String(delta.type ?? "ledgerUpdate");
      const amount = toNumber(delta.amount || delta.usdc || delta.requestedUsd || delta.netWithdrawnUsd);
      const amountUsd = toNumber(delta.usdcValue || delta.usdc || delta.netWithdrawnUsd || delta.requestedUsd);
      const token = String(delta.token ?? "USDC");

      return {
        id: eventId({
          blockNumber,
          blockTime,
          txHash,
          index,
          kind,
          eventType,
          wallet
        }),
        blockNumber,
        blockTime,
        txHash,
        kind,
        eventType,
        wallet,
        counterparty: counterparty || undefined,
        amount: amount || undefined,
        amountUsd: amountUsd || undefined,
        token,
        description: describeLedgerEvent(eventType, amount || amountUsd, token),
        receivedAt
      };
    }

    const genericUser = value && "user" in value ? String(value.user).toLowerCase() : "unknown";
    const amount = value && "amount" in value ? toNumber(value.amount) : undefined;

    return {
      id: eventId({
        blockNumber,
        blockTime,
        txHash,
        index,
        kind,
        eventType: kind,
        wallet: genericUser
      }),
      blockNumber,
      blockTime,
      txHash,
      kind,
      eventType: kind,
      wallet: genericUser,
      amount,
      token: "USDC",
      description: `${kind} event received`,
      receivedAt
    };
  });
}

function eventId(input: {
  blockNumber: number;
  blockTime: string;
  txHash: string;
  index: number;
  kind: string;
  eventType: string;
  wallet: string;
}) {
  return [
    input.blockNumber,
    input.blockTime,
    input.txHash,
    input.index,
    input.kind,
    input.eventType,
    input.wallet
  ].join("-");
}

function describeLedgerEvent(eventType: string, amount: number, token: string) {
  const formattedAmount =
    amount > 0
      ? new Intl.NumberFormat("en-US", {
          notation: amount >= 100_000 ? "compact" : "standard",
          maximumFractionDigits: 3
        }).format(amount)
      : "an unknown amount of";

  if (eventType === "send") return `Transfer of ${formattedAmount} ${token}`;
  if (eventType === "deposit") return `Deposit of ${formattedAmount} ${token}`;
  if (eventType === "withdraw") return `Withdrawal of ${formattedAmount} ${token}`;
  if (eventType === "vaultDeposit") return `Vault deposit of ${formattedAmount} ${token}`;
  if (eventType === "vaultWithdraw") return `Vault withdrawal of ${formattedAmount} ${token}`;
  return `${eventType} involving ${formattedAmount} ${token}`;
}
