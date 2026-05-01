import { NextResponse } from "next/server";
import { getWalletProfile } from "@/lib/data/service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await context.params;
    return NextResponse.json(await getWalletProfile(address));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load wallet profile" },
      { status: 400 }
    );
  }
}
