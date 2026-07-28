/**
 * RO:WHAT — Pure review and orchestration helpers for the completed-onboarding startup Passport unlock gate.
 * RO:WHY — The normal CrabLink shell must remain closed after restart until native status confirms an operationally unlocked local Passport.
 * RO:INTERACTS — StartupPassportUnlockGate.jsx and the fixed Passport adapter status/unlock commands.
 * RO:INVARIANTS — no PIN argument, no secret material, no recovery-root unseal, no wallet/ledger mutation, and no shell acceptance before confirmed native status.
 * RO:TEST — startupPassportUnlockGate.test.mjs.
 */

export const STARTUP_PASSPORT_GATE_STATES =
  Object.freeze({
    CHECKING: 'checking',
    UNLOCK_REQUIRED:
      'unlock_required',
    UNLOCKED: 'unlocked',
    BLOCKED: 'blocked',
  });

export const STARTUP_PASSPORT_GATE_CODES =
  Object.freeze({
    CHECKING: 'checking',
    UNLOCK_REQUIRED:
      'unlock_required',
    UNLOCKED: 'unlocked',
    NO_PASSPORT: 'no_passport',
    CANCELLED: 'cancelled',
    UNLOCK_REJECTED:
      'unlock_rejected',
    UNAVAILABLE: 'unavailable',
    UNSAFE_STATUS_DTO:
      'unsafe_status_dto',
    UNSAFE_UNLOCK_DTO:
      'unsafe_unlock_dto',
    UNLOCK_NOT_CONFIRMED:
      'unlock_not_confirmed',
  });

export function reviewStartupPassportStatus(
  dto,
) {
  if (
    !isRecord(dto) ||
    dto.redacted !== true ||
    dto.walletOrLedgerMutated !== false
  ) {
    return blockedStatusReview({
      code:
        STARTUP_PASSPORT_GATE_CODES
          .UNSAFE_STATUS_DTO,

      message:
        'CrabLink rejected an unsafe or malformed native Passport status.',
    });
  }

  switch (dto.state) {
    case 'operational_unlocked':
      return freezeStatusReview({
        gateState:
          STARTUP_PASSPORT_GATE_STATES
            .UNLOCKED,

        code:
          STARTUP_PASSPORT_GATE_CODES
            .UNLOCKED,

        message:
          'The local Passport is operationally unlocked.',
      });

    case 'locked':
    case 'stored_locked':
      return freezeStatusReview({
        gateState:
          STARTUP_PASSPORT_GATE_STATES
            .UNLOCK_REQUIRED,

        code:
          STARTUP_PASSPORT_GATE_CODES
            .UNLOCK_REQUIRED,

        message:
          'The local Passport is locked and requires native PIN confirmation.',
      });

    case 'no_passport':
      return blockedStatusReview({
        code:
          STARTUP_PASSPORT_GATE_CODES
            .NO_PASSPORT,

        message:
          'Completed onboarding has no stored native Passport.',
      });

    default:
      return blockedStatusReview({
        code:
          STARTUP_PASSPORT_GATE_CODES
            .UNAVAILABLE,

        message:
          'Native Passport status is currently unavailable.',
      });
  }
}

export function reviewStartupPassportUnlockResult(
  dto,
) {
  if (
    !isRecord(dto) ||
    dto.redacted !== true ||
    dto.pinReceivedFromWebview !== false ||
    dto.secretMaterialReturned !== false ||
    dto.recoveryRootUnsealed !== false ||
    dto.walletOrLedgerMutated !== false
  ) {
    return freezeUnlockReview({
      accepted: false,

      code:
        STARTUP_PASSPORT_GATE_CODES
          .UNSAFE_UNLOCK_DTO,

      message:
        'CrabLink rejected an unsafe or malformed native unlock result.',
    });
  }

  switch (dto.state) {
    case 'operational_unlocked':
    case 'already_unlocked':
      return freezeUnlockReview({
        accepted: true,

        code:
          STARTUP_PASSPORT_GATE_CODES
            .UNLOCKED,

        message:
          'Native operational unlock completed.',
      });

    case 'cancelled':
      return freezeUnlockReview({
        accepted: false,

        code:
          STARTUP_PASSPORT_GATE_CODES
            .CANCELLED,

        message:
          'Passport unlock was cancelled. The CrabLink shell remains closed.',
      });

    case 'unlock_rejected':
      return freezeUnlockReview({
        accepted: false,

        code:
          STARTUP_PASSPORT_GATE_CODES
            .UNLOCK_REJECTED,

        message:
          'Passport unlock was rejected. Check the PIN and try again.',
      });

    case 'no_passport':
      return freezeUnlockReview({
        accepted: false,

        code:
          STARTUP_PASSPORT_GATE_CODES
            .NO_PASSPORT,

        message:
          'No stored native Passport is available to unlock.',
      });

    default:
      return freezeUnlockReview({
        accepted: false,

        code:
          STARTUP_PASSPORT_GATE_CODES
            .UNAVAILABLE,

        message:
          'The native Passport unlock surface is unavailable.',
      });
  }
}

export async function runStartupPassportUnlockAttempt({
  readStatus,
  unlockOperational,
}) {
  requireFunction(
    readStatus,
    'readStatus',
  );

  requireFunction(
    unlockOperational,
    'unlockOperational',
  );

  const initialStatus =
    reviewStartupPassportStatus(
      await readStatus(),
    );

  if (
    initialStatus.gateState ===
      STARTUP_PASSPORT_GATE_STATES
        .UNLOCKED ||
    initialStatus.gateState ===
      STARTUP_PASSPORT_GATE_STATES
        .BLOCKED
  ) {
    return initialStatus;
  }

  const unlockReview =
    reviewStartupPassportUnlockResult(
      await unlockOperational(),
    );

  if (!unlockReview.accepted) {
    return blockedStatusReview({
      code: unlockReview.code,
      message: unlockReview.message,
    });
  }

  const confirmedStatus =
    reviewStartupPassportStatus(
      await readStatus(),
    );

  if (
    confirmedStatus.gateState ===
    STARTUP_PASSPORT_GATE_STATES
      .UNLOCKED
  ) {
    return confirmedStatus;
  }

  return blockedStatusReview({
    code:
      STARTUP_PASSPORT_GATE_CODES
        .UNLOCK_NOT_CONFIRMED,

    message:
      'Native unlock returned, but operationally unlocked status was not confirmed.',
  });
}

export function createStartupPassportGateFailure(
  code =
    STARTUP_PASSPORT_GATE_CODES
      .UNAVAILABLE,
) {
  return blockedStatusReview({
    code,

    message:
      'CrabLink could not confirm the native Passport unlock state. The shell remains closed.',
  });
}

function blockedStatusReview({
  code,
  message,
}) {
  return freezeStatusReview({
    gateState:
      STARTUP_PASSPORT_GATE_STATES
        .BLOCKED,

    code,
    message,
  });
}

function freezeStatusReview({
  gateState,
  code,
  message,
}) {
  return Object.freeze({
    gateState,
    code,
    message,
  });
}

function freezeUnlockReview({
  accepted,
  code,
  message,
}) {
  return Object.freeze({
    accepted,
    code,
    message,
  });
}

function isRecord(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}

function requireFunction(
  value,
  label,
) {
  if (typeof value !== 'function') {
    throw new TypeError(
      `${label} must be a function.`,
    );
  }
}
