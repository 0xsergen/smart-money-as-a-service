import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/data/service";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getLeaderboard());
}
