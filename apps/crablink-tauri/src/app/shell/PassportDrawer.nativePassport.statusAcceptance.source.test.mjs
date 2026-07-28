import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = path.resolve(new URL('../../../../..', import.meta.url).pathname);
const DRAWER = path.join(
  ROOT,
  'apps/crablink-tauri/src/app/shell/PassportDrawer.jsx',
);
const ADAPTER = path.join(
  ROOT,
  'apps/crablink-tauri/src/adapters/passportAdapter.js',
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
  const marker = `function ${functionName}`;
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

test('phase15ad drawer renders native status and command truth sections', () => {
  const source = readRequired(DRAWER);

  for (const required of [
    'NATIVE_PASSPORT_PHASE15AD_DRAWER_NATIVE_STATUS_ACCEPTANCE',
    'nativePassportStatusRows',
    'nativePassportCommandRows',
    'nativePassportStatusRowsFromDto',
    'nativePassportCommandRowsFromDto',
    'Native Passport status truth',
    'Last native command truth',
    'Status DTO schema',
    'Command DTO schema',
    'Redacted',
    'Read only',
    'Native runtime ready',
    'Passport identifier',
    'Device identifier',
    'Username handle',
    'Capability material',
    'Unsafe status flags',
    'Native secure input requested',
    'PIN from WebView',
    'Secret material returned',
    'Recovery root unsealed',
    'Wallet or ledger mutated',
  ]) {
    assert.match(source, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  assert.match(source, /nativePassportStatusRowsFromDto\(\s*nativePassportState\.data,\s*\)/);
  assert.match(source, /nativePassportCommandRowsFromDto\(\s*nativePassportState\.response,\s*\)/);
});

test('phase15ad row helpers force absent or redacted identifier display', () => {
  const source = readRequired(DRAWER);

  const statusRows = functionBody(source, 'nativePassportStatusRowsFromDto');
  const commandRows = functionBody(source, 'nativePassportCommandRowsFromDto');
  const safeValue = functionBody(source, 'safeNativePassportDisplayValue');
  const safeBoolean = functionBody(source, 'safeBooleanLabel');

  for (const required of [
    'safeNativePassportDisplayValue(status.passportIdentifier)',
    'safeNativePassportDisplayValue(status.deviceIdentifier)',
    'safeNativePassportDisplayValue(status.usernameHandle)',
    'safeNativePassportDisplayValue(status.capabilityMaterial)',
    'safeBooleanLabel(status.redacted)',
    'safeBooleanLabel(status.readOnly)',
    'safeBooleanLabel(status.nativeRuntimeReady)',
    'status.unlockPerformed === true',
    'status.platformSealerAccessed === true',
    'status.runtimeIoPerformed === true',
    'status.storageMutated === true',
    'status.walletOrLedgerMutated === true',
  ]) {
    assert.match(statusRows, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  for (const required of [
    'safeBooleanLabel(command.nativeSecureInputRequested)',
    'safeBooleanLabel(command.pinReceivedFromWebview)',
    'safeBooleanLabel(command.secretMaterialReturned)',
    'safeBooleanLabel(command.sessionChanged)',
    'safeBooleanLabel(command.encryptedVaultMutated)',
    'safeBooleanLabel(command.platformMaterialMutated)',
    'safeBooleanLabel(command.recoveryRootUnsealed)',
    'safeBooleanLabel(command.walletOrLedgerMutated)',
  ]) {
    assert.match(commandRows, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  assert.match(safeValue, /normalized === 'ABSENT'/);
  assert.match(safeValue, /normalized === 'REDACTED'/);
  assert.match(safeValue, /return 'REDACTED';/);
  assert.match(safeBoolean, /return value === true \? 'YES' : 'NO';/);
});

test('phase15ad drawer remains render-only and free of raw native authority', () => {
  const source = stripJsComments(readRequired(DRAWER));

  assert.doesNotMatch(source, /\binvoke\s*\(/);
  assert.doesNotMatch(source, /\bcallTauri\s*\(/);
  assert.doesNotMatch(source, /@tauri-apps\/api\/core/);

  for (const forbidden of [
    'pinReceivedFromWebview: true',
    'secretMaterialReturned: true',
    'recoveryRootUnsealed: true',
    'walletOrLedgerMutated: true',
    'rootVmkUnlocked: true',
    'rootFactorUnsealed: true',
    'privateKey',
    'seedPhrase',
    'recoveryWords',
    'rawCapability',
    'issueCapability',
    'mutateUsername',
    'directWallet',
    'directLedger',
    'solana',
    'rox',
  ]) {
    assert.doesNotMatch(source, new RegExp(forbidden, 'i'));
  }

  assert.match(readRequired(ADAPTER), /safePassportDisplayValue/);
});

test('phase15ad preserves phase15ac adapter button path', () => {
  const source = readRequired(DRAWER);

  for (const required of [
    'readNativePassportStatus',
    'createNativePassport',
    'lockNativePassport',
    'unlockNativePassportOperational',
    'confirmNativePassportRoot',
    'clearNativePassport',
    'runNativePassportCommand(createNativePassport,',
    'runNativePassportCommand(unlockNativePassportOperational,',
    'runNativePassportCommand(lockNativePassport,',
    'runNativePassportCommand(confirmNativePassportRoot,',
    'runNativePassportCommand(clearNativePassport,',
  ]) {
    assert.match(source, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  assert.doesNotMatch(source, /setNativePassportState\([^)]*passportIdentifier/i);
  assert.doesNotMatch(source, /setNativePassportState\([^)]*deviceIdentifier/i);
  assert.doesNotMatch(source, /setNativePassportState\([^)]*capabilityMaterial/i);
});
