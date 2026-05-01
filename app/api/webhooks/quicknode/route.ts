import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { getWebhookSecurityToken } from "@/lib/config";
import { normalizeQuicknodeWebhook } from "@/lib/events";
import { insertEvents } from "@/lib/events-db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const expectedToken = getWebhookSecurityToken();
  const payloadText = await readWebhookPayload(request);

  if (expectedToken) {
    const verification = verifyQuicknodeSignature({
      payload: payloadText,
      signature: request.headers.get("x-qn-signature"),
      nonce: request.headers.get("x-qn-nonce"),
      timestamp: request.headers.get("x-qn-timestamp"),
      secret: expectedToken
    });

    if (!verification.ok) {
      return NextResponse.json({ error: verification.error }, { status: 401 });
    }
  }

  let payload: unknown;
  try {
    payload = JSON.parse(payloadText);
  } catch {
    return NextResponse.json({ error: "invalid json payload" }, { status: 400 });
  }

  const events = normalizeQuicknodeWebhook(payload);
  const persistence = await insertEvents(events);

  return NextResponse.json({
    ok: true,
    accepted: events.length,
    persisted: persistence.inserted,
    storage: persistence.configured ? "db" : "unconfigured"
  });
}

async function readWebhookPayload(request: Request) {
  const body = Buffer.from(await request.arrayBuffer());

  if (request.headers.get("content-encoding")?.toLowerCase() === "gzip") {
    return gunzipSync(body).toString("utf8");
  }

  return body.toString("utf8");
}

function verifyQuicknodeSignature({
  payload,
  signature,
  nonce,
  timestamp,
  secret
}: {
  payload: string;
  signature: string | null;
  nonce: string | null;
  timestamp: string | null;
  secret: string;
}) {
  if (!signature || !nonce || !timestamp) {
    return { ok: false, error: "missing quicknode signature headers" };
  }

  const expectedSignature = createHmac("sha256", Buffer.from(secret))
    .update(Buffer.from(nonce + timestamp + payload))
    .digest("hex");

  const expected = Buffer.from(expectedSignature, "hex");
  const received = Buffer.from(signature, "hex");

  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return { ok: false, error: "invalid quicknode signature" };
  }

  return { ok: true };
}
