/**
 * RO:WHAT — Pure model for CrabLink private local-following records.
 * RO:WHY — FINAL_BETA Phase 8 keeps personal creator selection on the user's device.
 * RO:INTERACTS — future following persistence port, desktop adapter, profile UI, and Home feed.
 * RO:INVARIANTS — versioned record; public profile refs only; bounded entries; no server social graph.
 * RO:SECURITY — no Passport secrets, capabilities, wallet authority, network calls, or storage access.
 * RO:TEST — localFollowing.test.mjs.
 */

// FINAL_BETA_PHASE8A1_LOCAL_FOLLOWING_RECORD_V1

export const LOCAL_FOLLOWING_SCHEMA =
  'crablink.local-following.v1';

export const LOCAL_FOLLOWING_MAX_ENTRIES =
  10000;

const USERNAME_PATTERN =
  /^[a-z0-9][a-z0-9._]{1,30}[a-z0-9]$/;

const ISO_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;

const RECORD_KEYS =
  Object.freeze([
    'schema',
    'entries',
    'updatedAt',
  ]);

const ENTRY_KEYS =
  Object.freeze([
    'profileRef',
    'username',
    'followedAt',
    'lastTimelineCursor',
    'lastRefreshAt',
  ]);

export function createEmptyLocalFollowingRecord(
  updatedAt,
) {
  return normalizeLocalFollowingRecord({
    schema:
      LOCAL_FOLLOWING_SCHEMA,
    entries:
      [],
    updatedAt,
  });
}

export function normalizeLocalFollowingRecord(
  value,
  {
    maxEntries =
      LOCAL_FOLLOWING_MAX_ENTRIES,
  } = {},
) {
  const source =
    requirePlainRecord(
      value,
      'local following record',
    );

  assertAllowedKeys(
    source,
    RECORD_KEYS,
    'local following record',
  );

  if (
    source.schema !==
    LOCAL_FOLLOWING_SCHEMA
  ) {
    throw new TypeError(
      'local following schema is invalid',
    );
  }

  if (
    Array.isArray(
      source.entries,
    ) === false
  ) {
    throw new TypeError(
      'local following entries require an array',
    );
  }

  if (
    Number.isInteger(
      maxEntries,
    ) === false ||
    maxEntries < 1 ||
    maxEntries >
      LOCAL_FOLLOWING_MAX_ENTRIES
  ) {
    throw new TypeError(
      'local following entry limit is invalid',
    );
  }

  if (
    source.entries.length >
    maxEntries
  ) {
    throw new RangeError(
      'local following entry limit exceeded',
    );
  }

  const seen =
    new Set();

  const entries =
    source.entries.map(
      (entry) => {
        const normalized =
          normalizeLocalFollowingEntry(
            entry,
          );

        if (
          seen.has(
            normalized.profileRef,
          )
        ) {
          throw new TypeError(
            'local following profile is duplicated',
          );
        }

        seen.add(
          normalized.profileRef,
        );

        return normalized;
      },
    );

  return Object.freeze({
    schema:
      LOCAL_FOLLOWING_SCHEMA,
    entries:
      Object.freeze(
        entries,
      ),
    updatedAt:
      normalizeIsoTimestamp(
        source.updatedAt,
        'local following updatedAt',
      ),
  });
}

export function normalizeLocalFollowingEntry(
  value,
) {
  const source =
    requirePlainRecord(
      value,
      'local following entry',
    );

  assertAllowedKeys(
    source,
    ENTRY_KEYS,
    'local following entry',
  );

  const username =
    normalizeFollowingUsername(
      source.username,
    );

  const profileRef =
    normalizePublicProfileRef(
      source.profileRef,
    );

  const expectedProfileRef =
    `crab://@${username}`;

  if (
    profileRef !==
    expectedProfileRef
  ) {
    throw new TypeError(
      'local following profile reference does not match username',
    );
  }

  return Object.freeze({
    profileRef,
    username,
    followedAt:
      normalizeIsoTimestamp(
        source.followedAt,
        'local following followedAt',
      ),
    lastTimelineCursor:
      normalizeOptionalCursor(
        source.lastTimelineCursor,
      ),
    lastRefreshAt:
      normalizeOptionalTimestamp(
        source.lastRefreshAt,
        'local following lastRefreshAt',
      ),
  });
}

export function normalizePublicProfileRef(
  value,
) {
  const raw =
    requireText(
      value,
      'public profile reference',
    ).toLowerCase();

  if (
    raw.startsWith(
      'crab://@',
    ) === false
  ) {
    throw new TypeError(
      'local following requires a public crab profile reference',
    );
  }

  const username =
    normalizeFollowingUsername(
      raw.slice(
        'crab://@'.length,
      ),
    );

  return `crab://@${username}`;
}

export function normalizeFollowingUsername(
  value,
) {
  const raw =
    requireText(
      value,
      'local following username',
    ).toLowerCase();

  const username =
    raw.startsWith('@')
      ? raw.slice(1)
      : raw;

  if (
    USERNAME_PATTERN.test(
      username,
    ) === false
  ) {
    throw new TypeError(
      'local following username is invalid',
    );
  }

  return username;
}


// FINAL_BETA_PHASE8A5_LOCAL_FOLLOWING_DOMAIN_MUTATION_V1

const LOCAL_FOLLOW_ACTION_KEYS =
  Object.freeze([
    'profileRef',
    'username',
    'followedAt',
  ]);

