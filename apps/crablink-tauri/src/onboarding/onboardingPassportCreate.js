/**
 * RO:WHAT — Pure redacted review of the desktop Native Passport create result used by onboarding.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; onboarding must advance only from the accepted Phase 15 created-and-locked result.
 * RO:INTERACTS — passportAdapter.js and PassportCreateStep.jsx.
 * RO:INVARIANTS — only created_locked with native secure input and locked-vault mutation succeeds; all other outcomes become bounded redacted failures.
 * RO:METRICS — none.
 * RO:CONFIG — none.
 * RO:SECURITY — raw native errors, PINs, secrets, vault material, roots, keys, capabilities, wallet state, and ledger state are never returned.
 * RO:TEST — passportCreateStep.test.mjs.
 */

export const ONBOARDING_PASSPORT_CREATE_SCHEMA =
  'crablink.onboarding-passport-create.v1';

export const ONBOARDING_PASSPORT_CREATE_STATUS =
  Object.freeze({
    CREATED_LOCKED: 'created_locked',
    FAILURE: 'failure',
  });

export const ONBOARDING_PASSPORT_CREATE_CODES =
  Object.freeze({
    CREATED_LOCKED: 'created_locked',
    CANCELLED: 'cancelled',
    UNAVAILABLE: 'unavailable',
    CREATE_REJECTED: 'create_rejected',
    ALREADY_EXISTS: 'already_exists',
    INVALID_RESPONSE: 'invalid_response',
    CREATE_FAILED: 'create_failed',
    INTERRUPTED: 'interrupted',
  });

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
