import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  LOCAL_FOLLOWING_OFFLINE_FEED_SCHEMA,
  loadOfflineLocalFollowingFeed,
} from './localFollowingOfflineFeedProjection.js';

const HASH_A =
  'a'.repeat(64);

const HASH_B =
  'b'.repeat(64);

const HASH_C =
  'c'.repeat(64);

function publication(
  username,
  publicationId,
  publishedAt,
) {
  return {
    schema:
      'crablink.publication-summary.v1',
    publicationId,
    kind:
      'post',
    crabUrl:
      `crab://${HASH_A}.post`,
    title:
      publicationId,
    summary:
      `Summary ${publicationId}`,
    creator: {
      username,
      displayName:
        username,
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
    access:
      'free',
    thumbnail: {
      kind:
        'image',
      cid:
        `b3:${HASH_C}`,
      alt:
        'thumbnail',
    },
    references: {
      manifestCid:
        `b3:${HASH_A}`,
      contentCid:
        `b3:${HASH_B}`,
      siteUrl:
        'crab://site/example',
    },
    pinned:
      false,
  };
}

function cache() {
  return {
    schema:
      'crablink.local-following-feed-cache.v1',
    items: [
      publication(
        'alice',
        'alice-new',
        '2026-08-09T20:00:00.000Z',
      ),
      publication(
        'bob',
        'bob-old',
        '2026-08-09T19:00:00.000Z',
      ),
    ],
    cachedAt:
      '2026-08-09T20:30:00.000Z',
  };
}

function followingRecord(
  usernames,
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
            `2026-08-01T1${index}:00:00.000Z`,
          lastTimelineCursor:
            null,
          lastRefreshAt:
            null,
        }),
      ),
    updatedAt:
      '2026-08-09T20:15:00.000Z',
  };
}

function createPorts({
  cached =
    cache(),
  following =
    followingRecord([
      'alice',
    ]),
  cacheError =
    null,
  followingError =
    null,
} = {}) {
  let cacheReads =
    0;

  let followingReads =
    0;

  return {
    get cacheReads() {
      return cacheReads;
    },

    get followingReads() {
      return followingReads;
    },

    cachePort: {
      async readLocalFollowingFeedCache() {
        cacheReads +=
          1;

        if (
          cacheError !==
            null
        ) {
          throw cacheError;
        }

        return cached ===
          null
          ? null
          : structuredClone(
              cached,
            );
      },
    },

    followingPort: {
      async readLocalFollowing() {
        followingReads +=
          1;

        if (
          followingError !==
            null
        ) {
          throw followingError;
        }

        return following ===
          null
          ? null
          : structuredClone(
              following,
            );
      },
    },
  };
}

test(
  'phase9a11 cache miss is explicit and avoids following read',
  async () => {
    const ports =
      createPorts({
        cached:
          null,
      });

    const result =
      await loadOfflineLocalFollowingFeed({
        followingPort:
          ports.followingPort,
        cachePort:
          ports.cachePort,
      });

    assert.equal(
      result.schema,
      LOCAL_FOLLOWING_OFFLINE_FEED_SCHEMA,
    );

    assert.equal(
      result.status,
      'cache-miss',
    );

    assert.deepEqual(
      result.items,
      [],
    );

    assert.equal(
      ports.cacheReads,
      1,
    );

    assert.equal(
      ports.followingReads,
      0,
    );
  },
);

test(
  'phase9a11 current local follows filter creators from persisted cache',
  async () => {
    const ports =
      createPorts();

    const result =
      await loadOfflineLocalFollowingFeed({
        followingPort:
          ports.followingPort,
        cachePort:
          ports.cachePort,
      });

    assert.equal(
      result.status,
      'stale-offline',
    );

    assert.deepEqual(
      result.items.map(
        (item) =>
          item.creator.username,
      ),
      [
        'alice',
      ],
    );

    assert.equal(
      result.sourceItemCount,
      2,
    );

    assert.equal(
      result.visibleItemCount,
      1,
    );

    assert.equal(
      result.filteredItemCount,
      1,
    );
  },
);

