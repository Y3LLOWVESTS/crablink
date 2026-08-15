import assert from 'node:assert/strict';
import test from 'node:test';

import {
  followProfileLocalFollowing,
  readProfileLocalFollowing,
  unfollowProfileLocalFollowing,
} from './profileLocalFollowingController.js';

const FOLLOWED_AT =
  '2026-08-09T18:05:00.000Z';

const UNFOLLOWED_AT =
  '2026-08-09T18:10:00.000Z';

function recordFixture() {
  return {
    schema:
      'crablink.local-following.v1',
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
  };
}

test(
  'phase8a7 absent local persistence reads as not following',
  async () => {
    let writes = 0;

    const result =
      await readProfileLocalFollowing({
        username:
          'RustyCreator',
        port: {
          readLocalFollowing:
            async () => null,
          writeLocalFollowing:
            async () => {
              writes += 1;
              return null;
            },
        },
      });

    assert.equal(
      result.record,
      null,
    );

    assert.equal(
      result.profileRef,
      'crab://@rustycreator',
    );

    assert.equal(
      result.isFollowing,
      false,
    );

    assert.equal(
      result.changed,
      false,
    );

    assert.equal(
      writes,
      0,
    );
  },
);

test(
  'phase8a7 persisted entry reads as locally following',
  async () => {
    const result =
      await readProfileLocalFollowing({
        username:
          '@RustyCreator',
        port: {
          readLocalFollowing:
            async () =>
              recordFixture(),
          writeLocalFollowing:
            async (record) =>
              record,
        },
      });

    assert.equal(
      result.isFollowing,
      true,
    );

    assert.equal(
      result.record.entries.length,
      1,
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
  'phase8a7 follow from absent state persists one local creator',
  async () => {
    const writes = [];

    const result =
      await followProfileLocalFollowing({
        username:
          'rustycreator',
        record:
          null,
        followedAt:
          FOLLOWED_AT,
        port: {
          readLocalFollowing:
            async () => null,
          writeLocalFollowing:
            async (record) => {
              writes.push(
                record,
              );

              return record;
            },
        },
      });

    assert.equal(
      result.changed,
      true,
    );

    assert.equal(
      result.isFollowing,
      true,
    );

    assert.equal(
      writes.length,
      1,
    );

    assert.equal(
      writes[0].entries.length,
      1,
    );

    assert.equal(
      writes[0].entries[0]
        .profileRef,
      'crab://@rustycreator',
    );
  },
);

test(
  'phase8a7 repeated follow performs no persistence write',
  async () => {
    let writes = 0;

    const result =
      await followProfileLocalFollowing({
        username:
          'rustycreator',
        record:
          recordFixture(),
        followedAt:
          '2026-08-09T18:06:00.000Z',
        port: {
          readLocalFollowing:
            async () =>
              recordFixture(),
          writeLocalFollowing:
            async (record) => {
              writes += 1;
              return record;
            },
        },
      });

    assert.equal(
      result.changed,
      false,
    );

    assert.equal(
      result.isFollowing,
      true,
    );

    assert.equal(
      writes,
      0,
    );

    assert.equal(
      result.record.updatedAt,
      FOLLOWED_AT,
    );
  },
);

test(
  'phase8a7 unfollow persists removal from the private local record',
  async () => {
    const writes = [];

    const result =
      await unfollowProfileLocalFollowing({
        username:
          'rustycreator',
        record:
          recordFixture(),
        updatedAt:
          UNFOLLOWED_AT,
        port: {
          readLocalFollowing:
            async () =>
              recordFixture(),
          writeLocalFollowing:
            async (record) => {
              writes.push(
                record,
              );

              return record;
            },
        },
      });

    assert.equal(
      result.changed,
      true,
    );

    assert.equal(
      result.isFollowing,
      false,
    );

    assert.equal(
      writes.length,
      1,
    );

    assert.equal(
      writes[0].entries.length,
      0,
    );
  },
);

test(
  'phase8a7 absent unfollow is idempotent and writes nothing',
  async () => {
    let writes = 0;

    const result =
      await unfollowProfileLocalFollowing({
        username:
          'rustycreator',
        record:
          null,
        updatedAt:
          UNFOLLOWED_AT,
        port: {
          readLocalFollowing:
            async () => null,
          writeLocalFollowing:
            async (record) => {
              writes += 1;
              return record;
            },
        },
      });

    assert.equal(
      result.changed,
      false,
    );

    assert.equal(
      result.isFollowing,
      false,
    );

    assert.equal(
      result.record,
      null,
    );

    assert.equal(
      writes,
      0,
    );
  },
);

test(
  'phase8a7 malformed profile identity fails before persistence write',
  async () => {
    let writes = 0;

    await assert.rejects(
      followProfileLocalFollowing({
        username:
          '../creator',
        record:
          null,
        followedAt:
          FOLLOWED_AT,
        port: {
          readLocalFollowing:
            async () => null,
          writeLocalFollowing:
            async (record) => {
              writes += 1;
              return record;
            },
        },
      }),
      /username is invalid/,
    );

    assert.equal(
      writes,
      0,
    );
  },
);

test(
  'phase8a7 persistence failures propagate without invented confirmation',
  async () => {
    const expected =
      new Error(
        'local persistence unavailable',
      );

    await assert.rejects(
      followProfileLocalFollowing({
        username:
          'rustycreator',
        record:
          null,
        followedAt:
          FOLLOWED_AT,
        port: {
          readLocalFollowing:
            async () => null,
          writeLocalFollowing:
            async () => {
              throw expected;
            },
        },
      }),
      (error) =>
        error === expected,
    );
  },
);

test(
  'phase8a7 controller results expose no network or economic truth',
  async () => {
    const result =
      await readProfileLocalFollowing({
        username:
          'rustycreator',
        port: {
          readLocalFollowing:
            async () =>
              recordFixture(),
          writeLocalFollowing:
            async (record) =>
              record,
        },
      });

    assert.deepEqual(
      Object.keys(result),
      [
        'record',
        'profileRef',
        'isFollowing',
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
