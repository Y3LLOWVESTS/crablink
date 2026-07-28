import assert from 'node:assert/strict';
import test from 'node:test';

import {
  beginNativeOnboardingPinSetup,
  PIN_SETUP_REVIEW_STATES,
  reviewNativeOnboardingPinSetupCommand,
} from './onboardingPinSetup.js';
import {
  PASSPORT_COMMANDS,
} from '../adapters/passportAdapter.js';

function baseUnlockCommand(patch = {}) {
  return {
    schema:
      'crablink.native-passport.command.v1',
    commandName:
      PASSPORT_COMMANDS.unlockOperational,
    sourcePhaseLabel:
      'NATIVE_PASSPORT_PHASE15T_OPERATIONAL_UNLOCK_COMMAND',
    state:
      'operational_unlocked',
    redacted: true,
    nativeSecureInputRequested: true,
    pinReceivedFromWebview: false,
    secretMaterialReturned: false,
    sessionChanged: true,
    encryptedVaultMutated: false,
    platformMaterialMutated: false,
    recoveryRootUnsealed: false,
    walletOrLedgerMutated: false,
    ...patch,
  };
}

test(
  'phase7a native PIN setup accepts only native operational unlock success',
  () => {
    const review =
      reviewNativeOnboardingPinSetupCommand(
        baseUnlockCommand(),
      );

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

    assert.equal(
      review.secretMaterialReturned,
      false,
    );

    assert.equal(
      review.recoveryRootUnsealed,
      false,
    );

    assert.equal(
      review.walletOrLedgerMutated,
      false,
    );
  },
);

test(
  'phase7a already unlocked state completes without another native prompt',
  () => {
    const review =
      reviewNativeOnboardingPinSetupCommand(
        baseUnlockCommand({
          state: 'already_unlocked',
          nativeSecureInputRequested: false,
          sessionChanged: false,
        }),
      );

    assert.equal(
      review.state,
      PIN_SETUP_REVIEW_STATES
        .ALREADY_COMPLETE,
    );

    assert.equal(
      review.pinSetupComplete,
      true,
    );

    assert.equal(
      review.nativeSecureInputRequested,
      false,
    );
  },
);

test(
  'phase7a cancelled rejected unavailable and no-passport states fail closed',
  () => {
    const cases = [
      ['cancelled', PIN_SETUP_REVIEW_STATES.CANCELLED],
      ['unlock_rejected', PIN_SETUP_REVIEW_STATES.REJECTED],
      ['unavailable', PIN_SETUP_REVIEW_STATES.UNAVAILABLE],
      ['no_passport', PIN_SETUP_REVIEW_STATES.NO_PASSPORT],
    ];

    for (const [state, expected] of cases) {
      const review =
        reviewNativeOnboardingPinSetupCommand(
          baseUnlockCommand({
            state,
            nativeSecureInputRequested:
              state !== 'no_passport',
            sessionChanged: false,
          }),
        );

      assert.equal(review.state, expected);
      assert.equal(
        review.pinSetupComplete,
        false,
      );
      assert.equal(
        review.pinReceivedFromWebview,
        false,
      );
      assert.equal(
        review.secretMaterialReturned,
        false,
      );
      assert.equal(
        review.recoveryRootUnsealed,
        false,
      );
    }
  },
);

test(
  'phase7a unsafe success claims fail closed',
  () => {
    const unsafeCases = [
      {
        pinReceivedFromWebview: true,
      },
      {
        secretMaterialReturned: true,
      },
      {
        recoveryRootUnsealed: true,
      },
      {
        walletOrLedgerMutated: true,
      },
      {
        redacted: false,
      },
      {
        nativeSecureInputRequested: false,
      },
      {
        commandName: 'passport_unlock_root',
      },
    ];

    for (const patch of unsafeCases) {
      const review =
        reviewNativeOnboardingPinSetupCommand(
          baseUnlockCommand(patch),
        );

      assert.equal(
        review.pinSetupComplete,
        false,
      );

      assert.equal(
        review.state,
        PIN_SETUP_REVIEW_STATES.UNAVAILABLE,
      );
    }
  },
);

test(
  'phase7a begin function calls fixed no-argument native unlock adapter',
  async () => {
    const calls = [];

    const review =
      await beginNativeOnboardingPinSetup({
        unlockOperational() {
          calls.push(arguments.length);

          return Promise.resolve(
            baseUnlockCommand(),
          );
        },
      });

    assert.deepEqual(calls, [0]);

    assert.equal(
      review.pinSetupComplete,
      true,
    );
  },
);

test(
  'phase7a source boundary has no React PIN field argument or secret material',
  async () => {
    const { readFile } =
      await import('node:fs/promises');

    const source =
      await readFile(
        new URL(
          './onboardingPinSetup.js',
          import.meta.url,
        ),
        'utf8',
      );

    const adapterSource =
      await readFile(
        new URL(
          '../adapters/passportAdapter.js',
          import.meta.url,
        ),
        'utf8',
      );

    const rustCommandSource =
      await readFile(
        new URL(
          '../../src-tauri/src/commands/passport.rs',
          import.meta.url,
        ),
        'utf8',
      );

    for (const required of [
      'unlockNativePassportOperational',
      'PASSPORT_COMMANDS.unlockOperational',
      'pinReceivedFromWebview === false',
      'secretMaterialReturned === false',
      'recoveryRootUnsealed === false',
      'walletOrLedgerMutated === false',
    ]) {
      assert.ok(
        source.includes(required),
        `PIN setup source missing ${required}`,
      );
    }

    for (const forbidden of [
      'pin: ""',
      'pin: null',
      'password:',
      'recoveryPhrase:',
      'seedPhrase:',
      'privateKey:',
      'default answer',
      'hidden answer',
    ]) {
      assert.equal(
        source.includes(forbidden),
        false,
        `PIN setup source contains forbidden ${forbidden}`,
      );
    }

    assert.ok(
      adapterSource.includes(
        "unlockOperational: 'passport_unlock_operational'",
      ),
    );

    assert.ok(
      rustCommandSource.includes(
        'pub fn passport_unlock_operational',
      ),
    );

    for (const required of [
      'pin_received_from_webview: false',
      'secret_material_returned: false',
      'recovery_root_unsealed: false',
      'wallet_or_ledger_mutated: false',
    ]) {
      assert.ok(
        rustCommandSource.includes(required),
        `Rust command source missing ${required}`,
      );
    }

    for (const forbidden of [
      'pin: String',
      'pin: Vec',
      'password: String',
      'pin_received_from_webview: true',
      'secret_material_returned: true',
      'recovery_root_unsealed: true',
      'wallet_or_ledger_mutated: true',
    ]) {
      assert.equal(
        rustCommandSource.includes(forbidden),
        false,
        `Rust command source contains forbidden ${forbidden}`,
      );
    }
  },
);
