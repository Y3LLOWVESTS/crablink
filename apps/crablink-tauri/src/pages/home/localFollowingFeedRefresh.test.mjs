import assert from 'node:assert/strict';
import test from 'node:test';

import {
  LOCAL_FOLLOWING_REFRESH_SCHEMA,
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
    'bob',
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

function createFollowingPort(
  reads,
  writes,
) {
  let readIndex =
    0;

  return {
    async readLocalFollowing() {
      const index =
        Math.min(
          readIndex,
          reads.length - 1,
        );

      readIndex +=
        1;

      const value =
        reads[index];

      return value ===
        null
        ? null
        : structuredClone(
            value,
          );
    },

    async writeLocalFollowing(
      record,
    ) {
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

test(
  'phase9a5 ready hydration persists successful refresh metadata',
  async () => {
    const initial =
      followingRecord([
        'alice',
      ]);

    const latest =
      structuredClone(
        initial,
      );

    const writes =
      [];

    const result =
      await refreshLocalFollowingFeed({
        followingPort:
          createFollowingPort(
            [
              initial,
              latest,
            ],
            writes,
          ),
        publicationPort: {
          async listCreatorPublications() {
            return page(
              'alice',
              'alice-next',
            );
          },
        },
        refreshedAt:
          '2026-08-09T20:30:00.000Z',
      });

    assert.equal(
      result.schema,
      LOCAL_FOLLOWING_REFRESH_SCHEMA,
    );

    assert.equal(
      result.status,
      'ready',
    );

    assert.equal(
      result.metadataPersistence
        .status,
      'persisted',
    );

    assert.equal(
      result.metadataPersistence
        .updatedCreatorCount,
      1,
    );

    assert.equal(
      writes.length,
      1,
    );

    assert.equal(
      writes[0].entries[0]
        .lastTimelineCursor,
      'alice-next',
    );
  },
);

test(
  'phase9a5 partial hydration persists only successful creator pages',
  async () => {
    const initial =
      followingRecord();

    const writes =
      [];

    const result =
      await refreshLocalFollowingFeed({
        followingPort:
          createFollowingPort(
            [
              initial,
              initial,
            ],
            writes,
          ),
        publicationPort: {
          async listCreatorPublications(
            request,
          ) {
            if (
              request.username ===
              'bob'
            ) {
              throw new Error(
                'bob unavailable',
              );
            }

            return page(
              'alice',
              'alice-next',
            );
          },
        },
        refreshedAt:
          '2026-08-09T20:30:00.000Z',
      });

    assert.equal(
      result.status,
      'partial',
    );

    assert.equal(
      result.feed.items.length,
      1,
    );

    assert.equal(
      result.metadataPersistence
        .status,
      'persisted',
    );

    assert.equal(
      result.metadataPersistence
        .attemptedCreatorCount,
      1,
    );

    assert.equal(
      writes.length,
      1,
    );

    assert.equal(
      writes[0].entries[0]
        .lastRefreshAt,
      '2026-08-09T20:30:00.000Z',
    );

    assert.equal(
      writes[0].entries[1]
        .lastRefreshAt,
      null,
    );
  },
);

test(
  'phase9a5 all failed hydration skips metadata persistence',
  async () => {
    const initial =
      followingRecord();

    let readCount =
      0;

    let writeCount =
      0;

    const result =
      await refreshLocalFollowingFeed({
        followingPort: {
          async readLocalFollowing() {
            readCount +=
              1;

            return structuredClone(
              initial,
            );
          },

          async writeLocalFollowing(
            record,
          ) {
            writeCount +=
              1;

            return record;
          },
        },
        publicationPort: {
          async listCreatorPublications() {
            throw new Error(
              'offline',
            );
          },
        },
        refreshedAt:
          '2026-08-09T20:30:00.000Z',
      });

    assert.equal(
      result.status,
      'error',
    );

    assert.equal(
      result.metadataPersistence
        .status,
      'skipped',
    );

    assert.equal(
      readCount,
      1,
    );

    assert.equal(
      writeCount,
      0,
    );
  },
);

test(
  'phase9a5 empty following skips persistence reread and write',
  async () => {
    let readCount =
      0;

    let writeCount =
      0;

    const result =
      await refreshLocalFollowingFeed({
        followingPort: {
          async readLocalFollowing() {
            readCount +=
              1;

            return followingRecord(
              [],
            );
          },

          async writeLocalFollowing(
            record,
          ) {
            writeCount +=
              1;

            return record;
          },
        },
        publicationPort: {
          async listCreatorPublications() {
            throw new Error(
              'publication transport must not run',
            );
          },
        },
        refreshedAt:
          '2026-08-09T20:30:00.000Z',
      });

    assert.equal(
      result.status,
      'empty',
    );

    assert.equal(
      result.metadataPersistence
        .status,
      'skipped',
    );

    assert.equal(
      readCount,
      1,
    );

    assert.equal(
      writeCount,
      0,
    );
  },
);

test(
  'phase9a5 metadata persistence failure preserves valid hydrated feed',
  async () => {
    const initial =
      followingRecord([
        'alice',
      ]);

    let readCount =
      0;

    const result =
      await refreshLocalFollowingFeed({
        followingPort: {
          async readLocalFollowing() {
            readCount +=
              1;

            return structuredClone(
              initial,
            );
          },

          async writeLocalFollowing() {
            throw new Error(
              'local metadata write failed',
            );
          },
        },
        publicationPort: {
          async listCreatorPublications() {
            return page(
              'alice',
              'alice-next',
            );
          },
        },
        refreshedAt:
          '2026-08-09T20:30:00.000Z',
      });

    assert.equal(
      readCount,
      2,
    );

    assert.equal(
      result.status,
      'ready',
    );

    assert.equal(
      result.feed.items.length,
      1,
    );

    assert.equal(
      result.metadataPersistence
        .status,
      'failed',
    );

    assert.equal(
      result.metadataPersistence
        .message,
      'local metadata write failed',
    );
  },
);

test(
  'phase9a5 concurrent unfollow is not recreated during integrated refresh',
  async () => {
    const initial =
      followingRecord([
        'alice',
        'bob',
      ]);

    const latest =
      followingRecord([
        'bob',
      ]);

    const writes =
      [];

    const result =
      await refreshLocalFollowingFeed({
        followingPort:
          createFollowingPort(
            [
              initial,
              latest,
            ],
            writes,
          ),
        publicationPort: {
          async listCreatorPublications(
            request,
          ) {
            return page(
              request.username,
              `${request.username}-next`,
            );
          },
        },
        refreshedAt:
          '2026-08-09T20:30:00.000Z',
      });

    assert.equal(
      result.metadataPersistence
        .status,
      'persisted',
    );

    assert.equal(
      result.metadataPersistence
        .attemptedCreatorCount,
      2,
    );

    assert.equal(
      result.metadataPersistence
        .updatedCreatorCount,
      1,
    );

    assert.equal(
      result.metadataPersistence
        .skippedCreatorCount,
      1,
    );

    assert.equal(
      writes.length,
      1,
    );

    assert.deepEqual(
      writes[0].entries.map(
        (entry) =>
          entry.username,
      ),
      [
        'bob',
      ],
    );
  },
);

test(
  'phase9a5 concurrent new follow is preserved during integrated refresh',
  async () => {
    const initial =
      followingRecord([
        'alice',
      ]);

    const latest =
      followingRecord([
        'alice',
        'carol',
      ]);

    const writes =
      [];

    await refreshLocalFollowingFeed({
      followingPort:
        createFollowingPort(
          [
            initial,
            latest,
          ],
          writes,
        ),
      publicationPort: {
        async listCreatorPublications() {
          return page(
            'alice',
            'alice-next',
          );
        },
      },
      refreshedAt:
        '2026-08-09T20:30:00.000Z',
    });

    assert.equal(
      writes.length,
      1,
    );

    assert.deepEqual(
      writes[0].entries.map(
        (entry) =>
          entry.username,
      ),
      [
        'alice',
        'carol',
      ],
    );

    assert.equal(
      writes[0].entries[1]
        .lastRefreshAt,
      null,
    );
  },
);

test(
  'phase9a5 integrated refresh keeps one creator per network request',
  async () => {
    const initial =
      followingRecord([
        'alice',
        'bob',
      ]);

    const requests =
      [];

    await refreshLocalFollowingFeed({
      followingPort:
        createFollowingPort(
          [
            initial,
            initial,
          ],
          [],
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

          return page(
            request.username,
            null,
          );
        },
      },
      refreshedAt:
        '2026-08-09T20:30:00.000Z',
    });

    assert.equal(
      requests.length,
      2,
    );

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
  'phase9a5 forwards reviewed hydration bounds without adding another cursor',
  async () => {
    const initial =
      followingRecord([
        'alice',
        'bob',
      ]);

    const requests =
      [];

    const result =
      await refreshLocalFollowingFeed({
        followingPort:
          createFollowingPort(
            [
              initial,
              initial,
            ],
            [],
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

            return page(
              request.username,
              null,
            );
          },
        },
        creatorOffset:
          1,
        creatorLimit:
          1,
        concurrency:
          1,
        publicationLimit:
          7,
        refreshedAt:
          '2026-08-09T20:30:00.000Z',
      });

    assert.deepEqual(
      requests,
      [
        {
          username:
            'bob',
          limit:
            7,
        },
      ],
    );

    assert.equal(
      result.hydration
        .creatorOffset,
      1,
    );

    assert.equal(
      result.nextCursor,
      undefined,
    );

    assert.equal(
      result.cursor,
      undefined,
    );
  },
);

test(
  'phase9a5 invalid refreshedAt fails before local or network activity',
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
              null,
            );
          },
        },
        refreshedAt:
          '2026-08-09T20:30:00Z',
      }),
      /canonical ISO time/,
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
  'phase9a5 result is frozen and exposes no graph ranking or economic truth',
  async () => {
    const result =
      await refreshLocalFollowingFeed({
        followingPort:
          createFollowingPort(
            [
              followingRecord(
                [],
              ),
            ],
            [],
          ),
        publicationPort: {
          async listCreatorPublications() {
            return page(
              'alice',
              null,
            );
          },
        },
        refreshedAt:
          '2026-08-09T20:30:00.000Z',
      });

    assert.equal(
      Object.isFrozen(
        result,
      ),
      true,
    );

    assert.equal(
      Object.isFrozen(
        result.metadataPersistence,
      ),
      true,
    );

    assert.equal(
      result.feed,
      result.hydration.feed,
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
        'globalFeedCursor',
      ]
    ) {
      assert.equal(
        result[field],
        undefined,
      );
    }
  },
);
