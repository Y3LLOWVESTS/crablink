import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  LOCAL_FOLLOWING_FEED_CACHE_READ_COMMAND,
  LOCAL_FOLLOWING_FEED_CACHE_WRITE_COMMAND,
  createLocalFollowingFeedCacheAdapter,
} from './localFollowingFeedCacheAdapter.js';

function cache({
  cachedAt =
    '2026-08-09T21:00:00.000Z',
} = {}) {
  return {
    schema:
      'crablink.local-following-feed-cache.v1',
    items:
      [],
    cachedAt,
  };
}

test(
  'phase9a9 command names are locked to the reviewed native bridge',
  () => {
    assert.equal(
      LOCAL_FOLLOWING_FEED_CACHE_READ_COMMAND,
      'local_following_feed_cache_read',
    );

    assert.equal(
      LOCAL_FOLLOWING_FEED_CACHE_WRITE_COMMAND,
      'local_following_feed_cache_write',
    );
  },
);

test(
  'phase9a9 absent native cache remains absent',
  async () => {
    const calls =
      [];

    const adapter =
      createLocalFollowingFeedCacheAdapter(
        async (
          command,
          args,
        ) => {
          calls.push({
            command,
            args,
          });

          return null;
        },
      );

    const result =
      await adapter
        .readLocalFollowingFeedCache();

    assert.equal(
      result,
      null,
    );

    assert.deepEqual(
      calls,
      [
        {
          command:
            'local_following_feed_cache_read',
          args:
            {},
        },
      ],
    );
  },
);

test(
  'phase9a9 native cache reads are validated and frozen by shared core',
  async () => {
    const adapter =
      createLocalFollowingFeedCacheAdapter(
        async () =>
          structuredClone(
            cache(),
          ),
      );

    const result =
      await adapter
        .readLocalFollowingFeedCache();

    assert.equal(
      result.schema,
      'crablink.local-following-feed-cache.v1',
    );

    assert.equal(
      Object.isFrozen(
        result,
      ),
      true,
    );

    assert.equal(
      Object.isFrozen(
        result.items,
      ),
      true,
    );
  },
);

test(
  'phase9a9 malformed native cache read fails closed',
  async () => {
    const adapter =
      createLocalFollowingFeedCacheAdapter(
        async () => ({
          schema:
            'wrong.schema',
          items:
            [],
          cachedAt:
            '2026-08-09T21:00:00.000Z',
        }),
      );

    await assert.rejects(
      adapter
        .readLocalFollowingFeedCache(),
    );
  },
);

test(
  'phase9a9 writes normalize cache before invoking native persistence',
  async () => {
    const calls =
      [];

    const adapter =
      createLocalFollowingFeedCacheAdapter(
        async (
          command,
          args,
        ) => {
          calls.push({
            command,
            args,
          });

          return structuredClone(
            args.value,
          );
        },
      );

    const result =
      await adapter
        .writeLocalFollowingFeedCache(
          cache(),
        );

    assert.equal(
      calls.length,
      1,
    );

    assert.equal(
      calls[0].command,
      'local_following_feed_cache_write',
    );

    assert.deepEqual(
      Object.keys(
        calls[0].args,
      ),
      [
        'value',
      ],
    );

    assert.equal(
      calls[0].args.value.schema,
      'crablink.local-following-feed-cache.v1',
    );

    assert.equal(
      result.schema,
      'crablink.local-following-feed-cache.v1',
    );

    assert.equal(
      Object.isFrozen(
        result,
      ),
      true,
    );
  },
);

test(
  'phase9a9 malformed caller cache fails before native persistence',
  async () => {
    let callCount =
      0;

    const adapter =
      createLocalFollowingFeedCacheAdapter(
        async () => {
          callCount +=
            1;

          return null;
        },
      );

    await assert.rejects(
      adapter
        .writeLocalFollowingFeedCache({
          schema:
            'wrong.schema',
          items:
            [],
          cachedAt:
            '2026-08-09T21:00:00.000Z',
        }),
    );

    assert.equal(
      callCount,
      0,
    );
  },
);

test(
  'phase9a9 malformed persisted echo fails closed',
  async () => {
    const adapter =
      createLocalFollowingFeedCacheAdapter(
        async () => ({
          schema:
            'wrong.schema',
        }),
      );

    await assert.rejects(
      adapter
        .writeLocalFollowingFeedCache(
          cache(),
        ),
    );
  },
);

test(
  'phase9a9 adapter requires an explicit callable transport',
  () => {
    assert.throws(
      () =>
        createLocalFollowingFeedCacheAdapter(
          null,
        ),
      /requires a call function/,
    );
  },
);

test(
  'phase9a9 Tauri platform allowlist contains exactly the two reviewed cache commands',
  () => {
    const platform =
      fs.readFileSync(
        new URL(
          '../platform/tauriPlatform.js',
          import.meta.url,
        ),
        'utf8',
      );

    assert.equal(
      (
        platform.match(
          /["']local_following_feed_cache_read["']/g,
        ) ||
        []
      ).length,
      1,
    );

    assert.equal(
      (
        platform.match(
          /["']local_following_feed_cache_write["']/g,
        ) ||
        []
      ).length,
      1,
    );
  },
);

test(
  'phase9a9 adapter source grants no direct network browser storage or economic authority',
  () => {
    const source =
      fs.readFileSync(
        new URL(
          './localFollowingFeedCacheAdapter.js',
          import.meta.url,
        ),
        'utf8',
      );

    for (
      const forbidden
      of [
        '@tauri-apps/api/core',
        'invoke(',
        'fetch(',
        'XMLHttpRequest',
        'localStorage',
        'sessionStorage',
        'gateway_request',
        'followLocalProfile',
        'unfollowLocalProfile',
        'wallet_',
        'ledger_',
        'receipt_',
        'quickchain_',
        'rox_',
        'solana_',
        'paidUnlocked',
        'networkConfirmed',
      ]
    ) {
      assert.equal(
        source.includes(
          forbidden,
        ),
        false,
        `forbidden adapter authority token: ${forbidden}`,
      );
    }

    assert.equal(
      source.includes(
        'normalizeLocalFollowingFeedCache',
      ),
      true,
    );

    assert.equal(
      source.includes(
        'callTauri',
      ),
      true,
    );
  },
);
