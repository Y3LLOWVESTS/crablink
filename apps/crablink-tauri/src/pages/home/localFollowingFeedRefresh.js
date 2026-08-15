/**
 * RO:WHAT — Coordinates one local-first Home refresh across bounded public hydration and local refresh-metadata persistence.
 * RO:WHY — Phase 9 needs one consumer operation while preserving the reviewed separation between network reads and local writes.
 * RO:INTERACTS — localFollowingFeedHydrator.js and localFollowingRefreshPersistence.js.
 * RO:INVARIANTS — hydration completes first; only successful creator pages can persist metadata; persistence failure never invents network failure or discards a valid feed.
 * RO:SECURITY — no direct network, Tauri, browser-storage, public-graph, ranking, receipt, wallet, ledger, QuickChain, ROX, or Solana authority.
 * RO:TEST — localFollowingFeedRefresh.test.mjs.
 */

// FINAL_BETA_PHASE9A5_HYDRATION_PERSISTENCE_INTEGRATION_V1
// FINAL_BETA_PHASE9A10_REFRESH_CACHE_PERSISTENCE_INTEGRATION_V1

import {
  hydrateLocalFollowingFeedBatch,
} from './localFollowingFeedHydrator.js';

import {
  persistHydratedRefreshMetadata,
} from './localFollowingRefreshPersistence.js';

import {
  persistHydratedFeedCache,
} from './localFollowingFeedCachePersistence.js';

export const LOCAL_FOLLOWING_REFRESH_SCHEMA =
  'crablink.local-following-refresh.v1';

const INPUT_FIELDS =
  Object.freeze([
    'followingPort',
    'publicationPort',
    'cachePort',
    'creatorOffset',
    'creatorLimit',
    'concurrency',
    'publicationLimit',
    'refreshedAt',
  ]);

export async function refreshLocalFollowingFeed(
  input = {},
) {
  const source =
    requirePlainObject(
      input,
      'local following feed refresh input',
    );

  assertAllowedKeys(
    source,
    INPUT_FIELDS,
    'local following feed refresh input',
  );

  const refreshedAt =
    normalizeCanonicalTimestamp(
      source.refreshedAt,
    );

  const cachePort =
    normalizeOptionalCachePort(
      source.cachePort,
    );

  const hydration =
    await hydrateLocalFollowingFeedBatch({
      followingPort:
        source.followingPort,
      publicationPort:
        source.publicationPort,
      creatorOffset:
        source.creatorOffset,
      creatorLimit:
        source.creatorLimit,
      concurrency:
        source.concurrency,
      publicationLimit:
        source.publicationLimit,
    });

  if (
    hydration.creatorPages.length ===
    0
  ) {
    return freezeRefreshResult({
      hydration,
      metadataPersistence:
        freezeMetadataPersistence({
          status:
            'skipped',
          changed:
            false,
          attemptedCreatorCount:
            0,
          updatedCreatorCount:
            0,
          skippedCreatorCount:
            0,
          message:
            null,
        }),
      cachePersistence:
        freezeCachePersistence({
          status:
            'skipped',
          changed:
            false,
          itemCount:
            0,
          cachedAt:
            null,
          message:
            null,
        }),
    });
  }

  let metadataPersistence;

  try {
    const persistence =
      await persistHydratedRefreshMetadata({
        followingPort:
          source.followingPort,
        hydration,
        refreshedAt,
      });

    metadataPersistence =
      freezeMetadataPersistence({
        status:
          persistence.changed ===
            true
            ? 'persisted'
            : 'unchanged',
        changed:
          persistence.changed,
        attemptedCreatorCount:
          persistence.attemptedCreatorCount,
        updatedCreatorCount:
          persistence.updatedCreatorCount,
        skippedCreatorCount:
          persistence.skippedCreatorCount,
        message:
          null,
      });
  } catch (error) {
    metadataPersistence =
      freezeMetadataPersistence({
        status:
          'failed',
        changed:
          false,
        attemptedCreatorCount:
          hydration.creatorPages.length,
        updatedCreatorCount:
          0,
        skippedCreatorCount:
          0,
        message:
          normalizePersistenceFailure(
            error,
          ),
      });
  }

  let cachePersistence;

  if (
    cachePort ===
      null
  ) {
    cachePersistence =
      freezeCachePersistence({
        status:
          'skipped',
        changed:
          false,
        itemCount:
          0,
        cachedAt:
          null,
        message:
          null,
      });
  } else {
    try {
      const persistence =
        await persistHydratedFeedCache({
          cachePort,
          feed:
            hydration.feed,
          cachedAt:
            refreshedAt,
        });

      cachePersistence =
        freezeCachePersistence({
          status:
            persistence.changed ===
              true
              ? 'persisted'
              : 'unchanged',
          changed:
            persistence.changed,
          itemCount:
            persistence.cache.items.length,
          cachedAt:
            persistence.cache.cachedAt,
          message:
            null,
        });
    } catch (error) {
      cachePersistence =
        freezeCachePersistence({
          status:
            'failed',
          changed:
            false,
          itemCount:
            0,
          cachedAt:
            null,
          message:
            normalizeCachePersistenceFailure(
              error,
            ),
        });
    }
  }

  return freezeRefreshResult({
    hydration,
    metadataPersistence,
    cachePersistence,
  });
}

