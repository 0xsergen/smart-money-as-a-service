import { NextResponse, type NextRequest } from "next/server";
import { getRecentEvents } from "@/lib/data/service";
import { getEventLimit } from "@/lib/events-db";
import { withPaidApi } from "@/lib/x402";

export const dynamic = "force-dynamic";

async function handler(request: NextRequest) {
  const limit = getEventLimit(request.nextUrl.searchParams.get("limit"));
  return NextResponse.json(await getRecentEvents({ limit }));
}

export const GET = withPaidApi(handler, "Access recent Smart Money webhook events public API");
