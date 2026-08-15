import assert from 'node:assert/strict';
import test from 'node:test';

import {
  LOCAL_FOLLOWING_MAX_ENTRIES,
  LOCAL_FOLLOWING_SCHEMA,
  createEmptyLocalFollowingRecord,
  findLocalFollowingEntry,
  isLocallyFollowing,
  normalizeLocalFollowingEntry,
  normalizeLocalFollowingRecord,
  normalizePublicProfileRef,
} from './localFollowing.js';

const FOLLOWED_AT =
  '2026-08-09T12:00:00.000Z';

const UPDATED_AT =
  '2026-08-09T12:05:00.000Z';

function entryFixture(
  overrides = {},
) {
  return {
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
    ...overrides,
  };
}

function recordFixture(
  overrides = {},
) {
  return {
    schema:
      LOCAL_FOLLOWING_SCHEMA,
    entries: [
      entryFixture(),
    ],
    updatedAt:
      UPDATED_AT,
    ...overrides,
  };
}

test(
  'phase8a1 creates a strict empty local following record',
  () => {
    const record =
      createEmptyLocalFollowingRecord(
        UPDATED_AT,
      );

    assert.deepEqual(
      record,
      {
        schema:
          'crablink.local-following.v1',
        entries:
          [],
        updatedAt:
          UPDATED_AT,
      },
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
  'phase8a1 normalizes one public profile following entry',
  () => {
    const entry =
      normalizeLocalFollowingEntry({
        profileRef:
          ' crab://@RustyCreator ',
        username:
          ' @RustyCreator ',
        followedAt:
          '2026-08-09T07:00:00-05:00',
        lastTimelineCursor:
          ' cursor-001 ',
        lastRefreshAt:
          '2026-08-09T07:03:00-05:00',
      });

    assert.deepEqual(
      entry,
      {
        profileRef:
          'crab://@rustycreator',
        username:
          'rustycreator',
        followedAt:
          '2026-08-09T12:00:00.000Z',
        lastTimelineCursor:
          'cursor-001',
        lastRefreshAt:
          '2026-08-09T12:03:00.000Z',
      },
    );

    assert.equal(
      Object.isFrozen(entry),
      true,
    );
  },
);

test(
  'phase8a1 requires username and public profile reference to agree',
  () => {
    assert.throws(
      () =>
        normalizeLocalFollowingEntry(
          entryFixture({
            profileRef:
              'crab://@othercreator',
          }),
        ),
      /does not match username/,
    );
  },
);

test(
  'phase8a1 rejects non-profile references and unsafe username shapes',
  () => {
    assert.throws(
      () =>
        normalizePublicProfileRef(
          'crab://home',
        ),
      /public crab profile reference/,
    );

    assert.throws(
      () =>
        normalizeLocalFollowingEntry(
          entryFixture({
            username:
              '../creator',
          }),
        ),
      /username is invalid/,
    );
  },
);

test(
  'phase8a1 rejects unknown and secret-shaped persisted fields',
  () => {
    assert.throws(
      () =>
        normalizeLocalFollowingRecord({
          ...recordFixture(),
          privateKey:
            'forbidden',
        }),
      /unsupported field: privateKey/,
    );

    assert.throws(
      () =>
        normalizeLocalFollowingEntry({
          ...entryFixture(),
          recoveryPhrase:
            'forbidden',
        }),
      /unsupported field: recoveryPhrase/,
    );

    assert.throws(
      () =>
        normalizeLocalFollowingEntry({
          ...entryFixture(),
          capabilityToken:
            'forbidden',
        }),
      /unsupported field: capabilityToken/,
    );
  },
);

test(
  'phase8a1 rejects duplicate local profile entries',
  () => {
    assert.throws(
      () =>
        normalizeLocalFollowingRecord({
          ...recordFixture(),
          entries: [
            entryFixture(),
            entryFixture({
              followedAt:
                '2026-08-09T12:01:00.000Z',
            }),
          ],
        }),
      /profile is duplicated/,
    );
  },
);

test(
  'phase8a1 enforces a bounded local following record',
  () => {
    assert.equal(
      LOCAL_FOLLOWING_MAX_ENTRIES,
      10000,
    );

    assert.throws(
      () =>
        normalizeLocalFollowingRecord(
          recordFixture({
            entries: [
              entryFixture(),
              entryFixture({
                profileRef:
                  'crab://@secondcreator',
                username:
                  'secondcreator',
              }),
            ],
          }),
          {
            maxEntries:
              1,
          },
        ),
      /entry limit exceeded/,
    );
  },
);

test(
  'phase8a1 rejects invalid timestamps and cursors',
  () => {
    assert.throws(
      () =>
        normalizeLocalFollowingEntry(
          entryFixture({
            followedAt:
              'yesterday',
          }),
        ),
      /ISO-8601/,
    );

    assert.throws(
      () =>
        normalizeLocalFollowingEntry(
          entryFixture({
            lastTimelineCursor:
              'x'.repeat(513),
          }),
        ),
      /cursor is invalid/,
    );
  },
);

test(
  'phase8a1 answers local following state without network authority',
  () => {
    const record =
      normalizeLocalFollowingRecord(
        recordFixture(),
      );

    assert.equal(
      isLocallyFollowing(
        record,
        'crab://@RustyCreator',
      ),
      true,
    );

    assert.equal(
      isLocallyFollowing(
        record,
        'crab://@anothercreator',
      ),
      false,
    );

    assert.deepEqual(
      findLocalFollowingEntry(
        record,
        'crab://@rustycreator',
      ),
      record.entries[0],
    );
  },
);

test(
  'phase8a1 normalization does not mutate caller input',
  () => {
    const input =
      recordFixture();

    const before =
      JSON.stringify(input);

    const output =
      normalizeLocalFollowingRecord(
        input,
      );

    assert.equal(
      JSON.stringify(input),
      before,
    );

    assert.equal(
      Object.isFrozen(output),
      true,
    );

    assert.equal(
      Object.isFrozen(
        output.entries,
      ),
      true,
    );

    assert.equal(
      Object.isFrozen(
        output.entries[0],
      ),
      true,
    );
  },
);
