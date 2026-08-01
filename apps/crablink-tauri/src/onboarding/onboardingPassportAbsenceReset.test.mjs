/**
 * RO:WHAT — Focused tests for reconciling completed onboarding with an absent Native Passport.
 * RO:WHY — A successful clear must provide a bounded path back to Welcome rather than an impossible unlock retry.
 * RO:INVARIANTS — no mutation before confirmed no_passport; no native clear, PIN, recovery, Keychain, wallet, ledger, or capability behavior.
 */

import assert from 'node:assert/strict';

import {
  readFile,
} from 'node:fs/promises';

import test from 'node:test';

import {
  resetCompletedOnboardingAfterNativePassportAbsence,
  writeOnboardingPassportAbsenceResetRoute,
} from './onboardingPassportAbsenceReset.js';

const ROOT = new URL(
  '../../../..',
  import.meta.url,
);

const COMPONENT_SOURCE = new URL(
  'apps/crablink-tauri/src/onboarding/StartupPassportUnlockGate.jsx',
  ROOT,
);

const RESET_SOURCE = new URL(
  'apps/crablink-tauri/src/onboarding/onboardingPassportAbsenceReset.js',
  ROOT,
);

function statusDto({
  state = 'no_passport',
  redacted = true,
  walletOrLedgerMutated = false,
} = {}) {
  return Object.freeze({
    state,
    redacted,
    walletOrLedgerMutated,
  });
}

test(
  'phase11c3b_no_passport_resets_redacted_state_in_order',
  async () => {
    const calls = [];

    const result =
      await resetCompletedOnboardingAfterNativePassportAbsence({
        readNativePassportStatusCommand:
          async () => {
            calls.push('status');

            return statusDto();
          },

        resetSettingsCommand:
          async () => {
            calls.push('settings');

            return {
              settings: {},
            };
          },

        clearPublicProfileCacheCommand:
          async () => {
            calls.push(
              'public-profile',
            );
          },

        clearLocalCatalogCacheCommand:
          async () => {
            calls.push(
              'local-catalog',
            );
          },

        clearRecentReceiptCacheCommand:
          async () => {
            calls.push(
              'recent-receipts',
            );
          },

        clearOnboardingProfileDraftCommand:
          async () => {
            calls.push(
              'profile-draft',
            );

            return {
              cleared: true,
            };
          },

        resetOnboardingStateCommand:
          async () => {
            calls.push(
              'onboarding',
            );

            return {
              state: 'welcome',
            };
          },

        writeHomeRouteCommand:
          () => {
            calls.push('route');

            return {
              route: 'crab://home',
            };
          },
      });

    assert.deepEqual(
      calls,
      [
        'status',
        'settings',
        'public-profile',
        'local-catalog',
        'recent-receipts',
        'profile-draft',
        'onboarding',
        'route',
      ],
    );

    assert.equal(
      result.ok,
      true,
    );

    assert.equal(
      result.nativeState,
      'no_passport',
    );

    assert.equal(
      result.onboardingState,
      'welcome',
    );

    assert.equal(
      result.route,
      'crab://home',
    );

    assert.equal(
      result.reloadRequired,
      true,
    );
  },
);

test(
  'phase11c3b_locked_status_rejects_without_mutation',
  async () => {
    let mutations = 0;

    await assert.rejects(
      resetCompletedOnboardingAfterNativePassportAbsence({
        readNativePassportStatusCommand:
          async () =>
            statusDto({
              state: 'locked',
            }),

        resetSettingsCommand:
          async () => {
            mutations += 1;
          },

        clearPublicProfileCacheCommand:
          () => {
            mutations += 1;
          },

        clearLocalCatalogCacheCommand:
          () => {
            mutations += 1;
          },

        clearRecentReceiptCacheCommand:
          () => {
            mutations += 1;
          },

        clearOnboardingProfileDraftCommand:
          async () => {
            mutations += 1;
          },

        resetOnboardingStateCommand:
          async () => {
            mutations += 1;
          },

        writeHomeRouteCommand:
          () => {
            mutations += 1;
          },
      }),

      /safely confirmed no_passport/,
    );

    assert.equal(
      mutations,
      0,
    );
  },
);

test(
  'phase11c3b_unsafe_status_rejects_without_mutation',
  async () => {
    let mutations = 0;

    await assert.rejects(
      resetCompletedOnboardingAfterNativePassportAbsence({
        readNativePassportStatusCommand:
          async () =>
            statusDto({
              redacted: false,
            }),

        resetSettingsCommand:
          async () => {
            mutations += 1;
          },

        clearPublicProfileCacheCommand:
          () => {
            mutations += 1;
          },

        clearLocalCatalogCacheCommand:
          () => {
            mutations += 1;
          },

        clearRecentReceiptCacheCommand:
          () => {
            mutations += 1;
          },

        clearOnboardingProfileDraftCommand:
          async () => {
            mutations += 1;
          },

        resetOnboardingStateCommand:
          async () => {
            mutations += 1;
          },

        writeHomeRouteCommand:
          () => {
            mutations += 1;
          },
      }),

      /safely confirmed no_passport/,
    );

    assert.equal(
      mutations,
      0,
    );
  },
);

test(
  'phase11c3b_route_writer_targets_home_and_marks_reset',
  () => {
    const location = {
      href:
        'https://tauri.localhost/index.html?stale=1#url=crab%3A%2F%2Fold',
    };

    let replacement = null;

    const history = {
      replaceState(
        state,
        title,
        url,
      ) {
        replacement = {
          state,
          title,
          url:
            url.toString(),
        };
      },
    };

    const result =
      writeOnboardingPassportAbsenceResetRoute({
        location,
        history,
      });

    assert.equal(
      result.route,
      'crab://home',
    );

    assert.equal(
      replacement.state.crablinkRoute,
      'crab://home',
    );

    assert.equal(
      replacement.state
        .onboardingPassportAbsenceReset,
      true,
    );

    const nextUrl =
      new URL(result.url);

    assert.equal(
      nextUrl.search,
      '',
    );

    assert.equal(
      new URLSearchParams(
        nextUrl.hash.slice(1),
      ).get('url'),
      'crab://home',
    );
  },
);

test(
  'phase11c3b_component_offers_reset_without_native_clear',
  async () => {
    const [
      componentSource,
      resetSource,
    ] =
      await Promise.all([
        readFile(
          COMPONENT_SOURCE,
          'utf8',
        ),

        readFile(
          RESET_SOURCE,
          'utf8',
        ),
      ]);

    assert.match(
      componentSource,
      /resetCompletedOnboardingAfterNativePassportAbsence/,
    );

    assert.match(
      componentSource,
      /STARTUP_PASSPORT_GATE_CODES\s*\.NO_PASSPORT/,
    );

    assert.match(
      componentSource,
      /Reset completed onboarding and return to Welcome/,
    );

    assert.match(
      componentSource,
      /globalThis\.location\s*\?\.\s*reload/,
    );

    assert.doesNotMatch(
      resetSource,
      /clearNativePassport/,
    );

    assert.doesNotMatch(
      resetSource,
      /delete-generic-password/,
    );

    assert.doesNotMatch(
      resetSource,
      /\bsecurity\s+/,
    );

    assert.doesNotMatch(
      componentSource,
      /<input\b/i,
    );
  },
);
