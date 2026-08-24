/**
 * RO:WHAT — Reviews current or durably acknowledged desktop Native Passport recovery-ceremony truth consumed by onboarding.
 * RO:WHY — Onboarding must accept a real new native acknowledgement and also resume safely when native storage proves the ceremony was already acknowledged.
 * RO:INTERACTS — passportAdapter.js, RecoveryCeremonyStep.jsx, and the fixed Tauri recovery command.
 * RO:INVARIANTS — new acknowledgement requires a current native display; persisted acknowledgement requires the strict already_acknowledged redacted posture and never claims a repeat display.
 * RO:METRICS — none.
 * RO:CONFIG — none.
 * RO:SECURITY — returns flags and a bounded redacted fingerprint only; never recovery material, roots, keys, vault bytes, capabilities, wallet state, or ledger state.
 * RO:TEST — recoveryCeremony.test.mjs.
 */

export const ONBOARDING_RECOVERY_CEREMONY_SCHEMA =
  'crablink.onboarding-recovery-ceremony.v1';

export const ONBOARDING_RECOVERY_CEREMONY_STATUS =
  Object.freeze({
    ACKNOWLEDGED: 'acknowledged',
    FAILURE: 'failure',
  });

export const ONBOARDING_RECOVERY_CEREMONY_CODES =
  Object.freeze({
    ACKNOWLEDGED: 'acknowledged',
    ALREADY_ACKNOWLEDGED:
      'already_acknowledged',
    CANCELLED: 'cancelled',
    REJECTED: 'rejected',
    NO_PASSPORT: 'no_passport',
    UNAVAILABLE: 'unavailable',
    INVALID_RESPONSE: 'invalid_response',
    COMMAND_FAILED: 'command_failed',
  });

export function reviewOnboardingRecoveryCeremonyDto(
  dto,
) {
  const value =
    dto &&
    typeof dto === 'object' &&
    !Array.isArray(dto)
      ? dto
      : {};

  const state =
    normalizedState(value.state);

  const safe =
    value.redacted !== false &&
    value.wordsReturnedToWebview !== true &&
    value.secretMaterialReturned !== true &&
    value.recoveryRootExported !== true &&
    value.walletOrLedgerMutated !== true;

  const persistedAcknowledgement =
    state ===
      ONBOARDING_RECOVERY_CEREMONY_CODES
        .ALREADY_ACKNOWLEDGED &&
    value.shown === false &&
    value.acknowledged === true &&
    value.redacted === true &&
    value.recoveryFingerprint ===
      'REDACTED' &&
    value.nativeSecureSurfaceRequested ===
      false &&
    value.wordsReturnedToWebview ===
      false &&
    value.secretMaterialReturned ===
      false &&
    value.recoveryRootExported ===
      false &&
    value.walletOrLedgerMutated ===
      false;

  if (persistedAcknowledgement) {
    return freezeOutcome({
      status:
        ONBOARDING_RECOVERY_CEREMONY_STATUS
          .ACKNOWLEDGED,
      code:
        ONBOARDING_RECOVERY_CEREMONY_CODES
          .ALREADY_ACKNOWLEDGED,
      message:
        'The native recovery acknowledgement was already stored for this Passport.',
      retryable: false,
      shown: false,
      acknowledged: true,
      nativeSecureSurfaceRequested: false,
      fingerprint: 'REDACTED',
    });
  }

  if (
    state ===
      ONBOARDING_RECOVERY_CEREMONY_CODES
        .ACKNOWLEDGED &&
    value.shown === true &&
    value.acknowledged === true &&
    value.nativeSecureSurfaceRequested ===
      true &&
    safe
  ) {
    return freezeOutcome({
      status:
        ONBOARDING_RECOVERY_CEREMONY_STATUS
          .ACKNOWLEDGED,
      code:
        ONBOARDING_RECOVERY_CEREMONY_CODES
          .ACKNOWLEDGED,
      message:
        'The native recovery ceremony was shown and acknowledged.',
      retryable: false,
      shown: true,
      acknowledged: true,
      nativeSecureSurfaceRequested: true,
      fingerprint:
        safeFingerprint(
          value.recoveryFingerprint,
        ),
    });
  }

  const failureCode =
    failureCodeForState(state);

  return freezeOutcome({
    status:
      ONBOARDING_RECOVERY_CEREMONY_STATUS
        .FAILURE,
    code: safe
      ? failureCode
      : ONBOARDING_RECOVERY_CEREMONY_CODES
          .INVALID_RESPONSE,
    message: failureMessage(
      safe
        ? failureCode
        : ONBOARDING_RECOVERY_CEREMONY_CODES
            .INVALID_RESPONSE,
    ),
    retryable:
      failureCode !==
        ONBOARDING_RECOVERY_CEREMONY_CODES
          .NO_PASSPORT,
    shown: false,
    acknowledged: false,
    nativeSecureSurfaceRequested:
      value.nativeSecureSurfaceRequested ===
      true,
    fingerprint: 'ABSENT',
  });
}

