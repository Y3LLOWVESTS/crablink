import assert from 'node:assert/strict';
import test from 'node:test';

import {
  LOCAL_FOLLOWING_HYDRATION_DEFAULT_CONCURRENCY,
  LOCAL_FOLLOWING_HYDRATION_DEFAULT_CREATOR_LIMIT,
  LOCAL_FOLLOWING_HYDRATION_DEFAULT_PUBLICATION_LIMIT,
  LOCAL_FOLLOWING_HYDRATION_MAX_CONCURRENCY,
  LOCAL_FOLLOWING_HYDRATION_MAX_CREATORS,
  LOCAL_FOLLOWING_HYDRATION_MAX_PUBLICATION_LIMIT,
  LOCAL_FOLLOWING_HYDRATION_SCHEMA,
  hydrateLocalFollowingFeedBatch,
} from './localFollowingFeedHydrator.js';

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

function page(
  items,
  nextCursor = null,
) {
  return {
    schema:
      'crablink.publication-page.v1',
    items,
    nextCursor,
    hasMore:
      nextCursor !== null,
  };
}

function followingPort(
  record,
  calls = [],
) {
  return {
    async readLocalFollowing() {
      calls.push(
        'readLocalFollowing',
      );

      return record;
    },

    async writeLocalFollowing() {
      throw new Error(
        'writeLocalFollowing must not be used by hydration',
      );
    },
  };
}

test(
  'phase9a2 absent local following state performs no network timeline reads',
  async () => {
    let publicationCalls =
      0;

    const result =
      await hydrateLocalFollowingFeedBatch({
        followingPort:
          followingPort(
            null,
          ),
        publicationPort: {
          async listCreatorPublications() {
            publicationCalls +=
              1;

            return page([]);
          },
        },
      });

    assert.equal(
      publicationCalls,
      0,
    );

    assert.equal(
      result.status,
      'empty',
    );

    assert.equal(
      result.feed.items.length,
      0,
    );
  },
);

test(
  'phase9a2 empty local following record performs no network timeline reads',
  async () => {
    let publicationCalls =
      0;

    const result =
      await hydrateLocalFollowingFeedBatch({
        followingPort:
          followingPort(
            followingRecord([]),
          ),
        publicationPort: {
          async listCreatorPublications() {
            publicationCalls +=
              1;

            return page([]);
          },
        },
      });

    assert.equal(
      publicationCalls,
      0,
    );

    assert.equal(
      result.followedCreatorCount,
      0,
    );
  },
);

test(
  'phase9a2 hydrates each followed creator with an individual bounded request',
  async () => {
    const requests =
      [];

    const result =
      await hydrateLocalFollowingFeedBatch({
        followingPort:
          followingPort(
            followingRecord([
              'alice',
              'bob',
            ]),
          ),
        publicationPort: {
          async listCreatorPublications(
            request,
          ) {
            requests.push(
              structuredClone(
                request,
              ),
            );

            if (
              request.username ===
              'alice'
            ) {
              return page([
                publication(
                  'alice',
                  'alice-new',
                  '2026-08-09T20:00:00.000Z',
                ),
              ]);
            }

            return page([
              publication(
                'bob',
                'bob-old',
                '2026-08-09T19:00:00.000Z',
              ),
            ]);
          },
        },
      });

    assert.deepEqual(
      requests,
      [
        {
          username:
            'alice',
          limit:
            20,
        },
        {
          username:
            'bob',
          limit:
            20,
        },
      ],
    );

    assert.deepEqual(
      result.feed.items.map(
        (item) =>
          item.publicationId,
      ),
      [
        'alice-new',
        'bob-old',
      ],
    );

    assert.equal(
      result.status,
      'ready',
    );
  },
);

test(
  'phase9a2 never passes the complete following record to publication transport',
  async () => {
    const following =
      followingRecord([
        'alice',
        'bob',
        'carol',
      ]);

    const requests =
      [];

    await hydrateLocalFollowingFeedBatch({
      followingPort:
        followingPort(
          following,
        ),
      publicationPort: {
        async listCreatorPublications(
          request,
        ) {
          requests.push(
            request,
          );

          return page([]);
        },
      },
    });

    for (
      const request
      of requests
    ) {
      assert.deepEqual(
        Object.keys(
          request,
        ),
        [
          'username',
          'limit',
        ],
      );

      assert.equal(
        request.followingRecord,
        undefined,
      );

      assert.equal(
        request.followingList,
        undefined,
      );

      assert.equal(
        request.usernames,
        undefined,
      );
    }
  },
);

