import assert from 'node:assert/strict';
import test from 'node:test';

import {
  refreshLocalFollowingFeed,
} from './localFollowingFeedRefresh.js';

const HASH_A =
  'a'.repeat(64);

const HASH_B =
  'b'.repeat(64);

const HASH_C =
  'c'.repeat(64);

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
            `2026-08-01T1${index}:00:00.000Z`,
          lastTimelineCursor:
            null,
          lastRefreshAt:
            null,
        }),
      ),
    updatedAt:
      '2026-08-09T18:00:00.000Z',
  };
}

function publication(
  username,
  publicationId,
  publishedAt =
    '2026-08-09T20:00:00.000Z',
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

function page(
  username,
  nextCursor = null,
) {
  return {
    schema:
      'crablink.publication-page.v1',
    items: [
      publication(
        username,
        `${username}-001`,
      ),
    ],
    nextCursor,
    hasMore:
      nextCursor !==
      null,
  };
}

function followingPort(
  initial,
  {
    failWrite =
      false,
  } = {},
) {
  let reads =
    0;

  const writes =
    [];

  return {
    writes,

    async readLocalFollowing() {
      reads +=
        1;

      return structuredClone(
        initial,
      );
    },

    async writeLocalFollowing(
      record,
    ) {
      if (
        failWrite ===
          true
      ) {
        throw new Error(
          'metadata write failed',
        );
      }

      writes.push(
        structuredClone(
          record,
        ),
      );

      return structuredClone(
        record,
      );
    },
  };
}

function cachePort(
  initial = null,
  {
    failRead =
      false,
    failWrite =
      false,
  } = {},
) {
  let current =
    initial ===
      null
      ? null
      : structuredClone(
          initial,
        );

  let reads =
    0;

  const writes =
    [];

  return {
    get reads() {
      return reads;
    },

    writes,

    async readLocalFollowingFeedCache() {
      reads +=
        1;

      if (
        failRead ===
          true
      ) {
        throw new Error(
          'cache read failed',
        );
      }

      return current ===
        null
        ? null
        : structuredClone(
            current,
          );
    },

    async writeLocalFollowingFeedCache(
      value,
    ) {
      if (
        failWrite ===
          true
      ) {
        throw new Error(
          'cache write failed',
        );
      }

      current =
        structuredClone(
          value,
        );

      writes.push(
        structuredClone(
          value,
        ),
      );

      return structuredClone(
        value,
      );
    },
  };
}

function publicationPort() {
  return {
    async listCreatorPublications(
      request,
    ) {
      return page(
        request.username,
        `${request.username}-next`,
      );
    },
  };
}

test(
  'phase9a10 successful hydration persists a new bounded feed cache',
  async () => {
    const local =
      followingPort(
        followingRecord(),
      );

    const cache =
      cachePort();

    const result =
      await refreshLocalFollowingFeed({
        followingPort:
          local,
        publicationPort:
          publicationPort(),
        cachePort:
          cache,
        refreshedAt:
          '2026-08-09T20:30:00.000Z',
      });

    assert.equal(
      result.status,
      'ready',
    );

    assert.equal(
      result.metadataPersistence.status,
      'persisted',
    );

    assert.equal(
      result.cachePersistence.status,
      'persisted',
    );

    assert.equal(
      result.cachePersistence.itemCount,
      1,
    );

    assert.equal(
      result.cachePersistence.cachedAt,
      '2026-08-09T20:30:00.000Z',
    );

    assert.equal(
      cache.writes.length,
      1,
    );

    assert.equal(
      cache.writes[0].schema,
      'crablink.local-following-feed-cache.v1',
    );
  },
);

test(
  'phase9a10 refresh merges new summaries with prior bounded cache state',
  async () => {
    const prior =
      {
        schema:
          'crablink.local-following-feed-cache.v1',
        items: [
          publication(
            'bob',
            'bob-old',
            '2026-08-09T19:00:00.000Z',
          ),
        ],
        cachedAt:
          '2026-08-09T20:00:00.000Z',
      };

    const cache =
      cachePort(
        prior,
      );

    const result =
      await refreshLocalFollowingFeed({
        followingPort:
          followingPort(
            followingRecord(),
          ),
        publicationPort:
          publicationPort(),
        cachePort:
          cache,
        refreshedAt:
          '2026-08-09T20:30:00.000Z',
      });

    assert.equal(
      result.cachePersistence.status,
      'persisted',
    );

    assert.equal(
      result.cachePersistence.itemCount,
      2,
    );

    assert.deepEqual(
      cache.writes[0].items.map(
        (item) =>
          `${item.creator.username}:${item.publicationId}`,
      ),
      [
        'alice:alice-001',
        'bob:bob-old',
      ],
    );
  },
);

test(
  'phase9a10 cache write failure preserves valid feed and metadata success',
  async () => {
    const local =
      followingPort(
        followingRecord(),
      );

    const result =
      await refreshLocalFollowingFeed({
        followingPort:
          local,
        publicationPort:
          publicationPort(),
        cachePort:
          cachePort(
            null,
            {
              failWrite:
                true,
            },
          ),
        refreshedAt:
          '2026-08-09T20:30:00.000Z',
      });

    assert.equal(
      result.status,
      'ready',
    );

    assert.equal(
      result.feed.items.length,
      1,
    );

    assert.equal(
      result.metadataPersistence.status,
      'persisted',
    );

    assert.equal(
      result.cachePersistence.status,
      'failed',
    );

    assert.equal(
      result.cachePersistence.message,
      'cache write failed',
    );
  },
);

test(
  'phase9a10 metadata failure does not block cache persistence',
  async () => {
    const result =
      await refreshLocalFollowingFeed({
        followingPort:
          followingPort(
            followingRecord(),
            {
              failWrite:
                true,
            },
          ),
        publicationPort:
          publicationPort(),
        cachePort:
          cachePort(),
        refreshedAt:
          '2026-08-09T20:30:00.000Z',
      });

    assert.equal(
      result.status,
      'ready',
    );

    assert.equal(
      result.metadataPersistence.status,
      'failed',
    );

    assert.equal(
      result.cachePersistence.status,
      'persisted',
    );

    assert.equal(
      result.feed.items.length,
      1,
    );
  },
);

test(
  'phase9a10 cache read failure does not attempt cache write',
  async () => {
    const cache =
      cachePort(
        null,
        {
          failRead:
            true,
        },
      );

    const result =
      await refreshLocalFollowingFeed({
        followingPort:
          followingPort(
            followingRecord(),
          ),
        publicationPort:
          publicationPort(),
        cachePort:
          cache,
        refreshedAt:
          '2026-08-09T20:30:00.000Z',
      });

    assert.equal(
      result.cachePersistence.status,
      'failed',
    );

    assert.equal(
      result.cachePersistence.message,
      'cache read failed',
    );

    assert.equal(
      cache.writes.length,
      0,
    );
  },
);

test(
  'phase9a10 all-failed hydration skips cache persistence',
  async () => {
    const cache =
      cachePort();

    const result =
      await refreshLocalFollowingFeed({
        followingPort:
          followingPort(
            followingRecord(),
          ),
        publicationPort: {
          async listCreatorPublications() {
            throw new Error(
              'offline',
            );
          },
        },
        cachePort:
          cache,
        refreshedAt:
          '2026-08-09T20:30:00.000Z',
      });

    assert.equal(
      result.status,
      'error',
    );

    assert.equal(
      result.cachePersistence.status,
      'skipped',
    );

    assert.equal(
      cache.reads,
      0,
    );

    assert.equal(
      cache.writes.length,
      0,
    );
  },
);

test(
  'phase9a10 empty following skips cache persistence',
  async () => {
    const cache =
      cachePort();

    const result =
      await refreshLocalFollowingFeed({
        followingPort:
          followingPort(
            followingRecord(
              [],
            ),
          ),
        publicationPort:
          publicationPort(),
        cachePort:
          cache,
        refreshedAt:
          '2026-08-09T20:30:00.000Z',
      });

    assert.equal(
      result.status,
      'empty',
    );

    assert.equal(
      result.cachePersistence.status,
      'skipped',
    );

    assert.equal(
      cache.reads,
      0,
    );
  },
);

test(
  'phase9a10 omitted cache port preserves Phase9A5 compatibility',
  async () => {
    const result =
      await refreshLocalFollowingFeed({
        followingPort:
          followingPort(
            followingRecord(),
          ),
        publicationPort:
          publicationPort(),
        refreshedAt:
          '2026-08-09T20:30:00.000Z',
      });

    assert.equal(
      result.status,
      'ready',
    );

    assert.equal(
      result.metadataPersistence.status,
      'persisted',
    );

    assert.equal(
      result.cachePersistence.status,
      'skipped',
    );
  },
);

test(
  'phase9a10 malformed cache port fails before local or network activity',
  async () => {
    let localReads =
      0;

    let networkReads =
      0;

    await assert.rejects(
      refreshLocalFollowingFeed({
        followingPort: {
          async readLocalFollowing() {
            localReads +=
              1;

            return followingRecord();
          },

          async writeLocalFollowing(
            record,
          ) {
            return record;
          },
        },
        publicationPort: {
          async listCreatorPublications() {
            networkReads +=
              1;

            return page(
              'alice',
            );
          },
        },
        cachePort:
          {},
        refreshedAt:
          '2026-08-09T20:30:00.000Z',
      }),
      /cachePort requires cache read and write methods/,
    );

    assert.equal(
      localReads,
      0,
    );

    assert.equal(
      networkReads,
      0,
    );
  },
);

test(
  'phase9a10 identical cache at the same timestamp is idempotent',
  async () => {
    const prior =
      {
        schema:
          'crablink.local-following-feed-cache.v1',
        items: [
          publication(
            'alice',
            'alice-001',
          ),
        ],
        cachedAt:
          '2026-08-09T20:30:00.000Z',
      };

    const cache =
      cachePort(
        prior,
      );

    const result =
      await refreshLocalFollowingFeed({
        followingPort:
          followingPort(
            followingRecord(),
          ),
        publicationPort:
          publicationPort(),
        cachePort:
          cache,
        refreshedAt:
          '2026-08-09T20:30:00.000Z',
      });

    assert.equal(
      result.cachePersistence.status,
      'unchanged',
    );

    assert.equal(
      result.cachePersistence.changed,
      false,
    );

    assert.equal(
      cache.writes.length,
      0,
    );

    assert.equal(
      Object.isFrozen(
        result.cachePersistence,
      ),
      true,
    );
  },
);
