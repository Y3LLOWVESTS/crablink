/**
 * RO:WHAT — Pure redacted state model for CrabLink first-run onboarding.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; provides one deterministic onboarding contract before storage, routing, and UI integration.
 * RO:INTERACTS — shared username validation and future onboarding storage, routing, Passport, recovery, PIN, and profile adapters.
 * RO:INVARIANTS — no PIN, recovery words, roots, keys, VMKs, capabilities, wallet mutation, or ledger authority.
 * RO:METRICS — none.
 * RO:CONFIG — none.
 * RO:SECURITY — validates an exact redacted DTO field set and rejects unknown secret-bearing fields.
 * RO:TEST — onboardingModel.test.mjs.
 */

import {
  normalizeUsername,
  validateUsername,
} from '../shared/utils/validation.js';

export const ONBOARDING_SCHEMA =
  'crablink.onboarding.v1';

export const ONBOARDING_STATES = Object.freeze({
  NOT_STARTED: 'not_started',
  WELCOME: 'welcome',
  USERNAME_ENTRY: 'username_entry',
  USERNAME_CHECKING: 'username_checking',
  USERNAME_AVAILABLE: 'username_available',
  USERNAME_BYPASSED_FOR_DEV:
    'username_bypassed_for_dev',
  PASSPORT_CREATE_REQUESTED:
    'passport_create_requested',
  PASSPORT_CREATED_LOCKED:
    'passport_created_locked',
  RECOVERY_PHRASE_REQUIRED:
    'recovery_phrase_required',
  RECOVERY_PHRASE_ACKNOWLEDGED:
    'recovery_phrase_acknowledged',
  PIN_SETUP_REQUIRED: 'pin_setup_required',
  PIN_SETUP_COMPLETE: 'pin_setup_complete',
  PROFILE_SETUP: 'profile_setup',
  PROFILE_SKIPPED: 'profile_skipped',
  PROFILE_SAVED: 'profile_saved',
  COMPLETE: 'complete',
  BLOCKED: 'blocked',
  ERROR: 'error',
});

export const USERNAME_AVAILABILITY =
  Object.freeze({
    UNKNOWN: 'unknown',
    AVAILABLE: 'available',
    UNAVAILABLE: 'unavailable',
    BYPASSED_FOR_DEV: 'bypassed_for_dev',
  });

export const PASSPORT_STATES = Object.freeze({
  NO_PASSPORT: 'no_passport',
  CREATED_LOCKED: 'created_locked',
  OPERATIONAL_UNLOCKED: 'operational_unlocked',
  UNAVAILABLE: 'unavailable',
});

export const PROFILE_SETUP_STATES =
  Object.freeze({
    PENDING: 'pending',
    SKIPPED: 'skipped',
    SAVED: 'saved',
  });

export const ONBOARDING_DTO_FIELDS =
  Object.freeze([
    'schema',
    'state',
    'completed',
    'username',
    'usernameAvailability',
    'devAvailabilityBypassed',
    'passportState',
    'recoveryPhraseAcknowledged',
    'pinSetupComplete',
    'profileSetup',
    'createdAt',
    'updatedAt',
  ]);

const ONBOARDING_STATE_VALUES = new Set(
  Object.values(ONBOARDING_STATES),
);

const USERNAME_AVAILABILITY_VALUES = new Set(
  Object.values(USERNAME_AVAILABILITY),
);

const PASSPORT_STATE_VALUES = new Set(
  Object.values(PASSPORT_STATES),
);

const PROFILE_SETUP_VALUES = new Set(
  Object.values(PROFILE_SETUP_STATES),
);

const DTO_FIELD_SET = new Set(
  ONBOARDING_DTO_FIELDS,
);

