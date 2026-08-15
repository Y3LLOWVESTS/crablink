import assert from 'node:assert/strict';
import test from 'node:test';

import {
  LOCAL_FOLLOWING_MAX_ENTRIES,
  LOCAL_FOLLOWING_SCHEMA,
  followLocalProfile,
  normalizeLocalFollowingRecord,
  unfollowLocalProfile,
} from './localFollowing.js';

const ORIGINAL_UPDATED_AT =
  '2026-08-09T18:00:00.000Z';

const FOLLOWED_AT =
  '2026-08-09T18:05:00.000Z';

const UNFOLLOWED_AT =
  '2026-08-09T18:10:00.000Z';

function entryFixture(
  username,
  overrides = {},
) {
  return {
    profileRef:
      `crab://@${username}`,
    username,
    followedAt:
      FOLLOWED_AT,
    lastTimelineCursor:
      null,
    lastRefreshAt:
      null,
    ...overrides,
  };
}

function recordFixture(
  entries = [],
  overrides = {},
) {
  return {
    schema:
      LOCAL_FOLLOWING_SCHEMA,
    entries,
    updatedAt:
      ORIGINAL_UPDATED_AT,
    ...overrides,
  };
}

test(
  'phase8a5 follow appends one reviewed public profile locally',
  () => {
    const result =
      followLocalProfile(
        recordFixture(),
        {
          profileRef:
            'crab://@RustyCreator',
          username:
            '@RustyCreator',
          followedAt:
            FOLLOWED_AT,
        },
      );

    assert.equal(
      result.changed,
      true,
    );

    assert.deepEqual(
      result.record,
      {
        schema:
          LOCAL_FOLLOWING_SCHEMA,
        entries: [
          {
            profileRef:
              'crab://@rustycreator',
            username:
              'rustycreator',
            followedAt:
              FOLLOWED_AT,
            lastTimelineCursor:
              null,
            lastRefreshAt:
              null,
          },
        ],
        updatedAt:
          FOLLOWED_AT,
      },
    );

    assert.equal(
      Object.isFrozen(result),
      true,
    );

    assert.equal(
      Object.isFrozen(
        result.record,
      ),
      true,
    );
  },
);

test(
  'phase8a5 repeated follow is idempotent and preserves existing metadata',
  () => {
    const existing =
      entryFixture(
        'rustycreator',
        {
          followedAt:
            '2026-08-08T10:00:00.000Z',
          lastTimelineCursor:
            'opaque-existing-cursor',
          lastRefreshAt:
            '2026-08-09T17:00:00.000Z',
        },
      );

    const record =
      normalizeLocalFollowingRecord(
        recordFixture(
          [
            existing,
          ],
        ),
      );

    const result =
      followLocalProfile(
        record,
        {
          profileRef:
            'crab://@rustycreator',
          username:
            'rustycreator',
          followedAt:
            FOLLOWED_AT,
        },
      );

    assert.equal(
      result.changed,
      false,
    );

    assert.deepEqual(
      result.record,
      record,
    );

    assert.equal(
      result.record.updatedAt,
      ORIGINAL_UPDATED_AT,
    );

    assert.equal(
      result.record.entries[0]
        .followedAt,
      '2026-08-08T10:00:00.000Z',
    );

    assert.equal(
      result.record.entries[0]
        .lastTimelineCursor,
      'opaque-existing-cursor',
    );
  },
);

test(
  'phase8a5 follow rejects mismatched public profile identity',
  () => {
    assert.throws(
      () =>
        followLocalProfile(
          recordFixture(),
          {
            profileRef:
              'crab://@othercreator',
            username:
              'rustycreator',
            followedAt:
              FOLLOWED_AT,
          },
        ),
      /does not match username/,
    );
  },
);

test(
  'phase8a5 follow remains bounded at the record limit',
  () => {
    const entries =
      Array.from(
        {
          length:
            LOCAL_FOLLOWING_MAX_ENTRIES,
        },
        (_, index) => {
          const username =
            `u${String(index).padStart(5, '0')}`;

          return entryFixture(
            username,
          );
        },
      );

    const record =
      normalizeLocalFollowingRecord(
        recordFixture(
          entries,
        ),
      );

    assert.throws(
      () =>
        followLocalProfile(
          record,
          {
            profileRef:
              'crab://@overflowcreator',
            username:
              'overflowcreator',
            followedAt:
              FOLLOWED_AT,
          },
        ),
      /entry limit exceeded/,
    );
  },
);

