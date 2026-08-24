/**
 * RO:WHAT — Pure redacted review of Native Passport creation and pre-create native custody presence used by onboarding.
 * RO:WHY — Onboarding must create only when native status confirms absence and must safely resume when a real local Passport already exists.
 * RO:INTERACTS — passportAdapter.js, PassportCreateStep.jsx, and onboardingModel.js.
 * RO:INVARIANTS — fresh creation succeeds only from created_locked; existing custody requires read-only native status proof; malformed or unavailable status never authorizes creation or reconciliation.
 * RO:METRICS — none.
 * RO:CONFIG — none.
 * RO:SECURITY — raw native errors, PINs, secrets, vault material, roots, keys, capabilities, wallet state, and ledger state are never returned.
 * RO:TEST — passportCreateStep.test.mjs and physicalM1ExistingPassportOnboardingReconciliation.test.mjs.
 */

export const ONBOARDING_PASSPORT_CREATE_SCHEMA =
  'crablink.onboarding-passport-create.v1';

export const ONBOARDING_PASSPORT_CREATE_STATUS =
  Object.freeze({
    CREATED_LOCKED: 'created_locked',
    EXISTING_CONFIRMED: 'existing_confirmed',
    FAILURE: 'failure',
  });

export const ONBOARDING_PASSPORT_CREATE_CODES =
  Object.freeze({
    CREATED_LOCKED: 'created_locked',
    EXISTING_CONFIRMED: 'existing_confirmed',
    CANCELLED: 'cancelled',
    UNAVAILABLE: 'unavailable',
    CREATE_REJECTED: 'create_rejected',
    ALREADY_EXISTS: 'already_exists',
    INVALID_RESPONSE: 'invalid_response',
    CREATE_FAILED: 'create_failed',
    INTERRUPTED: 'interrupted',
  });

export const ONBOARDING_NATIVE_PASSPORT_PRESENCE =
  Object.freeze({
    ABSENT: 'absent',
    STORED_LOCKED: 'stored_locked',
    OPERATIONAL_UNLOCKED:
      'operational_unlocked',
    UNAVAILABLE: 'unavailable',
  });

export function reviewOnboardingNativePassportPresence(
  statusDto,
) {
  const value =
    statusDto &&
    typeof statusDto === 'object' &&
    !Array.isArray(statusDto)
      ? statusDto
      : {};

  const normalizedState =
    normalizeCommandState(
      value.state,
    );

  const runtimeReadyMatchesState =
    (normalizedState ===
      'no_passport' &&
      value.nativeRuntimeReady ===
        false) ||
    ((normalizedState ===
      'locked' ||
      normalizedState ===
        'stored_locked') &&
      value.nativeRuntimeReady ===
        false) ||
    (normalizedState ===
      'operational_unlocked' &&
      value.nativeRuntimeReady ===
        true);

  const safeReadOnlyStatus =
    runtimeReadyMatchesState &&
    value.redacted === true &&
    value.readOnly === true &&
    value.unlockPerformed === false &&
    value.platformSealerAccessed === false &&
    value.runtimeIoPerformed === false &&
    value.storageMutated === false &&
    value.walletOrLedgerMutated === false;

  if (!safeReadOnlyStatus) {
    return freezePresence({
      state:
        ONBOARDING_NATIVE_PASSPORT_PRESENCE
          .UNAVAILABLE,
      existing: false,
      safeToCreate: false,
      operationalUnlocked: false,
    });
  }

  switch (normalizedState) {
    case 'no_passport':
      return freezePresence({
        state:
          ONBOARDING_NATIVE_PASSPORT_PRESENCE
            .ABSENT,
        existing: false,
        safeToCreate: true,
        operationalUnlocked: false,
      });

    case 'locked':
    case 'stored_locked':
      return freezePresence({
        state:
          ONBOARDING_NATIVE_PASSPORT_PRESENCE
            .STORED_LOCKED,
        existing: true,
        safeToCreate: false,
        operationalUnlocked: false,
      });

    case 'operational_unlocked':
      return freezePresence({
        state:
          ONBOARDING_NATIVE_PASSPORT_PRESENCE
            .OPERATIONAL_UNLOCKED,
        existing: true,
        safeToCreate: false,
        operationalUnlocked: true,
      });

    default:
      return freezePresence({
        state:
          ONBOARDING_NATIVE_PASSPORT_PRESENCE
            .UNAVAILABLE,
        existing: false,
        safeToCreate: false,
        operationalUnlocked: false,
      });
  }
}

export function createExistingPassportConfirmedOutcome({
  operationalUnlocked = false,
} = {}) {
  return freezeOutcome({
    status:
      ONBOARDING_PASSPORT_CREATE_STATUS
        .EXISTING_CONFIRMED,
    code:
      ONBOARDING_PASSPORT_CREATE_CODES
        .EXISTING_CONFIRMED,
    message:
      operationalUnlocked
        ? 'An existing local Native Passport was confirmed and is already operationally unlocked.'
        : 'An existing local Native Passport was confirmed without creating a second Passport.',
    retryable: false,
    nativeSecureInputRequested: false,
  });
}

function freezePresence({
  state,
  existing,
  safeToCreate,
  operationalUnlocked,
}) {
  return Object.freeze({
    state,
    existing: existing === true,
    safeToCreate:
      safeToCreate === true,
    operationalUnlocked:
      operationalUnlocked === true,
  });
}

