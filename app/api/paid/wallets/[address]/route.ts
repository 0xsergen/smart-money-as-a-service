import { NextResponse, type NextRequest } from "next/server";
import { getWalletProfile } from "@/lib/data/service";
import { withPaidApi } from "@/lib/x402";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ address: string }> }
) {
  const { address } = await context.params;

  return withPaidApi(async () => {
    try {
      return NextResponse.json(await getWalletProfile(address, { allowUnlisted: true }));
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Unable to load wallet profile" },
        { status: 400 }
      );
    }
  }, "Access a Smart Money wallet profile public API")(request);
}
