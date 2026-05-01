import { NextResponse } from "next/server";
import { getRecentEvents } from "@/lib/data/service";
import { getEventLimit } from "@/lib/events-db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  return NextResponse.json(await getRecentEvents({ limit: getEventLimit(url.searchParams.get("limit")) }));
}