export function createInitialOnboardingState({
  now,
} = {}) {
  const timestamp = normalizeTimestamp(now);

  return freezeState({
    schema: ONBOARDING_SCHEMA,
    state: ONBOARDING_STATES.WELCOME,
    completed: false,
    username: '',
    usernameAvailability:
      USERNAME_AVAILABILITY.UNKNOWN,
    devAvailabilityBypassed: false,
    passportState:
      PASSPORT_STATES.NO_PASSPORT,
    recoveryPhraseAcknowledged: false,
    pinSetupComplete: false,
    profileSetup:
      PROFILE_SETUP_STATES.PENDING,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

export function validateOnboardingUsername(
  value,
) {
  return validateUsername(value);
}

export function isUsernameAvailabilityStatus(
  value,
) {
  return USERNAME_AVAILABILITY_VALUES.has(
    String(value || ''),
  );
}

export function isRecoveryAcknowledged(
  value,
) {
  return value === true;
}

export function isPinSetupComplete(value) {
  return value === true;
}

export function isProfileSetupComplete(
  value,
) {
  return (
    value === PROFILE_SETUP_STATES.SKIPPED ||
    value === PROFILE_SETUP_STATES.SAVED
  );
}

export function isPassportCreated(value) {
  return (
    value === PASSPORT_STATES.CREATED_LOCKED ||
    value ===
      PASSPORT_STATES.OPERATIONAL_UNLOCKED
  );
}

export function validateOnboardingState(
  candidate,
) {
  const errors = [];

  if (!isPlainObject(candidate)) {
    return validationResult([
      'onboarding_state_must_be_plain_object',
    ]);
  }

  const keys = Object.keys(candidate);

  const unknownFields = keys
    .filter((key) => !DTO_FIELD_SET.has(key))
    .sort();

  const missingFields =
    ONBOARDING_DTO_FIELDS.filter(
      (key) =>
        !Object.prototype.hasOwnProperty.call(
          candidate,
          key,
        ),
    );

  if (unknownFields.length > 0) {
    errors.push(
      `unknown_fields:${unknownFields.join(',')}`,
    );
  }

  if (missingFields.length > 0) {
    errors.push(
      `missing_fields:${missingFields.join(',')}`,
    );
  }

  if (candidate.schema !== ONBOARDING_SCHEMA) {
    errors.push('schema_invalid');
  }

  if (
    !ONBOARDING_STATE_VALUES.has(
      candidate.state,
    )
  ) {
    errors.push('state_invalid');
  }

  if (typeof candidate.completed !== 'boolean') {
    errors.push('completed_must_be_boolean');
  }

  if (typeof candidate.username !== 'string') {
    errors.push('username_must_be_string');
  } else if (
    candidate.username &&
    candidate.username !==
      normalizeUsername(candidate.username)
  ) {
    errors.push('username_must_be_normalized');
  } else if (candidate.username) {
    const usernameValidation =
      validateOnboardingUsername(
        candidate.username,
      );

    if (!usernameValidation.ok) {
      errors.push(
        `username_invalid:${usernameValidation.code}`,
      );
    }
  }

  if (
    !isUsernameAvailabilityStatus(
      candidate.usernameAvailability,
    )
  ) {
    errors.push(
      'username_availability_invalid',
    );
  }

  if (
    candidate.usernameAvailability !==
      USERNAME_AVAILABILITY.UNKNOWN &&
    !candidate.username
  ) {
    errors.push(
      'username_required_for_availability',
    );
  }

  if (
    typeof candidate.devAvailabilityBypassed !==
    'boolean'
  ) {
    errors.push(
      'dev_availability_bypassed_must_be_boolean',
    );
  }

  if (
    candidate.devAvailabilityBypassed === true &&
    candidate.usernameAvailability !==
      USERNAME_AVAILABILITY.BYPASSED_FOR_DEV
  ) {
    errors.push('dev_bypass_status_mismatch');
  }

  if (
    candidate.usernameAvailability ===
      USERNAME_AVAILABILITY.BYPASSED_FOR_DEV &&
    candidate.devAvailabilityBypassed !== true
  ) {
    errors.push('dev_bypass_flag_missing');
  }

  if (
    !PASSPORT_STATE_VALUES.has(
      candidate.passportState,
    )
  ) {
    errors.push('passport_state_invalid');
  }

  if (
    typeof candidate.recoveryPhraseAcknowledged !==
    'boolean'
  ) {
    errors.push(
      'recovery_acknowledgement_must_be_boolean',
    );
  }

  if (
    typeof candidate.pinSetupComplete !==
    'boolean'
  ) {
    errors.push(
      'pin_setup_complete_must_be_boolean',
    );
  }

  if (
    !PROFILE_SETUP_VALUES.has(
      candidate.profileSetup,
    )
  ) {
    errors.push('profile_setup_invalid');
  }

  if (!isIsoTimestamp(candidate.createdAt)) {
    errors.push('created_at_invalid');
  }

  if (!isIsoTimestamp(candidate.updatedAt)) {
    errors.push('updated_at_invalid');
  }

  const stateSaysComplete =
    candidate.state ===
    ONBOARDING_STATES.COMPLETE;

  if (
    candidate.completed !== stateSaysComplete
  ) {
    errors.push('completion_state_mismatch');
  }

  if (stateSaysComplete) {
    const eligibility =
      getOnboardingCompletionEligibility(
        candidate,
      );

    if (!eligibility.eligible) {
      errors.push(
        `completion_ineligible:${eligibility.missing.join(
          ',',
        )}`,
      );
    }
  }

  return validationResult(errors);
}

export function assertSafeOnboardingState(
  candidate,
) {
  const validation =
    validateOnboardingState(candidate);

  if (!validation.ok) {
    throw new TypeError(
      `Invalid redacted onboarding state: ${validation.errors.join(
        '; ',
      )}`,
    );
  }

  return candidate;
}

export function beginUsernameEntry(
  state,
  { now } = {},
) {
  requireState(
    state,
    [
      ONBOARDING_STATES.NOT_STARTED,
      ONBOARDING_STATES.WELCOME,
      ONBOARDING_STATES.USERNAME_ENTRY,
    ],
    'begin username entry',
  );

  return transition(
    state,
    {
      state:
        ONBOARDING_STATES.USERNAME_ENTRY,
      username: '',
      usernameAvailability:
        USERNAME_AVAILABILITY.UNKNOWN,
      devAvailabilityBypassed: false,
    },
    now,
  );
}

export function beginUsernameCheck(
  state,
  username,
  { now } = {},
) {
  requireState(
    state,
    [ONBOARDING_STATES.USERNAME_ENTRY],
    'begin username check',
  );

  const validation =
    requireValidUsername(username);

  return transition(
    state,
    {
      state:
        ONBOARDING_STATES.USERNAME_CHECKING,
      username: validation.normalized,
      usernameAvailability:
        USERNAME_AVAILABILITY.UNKNOWN,
      devAvailabilityBypassed: false,
    },
    now,
  );
}

export function recordUsernameAvailable(
  state,
  { now } = {},
) {
  requireState(
    state,
    [ONBOARDING_STATES.USERNAME_CHECKING],
    'record username availability',
  );

  return transition(
    state,
    {
      state:
        ONBOARDING_STATES.USERNAME_AVAILABLE,
      usernameAvailability:
        USERNAME_AVAILABILITY.AVAILABLE,
      devAvailabilityBypassed: false,
    },
    now,
  );
}

export function recordUsernameUnavailable(
  state,
  { now } = {},
) {
  requireState(
    state,
    [ONBOARDING_STATES.USERNAME_CHECKING],
    'record username unavailability',
  );

  return transition(
    state,
    {
      state:
        ONBOARDING_STATES.USERNAME_ENTRY,
      usernameAvailability:
        USERNAME_AVAILABILITY.UNAVAILABLE,
      devAvailabilityBypassed: false,
    },
    now,
  );
}

export function returnToUsernameEntry(
  state,
  { now } = {},
) {
  requireState(
    state,
    [
      ONBOARDING_STATES.USERNAME_CHECKING,
      ONBOARDING_STATES.USERNAME_AVAILABLE,
      ONBOARDING_STATES
        .USERNAME_BYPASSED_FOR_DEV,
    ],
    'return to username entry',
  );

  return transition(
    state,
    {
      state:
        ONBOARDING_STATES.USERNAME_ENTRY,
      usernameAvailability:
        USERNAME_AVAILABILITY.UNKNOWN,
      devAvailabilityBypassed: false,
    },
    now,
  );
}

export function bypassUsernameForDev(
  state,
  username,
  { now } = {},
) {
  requireState(
    state,
    [ONBOARDING_STATES.USERNAME_ENTRY],
    'bypass username availability for dev',
  );

  const validation =
    requireValidUsername(username);

  return transition(
    state,
    {
      state:
        ONBOARDING_STATES
          .USERNAME_BYPASSED_FOR_DEV,
      username: validation.normalized,
      usernameAvailability:
        USERNAME_AVAILABILITY.BYPASSED_FOR_DEV,
      devAvailabilityBypassed: true,
    },
    now,
  );
}

export function requestPassportCreate(
  state,
  { now } = {},
) {
  requireState(
    state,
    [
      ONBOARDING_STATES.USERNAME_AVAILABLE,
      ONBOARDING_STATES
        .USERNAME_BYPASSED_FOR_DEV,
    ],
    'request Passport creation',
  );

  if (!hasUsernameDecision(state)) {
    throw new TypeError(
      'A username availability decision is required.',
    );
  }

  return transition(
    state,
    {
      state:
        ONBOARDING_STATES
          .PASSPORT_CREATE_REQUESTED,
    },
    now,
  );
}

export function recordPassportCreatedLocked(
  state,
  { now } = {},
) {
  requireState(
    state,
    [
      ONBOARDING_STATES
        .PASSPORT_CREATE_REQUESTED,
    ],
    'record locked Passport creation',
  );

  return transition(
    state,
    {
      state:
        ONBOARDING_STATES
          .PASSPORT_CREATED_LOCKED,
      passportState:
        PASSPORT_STATES.CREATED_LOCKED,
    },
    now,
  );
}

export function requireRecoveryPhrase(
  state,
  { now } = {},
) {
  requireState(
    state,
    [
      ONBOARDING_STATES
        .PASSPORT_CREATED_LOCKED,
    ],
    'require recovery phrase ceremony',
  );

  if (!isPassportCreated(state.passportState)) {
    throw new TypeError(
      'A created Passport is required.',
    );
  }

  return transition(
    state,
    {
      state:
        ONBOARDING_STATES
          .RECOVERY_PHRASE_REQUIRED,
    },
    now,
  );
}

export function acknowledgeRecoveryPhrase(
  state,
  { now } = {},
) {
  requireState(
    state,
    [
      ONBOARDING_STATES
        .RECOVERY_PHRASE_REQUIRED,
    ],
    'acknowledge recovery phrase',
  );

  return transition(
    state,
    {
      state:
        ONBOARDING_STATES
          .RECOVERY_PHRASE_ACKNOWLEDGED,
      recoveryPhraseAcknowledged: true,
    },
    now,
  );
}

export function requirePinSetup(
  state,
  { now } = {},
) {
  requireState(
    state,
    [
      ONBOARDING_STATES
        .RECOVERY_PHRASE_ACKNOWLEDGED,
    ],
    'require PIN setup',
  );

  if (
    !isRecoveryAcknowledged(
      state.recoveryPhraseAcknowledged,
    )
  ) {
    throw new TypeError(
      'Recovery acknowledgement is required.',
    );
  }

  return transition(
    state,
    {
      state:
        ONBOARDING_STATES.PIN_SETUP_REQUIRED,
    },
    now,
  );
}

export function recordPinSetupComplete(
  state,
  { now } = {},
) {
  requireState(
    state,
    [ONBOARDING_STATES.PIN_SETUP_REQUIRED],
    'record PIN setup completion',
  );

  return transition(
    state,
    {
      state:
        ONBOARDING_STATES.PIN_SETUP_COMPLETE,
      pinSetupComplete: true,
    },
    now,
  );
}

export function beginProfileSetup(
  state,
  { now } = {},
) {
  requireState(
    state,
    [ONBOARDING_STATES.PIN_SETUP_COMPLETE],
    'begin profile setup',
  );

  if (
    !isPinSetupComplete(
      state.pinSetupComplete,
    )
  ) {
    throw new TypeError(
      'PIN setup completion is required.',
    );
  }

  return transition(
    state,
    {
      state:
        ONBOARDING_STATES.PROFILE_SETUP,
      profileSetup:
        PROFILE_SETUP_STATES.PENDING,
    },
    now,
  );
}

export function skipProfileSetup(
  state,
  { now } = {},
) {
  requireState(
    state,
    [ONBOARDING_STATES.PROFILE_SETUP],
    'skip profile setup',
  );

  return transition(
    state,
    {
      state:
        ONBOARDING_STATES.PROFILE_SKIPPED,
      profileSetup:
        PROFILE_SETUP_STATES.SKIPPED,
    },
    now,
  );
}

export function saveProfileSetup(
  state,
  { now } = {},
) {
  requireState(
    state,
    [ONBOARDING_STATES.PROFILE_SETUP],
    'save profile setup',
  );

  return transition(
    state,
    {
      state:
        ONBOARDING_STATES.PROFILE_SAVED,
      profileSetup:
        PROFILE_SETUP_STATES.SAVED,
    },
    now,
  );
}

export function getOnboardingCompletionEligibility(
  state,
) {
  const missing = [];

  const usernameValidation =
    validateOnboardingUsername(
      state?.username,
    );

  if (
    !usernameValidation.ok ||
    !hasUsernameDecision(state)
  ) {
    missing.push('username_decision');
  }

  if (
    !isPassportCreated(
      state?.passportState,
    )
  ) {
    missing.push('passport_created');
  }

  if (
    !isRecoveryAcknowledged(
      state?.recoveryPhraseAcknowledged,
    )
  ) {
    missing.push(
      'recovery_phrase_acknowledged',
    );
  }

  if (
    !isPinSetupComplete(
      state?.pinSetupComplete,
    )
  ) {
    missing.push('pin_setup_complete');
  }

  if (
    !isProfileSetupComplete(
      state?.profileSetup,
    )
  ) {
    missing.push(
      'profile_setup_decision',
    );
  }

  return Object.freeze({
    eligible: missing.length === 0,
    missing: Object.freeze(missing),
  });
}

export function canCompleteOnboarding(
  state,
) {
  return getOnboardingCompletionEligibility(
    state,
  ).eligible;
}

export function completeOnboarding(
  state,
  { now } = {},
) {
  requireState(
    state,
    [
      ONBOARDING_STATES.PROFILE_SKIPPED,
      ONBOARDING_STATES.PROFILE_SAVED,
    ],
    'complete onboarding',
  );

  const eligibility =
    getOnboardingCompletionEligibility(
      state,
    );

  if (!eligibility.eligible) {
    throw new TypeError(
      `Onboarding is incomplete: ${eligibility.missing.join(
        ', ',
      )}`,
    );
  }

  return transition(
    state,
    {
      state: ONBOARDING_STATES.COMPLETE,
      completed: true,
    },
    now,
  );
}

export function blockOnboarding(
  state,
  { now } = {},
) {
  assertSafeOnboardingState(state);

  return transition(
    state,
    {
      state: ONBOARDING_STATES.BLOCKED,
      completed: false,
    },
    now,
  );
}

export function failOnboarding(
  state,
  { now } = {},
) {
  assertSafeOnboardingState(state);

  return transition(
    state,
    {
      state: ONBOARDING_STATES.ERROR,
      completed: false,
    },
    now,
  );
}

function transition(state, patch, now) {
  assertSafeOnboardingState(state);
  assertTransitionPatch(patch);

  const next = {
    ...state,
    ...patch,
    username:
      Object.prototype.hasOwnProperty.call(
        patch,
        'username',
      )
        ? normalizeUsername(patch.username)
        : state.username,
    updatedAt: normalizeTimestamp(now),
  };

  assertSafeOnboardingState(next);

  return freezeState(next);
}

function assertTransitionPatch(patch) {
  if (!isPlainObject(patch)) {
    throw new TypeError(
      'Onboarding transition patch must be a plain object.',
    );
  }

  const forbiddenFields = Object.keys(
    patch,
  ).filter(
    (key) =>
      !DTO_FIELD_SET.has(key) ||
      key === 'schema' ||
      key === 'createdAt' ||
      key === 'updatedAt',
  );

  if (forbiddenFields.length > 0) {
    throw new TypeError(
      `Forbidden onboarding transition fields: ${forbiddenFields
        .sort()
        .join(', ')}`,
    );
  }
}

function requireState(
  state,
  allowedStates,
  action,
) {
  assertSafeOnboardingState(state);

  if (!allowedStates.includes(state.state)) {
    throw new TypeError(
      `Cannot ${action} from onboarding state ${state.state}.`,
    );
  }
}

function requireValidUsername(value) {
  const validation =
    validateOnboardingUsername(value);

  if (!validation.ok) {
    throw new TypeError(
      `Invalid onboarding username: ${validation.code}`,
    );
  }

  return validation;
}

function hasUsernameDecision(state) {
  return (
    state?.usernameAvailability ===
      USERNAME_AVAILABILITY.AVAILABLE ||
    state?.usernameAvailability ===
      USERNAME_AVAILABILITY.BYPASSED_FOR_DEV
  );
}

function validationResult(errors) {
  return Object.freeze({
    ok: errors.length === 0,
    errors: Object.freeze([...errors]),
  });
}

function freezeState(state) {
  return Object.freeze({
    ...state,
  });
}

function normalizeTimestamp(value) {
  const date =
    value instanceof Date
      ? value
      : value
        ? new Date(value)
        : new Date();

  if (Number.isNaN(date.getTime())) {
    throw new TypeError(
      'Onboarding timestamp must be valid.',
    );
  }

  return date.toISOString();
}

function isIsoTimestamp(value) {
  if (
    typeof value !== 'string' ||
    !value
  ) {
    return false;
  }

  const date = new Date(value);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString() === value
  );
}

function isPlainObject(value) {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) ===
      Object.prototype
  );
}
