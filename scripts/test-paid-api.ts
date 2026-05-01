import { x402Client, x402HTTPClient } from "@x402/core/client";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { wrapFetchWithPayment } from "@x402/fetch";
import { privateKeyToAccount } from "viem/accounts";

const DEFAULT_BASE_URL = "http://localhost:3000";
const DEFAULT_PATH = "/api/paid/leaderboard";

async function main() {
  const privateKey = process.env.EVM_PRIVATE_KEY?.trim();
  if (!privateKey) {
    throw new Error(
      "Missing EVM_PRIVATE_KEY. Set it to a funded Base Sepolia buyer private key before running pnpm test:paid-api."
    );
  }

  if (!privateKey.startsWith("0x")) {
    throw new Error("EVM_PRIVATE_KEY must be a 0x-prefixed private key.");
  }

  const baseUrl = process.env.PAID_API_BASE_URL?.trim() || DEFAULT_BASE_URL;
  const path = process.env.PAID_API_PATH?.trim() || DEFAULT_PATH;
  const url = resolveUrl(baseUrl, path);

  const signer = privateKeyToAccount(privateKey as `0x${string}`);
  const client = new x402Client();
  client.register("eip155:*", new ExactEvmScheme(signer));

  const fetchWithPayment = wrapFetchWithPayment(fetch, client);
  const response = await fetchWithPayment(url, { method: "GET" });

  console.log(`Paid API URL: ${url}`);
  console.log(`Response status: ${response.status} ${response.statusText}`);

  const body = await readResponseBody(response);
  console.log("Response body:");
  console.log(JSON.stringify(body, null, 2));

  const httpClient = new x402HTTPClient(client);
  const settlement = readSettlement(httpClient, response);
  if (settlement) {
    console.log("Payment settlement:");
    console.log(JSON.stringify(settlement, null, 2));
  } else {
    console.log("Payment settlement: not present in response headers");
  }
}

function resolveUrl(baseUrl: string, path: string) {
  try {
    return new URL(path).toString();
  } catch {
    return new URL(path, ensureTrailingSlash(baseUrl)).toString();
  }
}

function ensureTrailingSlash(value: string) {
  return value.endsWith("/") ? value : `${value}/`;
}

async function readResponseBody(response: Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function readSettlement(httpClient: x402HTTPClient, response: Response) {
  try {
    return httpClient.getPaymentSettleResponse((name) => response.headers.get(name));
  } catch (error) {
    if (error instanceof Error && error.message === "Payment response header not found") {
      return null;
    }
    throw error;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
