import assert from 'node:assert/strict';
import {
  readFile,
} from 'node:fs/promises';
import test from 'node:test';

import {
  CRABLINK_HOME_ROUTE,
  navigatePrimaryItem,
  primaryNavigationIdForRoute,
  primaryNavigationItemById,
} from '../app/shell/shellNavigation.js';

const registryUrl =
  new URL(
    '../app/routeRegistry.js',
    import.meta.url,
  );

const homeUrl =
  new URL(
    '../pages/home/HomePage.jsx',
    import.meta.url,
  );

const exploreUrl =
  new URL(
    '../pages/explore/ExplorePage.jsx',
    import.meta.url,
  );

async function sourceOf(url) {
  return readFile(
    url,
    'utf8',
  );
}

test(
  'Phase 10A2 keeps Home and Explore as distinct primary routes',
  () => {
    const home =
      primaryNavigationItemById(
        'home',
      );

    const explore =
      primaryNavigationItemById(
        'explore',
      );

    assert.equal(
      CRABLINK_HOME_ROUTE,
      'crab://home',
    );

    assert.equal(
      home.route,
      'crab://home',
    );

    assert.equal(
      explore.route,
      'crab://explore',
    );

    assert.notEqual(
      home.route,
      explore.route,
    );
  },
);

test(
  'Phase 10A2 derives independent active navigation state for Home and Explore',
  () => {
    assert.equal(
      primaryNavigationIdForRoute({
        kind:
          'home',
      }),
      'home',
    );

    assert.equal(
      primaryNavigationIdForRoute({
        kind:
          'explore',
      }),
      'explore',
    );
  },
);

test(
  'Phase 10A2 Home and Explore navigation stays caller-owned and route-only',
  () => {
    const calls = [];

    assert.equal(
      navigatePrimaryItem(
        {
          navigate(route) {
            calls.push(
              route,
            );
          },
        },
        'home',
      ),
      true,
    );

    assert.equal(
      navigatePrimaryItem(
        {
          navigate(route) {
            calls.push(
              route,
            );
          },
        },
        'explore',
      ),
      true,
    );

    assert.deepEqual(
      calls,
      [
        'crab://home',
        'crab://explore',
      ],
    );
  },
);

test(
  'Phase 10A2 route registry assigns separate page owners',
  async () => {
    const registry =
      await sourceOf(
        registryUrl,
      );

    assert.match(
      registry,
      /home:\s*lazy\(\(\)\s*=>\s*import\(['"]\.\.\/pages\/home\/HomePage\.jsx['"]\)\)/,
    );

    assert.match(
      registry,
      /explore:\s*lazy\(\(\)\s*=>\s*import\(['"]\.\.\/pages\/explore\/ExplorePage\.jsx['"]\)\)/,
    );
  },
);

test(
  'Phase 10A2 normal Home is the local-first following-feed product',
  async () => {
    const home =
      await sourceOf(
        homeUrl,
      );

    assert.match(
      home,
      /FINAL_BETA_PHASE9A12_HOME_FEED_CONSUMER_WIRING_V1/,
    );

    assert.match(
      home,
      /FINAL_BETA_PHASE10A1_HOME_LOCAL_PRESENTATION_PAGINATION_V1/,
    );

    assert.match(
      home,
      /title="Your following feed"/,
    );

    assert.match(
      home,
      /refreshLocalFollowingFeed/,
    );

    assert.match(
      home,
      /cl-home-feed-pagination/,
    );

    assert.equal(
      home.includes(
        'Public discovery is not connected yet',
      ),
      false,
    );
  },
);

test(
  'Phase 10A2 Explore remains distinct from local following-feed state',
  async () => {
    const explore =
      await sourceOf(
        exploreUrl,
      );

    assert.match(
      explore,
      /eyebrow="Explore"/,
    );

    assert.match(
      explore,
      /title="Discover CrabLink"/,
    );

    assert.match(
      explore,
      /FINAL_BETA_PHASE10A3F_EXPLORE_DISCOVERY_UI_V1/,
    );

    assert.match(
      explore,
      /createExploreDiscoveryClient/,
    );

    for (
      const forbidden
      of [
        'refreshLocalFollowingFeed',
        'localFollowingPort',
        'HOME_FEED_CACHE_PORT',
        'loadOfflineLocalFollowingFeed',
        'cl-home-feed-pagination',
        'Your following feed',
      ]
    ) {
      assert.equal(
        explore.includes(
          forbidden,
        ),
        false,
        `Explore contains Home-only token: ${forbidden}`,
      );
    }
  },
);

test(
  'Phase 10A2 separation grants no new social graph ranking or economic authority',
  async () => {
    const registry =
      await sourceOf(
        registryUrl,
      );

    const explore =
      await sourceOf(
        exploreUrl,
      );

    const inspected =
      [
        registry,
        explore,
      ]
        .join(
          '\n',
        )
        .toLowerCase();

    for (
      const forbidden
      of [
        'social/follow',
        'social/unfollow',
        'followercount',
        'followingcount',
        'globalfeedcursor',
        'paidranking',
        'wallet mutation',
        'ledger mutation',
        'quickchain mutation',
        'rox interaction',
        'solana interaction',
      ]
    ) {
      assert.equal(
        inspected.includes(
          forbidden,
        ),
        false,
        `separation surface contains forbidden authority token: ${forbidden}`,
      );
    }
  },
);