test(
  'phase9a11 absent local following state exposes no cached creator items',
  async () => {
    const ports =
      createPorts({
        following:
          null,
      });

    const result =
      await loadOfflineLocalFollowingFeed({
        followingPort:
          ports.followingPort,
        cachePort:
          ports.cachePort,
      });

    assert.equal(
      result.status,
      'stale-offline',
    );

    assert.equal(
      result.visibleItemCount,
      0,
    );

    assert.equal(
      result.filteredItemCount,
      2,
    );

    assert.deepEqual(
      result.items,
      [],
    );
  },
);

test(
  'phase9a11 empty current following record filters every cached item',
  async () => {
    const ports =
      createPorts({
        following:
          followingRecord(
            [],
          ),
      });

    const result =
      await loadOfflineLocalFollowingFeed({
        followingPort:
          ports.followingPort,
        cachePort:
          ports.cachePort,
      });

    assert.equal(
      result.visibleItemCount,
      0,
    );

    assert.equal(
      result.filteredItemCount,
      2,
    );
  },
);

test(
  'phase9a11 malformed cache fails before local following read',
  async () => {
    const ports =
      createPorts({
        cached: {
          schema:
            'wrong.schema',
          items:
            [],
          cachedAt:
            '2026-08-09T20:30:00.000Z',
        },
      });

    await assert.rejects(
      loadOfflineLocalFollowingFeed({
        followingPort:
          ports.followingPort,
        cachePort:
          ports.cachePort,
      }),
    );

    assert.equal(
      ports.cacheReads,
      1,
    );

    assert.equal(
      ports.followingReads,
      1,
    );
  },
);

test(
  'phase9a11 malformed current following state fails closed',
  async () => {
    const ports =
      createPorts({
        following: {
          schema:
            'wrong.schema',
        },
      });

    await assert.rejects(
      loadOfflineLocalFollowingFeed({
        followingPort:
          ports.followingPort,
        cachePort:
          ports.cachePort,
      }),
    );
  },
);

test(
  'phase9a11 cache read failure never reads local following state',
  async () => {
    const ports =
      createPorts({
        cacheError:
          new Error(
            'cache unavailable',
          ),
      });

    await assert.rejects(
      loadOfflineLocalFollowingFeed({
        followingPort:
          ports.followingPort,
        cachePort:
          ports.cachePort,
      }),
      /cache unavailable/,
    );

    assert.equal(
      ports.followingReads,
      0,
    );
  },
);

test(
  'phase9a11 validates both read ports before local activity',
  async () => {
    let cacheReads =
      0;

    await assert.rejects(
      loadOfflineLocalFollowingFeed({
        followingPort:
          {},
        cachePort: {
          async readLocalFollowingFeedCache() {
            cacheReads +=
              1;

            return null;
          },
        },
      }),
      /local following read method/,
    );

    assert.equal(
      cacheReads,
      0,
    );
  },
);

test(
  'phase9a11 projected result and item collection are frozen',
  async () => {
    const ports =
      createPorts();

    const result =
      await loadOfflineLocalFollowingFeed({
        followingPort:
          ports.followingPort,
        cachePort:
          ports.cachePort,
      });

    assert.equal(
      Object.isFrozen(
        result,
      ),
      true,
    );

    assert.equal(
      Object.isFrozen(
        result.items,
      ),
      true,
    );

    assert.equal(
      result.cachedAt,
      '2026-08-09T20:30:00.000Z',
    );
  },
);

test(
  'phase9a11 source adds no network write graph ranking or economic authority',
  () => {
    const source =
      fs.readFileSync(
        new URL(
          './localFollowingOfflineFeedProjection.js',
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
        'writeLocalFollowing',
        'writeLocalFollowingFeedCache',
        'followLocalProfile',
        'unfollowLocalProfile',
        'followerCount',
        'followingCount',
        'rank:',
        'score:',
        'wallet_',
        'ledger_',
        'receipt_',
        'quickchain_',
        'rox_',
        'solana_',
        'paidUnlocked',
        'networkConfirmed',
      ]
    ) {
      assert.equal(
        source.includes(
          forbidden,
        ),
        false,
        `forbidden offline projection authority token: ${forbidden}`,
      );
    }

    assert.equal(
      source.includes(
        'projectOfflineLocalFollowingFeedCache',
      ),
      true,
    );
  },
);
