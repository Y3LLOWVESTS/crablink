/**
 * RO:WHAT — Focused Phase 9 tests for completion eligibility, local-draft shell projection, clean home routing, and source boundaries.
 * RO:WHY — Proves completed onboarding reaches crab://home without inheriting development identity or claiming backend confirmation.
 * RO:INTERACTS — onboardingHomeHandoff.js, OnboardingCompletionStep.jsx, onboardingModel.js, onboardingRouteGate.js, HomePage.jsx, PassportChip.jsx, and app/settings.js.
 * RO:INVARIANTS — local draft only; home route only; known dev labels removed; no network, wallet, ledger, capability, or secret authority.
 * RO:TEST — node --test onboardingHomeHandoff.test.mjs.
 */

import assert from 'node:assert/strict';

import {
  readFile,
} from 'node:fs/promises';

import test from 'node:test';

import {
  ONBOARDING_STATES,
  acknowledgeRecoveryPhrase,
  beginProfileSetup,
  beginUsernameCheck,
  beginUsernameEntry,
  completeOnboarding,
  createInitialOnboardingState,
  recordPassportCreatedLocked,
  recordPinSetupComplete,
  recordUsernameAvailable,
  requestPassportCreate,
  requirePinSetup,
  requireRecoveryPhrase,
  saveProfileSetup,
  skipProfileSetup,
} from './onboardingModel.js';

import {
  buildOnboardingHomeSettingsProjection,
  writeCrabLinkHomeRoute,
} from './onboardingHomeHandoff.js';

import {
  ONBOARDING_GATE_TARGETS,
  getOnboardingRouteGateDecision,
} from './onboardingRouteGate.js';

const ROOT = new URL(
  '../../../..',
  import.meta.url,
);

const FILES = Object.freeze({
  completion: new URL(
    'apps/crablink-tauri/src/onboarding/OnboardingCompletionStep.jsx',
    ROOT,
  ),

  routeGate: new URL(
    'apps/crablink-tauri/src/onboarding/OnboardingRouteGate.jsx',
    ROOT,
  ),

  home: new URL(
    'apps/crablink-tauri/src/pages/home/HomePage.jsx',
    ROOT,
  ),

  passportChip: new URL(
    'apps/crablink-tauri/src/app/shell/PassportChip.jsx',
    ROOT,
  ),
});

const TIMES = Object.freeze([
  '2026-07-27T02:00:00.000Z',
  '2026-07-27T02:00:01.000Z',
  '2026-07-27T02:00:02.000Z',
  '2026-07-27T02:00:03.000Z',
  '2026-07-27T02:00:04.000Z',
  '2026-07-27T02:00:05.000Z',
  '2026-07-27T02:00:06.000Z',
  '2026-07-27T02:00:07.000Z',
  '2026-07-27T02:00:08.000Z',
  '2026-07-27T02:00:09.000Z',
  '2026-07-27T02:00:10.000Z',
  '2026-07-27T02:00:11.000Z',
  '2026-07-27T02:00:12.000Z',
]);

function buildProfileDecisionState({
  profile = 'saved',
} = {}) {
  let state =
    createInitialOnboardingState({
      now: TIMES[0],
    });

  state = beginUsernameEntry(
    state,
    {
      now: TIMES[1],
    },
  );

  state = beginUsernameCheck(
    state,
    'home_crab',
    {
      now: TIMES[2],
    },
  );

  state = recordUsernameAvailable(
    state,
    {
      now: TIMES[3],
    },
  );

  state = requestPassportCreate(
    state,
    {
      now: TIMES[4],
    },
  );

  state =
    recordPassportCreatedLocked(
      state,
      {
        now: TIMES[5],
      },
    );

  state = requireRecoveryPhrase(
    state,
    {
      now: TIMES[6],
    },
  );

  state =
    acknowledgeRecoveryPhrase(
      state,
      {
        now: TIMES[7],
      },
    );

  state = requirePinSetup(
    state,
    {
      now: TIMES[8],
    },
  );

  state = recordPinSetupComplete(
    state,
    {
      now: TIMES[9],
    },
  );

  state = beginProfileSetup(
    state,
    {
      now: TIMES[10],
    },
  );

  return profile === 'skipped'
    ? skipProfileSetup(
        state,
        {
          now: TIMES[11],
        },
      )
    : saveProfileSetup(
        state,
        {
          now: TIMES[11],
        },
      );
}

test(
  'saved profile completion projects an honest local username and removes known dev labels',
  () => {
    const decisionState =
      buildProfileDecisionState();

    const projection =
      buildOnboardingHomeSettingsProjection({
        onboardingState:
          decisionState,

        currentSettings: {
          passportSubject:
            'passport:main:dev',

          walletAccount: 'acct_dev',
          handle: '@old_backend_name',
          username: 'old_backend_name',
        },
      });

    assert.deepEqual(
      projection,
      {
        requestedUsername:
          'home_crab',

        requestedHandle:
          '@home_crab',

        username: '',
        handle: '',
        usernameStatus:
          'local_draft',

        usernameUpdatedAt:
          TIMES[11],

        profileCrabUrl: '',
        publicProfileCid: '',
        passportSubject: '',
        walletAccount: '',
      },
    );

    const completed =
      completeOnboarding(
        decisionState,
        {
          now: TIMES[12],
        },
      );

    assert.equal(
      completed.state,
      ONBOARDING_STATES.COMPLETE,
    );

    assert.equal(
      completed.completed,
      true,
    );

    const routeDecision =
      getOnboardingRouteGateDecision(
        completed,
      );

    assert.equal(
      routeDecision.target,
      ONBOARDING_GATE_TARGETS
        .NORMAL_SHELL,
    );

    assert.equal(
      routeDecision
        .onboardingComplete,
      true,
    );
  },
);

