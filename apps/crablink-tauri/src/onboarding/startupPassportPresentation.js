/**
 * RO:WHAT — Consumer presentation projection for the completed-onboarding startup Passport lock gate.
 * RO:WHY — FINAL_BETA Phase 4; startup security must remain strict without exposing internal state-machine labels in normal mode.
 * RO:INTERACTS — StartupPassportUnlockGate.jsx and startupPassportUnlockGate.js.
 * RO:INVARIANTS — presentation only; native status, unlock, reread, reset, and fail-closed decisions remain owned by the existing gate model.
 * RO:METRICS — none.
 * RO:CONFIG — gateState and redacted result code.
 * RO:SECURITY — projects only consumer labels; no PIN, recovery material, Passport identifiers, native invocation, wallet, or ledger authority.
 * RO:TEST — startupPassportPresentation.test.mjs.
 */

export const FINAL_BETA_PHASE4A4_STARTUP_LOCK_PRESENTATION =
  'FINAL_BETA_PHASE4A4_STARTUP_LOCK_PRESENTATION_V1';

export function projectStartupPassportPresentation(review = {}) {
  const gateState = String(review.gateState || '').trim();
  const code = String(review.code || '').trim();

  if (gateState === 'checking') {
    return freezePresentation({
      title: 'Checking Passport security',
      lead:
        'CrabLink is checking your locally stored Passport. A native PIN prompt opens only when the Passport is locked.',
      accessLabel: 'Checking',
      passportLabel: 'Checking local protection',
      action: 'none',
      actionLabel: '',
    });
  }

  if (gateState === 'unlocked') {
    return freezePresentation({
      title: 'Passport unlocked',
      lead:
        'Your local Passport is ready and CrabLink can open.',
      accessLabel: 'Ready',
      passportLabel: 'Unlocked',
      action: 'none',
      actionLabel: '',
    });
  }

  if (
    code === 'no_passport' ||
    code === 'passport_absence_reset_failed'
  ) {
    return freezePresentation({
      title: 'Local Passport not found',
      lead:
        'CrabLink cannot open the completed account because its local Passport is no longer available on this device.',
      accessLabel: 'Setup required',
      passportLabel: 'Not found',
      action: 'reset',
      actionLabel: 'Return to Passport setup',
    });
  }

  if (code === 'cancelled') {
    return freezePresentation({
      title: 'Passport remains locked',
      lead:
        'The native unlock was cancelled. CrabLink remains closed until the local Passport is unlocked.',
      accessLabel: 'Locked',
      passportLabel: 'Unlock cancelled',
      action: 'retry',
      actionLabel: 'Try Passport unlock again',
    });
  }

  if (code === 'unlock_rejected') {
    return freezePresentation({
      title: 'Passport remains locked',
      lead:
        'The native unlock was not accepted. Check the PIN in the native prompt and try again.',
      accessLabel: 'Locked',
      passportLabel: 'Unlock not accepted',
      action: 'retry',
      actionLabel: 'Try Passport unlock again',
    });
  }

  return freezePresentation({
    title: 'Passport could not be unlocked',
    lead:
      'CrabLink could not confirm a safe native Passport unlock. The application remains closed.',
    accessLabel: 'Locked',
    passportLabel: 'Unlock unavailable',
    action: 'retry',
    actionLabel: 'Try Passport unlock again',
  });
}

function freezePresentation({
  title,
  lead,
  accessLabel,
  passportLabel,
  action,
  actionLabel,
}) {
  return Object.freeze({
    title,
    lead,
    accessLabel,
    passportLabel,
    action,
    actionLabel,
  });
}
