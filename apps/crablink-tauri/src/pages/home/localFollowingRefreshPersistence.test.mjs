import assert from 'node:assert/strict';
import test from 'node:test';

import {
  persistHydratedRefreshMetadata,
} from './localFollowingRefreshPersistence.js';

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
    publishedAt:
      '2026-08-09T20:00:00.000Z',
    updatedAt:
      '2026-08-09T20:00:00.000Z',
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
  nextCursor,
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

function hydration(
  creatorPages,
) {
  return {
    schema:
      'crablink.local-following-hydration.v1',
    creatorPages,
  };
}

function persistencePort(
  record,
  {
    reads = [],
    writes = [],
    writeResult = null,
  } = {},
) {
  return {
    async readLocalFollowing() {
      reads.push(
        'read',
      );

      return structuredClone(
        record,
      );
    },

    async writeLocalFollowing(
      next,
    ) {
      writes.push(
        structuredClone(
          next,
        ),
      );

      return structuredClone(
        writeResult ||
        next,
      );
    },
  };
}

test(
  'phase9a4 successful creator pages persist refresh metadata in one write',
  async () => {
    const writes =
      [];

    const result =
      await persistHydratedRefreshMetadata({
        followingPort:
          persistencePort(
            followingRecord(),
            {
              writes,
            },
          ),
        hydration:
          hydration([
            {
              username:
                'alice',
              page:
                page(
                  'alice',
                  'alice-next',
                ),
            },
            {
              username:
                'bob',
              page:
                page(
                  'bob',
                  'bob-next',
                ),
            },
          ]),
        refreshedAt:
          '2026-08-09T20:30:00.000Z',
      });

    assert.equal(
      writes.length,
      1,
    );

    assert.equal(
      result.changed,
      true,
    );

    assert.equal(
      result.updatedCreatorCount,
      2,
    );

    assert.equal(
      result.record.entries[0]
        .lastTimelineCursor,
      'alice-next',
    );

    assert.equal(
      result.record.entries[1]
        .lastTimelineCursor,
      'bob-next',
    );
  },
);

test(
  'phase9a4 terminal creator page persists null opaque cursor',
  async () => {
    const result =
      await persistHydratedRefreshMetadata({
        followingPort:
          persistencePort(
            followingRecord(),
          ),
        hydration:
          hydration([
            {
              username:
                'alice',
              page:
                page(
                  'alice',
                  null,
                ),
            },
          ]),
        refreshedAt:
          '2026-08-09T20:30:00.000Z',
      });

    assert.equal(
      result.record.entries[0]
        .lastTimelineCursor,
      null,
    );

    assert.equal(
      result.record.entries[0]
        .lastRefreshAt,
      '2026-08-09T20:30:00.000Z',
    );
  },
);

test(
  'phase9a4 re-reads latest following state before persistence',
  async () => {
    const reads =
      [];

    await persistHydratedRefreshMetadata({
      followingPort:
        persistencePort(
          followingRecord(),
          {
            reads,
          },
        ),
      hydration:
        hydration([
          {
            username:
              'alice',
            page:
              page(
                'alice',
                'cursor',
              ),
          },
        ]),
      refreshedAt:
        '2026-08-09T20:30:00.000Z',
    });

    assert.deepEqual(
      reads,
      [
        'read',
      ],
    );
  },
);

test(
  'phase9a4 preserves creators followed after network hydration began',
  async () => {
    const latest =
      followingRecord([
        'alice',
        'bob',
        'carol',
      ]);

    const result =
      await persistHydratedRefreshMetadata({
        followingPort:
          persistencePort(
            latest,
          ),
        hydration:
          hydration([
            {
              username:
                'alice',
              page:
                page(
                  'alice',
                  'alice-next',
                ),
            },
          ]),
        refreshedAt:
          '2026-08-09T20:30:00.000Z',
      });

    assert.deepEqual(
      result.record.entries.map(
        (entry) =>
          entry.username,
      ),
      [
        'alice',
        'bob',
        'carol',
      ],
    );

    assert.equal(
      result.record.entries[2]
        .lastRefreshAt,
      null,
    );
  },
);

