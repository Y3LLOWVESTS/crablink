import assert from 'node:assert/strict';
import test from 'node:test';

import {
  LOCAL_FOLLOWING_FEED_CACHE_MAX_ITEMS,
  LOCAL_FOLLOWING_FEED_CACHE_SCHEMA,
  LOCAL_FOLLOWING_FEED_CACHE_VIEW_SCHEMA,
  createLocalFollowingFeedCache,
  normalizeLocalFollowingFeedCache,
  projectOfflineLocalFollowingFeedCache,
  updateLocalFollowingFeedCache,
} from './localFollowingFeedCache.js';

const HASH_A =
  'a'.repeat(64);

const HASH_B =
  'b'.repeat(64);

const HASH_C =
  'c'.repeat(64);

function publication({
  username = 'alice',
  publicationId = 'publication-001',
  publishedAt = '2026-08-09T20:00:00.000Z',
  title = 'Publication',
  visibility = 'public',
  access = 'free',
} = {}) {
  return {
    schema:
      'crablink.publication-summary.v1',
    publicationId,
    kind:
      'post',
    crabUrl:
      `crab://${HASH_A}.post`,
    title,
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
    visibility,
    access,
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

function feed(
  items,
) {
  return {
    schema:
      'crablink.local-following-feed.v1',
    items,
    followedCreatorCount:
      1,
    hydratedCreatorCount:
      1,
    sourcePageCount:
      1,
    truncated:
      false,
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
      '2026-08-09T21:00:00.000Z',
  };
}

test(
  'phase9a6 creates a strict empty bounded cache',
  () => {
    const cache =
      createLocalFollowingFeedCache({
        feed:
          feed([]),
        cachedAt:
          '2026-08-09T21:00:00.000Z',
      });

    assert.equal(
      cache.schema,
      LOCAL_FOLLOWING_FEED_CACHE_SCHEMA,
    );

    assert.deepEqual(
      cache.items,
      [],
    );

    assert.equal(
      cache.cachedAt,
      '2026-08-09T21:00:00.000Z',
    );
  },
);

test(
  'phase9a6 stores validated public summaries in chronological order',
  () => {
    const cache =
      createLocalFollowingFeedCache({
        feed:
          feed([
            publication({
              username:
                'alice',
              publicationId:
                'newer',
              publishedAt:
                '2026-08-09T21:00:00.000Z',
            }),
            publication({
              username:
                'bob',
              publicationId:
                'older',
              publishedAt:
                '2026-08-09T20:00:00.000Z',
            }),
          ]),
        cachedAt:
          '2026-08-09T21:05:00.000Z',
      });

    assert.deepEqual(
      cache.items.map(
        (item) =>
          item.publicationId,
      ),
      [
        'newer',
        'older',
      ],
    );
  },
);

test(
  'phase9a6 cache update preserves older validated summaries absent from the latest batch',
  () => {
    const first =
      createLocalFollowingFeedCache({
        feed:
          feed([
            publication({
              publicationId:
                'older',
              publishedAt:
                '2026-08-09T19:00:00.000Z',
            }),
          ]),
        cachedAt:
          '2026-08-09T20:00:00.000Z',
      });

    const updated =
      updateLocalFollowingFeedCache({
        cache:
          first,
        feed:
          feed([
            publication({
              publicationId:
                'newer',
              publishedAt:
                '2026-08-09T21:00:00.000Z',
            }),
          ]),
        cachedAt:
          '2026-08-09T21:05:00.000Z',
      });

    assert.deepEqual(
      updated.items.map(
        (item) =>
          item.publicationId,
      ),
      [
        'newer',
        'older',
      ],
    );
  },
);

test(
  'phase9a6 refreshed duplicate identity replaces the older cached display summary',
  () => {
    const first =
      createLocalFollowingFeedCache({
        feed:
          feed([
            publication({
              publicationId:
                'same-id',
              title:
                'Old title',
            }),
          ]),
        cachedAt:
          '2026-08-09T20:05:00.000Z',
      });

    const updated =
      updateLocalFollowingFeedCache({
        cache:
          first,
        feed:
          feed([
            publication({
              publicationId:
                'same-id',
              title:
                'Updated title',
            }),
          ]),
        cachedAt:
          '2026-08-09T21:05:00.000Z',
      });

    assert.equal(
      updated.items.length,
      1,
    );

    assert.equal(
      updated.items[0]
        .title,
      'Updated title',
    );
  },
);

test(
  'phase9a6 cache is globally bounded to the newest fifty summaries',
  () => {
    let cache =
      createLocalFollowingFeedCache({
        feed:
          feed([]),
        cachedAt:
          '2026-08-09T20:00:00.000Z',
      });

    for (
      let index = 0;
      index < 60;
      index += 1
    ) {
      const minute =
        String(
          index,
        ).padStart(
          2,
          '0',
        );

      const publishedAt =
        index < 60
          ? `2026-08-09T20:${minute}:00.000Z`
          : '2026-08-09T20:00:00.000Z';

      cache =
        updateLocalFollowingFeedCache({
          cache,
          feed:
            feed([
              publication({
                publicationId:
                  `publication-${String(
                    index,
                  ).padStart(
                    3,
                    '0',
                  )}`,
                publishedAt,
              }),
            ]),
          cachedAt:
            `2026-08-09T21:${minute}:00.000Z`,
        });
    }

    assert.equal(
      cache.items.length,
      LOCAL_FOLLOWING_FEED_CACHE_MAX_ITEMS,
    );

    assert.equal(
      cache.items[0]
        .publicationId,
      'publication-059',
    );

    assert.equal(
      cache.items[
        cache.items.length -
        1
      ].publicationId,
      'publication-010',
    );
  },
);

test(
  'phase9a6 malformed or non-public summaries fail closed',
  () => {
    assert.throws(
      () =>
        createLocalFollowingFeedCache({
          feed:
            feed([
              {
                schema:
                  'wrong.schema',
              },
            ]),
          cachedAt:
            '2026-08-09T21:00:00.000Z',
        }),
    );

    for (
      const visibility
      of [
        'unlisted',
        'private',
        'deleted',
        'blocked',
        'moderated',
      ]
    ) {
      assert.throws(
        () =>
          createLocalFollowingFeedCache({
            feed:
              feed([
                publication({
                  publicationId:
                    `${visibility}-incoming`,
                  visibility,
                }),
              ]),
            cachedAt:
              '2026-08-09T21:00:00.000Z',
          }),
        /only public publication summaries/,
      );

      assert.throws(
        () =>
          normalizeLocalFollowingFeedCache({
            schema:
              LOCAL_FOLLOWING_FEED_CACHE_SCHEMA,
            items: [
              publication({
                publicationId:
                  `${visibility}-persisted`,
                visibility,
              }),
            ],
            cachedAt:
              '2026-08-09T21:00:00.000Z',
          }),
      );
    }
  },
);

test(
  'phase9a6 duplicate incoming identities fail closed',
  () => {
    const item =
      publication();

    assert.throws(
      () =>
        createLocalFollowingFeedCache({
          feed:
            feed([
              item,
              structuredClone(
                item,
              ),
            ]),
          cachedAt:
            '2026-08-09T21:00:00.000Z',
        }),
      /duplicate publication identity/,
    );
  },
);

test(
  'phase9a6 cache timestamp must be canonical and never regress',
  () => {
    const cache =
      createLocalFollowingFeedCache({
        feed:
          feed([]),
        cachedAt:
          '2026-08-09T21:00:00.000Z',
      });

    assert.throws(
      () =>
        updateLocalFollowingFeedCache({
          cache,
          feed:
            feed([]),
          cachedAt:
            '2026-08-09T20:00:00.000Z',
        }),
      /must not regress/,
    );

    assert.throws(
      () =>
        createLocalFollowingFeedCache({
          feed:
            feed([]),
          cachedAt:
            '2026-08-09T21:00:00Z',
        }),
      /canonical ISO time/,
    );
  },
);

test(
  'phase9a6 offline projection immediately hides creators no longer followed',
  () => {
    const cache =
      createLocalFollowingFeedCache({
        feed:
          feed([
            publication({
              username:
                'alice',
              publicationId:
                'alice-post',
              publishedAt:
                '2026-08-09T21:00:00.000Z',
            }),
            publication({
              username:
                'bob',
              publicationId:
                'bob-post',
              publishedAt:
                '2026-08-09T20:00:00.000Z',
            }),
          ]),
        cachedAt:
          '2026-08-09T21:05:00.000Z',
      });

    const view =
      projectOfflineLocalFollowingFeedCache({
        cache,
        followingRecord:
          followingRecord([
            'bob',
          ]),
      });

    assert.deepEqual(
      view.items.map(
        (item) =>
          item.publicationId,
      ),
      [
        'bob-post',
      ],
    );

    assert.equal(
      view.filteredItemCount,
      1,
    );
  },
);

test(
  'phase9a6 absent local following truth renders no cached creator items',
  () => {
    const cache =
      createLocalFollowingFeedCache({
        feed:
          feed([
            publication(),
          ]),
        cachedAt:
          '2026-08-09T21:05:00.000Z',
      });

    const view =
      projectOfflineLocalFollowingFeedCache({
        cache,
        followingRecord:
          null,
      });

    assert.equal(
      view.visibleItemCount,
      0,
    );

    assert.equal(
      view.sourceItemCount,
      1,
    );
  },
);

test(
  'phase9a6 offline projection is explicitly stale and carries no freshness deletion or entitlement truth',
  () => {
    const cache =
      createLocalFollowingFeedCache({
        feed:
          feed([
            publication({
              access:
                'paid',
            }),
          ]),
        cachedAt:
          '2026-08-09T21:05:00.000Z',
      });

    const view =
      projectOfflineLocalFollowingFeedCache({
        cache,
        followingRecord:
          followingRecord([
            'alice',
          ]),
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
        'entitled',
        'paidUnlocked',
        'receipt',
        'rank',
        'score',
      ]
    ) {
      assert.equal(
        view[field],
        undefined,
      );
    }

    assert.equal(
      view.items[0]
        .access,
      'paid',
    );

    assert.equal(
      view.items[0]
        .entitled,
      undefined,
    );
  },
);

test(
  'phase9a6 normalization and projection are immutable and reject unsupported cache fields',
  () => {
    const raw =
      {
        schema:
          LOCAL_FOLLOWING_FEED_CACHE_SCHEMA,
        items: [
          publication(),
        ],
        cachedAt:
          '2026-08-09T21:05:00.000Z',
      };

    const before =
      structuredClone(
        raw,
      );

    const cache =
      normalizeLocalFollowingFeedCache(
        raw,
      );

    const view =
      projectOfflineLocalFollowingFeedCache({
        cache,
        followingRecord:
          followingRecord([
            'alice',
          ]),
      });

    assert.deepEqual(
      raw,
      before,
    );

    assert.equal(
      Object.isFrozen(
        cache,
      ),
      true,
    );

    assert.equal(
      Object.isFrozen(
        cache.items,
      ),
      true,
    );

    assert.equal(
      Object.isFrozen(
        view,
      ),
      true,
    );

    assert.equal(
      Object.isFrozen(
        view.items,
      ),
      true,
    );

    assert.throws(
      () =>
        normalizeLocalFollowingFeedCache({
          ...raw,
          networkConfirmed:
            true,
        }),
      /unsupported field: networkConfirmed/,
    );
  },
);