function freezeRefreshResult(
  value,
) {
  return Object.freeze({
    schema:
      LOCAL_FOLLOWING_REFRESH_SCHEMA,
    status:
      value.hydration.status,
    feed:
      value.hydration.feed,
    hydration:
      value.hydration,
    metadataPersistence:
      value.metadataPersistence,
    cachePersistence:
      value.cachePersistence,
  });
}

function freezeMetadataPersistence(
  value,
) {
  return Object.freeze({
    status:
      value.status,
    changed:
      value.changed,
    attemptedCreatorCount:
      value.attemptedCreatorCount,
    updatedCreatorCount:
      value.updatedCreatorCount,
    skippedCreatorCount:
      value.skippedCreatorCount,
    message:
      value.message,
  });
}

function freezeCachePersistence(
  value,
) {
  return Object.freeze({
    status:
      value.status,
    changed:
      value.changed,
    itemCount:
      value.itemCount,
    cachedAt:
      value.cachedAt,
    message:
      value.message,
  });
}

function normalizePersistenceFailure(
  error,
) {
  const message =
    String(
      error?.message ||
      'local refresh metadata persistence failed',
    )
      .trim()
      .slice(
        0,
        240,
      );

  return message ||
    'local refresh metadata persistence failed';
}

function normalizeCachePersistenceFailure(
  error,
) {
  const message =
    String(
      error?.message ||
      'local feed cache persistence failed',
    )
      .trim()
      .slice(
        0,
        240,
      );

  return message ||
    'local feed cache persistence failed';
}

function normalizeOptionalCachePort(
  value,
) {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return null;
  }

  if (
    typeof value !==
      'object' ||
    typeof value.readLocalFollowingFeedCache !==
      'function' ||
    typeof value.writeLocalFollowingFeedCache !==
      'function'
  ) {
    throw new TypeError(
      'local following feed refresh cachePort requires cache read and write methods',
    );
  }

  return value;
}

function normalizeCanonicalTimestamp(
  value,
) {
  if (
    typeof value !==
      'string' ||
    value.length ===
      0
  ) {
    throw new TypeError(
      'local following feed refresh requires refreshedAt',
    );
  }

  const milliseconds =
    Date.parse(
      value,
    );

  if (
    Number.isFinite(
      milliseconds,
    ) ===
      false
  ) {
    throw new TypeError(
      'local following feed refresh refreshedAt must be a timestamp',
    );
  }

  const canonical =
    new Date(
      milliseconds,
    ).toISOString();

  if (
    canonical !==
    value
  ) {
    throw new TypeError(
      'local following feed refresh refreshedAt must be canonical ISO time',
    );
  }

  return canonical;
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
