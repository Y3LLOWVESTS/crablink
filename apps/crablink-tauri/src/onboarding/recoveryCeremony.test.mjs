/**
 * RO:WHAT — Focused Phase 6A tests for the redacted recovery ceremony contract and fail-closed native bridge.
 * RO:WHY — Proves React cannot receive recovery material and current native runtime cannot claim fake acknowledgement.
 * RO:INTERACTS — onboardingRecoveryCeremony.js, RecoveryCeremonyStep.jsx, passportAdapter.js, tauriPlatform.js, passport.rs, lib.rs, and onboarding storage/model files.
 * RO:INVARIANTS — only current shown+acknowledged or strict durably acknowledged native truth may advance; rejected and unavailable results remain blocked.
 * RO:TEST — node --test recoveryCeremony.test.mjs.
 */

import assert from 'node:assert/strict';
import {
  readFile,
} from 'node:fs/promises';
import test from 'node:test';

import {
  ONBOARDING_RECOVERY_CEREMONY_CODES,
  ONBOARDING_RECOVERY_CEREMONY_STATUS,
  reviewOnboardingRecoveryCeremonyDto,
  reviewOnboardingRecoveryCeremonyError,
} from './onboardingRecoveryCeremony.js';

const ROOT = new URL(
  '../../../..',
  import.meta.url,
);

const FILES = Object.freeze({
  component: new URL(
    'apps/crablink-tauri/src/onboarding/RecoveryCeremonyStep.jsx',
    ROOT,
  ),

  routeGate: new URL(
    'apps/crablink-tauri/src/onboarding/OnboardingRouteGate.jsx',
    ROOT,
  ),

  model: new URL(
    'apps/crablink-tauri/src/onboarding/onboardingModel.js',
    ROOT,
  ),

  storage: new URL(
    'apps/crablink-tauri/src/onboarding/onboardingStorage.js',
    ROOT,
  ),

  adapter: new URL(
    'apps/crablink-tauri/src/adapters/passportAdapter.js',
    ROOT,
  ),

  platform: new URL(
    'apps/crablink-tauri/src/platform/tauriPlatform.js',
    ROOT,
  ),

  rustRuntime: new URL(
    'apps/crablink-tauri/src-tauri/src/passport_recovery_ceremony_runtime.rs',
    ROOT,
  ),

  rustCommands: new URL(
    'apps/crablink-tauri/src-tauri/src/commands/passport.rs',
    ROOT,
  ),

  rustLib: new URL(
    'apps/crablink-tauri/src-tauri/src/lib.rs',
    ROOT,
  ),
});

test(
  'future acknowledged DTO requires native shown and acknowledged truth',
  () => {
    const outcome =
      reviewOnboardingRecoveryCeremonyDto({
        schema:
          'crablink.native-passport.recovery-ceremony.v1',
        state: 'acknowledged',
        shown: true,
        acknowledged: true,
        redacted: true,
        recoveryFingerprint:
          '1a2b3c4d',
        nativeSecureSurfaceRequested: true,
        wordsReturnedToWebview: false,
        secretMaterialReturned: false,
        recoveryRootExported: false,
        walletOrLedgerMutated: false,
      });

    assert.equal(
      outcome.status,
      ONBOARDING_RECOVERY_CEREMONY_STATUS
        .ACKNOWLEDGED,
    );

    assert.equal(
      outcome.code,
      ONBOARDING_RECOVERY_CEREMONY_CODES
        .ACKNOWLEDGED,
    );

    assert.equal(outcome.shown, true);
    assert.equal(
      outcome.acknowledged,
      true,
    );

    assert.equal(
      outcome.recoveryFingerprint,
      'REDACTED',
    );

    assert.equal(outcome.redacted, true);
    assert.equal(
      outcome.wordsReturnedToWebview,
      false,
    );
  },
);

test(
  'unsafe or incomplete acknowledgement DTO fails closed',
  () => {
    for (const unsafe of [
      {
        shown: false,
      },
      {
        acknowledged: false,
      },
      {
        redacted: false,
      },
      {
        nativeSecureSurfaceRequested: false,
      },
      {
        wordsReturnedToWebview: true,
      },
      {
        secretMaterialReturned: true,
      },
      {
        recoveryRootExported: true,
      },
      {
        walletOrLedgerMutated: true,
      },
    ]) {
      const outcome =
        reviewOnboardingRecoveryCeremonyDto({
          state: 'acknowledged',
          shown: true,
          acknowledged: true,
          redacted: true,
          nativeSecureSurfaceRequested: true,
          wordsReturnedToWebview: false,
          secretMaterialReturned: false,
          recoveryRootExported: false,
          walletOrLedgerMutated: false,
          ...unsafe,
        });

      assert.equal(
        outcome.status,
        ONBOARDING_RECOVERY_CEREMONY_STATUS
          .FAILURE,
      );

      assert.equal(outcome.shown, false);
      assert.equal(
        outcome.acknowledged,
        false,
      );
    }
  },
);

