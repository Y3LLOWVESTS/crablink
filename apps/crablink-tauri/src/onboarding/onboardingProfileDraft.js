/**
 * RO:WHAT — Strict local storage contract for the safe public profile draft collected during first-run onboarding.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; profile setup must survive restart without inheriting development identities or claiming backend publication.
 * RO:INTERACTS — ProfileSetupStep.jsx, onboardingModel.js, onboardingStorage.js, and WebView localStorage with a process-memory fallback.
 * RO:INVARIANTS — exact public/draft fields only; username remains local draft; backendConfirmed is always false; no Passport, wallet, ledger, capability, PIN, recovery, key, or VMK material.
 * RO:METRICS — none.
 * RO:CONFIG — storage key crablink.onboarding.profile-draft.v1 and bounded display-name/bio lengths.
 * RO:SECURITY — unknown fields and secret-shaped fields fail closed before serialization.
 * RO:TEST — profileSetupStep.test.mjs.
 */

import {
  normalizeUsername,
  validateUsername,
} from '../shared/utils/validation.js';

export const ONBOARDING_PROFILE_DRAFT_SCHEMA =
  'crablink.onboarding-profile-draft.v1';

export const ONBOARDING_PROFILE_DRAFT_STORAGE_KEY =
  'crablink.onboarding.profile-draft.v1';

export const ONBOARDING_PROFILE_DRAFT_FIELDS =
  Object.freeze([
    'schema',
    'username',
    'usernameStatus',
    'displayName',
    'bio',
    'avatarMode',
    'siteLabel',
    'profileStatus',
    'backendConfirmed',
    'createdAt',
    'updatedAt',
  ]);

export const ONBOARDING_PROFILE_LIMITS =
  Object.freeze({
    displayName: 80,
    bio: 280,
    siteLabel: 80,
  });

const ONBOARDING_PROFILE_FIELD_SET =
  new Set(
    ONBOARDING_PROFILE_DRAFT_FIELDS,
  );

const memoryFallbackStorage = new Map();

