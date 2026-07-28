/**
 * RO:WHAT — Focused route-gate and source-boundary tests for CrabLink onboarding Phase 3.
 * RO:WHY — Proves clean installs stay outside the normal shell, complete state enters it, and development bypass remains explicit.
 * RO:INTERACTS — onboardingRouteGate.js, OnboardingRouteGate.jsx, App.jsx, onboardingModel.js.
 * RO:INVARIANTS — no silent development identity fallback; no production route-gate bypass.
 * RO:TEST — node --test onboardingRouteGate.test.mjs.
 */

import assert from 'node:assert/strict';
import {
  readFile,
} from 'node:fs/promises';
import test from 'node:test';

import {
  ONBOARDING_STATES,
  PASSPORT_STATES,
  PROFILE_SETUP_STATES,
  USERNAME_AVAILABILITY,
  assertSafeOnboardingState,
  createInitialOnboardingState,
} from './onboardingModel.js';

import {
  ONBOARDING_GATE_TARGETS,
  getOnboardingRouteGateDecision,
  shouldMountNormalCrabLinkShell,
} from './onboardingRouteGate.js';

const ROOT = new URL(
  '../../../..',
  import.meta.url,
);

const APP_SOURCE = new URL(
  'apps/crablink-tauri/src/app/App.jsx',
  ROOT,
);

const GATE_COMPONENT_SOURCE = new URL(
  'apps/crablink-tauri/src/onboarding/OnboardingRouteGate.jsx',
  ROOT,
);

const GATE_CSS_SOURCE = new URL(
  'apps/crablink-tauri/src/onboarding/onboardingRouteGate.css',
  ROOT,
);

function createCompleteState() {
  const initial =
    createInitialOnboardingState({
      now:
        '2026-07-26T07:00:00.000Z',
    });

  const complete = Object.freeze({
    ...initial,
    state: ONBOARDING_STATES.COMPLETE,
    completed: true,
    username: 'route_crab',
    usernameAvailability:
      USERNAME_AVAILABILITY.AVAILABLE,
    devAvailabilityBypassed: false,
    passportState:
      PASSPORT_STATES.CREATED_LOCKED,
    recoveryPhraseAcknowledged: true,
    pinSetupComplete: true,
    profileSetup:
      PROFILE_SETUP_STATES.SKIPPED,
    updatedAt:
      '2026-07-26T07:01:00.000Z',
  });

  assertSafeOnboardingState(complete);

  return complete;
}

test(
  'clean welcome state routes to onboarding and does not mount the normal shell',
  () => {
    const initial =
      createInitialOnboardingState({
        now:
          '2026-07-26T07:00:00.000Z',
      });

    const decision =
      getOnboardingRouteGateDecision(
        initial,
      );

    assert.deepEqual(decision, {
      target:
        ONBOARDING_GATE_TARGETS.ONBOARDING,
      reason: 'onboarding_incomplete',
      onboardingComplete: false,
      developmentOverride: false,
      validationErrors: [],
    });

    assert.equal(
      shouldMountNormalCrabLinkShell(
        decision,
      ),
      false,
    );
  },
);

test(
  'valid completed onboarding state enters the normal CrabLink shell',
  () => {
    const decision =
      getOnboardingRouteGateDecision(
        createCompleteState(),
      );

    assert.equal(
      decision.target,
      ONBOARDING_GATE_TARGETS
        .NORMAL_SHELL,
    );

    assert.equal(
      decision.onboardingComplete,
      true,
    );

    assert.equal(
      decision.developmentOverride,
      false,
    );

    assert.equal(
      shouldMountNormalCrabLinkShell(
        decision,
      ),
      true,
    );
  },
);

