import assert from 'node:assert/strict';
import test from 'node:test';

import {
  updateLocalFollowingRefreshMetadata,
} from './localFollowingRefreshMetadata.js';

function followingRecord({
  updatedAt =
    '2026-08-09T19:00:00.000Z',
  aliceRefreshAt =
    null,
  aliceCursor =
    null,
} = {}) {
  return {
    schema:
      'crablink.local-following.v1',
    entries: [
      {
        profileRef:
          'crab://@alice',
        username:
          'alice',
        followedAt:
          '2026-08-01T10:00:00.000Z',
        lastTimelineCursor:
          aliceCursor,
        lastRefreshAt:
          aliceRefreshAt,
      },
      {
        profileRef:
          'crab://@bob',
        username:
          'bob',
        followedAt:
          '2026-08-02T10:00:00.000Z',
        lastTimelineCursor:
          'bob-existing-cursor',
        lastRefreshAt:
          '2026-08-09T18:00:00.000Z',
      },
    ],
    updatedAt,
  };
}

test(
  'phase9a3 records one validated opaque creator cursor and refresh timestamp',
  () => {
    const result =
      updateLocalFollowingRefreshMetadata(
        followingRecord(),
        {
          username:
            'alice',
          lastTimelineCursor:
            'opaque-cursor-001',
          lastRefreshAt:
            '2026-08-09T20:00:00.000Z',
        },
      );

    assert.equal(
      result.changed,
      true,
    );

    assert.equal(
      result.record.entries[0]
        .lastTimelineCursor,
      'opaque-cursor-001',
    );

    assert.equal(
      result.record.entries[0]
        .lastRefreshAt,
      '2026-08-09T20:00:00.000Z',
    );

    assert.equal(
      result.record.updatedAt,
      '2026-08-09T20:00:00.000Z',
    );
  },
);

test(
  'phase9a3 accepts null cursor after a successful terminal page',
  () => {
    const result =
      updateLocalFollowingRefreshMetadata(
        followingRecord({
          aliceRefreshAt:
            '2026-08-09T19:00:00.000Z',
          aliceCursor:
            'old-cursor',
        }),
        {
          username:
            'alice',
          lastTimelineCursor:
            null,
          lastRefreshAt:
            '2026-08-09T20:00:00.000Z',
        },
      );

    assert.equal(
      result.record.entries[0]
        .lastTimelineCursor,
      null,
    );

    assert.equal(
      result.changed,
      true,
    );
  },
);

test(
  'phase9a3 updates only the selected followed creator',
  () => {
    const input =
      followingRecord();

    const bobBefore =
      structuredClone(
        input.entries[1],
      );

    const result =
      updateLocalFollowingRefreshMetadata(
        input,
        {
          username:
            'alice',
          lastTimelineCursor:
            'alice-cursor',
          lastRefreshAt:
            '2026-08-09T20:00:00.000Z',
        },
      );

    assert.deepEqual(
      result.record.entries[1],
      bobBefore,
    );

    assert.equal(
      result.record.entries[0]
        .followedAt,
      input.entries[0]
        .followedAt,
    );

    assert.equal(
      result.record.entries[0]
        .profileRef,
      input.entries[0]
        .profileRef,
    );
  },
);

test(
  'phase9a3 refuses metadata for a creator not locally followed',
  () => {
    assert.throws(
      () =>
        updateLocalFollowingRefreshMetadata(
          followingRecord(),
          {
            username:
              'mallory',
            lastTimelineCursor:
              null,
            lastRefreshAt:
              '2026-08-09T20:00:00.000Z',
          },
        ),
      /already-followed creator/,
    );
  },
);

test(
  'phase9a3 reuses local-following validation for cursor and timestamp bounds',
  () => {
    assert.throws(
      () =>
        updateLocalFollowingRefreshMetadata(
          followingRecord(),
          {
            username:
              'alice',
            lastTimelineCursor:
              'x'.repeat(
                513,
              ),
            lastRefreshAt:
              '2026-08-09T20:00:00.000Z',
          },
        ),
    );

    assert.throws(
      () =>
        updateLocalFollowingRefreshMetadata(
          followingRecord(),
          {
            username:
              'alice',
            lastTimelineCursor:
              null,
            lastRefreshAt:
              'not-a-timestamp',
          },
        ),
    );
  },
);