export function createOnboardingProfileDraft({
  username,
  displayName,
  bio = '',
  now,
} = {}) {
  const timestamp =
    normalizeTimestamp(now);

  const draft = {
    schema:
      ONBOARDING_PROFILE_DRAFT_SCHEMA,

    username:
      normalizeRequiredUsername(username),

    usernameStatus: 'local_draft',

    displayName: normalizeRequiredText(
      displayName,
      ONBOARDING_PROFILE_LIMITS
        .displayName,
      'Display name',
    ),

    bio: normalizeOptionalText(
      bio,
      ONBOARDING_PROFILE_LIMITS.bio,
      'Bio',
    ),

    avatarMode: 'local_placeholder',
    siteLabel: '',
    profileStatus: 'local_draft',
    backendConfirmed: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  assertSafeOnboardingProfileDraft(
    draft,
  );

  return Object.freeze(draft);
}

export function validateOnboardingProfileDraft(
  value,
) {
  const errors = [];

  if (!isPlainObject(value)) {
    return Object.freeze({
      ok: false,

      errors: Object.freeze([
        'Profile draft must be a plain object.',
      ]),
    });
  }

  const unknownFields =
    Object.keys(value).filter(
      (key) =>
        !ONBOARDING_PROFILE_FIELD_SET.has(
          key,
        ),
    );

  if (unknownFields.length > 0) {
    errors.push(
      `Unknown profile draft fields: ${unknownFields.join(
        ', ',
      )}.`,
    );
  }

  for (
    const field of
    ONBOARDING_PROFILE_DRAFT_FIELDS
  ) {
    if (
      !Object.prototype.hasOwnProperty.call(
        value,
        field,
      )
    ) {
      errors.push(
        `Missing profile draft field: ${field}.`,
      );
    }
  }

  if (
    value.schema !==
    ONBOARDING_PROFILE_DRAFT_SCHEMA
  ) {
    errors.push(
      'Profile draft schema is invalid.',
    );
  }

  const usernameValidation =
    validateUsername(value.username);

  if (
    !usernameValidation.ok ||
    normalizeUsername(value.username) !==
      value.username
  ) {
    errors.push(
      'Profile draft username is invalid.',
    );
  }

  if (
    !isBoundedRequiredText(
      value.displayName,
      ONBOARDING_PROFILE_LIMITS
        .displayName,
    )
  ) {
    errors.push(
      'Profile draft display name is invalid.',
    );
  }

  if (
    !isBoundedOptionalText(
      value.bio,
      ONBOARDING_PROFILE_LIMITS.bio,
    )
  ) {
    errors.push(
      'Profile draft bio is invalid.',
    );
  }

  if (
    value.usernameStatus !==
    'local_draft'
  ) {
    errors.push(
      'Profile draft username status must remain local_draft.',
    );
  }

  if (
    value.avatarMode !==
    'local_placeholder'
  ) {
    errors.push(
      'Profile draft avatar mode must remain local_placeholder.',
    );
  }

  if (
    !isBoundedOptionalText(
      value.siteLabel,
      ONBOARDING_PROFILE_LIMITS
        .siteLabel,
    ) ||
    value.siteLabel !== ''
  ) {
    errors.push(
      'Profile draft site label must remain empty until a later phase.',
    );
  }

  if (
    value.profileStatus !==
    'local_draft'
  ) {
    errors.push(
      'Profile draft status must remain local_draft.',
    );
  }

  if (
    value.backendConfirmed !== false
  ) {
    errors.push(
      'Profile draft cannot claim backend confirmation.',
    );
  }

  if (
    !isIsoTimestamp(value.createdAt)
  ) {
    errors.push(
      'Profile draft createdAt must be an ISO timestamp.',
    );
  }

  if (
    !isIsoTimestamp(value.updatedAt)
  ) {
    errors.push(
      'Profile draft updatedAt must be an ISO timestamp.',
    );
  }

  return Object.freeze({
    ok: errors.length === 0,
    errors: Object.freeze(errors),
  });
}

export function assertSafeOnboardingProfileDraft(
  value,
) {
  const validation =
    validateOnboardingProfileDraft(
      value,
    );

  if (!validation.ok) {
    throw new TypeError(
      validation.errors.join(' '),
    );
  }

  return value;
}

export function createOnboardingProfileDraftStorageAdapter({
  storage = createDefaultStorage(),

  storageKey =
    ONBOARDING_PROFILE_DRAFT_STORAGE_KEY,
} = {}) {
  const safeStorage =
    requireStorageBackend(storage);

  const safeStorageKey =
    requireStorageKey(storageKey);

  async function readOnboardingProfileDraft({
    username,
  } = {}) {
    const raw = safeStorage.getItem(
      safeStorageKey,
    );

    if (
      raw === null ||
      raw === undefined ||
      raw === ''
    ) {
      return null;
    }

    let parsed;

    try {
      parsed = JSON.parse(raw);
    } catch (_error) {
      safeStorage.removeItem(
        safeStorageKey,
      );

      return null;
    }

    const validation =
      validateOnboardingProfileDraft(
        parsed,
      );

    if (!validation.ok) {
      safeStorage.removeItem(
        safeStorageKey,
      );

      return null;
    }

    if (
      username !== undefined &&
      parsed.username !==
        normalizeRequiredUsername(
          username,
        )
    ) {
      safeStorage.removeItem(
        safeStorageKey,
      );

      return null;
    }

    return cloneSafeDraft(parsed);
  }

  async function writeOnboardingProfileDraft(
    draft,
  ) {
    const safeDraft =
      cloneSafeDraft(draft);

    safeStorage.setItem(
      safeStorageKey,
      JSON.stringify(safeDraft),
    );

    return cloneSafeDraft(
      safeDraft,
    );
  }

  async function clearOnboardingProfileDraft() {
    safeStorage.removeItem(
      safeStorageKey,
    );

    return Object.freeze({
      ok: true,
      cleared: true,
      storageKey: safeStorageKey,
    });
  }

  return Object.freeze({
    storageKey: safeStorageKey,
    readOnboardingProfileDraft,
    writeOnboardingProfileDraft,
    clearOnboardingProfileDraft,
  });
}

export const onboardingProfileDraftStorage =
  createOnboardingProfileDraftStorageAdapter();

export function readOnboardingProfileDraft(
  options,
) {
  return onboardingProfileDraftStorage
    .readOnboardingProfileDraft(
      options,
    );
}

export function writeOnboardingProfileDraft(
  draft,
) {
  return onboardingProfileDraftStorage
    .writeOnboardingProfileDraft(
      draft,
    );
}

export function clearOnboardingProfileDraft() {
  return onboardingProfileDraftStorage
    .clearOnboardingProfileDraft();
}

function createDefaultStorage() {
  return Object.freeze({
    getItem(key) {
      const localStorage =
        getBrowserLocalStorage();

      if (localStorage) {
        try {
          const value =
            localStorage.getItem(key);

          if (value !== null) {
            return value;
          }
        } catch (_error) {
          // The bounded process fallback remains available.
        }
      }

      return memoryFallbackStorage.has(
        key,
      )
        ? memoryFallbackStorage.get(key)
        : null;
    },

    setItem(key, value) {
      const serialized =
        String(value);

      const localStorage =
        getBrowserLocalStorage();

      let storedInBrowser = false;

      if (localStorage) {
        try {
          localStorage.setItem(
            key,
            serialized,
          );

          storedInBrowser = true;
        } catch (_error) {
          // The process fallback preserves this public local draft.
        }
      }

      if (storedInBrowser) {
        memoryFallbackStorage.delete(
          key,
        );
      } else {
        memoryFallbackStorage.set(
          key,
          serialized,
        );
      }
    },

    removeItem(key) {
      const localStorage =
        getBrowserLocalStorage();

      if (localStorage) {
        try {
          localStorage.removeItem(key);
        } catch (_error) {
          // Continue clearing the process fallback.
        }
      }

      memoryFallbackStorage.delete(
        key,
      );
    },
  });
}

function getBrowserLocalStorage() {
  try {
    const storage =
      globalThis.localStorage;

    if (
      storage &&
      typeof storage.getItem ===
        'function' &&
      typeof storage.setItem ===
        'function' &&
      typeof storage.removeItem ===
        'function'
    ) {
      return storage;
    }
  } catch (_error) {
    return null;
  }

  return null;
}

function requireStorageBackend(
  storage,
) {
  if (
    !storage ||
    typeof storage !== 'object' ||
    typeof storage.getItem !==
      'function' ||
    typeof storage.setItem !==
      'function' ||
    typeof storage.removeItem !==
      'function'
  ) {
    throw new TypeError(
      'Onboarding profile storage requires getItem, setItem, and removeItem.',
    );
  }

  return storage;
}

function requireStorageKey(value) {
  if (
    typeof value !== 'string' ||
    !value.trim()
  ) {
    throw new TypeError(
      'Onboarding profile storage key must be non-empty text.',
    );
  }

  return value.trim();
}

function cloneSafeDraft(draft) {
  assertSafeOnboardingProfileDraft(
    draft,
  );

  const clone = JSON.parse(
    JSON.stringify(draft),
  );

  assertSafeOnboardingProfileDraft(
    clone,
  );

  return Object.freeze(clone);
}

function normalizeRequiredUsername(
  value,
) {
  const username =
    normalizeUsername(value);

  const validation =
    validateUsername(username);

  if (!validation.ok) {
    throw new TypeError(
      'A valid onboarding username is required for the profile draft.',
    );
  }

  return username;
}

function normalizeRequiredText(
  value,
  maxLength,
  label,
) {
  const clean =
    String(value ?? '')
      .replace(/\s+/g, ' ')
      .trim();

  if (!clean) {
    throw new TypeError(
      `${label} is required.`,
    );
  }

  if (clean.length > maxLength) {
    throw new TypeError(
      `${label} must be ${maxLength} characters or less.`,
    );
  }

  return clean;
}

function normalizeOptionalText(
  value,
  maxLength,
  label,
) {
  const clean =
    String(value ?? '')
      .replace(/\r\n?/g, '\n')
      .trim();

  if (clean.length > maxLength) {
    throw new TypeError(
      `${label} must be ${maxLength} characters or less.`,
    );
  }

  return clean;
}

function isBoundedRequiredText(
  value,
  maxLength,
) {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= maxLength &&
    value === value.trim()
  );
}

function isBoundedOptionalText(
  value,
  maxLength,
) {
  return (
    typeof value === 'string' &&
    value.length <= maxLength &&
    value === value.trim()
  );
}

function normalizeTimestamp(value) {
  const date =
    value === undefined
      ? new Date()
      : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new TypeError(
      'Profile draft timestamp is invalid.',
    );
  }

  return date.toISOString();
}

function isIsoTimestamp(value) {
  if (typeof value !== 'string') {
    return false;
  }

  const date = new Date(value);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString() === value
  );
}

function isPlainObject(value) {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    return false;
  }

  const prototype =
    Object.getPrototypeOf(value);

  return (
    prototype === Object.prototype ||
    prototype === null
  );
}
