import assert from 'node:assert/strict';
import test from 'node:test';

import {
  LOCAL_FOLLOWING_FEED_MAX_ITEMS,
  LOCAL_FOLLOWING_FEED_SCHEMA,
  composeLocalFollowingFeed,
} from './localFollowingFeed.js';

const HASH_A =
  'a'.repeat(64);

const HASH_B =
  'b'.repeat(64);

const HASH_C =
  'c'.repeat(64);

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
            `2026-08-09T18:${String(
              index,
            ).padStart(
              2,
              '0',
            )}:00.000Z`,
          lastTimelineCursor:
            null,
          lastRefreshAt:
            null,
        }),
      ),
    updatedAt:
      '2026-08-09T19:00:00.000Z',
  };
}

function publication(
  {
    publicationId,
    username,
    publishedAt,
    pinned = false,
    visibility = 'public',
    title = '',
  },
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
      title ||
      `Publication ${publicationId}`,
    summary:
      `Summary for ${publicationId}`,
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
    access:
      'free',
    thumbnail: {
      kind:
        'image',
      cid:
        `b3:${HASH_C}`,
      alt:
        'Publication thumbnail',
    },
    references: {
      manifestCid:
        `b3:${HASH_A}`,
      contentCid:
        `b3:${HASH_B}`,
      siteUrl:
        'crab://site/example',
    },
    pinned,
  };
}

function page(
  items,
  {
    nextCursor = null,
    hasMore = false,
  } = {},
) {
  return {
    schema:
      'crablink.publication-page.v1',
    items,
    nextCursor,
    hasMore,
  };
}

test(
  'phase9a1 absent local following state composes an empty feed',
  () => {
    const result =
      composeLocalFollowingFeed({
        followingRecord:
          null,
        creatorPages:
          [],
      });

    assert.deepEqual(
      result,
      {
        schema:
          LOCAL_FOLLOWING_FEED_SCHEMA,
        items:
          [],
        followedCreatorCount:
          0,
        hydratedCreatorCount:
          0,
        sourcePageCount:
          0,
        truncated:
          false,
      },
    );

    assert.equal(
      Object.isFrozen(
        result,
      ),
      true,
    );
  },
);

test(
  'phase9a1 merges followed creator pages newest first',
  () => {
    const result =
      composeLocalFollowingFeed({
        followingRecord:
          followingRecord([
            'alice',
            'bob',
          ]),
        creatorPages: [
          {
            username:
              'alice',
            page:
              page([
                publication({
                  publicationId:
                    'alice-old',
                  username:
                    'alice',
                  publishedAt:
                    '2026-08-09T17:00:00.000Z',
                }),
                publication({
                  publicationId:
                    'alice-new',
                  username:
                    'alice',
                  publishedAt:
                    '2026-08-09T20:00:00.000Z',
                }),
              ]),
          },
          {
            username:
              'bob',
            page:
              page([
                publication({
                  publicationId:
                    'bob-middle',
                  username:
                    'bob',
                  publishedAt:
                    '2026-08-09T19:00:00.000Z',
                }),
              ]),
          },
        ],
      });

    assert.deepEqual(
      result.items.map(
        (item) =>
          item.publicationId,
      ),
      [
        'alice-new',
        'bob-middle',
        'alice-old',
      ],
    );

    assert.equal(
      result.followedCreatorCount,
      2,
    );

    assert.equal(
      result.hydratedCreatorCount,
      2,
    );
  },
);

test(
  'phase9a1 pinned profile posture never overrides Home chronology',
  () => {
    const result =
      composeLocalFollowingFeed({
        followingRecord:
          followingRecord([
            'alice',
          ]),
        creatorPages: [
          {
            username:
              'alice',
            page:
              page([
                publication({
                  publicationId:
                    'older-pinned',
                  username:
                    'alice',
                  publishedAt:
                    '2026-08-09T10:00:00.000Z',
                  pinned:
                    true,
                }),
                publication({
                  publicationId:
                    'newer-regular',
                  username:
                    'alice',
                  publishedAt:
                    '2026-08-09T20:00:00.000Z',
                }),
              ]),
          },
        ],
      });

    assert.deepEqual(
      result.items.map(
        (item) =>
          item.publicationId,
      ),
      [
        'newer-regular',
        'older-pinned',
      ],
    );
  },
);

