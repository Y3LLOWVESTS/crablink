import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createMemoryLocalFollowingAdapter,
} from './localFollowingMemoryAdapter.js';

const UPDATED_AT =
  '2026-08-09T18:05:00.000Z';

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
          '2026-08-09T18:00:00.000Z',
        lastTimelineCursor:
          null,
        lastRefreshAt:
          null,
      },
    ],
    updatedAt:
      UPDATED_AT,
  };
}

test(
  'phase8a2 memory persistence starts absent by default',
  async () => {
    const adapter =
      createMemoryLocalFollowingAdapter();

    assert.equal(
      await adapter.readLocalFollowing(),
      null,
    );
  },
);

test(
  'phase8a2 memory persistence snapshots constructor input',
  async () => {
    const initial =
      recordFixture();

    const adapter =
      createMemoryLocalFollowingAdapter(
        initial,
      );

    initial.entries.length = 0;
    initial.updatedAt =
      '2026-08-09T19:00:00.000Z';

    const stored =
      await adapter.readLocalFollowing();

    assert.equal(
      stored.entries.length,
      1,
    );

    assert.equal(
      stored.updatedAt,
      UPDATED_AT,
    );

    assert.equal(
      Object.isFrozen(stored),
      true,
    );

    assert.equal(
      Object.isFrozen(
        stored.entries,
      ),
      true,
    );

    assert.equal(
      Object.isFrozen(
        stored.entries[0],
      ),
      true,
    );
  },
);

test(
  'phase8a2 memory persistence isolates writes from caller references',
  async () => {
    const adapter =
      createMemoryLocalFollowingAdapter();

    const input =
      recordFixture();

    const written =
      await adapter.writeLocalFollowing(
        input,
      );

    input.entries.length = 0;

    const stored =
      await adapter.readLocalFollowing();

    assert.equal(
      written.entries.length,
      1,
    );

    assert.equal(
      stored.entries.length,
      1,
    );

    assert.equal(
      Object.isFrozen(written),
      true,
    );

    assert.equal(
      Object.isFrozen(stored),
      true,
    );

    assert.notEqual(
      written,
      stored,
    );
  },
);

test(
  'phase8a2 repeated writes deterministically replace local preference state',
  async () => {
    const adapter =
      createMemoryLocalFollowingAdapter(
        recordFixture(),
      );

    const replacement = {
      schema:
        'crablink.local-following.v1',
      entries:
        [],
      updatedAt:
        '2026-08-09T18:10:00.000Z',
    };

    await adapter.writeLocalFollowing(
      replacement,
    );

    const stored =
      await adapter.readLocalFollowing();

    assert.deepEqual(
      stored,
      replacement,
    );

    assert.equal(
      Object.isFrozen(stored),
      true,
    );
  },
);

test(
  'phase8a2 memory persistence rejects non-record writes',
  async () => {
    const adapter =
      createMemoryLocalFollowingAdapter();

    for (const value of [
      null,
      'record',
      42,
      [],
    ]) {
      await assert.rejects(
        adapter.writeLocalFollowing(
          value,
        ),
        /requires a record/,
      );
    }
  },
);

test(
  'phase8a2 memory adapter grants no extra relationship authority',
  () => {
    const adapter =
      createMemoryLocalFollowingAdapter();

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
      adapter.networkRelationship,
      undefined,
    );

    assert.equal(
      Object.isFrozen(adapter),
      true,
    );
  },
);
