import {
  SQL_EXPLORER_CLUSTER_ID,
  SQL_EXPLORER_ENDPOINT,
  getQuicknodeApiKey
} from "@/lib/config";

export type SqlExplorerResponse<T> = {
  meta?: Array<{ name: string; type: string }>;
  data: T[];
  rows?: number;
  rows_before_limit_at_least?: number;
  statistics?: {
    elapsed?: number;
    rows_read?: number;
    bytes_read?: number;
  };
  credits?: number;
};

export class QuicknodeSqlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuicknodeSqlError";
  }
}

export async function runSqlExplorerQuery<T>(query: string): Promise<SqlExplorerResponse<T>> {
  const apiKey = getQuicknodeApiKey();
  if (!apiKey) {
    throw new QuicknodeSqlError("QUICKNODE_API_KEY is not configured");
  }

  const response = await fetch(SQL_EXPLORER_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey
    },
    body: JSON.stringify({
      query,
      clusterId: SQL_EXPLORER_CLUSTER_ID
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new QuicknodeSqlError(`SQL Explorer request failed: ${response.status} ${detail}`);
  }

  const json = (await response.json()) as SqlExplorerResponse<T>;
  if (!Array.isArray(json.data)) {
    throw new QuicknodeSqlError("SQL Explorer response did not include a data array");
  }

  return json;
}
