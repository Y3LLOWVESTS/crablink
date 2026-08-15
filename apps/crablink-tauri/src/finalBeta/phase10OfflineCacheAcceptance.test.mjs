import assert from 'node:assert/strict';
import {
  readFile,
} from 'node:fs/promises';
import test from 'node:test';

import {
  LOCAL_FOLLOWING_FEED_CACHE_MAX_ITEMS,
  LOCAL_FOLLOWING_FEED_CACHE_SCHEMA,
  LOCAL_FOLLOWING_FEED_CACHE_VIEW_SCHEMA,
  normalizeLocalFollowingFeedCache,
  projectOfflineLocalFollowingFeedCache,
} from '../../../../packages/crablink-core/src/localFollowingFeedCache.js';

import {
  loadOfflineLocalFollowingFeed,
} from '../pages/home/localFollowingOfflineFeedProjection.js';

const HASH_A =
  'a'.repeat(
    64,
  );

const HASH_B =
  'b'.repeat(
    64,
  );

const HASH_C =
  'c'.repeat(
    64,
  );

const HASH_D =
  'd'.repeat(
    64,
  );

const homeUrl =
  new URL(
    '../pages/home/HomePage.jsx',
    import.meta.url,
  );

const cacheAdapterUrl =
  new URL(
    '../adapters/localFollowingFeedCacheAdapter.js',
    import.meta.url,
  );

const assetGateUrl =
  new URL(
    '../pages/asset/AssetContentViewAccess.jsx',
    import.meta.url,
  );

const siteGateUrl =
  new URL(
    '../pages/site/SiteVisitAccess.jsx',
    import.meta.url,
  );

function publication({
  username =
    'alice',

  publicationId =
    `${username}-001`,

  publishedAt =
    '2026-08-10T02:00:00.000Z',

  access =
    'free',
} = {}) {
  const contentHash =
    username ===
      'bob'
      ? HASH_D
      : HASH_A;

  return {
    schema:
      'crablink.publication-summary.v1',

    publicationId,

    kind:
      'post',

    crabUrl:
      `crab://${contentHash}.post`,

    title:
      `${username} publication`,

    summary:
      `Public summary from ${username}`,

    creator: {
      username,

      displayName:
        username ===
          'alice'
          ? 'Alice'
          : 'Bob',

      profileUrl:
        `crab://@${username}`,

      avatarCid:
        `b3:${HASH_B}`,
    },

    publishedAt,

    updatedAt:
      publishedAt,

    visibility:
      'public',

    access,

    thumbnail: {
      kind:
        'image',

      cid:
        `b3:${HASH_C}`,

      alt:
        `${username} thumbnail`,
    },

    references: {
      manifestCid:
        `b3:${contentHash}`,

      contentCid:
        `b3:${HASH_B}`,

      siteUrl:
        'crab://site/example',
    },

    pinned:
      false,
  };
}

function cacheFixture(
  items = [
    publication(),
  ],
) {
  return {
    schema:
      LOCAL_FOLLOWING_FEED_CACHE_SCHEMA,

    items,

    cachedAt:
      '2026-08-10T02:05:00.000Z',
  };
}

function followingRecord(
  usernames = [
    'alice',
  ],
) {
  return {
    schema:
      'crablink.local-following.v1',

    entries:
      usernames.map(
        (
          username,
          index,
        ) => ({
          profileRef:
            `crab://@${username}`,

          username,

          followedAt:
            `2026-08-10T01:0${index}:00.000Z`,

          lastTimelineCursor:
            null,

          lastRefreshAt:
            null,
        }),
      ),

    updatedAt:
      '2026-08-10T01:30:00.000Z',
  };
}

