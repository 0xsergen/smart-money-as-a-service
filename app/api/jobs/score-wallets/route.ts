import { NextResponse } from "next/server";
import { getCronSecret, getQuicknodeApiKey } from "@/lib/config";
import { getLiveLeaderboardSnapshot } from "@/lib/data/service";
import { updateSmartMoneyWatchlist } from "@/lib/quicknode-kv";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return runScoringJob(request);
}

export async function POST(request: Request) {
  return runScoringJob(request);
}

async function runScoringJob(request: Request) {
  const cronSecret = getCronSecret();
  const authorization = request.headers.get("authorization") ?? "";

  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }

  if (authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!getQuicknodeApiKey()) {
    return NextResponse.json({ error: "QUICKNODE_API_KEY is not configured" }, { status: 503 });
  }

  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "1";

  try {
    const leaderboard = await getLiveLeaderboardSnapshot({ force: true });
    const wallets = leaderboard.wallets.map((wallet) => wallet.user);
    const kv = await updateSmartMoneyWatchlist(wallets, { dryRun });

    return NextResponse.json({
      ok: true,
      dryRun,
      generatedAt: leaderboard.generatedAt,
      walletCount: wallets.length,
      topWallet: wallets[0],
      kv
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to run scoring job" },
      { status: 500 }
    );
  }
}
