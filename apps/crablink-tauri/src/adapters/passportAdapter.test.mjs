import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = path.resolve(new URL('../../../..', import.meta.url).pathname);
const ADAPTER = path.join(
  ROOT,
  'apps/crablink-tauri/src/adapters/passportAdapter.js',
);
const TAURI_PLATFORM = path.join(
  ROOT,
  'apps/crablink-tauri/src/platform/tauriPlatform.js',
);

function readRequired(file) {
  return fs.readFileSync(file, 'utf8');
}

function stripJsComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

function functionBody(source, functionName) {
  const marker = `export async function ${functionName}`;
  const start = source.indexOf(marker);

  assert.notEqual(start, -1, `${functionName} must exist`);

  const open = source.indexOf('{', start);
  assert.notEqual(open, -1, `${functionName} opening brace must exist`);

  let depth = 0;

  for (let index = open; index < source.length; index += 1) {
    const char = source[index];

    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;

      if (depth === 0) {
        return source.slice(start, index + 1);
      }
    }
  }

  throw new Error(`${functionName} body was not bounded`);
}

test('phase15ab adapter uses fixed Tauri Passport command names only', () => {
  const source = readRequired(ADAPTER);

  for (const required of [
    "status: 'passport_status'",
    "create: 'passport_create'",
    "lock: 'passport_lock'",
    "unlockOperational: 'passport_unlock_operational'",
    "unlockRoot: 'passport_unlock_root'",
    "clear: 'passport_clear'",
  ]) {
    assert.match(source, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  for (const functionName of [
    'readNativePassportStatus',
    'createNativePassport',
    'lockNativePassport',
    'unlockNativePassportOperational',
    'confirmNativePassportRoot',
    'clearNativePassport',
  ]) {
    const body = functionBody(source, functionName);

    assert.doesNotMatch(body, /\binvoke\s*\(/);
    assert.doesNotMatch(body, /\bfetch\s*\(/);
    assert.doesNotMatch(body, /\bpin\b\s*[:=]/i);
    assert.doesNotMatch(body, /\bsecret\b\s*[:=]/i);
  }

  assert.match(source, /import\s+\{\s*callTauri\s*\}\s+from\s+['"]\.\.\/platform\/tauriPlatform\.js['"]/);
  assert.doesNotMatch(source, /@tauri-apps\/api\/core/);
  assert.match(readRequired(TAURI_PLATFORM), /\binvoke\s*\(/);
});

test('phase15ab adapter normalizes status as redacted display truth', () => {
  const source = readRequired(ADAPTER);
  const executableSource = stripJsComments(source);

  for (const required of [
    'normalizePassportStatusDto',
    'PASSPORT_SAFE_ABSENT_VALUE',
    'PASSPORT_SAFE_REDACTED_VALUE',
    'passportIdentifier: safePassportDisplayValue(value.passportIdentifier)',
    'deviceIdentifier: safePassportDisplayValue(value.deviceIdentifier)',
    'usernameHandle: safePassportDisplayValue(value.usernameHandle)',
    'capabilityMaterial: safePassportDisplayValue(value.capabilityMaterial)',
    'redacted: value.redacted !== false',
    'readOnly: value.readOnly !== false',
    'unlockPerformed: false',
    'platformSealerAccessed: false',
    'runtimeIoPerformed: false',
    'storageMutated: false',
    'walletOrLedgerMutated: false',
  ]) {
    assert.match(source, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  for (const forbidden of [
    'privateKey',
    'seedPhrase',
    'recoveryWords',
    'vaultBytes',
    'vmk',
    'platformFactor',
    'rawCapability',
  ]) {
    assert.doesNotMatch(executableSource, new RegExp(forbidden, 'i'));
  }
});

test('phase15ab adapter normalizes command DTOs without secret or root claims', () => {
  const source = readRequired(ADAPTER);

  for (const required of [
    'normalizePassportCommandDto',
    'nativeSecureInputRequested: value.nativeSecureInputRequested === true',
    'pinReceivedFromWebview: false',
    'secretMaterialReturned: false',
    'sessionChanged: value.sessionChanged === true',
    'encryptedVaultMutated: value.encryptedVaultMutated === true',
    'platformMaterialMutated: value.platformMaterialMutated === true',
    'recoveryRootUnsealed: false',
    'walletOrLedgerMutated: false',
  ]) {
    assert.match(source, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  for (const forbidden of [
    'pinReceivedFromWebview: true',
    'secretMaterialReturned: true',
    'recoveryRootUnsealed: true',
    'walletOrLedgerMutated: true',
    'rootVmkUnlocked: true',
    'rootFactorUnsealed: true',
  ]) {
    assert.doesNotMatch(source, new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('phase15ab adapter does not expose dynamic command dispatch or authority routes', () => {
  const source = readRequired(ADAPTER);
  const executableSource = stripJsComments(source);

  assert.doesNotMatch(executableSource, /callTauri\s*\(\s*commandName\s*,\s*\{/);
  assert.doesNotMatch(executableSource, /quickchain\/(?:root|proof|checkpoint|validator|settlement|bridge|anchor|finality)/i);
  assert.doesNotMatch(executableSource, /direct[_-]?(?:wallet|ledger)[_-]?mutate/i);
  assert.doesNotMatch(executableSource, /unlock[_-]?paid[_-]?from[_-]?cache/i);
  assert.doesNotMatch(executableSource, /\bwalletClient\b|\bledger\b|\bsolana\b|\brox\b/i);
});

test(
  'phase6c adapter preserves persisted native acknowledgement truth',
  async () => {
    const {
      normalizeRecoveryCeremonyDto,
    } = await import(
      './passportAdapter.js'
    );

    const reviewed =
      normalizeRecoveryCeremonyDto({
        schema:
          'crablink.native-passport.recovery-ceremony.v1',
        commandName:
          'passport_recovery_ceremony',
        sourcePhaseLabel:
          'ONBOARDING_PHASE6B2B2B2_RUNTIME_CLEAR_FOUNDATION',
        state:
          'already_acknowledged',
        shown: false,
        acknowledged: true,
        redacted: true,
        recoveryFingerprint:
          'REDACTED',
        nativeSecureSurfaceRequested:
          false,
        wordsReturnedToWebview: false,
        secretMaterialReturned: false,
        recoveryRootExported: false,
        walletOrLedgerMutated: false,
      });

    assert.equal(
      reviewed.state,
      'already_acknowledged',
    );

    assert.equal(
      reviewed.shown,
      false,
    );

    assert.equal(
      reviewed.acknowledged,
      true,
    );

    assert.equal(
      reviewed.alreadyAcknowledged,
      true,
    );

    assert.equal(
      reviewed.repeatDisplayRejected,
      true,
    );

    assert.equal(
      reviewed.nativeSecureSurfaceRequested,
      false,
    );

    assert.equal(
      reviewed.recoveryFingerprint,
      'REDACTED',
    );

    assert.equal(
      reviewed.wordsReturnedToWebview,
      false,
    );

    assert.equal(
      reviewed.secretMaterialReturned,
      false,
    );

    assert.equal(
      reviewed.recoveryRootExported,
      false,
    );

    assert.equal(
      reviewed.walletOrLedgerMutated,
      false,
    );
  },
);

test(
  'phase6c adapter rejects unsafe persisted acknowledgement truth',
  async () => {
    const {
      normalizeRecoveryCeremonyDto,
    } = await import(
      './passportAdapter.js'
    );

    const safe = {
      schema:
        'crablink.native-passport.recovery-ceremony.v1',
      commandName:
        'passport_recovery_ceremony',
      sourcePhaseLabel:
        'ONBOARDING_PHASE6B2B2B2_RUNTIME_CLEAR_FOUNDATION',
      state:
        'already_acknowledged',
      shown: false,
      acknowledged: true,
      redacted: true,
      recoveryFingerprint:
        'REDACTED',
      nativeSecureSurfaceRequested:
        false,
      wordsReturnedToWebview: false,
      secretMaterialReturned: false,
      recoveryRootExported: false,
      walletOrLedgerMutated: false,
    };

    for (const unsafe of [
      { ...safe, shown: true },
      {
        ...safe,
        acknowledged: false,
      },
      { ...safe, redacted: false },
      {
        ...safe,
        recoveryFingerprint:
          'ABSENT',
      },
      {
        ...safe,
        nativeSecureSurfaceRequested:
          true,
      },
      {
        ...safe,
        wordsReturnedToWebview:
          true,
      },
      {
        ...safe,
        secretMaterialReturned:
          true,
      },
      {
        ...safe,
        recoveryRootExported:
          true,
      },
      {
        ...safe,
        walletOrLedgerMutated:
          true,
      },
    ]) {
      const reviewed =
        normalizeRecoveryCeremonyDto(
          unsafe,
        );

      assert.equal(
        reviewed.state,
        'unavailable',
      );

      assert.equal(
        reviewed.shown,
        false,
      );

      assert.equal(
        reviewed.acknowledged,
        false,
      );

      assert.equal(
        reviewed.alreadyAcknowledged,
        false,
      );

      assert.equal(
        reviewed.repeatDisplayRejected,
        false,
      );

      assert.equal(
        reviewed.recoveryFingerprint,
        'ABSENT',
      );
    }
  },
);

