import assert from 'node:assert/strict';
import test from 'node:test';

import {
  LOCAL_FOLLOWING_READ_COMMAND,
  LOCAL_FOLLOWING_WRITE_COMMAND,
  createDesktopLocalFollowingAdapter,
} from './localFollowingAdapter.js';

const UPDATED_AT =
  '2026-08-09T18:05:00.000Z';

function recordFixture(
  overrides = {},
) {
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
          '2026-08-09T18:00:00.000Z',
        lastTimelineCursor:
          null,
        lastRefreshAt:
          null,
      },
    ],
    updatedAt:
      UPDATED_AT,
    ...overrides,
  };
}

test(
  'phase8a6 exposes exactly the reviewed local persistence port',
  () => {
    const adapter =
      createDesktopLocalFollowingAdapter({
        callTauriImpl:
          async () => null,
      });

    assert.deepEqual(
      Object.keys(adapter),
      [
        'readLocalFollowing',
        'writeLocalFollowing',
      ],
    );

    assert.equal(
      adapter.followProfile,
      undefined,
    );

    assert.equal(
      adapter.unfollowProfile,
      undefined,
    );

    assert.equal(
      adapter.uploadFollowing,
      undefined,
    );

    assert.equal(
      Object.isFrozen(adapter),
      true,
    );
  },
);

test(
  'phase8a6 read uses only the fixed native read command',
  async () => {
    const calls = [];

    const adapter =
      createDesktopLocalFollowingAdapter({
        callTauriImpl:
          async (
            command,
            args,
          ) => {
            calls.push({
              command,
              args,
            });

            return recordFixture();
          },
      });

    const record =
      await adapter.readLocalFollowing();

    assert.deepEqual(
      calls,
      [
        {
          command:
            LOCAL_FOLLOWING_READ_COMMAND,
          args:
            undefined,
        },
      ],
    );

    assert.equal(
      record.schema,
      'crablink.local-following.v1',
    );

    assert.equal(
      Object.isFrozen(record),
      true,
    );

    assert.equal(
      Object.isFrozen(
        record.entries,
      ),
      true,
    );
  },
);

test(
  'phase8a6 absent native state remains absent',
  async () => {
    const adapter =
      createDesktopLocalFollowingAdapter({
        callTauriImpl:
          async () => null,
      });

    assert.equal(
      await adapter.readLocalFollowing(),
      null,
    );
  },
);

test(
  'phase8a6 write normalizes before crossing IPC',
  async () => {
    const calls = [];

    const adapter =
      createDesktopLocalFollowingAdapter({
        callTauriImpl:
          async (
            command,
            args,
          ) => {
            calls.push({
              command,
              args,
            });

            return args.record;
          },
      });

    const written =
      await adapter.writeLocalFollowing({
        schema:
          'crablink.local-following.v1',
        entries: [
          {
            profileRef:
              ' crab://@RustyCreator ',
            username:
              ' @RustyCreator ',
            followedAt:
              '2026-08-09T13:00:00-05:00',
            lastTimelineCursor:
              ' cursor-001 ',
            lastRefreshAt:
              '2026-08-09T13:04:00-05:00',
          },
        ],
        updatedAt:
          '2026-08-09T13:05:00-05:00',
      });

    assert.equal(
      calls.length,
      1,
    );

    assert.equal(
      calls[0].command,
      LOCAL_FOLLOWING_WRITE_COMMAND,
    );

    assert.deepEqual(
      calls[0].args.record,
      {
        schema:
          'crablink.local-following.v1',
        entries: [
          {
            profileRef:
              'crab://@rustycreator',
            username:
              'rustycreator',
            followedAt:
              '2026-08-09T18:00:00.000Z',
            lastTimelineCursor:
              'cursor-001',
            lastRefreshAt:
              '2026-08-09T18:04:00.000Z',
          },
        ],
        updatedAt:
          '2026-08-09T18:05:00.000Z',
      },
    );

    assert.deepEqual(
      written,
      calls[0].args.record,
    );

    assert.equal(
      Object.isFrozen(written),
      true,
    );
  },
);

test(
  'phase8a6 invalid writes fail before native invocation',
  async () => {
    let calls = 0;

    const adapter =
      createDesktopLocalFollowingAdapter({
        callTauriImpl:
          async () => {
            calls += 1;
            return null;
          },
      });

    await assert.rejects(
      adapter.writeLocalFollowing({
        ...recordFixture(),
        serverFollowerCount:
          100,
      }),
      /unsupported field/,
    );

    assert.equal(
      calls,
      0,
    );
  },
);

test(
  'phase8a6 invalid native read state fails closed',
  async () => {
    const adapter =
      createDesktopLocalFollowingAdapter({
        callTauriImpl:
          async () => ({
            ...recordFixture(),
            networkConfirmed:
              true,
          }),
      });

    await assert.rejects(
      adapter.readLocalFollowing(),
      /unsupported field/,
    );
  },
);

test(
  'phase8a6 validates the native write response before returning it',
  async () => {
    const adapter =
      createDesktopLocalFollowingAdapter({
        callTauriImpl:
          async () => ({
            ...recordFixture(),
            receipt:
              'forbidden',
          }),
      });

    await assert.rejects(
      adapter.writeLocalFollowing(
        recordFixture(),
      ),
      /unsupported field/,
    );
  },
);

test(
  'phase8a6 preserves native adapter errors without inventing confirmation',
  async () => {
    const expected =
      new Error(
        'local following write failed',
      );

    const adapter =
      createDesktopLocalFollowingAdapter({
        callTauriImpl:
          async () => {
            throw expected;
          },
      });

    await assert.rejects(
      adapter.writeLocalFollowing(
        recordFixture(),
      ),
      (error) =>
        error === expected,
    );
  },
);

test(
  'phase8a6 command names are local persistence only',
  () => {
    assert.equal(
      LOCAL_FOLLOWING_READ_COMMAND,
      'local_following_read',
    );

    assert.equal(
      LOCAL_FOLLOWING_WRITE_COMMAND,
      'local_following_write',
    );

    for (const command of [
      LOCAL_FOLLOWING_READ_COMMAND,
      LOCAL_FOLLOWING_WRITE_COMMAND,
    ]) {
      assert.equal(
        command.includes(
          'network',
        ),
        false,
      );

      assert.equal(
        command.includes(
          'follower_count',
        ),
        false,
      );

      assert.equal(
        command.includes(
          'receipt',
        ),
        false,
      );

      assert.equal(
        command.includes(
          'wallet',
        ),
        false,
      );
    }
  },
);
