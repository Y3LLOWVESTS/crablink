/**
 * RO:WHAT — Pure Phase 9 helpers that project completed onboarding into honest local shell settings and the crab://home browser route.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; completed onboarding must enter the normal shell without inheriting development identities or claiming backend confirmation.
 * RO:INTERACTS — onboardingModel.js, OnboardingCompletionStep.jsx, app/settings.js, appState.js, HomePage.jsx, and PassportChip.jsx.
 * RO:INVARIANTS — username remains local_draft; known dev identity labels are removed from handoff; home route only; no backend, wallet, ledger, capability, or secret authority.
 * RO:METRICS — none.
 * RO:CONFIG — home route is crab://home.
 * RO:SECURITY — projection contains public display fields only and never claims ownership, publication, entitlement, balance, or finality.
 * RO:TEST — onboardingHomeHandoff.test.mjs.
 */

import {
  ONBOARDING_STATES,
  assertSafeOnboardingState,
  canCompleteOnboarding,
} from './onboardingModel.js';

export const ONBOARDING_HOME_ROUTE =
  'crab://home';

export const ONBOARDING_LOCAL_USERNAME_STATUS =
  'local_draft';

const COMPLETABLE_STATES =
  new Set([
    ONBOARDING_STATES.PROFILE_SAVED,
    ONBOARDING_STATES.PROFILE_SKIPPED,
  ]);

const KNOWN_DEV_PASSPORT_LABELS =
  new Set([
    'passport:main:dev',
    'passport:main:visitor',
    'passport:main:visitor-b',
    'passport a',
    'passport b',
  ]);

const KNOWN_DEV_WALLET_LABELS =
  new Set([
    'acct_dev',
  ]);

export function buildOnboardingHomeSettingsProjection({
  onboardingState,
  currentSettings = {},
} = {}) {
  assertSafeOnboardingState(
    onboardingState,
  );

  if (
    !COMPLETABLE_STATES.has(
      onboardingState.state,
    )
  ) {
    throw new TypeError(
      'Profile save or skip state is required before home handoff.',
    );
  }

  if (
    !canCompleteOnboarding(
      onboardingState,
    )
  ) {
    throw new TypeError(
      'Onboarding is not eligible for home handoff.',
    );
  }

  const username =
    String(
      onboardingState.username || '',
    )
      .replace(/^@+/, '')
      .trim()
      .toLowerCase();

  if (!username) {
    throw new TypeError(
      'Onboarding username is required for home handoff.',
    );
  }

  const requestedHandle =
    `@${username}`;

  return Object.freeze({
    requestedUsername: username,
    requestedHandle,
    username: '',
    handle: '',
    usernameStatus:
      ONBOARDING_LOCAL_USERNAME_STATUS,

    usernameUpdatedAt:
      onboardingState.updatedAt,

    profileCrabUrl: '',
    publicProfileCid: '',

    passportSubject:
      preserveNonDevLabel(
        currentSettings.passportSubject,
        KNOWN_DEV_PASSPORT_LABELS,
      ),

    walletAccount:
      preserveNonDevLabel(
        currentSettings.walletAccount,
        KNOWN_DEV_WALLET_LABELS,
      ),
  });
}

export function writeCrabLinkHomeRoute({
  location = globalThis.location,
  history = globalThis.history,
} = {}) {
  if (
    !location ||
    typeof location.href !== 'string'
  ) {
    throw new TypeError(
      'Browser location is required for the home handoff.',
    );
  }

  if (
    !history ||
    typeof history.replaceState !==
      'function'
  ) {
    throw new TypeError(
      'Browser history is required for the home handoff.',
    );
  }

  const nextUrl =
    new URL(location.href);

  const hashParams =
    readHashParams(
      nextUrl.hash,
    );

  hashParams.set(
    'url',
    ONBOARDING_HOME_ROUTE,
  );

  nextUrl.search = '';
  nextUrl.hash =
    hashParams.toString();

  const state = Object.freeze({
    crablinkRoute:
      ONBOARDING_HOME_ROUTE,

    crablinkRouteKind: 'home',
    onboardingHomeHandoff: true,
  });

  history.replaceState(
    state,
    '',
    nextUrl,
  );

  return Object.freeze({
    route: ONBOARDING_HOME_ROUTE,
    routeKind: 'home',
    url: nextUrl.toString(),
  });
}

function preserveNonDevLabel(
  value,
  forbiddenSet,
) {
  const clean =
    String(value || '').trim();

  if (!clean) {
    return '';
  }

  if (
    forbiddenSet.has(
      clean.toLowerCase(),
    )
  ) {
    return '';
  }

  return clean;
}

function readHashParams(
  hashValue,
) {
  const hash =
    String(hashValue || '')
      .replace(/^#/, '')
      .trim();

  if (!hash) {
    return new URLSearchParams();
  }

  if (
    hash.startsWith('crab://') ||
    hash.startsWith('b3:')
  ) {
    return new URLSearchParams({
      url: hash,
    });
  }

  return new URLSearchParams(
    hash.startsWith('?')
      ? hash.slice(1)
      : hash,
  );
}
