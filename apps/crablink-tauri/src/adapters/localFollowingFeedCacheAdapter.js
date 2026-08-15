/**
 * RO:WHAT — Desktop adapter for the bounded local-first Home feed cache.
 * RO:WHY — Keeps Tauri IPC behind one reviewed frontend boundary and keeps strict cache truth in crablink-core.
 * RO:INTERACTS — tauriPlatform.js, Phase 9A8 native cache commands, localFollowingFeedCache.js.
 * RO:INVARIANTS — every non-null IPC read is validated; every write is normalized before IPC and validated again after persistence.
 * RO:SECURITY — no direct invoke, fetch, browser storage, network graph, ranking, entitlement, receipt, wallet, ledger, QuickChain, ROX, or Solana authority.
 * RO:TEST — localFollowingFeedCacheAdapter.test.mjs.
 */

// FINAL_BETA_PHASE9A9_DESKTOP_CACHE_JS_ADAPTER_V1

import {
  normalizeLocalFollowingFeedCache,
} from '../../../../packages/crablink-core/src/index.js';

import {
  callTauri,
} from '../platform/tauriPlatform.js';

export const LOCAL_FOLLOWING_FEED_CACHE_READ_COMMAND =
  'local_following_feed_cache_read';

export const LOCAL_FOLLOWING_FEED_CACHE_WRITE_COMMAND =
  'local_following_feed_cache_write';

export function createLocalFollowingFeedCacheAdapter(
  call = callTauri,
) {
  if (
    typeof call !==
      'function'
  ) {
    throw new TypeError(
      'local following feed cache adapter requires a call function',
    );
  }

  return Object.freeze({
    async readLocalFollowingFeedCache() {
      const raw =
        await call(
          LOCAL_FOLLOWING_FEED_CACHE_READ_COMMAND,
          {},
        );

      if (
        raw ===
          null ||
        raw ===
          undefined
      ) {
        return null;
      }

      return normalizeLocalFollowingFeedCache(
        raw,
      );
    },

    async writeLocalFollowingFeedCache(
      cache,
    ) {
      const normalized =
        normalizeLocalFollowingFeedCache(
          cache,
        );

      const persisted =
        await call(
          LOCAL_FOLLOWING_FEED_CACHE_WRITE_COMMAND,
          {
            value:
              normalized,
          },
        );

      return normalizeLocalFollowingFeedCache(
        persisted,
      );
    },
  });
}

const desktopLocalFollowingFeedCacheAdapter =
  createLocalFollowingFeedCacheAdapter();

export function readLocalFollowingFeedCache() {
  return desktopLocalFollowingFeedCacheAdapter
    .readLocalFollowingFeedCache();
}

export function writeLocalFollowingFeedCache(
  cache,
) {
  return desktopLocalFollowingFeedCacheAdapter
    .writeLocalFollowingFeedCache(
      cache,
    );
}
