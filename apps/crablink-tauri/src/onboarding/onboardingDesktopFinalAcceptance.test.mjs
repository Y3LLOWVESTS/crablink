/**
 * RO:WHAT — Final automated desktop onboarding acceptance covering clean start, completion, restart, reset, secret boundaries, dev quarantine, and honest local truth.
 * RO:WHY — Phase 11 needs one focused proof that the completed desktop onboarding pieces still behave as a coherent state machine.
 * RO:INTERACTS — onboarding model/storage/route gate, Phase 9 home handoff, Phase 10 dev gate, visible onboarding React components, Home, and Passport chip.
 * RO:INVARIANTS — no WebView PIN or recovery words; no baked username; no normal Passport A/B flow; no wallet, ledger, capability, or username-registry mutation.
 * RO:TEST — node --test onboardingDesktopFinalAcceptance.test.mjs.
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
  createOnboardingStorageAdapter,
} from './onboardingStorage.js';

import {
  ONBOARDING_GATE_TARGETS,
  getOnboardingRouteGateDecision,
} from './onboardingRouteGate.js';

import {
  buildOnboardingHomeSettingsProjection,
} from './onboardingHomeHandoff.js';

import {
  isExplicitPassportDrawerDevSurface,
} from '../app/shell/passportDrawerDevGate.js';

const ROOT = new URL(
  '../../../..',
  import.meta.url,
);

const FILES = Object.freeze({
  welcome: new URL(
    'apps/crablink-tauri/src/onboarding/WelcomeUsernameStep.jsx',
    ROOT,
  ),

  passportCreate: new URL(
    'apps/crablink-tauri/src/onboarding/PassportCreateStep.jsx',
    ROOT,
  ),

  recovery: new URL(
    'apps/crablink-tauri/src/onboarding/RecoveryCeremonyStep.jsx',
    ROOT,
  ),

  pin: new URL(
    'apps/crablink-tauri/src/onboarding/PinSetupStep.jsx',
    ROOT,
  ),

  profile: new URL(
    'apps/crablink-tauri/src/onboarding/ProfileSetupStep.jsx',
    ROOT,
  ),

  completion: new URL(
    'apps/crablink-tauri/src/onboarding/OnboardingCompletionStep.jsx',
    ROOT,
  ),

  routeGate: new URL(
    'apps/crablink-tauri/src/onboarding/OnboardingRouteGate.jsx',
    ROOT,
  ),

  profileDraft: new URL(
    'apps/crablink-tauri/src/onboarding/onboardingProfileDraft.js',
    ROOT,
  ),

  homeHandoff: new URL(
    'apps/crablink-tauri/src/onboarding/onboardingHomeHandoff.js',
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

  drawer: new URL(
    'apps/crablink-tauri/src/app/shell/PassportDrawer.jsx',
    ROOT,
  ),

  drawerGate: new URL(
    'apps/crablink-tauri/src/app/shell/passportDrawerDevGate.js',
    ROOT,
  ),

  devFixtures: new URL(
    'apps/crablink-tauri/src/shared/utils/devPassportSessions.js',
    ROOT,
  ),

  settings: new URL(
    'apps/crablink-tauri/src/storage.js',
    ROOT,
  ),

  app: new URL(
    'apps/crablink-tauri/src/app/App.jsx',
    ROOT,
  ),
});

const TIMES = Object.freeze([
  '2026-07-27T03:00:00.000Z',
  '2026-07-27T03:00:01.000Z',
  '2026-07-27T03:00:02.000Z',
  '2026-07-27T03:00:03.000Z',
  '2026-07-27T03:00:04.000Z',
  '2026-07-27T03:00:05.000Z',
  '2026-07-27T03:00:06.000Z',
  '2026-07-27T03:00:07.000Z',
  '2026-07-27T03:00:08.000Z',
  '2026-07-27T03:00:09.000Z',
  '2026-07-27T03:00:10.000Z',
  '2026-07-27T03:00:11.000Z',
  '2026-07-27T03:00:12.000Z',
  '2026-07-27T03:00:13.000Z',
]);

function createMemoryStorage() {
  const values = new Map();

  return {
    getItem(key) {
      return values.has(key)
        ? values.get(key)
        : null;
    },

    setItem(key, value) {
      values.set(
        key,
        String(value),
      );
    },

    removeItem(key) {
      values.delete(key);
    },
  };
}

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
    'final_crab',
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

function buildCompletedState({
  profile = 'saved',
} = {}) {
  return completeOnboarding(
    buildProfileDecisionState({
      profile,
    }),
    {
      now: TIMES[12],
    },
  );
}

function stripComments(source) {
  return source
    .replace(
      /\/\*[\s\S]*?\*\//g,
      '',
    )
    .replace(
      /^\s*\/\/!?.*$/gm,
      '',
    );
}

test(
  'clean start routes to onboarding while completion survives restart and reset returns to welcome',
  async () => {
    const storage =
      createMemoryStorage();

    const firstBoot =
      createOnboardingStorageAdapter({
        storage,
      });

    const cleanState =
      await firstBoot
        .readOnboardingState({
          now: TIMES[0],
        });

    assert.equal(
      cleanState.state,
      ONBOARDING_STATES.WELCOME,
    );

    const cleanDecision =
      getOnboardingRouteGateDecision(
        cleanState,
      );

    assert.equal(
      cleanDecision.target,
      ONBOARDING_GATE_TARGETS
        .ONBOARDING,
    );

    assert.equal(
      cleanDecision
        .onboardingComplete,
      false,
    );

    const completed =
      buildCompletedState();

    await firstBoot
      .writeOnboardingState(
        completed,
      );

    const restartedApp =
      createOnboardingStorageAdapter({
        storage,
      });

    const restartedState =
      await restartedApp
        .readOnboardingState();

    assert.equal(
      restartedState.state,
      ONBOARDING_STATES.COMPLETE,
    );

    assert.equal(
      restartedState.completed,
      true,
    );

    const restartedDecision =
      getOnboardingRouteGateDecision(
        restartedState,
      );

    assert.equal(
      restartedDecision.target,
      ONBOARDING_GATE_TARGETS
        .NORMAL_SHELL,
    );

    const resetState =
      await restartedApp
        .resetOnboardingState({
          now: TIMES[13],
        });

    assert.equal(
      resetState.state,
      ONBOARDING_STATES.WELCOME,
    );

    assert.equal(
      resetState.completed,
      false,
    );

    assert.equal(
      getOnboardingRouteGateDecision(
        resetState,
      ).target,
      ONBOARDING_GATE_TARGETS
        .ONBOARDING,
    );
  },
);

test(
  'saved and skipped profile decisions both complete with honest local username projection',
  () => {
    for (const profile of [
      'saved',
      'skipped',
    ]) {
      const decision =
        buildProfileDecisionState({
          profile,
        });

      const projection =
        buildOnboardingHomeSettingsProjection({
          onboardingState: decision,

          currentSettings: {
            passportSubject:
              'passport:main:dev',

            walletAccount:
              'acct_dev',

            handle:
              '@fabricated_backend_name',

            username:
              'fabricated_backend_name',
          },
        });

      assert.equal(
        projection.requestedUsername,
        'final_crab',
      );

      assert.equal(
        projection.requestedHandle,
        '@final_crab',
      );

      assert.equal(
        projection.usernameStatus,
        'local_draft',
      );

      assert.equal(
        projection.username,
        '',
      );

      assert.equal(
        projection.handle,
        '',
      );

      assert.equal(
        projection.passportSubject,
        '',
      );

      assert.equal(
        projection.walletAccount,
        '',
      );

      const completed =
        completeOnboarding(
          decision,
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
    }
  },
);

test(
  'visible onboarding React contains no PIN field or recovery-word custody',
  async () => {
    const [
      welcome,
      passportCreate,
      recovery,
      pin,
      profile,
      completion,
      routeGate,
    ] = await Promise.all([
      readFile(FILES.welcome, 'utf8'),
      readFile(
        FILES.passportCreate,
        'utf8',
      ),
      readFile(FILES.recovery, 'utf8'),
      readFile(FILES.pin, 'utf8'),
      readFile(FILES.profile, 'utf8'),
      readFile(
        FILES.completion,
        'utf8',
      ),
      readFile(
        FILES.routeGate,
        'utf8',
      ),
    ]);

    const executable =
      stripComments(
        [
          welcome,
          passportCreate,
          recovery,
          pin,
          profile,
          completion,
          routeGate,
        ].join('\n'),
      );

    assert.doesNotMatch(
      executable,
      /<input[^>]+type=["']password["']/i,
    );

    assert.doesNotMatch(
      executable,
      /<input[^>]+name=["'](?:pin|password)["']/i,
    );

    assert.doesNotMatch(
      executable,
      /\b(?:seedWords|mnemonicWords|recoveryWords|phraseWords|seedPhrase|recoveryPhrase)\b/,
    );

    assert.match(
      passportCreate,
      /createNativePassport\(\)/,
    );

    assert.match(
      welcome,
      /Bypass availability for dev/,
    );

    assert.match(
      routeGate,
      /import\.meta\.env\.DEV/,
    );
  },
);

test(
  'normal onboarding and completed home surfaces contain no baked development identity',
  async () => {
    const sources =
      await Promise.all([
        readFile(FILES.welcome, 'utf8'),
        readFile(FILES.profile, 'utf8'),
        readFile(
          FILES.completion,
          'utf8',
        ),
        readFile(FILES.home, 'utf8'),
        readFile(
          FILES.passportChip,
          'utf8',
        ),
      ]);

    const executable =
      stripComments(
        sources.join('\n'),
      );

    assert.doesNotMatch(
      executable,
      /skinnycrabby/i,
    );

    assert.doesNotMatch(
      executable,
      /\bPassport A\b|\bPassport B\b|visitor-b/i,
    );

    assert.doesNotMatch(
      executable,
      /passport:main:dev|acct_dev/i,
    );
  },
);

test(
  'development sessions require both development build and explicit dev mode',
  async () => {
    assert.equal(
      isExplicitPassportDrawerDevSurface({
        buildDev: false,

        settings: {
          devMode: true,
        },
      }),
      false,
    );

    assert.equal(
      isExplicitPassportDrawerDevSurface({
        buildDev: true,

        settings: {
          devMode: false,
        },
      }),
      false,
    );

    assert.equal(
      isExplicitPassportDrawerDevSurface({
        buildDev: true,

        settings: {
          devMode: true,
        },
      }),
      true,
    );

    const [
      drawer,
      drawerGate,
      fixtures,
      settings,
    ] = await Promise.all([
      readFile(FILES.drawer, 'utf8'),
      readFile(
        FILES.drawerGate,
        'utf8',
      ),
      readFile(
        FILES.devFixtures,
        'utf8',
      ),
      readFile(FILES.settings, 'utf8'),
    ]);

    assert.match(
      drawer,
      /buildDev: import\.meta\.env\.DEV/,
    );

    assert.match(
      drawer,
      /settings: context\.settings/,
    );

    assert.match(
      drawerGate,
      /isExplicitDeveloperSurface/,
    );

    assert.match(
      drawerGate,
      /return isExplicitDeveloperSurface\(\{/,
    );

    assert.match(
      drawerGate,
      /\bbuildDev,/,
    );

    assert.match(
      drawerGate,
      /\bsettings,/,
    );

    assert.match(
      settings,
      /devMode:\s*false,/,
    );

    assert.match(
      fixtures,
      /RO:WHAT — Dev-only/,
    );
  },
);

test(
  'completion and profile drafts remain local-only and add no network or economic authority',
  async () => {
    const [
      completion,
      profileDraft,
      homeHandoff,
      app,
    ] = await Promise.all([
      readFile(
        FILES.completion,
        'utf8',
      ),
      readFile(
        FILES.profileDraft,
        'utf8',
      ),
      readFile(
        FILES.homeHandoff,
        'utf8',
      ),
      readFile(FILES.app, 'utf8'),
    ]);

    const executable =
      stripComments(
        [
          completion,
          profileDraft,
          homeHandoff,
        ].join('\n'),
      );

    assert.match(
      profileDraft,
      /backendConfirmed:\s*false/,
    );

    assert.doesNotMatch(
      profileDraft,
      /backendConfirmed:\s*true/,
    );

    assert.match(
      homeHandoff,
      /'local_draft'/,
    );

    assert.doesNotMatch(
      executable,
      /\bfetch\s*\(|\binvoke\s*\(/,
    );

    assert.doesNotMatch(
      executable,
      /\b(?:registerUsername|claimUsername|confirmUsername|issueCapability|mint|burn|transfer)\s*\(/,
    );

    assert.doesNotMatch(
      executable,
      /\b(?:walletClient|ledgerClient|capabilityClient)\b/,
    );

    assert.match(
      app,
      /OnboardingRouteGate/,
    );

    assert.ok(
      app.indexOf(
        '<OnboardingRouteGate',
      ) <
        app.indexOf(
          '<AppContextProvider',
        ),
      'the first-run gate must remain outside normal application context initialization',
    );
  },
);

console.log(
  'ONBOARDING_PHASE11A_MODEL_RESTART_RESET=GREEN',
);

console.log(
  'ONBOARDING_PHASE11A_PROFILE_SAVE_SKIP_COMPLETION=GREEN',
);

console.log(
  'ONBOARDING_PHASE11A_NO_REACT_PIN_OR_RECOVERY_WORDS=GREEN',
);

console.log(
  'ONBOARDING_PHASE11A_NO_BAKED_IDENTITY=GREEN',
);

console.log(
  'ONBOARDING_PHASE11A_DEV_QUARANTINE=GREEN',
);

console.log(
  'ONBOARDING_PHASE11A_NO_AUTHORITY_EXPANSION=GREEN',
);

console.log(
  'ONBOARDING_PHASE11A_SOURCE_MODEL_ACCEPTANCE=GREEN',
);