test(
  'Phase 10A6 cache schema remains strict bounded and immutable',
  () => {
    const normalized =
      normalizeLocalFollowingFeedCache(
        cacheFixture(),
      );

    assert.equal(
      normalized.schema,
      'crablink.local-following-feed-cache.v1',
    );

    assert.equal(
      LOCAL_FOLLOWING_FEED_CACHE_MAX_ITEMS,
      50,
    );

    assert.equal(
      Object.isFrozen(
        normalized,
      ),
      true,
    );

    assert.equal(
      Object.isFrozen(
        normalized.items,
      ),
      true,
    );

    assert.throws(
      () =>
        normalizeLocalFollowingFeedCache({
          ...cacheFixture(),

          items:
            Array.from(
              {
                length:
                  51,
              },
              () =>
                publication(),
            ),
        }),
      /exceeds 50 items/,
    );
  },
);

test(
  'Phase 10A6 current local follows gate cached creator visibility',
  () => {
    const cache =
      cacheFixture([
        publication({
          username:
            'alice',

          publishedAt:
            '2026-08-10T02:00:00.000Z',
        }),

        publication({
          username:
            'bob',

          publishedAt:
            '2026-08-10T01:00:00.000Z',
        }),
      ]);

    const view =
      projectOfflineLocalFollowingFeedCache({
        cache,

        followingRecord:
          followingRecord([
            'alice',
          ]),
      });

    assert.equal(
      view.sourceItemCount,
      2,
    );

    assert.equal(
      view.visibleItemCount,
      1,
    );

    assert.equal(
      view.filteredItemCount,
      1,
    );

    assert.deepEqual(
      view.items.map(
        (
          item,
        ) =>
          item.creator.username,
      ),
      [
        'alice',
      ],
    );
  },
);

test(
  'Phase 10A6 unfollow state removes stale cached creator visibility without rewriting cache',
  () => {
    const raw =
      cacheFixture([
        publication(),
      ]);

    const before =
      structuredClone(
        raw,
      );

    const followed =
      projectOfflineLocalFollowingFeedCache({
        cache:
          raw,

        followingRecord:
          followingRecord([
            'alice',
          ]),
      });

    const unfollowed =
      projectOfflineLocalFollowingFeedCache({
        cache:
          raw,

        followingRecord:
          followingRecord([]),
      });

    assert.equal(
      followed.items.length,
      1,
    );

    assert.equal(
      unfollowed.items.length,
      0,
    );

    assert.deepEqual(
      raw,
      before,
    );
  },
);

test(
  'Phase 10A6 absent following truth exposes no cached creator activity',
  () => {
    const view =
      projectOfflineLocalFollowingFeedCache({
        cache:
          cacheFixture(),

        followingRecord:
          null,
      });

    assert.equal(
      view.visibleItemCount,
      0,
    );

    assert.equal(
      view.items.length,
      0,
    );
  },
);

test(
  'Phase 10A6 offline projection is always stale and creates no freshness deletion graph or ranking truth',
  () => {
    const view =
      projectOfflineLocalFollowingFeedCache({
        cache:
          cacheFixture(),

        followingRecord:
          followingRecord(),
      });

    assert.equal(
      view.schema,
      LOCAL_FOLLOWING_FEED_CACHE_VIEW_SCHEMA,
    );

    assert.equal(
      view.status,
      'stale-offline',
    );

    for (
      const field
      of [
        'fresh',
        'networkConfirmed',
        'deleted',
        'deletionConfirmed',
        'followerCount',
        'followingCount',
        'rank',
        'score',
      ]
    ) {
      assert.equal(
        view[field],
        undefined,
      );
    }
  },
);

test(
  'Phase 10A6 cached paid metadata never becomes paid entitlement or unlock truth',
  () => {
    const view =
      projectOfflineLocalFollowingFeedCache({
        cache:
          cacheFixture([
            publication({
              access:
                'paid',
            }),
          ]),

        followingRecord:
          followingRecord(),
      });

    assert.equal(
      view.items.length,
      1,
    );

    assert.equal(
      view.items[0].access,
      'paid',
    );

    for (
      const field
      of [
        'entitled',
        'paidUnlocked',
        'receipt',
        'walletBalance',
        'ledgerBalance',
        'networkConfirmed',
      ]
    ) {
      assert.equal(
        view.items[0][field],
        undefined,
      );

      assert.equal(
        view[field],
        undefined,
      );
    }
  },
);

