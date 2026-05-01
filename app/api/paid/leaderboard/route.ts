import { NextResponse, type NextRequest } from "next/server";
import { getLeaderboard } from "@/lib/data/service";
import { withPaidApi } from "@/lib/x402";

export const dynamic = "force-dynamic";

async function handler(_request: NextRequest) {
  return NextResponse.json(await getLeaderboard());
}

export const GET = withPaidApi(handler, "Access the Smart Money leaderboard public API");
