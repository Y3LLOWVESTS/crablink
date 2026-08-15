/**
 * RO:WHAT — Persists successful creator refresh cursors into the latest private local-following record.
 * RO:WHY — Phase 9 hydration must remember safe per-creator refresh metadata without overwriting concurrent local follow changes.
 * RO:INTERACTS — localFollowingPort, localFollowingRefreshMetadata, PublicationPageV1, and Phase 9A2 hydration results.
 * RO:INVARIANTS — latest local record is re-read before mutation; only still-followed creators update; at most one write; stale metadata never wins.
 * RO:SECURITY — local persistence only; no network request, browser storage, global feed cursor, public graph, ranking, payment, wallet, ledger, QuickChain, ROX, or Solana authority.
 * RO:TEST — localFollowingRefreshPersistence.test.mjs.
 */

// FINAL_BETA_PHASE9A4_REFRESH_METADATA_PERSISTENCE_V1

import {
  normalizeFollowingUsername,
  normalizeLocalFollowingRecord,
} from '../../../../../packages/crablink-core/src/localFollowing.js';

import {
  updateLocalFollowingRefreshMetadata,
} from '../../../../../packages/crablink-core/src/localFollowingRefreshMetadata.js';

import {
  assertPublicationPageV1,
} from '../../../../../packages/crablink-core/src/publicationSummary.js';

const HYDRATION_SCHEMA =
  'crablink.local-following-hydration.v1';

const INPUT_FIELDS =
  Object.freeze([
    'followingPort',
    'hydration',
    'refreshedAt',
  ]);

export async function persistHydratedRefreshMetadata(
  input = {},
) {
  const source =
    requirePlainObject(
      input,
      'refresh metadata persistence input',
    );

  assertAllowedKeys(
    source,
    INPUT_FIELDS,
    'refresh metadata persistence input',
  );

  const followingPort =
    requireFollowingPort(
      source.followingPort,
    );

  const hydration =
    requireHydrationResult(
      source.hydration,
    );

  const refreshedAt =
    normalizeCanonicalTimestamp(
      source.refreshedAt,
    );

  if (
    hydration.creatorPages.length ===
    0
  ) {
    return freezeResult({
      record:
        null,
      changed:
        false,
      attemptedCreatorCount:
        0,
      updatedCreatorCount:
        0,
      skippedCreatorCount:
        0,
    });
  }

  const latestRaw =
    await followingPort
      .readLocalFollowing();

  if (
    latestRaw === null ||
    latestRaw === undefined
  ) {
    return freezeResult({
      record:
        null,
      changed:
        false,
      attemptedCreatorCount:
        hydration.creatorPages.length,
      updatedCreatorCount:
        0,
      skippedCreatorCount:
        hydration.creatorPages.length,
    });
  }

  let workingRecord =
    normalizeLocalFollowingRecord(
      latestRaw,
    );

  let updatedCreatorCount =
    0;

  let skippedCreatorCount =
    0;

  for (
    const creatorPage
    of hydration.creatorPages
  ) {
    const reviewed =
      normalizeCreatorPage(
        creatorPage,
      );

    const currentEntry =
      workingRecord.entries.find(
        (entry) =>
          entry.username ===
          reviewed.username,
      );

    if (
      currentEntry ===
      undefined
    ) {
      skippedCreatorCount +=
        1;

      continue;
    }

    if (
      currentEntry.lastRefreshAt !==
      null
    ) {
      const currentRefreshMs =
        Date.parse(
          currentEntry.lastRefreshAt,
        );

      const proposedRefreshMs =
        Date.parse(
          refreshedAt,
        );

      if (
        currentRefreshMs >
        proposedRefreshMs
      ) {
        skippedCreatorCount +=
          1;

        continue;
      }

      if (
        currentRefreshMs ===
          proposedRefreshMs &&
        currentEntry.lastTimelineCursor !==
          reviewed.page.nextCursor
      ) {
        skippedCreatorCount +=
          1;

        continue;
      }
    }

    const mutation =
      updateLocalFollowingRefreshMetadata(
        workingRecord,
        {
          username:
            reviewed.username,
          lastTimelineCursor:
            reviewed.page.nextCursor,
          lastRefreshAt:
            refreshedAt,
        },
      );

    workingRecord =
      mutation.record;

    if (
      mutation.changed ===
      true
    ) {
      updatedCreatorCount +=
        1;
    }
  }

  if (
    updatedCreatorCount ===
    0
  ) {
    return freezeResult({
      record:
        workingRecord,
      changed:
        false,
      attemptedCreatorCount:
        hydration.creatorPages.length,
      updatedCreatorCount,
      skippedCreatorCount,
    });
  }

  const writtenRaw =
    await followingPort
      .writeLocalFollowing(
        workingRecord,
      );

  const writtenRecord =
    normalizeLocalFollowingRecord(
      writtenRaw,
    );

  return freezeResult({
    record:
      writtenRecord,
    changed:
      true,
    attemptedCreatorCount:
      hydration.creatorPages.length,
    updatedCreatorCount,
    skippedCreatorCount,
  });
}

function requireFollowingPort(
  value,
) {
  if (
    value === null ||
    typeof value !==
      'object' ||
    typeof value.readLocalFollowing !==
      'function' ||
    typeof value.writeLocalFollowing !==
      'function'
  ) {
    throw new TypeError(
      'refresh metadata persistence requires local following read and write methods',
    );
  }

  return value;
}

function requireHydrationResult(
  value,
) {
  const source =
    requirePlainObject(
      value,
      'refresh metadata hydration result',
    );

  if (
    source.schema !==
    HYDRATION_SCHEMA
  ) {
    throw new TypeError(
      'refresh metadata persistence requires the reviewed hydration schema',
    );
  }

  if (
    Array.isArray(
      source.creatorPages,
    ) === false
  ) {
    throw new TypeError(
      'refresh metadata hydration creatorPages must be an array',
    );
  }

  return source;
}

function normalizeCreatorPage(
  value,
) {
  const source =
    requirePlainObject(
      value,
      'refresh metadata creator page',
    );

  const keys =
    Object.keys(
      source,
    );

  if (
    keys.length !==
      2 ||
    keys.includes(
      'username',
    ) === false ||
    keys.includes(
      'page',
    ) === false
  ) {
    throw new TypeError(
      'refresh metadata creator page must contain only username and page',
    );
  }

  const username =
    normalizeFollowingUsername(
      source.username,
    );

  const page =
    assertPublicationPageV1(
      source.page,
    );

  for (
    const publication
    of page.items
  ) {
    if (
      publication.creator.username !==
      username
    ) {
      throw new TypeError(
        `refresh metadata creator mismatch for ${publication.publicationId}`,
      );
    }
  }

  return Object.freeze({
    username,
    page,
  });
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
      'refresh metadata persistence requires refreshedAt',
    );
  }

  const milliseconds =
    Date.parse(
      value,
    );

  if (
    Number.isFinite(
      milliseconds,
    ) === false
  ) {
    throw new TypeError(
      'refresh metadata persistence refreshedAt must be a timestamp',
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
      'refresh metadata persistence refreshedAt must be canonical ISO time',
    );
  }

  return canonical;
}

function freezeResult(
  value,
) {
  return Object.freeze({
    record:
      value.record,
    changed:
      value.changed,
    attemptedCreatorCount:
      value.attemptedCreatorCount,
    updatedCreatorCount:
      value.updatedCreatorCount,
    skippedCreatorCount:
      value.skippedCreatorCount,
  });
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
      ) === false
    ) {
      throw new TypeError(
        `${label} contains unsupported field: ${key}`,
      );
    }
  }
}
