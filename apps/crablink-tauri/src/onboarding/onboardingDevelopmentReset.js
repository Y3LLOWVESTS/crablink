/**
 * RO:WHAT — Development-only destructive reset for a disposable desktop onboarding acceptance Passport.
 * RO:WHY — Phase 11B requires one genuinely clean Native Passport, settings, profile-cache, and onboarding state before the manual walkthrough.
 * RO:INTERACTS — Native Passport adapter, onboarding storage/profile draft, public-profile cache, local catalog, receipts, settings context, and browser route state.
 * RO:INVARIANTS — native clear must succeed and status must become no_passport before display/onboarding state is reset.
 * RO:METRICS — none.
 * RO:CONFIG — caller must explicitly enable this only in a development build.
 * RO:SECURITY — permanently deletes the local encrypted Passport vault; never reads or returns PIN, recovery words, roots, keys, VMKs, capabilities, wallet, or ledger material.
 * RO:TEST — onboardingDevelopmentReset.test.mjs.
 */

import {
  clearNativePassport,
  readNativePassportStatus,
} from '../adapters/passportAdapter.js';

import {
  resetOnboardingState,
} from './onboardingStorage.js';

import {
  clearOnboardingProfileDraft,
} from './onboardingProfileDraft.js';

import {
  clearPublicProfileCache,
} from '../shared/profile/publicProfileCache.js';

import {
  clearLocalCatalogCache,
} from '../shared/catalog/localCatalog.js';

import {
  clearRecentReceiptCache,
} from '../shared/receipts/recentReceipts.js';

export const ONBOARDING_DEVELOPMENT_RESET_ROUTE =
  'crab://home';

const ACCEPTED_CLEAR_STATES =
  new Set([
    'cleared',
    'no_passport',
  ]);

export async function resetDisposableOnboardingDevelopmentState({
  enabled = false,

  resetSettingsToDefaults,

  clearNativePassportCommand =
    clearNativePassport,

  readNativePassportStatusCommand =
    readNativePassportStatus,

  resetOnboardingStateCommand =
    resetOnboardingState,

  clearOnboardingProfileDraftCommand =
    clearOnboardingProfileDraft,

  clearPublicProfileCacheCommand =
    clearPublicProfileCache,

  clearLocalCatalogCacheCommand =
    clearLocalCatalogCache,

  clearRecentReceiptCacheCommand =
    clearRecentReceiptCache,

  writeHomeRouteCommand =
    writeOnboardingDevelopmentResetRoute,
} = {}) {
  if (enabled !== true) {
    throw new Error(
      'Disposable onboarding reset is unavailable outside an explicit development build.',
    );
  }

  requireFunction(
    resetSettingsToDefaults,
    'settings reset',
  );

  requireFunction(
    clearNativePassportCommand,
    'Native Passport clear',
  );

  requireFunction(
    readNativePassportStatusCommand,
    'Native Passport status',
  );

  requireFunction(
    resetOnboardingStateCommand,
    'onboarding reset',
  );

  requireFunction(
    clearOnboardingProfileDraftCommand,
    'profile-draft clear',
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
    'recent-receipt clear',
  );

  requireFunction(
    writeHomeRouteCommand,
    'home-route reset',
  );

  const clearResult =
    await clearNativePassportCommand();

  const clearState =
    normalizeState(
      clearResult?.state,
    );

  if (
    !ACCEPTED_CLEAR_STATES.has(
      clearState,
    )
  ) {
    throw new Error(
      `Native Passport clear did not complete safely: ${clearState || 'unknown'}.`,
    );
  }

  const nativeStatus =
    await readNativePassportStatusCommand();

  const nativeState =
    normalizeState(
      nativeStatus?.state,
    );

  if (nativeState !== 'no_passport') {
    throw new Error(
      `Native Passport remains present after clear: ${nativeState || 'unknown'}.`,
    );
  }

  const settingsResult =
    await resetSettingsToDefaults();

  clearPublicProfileCacheCommand();
  clearLocalCatalogCacheCommand();
  clearRecentReceiptCacheCommand();

  const profileDraftResult =
    await clearOnboardingProfileDraftCommand();

  const onboardingState =
    await resetOnboardingStateCommand();

  const routeResult =
    writeHomeRouteCommand();

  return Object.freeze({
    ok: true,
    clearState,
    nativeState,
    settingsReset: true,
    publicProfileCacheCleared: true,
    localCatalogCleared: true,
    recentReceiptsCleared: true,
    profileDraftCleared:
      profileDraftResult?.cleared ===
        true,
    onboardingState:
      onboardingState?.state || '',
    route:
      routeResult?.route ||
      ONBOARDING_DEVELOPMENT_RESET_ROUTE,
    settingsResult,
    reloadRequired: true,
  });
}

export function writeOnboardingDevelopmentResetRoute({
  location = globalThis.location,
  history = globalThis.history,
} = {}) {
  if (
    !location ||
    typeof location.href !== 'string'
  ) {
    throw new TypeError(
      'Browser location is required for onboarding development reset.',
    );
  }

  if (
    !history ||
    typeof history.replaceState !==
      'function'
  ) {
    throw new TypeError(
      'Browser history is required for onboarding development reset.',
    );
  }

  const nextUrl =
    new URL(location.href);

  nextUrl.search = '';

  nextUrl.hash =
    new URLSearchParams({
      url:
        ONBOARDING_DEVELOPMENT_RESET_ROUTE,
    }).toString();

  history.replaceState(
    {
      crablinkRoute:
        ONBOARDING_DEVELOPMENT_RESET_ROUTE,

      onboardingDevelopmentReset:
        true,
    },
    '',
    nextUrl,
  );

  return Object.freeze({
    route:
      ONBOARDING_DEVELOPMENT_RESET_ROUTE,

    url: nextUrl.toString(),
  });
}

function normalizeState(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function requireFunction(
  value,
  label,
) {
  if (typeof value !== 'function') {
    throw new TypeError(
      `Onboarding development reset requires ${label}.`,
    );
  }
}
