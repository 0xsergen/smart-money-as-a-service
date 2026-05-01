import { KV_REST_ENDPOINT, getQuicknodeApiKey, getWatchlistName } from "@/lib/config";

export type KvUpdateResult = {
  watchlistName: string;
  walletCount: number;
  updated: boolean;
  operation: "dry-run" | "created" | "replaced";
  payload: {
    items: string[];
  };
  response?: unknown;
};

export class QuicknodeKvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuicknodeKvError";
  }
}

export async function updateSmartMoneyWatchlist(
  wallets: string[],
  options: { dryRun?: boolean } = {}
): Promise<KvUpdateResult> {
  const watchlistName = getWatchlistName();
  const payload = {
    items: wallets.map((wallet) => wallet.toLowerCase())
  };

  if (options.dryRun) {
    return {
      watchlistName,
      walletCount: payload.items.length,
      updated: false,
      operation: "dry-run",
      payload
    };
  }

  const apiKey = getQuicknodeApiKey();
  if (!apiKey) {
    throw new QuicknodeKvError("QUICKNODE_API_KEY is not configured");
  }

  const replaceResponse = await fetch(listUrl(watchlistName), {
    method: "PUT",
    headers: kvHeaders(apiKey),
    body: JSON.stringify(payload),
    cache: "no-store"
  });

  const replaceBody = await readResponseBody(replaceResponse);
  if (replaceResponse.ok) {
    return {
      watchlistName,
      walletCount: payload.items.length,
      updated: true,
      operation: "replaced",
      payload,
      response: replaceBody
    };
  }

  if (replaceResponse.status !== 404) {
    throw new QuicknodeKvError(
      `KV Store update failed: ${replaceResponse.status} ${JSON.stringify(replaceBody)}`
    );
  }

  const createPayload = {
    key: watchlistName,
    items: payload.items
  };
  const createResponse = await fetch(`${KV_REST_ENDPOINT}/lists`, {
    method: "POST",
    headers: kvHeaders(apiKey),
    body: JSON.stringify(createPayload),
    cache: "no-store"
  });
  const createBody = await readResponseBody(createResponse);

  if (!createResponse.ok) {
    throw new QuicknodeKvError(
      `KV Store create failed after replace returned 404: ${createResponse.status} ${JSON.stringify(
        createBody
      )}`
    );
  }

  return {
    watchlistName,
    walletCount: payload.items.length,
    updated: true,
    operation: "created",
    payload,
    response: createBody
  };
}

function listUrl(watchlistName: string) {
  return `${KV_REST_ENDPOINT}/lists/${encodeURIComponent(watchlistName)}`;
}

function kvHeaders(apiKey: string) {
  return {
    accept: "application/json",
    "content-type": "application/json",
    "x-api-key": apiKey
  };
}

async function readResponseBody(response: Response) {
  const text = await response.text();
  if (!text) return undefined;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}