export function reviewOnboardingPassportCreateResult(
  commandDto,
) {
  const value =
    commandDto &&
    typeof commandDto === 'object' &&
    !Array.isArray(commandDto)
      ? commandDto
      : {};

  const commandState =
    normalizeCommandState(value.state);

  const safeRedactedPosture =
    value.redacted !== false &&
    value.pinReceivedFromWebview !== true &&
    value.secretMaterialReturned !== true &&
    value.recoveryRootUnsealed !== true &&
    value.walletOrLedgerMutated !== true;

  const createdLocked =
    commandState ===
      ONBOARDING_PASSPORT_CREATE_CODES
        .CREATED_LOCKED &&
    safeRedactedPosture &&
    value.nativeSecureInputRequested === true &&
    value.encryptedVaultMutated === true &&
    value.platformMaterialMutated === true;

  if (createdLocked) {
    return freezeOutcome({
      status:
        ONBOARDING_PASSPORT_CREATE_STATUS
          .CREATED_LOCKED,
      code:
        ONBOARDING_PASSPORT_CREATE_CODES
          .CREATED_LOCKED,
      message:
        'Your local Native Passport was created and remains locked.',
      retryable: false,
      nativeSecureInputRequested: true,
    });
  }

  switch (commandState) {
    case ONBOARDING_PASSPORT_CREATE_CODES.CANCELLED:
      return createRedactedPassportCreateFailure(
        ONBOARDING_PASSPORT_CREATE_CODES.CANCELLED,
      );

    case ONBOARDING_PASSPORT_CREATE_CODES.UNAVAILABLE:
      return createRedactedPassportCreateFailure(
        ONBOARDING_PASSPORT_CREATE_CODES
          .UNAVAILABLE,
      );

    case ONBOARDING_PASSPORT_CREATE_CODES
      .CREATE_REJECTED:
      return createRedactedPassportCreateFailure(
        ONBOARDING_PASSPORT_CREATE_CODES
          .CREATE_REJECTED,
      );

    case ONBOARDING_PASSPORT_CREATE_CODES
      .ALREADY_EXISTS:
      return createRedactedPassportCreateFailure(
        ONBOARDING_PASSPORT_CREATE_CODES
          .ALREADY_EXISTS,
      );

    default:
      return createRedactedPassportCreateFailure(
        ONBOARDING_PASSPORT_CREATE_CODES
          .INVALID_RESPONSE,
      );
  }
}

export function reviewOnboardingPassportCreateError(
  _error,
) {
  return createRedactedPassportCreateFailure(
    ONBOARDING_PASSPORT_CREATE_CODES
      .CREATE_FAILED,
  );
}

export function createRedactedPassportCreateFailure(
  code,
) {
  const normalizedCode =
    normalizeFailureCode(code);

  return freezeOutcome({
    status:
      ONBOARDING_PASSPORT_CREATE_STATUS.FAILURE,
    code: normalizedCode,
    message:
      failureMessage(normalizedCode),
    retryable:
      normalizedCode !==
        ONBOARDING_PASSPORT_CREATE_CODES
          .UNAVAILABLE &&
      normalizedCode !==
        ONBOARDING_PASSPORT_CREATE_CODES
          .ALREADY_EXISTS,
    nativeSecureInputRequested: false,
  });
}

function freezeOutcome({
  status,
  code,
  message,
  retryable,
  nativeSecureInputRequested,
}) {
  return Object.freeze({
    schema:
      ONBOARDING_PASSPORT_CREATE_SCHEMA,
    status,
    code,
    message,
    retryable,
    redacted: true,
    nativeSecureInputRequested:
      nativeSecureInputRequested === true,
    pinReceivedFromWebview: false,
    secretMaterialReturned: false,
    recoveryRootUnsealed: false,
    walletOrLedgerMutated: false,
  });
}

function failureMessage(code) {
  switch (code) {
    case ONBOARDING_PASSPORT_CREATE_CODES.CANCELLED:
      return 'Native Passport creation was cancelled. No secret was returned to CrabLink.';

    case ONBOARDING_PASSPORT_CREATE_CODES.UNAVAILABLE:
      return 'Native Passport creation is unavailable on this desktop.';

    case ONBOARDING_PASSPORT_CREATE_CODES
      .CREATE_REJECTED:
      return 'Native Passport creation was rejected without exposing private details.';

    case ONBOARDING_PASSPORT_CREATE_CODES
      .ALREADY_EXISTS:
      return 'A local Native Passport already exists. Onboarding did not create a second Passport.';

    case ONBOARDING_PASSPORT_CREATE_CODES.INTERRUPTED:
      return 'A previous Native Passport create attempt was not confirmed. Retry the native create step.';

    case ONBOARDING_PASSPORT_CREATE_CODES
      .INVALID_RESPONSE:
      return 'Native Passport creation did not return an accepted redacted result.';

    default:
      return 'Native Passport creation could not be completed.';
  }
}

function normalizeFailureCode(value) {
  const code = normalizeCommandState(value);

  if (
    Object.values(
      ONBOARDING_PASSPORT_CREATE_CODES,
    ).includes(code) &&
    code !==
      ONBOARDING_PASSPORT_CREATE_CODES
        .CREATED_LOCKED
  ) {
    return code;
  }

  return ONBOARDING_PASSPORT_CREATE_CODES
    .CREATE_FAILED;
}

function normalizeCommandState(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .trim()
    .toLowerCase();
}
