/**
 * RO:WHAT — Desktop gateway client for bounded public Explore discovery.
 * RO:WHY — FINAL_BETA Phase 10 must consume the real gateway Explore projection rather than local placeholders or direct internal services.
 * RO:INTERACTS — GatewayClient, crablink-core Explore contract, svc-gateway GET /explore, later ExplorePage.jsx.
 * RO:INVARIANTS — request limits are normalized by shared core and every successful backend response is validated before reaching React.
 * RO:SECURITY — gateway read only; no direct fetch, Tauri invoke, svc-index, Omnigate, social graph, ranking, wallet, ledger, receipt, entitlement, QuickChain, ROX, or Solana authority.
 * RO:TEST — exploreDiscoveryClient.test.mjs.
 */

// FINAL_BETA_PHASE10A3E_DESKTOP_EXPLORE_DISCOVERY_CLIENT_V1

import {
  normalizeExploreDiscoveryRequest,
  normalizeExploreDiscoveryV1,
} from '../../../../../packages/crablink-core/src/index.js';

export function createExploreDiscoveryClient(
  gateway,
) {
  return new ExploreDiscoveryClient(
    gateway,
  );
}

export class ExploreDiscoveryClient {
  constructor(
    gateway,
  ) {
    this.gateway =
      gateway || null;
  }

  get ready() {
    return Boolean(
      this.gateway &&
      typeof this.gateway.request ===
        'function',
    );
  }

  async getExploreDiscovery(
    options = {},
  ) {
    this.assertGateway();

    const request =
      normalizeExploreDiscoveryRequest(
        options,
      );

    const query =
      new URLSearchParams({
        publicationLimit:
          String(
            request.publicationLimit,
          ),

        creatorLimit:
          String(
            request.creatorLimit,
          ),

        siteLimit:
          String(
            request.siteLimit,
          ),
      });

    const response =
      await this.gateway.request(
        `/explore?${query.toString()}`,
        {
          method:
            'GET',

          label:
            'Explore discovery',
        },
      );

    return Object.freeze({
      response:
        Object.freeze({
          ok:
            response?.ok ===
              true,

          status:
            Number(
              response?.status || 0,
            ),

          route:
            String(
              response?.route || '',
            ),

          correlationId:
            String(
              response?.correlationId || '',
            ),
        }),

      discovery:
        normalizeExploreDiscoveryV1(
          response?.data,
        ),
    });
  }

  assertGateway() {
    if (
      this.ready ===
        false
    ) {
      throw new TypeError(
        'Explore discovery requires a gateway client.',
      );
    }
  }
}