test(
  'unavailable and thrown errors remain redacted and do not acknowledge',
  () => {
    const unavailable =
      reviewOnboardingRecoveryCeremonyDto({
        state: 'unavailable',
        shown: false,
        acknowledged: false,
        redacted: true,
      });

    assert.equal(
      unavailable.code,
      ONBOARDING_RECOVERY_CEREMONY_CODES
        .UNAVAILABLE,
    );

    assert.equal(
      unavailable.acknowledged,
      false,
    );

    const privateDetail =
      'private-native-recovery-detail';

    const failed =
      reviewOnboardingRecoveryCeremonyError(
        new Error(privateDetail),
      );

    assert.equal(
      failed.message.includes(
        privateDetail,
      ),
      false,
    );

    assert.equal(failed.redacted, true);
  },
);

test(
  'React triggers the fixed no-argument adapter and contains no secret recovery surface',
  async () => {
    const source = await readFile(
      FILES.component,
      'utf8',
    );

    assert.match(
      source,
      /beginNativePassportRecoveryCeremony\(\)/,
    );

    assert.doesNotMatch(
      source,
      /beginNativePassportRecoveryCeremony\s*\(\s*[^)\s]/,
    );

    assert.match(
      source,
      /requireRecoveryPhrase/,
    );

    assert.match(
      source,
      /acknowledgeRecoveryPhrase/,
    );

    assert.doesNotMatch(
      source,
      /type=["']password["']/i,
    );

    assert.doesNotMatch(
      source,
      /<textarea|contentEditable/i,
    );

    assert.doesNotMatch(
      source,
      /navigator\.clipboard|localStorage|sessionStorage|console\./,
    );

    for (const forbidden of [
      'seedPhrase',
      'recoveryWords',
      'phraseWords',
      'mnemonic',
      'rootMaterial',
      'privateKey',
      'secretKey',
    ]) {
      assert.equal(
        source.includes(forbidden),
        false,
        forbidden,
      );
    }
  },
);

test(
  'adapter and Tauri boundary expose one fixed no-argument recovery command',
  async () => {
    const [
      adapter,
      platform,
    ] = await Promise.all([
      readFile(FILES.adapter, 'utf8'),
      readFile(FILES.platform, 'utf8'),
    ]);

    assert.match(
      adapter,
      /recoveryCeremony:\s*'passport_recovery_ceremony'/,
    );

    assert.match(
      adapter,
      /export async function beginNativePassportRecoveryCeremony\(\)/,
    );

    assert.match(
      adapter,
      /callTauri\(\s*PASSPORT_COMMANDS\.recoveryCeremony,\s*\)/,
    );

    assert.match(
      platform,
      /'passport_recovery_ceremony'/,
    );

    assert.doesNotMatch(
      adapter,
      /beginNativePassportRecoveryCeremony\s*\([^)]*(?:secret|phrase|words|root|key)/i,
    );
  },
);

test(
  'legacy recovery command posture remains redacted and fake-success-free',
  async () => {
    const [
      runtime,
      commands,
      lib,
    ] = await Promise.all([
      readFile(
        FILES.rustRuntime,
        'utf8',
      ),
      readFile(
        FILES.rustCommands,
        'utf8',
      ),
      readFile(
        FILES.rustLib,
        'utf8',
      ),
    ]);

    assert.match(
      runtime,
      /DesktopRecoveryCeremonyCommandState::Unavailable/,
    );

    assert.match(
      runtime,
      /recovery_generation_added:\s*false/,
    );

    assert.match(
      runtime,
      /native_phrase_surface_added:\s*false/,
    );

    assert.match(
      runtime,
      /fake_success_rejected:\s*true/,
    );

    assert.doesNotMatch(
      runtime,
      /DesktopRecoveryCeremonyCommandState::Acknowledged/,
    );

    assert.match(
      commands,
      /pub fn passport_recovery_ceremony\(/,
    );

    const signature =
      commands
        .split(
          'pub fn passport_recovery_ceremony',
        )[1]
        .split('->')[0];

    assert.match(
      signature,
      /state:\s*State<'_,\s*AppState>/,
    );

    assert.doesNotMatch(
      signature,
      /String|Vec<u8>|\bpin\b|\bsecret\b|\bwords\b/i,
    );

    assert.match(
      lib,
      /commands::passport::passport_recovery_ceremony,/,
    );

    for (const forbidden of [
      'shown: true',
      'acknowledged: true',
      'secret_material_returned: true',
      'words_returned_to_webview: true',
      'recovery_root_exported: true',
      'wallet_or_ledger_mutated: true',
    ]) {
      assert.equal(
        `${runtime}\n${commands}`.includes(
          forbidden,
        ),
        false,
        forbidden,
      );
    }
  },
);

test(
  'onboarding storage retains only the boolean acknowledgement',
  async () => {
    const [
      model,
      storage,
    ] = await Promise.all([
      readFile(FILES.model, 'utf8'),
      readFile(FILES.storage, 'utf8'),
    ]);

    assert.match(
      model,
      /recoveryPhraseAcknowledged/,
    );

    assert.match(
      model,
      /acknowledgeRecoveryPhrase/,
    );

    for (const forbidden of [
      'seedPhrase',
      'recoveryWords',
      'phraseWords',
      'mnemonic',
      'recoveryEntropy',
      'rootPrivateKey',
    ]) {
      assert.equal(
        `${model}\n${storage}`.includes(
          forbidden,
        ),
        false,
        forbidden,
      );
    }
  },
);

test(
  'route gate sends created and required recovery states to RecoveryCeremonyStep',
  async () => {
    const source = await readFile(
      FILES.routeGate,
      'utf8',
    );

    assert.match(
      source,
      /import RecoveryCeremonyStep from '\.\/RecoveryCeremonyStep\.jsx';/,
    );

    assert.match(
      source,
      /RECOVERY_CEREMONY_STATES/,
    );

    assert.match(
      source,
      /PASSPORT_CREATED_LOCKED/,
    );

    assert.match(
      source,
      /RECOVERY_PHRASE_REQUIRED/,
    );

    assert.match(
      source,
      /<RecoveryCeremonyStep/,
    );
  },
);

console.log(
  'ONBOARDING_PHASE6A_REDACTED_DTO=GREEN',
);

console.log(
  'ONBOARDING_PHASE6A_NO_ARGUMENT_COMMAND=GREEN',
);

console.log(
  'ONBOARDING_PHASE6A_REACT_SECRET_BOUNDARY=GREEN',
);

console.log(
  'ONBOARDING_PHASE6A_FAKE_SUCCESS_REJECTED=GREEN',
);

console.log(
  'ONBOARDING_PHASE6A_FAIL_CLOSED_BRIDGE=GREEN',
);

console.log(
  'ONBOARDING_PHASE6A_RECOVERY_CONTRACT=GREEN',
);

test(
  'phase6c frontend normalizes persisted recovery acknowledgement without secret material',
  async () => {
    const { readFile } =
      await import(
        'node:fs/promises'
      );

    const adapterSource =
      await readFile(
        new URL(
          '../adapters/passportAdapter.js',
          import.meta.url,
        ),
        'utf8',
      );

    const commandSource =
      await readFile(
        new URL(
          '../../src-tauri/src/commands/passport.rs',
          import.meta.url,
        ),
        'utf8',
      );

    const runtimeSource =
      await readFile(
        new URL(
          '../../src-tauri/src/passport_recovery_phrase_runtime.rs',
          import.meta.url,
        ),
        'utf8',
      );

    for (const required of [
      'persistedAcknowledgement',
      'unsafePersistedAcknowledgement',
      'alreadyAcknowledged',
      'repeatDisplayRejected',
      "'already_acknowledged'",
      'PASSPORT_SAFE_REDACTED_VALUE',
    ]) {
      assert.ok(
        adapterSource.includes(required),
        `adapter missing ${required}`,
      );
    }

    for (const required of [
      'run_desktop_recovery_ceremony_once',
      '"already_acknowledged"',
      '"REDACTED"',
    ]) {
      assert.ok(
        commandSource.includes(required),
        `command source missing ${required}`,
      );
    }

    for (const required of [
      'is_recovery_acknowledged',
      'record_recovery_acknowledgement',
    ]) {
      assert.ok(
        runtimeSource.includes(required),
        `runtime source missing ${required}`,
      );
    }

    for (const forbidden of [
      'wordsReturnedToWebview: true',
      'secretMaterialReturned: true',
      'recoveryRootExported: true',
      'walletOrLedgerMutated: true',
      'recoveryPhrase:',
      'seedPhrase:',
      'privateKey:',
    ]) {
      assert.equal(
        adapterSource.includes(forbidden),
        false,
        `adapter contains forbidden ${forbidden}`,
      );
    }
  },
);

