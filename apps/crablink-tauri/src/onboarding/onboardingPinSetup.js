/**
 * RO:WHAT — Redacted onboarding reviewer for native-only PIN setup confirmation.
 * RO:WHY — Phase 7A lets onboarding advance after the platform-native operational PIN prompt succeeds.
 * RO:INTERACTS — passportAdapter.unlockNativePassportOperational and onboardingModel.recordPinSetupComplete.
 * RO:INVARIANTS — no PIN, password, VMK, recovery root, private key, wallet, or ledger material can enter React state or storage.
 * RO:SECURITY — WebView receives only redacted command truth; unsafe success claims fail closed.
 * RO:TEST — onboardingPinSetup.test.mjs.
 */

import {
  PASSPORT_COMMANDS,
  unlockNativePassportOperational,
} from '../adapters/passportAdapter.js';

export const ONBOARDING_PHASE7A_NATIVE_PIN_SETUP_FOUNDATION =
  'ONBOARDING_PHASE7A_NATIVE_PIN_SETUP_FOUNDATION';

export const PIN_SETUP_REVIEW_STATES =
  Object.freeze({
    COMPLETE: 'complete',
    ALREADY_COMPLETE: 'already_complete',
    CANCELLED: 'cancelled',
    REJECTED: 'rejected',
    NO_PASSPORT: 'no_passport',
    UNAVAILABLE: 'unavailable',
  });

export async function beginNativeOnboardingPinSetup({
  unlockOperational =
    unlockNativePassportOperational,
} = {}) {
  if (
    typeof unlockOperational !== 'function'
  ) {
    throw new TypeError(
      'Native onboarding PIN setup requires a fixed unlock function.',
    );
  }

  const command = await unlockOperational();

  return reviewNativeOnboardingPinSetupCommand(
    command,
  );
}

export function reviewNativeOnboardingPinSetupCommand(
  command,
) {
  const value =
    command && typeof command === 'object'
      ? command
      : {};

  const commandName =
    typeof value.commandName === 'string'
      ? value.commandName
      : '';

  const commandState =
    typeof value.state === 'string'
      ? value.state
      : 'unavailable';

  const safeSecretBoundary =
    value.redacted !== false &&
    value.pinReceivedFromWebview === false &&
    value.secretMaterialReturned === false &&
    value.recoveryRootUnsealed === false &&
    value.walletOrLedgerMutated === false;

  const nativePromptSucceeded =
    commandState ===
      'operational_unlocked' &&
    value.nativeSecureInputRequested === true &&
    safeSecretBoundary;

  const alreadyUnlocked =
    commandState === 'already_unlocked' &&
    value.nativeSecureInputRequested === false &&
    safeSecretBoundary;

  const allowedCommand =
    commandName ===
    PASSPORT_COMMANDS.unlockOperational;

  if (
    allowedCommand &&
    nativePromptSucceeded
  ) {
    return freezeReview({
      state: PIN_SETUP_REVIEW_STATES.COMPLETE,
      pinSetupComplete: true,
      nativeSecureInputRequested: true,
      redacted: true,
      pinReceivedFromWebview: false,
      secretMaterialReturned: false,
      recoveryRootUnsealed: false,
      walletOrLedgerMutated: false,
    });
  }

  if (allowedCommand && alreadyUnlocked) {
    return freezeReview({
      state:
        PIN_SETUP_REVIEW_STATES
          .ALREADY_COMPLETE,
      pinSetupComplete: true,
      nativeSecureInputRequested: false,
      redacted: true,
      pinReceivedFromWebview: false,
      secretMaterialReturned: false,
      recoveryRootUnsealed: false,
      walletOrLedgerMutated: false,
    });
  }

  return freezeReview({
    state: mapRejectedState(commandState),
    pinSetupComplete: false,
    nativeSecureInputRequested:
      value.nativeSecureInputRequested === true,
    redacted: true,
    pinReceivedFromWebview: false,
    secretMaterialReturned: false,
    recoveryRootUnsealed: false,
    walletOrLedgerMutated: false,
  });
}

function mapRejectedState(state) {
  switch (state) {
    case 'cancelled':
      return PIN_SETUP_REVIEW_STATES.CANCELLED;
    case 'unlock_rejected':
      return PIN_SETUP_REVIEW_STATES.REJECTED;
    case 'no_passport':
      return PIN_SETUP_REVIEW_STATES.NO_PASSPORT;
    default:
      return PIN_SETUP_REVIEW_STATES.UNAVAILABLE;
  }
}

function freezeReview(value) {
  return Object.freeze({
    sourcePhaseLabel:
      ONBOARDING_PHASE7A_NATIVE_PIN_SETUP_FOUNDATION,
    ...value,
  });
}