const LOCAL_UNFOLLOW_ACTION_KEYS =
  Object.freeze([
    'profileRef',
    'updatedAt',
  ]);

export function followLocalProfile(
  record,
  action,
) {
  const normalizedRecord =
    normalizeLocalFollowingRecord(
      record,
    );

  const source =
    requirePlainRecord(
      action,
      'local follow action',
    );

  assertAllowedKeys(
    source,
    LOCAL_FOLLOW_ACTION_KEYS,
    'local follow action',
  );

  const entry =
    normalizeLocalFollowingEntry({
      profileRef:
        source.profileRef,
      username:
        source.username,
      followedAt:
        source.followedAt,
      lastTimelineCursor:
        null,
      lastRefreshAt:
        null,
    });

  const existing =
    normalizedRecord.entries.find(
      (candidate) =>
        candidate.profileRef ===
        entry.profileRef,
    );

  if (existing !== undefined) {
    return freezeLocalFollowingMutationResult(
      normalizedRecord,
      false,
    );
  }

  if (
    normalizedRecord.entries.length >=
    LOCAL_FOLLOWING_MAX_ENTRIES
  ) {
    throw new RangeError(
      'local following entry limit exceeded',
    );
  }

  const nextRecord =
    normalizeLocalFollowingRecord({
      schema:
        LOCAL_FOLLOWING_SCHEMA,
      entries: [
        ...normalizedRecord.entries,
        entry,
      ],
      updatedAt:
        entry.followedAt,
    });

  return freezeLocalFollowingMutationResult(
    nextRecord,
    true,
  );
}

export function unfollowLocalProfile(
  record,
  action,
) {
  const normalizedRecord =
    normalizeLocalFollowingRecord(
      record,
    );

  const source =
    requirePlainRecord(
      action,
      'local unfollow action',
    );

  assertAllowedKeys(
    source,
    LOCAL_UNFOLLOW_ACTION_KEYS,
    'local unfollow action',
  );

  const profileRef =
    normalizePublicProfileRef(
      source.profileRef,
    );

  const updatedAt =
    normalizeIsoTimestamp(
      source.updatedAt,
      'local unfollow updatedAt',
    );

  const index =
    normalizedRecord.entries.findIndex(
      (entry) =>
        entry.profileRef ===
        profileRef,
    );

  if (index < 0) {
    return freezeLocalFollowingMutationResult(
      normalizedRecord,
      false,
    );
  }

  const entries =
    normalizedRecord.entries.filter(
      (_, entryIndex) =>
        entryIndex !== index,
    );

  const nextRecord =
    normalizeLocalFollowingRecord({
      schema:
        LOCAL_FOLLOWING_SCHEMA,
      entries,
      updatedAt,
    });

  return freezeLocalFollowingMutationResult(
    nextRecord,
    true,
  );
}

function freezeLocalFollowingMutationResult(
  record,
  changed,
) {
  return Object.freeze({
    record,
    changed,
  });
}

export function findLocalFollowingEntry(
  record,
  profileRef,
) {
  const normalizedRecord =
    normalizeLocalFollowingRecord(
      record,
    );

  const normalizedProfileRef =
    normalizePublicProfileRef(
      profileRef,
    );

  return (
    normalizedRecord.entries.find(
      (entry) =>
        entry.profileRef ===
        normalizedProfileRef,
    ) || null
  );
}

export function isLocallyFollowing(
  record,
  profileRef,
) {
  return (
    findLocalFollowingEntry(
      record,
      profileRef,
    ) !== null
  );
}

function normalizeOptionalCursor(
  value,
) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return null;
  }

  if (
    typeof value !==
    'string'
  ) {
    throw new TypeError(
      'local following cursor requires text or null',
    );
  }

  const normalized =
    value.trim();

  if (
    normalized.length === 0 ||
    normalized.length > 512 ||
    /[\u0000-\u001f\u007f]/u.test(
      normalized,
    )
  ) {
    throw new TypeError(
      'local following cursor is invalid',
    );
  }

  return normalized;
}

function normalizeOptionalTimestamp(
  value,
  label,
) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return null;
  }

  return normalizeIsoTimestamp(
    value,
    label,
  );
}

function normalizeIsoTimestamp(
  value,
  label,
) {
  const normalized =
    requireText(
      value,
      label,
    );

  if (
    ISO_TIMESTAMP_PATTERN.test(
      normalized,
    ) === false
  ) {
    throw new TypeError(
      `${label} requires an ISO-8601 timestamp with timezone`,
    );
  }

  const parsed =
    Date.parse(
      normalized,
    );

  if (
    Number.isFinite(
      parsed,
    ) === false
  ) {
    throw new TypeError(
      `${label} is invalid`,
    );
  }

  return new Date(
    parsed,
  ).toISOString();
}

function requireText(
  value,
  label,
) {
  if (
    typeof value !==
    'string'
  ) {
    throw new TypeError(
      `${label} requires text`,
    );
  }

  const normalized =
    value.trim();

  if (
    normalized.length === 0
  ) {
    throw new TypeError(
      `${label} cannot be empty`,
    );
  }

  return normalized;
}

function requirePlainRecord(
  value,
  label,
) {
  if (
    value === null ||
    typeof value !==
      'object' ||
    Array.isArray(
      value,
    )
  ) {
    throw new TypeError(
      `${label} requires a plain record`,
    );
  }

  return value;
}

function assertAllowedKeys(
  value,
  allowed,
  label,
) {
  for (
    const key of
    Object.keys(value)
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
