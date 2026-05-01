export const SQL_EXPLORER_ENDPOINT = "https://api.quicknode.com/sql/rest/v1/query";
export const SQL_EXPLORER_CLUSTER_ID = "hyperliquid-core-mainnet";
export const DEFAULT_WATCHLIST_NAME = "smart-money-wallets";
export const KV_REST_ENDPOINT = "https://api.quicknode.com/kv/rest/v1";

export function getSmartMoneyLimit() {
  return readPositiveInt(process.env.SMART_MONEY_LIMIT, 50);
}

export function getMinVolumeUsd() {
  return readPositiveInt(process.env.SMART_MONEY_MIN_VOLUME_USD, 1_000_000);
}

export function getQuicknodeApiKey() {
  return process.env.QUICKNODE_API_KEY?.trim() || "";
}

export function getWebhookSecurityToken() {
  return (
    process.env.QN_WEBHOOK_SECURITY_TOKEN?.trim() ||
    process.env.WEBHOOK_SECRET?.trim() ||
    ""
  );
}

export function getHyperliquidRpcUrl() {
  return (
    process.env.QUICKNODE_HYPERLIQUID_RPC_URL?.trim() ||
    process.env.QUICKNODE_RPC_URL?.trim() ||
    ""
  );
}

export function getCronSecret() {
  return process.env.CRON_SECRET?.trim() || "";
}

export function getTursoDatabaseUrl() {
  return process.env.TURSO_DATABASE_URL?.trim() || "";
}

export function getTursoAuthToken() {
  return process.env.TURSO_AUTH_TOKEN?.trim() || "";
}

export function getX402PayToAddress() {
  return process.env.X402_PAY_TO_ADDRESS?.trim() || "";
}

export function getX402PriceUsd() {
  return process.env.X402_PRICE_USD?.trim() || "$0.01";
}

export function getX402Network() {
  return process.env.X402_NETWORK?.trim() || "eip155:84532";
}

export function getX402FacilitatorUrl() {
  return process.env.X402_FACILITATOR_URL?.trim() || "https://x402.org/facilitator";
}

export function getAllowUnlistedWalletProfiles() {
  return process.env.ALLOW_UNLISTED_WALLET_PROFILES?.trim() === "1";
}

export function getWatchlistName() {
  return process.env.SMART_MONEY_WATCHLIST_NAME?.trim() || DEFAULT_WATCHLIST_NAME;
}

export function getLeaderboardCacheTtlMs() {
  return readPositiveInt(process.env.LEADERBOARD_CACHE_TTL_MS, 60_000);
}

export function getWalletProfileCacheTtlMs() {
  return readPositiveInt(process.env.WALLET_PROFILE_CACHE_TTL_MS, 60_000);
}

function readPositiveInt(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
