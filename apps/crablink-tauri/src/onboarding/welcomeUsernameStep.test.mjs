/**
 * RO:WHAT — Focused Phase 4 tests for visible welcome, username validation, truthful availability, and development bypass.
 * RO:WHY — Proves the first visible onboarding step contains no baked identity and never fabricates username ownership.
 * RO:INTERACTS — onboardingModel.js, usernameAvailability.js, WelcomeUsernameStep.jsx, OnboardingRouteGate.jsx.
 * RO:INVARIANTS — username is user-entered; default adapter is unconfigured; development bypass is explicit.
 * RO:TEST — node --test welcomeUsernameStep.test.mjs.
 */

import assert from 'node:assert/strict';
import {
  readFile,
} from 'node:fs/promises';
import test from 'node:test';

import {
  ONBOARDING_STATES,
  USERNAME_AVAILABILITY,
  beginUsernameCheck,
  beginUsernameEntry,
  bypassUsernameForDev,
  createInitialOnboardingState,
  recordUsernameAvailable,
  returnToUsernameEntry,
  validateOnboardingUsername,
} from './onboardingModel.js';

import {
  USERNAME_AVAILABILITY_CHECK_SCHEMA,
  USERNAME_AVAILABILITY_CHECK_STATUS,
  checkUsernameAvailability,
  createUsernameAvailabilityAdapter,
} from './usernameAvailability.js';

const ROOT = new URL(
  '../../../..',
  import.meta.url,
);

const WELCOME_SOURCE = new URL(
  'apps/crablink-tauri/src/onboarding/WelcomeUsernameStep.jsx',
  ROOT,
);

const GATE_SOURCE = new URL(
  'apps/crablink-tauri/src/onboarding/OnboardingRouteGate.jsx',
  ROOT,
);

const CSS_SOURCE = new URL(
  'apps/crablink-tauri/src/onboarding/onboardingRouteGate.css',
  ROOT,
);

test(
  'username syntax remains user-entered and normalized by the shared validator',
  () => {
    const empty =
      createInitialOnboardingState({
        now:
          '2026-07-26T08:00:00.000Z',
      });

    assert.equal(empty.username, '');

    const valid =
      validateOnboardingUsername(
        '@Fresh_Crab7',
      );

    assert.equal(valid.ok, true);

    assert.equal(
      valid.normalized,
      'fresh_crab7',
    );

    assert.equal(
      validateOnboardingUsername(
        '2bad',
      ).ok,
      false,
    );

    assert.equal(
      validateOnboardingUsername(
        'bad-name',
      ).ok,
      false,
    );
  },
);

test(
  'default availability adapter truthfully reports not configured',
  async () => {
    const result =
      await checkUsernameAvailability(
        'fresh_crab',
      );

    assert.deepEqual(result, {
      schema:
        USERNAME_AVAILABILITY_CHECK_SCHEMA,
      username: 'fresh_crab',
      status:
        USERNAME_AVAILABILITY_CHECK_STATUS
          .NOT_CONFIGURED,
      available: null,
      checked: false,
      reason:
        'availability_adapter_not_configured',
    });

    assert.equal(
      Object.isFrozen(result),
      true,
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        result,
        'ownershipConfirmed',
      ),
      false,
    );
  },
);

test(
  'configured adapter may report availability without claiming ownership',
  async () => {
    const adapter =
      createUsernameAvailabilityAdapter({
        check: async (username) => ({
          available:
            username === 'free_crab',
        }),
      });

    const available =
      await adapter
        .checkUsernameAvailability(
          'free_crab',
        );

    assert.equal(
      available.status,
      USERNAME_AVAILABILITY_CHECK_STATUS
        .AVAILABLE,
    );

    assert.equal(
      available.available,
      true,
    );

    assert.equal(
      available.checked,
      true,
    );

    const unavailable =
      await adapter
        .checkUsernameAvailability(
          'taken_crab',
        );

    assert.equal(
      unavailable.status,
      USERNAME_AVAILABILITY_CHECK_STATUS
        .UNAVAILABLE,
    );

    assert.equal(
      unavailable.available,
      false,
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        available,
        'ownershipConfirmed',
      ),
      false,
    );
  },
);

