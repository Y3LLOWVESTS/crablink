import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = path.resolve(new URL('../../../../..', import.meta.url).pathname);
const DRAWER = path.join(
  ROOT,
  'apps/crablink-tauri/src/app/shell/PassportDrawer.jsx',
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

test('phase15af drawer renders a Native Passport manual acceptance checklist', () => {
  const source = readRequired(DRAWER);

  for (const required of [
    'NATIVE_PASSPORT_PHASE15AF_DESKTOP_PASSPORT_NATIVE_MANUAL_ACCEPTANCE',
    'nativePassportManualAcceptanceRows',
    'nativePassportManualAcceptanceRowsFromState',
    'Native Passport manual acceptance',
    'Manual acceptance phase',
    'Runtime boundary',
    'Create path',
    'Operational unlock path',
    'Lock path',
    'Root confirmation path',
    'Clear path',
    'React secret boundary',
    'Outcome checkpoint',
  ]) {
    assert.match(source, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  assert.match(
    source,
    /nativePassportManualAcceptanceRowsFromState\(\s*nativePassportAvailable,\s*nativePassportState\.data,\s*nativePassportState\.response,\s*\)/,
  );
});

test('phase15af manual acceptance rows are display-only derived truth', () => {
  const source = readRequired(DRAWER);
  const helper = functionBody(source, 'nativePassportManualAcceptanceRowsFromState');

  for (const required of [
    'status?.state ||',
    'command?.state ||',
    'Manual acceptance phase',
    'Runtime boundary',
    'Create path',
    'Operational unlock path',
    'Lock path',
    'Root confirmation path',
    'Clear path',
    'React secret boundary',
    'Outcome checkpoint',
    'NATIVE_PASSPORT_PHASE15AF_LABEL',
  ]) {
    assert.match(helper, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  assert.match(helper, /nativeRuntimeAvailable\s*\?/);

  assert.doesNotMatch(helper, /\binvoke\s*\(/);
  assert.doesNotMatch(helper, /\bcallTauri\s*\(/);
  assert.doesNotMatch(helper, /readNativePassportStatus\s*\(/);
  assert.doesNotMatch(helper, /runNativePassportCommand\s*\(/);
  assert.doesNotMatch(helper, /setNativePassportState\s*\(/);
  assert.doesNotMatch(helper, /\bpin\b\s*[:=]/i);
  assert.doesNotMatch(helper, /\bsecret\b\s*[:=]/i);
});

test('phase15af manual acceptance section keeps commands behind the adapter path', () => {
  const source = stripJsComments(readRequired(DRAWER));

  for (const forbidden of [
    "'passport_status'",
    "'passport_create'",
    "'passport_lock'",
    "'passport_unlock_operational'",
    "'passport_unlock_root'",
    "'passport_clear'",
    '"passport_status"',
    '"passport_create"',
    '"passport_lock"',
    '"passport_unlock_operational"',
    '"passport_unlock_root"',
    '"passport_clear"',
    '@tauri-apps/api/core',
    'invoke(',
    'callTauri(',
  ]) {
    assert.doesNotMatch(source, new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  for (const required of [
    'readNativePassportStatus',
    'createNativePassport',
    'lockNativePassport',
    'unlockNativePassportOperational',
    'confirmNativePassportRoot',
    'clearNativePassport',
  ]) {
    assert.match(source, new RegExp(required));
  }
});

test('phase15af manual acceptance does not add authority or unsafe DTO claims', () => {
  const source = stripJsComments(readRequired(DRAWER));

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

  assert.match(source, /PIN, password, recovery words, and root material are never entered in React/);
  assert.match(source, /Root-sensitive confirmation stays redacted/);
  assert.match(source, /Clear returns the drawer to no_passport/);
});