test(
  'phase9a1 deduplicates identical overlapping publication summaries',
  () => {
    const duplicate =
      publication({
        publicationId:
          'duplicate-001',
        username:
          'alice',
        publishedAt:
          '2026-08-09T20:00:00.000Z',
      });

    const result =
      composeLocalFollowingFeed({
        followingRecord:
          followingRecord([
            'alice',
          ]),
        creatorPages: [
          {
            username:
              'alice',
            page:
              page([
                duplicate,
                duplicate,
              ]),
          },
        ],
      });

    assert.equal(
      result.items.length,
      1,
    );
  },
);

test(
  'phase9a1 conflicting duplicate summaries fail closed',
  () => {
    assert.throws(
      () =>
        composeLocalFollowingFeed({
          followingRecord:
            followingRecord([
              'alice',
            ]),
          creatorPages: [
            {
              username:
                'alice',
              page:
                page([
                  publication({
                    publicationId:
                      'conflict-001',
                    username:
                      'alice',
                    publishedAt:
                      '2026-08-09T20:00:00.000Z',
                    title:
                      'First truth',
                  }),
                  publication({
                    publicationId:
                      'conflict-001',
                    username:
                      'alice',
                    publishedAt:
                      '2026-08-09T20:00:00.000Z',
                    title:
                      'Different truth',
                  }),
                ]),
            },
          ],
        }),
      /conflicting duplicate publication/,
    );
  },
);

test(
  'phase9a1 equal timestamps have deterministic identity ordering',
  () => {
    const timestamp =
      '2026-08-09T20:00:00.000Z';

    const result =
      composeLocalFollowingFeed({
        followingRecord:
          followingRecord([
            'alice',
            'bob',
          ]),
        creatorPages: [
          {
            username:
              'bob',
            page:
              page([
                publication({
                  publicationId:
                    'b-002',
                  username:
                    'bob',
                  publishedAt:
                    timestamp,
                }),
              ]),
          },
          {
            username:
              'alice',
            page:
              page([
                publication({
                  publicationId:
                    'a-002',
                  username:
                    'alice',
                  publishedAt:
                    timestamp,
                }),
                publication({
                  publicationId:
                    'a-001',
                  username:
                    'alice',
                  publishedAt:
                    timestamp,
                }),
              ]),
          },
        ],
      });

    assert.deepEqual(
      result.items.map(
        (item) =>
          `${item.creator.username}:${item.publicationId}`,
      ),
      [
        'alice:a-001',
        'alice:a-002',
        'bob:b-002',
      ],
    );
  },
);

test(
  'phase9a1 refuses creators absent from local following',
  () => {
    assert.throws(
      () =>
        composeLocalFollowingFeed({
          followingRecord:
            followingRecord([
              'alice',
            ]),
          creatorPages: [
            {
              username:
                'mallory',
              page:
                page([]),
            },
          ],
        }),
      /source is not locally followed/,
    );
  },
);

test(
  'phase9a1 publication creator must match hydrated creator',
  () => {
    assert.throws(
      () =>
        composeLocalFollowingFeed({
          followingRecord:
            followingRecord([
              'alice',
            ]),
          creatorPages: [
            {
              username:
                'alice',
              page:
                page([
                  publication({
                    publicationId:
                      'wrong-creator',
                    username:
                      'bob',
                    publishedAt:
                      '2026-08-09T20:00:00.000Z',
                  }),
                ]),
            },
          ],
        }),
      /creator mismatch/,
    );
  },
);

test(
  'phase9a1 malformed publication pages fail before composition',
  () => {
    assert.throws(
      () =>
        composeLocalFollowingFeed({
          followingRecord:
            followingRecord([
              'alice',
            ]),
          creatorPages: [
            {
              username:
                'alice',
              page: {
                schema:
                  'wrong.schema',
                items:
                  [],
                nextCursor:
                  null,
                hasMore:
                  false,
              },
            },
          ],
        }),
    );
  },
);

test(
  'phase9a1 non-public publication states never enter Home',
  () => {
    const publicationStates =
      [
        [
          'public',
          '2026-08-09T20:00:00.000Z',
        ],
        [
          'unlisted',
          '2026-08-09T19:00:00.000Z',
        ],
        [
          'private',
          '2026-08-09T18:00:00.000Z',
        ],
        [
          'deleted',
          '2026-08-09T17:00:00.000Z',
        ],
        [
          'blocked',
          '2026-08-09T16:00:00.000Z',
        ],
        [
          'moderated',
          '2026-08-09T15:00:00.000Z',
        ],
      ];

    const result =
      composeLocalFollowingFeed({
        followingRecord:
          followingRecord([
            'alice',
          ]),
        creatorPages: [
          {
            username:
              'alice',
            page:
              page(
                publicationStates.map(
                  (
                    [
                      visibility,
                      publishedAt,
                    ],
                  ) =>
                    publication({
                      publicationId:
                        `${visibility}-item`,
                      username:
                        'alice',
                      publishedAt,
                      visibility,
                    }),
                ),
              ),
          },
        ],
      });

    assert.deepEqual(
      result.items.map(
        (item) =>
          item.publicationId,
      ),
      [
        'public-item',
      ],
    );

    assert.deepEqual(
      result.items.map(
        (item) =>
          item.visibility,
      ),
      [
        'public',
      ],
    );
  },
);