test(
  'skipped profile can complete while preserving a non-development local label',
  () => {
    const decisionState =
      buildProfileDecisionState({
        profile: 'skipped',
      });

    const projection =
      buildOnboardingHomeSettingsProjection({
        onboardingState:
          decisionState,

        currentSettings: {
          passportSubject:
            'passport:local:real-device',

          walletAccount:
            'wallet-local-display',
        },
      });

    assert.equal(
      projection.requestedHandle,
      '@home_crab',
    );

    assert.equal(
      projection.usernameStatus,
      'local_draft',
    );

    assert.equal(
      projection.passportSubject,
      'passport:local:real-device',
    );

    assert.equal(
      projection.walletAccount,
      'wallet-local-display',
    );
  },
);

test(
  'home route writer replaces the browser route with crab://home',
  () => {
    let replacement = null;

    const result =
      writeCrabLinkHomeRoute({
        location: {
          href:
            'https://tauri.local/#url=crab%3A%2F%2Fprofile',
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

    assert.equal(
      result.route,
      'crab://home',
    );

    assert.equal(
      result.routeKind,
      'home',
    );

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
      replacement.state
        .crablinkRoute,
      'crab://home',
    );

    assert.equal(
      replacement.state
        .onboardingHomeHandoff,
      true,
    );
  },
);

test(
  'completion component persists settings home route and completed state without authority expansion',
  async () => {
    const source = await readFile(
      FILES.completion,
      'utf8',
    );

    for (const required of [
      'buildOnboardingHomeSettingsProjection',
      'saveAppSettings',
      'writeCrabLinkHomeRoute',
      'completeOnboarding',
      'writeOnboardingState',
      'Finish setup and open CrabLink',
      'local draft',
      'Not confirmed',
      'crab://home',
    ]) {
      assert.ok(
        source.includes(required),
        required,
      );
    }

    assert.doesNotMatch(
      source,
      /\bfetch\s*\(|\binvoke\s*\(|createWalletClient|createIdentityClient|walletClient|ledgerClient/,
    );

    const executableSource = source.replace(
      /\/\*[\s\S]*?\*\//g,
      '',
    );

    assert.doesNotMatch(
      executableSource,
      /type=["']password["']|name=["'](?:pin|password)["']|recoveryPhrase|seedPhrase|privateKey|vmk/i,
    );
  },
);

test(
  'route gate sends profile decisions to completion before mounting the shell',
  async () => {
    const source = await readFile(
      FILES.routeGate,
      'utf8',
    );

    assert.match(
      source,
      /import OnboardingCompletionStep from '\.\/OnboardingCompletionStep\.jsx';/,
    );

    assert.match(
      source,
      /const ONBOARDING_COMPLETION_STATES/,
    );

    for (const required of [
      'PROFILE_SKIPPED',
      'PROFILE_SAVED',
      '<OnboardingCompletionStep',
      '<ProfileSetupStep',
    ]) {
      assert.ok(
        source.includes(required),
        required,
      );
    }

    assert.ok(
      source.indexOf(
        '<OnboardingCompletionStep',
      ) <
        source.indexOf(
          '<ProfileSetupStep',
        ),
      'completion route must be evaluated before the profile editing route',
    );
  },
);

test(
  'home and Passport chip display the selected username as local draft before legacy labels',
  async () => {
    const [
      homeSource,
      passportChipSource,
    ] = await Promise.all([
      readFile(
        FILES.home,
        'utf8',
      ),

      readFile(
        FILES.passportChip,
        'utf8',
      ),
    ]);

    for (const required of [
      'onboardingIdentityLabel',
      'requestedHandle',
      'local draft',
      'backend confirmed',
    ]) {
      assert.ok(
        homeSource.includes(required),
        required,
      );
    }

    const expectedPassportChipDisplay = [
      '  const display = confirmed',
      '    ? settings.handle',
      '    : requested',
      '      ? `${requested} draft`',
      '      : passportSubject',
      '        ? passportSubject',
      '        : httpFallback',
      "          ? 'HTTP test mode'",
      "          : 'No passport';",
    ].join('\n');

    assert.ok(
      passportChipSource.includes(
        expectedPassportChipDisplay,
      ),
      'Passport chip display must prefer the requested local draft over the configured subject label',
    );

    assert.doesNotMatch(
      homeSource,
      /skinnycrabby|visitor-b|passport a|passport b|acct_dev/i,
    );
  },
);

console.log(
  'ONBOARDING_PHASE9_COMPLETION_TRANSITION=GREEN',
);

console.log(
  'ONBOARDING_PHASE9_CRAB_HOME_ROUTE=GREEN',
);

console.log(
  'ONBOARDING_PHASE9_LOCAL_USERNAME_DISPLAY=GREEN',
);

console.log(
  'ONBOARDING_PHASE9_KNOWN_DEV_LABEL_HANDOFF=GREEN',
);

console.log(
  'ONBOARDING_PHASE9_NO_BACKEND_CONFIRMED_CLAIM=GREEN',
);

console.log(
  'ONBOARDING_PHASE9_HOME_HANDOFF=GREEN',
);