test(
  'Phase 10A6 desktop offline reader keeps cache miss and cache failure fail closed',
  async () => {
    let followingReads =
      0;

    const miss =
      await loadOfflineLocalFollowingFeed({
        followingPort: {
          async readLocalFollowing() {
            followingReads +=
              1;

            return followingRecord();
          },
        },

        cachePort: {
          async readLocalFollowingFeedCache() {
            return null;
          },
        },
      });

    assert.equal(
      miss.status,
      'cache-miss',
    );

    assert.equal(
      miss.items.length,
      0,
    );

    assert.equal(
      followingReads,
      0,
    );

    const expected =
      new Error(
        'cache read unavailable',
      );

    await assert.rejects(
      loadOfflineLocalFollowingFeed({
        followingPort: {
          async readLocalFollowing() {
            followingReads +=
              1;

            return followingRecord();
          },
        },

        cachePort: {
          async readLocalFollowingFeedCache() {
            throw expected;
          },
        },
      }),
      (
        error,
      ) =>
        error ===
        expected,
    );

    assert.equal(
      followingReads,
      0,
    );
  },
);

test(
  'Phase 10A6 Home visibly labels cache fallback as stale offline previously verified display',
  async () => {
    const home =
      await readFile(
        homeUrl,
        'utf8',
      );

    assert.match(
      home,
      /loadOfflineLocalFollowingFeed/,
    );

    assert.match(
      home,
      /'stale-offline'/,
    );

    assert.match(
      home,
      /source:\s*'cache'/,
    );

    assert.equal(
      home.includes(
        'Showing previously verified public summaries from this device because live refresh is unavailable.',
      ),
      true,
    );

    assert.equal(
      home.includes(
        'Live following activity is unavailable and there is no usable offline activity for currently followed profiles.',
      ),
      true,
    );
  },
);

test(
  'Phase 10A6 desktop cache adapter stays on fixed native persistence commands and shared normalization',
  async () => {
    const source =
      await readFile(
        cacheAdapterUrl,
        'utf8',
      );

    assert.equal(
      source.includes(
        "'local_following_feed_cache_read'",
      ),
      true,
    );

    assert.equal(
      source.includes(
        "'local_following_feed_cache_write'",
      ),
      true,
    );

    assert.equal(
      source.includes(
        'normalizeLocalFollowingFeedCache',
      ),
      true,
    );

    for (
      const forbidden
      of [
        'fetch(',
        'localStorage.',
        'sessionStorage.',
        'window.__TAURI__',
        'followerCount',
        'followingCount',
      ]
    ) {
      assert.equal(
        source.includes(
          forbidden,
        ),
        false,
        `forbidden cache adapter token: ${forbidden}`,
      );
    }
  },
);

test(
  'Phase 10A6 paid content and site gates remain live backend only and do not consume display caches',
  async () => {
    const [
      asset,
      site,
    ] =
      await Promise.all([
        readFile(
          assetGateUrl,
          'utf8',
        ),

        readFile(
          siteGateUrl,
          'utf8',
        ),
      ]);

    assert.equal(
      asset.includes(
        'client.pay(',
      ),
      true,
    );

    assert.equal(
      asset.includes(
        'confirmed: true',
      ),
      true,
    );

    assert.equal(
      site.includes(
        'visitClient.pay(',
      ),
      true,
    );

    assert.equal(
      site.includes(
        '{ confirmed: true }',
      ),
      true,
    );

    for (
      const source
      of [
        asset,
        site,
      ]
    ) {
      for (
        const forbidden
        of [
          'readLocalFollowingFeedCache',
          'loadOfflineLocalFollowingFeed',
          'readRecentReceipts',
          'readLocalCatalog',
        ]
      ) {
        assert.equal(
          source.includes(
            forbidden,
          ),
          false,
          `paid gate must not consume display cache: ${forbidden}`,
        );
      }
    }
  },
);
