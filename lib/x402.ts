import { withX402 } from "@x402/next";
import { HTTPFacilitatorClient, x402ResourceServer, type RouteConfig } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import type { NextRequest, NextResponse } from "next/server";
import { NextResponse as NextJsonResponse } from "next/server";
import { isAddress } from "@/lib/address";
import {
  getX402FacilitatorUrl,
  getX402Network,
  getX402PayToAddress,
  getX402PriceUsd
} from "@/lib/config";

const globalX402 = globalThis as typeof globalThis & {
  __smartMoneyX402Server?: {
    facilitatorUrl: string;
    network: string;
    server: x402ResourceServer;
  };
};

export function withPaidApi<T>(
  handler: (request: NextRequest) => Promise<NextResponse<T> | NextResponse<unknown>>,
  description: string
) {
  let cached:
    | {
        key: string;
        route: (request: NextRequest) => Promise<NextResponse<T> | NextResponse<unknown>>;
      }
    | undefined;

  return async (request: NextRequest) => {
    const routeConfig = getPaidRouteConfig(description);
    if (!routeConfig.ok) {
      return NextJsonResponse.json({ error: routeConfig.error }, { status: 503 });
    }

    const key = JSON.stringify(routeConfig.config);
    cached =
      cached?.key === key
        ? cached
        : {
            key,
            route: withX402(handler, routeConfig.config, getX402Server())
          };

    return cached.route(request);
  };
}

function getPaidRouteConfig(description: string) {
  const payTo = getX402PayToAddress();
  if (!isAddress(payTo)) {
    return { ok: false as const, error: "X402_PAY_TO_ADDRESS is not configured" };
  }
  const network = getX402Network() as `${string}:${string}`;

  return {
    ok: true as const,
    config: {
      accepts: {
        scheme: "exact" as const,
        price: getX402PriceUsd(),
        network,
        payTo
      },
      description,
      mimeType: "application/json"
    } satisfies RouteConfig
  };
}

function getX402Server() {
  const facilitatorUrl = getX402FacilitatorUrl();
  const network = getX402Network() as `${string}:${string}`;
  const cached = globalX402.__smartMoneyX402Server;

  if (cached?.facilitatorUrl === facilitatorUrl && cached.network === network) {
    return cached.server;
  }

  const facilitatorClient = new HTTPFacilitatorClient({ url: facilitatorUrl });
  const server = new x402ResourceServer(facilitatorClient).register(network, new ExactEvmScheme());

  globalX402.__smartMoneyX402Server = {
    facilitatorUrl,
    network,
    server
  };

  return server;
}