test(
  'phase9a4 creator unfollowed during hydration is skipped instead of restored',
  async () => {
    const writes =
      [];

    const result =
      await persistHydratedRefreshMetadata({
        followingPort:
          persistencePort(
            followingRecord([
              'bob',
            ]),
            {
              writes,
            },
          ),
        hydration:
          hydration([
            {
              username:
                'alice',
              page:
                page(
                  'alice',
                  'alice-next',
                ),
            },
          ]),
        refreshedAt:
          '2026-08-09T20:30:00.000Z',
      });

    assert.equal(
      result.changed,
      false,
    );

    assert.equal(
      result.updatedCreatorCount,
      0,
    );

    assert.equal(
      result.skippedCreatorCount,
      1,
    );

    assert.equal(
      writes.length,
      0,
    );

    assert.deepEqual(
      result.record.entries.map(
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
  'phase9a4 newer local refresh metadata wins over stale hydration completion',
  async () => {
    const latest =
      followingRecord();

    latest.entries[0]
      .lastTimelineCursor =
        'newer-cursor';

    latest.entries[0]
      .lastRefreshAt =
        '2026-08-09T21:00:00.000Z';

    latest.updatedAt =
      '2026-08-09T21:00:00.000Z';

    const writes =
      [];

    const result =
      await persistHydratedRefreshMetadata({
        followingPort:
          persistencePort(
            latest,
            {
              writes,
            },
          ),
        hydration:
          hydration([
            {
              username:
                'alice',
              page:
                page(
                  'alice',
                  'older-cursor',
                ),
            },
          ]),
        refreshedAt:
          '2026-08-09T20:30:00.000Z',
      });

    assert.equal(
      result.changed,
      false,
    );

    assert.equal(
      result.skippedCreatorCount,
      1,
    );

    assert.equal(
      result.record.entries[0]
        .lastTimelineCursor,
      'newer-cursor',
    );

    assert.equal(
      writes.length,
      0,
    );
  },
);

test(
  'phase9a4 same timestamp with conflicting cursor is skipped',
  async () => {
    const latest =
      followingRecord();

    latest.entries[0]
      .lastTimelineCursor =
        'existing-cursor';

    latest.entries[0]
      .lastRefreshAt =
        '2026-08-09T20:30:00.000Z';

    latest.updatedAt =
      '2026-08-09T20:30:00.000Z';

    const writes =
      [];

    const result =
      await persistHydratedRefreshMetadata({
        followingPort:
          persistencePort(
            latest,
            {
              writes,
            },
          ),
        hydration:
          hydration([
            {
              username:
                'alice',
              page:
                page(
                  'alice',
                  'conflicting-cursor',
                ),
            },
          ]),
        refreshedAt:
          '2026-08-09T20:30:00.000Z',
      });

    assert.equal(
      result.changed,
      false,
    );

    assert.equal(
      result.skippedCreatorCount,
      1,
    );

    assert.equal(
      writes.length,
      0,
    );
  },
);

test(
  'phase9a4 identical retry performs no persistence write',
  async () => {
    const latest =
      followingRecord();

    latest.entries[0]
      .lastTimelineCursor =
        'same-cursor';

    latest.entries[0]
      .lastRefreshAt =
        '2026-08-09T20:30:00.000Z';

    latest.updatedAt =
      '2026-08-09T20:30:00.000Z';

    const writes =
      [];

    const result =
      await persistHydratedRefreshMetadata({
        followingPort:
          persistencePort(
            latest,
            {
              writes,
            },
          ),
        hydration:
          hydration([
            {
              username:
                'alice',
              page:
                page(
                  'alice',
                  'same-cursor',
                ),
            },
          ]),
        refreshedAt:
          '2026-08-09T20:30:00.000Z',
      });

    assert.equal(
      result.changed,
      false,
    );

    assert.equal(
      result.updatedCreatorCount,
      0,
    );

    assert.equal(
      writes.length,
      0,
    );
  },
);

test(
  'phase9a4 no successful creator pages performs no local read or write',
  async () => {
    let reads =
      0;

    let writes =
      0;

    const result =
      await persistHydratedRefreshMetadata({
        followingPort: {
          async readLocalFollowing() {
            reads +=
              1;

            return followingRecord();
          },

          async writeLocalFollowing(
            record,
          ) {
            writes +=
              1;

            return record;
          },
        },
        hydration:
          hydration([]),
        refreshedAt:
          '2026-08-09T20:30:00.000Z',
      });

    assert.equal(
      reads,
      0,
    );

    assert.equal(
      writes,
      0,
    );

    assert.equal(
      result.changed,
      false,
    );
  },
);

test(
  'phase9a4 disappearing local following state cannot be recreated by hydration',
  async () => {
    let writes =
      0;

    const result =
      await persistHydratedRefreshMetadata({
        followingPort: {
          async readLocalFollowing() {
            return null;
          },

          async writeLocalFollowing(
            record,
          ) {
            writes +=
              1;

            return record;
          },
        },
        hydration:
          hydration([
            {
              username:
                'alice',
              page:
                page(
                  'alice',
                  'cursor',
                ),
            },
          ]),
        refreshedAt:
          '2026-08-09T20:30:00.000Z',
      });

    assert.equal(
      result.record,
      null,
    );

    assert.equal(
      result.skippedCreatorCount,
      1,
    );

    assert.equal(
      writes,
      0,
    );
  },
);

test(
  'phase9a4 persistence failure propagates without invented success',
  async () => {
    await assert.rejects(
      persistHydratedRefreshMetadata({
        followingPort: {
          async readLocalFollowing() {
            return followingRecord();
          },

          async writeLocalFollowing() {
            throw new Error(
              'local persistence failed',
            );
          },
        },
        hydration:
          hydration([
            {
              username:
                'alice',
              page:
                page(
                  'alice',
                  'cursor',
                ),
            },
          ]),
        refreshedAt:
          '2026-08-09T20:30:00.000Z',
      }),
      /local persistence failed/,
    );
  },
);

test(
  'phase9a4 validates hydration pages and grants no network or graph authority',
  async () => {
    await assert.rejects(
      persistHydratedRefreshMetadata({
        followingPort:
          persistencePort(
            followingRecord(),
          ),
        hydration: {
          schema:
            'wrong.schema',
          creatorPages:
            [],
        },
        refreshedAt:
          '2026-08-09T20:30:00.000Z',
      }),
      /reviewed hydration schema/,
    );

    await assert.rejects(
      persistHydratedRefreshMetadata({
        followingPort:
          persistencePort(
            followingRecord(),
          ),
        hydration:
          hydration([
            {
              username:
                'alice',
              page: {
                schema:
                  'wrong.page',
                items:
                  [],
                nextCursor:
                  null,
                hasMore:
                  false,
              },
            },
          ]),
        refreshedAt:
          '2026-08-09T20:30:00.000Z',
      }),
    );

    await assert.rejects(
      persistHydratedRefreshMetadata({
        followingPort:
          persistencePort(
            followingRecord(),
          ),
        hydration:
          hydration([]),
        refreshedAt:
          '2026-08-09T20:30:00Z',
      }),
      /canonical ISO time/,
    );
  },
);