export function reviewOnboardingRecoveryCeremonyError(
  _error,
) {
  return freezeOutcome({
    status:
      ONBOARDING_RECOVERY_CEREMONY_STATUS
        .FAILURE,
    code:
      ONBOARDING_RECOVERY_CEREMONY_CODES
        .COMMAND_FAILED,
    message:
      'The native recovery ceremony could not be completed.',
    retryable: true,
    shown: false,
    acknowledged: false,
    nativeSecureSurfaceRequested: false,
    fingerprint: 'ABSENT',
  });
}

function freezeOutcome({
  status,
  code,
  message,
  retryable,
  shown,
  acknowledged,
  nativeSecureSurfaceRequested,
  fingerprint,
}) {
  return Object.freeze({
    schema:
      ONBOARDING_RECOVERY_CEREMONY_SCHEMA,
    status,
    code,
    message,
    retryable,
    shown,
    acknowledged,
    redacted: true,
    recoveryFingerprint: fingerprint,
    nativeSecureSurfaceRequested,
    wordsReturnedToWebview: false,
    secretMaterialReturned: false,
    recoveryRootExported: false,
    walletOrLedgerMutated: false,
  });
}

function failureCodeForState(state) {
  switch (state) {
    case ONBOARDING_RECOVERY_CEREMONY_CODES
      .CANCELLED:
    case ONBOARDING_RECOVERY_CEREMONY_CODES
      .REJECTED:
    case ONBOARDING_RECOVERY_CEREMONY_CODES
      .NO_PASSPORT:
    case ONBOARDING_RECOVERY_CEREMONY_CODES
      .UNAVAILABLE:
      return state;

    default:
      return ONBOARDING_RECOVERY_CEREMONY_CODES
        .INVALID_RESPONSE;
  }
}

function failureMessage(code) {
  switch (code) {
    case ONBOARDING_RECOVERY_CEREMONY_CODES
      .CANCELLED:
      return 'The native recovery ceremony was cancelled.';

    case ONBOARDING_RECOVERY_CEREMONY_CODES
      .REJECTED:
      return 'The native recovery authentication or acknowledgement was rejected.';

    case ONBOARDING_RECOVERY_CEREMONY_CODES
      .NO_PASSPORT:
      return 'A local Native Passport must exist before recovery setup.';

    case ONBOARDING_RECOVERY_CEREMONY_CODES
      .UNAVAILABLE:
      return 'Real recoverable Passport material and the native display surface are not available yet. Onboarding remains blocked rather than showing fake recovery data.';

    case ONBOARDING_RECOVERY_CEREMONY_CODES
      .INVALID_RESPONSE:
      return 'The native recovery command returned an unsafe or incomplete result.';

    default:
      return 'The native recovery ceremony could not be completed.';
  }
}

function safeFingerprint(value) {
  if (
    typeof value !== 'string' ||
    !/^[a-f0-9]{8,64}$/i.test(
      value.trim(),
    )
  ) {
    return 'ABSENT';
  }

  return 'REDACTED';
}

function normalizedState(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .trim()
    .toLowerCase();
}
