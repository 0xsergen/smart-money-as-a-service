import { afterEach, describe, expect, it, vi } from "vitest";
import { updateSmartMoneyWatchlist } from "@/lib/quicknode-kv";

const originalQuicknodeApiKey = process.env.QUICKNODE_API_KEY;

afterEach(() => {
  if (originalQuicknodeApiKey === undefined) {
    delete process.env.QUICKNODE_API_KEY;
  } else {
    process.env.QUICKNODE_API_KEY = originalQuicknodeApiKey;
  }
  vi.restoreAllMocks();
});

describe("updateSmartMoneyWatchlist", () => {
  it("returns the exact dry-run payload without writing", async () => {
    const result = await updateSmartMoneyWatchlist(
      ["0xABCDEFabcdefABCDEFabcdefABCDEFabcdefABCD"],
      { dryRun: true }
    );

    expect(result.updated).toBe(false);
    expect(result.operation).toBe("dry-run");
    expect(result.watchlistName).toBe("smart-money-wallets");
    expect(result.payload).toEqual({
      items: ["0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"]
    });
  });

  it("creates the KV list when replace reports it is missing", async () => {
    process.env.QUICKNODE_API_KEY = "test-key";
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "not found" }), {
          status: 404,
          headers: { "content-type": "application/json" }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 201,
          headers: { "content-type": "application/json" }
        })
      );

    const result = await updateSmartMoneyWatchlist([
      "0xABCDEFabcdefABCDEFabcdefABCDEFabcdefABCD"
    ]);

    expect(result.operation).toBe("created");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: "PUT" });
    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://api.quicknode.com/kv/rest/v1/lists");
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: "POST" });
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({
      key: "smart-money-wallets",
      items: ["0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"]
    });
  });
});