test(
  'phase9a2 creator hydration is bounded into stable local batches',
  async () => {
    const requests =
      [];

    const result =
      await hydrateLocalFollowingFeedBatch({
        followingPort:
          followingPort(
            followingRecord([
              'alice',
              'bob',
              'carol',
              'dave',
            ]),
          ),
        publicationPort: {
          async listCreatorPublications(
            request,
          ) {
            requests.push(
              request.username,
            );

            return page([]);
          },
        },
        creatorOffset:
          1,
        creatorLimit:
          2,
      });

    assert.deepEqual(
      requests,
      [
        'bob',
        'carol',
      ],
    );

    assert.equal(
      result.creatorOffset,
      1,
    );

    assert.equal(
      result.nextCreatorOffset,
      3,
    );

    assert.equal(
      result.hasMoreCreators,
      true,
    );

    assert.equal(
      result.followedCreatorCount,
      4,
    );

    assert.equal(
      result.selectedCreatorCount,
      2,
    );
  },
);

test(
  'phase9a2 final creator batch has no next local offset',
  async () => {
    const result =
      await hydrateLocalFollowingFeedBatch({
        followingPort:
          followingPort(
            followingRecord([
              'alice',
              'bob',
              'carol',
            ]),
          ),
        publicationPort: {
          async listCreatorPublications() {
            return page([]);
          },
        },
        creatorOffset:
          2,
        creatorLimit:
          2,
      });

    assert.equal(
      result.nextCreatorOffset,
      null,
    );

    assert.equal(
      result.hasMoreCreators,
      false,
    );
  },
);

test(
  'phase9a2 concurrency never exceeds the reviewed bound supplied by caller',
  async () => {
    let active =
      0;

    let maximumActive =
      0;

    await hydrateLocalFollowingFeedBatch({
      followingPort:
        followingPort(
          followingRecord([
            'alice',
            'bob',
            'carol',
            'dave',
          ]),
        ),
      publicationPort: {
        async listCreatorPublications() {
          active +=
            1;

          maximumActive =
            Math.max(
              maximumActive,
              active,
            );

          await new Promise(
            (resolve) =>
              setTimeout(
                resolve,
                5,
              ),
          );

          active -=
            1;

          return page([]);
        },
      },
      concurrency:
        2,
      creatorLimit:
        4,
    });

    assert.equal(
      maximumActive <= 2,
      true,
    );

    assert.equal(
      maximumActive >= 1,
      true,
    );
  },
);

test(
  'phase9a2 one creator failure produces truthful partial feed state',
  async () => {
    const result =
      await hydrateLocalFollowingFeedBatch({
        followingPort:
          followingPort(
            followingRecord([
              'alice',
              'bob',
            ]),
          ),
        publicationPort: {
          async listCreatorPublications(
            request,
          ) {
            if (
              request.username ===
              'bob'
            ) {
              throw Object.assign(
                new Error(
                  'gateway unavailable',
                ),
                {
                  status:
                    502,
                  retryable:
                    true,
                },
              );
            }

            return page([
              publication(
                'alice',
                'alice-001',
                '2026-08-09T20:00:00.000Z',
              ),
            ]);
          },
        },
      });

    assert.equal(
      result.status,
      'partial',
    );

    assert.equal(
      result.successfulCreatorCount,
      1,
    );

    assert.equal(
      result.failedCreatorCount,
      1,
    );

    assert.deepEqual(
      result.feed.items.map(
        (item) =>
          item.publicationId,
      ),
      [
        'alice-001',
      ],
    );

    assert.deepEqual(
      result.failures,
      [
        {
          username:
            'bob',
          message:
            'gateway unavailable',
          status:
            502,
          retryable:
            true,
        },
      ],
    );
  },
);

test(
  'phase9a2 all creator failures return error without invented publications',
  async () => {
    const result =
      await hydrateLocalFollowingFeedBatch({
        followingPort:
          followingPort(
            followingRecord([
              'alice',
              'bob',
            ]),
          ),
        publicationPort: {
          async listCreatorPublications() {
            throw new Error(
              'offline',
            );
          },
        },
      });

    assert.equal(
      result.status,
      'error',
    );

    assert.equal(
      result.successfulCreatorCount,
      0,
    );

    assert.equal(
      result.failedCreatorCount,
      2,
    );

    assert.equal(
      result.feed.items.length,
      0,
    );
  },
);

test(
  'phase9a2 malformed publication page fails only that creator hydration',
  async () => {
    const result =
      await hydrateLocalFollowingFeedBatch({
        followingPort:
          followingPort(
            followingRecord([
              'alice',
              'bob',
            ]),
          ),
        publicationPort: {
          async listCreatorPublications(
            request,
          ) {
            if (
              request.username ===
              'bob'
            ) {
              return {
                schema:
                  'wrong.schema',
                items:
                  [],
                nextCursor:
                  null,
                hasMore:
                  false,
              };
            }

            return page([]);
          },
        },
      });

    assert.equal(
      result.status,
      'partial',
    );

    assert.equal(
      result.successfulCreatorCount,
      1,
    );

    assert.equal(
      result.failedCreatorCount,
      1,
    );

    assert.equal(
      result.failures[0]
        .username,
      'bob',
    );
  },
);

