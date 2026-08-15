/**
 * RO:WHAT — Persists one reviewed local-first Home feed into the bounded offline cache.
 * RO:WHY — Phase 9 refresh needs durable stale/offline display state without moving cache-schema authority into Tauri or the coordinator.
 * RO:INTERACTS — a local cache port and crablink-core localFollowingFeedCache.
 * RO:INVARIANTS — validates existing cache, merges only reviewed feed summaries, never regresses cachedAt, validates persisted echo, and skips idempotent writes.
 * RO:SECURITY — local display persistence only; no network, follows, public graph, ranking, entitlement, receipt, wallet, ledger, QuickChain, ROX, or Solana authority.
 */

// FINAL_BETA_PHASE9A10_REFRESH_CACHE_PERSISTENCE_V1

import {
  normalizeLocalFollowingFeedCache,
  updateLocalFollowingFeedCache,
} from '../../../../../packages/crablink-core/src/localFollowingFeedCache.js';

const INPUT_FIELDS =
  Object.freeze([
    'cachePort',
    'feed',
    'cachedAt',
  ]);

export async function persistHydratedFeedCache(
  input = {},
) {
  const source =
    requirePlainObject(
      input,
      'local following feed cache persistence input',
    );

  assertAllowedKeys(
    source,
    INPUT_FIELDS,
    'local following feed cache persistence input',
  );

  const cachePort =
    requireCachePort(
      source.cachePort,
    );

  const cachedAt =
    normalizeCanonicalTimestamp(
      source.cachedAt,
    );

  const existingRaw =
    await cachePort
      .readLocalFollowingFeedCache();

  const existing =
    existingRaw ===
      null ||
    existingRaw ===
      undefined
      ? null
      : normalizeLocalFollowingFeedCache(
          existingRaw,
        );

  const next =
    updateLocalFollowingFeedCache({
      cache:
        existing,
      feed:
        source.feed,
      cachedAt,
    });

  if (
    existing !==
      null &&
    cachesEqual(
      existing,
      next,
    )
  ) {
    return freezeResult({
      cache:
        existing,
      changed:
        false,
    });
  }

  const writtenRaw =
    await cachePort
      .writeLocalFollowingFeedCache(
        next,
      );

  const written =
    normalizeLocalFollowingFeedCache(
      writtenRaw,
    );

  if (
    cachesEqual(
      written,
      next,
    ) ===
      false
  ) {
    throw new Error(
      'local following feed cache persistence returned unexpected cache state',
    );
  }

  return freezeResult({
    cache:
      written,
    changed:
      true,
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
      'function' ||
    typeof value.writeLocalFollowingFeedCache !==
      'function'
  ) {
    throw new TypeError(
      'local following feed cache persistence requires cache read and write methods',
    );
  }

  return value;
}

function cachesEqual(
  left,
  right,
) {
  return JSON.stringify(
    left,
  ) ===
    JSON.stringify(
      right,
    );
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
      'local following feed cache persistence requires cachedAt',
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
      'local following feed cache persistence cachedAt must be a timestamp',
    );
  }

  const canonical =
    new Date(
      milliseconds,
    ).toISOString();

  if (
    canonical ===
      value
  ) {
    return canonical;
  }

  throw new TypeError(
    'local following feed cache persistence cachedAt must be canonical ISO time',
  );
}

function freezeResult(
  value,
) {
  return Object.freeze({
    cache:
      value.cache,
    changed:
      value.changed,
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
