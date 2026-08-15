import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createLocalFollowingPort,
} from './localFollowingPort.js';

test(
  'phase8a2 exposes exactly the two reviewed persistence methods',
  () => {
    const readLocalFollowing =
      async () => null;

    const writeLocalFollowing =
      async (record) => record;

    const port =
      createLocalFollowingPort({
        readLocalFollowing,
        writeLocalFollowing,
        hiddenNetworkMutation:
          async () => true,
      });

    assert.deepEqual(
      Object.keys(port),
      [
        'readLocalFollowing',
        'writeLocalFollowing',
      ],
    );

    assert.equal(
      port.readLocalFollowing,
      readLocalFollowing,
    );

    assert.equal(
      port.writeLocalFollowing,
      writeLocalFollowing,
    );

    assert.equal(
      port.hiddenNetworkMutation,
      undefined,
    );

    assert.equal(
      Object.isFrozen(port),
      true,
    );
  },
);

test(
  'phase8a2 construction performs no persistence operation',
  () => {
    let calls = 0;

    createLocalFollowingPort({
      readLocalFollowing:
        async () => {
          calls += 1;
          return null;
        },
      writeLocalFollowing:
        async () => {
          calls += 1;
          return null;
        },
    });

    assert.equal(
      calls,
      0,
    );
  },
);

test(
  'phase8a2 rejects incomplete persistence implementations',
  () => {
    assert.throws(
      () =>
        createLocalFollowingPort({
          readLocalFollowing:
            async () => null,
        }),
      /writeLocalFollowing/,
    );

    assert.throws(
      () =>
        createLocalFollowingPort({
          writeLocalFollowing:
            async () => null,
        }),
      /readLocalFollowing/,
    );
  },
);

test(
  'phase8a2 preserves adapter results without inventing truth',
  async () => {
    const record =
      Object.freeze({
        schema:
          'crablink.local-following.v1',
        entries:
          Object.freeze([]),
        updatedAt:
          '2026-08-09T18:00:00.000Z',
      });

    const port =
      createLocalFollowingPort({
        readLocalFollowing:
          async () => record,
        writeLocalFollowing:
          async () => record,
      });

    assert.equal(
      await port.readLocalFollowing(),
      record,
    );

    assert.equal(
      await port.writeLocalFollowing(
        record,
      ),
      record,
    );
  },
);

test(
  'phase8a2 preserves persistence errors unchanged',
  async () => {
    const expected =
      new Error(
        'local persistence unavailable',
      );

    const port =
      createLocalFollowingPort({
        readLocalFollowing:
          async () => {
            throw expected;
          },
        writeLocalFollowing:
          async () => {
            throw expected;
          },
      });

    await assert.rejects(
      port.readLocalFollowing(),
      (error) =>
        error === expected,
    );

    await assert.rejects(
      port.writeLocalFollowing({}),
      (error) =>
        error === expected,
    );
  },
);