test(
  'phase9a2 creator identity mismatch fails only the mismatched hydration',
  async () => {
    const result =
      await hydrateLocalFollowingFeedBatch({
        followingPort:
          followingPort(
            followingRecord([
              'alice',
              'bob',
            ]),
          ),
        publicationPort: {
          async listCreatorPublications(
            request,
          ) {
            if (
              request.username ===
              'bob'
            ) {
              return page([
                publication(
                  'mallory',
                  'wrong-creator',
                  '2026-08-09T20:00:00.000Z',
                ),
              ]);
            }

            return page([]);
          },
        },
      });

    assert.equal(
      result.status,
      'partial',
    );

    assert.equal(
      result.failedCreatorCount,
      1,
    );

    assert.equal(
      result.failures[0]
        .username,
      'bob',
    );
  },
);

test(
  'phase9a2 input and network pressure bounds fail closed',
  async () => {
    const base = {
      followingPort:
        followingPort(
          null,
        ),
      publicationPort: {
        async listCreatorPublications() {
          return page([]);
        },
      },
    };

    for (
      const invalid
      of [
        {
          creatorLimit:
            0,
        },
        {
          creatorLimit:
            33,
        },
        {
          concurrency:
            0,
        },
        {
          concurrency:
            9,
        },
        {
          publicationLimit:
            0,
        },
        {
          publicationLimit:
            51,
        },
        {
          creatorOffset:
            -1,
        },
      ]
    ) {
      await assert.rejects(
        hydrateLocalFollowingFeedBatch({
          ...base,
          ...invalid,
        }),
      );
    }
  },
);

test(
  'phase9a2 reviewed default and maximum bounds are locked',
  () => {
    assert.equal(
      LOCAL_FOLLOWING_HYDRATION_DEFAULT_CREATOR_LIMIT,
      16,
    );

    assert.equal(
      LOCAL_FOLLOWING_HYDRATION_MAX_CREATORS,
      32,
    );

    assert.equal(
      LOCAL_FOLLOWING_HYDRATION_DEFAULT_CONCURRENCY,
      4,
    );

    assert.equal(
      LOCAL_FOLLOWING_HYDRATION_MAX_CONCURRENCY,
      8,
    );

    assert.equal(
      LOCAL_FOLLOWING_HYDRATION_DEFAULT_PUBLICATION_LIMIT,
      20,
    );

    assert.equal(
      LOCAL_FOLLOWING_HYDRATION_MAX_PUBLICATION_LIMIT,
      50,
    );
  },
);

test(
  'phase9a2 invalid ports fail before local or network reads',
  async () => {
    await assert.rejects(
      hydrateLocalFollowingFeedBatch({
        followingPort:
          {},
        publicationPort: {
          async listCreatorPublications() {
            return page([]);
          },
        },
      }),
      /requires readLocalFollowing/,
    );

    await assert.rejects(
      hydrateLocalFollowingFeedBatch({
        followingPort:
          followingPort(
            null,
          ),
        publicationPort:
          {},
      }),
      /requires listCreatorPublications/,
    );
  },
);

test(
  'phase9a2 hydration output is frozen and exposes no graph ranking or economic truth',
  async () => {
    const result =
      await hydrateLocalFollowingFeedBatch({
        followingPort:
          followingPort(
            followingRecord([
              'alice',
            ]),
          ),
        publicationPort: {
          async listCreatorPublications() {
            return page([]);
          },
        },
      });

    assert.equal(
      result.schema,
      LOCAL_FOLLOWING_HYDRATION_SCHEMA,
    );

    assert.equal(
      Object.isFrozen(
        result,
      ),
      true,
    );

    assert.equal(
      Object.isFrozen(
        result.creatorPages,
      ),
      true,
    );

    assert.equal(
      Object.isFrozen(
        result.failures,
      ),
      true,
    );

    for (
      const field
      of [
        'followingListUpload',
        'followerCount',
        'followingCount',
        'rank',
        'score',
        'paidRank',
        'receipt',
        'walletMutation',
        'ledgerMutation',
        'quickchainConfirmed',
        'networkConfirmed',
      ]
    ) {
      assert.equal(
        result[field],
        undefined,
      );
    }
  },
);

test(
  'phase9a2 hydration reads following state but never mutates it',
  async () => {
    const calls =
      [];

    const result =
      await hydrateLocalFollowingFeedBatch({
        followingPort:
          followingPort(
            followingRecord([
              'alice',
            ]),
            calls,
          ),
        publicationPort: {
          async listCreatorPublications() {
            return page([]);
          },
        },
      });

    assert.deepEqual(
      calls,
      [
        'readLocalFollowing',
      ],
    );

    assert.equal(
      result.status,
      'ready',
    );
  },
);
