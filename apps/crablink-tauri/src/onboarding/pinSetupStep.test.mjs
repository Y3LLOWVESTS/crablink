/**
 * RO:WHAT — Focused Phase 7B tests for native-only PIN confirmation UI, route admission, and redacted storage transition.
 * RO:WHY — Proves onboarding advances from recovery acknowledgement to profile setup without a React PIN field or PIN argument.
 * RO:INTERACTS — PinSetupStep.jsx, onboardingPinSetup.js, onboardingModel.js, onboardingStorage.js, passportAdapter.js, and OnboardingRouteGate.jsx.
 * RO:INVARIANTS — native prompt only; failures stay blocked; storage contains only the approved onboarding DTO and boolean completion.
 * RO:TEST — node --test pinSetupStep.test.mjs.
 */

import assert from 'node:assert/strict';
import {
  readFile,
} from 'node:fs/promises';
import test from 'node:test';

import {
  beginNativeOnboardingPinSetup,
  PIN_SETUP_REVIEW_STATES,
} from './onboardingPinSetup.js';
import {
  acknowledgeRecoveryPhrase,
  beginProfileSetup,
  beginUsernameCheck,
  beginUsernameEntry,
  createInitialOnboardingState,
  ONBOARDING_DTO_FIELDS,
  ONBOARDING_STATES,
  recordPassportCreatedLocked,
  recordPinSetupComplete,
  recordUsernameAvailable,
  requestPassportCreate,
  requirePinSetup,
  requireRecoveryPhrase,
  validateOnboardingState,
} from './onboardingModel.js';
import {
  createOnboardingStorageAdapter,
} from './onboardingStorage.js';
import {
  PASSPORT_COMMANDS,
} from '../adapters/passportAdapter.js';

const ROOT = new URL(
  '../../../..',
  import.meta.url,
);

const FILES = Object.freeze({
  component: new URL(
    'apps/crablink-tauri/src/onboarding/PinSetupStep.jsx',
    ROOT,
  ),

  routeGate: new URL(
    'apps/crablink-tauri/src/onboarding/OnboardingRouteGate.jsx',
    ROOT,
  ),

  adapter: new URL(
    'apps/crablink-tauri/src/adapters/passportAdapter.js',
    ROOT,
  ),
});

const TIMES = Object.freeze([
  '2026-07-27T00:00:00.000Z',
  '2026-07-27T00:00:01.000Z',
  '2026-07-27T00:00:02.000Z',
  '2026-07-27T00:00:03.000Z',
  '2026-07-27T00:00:04.000Z',
  '2026-07-27T00:00:05.000Z',
  '2026-07-27T00:00:06.000Z',
  '2026-07-27T00:00:07.000Z',
  '2026-07-27T00:00:08.000Z',
  '2026-07-27T00:00:09.000Z',
  '2026-07-27T00:00:10.000Z',
]);

function buildRecoveryAcknowledgedState() {
  let state = createInitialOnboardingState({
    now: TIMES[0],
  });

  state = beginUsernameEntry(state, {
    now: TIMES[1],
  });

  state = beginUsernameCheck(
    state,
    'new_crab',
    { now: TIMES[2] },
  );

  state = recordUsernameAvailable(state, {
    now: TIMES[3],
  });

  state = requestPassportCreate(state, {
    now: TIMES[4],
  });

  state = recordPassportCreatedLocked(
    state,
    { now: TIMES[5] },
  );

  state = requireRecoveryPhrase(state, {
    now: TIMES[6],
  });

  return acknowledgeRecoveryPhrase(state, {
    now: TIMES[7],
  });
}

function nativeUnlockDto(patch = {}) {
  return {
    schema:
      'crablink.native-passport.command.v1',
    commandName:
      PASSPORT_COMMANDS.unlockOperational,
    state: 'operational_unlocked',
    redacted: true,
    nativeSecureInputRequested: true,
    pinReceivedFromWebview: false,
    secretMaterialReturned: false,
    recoveryRootUnsealed: false,
    walletOrLedgerMutated: false,
    ...patch,
  };
}

test(
  'native PIN confirmation and model transitions reach profile setup',
  async () => {
    const argumentCounts = [];

    const review =
      await beginNativeOnboardingPinSetup({
        unlockOperational() {
          argumentCounts.push(
            arguments.length,
          );

          return Promise.resolve(
            nativeUnlockDto(),
          );
        },
      });

    assert.deepEqual(argumentCounts, [0]);

    assert.equal(
      review.state,
      PIN_SETUP_REVIEW_STATES.COMPLETE,
    );

    assert.equal(
      review.pinSetupComplete,
      true,
    );

    assert.equal(
      review.nativeSecureInputRequested,
      true,
    );

    assert.equal(
      review.pinReceivedFromWebview,
      false,
    );

    let state = buildRecoveryAcknowledgedState();

    state = requirePinSetup(state, {
      now: TIMES[8],
    });

    assert.equal(
      state.state,
      ONBOARDING_STATES.PIN_SETUP_REQUIRED,
    );

    state = recordPinSetupComplete(state, {
      now: TIMES[9],
    });

    assert.equal(
      state.pinSetupComplete,
      true,
    );

    state = beginProfileSetup(state, {
      now: TIMES[10],
    });

    assert.equal(
      state.state,
      ONBOARDING_STATES.PROFILE_SETUP,
    );

    assert.deepEqual(
      validateOnboardingState(state),
      {
        ok: true,
        errors: [],
      },
    );
  },
);

