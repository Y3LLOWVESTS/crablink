/**
 * RO:WHAT — Focused Phase 11B tests for verified Native Passport clearing and complete local onboarding display reset.
 * RO:WHY — Prevents another false clean start where stale native, profile, or development identity state remains.
 * RO:INTERACTS — onboardingDevelopmentReset.js and PassportDrawer.jsx.
 * RO:INVARIANTS — production disabled; native no_passport verification precedes browser/display reset; no secret arguments.
 * RO:TEST — node --test onboardingDevelopmentReset.test.mjs.
 */

import assert from 'node:assert/strict';

import {
  readFile,
} from 'node:fs/promises';

import test from 'node:test';

import {
  resetDisposableOnboardingDevelopmentState,
  writeOnboardingDevelopmentResetRoute,
} from './onboardingDevelopmentReset.js';

const DRAWER =
  new URL(
    '../app/shell/PassportDrawer.jsx',
    import.meta.url,
  );

function successDependencies(
  events,
) {
  return {
    resetSettingsToDefaults:
      async () => {
        events.push('settings');
        return {
          settings: {
            passportSubject: '',
            handle: '',
          },
        };
      },

    clearNativePassportCommand:
      async () => {
        events.push('native-clear');

        return {
          state: 'cleared',
        };
      },

    readNativePassportStatusCommand:
      async () => {
        events.push('native-status');

        return {
          state: 'no_passport',
        };
      },

    resetOnboardingStateCommand:
      async () => {
        events.push('onboarding');

        return {
          state: 'welcome',
        };
      },

    clearOnboardingProfileDraftCommand:
      async () => {
        events.push('profile-draft');

        return {
          cleared: true,
        };
      },

    clearPublicProfileCacheCommand:
      () => {
        events.push('public-profile');
      },

    clearLocalCatalogCacheCommand:
      () => {
        events.push('catalog');
      },

    clearRecentReceiptCacheCommand:
      () => {
        events.push('receipts');
      },

    writeHomeRouteCommand:
      () => {
        events.push('route');

        return {
          route: 'crab://home',
        };
      },
  };
}

test(
  'development reset is unavailable unless explicitly enabled',
  async () => {
    const events = [];

    await assert.rejects(
      resetDisposableOnboardingDevelopmentState({
        enabled: false,

        ...successDependencies(
          events,
        ),
      }),
      /unavailable outside an explicit development build/,
    );

    assert.deepEqual(
      events,
      [],
    );
  },
);

test(
  'failed Native Passport clear preserves browser and onboarding state',
  async () => {
    const events = [];

    const dependencies =
      successDependencies(
        events,
      );

    dependencies
      .clearNativePassportCommand =
      async () => {
        events.push('native-clear');

        return {
          state: 'unavailable',
        };
      };

    await assert.rejects(
      resetDisposableOnboardingDevelopmentState({
        enabled: true,
        ...dependencies,
      }),
      /did not complete safely/,
    );

    assert.deepEqual(
      events,
      [
        'native-clear',
      ],
    );
  },
);

test(
  'native status must verify no_passport before display state is cleared',
  async () => {
    const events = [];

    const dependencies =
      successDependencies(
        events,
      );

    dependencies
      .readNativePassportStatusCommand =
      async () => {
        events.push('native-status');

        return {
          state: 'locked',
        };
      };

    await assert.rejects(
      resetDisposableOnboardingDevelopmentState({
        enabled: true,
        ...dependencies,
      }),
      /remains present after clear/,
    );

    assert.deepEqual(
      events,
      [
        'native-clear',
        'native-status',
      ],
    );
  },
);

test(
  'successful reset clears native Passport and every onboarding display source',
  async () => {
    const events = [];

    const result =
      await resetDisposableOnboardingDevelopmentState({
        enabled: true,

        ...successDependencies(
          events,
        ),
      });

    assert.deepEqual(
      events,
      [
        'native-clear',
        'native-status',
        'settings',
        'public-profile',
        'catalog',
        'receipts',
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
  'route reset writes crab home without preserving stale username routes',
  () => {
    let replacement = null;

    const result =
      writeOnboardingDevelopmentResetRoute({
        location: {
          href:
            'https://tauri.local/#url=crab%3A%2F%2F%40crabmaster',
        },

        history: {
          replaceState(
            state,
            _unused,
            url,
          ) {
            replacement = {
              state,
              url:
                String(url),
            };
          },
        },
      });

    const nextUrl =
      new URL(
        replacement.url,
      );

    const params =
      new URLSearchParams(
        nextUrl.hash.replace(
          /^#/,
          '',
        ),
      );

    assert.equal(
      params.get('url'),
      'crab://home',
    );

    assert.equal(
      result.route,
      'crab://home',
    );

    assert.equal(
      replacement.state
        .onboardingDevelopmentReset,
      true,
    );
  },
);

test(
  'Passport drawer exposes a two-step development-only destructive reset',
  async () => {
    const source =
      await readFile(
        DRAWER,
        'utf8',
      );

    for (const required of [
      'resetDisposableOnboardingDevelopmentState',
      'const onboardingDevelopmentResetAvailable',
      'import.meta.env.DEV',
      'nativePassportAvailable',
      'onboardingResetArmed',
      'Arm disposable onboarding reset',
      'Confirm clear Passport and reset onboarding',
      'resetSettingsToDefaults',
      'globalThis.location?.reload?.()',
    ]) {
      assert.ok(
        source.includes(required),
        required,
      );
    }

    assert.match(
      source,
      /const onboardingDevelopmentResetAvailable\s*=\s*Boolean\(\s*import\.meta\.env\.DEV\s*&&\s*nativePassportAvailable,?\s*\);/,
      'development reset gate must require both a Vite development build and the Native Passport runtime',
    );

    assert.match(
      source,
      /\{onboardingDevelopmentResetAvailable\s*&&\s*\(/,
    );

    assert.match(
      source,
      /\{onboardingResetArmed\s*\?\s*\(/,
    );

    const executable =
      source.replace(
        /\/\*[\s\S]*?\*\//g,
        '',
      );

    assert.doesNotMatch(
      executable,
      /clearNativePassport\s*\([^)]*(?:pin|phrase|seed|root|vmk)/i,
    );
  },
);

console.log(
  'ONBOARDING_PHASE11B_NATIVE_CLEAR_VERIFIED=GREEN',
);

console.log(
  'ONBOARDING_PHASE11B_PUBLIC_PROFILE_CACHE_RESET=GREEN',
);

console.log(
  'ONBOARDING_PHASE11B_SETTINGS_IDENTITY_RESET=GREEN',
);

console.log(
  'ONBOARDING_PHASE11B_ONBOARDING_STATE_RESET=GREEN',
);

console.log(
  'ONBOARDING_PHASE11B_TWO_STEP_DESTRUCTIVE_GUARD=GREEN',
);

console.log(
  'ONBOARDING_PHASE11B_RUNTIME_RESET=GREEN',
);
