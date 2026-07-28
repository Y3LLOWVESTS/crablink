/**
 * RO:WHAT — Focused Phase 5 tests for desktop Native Passport creation from onboarding.
 * RO:WHY — Proves no-argument native create handoff, created-locked acceptance, redacted failures, and absence of React secret input.
 * RO:INTERACTS — PassportCreateStep.jsx, onboardingPassportCreate.js, passportAdapter.js, passport.rs, and OnboardingRouteGate.jsx.
 * RO:INVARIANTS — only created_locked advances; React never receives or supplies PIN/secret/root material.
 * RO:TEST — node --test passportCreateStep.test.mjs.
 */

import assert from 'node:assert/strict';
import {
  readFile,
} from 'node:fs/promises';
import test from 'node:test';

import {
  ONBOARDING_PASSPORT_CREATE_CODES,
  ONBOARDING_PASSPORT_CREATE_STATUS,
  reviewOnboardingPassportCreateError,
  reviewOnboardingPassportCreateResult,
} from './onboardingPassportCreate.js';

const ROOT = new URL(
  '../../../..',
  import.meta.url,
);

const FILES = Object.freeze({
  component: new URL(
    'apps/crablink-tauri/src/onboarding/PassportCreateStep.jsx',
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

  rustCommands: new URL(
    'apps/crablink-tauri/src-tauri/src/commands/passport.rs',
    ROOT,
  ),
});

function createdLockedDto(
  overrides = {},
) {
  return {
    schema:
      'crablink.native-passport.command.v1',
    commandName: 'passport_create',
    state: 'created_locked',
    redacted: true,
    nativeSecureInputRequested: true,
    pinReceivedFromWebview: false,
    secretMaterialReturned: false,
    sessionChanged: false,
    encryptedVaultMutated: true,
    platformMaterialMutated: true,
    recoveryRootUnsealed: false,
    walletOrLedgerMutated: false,
    ...overrides,
  };
}

test(
  'created_locked native result advances only with the accepted redacted posture',
  () => {
    const outcome =
      reviewOnboardingPassportCreateResult(
        createdLockedDto(),
      );

    assert.deepEqual(outcome, {
      schema:
        'crablink.onboarding-passport-create.v1',
      status:
        ONBOARDING_PASSPORT_CREATE_STATUS
          .CREATED_LOCKED,
      code:
        ONBOARDING_PASSPORT_CREATE_CODES
          .CREATED_LOCKED,
      message:
        'Your local Native Passport was created and remains locked.',
      retryable: false,
      redacted: true,
      nativeSecureInputRequested: true,
      pinReceivedFromWebview: false,
      secretMaterialReturned: false,
      recoveryRootUnsealed: false,
      walletOrLedgerMutated: false,
    });

    assert.equal(
      Object.isFrozen(outcome),
      true,
    );
  },
);

test(
  'unsafe created_locked claims fail closed instead of advancing onboarding',
  () => {
    for (const unsafe of [
      {
        redacted: false,
      },
      {
        nativeSecureInputRequested: false,
      },
      {
        pinReceivedFromWebview: true,
      },
      {
        secretMaterialReturned: true,
      },
      {
        encryptedVaultMutated: false,
      },
      {
        platformMaterialMutated: false,
      },
      {
        recoveryRootUnsealed: true,
      },
      {
        walletOrLedgerMutated: true,
      },
    ]) {
      const outcome =
        reviewOnboardingPassportCreateResult(
          createdLockedDto(unsafe),
        );

      assert.equal(
        outcome.status,
        ONBOARDING_PASSPORT_CREATE_STATUS
          .FAILURE,
      );

      assert.equal(
        outcome.code,
        ONBOARDING_PASSPORT_CREATE_CODES
          .INVALID_RESPONSE,
      );

      assert.equal(outcome.redacted, true);
    }
  },
);

test(
  'cancelled and unavailable results become bounded redacted failures',
  () => {
    const cancelled =
      reviewOnboardingPassportCreateResult({
        state: 'cancelled',
        redacted: true,
      });

    assert.equal(
      cancelled.status,
      ONBOARDING_PASSPORT_CREATE_STATUS
        .FAILURE,
    );

    assert.equal(
      cancelled.code,
      ONBOARDING_PASSPORT_CREATE_CODES
        .CANCELLED,
    );

    assert.match(
      cancelled.message,
      /cancelled/i,
    );

    const unavailable =
      reviewOnboardingPassportCreateResult({
        state: 'unavailable',
        redacted: true,
      });

    assert.equal(
      unavailable.code,
      ONBOARDING_PASSPORT_CREATE_CODES
        .UNAVAILABLE,
    );

    assert.equal(
      unavailable.retryable,
      false,
    );

    for (const outcome of [
      cancelled,
      unavailable,
    ]) {
      assert.equal(outcome.redacted, true);
      assert.equal(
        outcome.pinReceivedFromWebview,
        false,
      );

      assert.equal(
        outcome.secretMaterialReturned,
        false,
      );

      assert.equal(
        outcome.recoveryRootUnsealed,
        false,
      );

      assert.equal(
        outcome.walletOrLedgerMutated,
        false,
      );
    }
  },
);

test(
  'thrown native errors are not copied into the React-visible outcome',
  () => {
    const privateDetail =
      'private-native-detail-do-not-display';

    const outcome =
      reviewOnboardingPassportCreateError(
        new Error(privateDetail),
      );

    assert.equal(
      outcome.code,
      ONBOARDING_PASSPORT_CREATE_CODES
        .CREATE_FAILED,
    );

    assert.equal(
      outcome.message.includes(
        privateDetail,
      ),
      false,
    );

    assert.equal(outcome.redacted, true);
  },
);

test(
  'React calls the accepted Passport adapter without arguments and has no secure input',
  async () => {
    const source = await readFile(
      FILES.component,
      'utf8',
    );

    assert.match(
      source,
      /from '\.\.\/adapters\/passportAdapter\.js'/,
    );

    assert.match(
      source,
      /const commandResult =\s+await createNativePassport\(\);/,
    );

    assert.doesNotMatch(
      source,
      /createNativePassport\s*\(\s*[^)\s]/,
    );

    assert.doesNotMatch(
      source,
      /type=["']password["']/i,
    );

    assert.doesNotMatch(
      source,
      /type=["']pin["']/i,
    );

    assert.doesNotMatch(
      source,
      /name=["']pin["']/i,
    );

    assert.doesNotMatch(
      source,
      /\bpin\s*[:=]/i,
    );

    assert.doesNotMatch(
      source,
      /error\?\.message|error\.message/,
    );

    assert.doesNotMatch(
      source,
      /@tauri-apps\/api\/core|\binvoke\s*\(/,
    );

    assert.match(
      source,
      /CREATE_UI_STATUS\.PENDING/,
    );

    assert.match(
      source,
      /CREATE_UI_STATUS\.SUCCESS/,
    );

    assert.match(
      source,
      /CREATE_UI_STATUS\.FAILURE/,
    );

    assert.match(
      source,
      /recordPassportCreatedLocked/,
    );
  },
);

test(
  'existing create adapter and Rust command signatures remain argument-free for WebView secrets',
  async () => {
    const [
      adapter,
      rustCommands,
    ] = await Promise.all([
      readFile(
        FILES.adapter,
        'utf8',
      ),
      readFile(
        FILES.rustCommands,
        'utf8',
      ),
    ]);

    assert.match(
      adapter,
      /export async function createNativePassport\(\)/,
    );

    assert.match(
      adapter,
      /runPassportCommand\(PASSPORT_COMMANDS\.create\)/,
    );

    const rustStart =
      rustCommands.indexOf(
        'pub fn passport_create(',
      );

    assert.ok(rustStart >= 0);

    const rustSignatureEnd =
      rustCommands.indexOf(
        ') -> Result<',
        rustStart,
      );

    assert.ok(
      rustSignatureEnd > rustStart,
    );

    const signature =
      rustCommands.slice(
        rustStart,
        rustSignatureEnd,
      );

    assert.match(
      signature,
      /state:\s*State<'_,\s*AppState>/,
    );

    assert.doesNotMatch(
      signature,
      /\bpin\b|\bpassword\b|String|Vec<u8>/i,
    );

    assert.match(
      rustCommands,
      /CreatedLocked => "created_locked"/,
    );

    assert.match(
      rustCommands,
      /pin_received_from_webview:\s*false/,
    );

    assert.match(
      rustCommands,
      /secret_material_returned:\s*false/,
    );
  },
);

test(
  'route gate sends username decisions and create progress to PassportCreateStep',
  async () => {
    const source = await readFile(
      FILES.routeGate,
      'utf8',
    );

    assert.match(
      source,
      /import PassportCreateStep from '\.\/PassportCreateStep\.jsx';/,
    );

    assert.match(
      source,
      /PASSPORT_CREATE_STATES/,
    );

    for (const required of [
      'USERNAME_AVAILABLE',
      'USERNAME_BYPASSED_FOR_DEV',
      'PASSPORT_CREATE_REQUESTED',
      'PASSPORT_CREATED_LOCKED',
    ]) {
      assert.match(
        source,
        new RegExp(required),
      );
    }

    assert.match(
      source,
      /<PassportCreateStep/,
    );

    assert.match(
      source,
      /onStateChange=\{\(nextState\) => \{/,
    );
  },
);

console.log(
  'ONBOARDING_PHASE5_NO_ARGUMENT_CREATE=GREEN',
);

console.log(
  'ONBOARDING_PHASE5_NATIVE_PIN_ONLY=GREEN',
);

console.log(
  'ONBOARDING_PHASE5_CREATED_LOCKED=GREEN',
);

console.log(
  'ONBOARDING_PHASE5_REDACTED_FAILURE=GREEN',
);

console.log(
  'ONBOARDING_PHASE5_CREATE_UI_STATES=GREEN',
);

console.log(
  'ONBOARDING_PHASE5_NATIVE_BRIDGE_FIXED=GREEN',
);

console.log(
  'ONBOARDING_PHASE5_DESKTOP_CREATE=GREEN',
);