test(
  'phase9a1 output is bounded and reports truncation without a cursor',
  () => {
    const result =
      composeLocalFollowingFeed({
        followingRecord:
          followingRecord([
            'alice',
          ]),
        creatorPages: [
          {
            username:
              'alice',
            page:
              page([
                publication({
                  publicationId:
                    'item-1',
                  username:
                    'alice',
                  publishedAt:
                    '2026-08-09T20:00:00.000Z',
                }),
                publication({
                  publicationId:
                    'item-2',
                  username:
                    'alice',
                  publishedAt:
                    '2026-08-09T19:00:00.000Z',
                }),
                publication({
                  publicationId:
                    'item-3',
                  username:
                    'alice',
                  publishedAt:
                    '2026-08-09T18:00:00.000Z',
                }),
              ]),
          },
        ],
        limit:
          2,
      });

    assert.equal(
      result.items.length,
      2,
    );

    assert.equal(
      result.truncated,
      true,
    );

    assert.equal(
      result.nextCursor,
      undefined,
    );
  },
);

test(
  'phase9a1 feed limit stays within the reviewed bound',
  () => {
    assert.equal(
      LOCAL_FOLLOWING_FEED_MAX_ITEMS,
      50,
    );

    for (
      const limit
      of [
        0,
        51,
        -1,
        1.5,
        '20',
      ]
    ) {
      assert.throws(
        () =>
          composeLocalFollowingFeed({
            followingRecord:
              null,
            creatorPages:
              [],
            limit,
          }),
        /integer from 1 through 50/,
      );
    }
  },
);

test(
  'phase9a1 unknown feed fields fail closed',
  () => {
    assert.throws(
      () =>
        composeLocalFollowingFeed({
          followingRecord:
            null,
          creatorPages:
            [],
          rankingSignal:
            'engagement',
        }),
      /unsupported field: rankingSignal/,
    );

    assert.throws(
      () =>
        composeLocalFollowingFeed({
          followingRecord:
            followingRecord([
              'alice',
            ]),
          creatorPages: [
            {
              username:
                'alice',
              page:
                page([]),
              followerCount:
                100,
            },
          ],
        }),
      /unsupported field: followerCount/,
    );
  },
);

test(
  'phase9a1 composition does not mutate caller input',
  () => {
    const following =
      followingRecord([
        'alice',
      ]);

    const sourcePage =
      page([
        publication({
          publicationId:
            'immutable-001',
          username:
            'alice',
          publishedAt:
            '2026-08-09T20:00:00.000Z',
        }),
      ]);

    const beforeFollowing =
      structuredClone(
        following,
      );

    const beforePage =
      structuredClone(
        sourcePage,
      );

    composeLocalFollowingFeed({
      followingRecord:
        following,
      creatorPages: [
        {
          username:
            'alice',
          page:
            sourcePage,
        },
      ],
    });

    assert.deepEqual(
      following,
      beforeFollowing,
    );

    assert.deepEqual(
      sourcePage,
      beforePage,
    );
  },
);

test(
  'phase9a1 output exposes no ranking graph payment or confirmation truth',
  () => {
    const result =
      composeLocalFollowingFeed({
        followingRecord:
          followingRecord([
            'alice',
          ]),
        creatorPages: [
          {
            username:
              'alice',
            page:
              page([]),
          },
        ],
      });

    assert.deepEqual(
      Object.keys(result),
      [
        'schema',
        'items',
        'followedCreatorCount',
        'hydratedCreatorCount',
        'sourcePageCount',
        'truncated',
      ],
    );

    for (
      const field
      of [
        'score',
        'rank',
        'engagement',
        'paidRank',
        'followerCount',
        'followingCount',
        'receipt',
        'entitlement',
        'networkConfirmed',
        'nextCursor',
      ]
    ) {
      assert.equal(
        result[field],
        undefined,
      );
    }
  },
);