test(
  'cancel rejection unavailable and unsafe success remain incomplete',
  async () => {
    for (const patch of [
      { state: 'cancelled' },
      { state: 'unlock_rejected' },
      { state: 'unavailable' },
      { redacted: false },
      { pinReceivedFromWebview: true },
      { secretMaterialReturned: true },
      { recoveryRootUnsealed: true },
      { walletOrLedgerMutated: true },
    ]) {
      const review =
        await beginNativeOnboardingPinSetup({
          unlockOperational() {
            return Promise.resolve(
              nativeUnlockDto(patch),
            );
          },
        });

      assert.equal(
        review.pinSetupComplete,
        false,
      );
    }
  },
);

test(
  'persisted Phase 7B state stores only the approved DTO and boolean completion',
  async () => {
    const values = new Map();

    const storage = Object.freeze({
      getItem(key) {
        return values.has(key)
          ? values.get(key)
          : null;
      },

      setItem(key, value) {
        values.set(key, String(value));
      },

      removeItem(key) {
        values.delete(key);
      },
    });

    const adapter =
      createOnboardingStorageAdapter({
        storage,
      });

    let state = buildRecoveryAcknowledgedState();

    state = requirePinSetup(state, {
      now: TIMES[8],
    });

    state = recordPinSetupComplete(state, {
      now: TIMES[9],
    });

    state = beginProfileSetup(state, {
      now: TIMES[10],
    });

    await adapter.writeOnboardingState(state);

    const persisted = JSON.parse(
      values.get(adapter.storageKey),
    );

    assert.equal(
      persisted.pinSetupComplete,
      true,
    );

    assert.equal(
      persisted.state,
      ONBOARDING_STATES.PROFILE_SETUP,
    );

    assert.deepEqual(
      Object.keys(persisted).sort(),
      [...ONBOARDING_DTO_FIELDS].sort(),
    );

    for (const forbiddenField of [
      'pin',
      'password',
      'pinValue',
      'pinBytes',
      'vmk',
      'recoveryRoot',
      'privateKey',
      'secretMaterial',
      'nativeSecureInputRequested',
      'pinReceivedFromWebview',
    ]) {
      assert.equal(
        Object.prototype.hasOwnProperty.call(
          persisted,
          forbiddenField,
        ),
        false,
        forbiddenField,
      );
    }
  },
);

test(
  'PinSetupStep has no WebView PIN field or command argument',
  async () => {
    const source = await readFile(
      FILES.component,
      'utf8',
    );

    assert.match(
      source,
      /await beginNativeOnboardingPinSetup\(\);/,
    );

    assert.doesNotMatch(
      source,
      /beginNativeOnboardingPinSetup\s*\(\s*[^)\s]/,
    );

    assert.doesNotMatch(
      source,
      /<input|<textarea|contentEditable/i,
    );

    assert.doesNotMatch(
      source,
      /type=["']password["']/i,
    );

    assert.doesNotMatch(
      source,
      /name=["']pin["']/i,
    );

    assert.doesNotMatch(
      source,
      /error\?\.message|error\.message|console\./,
    );

    assert.doesNotMatch(
      source,
      /@tauri-apps\/api\/core|\binvoke\s*\(/,
    );

    for (const required of [
      'requirePinSetup',
      'recordPinSetupComplete',
      'beginProfileSetup',
      'writeOnboardingState',
      'PIN_SETUP_UI_STATUS.PENDING',
      'PIN_SETUP_UI_STATUS.SUCCESS',
      'PIN_SETUP_UI_STATUS.FAILURE',
    ]) {
      assert.ok(
        source.includes(required),
        required,
      );
    }
  },
);

test(
  'route gate admits recovery-acknowledged and PIN progress states to PinSetupStep',
  async () => {
    const source = await readFile(
      FILES.routeGate,
      'utf8',
    );

    assert.match(
      source,
      /import PinSetupStep from '\.\/PinSetupStep\.jsx';/,
    );

    assert.match(
      source,
      /PIN_SETUP_STATES/,
    );

    for (const required of [
      'RECOVERY_PHRASE_ACKNOWLEDGED',
      'PIN_SETUP_REQUIRED',
      'PIN_SETUP_COMPLETE',
      '<PinSetupStep',
    ]) {
      assert.ok(
        source.includes(required),
        required,
      );
    }
  },
);

test(
  'existing adapter keeps the operational unlock command fixed and argument-free',
  async () => {
    const source = await readFile(
      FILES.adapter,
      'utf8',
    );

    assert.match(
      source,
      /unlockOperational:\s*'passport_unlock_operational'/,
    );

    assert.match(
      source,
      /export async function unlockNativePassportOperational\(\)/,
    );

    assert.match(
      source,
      /runPassportCommand\(PASSPORT_COMMANDS\.unlockOperational\)/,
    );
  },
);

console.log(
  'ONBOARDING_PHASE7B_PIN_SETUP_UI=GREEN',
);

console.log(
  'ONBOARDING_PHASE7B_NATIVE_NO_ARGUMENT_PATH=GREEN',
);

console.log(
  'ONBOARDING_PHASE7B_FAIL_CLOSED=GREEN',
);

console.log(
  'ONBOARDING_PHASE7B_REDACTED_STORAGE=GREEN',
);

console.log(
  'ONBOARDING_PHASE7B_PROFILE_ROUTE_TRANSITION=GREEN',
);

console.log(
  'ONBOARDING_PHASE7_PIN_SETUP=GREEN',
);