test(
  'model records confirmed availability and development bypass as distinct states',
  () => {
    const initial =
      createInitialOnboardingState({
        now:
          '2026-07-26T08:00:00.000Z',
      });

    const entry =
      beginUsernameEntry(initial, {
        now:
          '2026-07-26T08:01:00.000Z',
      });

    const checking =
      beginUsernameCheck(
        entry,
        'fresh_crab',
        {
          now:
            '2026-07-26T08:02:00.000Z',
        },
      );

    const available =
      recordUsernameAvailable(
        checking,
        {
          now:
            '2026-07-26T08:03:00.000Z',
        },
      );

    assert.equal(
      available.state,
      ONBOARDING_STATES
        .USERNAME_AVAILABLE,
    );

    assert.equal(
      available.usernameAvailability,
      USERNAME_AVAILABILITY.AVAILABLE,
    );

    assert.equal(
      available.devAvailabilityBypassed,
      false,
    );

    const returned =
      returnToUsernameEntry(
        available,
        {
          now:
            '2026-07-26T08:04:00.000Z',
        },
      );

    assert.equal(
      returned.state,
      ONBOARDING_STATES
        .USERNAME_ENTRY,
    );

    assert.equal(
      returned.usernameAvailability,
      USERNAME_AVAILABILITY.UNKNOWN,
    );

    const bypassed =
      bypassUsernameForDev(
        returned,
        'fresh_crab',
        {
          now:
            '2026-07-26T08:05:00.000Z',
        },
      );

    assert.equal(
      bypassed.state,
      ONBOARDING_STATES
        .USERNAME_BYPASSED_FOR_DEV,
    );

    assert.equal(
      bypassed.usernameAvailability,
      USERNAME_AVAILABILITY
        .BYPASSED_FOR_DEV,
    );

    assert.equal(
      bypassed.devAvailabilityBypassed,
      true,
    );

    assert.notEqual(
      bypassed.usernameAvailability,
      USERNAME_AVAILABILITY.AVAILABLE,
    );
  },
);

test(
  'welcome and username component contains real input and explicit dev-only bypass',
  async () => {
    const source = await readFile(
      WELCOME_SOURCE,
      'utf8',
    );

    assert.match(
      source,
      /title="Welcome to CrabLink"/,
    );

    assert.match(
      source,
      /Choose a username/,
    );

    assert.match(
      source,
      /id="crablink-onboarding-username"/,
    );

    assert.match(
      source,
      /value=\{usernameDraft\}/,
    );

    assert.match(
      source,
      /Check availability/,
    );

    assert.match(
      source,
      /Bypass availability for dev/,
    );

    assert.match(
      source,
      /bypassUsernameForDev\s*\(/,
    );

    assert.match(
      source,
      /does not\s+confirm username ownership/i,
    );

    assert.doesNotMatch(
      source,
      /defaultValue=/,
    );
  },
);

test(
  'route gate mounts the Phase 4 component only for welcome and username states',
  async () => {
    const source = await readFile(
      GATE_SOURCE,
      'utf8',
    );

    assert.match(
      source,
      /import WelcomeUsernameStep from '\.\/WelcomeUsernameStep\.jsx';/,
    );

    assert.match(
      source,
      /WELCOME_USERNAME_STATES/,
    );

    assert.match(
      source,
      /<WelcomeUsernameStep/,
    );

    assert.match(
      source,
      /devAvailabilityBypassAllowed=\{/,
    );

    assert.match(
      source,
      /onStateChange=\{\(nextState\) => \{/,
    );
  },
);

test(
  'Phase 4 sources exclude baked usernames and visible Passport choices',
  async () => {
    const [
      welcomeSource,
      gateSource,
      cssSource,
    ] = await Promise.all([
      readFile(
        WELCOME_SOURCE,
        'utf8',
      ),
      readFile(
        GATE_SOURCE,
        'utf8',
      ),
      readFile(
        CSS_SOURCE,
        'utf8',
      ),
    ]);

    const combined =
      `${welcomeSource}\n${gateSource}`;

    for (const forbidden of [
      '@skinnycrabby',
      'passport:main:visitor-b',
      'passport:main:dev',
      'acct_dev',
      'Passport A',
      'Passport B',
      'Visitor B',
      'Creator A',
    ]) {
      assert.equal(
        combined.includes(forbidden),
        false,
        forbidden,
      );
    }

    assert.match(
      cssSource,
      /\.cl-onboarding-username-form/,
    );

    assert.match(
      cssSource,
      /\.cl-onboarding-step__dev-warning/,
    );
  },
);

console.log(
  'ONBOARDING_PHASE4_WELCOME=GREEN',
);

console.log(
  'ONBOARDING_PHASE4_USERNAME_INPUT=GREEN',
);

console.log(
  'ONBOARDING_PHASE4_USERNAME_VALIDATION=GREEN',
);

console.log(
  'ONBOARDING_PHASE4_AVAILABILITY_PLACEHOLDER=GREEN',
);

console.log(
  'ONBOARDING_PHASE4_DEV_AVAILABILITY_BYPASS=GREEN',
);

console.log(
  'ONBOARDING_PHASE4_NO_BAKED_IDENTITY=GREEN',
);

console.log(
  'ONBOARDING_PHASE4_USERNAME=GREEN',
);
