/**
 * RO:WHAT — Reconciles completed browser onboarding with a safely confirmed absent Native Passport.
 * RO:WHY — Clearing a Passport must not strand the application behind an unlock gate that can never succeed.
 * RO:INTERACTS — Native Passport status, app settings, onboarding/profile storage, local caches, route state, and StartupPassportUnlockGate.
 * RO:INVARIANTS — reset begins only after a redacted no_passport status; it never invokes Passport clear, PIN input, recovery, Keychain, wallet, ledger, or capability behavior.
 * RO:SECURITY — clears only local/redacted display and onboarding state after native custody is already absent.
 * RO:TEST — onboardingPassportAbsenceReset.test.mjs.
 */

import {
  readNativePassportStatus,
} from '../adapters/passportAdapter.js';

import {
  resetAppSettings,
} from '../app/settings.js';

import {
  clearLocalCatalogCache,
} from '../shared/catalog/localCatalog.js';

import {
  clearPublicProfileCache,
} from '../shared/profile/publicProfileCache.js';

import {
  clearRecentReceiptCache,
} from '../shared/receipts/recentReceipts.js';

import {
  clearOnboardingProfileDraft,
} from './onboardingProfileDraft.js';

import {
  resetOnboardingState,
} from './onboardingStorage.js';

import {
  STARTUP_PASSPORT_GATE_CODES,
  reviewStartupPassportStatus,
} from './startupPassportUnlockGate.js';

export const ONBOARDING_PASSPORT_ABSENCE_RESET_ROUTE =
  'crab://home';

export async function resetCompletedOnboardingAfterNativePassportAbsence({
  readNativePassportStatusCommand =
    readNativePassportStatus,

  resetSettingsCommand =
    resetAppSettings,

  clearPublicProfileCacheCommand =
    clearPublicProfileCache,

  clearLocalCatalogCacheCommand =
    clearLocalCatalogCache,

  clearRecentReceiptCacheCommand =
    clearRecentReceiptCache,

  clearOnboardingProfileDraftCommand =
    clearOnboardingProfileDraft,

  resetOnboardingStateCommand =
    resetOnboardingState,

  writeHomeRouteCommand =
    writeOnboardingPassportAbsenceResetRoute,
} = {}) {
  requireFunction(
    readNativePassportStatusCommand,
    'Native Passport status',
  );

  requireFunction(
    resetSettingsCommand,
    'settings reset',
  );

  requireFunction(
    clearPublicProfileCacheCommand,
    'public-profile cache clear',
  );

  requireFunction(
    clearLocalCatalogCacheCommand,
    'local-catalog clear',
  );

  requireFunction(
    clearRecentReceiptCacheCommand,
    'recent-receipt cache clear',
  );

  requireFunction(
    clearOnboardingProfileDraftCommand,
    'profile-draft clear',
  );

  requireFunction(
    resetOnboardingStateCommand,
    'onboarding reset',
  );

  requireFunction(
    writeHomeRouteCommand,
    'home-route reset',
  );

  const nativeStatusReview =
    reviewStartupPassportStatus(
      await readNativePassportStatusCommand(),
    );

  if (
    nativeStatusReview.code !==
    STARTUP_PASSPORT_GATE_CODES
      .NO_PASSPORT
  ) {
    throw new Error(
      'Completed onboarding reset requires a safely confirmed no_passport native state.',
    );
  }

  const settingsResult =
    await resetSettingsCommand();

  await clearPublicProfileCacheCommand();
  await clearLocalCatalogCacheCommand();
  await clearRecentReceiptCacheCommand();

  const profileDraftResult =
    await clearOnboardingProfileDraftCommand();

  const onboardingState =
    await resetOnboardingStateCommand();

  if (
    onboardingState?.state !==
    'welcome'
  ) {
    throw new Error(
      'Onboarding reset did not return the local state to welcome.',
    );
  }

  const routeResult =
    writeHomeRouteCommand();

  return Object.freeze({
    ok: true,

    nativeState: 'no_passport',

    settingsReset: true,

    publicProfileCacheCleared: true,

    localCatalogCleared: true,

    recentReceiptsCleared: true,

    profileDraftCleared:
      profileDraftResult?.cleared ===
        true,

    onboardingState:
      onboardingState.state,

    route:
      routeResult?.route ||
      ONBOARDING_PASSPORT_ABSENCE_RESET_ROUTE,

    settingsResult,

    reloadRequired: true,
  });
}

export function writeOnboardingPassportAbsenceResetRoute({
  location = globalThis.location,
  history = globalThis.history,
} = {}) {
  if (
    !location ||
    typeof location.href !== 'string'
  ) {
    throw new TypeError(
      'Browser location is required for Passport-absence onboarding reset.',
    );
  }

  if (
    !history ||
    typeof history.replaceState !==
      'function'
  ) {
    throw new TypeError(
      'Browser history is required for Passport-absence onboarding reset.',
    );
  }

  const nextUrl =
    new URL(location.href);

  nextUrl.search = '';

  nextUrl.hash =
    new URLSearchParams({
      url:
        ONBOARDING_PASSPORT_ABSENCE_RESET_ROUTE,
    }).toString();

  history.replaceState(
    {
      crablinkRoute:
        ONBOARDING_PASSPORT_ABSENCE_RESET_ROUTE,

      onboardingPassportAbsenceReset:
        true,
    },
    '',
    nextUrl,
  );

  return Object.freeze({
    route:
      ONBOARDING_PASSPORT_ABSENCE_RESET_ROUTE,

    url:
      nextUrl.toString(),
  });
}

function requireFunction(
  value,
  label,
) {
  if (typeof value !== 'function') {
    throw new TypeError(
      `Passport-absence onboarding reset requires ${label}.`,
    );
  }
}
