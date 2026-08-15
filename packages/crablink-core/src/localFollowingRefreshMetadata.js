/**
 * RO:WHAT — Pure mutation for safe per-creator local timeline refresh metadata.
 * RO:WHY — FINAL_BETA Phase 9 needs opaque per-creator cursor and refresh-time persistence without creating a server feed cursor.
 * RO:INTERACTS — crablink.local-following.v1 normalization only.
 * RO:INVARIANTS — already-followed creator only; opaque cursor preserved verbatim; per-creator refresh time never regresses; unrelated entries preserved.
 * RO:SECURITY — local metadata only; no network, storage, Tauri, follow mutation, graph, ranking, wallet, ledger, receipt, QuickChain, ROX, or Solana authority.
 * RO:TEST — localFollowingRefreshMetadata.test.mjs.
 */

// FINAL_BETA_PHASE9A3_PER_CREATOR_REFRESH_METADATA_V1

import {
  normalizeFollowingUsername,
  normalizeLocalFollowingRecord,
} from './localFollowing.js';

const REFRESH_ACTION_FIELDS =
  Object.freeze([
    'username',
    'lastTimelineCursor',
    'lastRefreshAt',
  ]);

export function updateLocalFollowingRefreshMetadata(
  record,
  action = {},
) {
  const current =
    normalizeLocalFollowingRecord(
      record,
    );

  const source =
    requirePlainObject(
      action,
      'local following refresh metadata action',
    );

  assertExactActionFields(
    source,
  );

  const username =
    normalizeFollowingUsername(
      source.username,
    );

  const entryIndex =
    current.entries.findIndex(
      (entry) =>
        entry.username ===
        username,
    );

  if (
    entryIndex <
    0
  ) {
    throw new TypeError(
      `local following refresh metadata requires an already-followed creator: ${username}`,
    );
  }

  const previousEntry =
    current.entries[
      entryIndex
    ];

  const validationCandidate =
    normalizeLocalFollowingRecord({
      schema:
        current.schema,
      entries:
        current.entries.map(
          (
            entry,
            index,
          ) =>
            index ===
            entryIndex
              ? {
                  ...entry,
                  lastTimelineCursor:
                    source.lastTimelineCursor,
                  lastRefreshAt:
                    source.lastRefreshAt,
                }
              : entry,
        ),
      updatedAt:
        source.lastRefreshAt,
    });

  const validatedEntry =
    validationCandidate
      .entries[
        entryIndex
      ];

  const previousRefreshMs =
    previousEntry.lastRefreshAt ===
    null
      ? null
      : Date.parse(
          previousEntry.lastRefreshAt,
        );

  const nextRefreshMs =
    Date.parse(
      validatedEntry.lastRefreshAt,
    );

  if (
    previousRefreshMs !==
      null &&
    nextRefreshMs <
      previousRefreshMs
  ) {
    throw new RangeError(
      'local following refresh metadata must not regress lastRefreshAt',
    );
  }

  if (
    previousEntry.lastRefreshAt ===
      validatedEntry.lastRefreshAt &&
    previousEntry.lastTimelineCursor !==
      validatedEntry.lastTimelineCursor
  ) {
    throw new TypeError(
      'local following refresh metadata conflicts at the same refresh timestamp',
    );
  }

  const changed =
    previousEntry.lastRefreshAt !==
      validatedEntry.lastRefreshAt ||
    previousEntry.lastTimelineCursor !==
      validatedEntry.lastTimelineCursor;

  if (
    changed ===
    false
  ) {
    return Object.freeze({
      record:
        current,
      changed:
        false,
    });
  }

  const currentUpdatedMs =
    Date.parse(
      current.updatedAt,
    );

  const nextUpdatedAt =
    nextRefreshMs >
      currentUpdatedMs
      ? validatedEntry.lastRefreshAt
      : current.updatedAt;

  const updated =
    normalizeLocalFollowingRecord({
      schema:
        current.schema,
      entries:
        current.entries.map(
          (
            entry,
            index,
          ) =>
            index ===
            entryIndex
              ? {
                  ...entry,
                  lastTimelineCursor:
                    validatedEntry.lastTimelineCursor,
                  lastRefreshAt:
                    validatedEntry.lastRefreshAt,
                }
              : entry,
        ),
      updatedAt:
        nextUpdatedAt,
    });

  return Object.freeze({
    record:
      updated,
    changed:
      true,
  });
}

function assertExactActionFields(
  source,
) {
  const keys =
    Object.keys(
      source,
    );

  for (
    const key
    of keys
  ) {
    if (
      REFRESH_ACTION_FIELDS.includes(
        key,
      ) ===
      false
    ) {
      throw new TypeError(
        `local following refresh metadata action contains unsupported field: ${key}`,
      );
    }
  }

  for (
    const key
    of REFRESH_ACTION_FIELDS
  ) {
    if (
      Object.hasOwn(
        source,
        key,
      ) ===
      false
    ) {
      throw new TypeError(
        `local following refresh metadata action requires field: ${key}`,
      );
    }
  }
}

function requirePlainObject(
  value,
  label,
) {
  if (
    value === null ||
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
