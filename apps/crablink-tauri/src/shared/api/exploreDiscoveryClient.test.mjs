import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  ExploreDiscoveryClient,
  createExploreDiscoveryClient,
} from './exploreDiscoveryClient.js';

const SCHEMA =
  'crablink.explore-discovery.v1';

function rawDiscovery(
  overrides = {},
) {
  return {
    schema:
      SCHEMA,

    recentPublications:
      [],

    publicCreators:
      [],

    templateSites:
      [],

    ...overrides,
  };
}

test(
  'phase10a3e client exposes readiness only for the reviewed gateway request boundary',
  () => {
    assert.equal(
      createExploreDiscoveryClient(
        null,
      ).ready,
      false,
    );

    assert.equal(
      createExploreDiscoveryClient({
        request() {},
      }).ready,
      true,
    );
  },
);

test(
  'phase10a3e default discovery limits target the public gateway Explore route',
  async () => {
    const calls =
      [];

    const client =
      createExploreDiscoveryClient({
        async request(
          route,
          options,
        ) {
          calls.push({
            route,
            options,
          });

          return {
            ok:
              true,

            status:
              200,

            route,

            correlationId:
              'phase10a3e-default',

            data:
              rawDiscovery(),
          };
        },
      });

    await client
      .getExploreDiscovery();

    assert.equal(
      calls.length,
      1,
    );

    assert.equal(
      calls[0].route,
      '/explore?publicationLimit=12&creatorLimit=12&siteLimit=8',
    );

    assert.deepEqual(
      calls[0].options,
      {
        method:
          'GET',

        label:
          'Explore discovery',
      },
    );
  },
);

test(
  'phase10a3e explicit reviewed limits are preserved exactly',
  async () => {
    let observedRoute =
      '';

    const client =
      createExploreDiscoveryClient({
        async request(
          route,
        ) {
          observedRoute =
            route;

          return {
            ok:
              true,

            status:
              200,

            route,

            data:
              rawDiscovery(),
          };
        },
      });

    await client
      .getExploreDiscovery({
        publicationLimit:
          24,

        creatorLimit:
          20,

        siteLimit:
          16,
      });

    assert.equal(
      observedRoute,
      '/explore?publicationLimit=24&creatorLimit=20&siteLimit=16',
    );
  },
);

test(
  'phase10a3e invalid limits fail before gateway activity',
  async () => {
    let callCount =
      0;

    const client =
      createExploreDiscoveryClient({
        async request() {
          callCount +=
            1;

          return {
            ok:
              true,

            status:
              200,

            data:
              rawDiscovery(),
          };
        },
      });

    await assert.rejects(
      client
        .getExploreDiscovery({
          publicationLimit:
            25,
        }),
      /publicationLimit/,
    );

    assert.equal(
      callCount,
      0,
    );
  },
);

test(
  'phase10a3e successful gateway data is validated and enriched by shared core',
  async () => {
    const client =
      new ExploreDiscoveryClient({
        async request(
          route,
        ) {
          return {
            ok:
              true,

            status:
              200,

            route,

            correlationId:
              'phase10a3e-validation',

            data:
              rawDiscovery(),
          };
        },
      });

    const result =
      await client
        .getExploreDiscovery();

    assert.equal(
      result.discovery.schema,
      SCHEMA,
    );

    assert.equal(
      result.discovery.categories.length,
      3,
    );

    assert.equal(
      result.discovery.authority
        .publicReadProjectionOnly,
      true,
    );

    assert.equal(
      result.discovery.authority
        .engagementRanking,
      false,
    );

    assert.equal(
      result.discovery.authority
        .paidRanking,
      false,
    );

    assert.equal(
      Object.isFrozen(
        result.discovery,
      ),
      true,
    );
  },
);

test(
  'phase10a3e malformed backend discovery fails closed',
  async () => {
    const client =
      createExploreDiscoveryClient({
        async request() {
          return {
            ok:
              true,

            status:
              200,

            data: {
              schema:
                'wrong.schema',

              recentPublications:
                [],

              publicCreators:
                [],

              templateSites:
                [],
            },
          };
        },
      });

    await assert.rejects(
      client
        .getExploreDiscovery(),
      /schema/,
    );
  },
);

test(
  'phase10a3e preserves safe response metadata without promoting it to discovery truth',
  async () => {
    const client =
      createExploreDiscoveryClient({
        async request(
          route,
        ) {
          return {
            ok:
              true,

            status:
              200,

            route,

            correlationId:
              'phase10a3e-correlation',

            data:
              rawDiscovery(),
          };
        },
      });

    const result =
      await client
        .getExploreDiscovery();

    assert.deepEqual(
      result.response,
      {
        ok:
          true,

        status:
          200,

        route:
          '/explore?publicationLimit=12&creatorLimit=12&siteLimit=8',

        correlationId:
          'phase10a3e-correlation',
      },
    );

    assert.equal(
      Object.isFrozen(
        result.response,
      ),
      true,
    );
  },
);

test(
  'phase10a3e source grants no direct transport social graph ranking or economic authority',
  () => {
    const source =
      fs.readFileSync(
        new URL(
          './exploreDiscoveryClient.js',
          import.meta.url,
        ),
        'utf8',
      );

    for (
      const forbidden
      of [
        'fetch(',
        'XMLHttpRequest',
        'callTauri',
        'invoke(',
        '/v1/index/explore',
        '/v1/explore',
        'localStorage',
        'sessionStorage',
        'followerCount',
        'followingCount',
        'engagementScore',
        'wallet_',
        'ledger_',
        'receipt_',
        'quickchain_',
        'rox_',
        'solana_',
      ]
    ) {
      assert.equal(
        source.includes(
          forbidden,
        ),
        false,
        `forbidden Explore client authority token: ${forbidden}`,
      );
    }

    assert.equal(
      source.includes(
        "this.gateway.request",
      ),
      true,
    );

    assert.equal(
      source.includes(
        "normalizeExploreDiscoveryV1",
      ),
      true,
    );
  },
);