test(
  'phase8a5 unfollow removes only the selected local creator',
  () => {
    const record =
      normalizeLocalFollowingRecord(
        recordFixture([
          entryFixture(
            'firstcreator',
          ),
          entryFixture(
            'rustycreator',
          ),
          entryFixture(
            'thirdcreator',
          ),
        ]),
      );

    const result =
      unfollowLocalProfile(
        record,
        {
          profileRef:
            'crab://@RustyCreator',
          updatedAt:
            UNFOLLOWED_AT,
        },
      );

    assert.equal(
      result.changed,
      true,
    );

    assert.deepEqual(
      result.record.entries.map(
        (entry) =>
          entry.username,
      ),
      [
        'firstcreator',
        'thirdcreator',
      ],
    );

    assert.equal(
      result.record.updatedAt,
      UNFOLLOWED_AT,
    );
  },
);

test(
  'phase8a5 absent unfollow is idempotent and preserves updatedAt',
  () => {
    const record =
      normalizeLocalFollowingRecord(
        recordFixture([
          entryFixture(
            'rustycreator',
          ),
        ]),
      );

    const result =
      unfollowLocalProfile(
        record,
        {
          profileRef:
            'crab://@absentcreator',
          updatedAt:
            UNFOLLOWED_AT,
        },
      );

    assert.equal(
      result.changed,
      false,
    );

    assert.deepEqual(
      result.record,
      record,
    );

    assert.equal(
      result.record.updatedAt,
      ORIGINAL_UPDATED_AT,
    );
  },
);

test(
  'phase8a5 mutation actions reject unsupported fields',
  () => {
    assert.throws(
      () =>
        followLocalProfile(
          recordFixture(),
          {
            profileRef:
              'crab://@rustycreator',
            username:
              'rustycreator',
            followedAt:
              FOLLOWED_AT,
            notifyCreator:
              true,
          },
        ),
      /unsupported field: notifyCreator/,
    );

    assert.throws(
      () =>
        unfollowLocalProfile(
          recordFixture(),
          {
            profileRef:
              'crab://@rustycreator',
            updatedAt:
              UNFOLLOWED_AT,
            networkConfirmation:
              true,
          },
        ),
      /unsupported field: networkConfirmation/,
    );
  },
);

test(
  'phase8a5 follow and unfollow never mutate caller-owned records',
  () => {
    const input =
      recordFixture([
        entryFixture(
          'firstcreator',
        ),
      ]);

    const before =
      JSON.stringify(
        input,
      );

    const followed =
      followLocalProfile(
        input,
        {
          profileRef:
            'crab://@rustycreator',
          username:
            'rustycreator',
          followedAt:
            FOLLOWED_AT,
        },
      );

    assert.equal(
      JSON.stringify(input),
      before,
    );

    const followedBefore =
      JSON.stringify(
        followed.record,
      );

    unfollowLocalProfile(
      followed.record,
      {
        profileRef:
          'crab://@rustycreator',
        updatedAt:
          UNFOLLOWED_AT,
      },
    );

    assert.equal(
      JSON.stringify(
        followed.record,
      ),
      followedBefore,
    );
  },
);

test(
  'phase8a5 domain mutation result exposes only record and changed',
  () => {
    const result =
      followLocalProfile(
        recordFixture(),
        {
          profileRef:
            'crab://@rustycreator',
          username:
            'rustycreator',
          followedAt:
            FOLLOWED_AT,
        },
      );

    assert.deepEqual(
      Object.keys(result),
      [
        'record',
        'changed',
      ],
    );

    assert.equal(
      result.networkConfirmed,
      undefined,
    );

    assert.equal(
      result.creatorNotified,
      undefined,
    );

    assert.equal(
      result.receipt,
      undefined,
    );

    assert.equal(
      result.followerCount,
      undefined,
    );
  },
);
