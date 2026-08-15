/**
 * RO:WHAT — Reads and projects the persisted local-first Home cache for truthful offline display.
 * RO:WHY — Cached public summaries may remain useful during network loss, but current local following state must still gate visibility.
 * RO:INTERACTS — local following read port, local feed-cache read port, and shared-core offline cache projection.
 * RO:INVARIANTS — cache read happens first; cache miss avoids unnecessary following read; current follows filter cached creators; cached content is always stale-offline.
 * RO:SECURITY — read-only local projection; no network, cache write, follow mutation, graph, ranking, entitlement, receipt, wallet, ledger, QuickChain, ROX, or Solana authority.
 * RO:TEST — localFollowingOfflineFeedProjection.test.mjs.
 */

// FINAL_BETA_PHASE9A11_OFFLINE_CACHE_READ_PROJECTION_V1

import {
  projectOfflineLocalFollowingFeedCache,
} from '../../../../../packages/crablink-core/src/localFollowingFeedCache.js';

export const LOCAL_FOLLOWING_OFFLINE_FEED_SCHEMA =
  'crablink.local-following-offline-feed.v1';

const INPUT_FIELDS =
  Object.freeze([
    'followingPort',
    'cachePort',
  ]);

export async function loadOfflineLocalFollowingFeed(
  input = {},
) {
  const source =
    requirePlainObject(
      input,
      'offline local following feed input',
    );

  assertAllowedKeys(
    source,
    INPUT_FIELDS,
    'offline local following feed input',
  );

  const cachePort =
    requireCachePort(
      source.cachePort,
    );

  const followingPort =
    requireFollowingPort(
      source.followingPort,
    );

  const cache =
    await cachePort
      .readLocalFollowingFeedCache();

  if (
    cache ===
      null ||
    cache ===
      undefined
  ) {
    return freezeResult({
      status:
        'cache-miss',
      items:
        [],
      cachedAt:
        null,
      sourceItemCount:
        0,
      visibleItemCount:
        0,
      filteredItemCount:
        0,
    });
  }

  const followingRecord =
    await followingPort
      .readLocalFollowing();

  const projected =
    projectOfflineLocalFollowingFeedCache({
      cache,
      followingRecord:
        followingRecord ===
          undefined
          ? null
          : followingRecord,
    });

  return freezeResult({
    status:
      projected.status,
    items:
      projected.items,
    cachedAt:
      projected.cachedAt,
    sourceItemCount:
      projected.sourceItemCount,
    visibleItemCount:
      projected.visibleItemCount,
    filteredItemCount:
      projected.filteredItemCount,
  });
}

function requireCachePort(
  value,
) {
  if (
    value ===
      null ||
    typeof value !==
      'object' ||
    typeof value.readLocalFollowingFeedCache !==
      'function'
  ) {
    throw new TypeError(
      'offline local following feed requires cache read method',
    );
  }

  return value;
}

function requireFollowingPort(
  value,
) {
  if (
    value ===
      null ||
    typeof value !==
      'object' ||
    typeof value.readLocalFollowing !==
      'function'
  ) {
    throw new TypeError(
      'offline local following feed requires local following read method',
    );
  }

  return value;
}

function freezeResult(
  value,
) {
  return Object.freeze({
    schema:
      LOCAL_FOLLOWING_OFFLINE_FEED_SCHEMA,
    status:
      value.status,
    items:
      Object.freeze([
        ...value.items,
      ]),
    cachedAt:
      value.cachedAt,
    sourceItemCount:
      value.sourceItemCount,
    visibleItemCount:
      value.visibleItemCount,
    filteredItemCount:
      value.filteredItemCount,
  });
}

function requirePlainObject(
  value,
  label,
) {
  if (
    value ===
      null ||
    typeof value !==
      'object' ||
    Array.isArray(
      value,
    ) ||
    Object.getPrototypeOf(
      value,
    ) !==
      Object.prototype
  ) {
    throw new TypeError(
      `${label} must be a plain object`,
    );
  }

  return value;
}

function assertAllowedKeys(
  source,
  allowed,
  label,
) {
  for (
    const key
    of Object.keys(
      source,
    )
  ) {
    if (
      allowed.includes(
        key,
      ) ===
        false
    ) {
      throw new TypeError(
        `${label} contains unsupported field: ${key}`,
      );
    }
  }
}