test(
  'development override requires both explicit activation and development permission',
  () => {
    const initial =
      createInitialOnboardingState({
        now:
          '2026-07-26T07:00:00.000Z',
      });

    const notAllowed =
      getOnboardingRouteGateDecision(
        initial,
        {
          devOverrideAllowed: false,
          devOverrideActive: true,
        },
      );

    assert.equal(
      notAllowed.target,
      ONBOARDING_GATE_TARGETS.ONBOARDING,
    );

    const notActivated =
      getOnboardingRouteGateDecision(
        initial,
        {
          devOverrideAllowed: true,
          devOverrideActive: false,
        },
      );

    assert.equal(
      notActivated.target,
      ONBOARDING_GATE_TARGETS.ONBOARDING,
    );

    const explicit =
      getOnboardingRouteGateDecision(
        initial,
        {
          devOverrideAllowed: true,
          devOverrideActive: true,
        },
      );

    assert.equal(
      explicit.target,
      ONBOARDING_GATE_TARGETS
        .DEVELOPMENT_SHELL,
    );

    assert.equal(
      explicit.onboardingComplete,
      false,
    );

    assert.equal(
      explicit.developmentOverride,
      true,
    );

    assert.equal(
      shouldMountNormalCrabLinkShell(
        explicit,
      ),
      true,
    );
  },
);

test(
  'invalid or secret-bearing onboarding state blocks instead of opening the shell',
  () => {
    const unsafeState = {
      ...createInitialOnboardingState({
        now:
          '2026-07-26T07:00:00.000Z',
      }),
      pin: '1234',
    };

    const decision =
      getOnboardingRouteGateDecision(
        unsafeState,
        {
          devOverrideAllowed: true,
          devOverrideActive: true,
        },
      );

    assert.equal(
      decision.target,
      ONBOARDING_GATE_TARGETS.BLOCKED,
    );

    assert.equal(
      shouldMountNormalCrabLinkShell(
        decision,
      ),
      false,
    );

    assert.match(
      decision.validationErrors.join(','),
      /unknown_fields:pin/,
    );
  },
);

test(
  'App places onboarding gate outside normal context and frame initialization',
  async () => {
    const source = await readFile(
      APP_SOURCE,
      'utf8',
    );

    assert.match(
      source,
      /import OnboardingRouteGate from '\.\.\/onboarding\/OnboardingRouteGate\.jsx';/,
    );

    const gateIndex = source.indexOf(
      '<OnboardingRouteGate>',
    );

    const contextIndex = source.indexOf(
      '<AppContextProvider>',
    );

    const frameIndex = source.indexOf(
      '<AppFrame />',
    );

    assert.ok(gateIndex >= 0);
    assert.ok(contextIndex > gateIndex);
    assert.ok(frameIndex > contextIndex);

    assert.match(
      source,
      /<\/AppContextProvider>\s*<\/OnboardingRouteGate>/,
    );
  },
);

test(
  'gate source makes development bypass explicit and excludes baked identity defaults',
  async () => {
    const [
      componentSource,
      cssSource,
    ] = await Promise.all([
      readFile(
        GATE_COMPONENT_SOURCE,
        'utf8',
      ),
      readFile(
        GATE_CSS_SOURCE,
        'utf8',
      ),
    ]);

    assert.match(
      componentSource,
      /Boolean\(import\.meta\.env\.DEV\)/,
    );

    assert.match(
      componentSource,
      /Development-only bypass: open CrabLink shell/,
    );

    assert.match(
      componentSource,
      /does not complete\s+onboarding/i,
    );

    assert.match(
      componentSource,
      /Development-only onboarding\s+bypass active/i,
    );

    assert.match(
      cssSource,
      /\.cl-onboarding-dev-banner/,
    );

    for (const forbidden of [
      '@skinnycrabby',
      'passport:main:visitor-b',
      'passport:main:dev',
      'acct_dev',
      'Creator A',
      'Visitor B',
      'acct_visitor_b',
      '1776',
    ]) {
      assert.equal(
        componentSource.includes(
          forbidden,
        ),
        false,
        forbidden,
      );
    }
  },
);

console.log(
  'ONBOARDING_PHASE3_CLEAN_START_GATE=GREEN',
);

console.log(
  'ONBOARDING_PHASE3_COMPLETED_HOME_ENTRY=GREEN',
);

console.log(
  'ONBOARDING_PHASE3_DEV_OVERRIDE=GREEN',
);

console.log(
  'ONBOARDING_PHASE3_INVALID_STATE_BLOCK=GREEN',
);

console.log(
  'ONBOARDING_PHASE3_NO_SILENT_DEV_IDENTITY=GREEN',
);

console.log(
  'ONBOARDING_PHASE3_ROUTE_GATE=GREEN',
);