test(
  'phase9a3 stale per-creator refresh timestamps fail closed',
  () => {
    assert.throws(
      () =>
        updateLocalFollowingRefreshMetadata(
          followingRecord({
            aliceRefreshAt:
              '2026-08-09T20:00:00.000Z',
            aliceCursor:
              'cursor-new',
          }),
          {
            username:
              'alice',
            lastTimelineCursor:
              'cursor-old',
            lastRefreshAt:
              '2026-08-09T19:00:00.000Z',
          },
        ),
      /must not regress lastRefreshAt/,
    );
  },
);

test(
  'phase9a3 same refresh timestamp cannot claim a different opaque cursor',
  () => {
    assert.throws(
      () =>
        updateLocalFollowingRefreshMetadata(
          followingRecord({
            aliceRefreshAt:
              '2026-08-09T20:00:00.000Z',
            aliceCursor:
              'cursor-a',
          }),
          {
            username:
              'alice',
            lastTimelineCursor:
              'cursor-b',
            lastRefreshAt:
              '2026-08-09T20:00:00.000Z',
          },
        ),
      /conflicts at the same refresh timestamp/,
    );
  },
);

test(
  'phase9a3 identical retry is idempotent and preserves the normalized record',
  () => {
    const result =
      updateLocalFollowingRefreshMetadata(
        followingRecord({
          aliceRefreshAt:
            '2026-08-09T20:00:00.000Z',
          aliceCursor:
            'cursor-a',
          updatedAt:
            '2026-08-09T21:00:00.000Z',
        }),
        {
          username:
            'alice',
          lastTimelineCursor:
            'cursor-a',
          lastRefreshAt:
            '2026-08-09T20:00:00.000Z',
        },
      );

    assert.equal(
      result.changed,
      false,
    );

    assert.equal(
      result.record.updatedAt,
      '2026-08-09T21:00:00.000Z',
    );
  },
);

test(
  'phase9a3 out-of-order creator completions never regress record updatedAt',
  () => {
    const result =
      updateLocalFollowingRefreshMetadata(
        followingRecord({
          updatedAt:
            '2026-08-09T22:00:00.000Z',
        }),
        {
          username:
            'alice',
          lastTimelineCursor:
            'alice-older-completion',
          lastRefreshAt:
            '2026-08-09T21:00:00.000Z',
        },
      );

    assert.equal(
      result.record.entries[0]
        .lastRefreshAt,
      '2026-08-09T21:00:00.000Z',
    );

    assert.equal(
      result.record.updatedAt,
      '2026-08-09T22:00:00.000Z',
    );
  },
);

test(
  'phase9a3 mutation is immutable and grants no extra authority fields',
  () => {
    const input =
      followingRecord();

    const before =
      structuredClone(
        input,
      );

    const result =
      updateLocalFollowingRefreshMetadata(
        input,
        {
          username:
            'alice',
          lastTimelineCursor:
            'opaque-local-cursor',
          lastRefreshAt:
            '2026-08-09T20:00:00.000Z',
        },
      );

    assert.deepEqual(
      input,
      before,
    );

    assert.equal(
      Object.isFrozen(
        result,
      ),
      true,
    );

    assert.equal(
      Object.isFrozen(
        result.record,
      ),
      true,
    );

    assert.deepEqual(
      Object.keys(
        result,
      ),
      [
        'record',
        'changed',
      ],
    );

    for (
      const field
      of [
        'networkConfirmed',
        'followingListUpload',
        'rank',
        'score',
        'receipt',
        'walletMutation',
        'ledgerMutation',
        'quickchainConfirmed',
      ]
    ) {
      assert.equal(
        result[field],
        undefined,
      );
    }

    assert.throws(
      () =>
        updateLocalFollowingRefreshMetadata(
          input,
          {
            username:
              'alice',
            lastTimelineCursor:
              null,
            lastRefreshAt:
              '2026-08-09T20:00:00.000Z',
            networkConfirmed:
              true,
          },
        ),
      /unsupported field: networkConfirmed/,
    );
  },
);
