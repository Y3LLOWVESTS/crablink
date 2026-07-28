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

test('phase15ac drawer imports only the safe Passport adapter for native commands', () => {
  const source = readRequired(DRAWER);
  const executableSource = stripJsComments(source);

  assert.match(
    source,
    /from\s+['"]\.\.\/\.\.\/adapters\/passportAdapter\.js['"]/,
  );

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

  assert.doesNotMatch(executableSource, /\binvoke\s*\(/);
  assert.doesNotMatch(executableSource, /\bcallTauri\s*\(/);
  assert.doesNotMatch(executableSource, /@tauri-apps\/api\/core/);
  assert.match(readRequired(ADAPTER), /export async function readNativePassportStatus/);
});

test('phase15ac drawer exposes native runtime status and fixed command actions', () => {
  const source = readRequired(DRAWER);

  for (const required of [
    'Native Passport runtime',
    'Local Native Passport',
    'Refresh native status',
    'Create local Passport',
    'Unlock operational',
    'Lock',
    'Confirm root action',
    'Clear local Passport',
    'nativePassportState',
    'nativePassportCommand',
    'nativePassportAvailable',
    'refreshNativePassportStatus',
    'runNativePassportCommand',
  ]) {
    assert.match(source, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  assert.match(source, /nativePassportAvailable\s*=\s*isTauriRuntime\(\)/);
  assert.match(source, /disabled=\{!nativePassportAvailable \|\| nativePassportBusy\}/);
});

test('phase15ac drawer command handlers call adapter functions without arguments', () => {
  const source = readRequired(DRAWER);

  const runBody = functionBody(source, 'runNativePassportCommand');
  assert.match(runBody, /const commandResult = await command\(\);/);
  assert.match(runBody, /const status = await readNativePassportStatus\(\);/);
  assert.doesNotMatch(runBody, /command\([^)]*(pin|secret|password|seed|key|vmk)[^)]*\)/i);

  for (const required of [
    'runNativePassportCommand(createNativePassport,',
    'runNativePassportCommand(unlockNativePassportOperational,',
    'runNativePassportCommand(lockNativePassport,',
    'runNativePassportCommand(confirmNativePassportRoot,',
    'runNativePassportCommand(clearNativePassport,',
  ]) {
    assert.match(source, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  for (const forbidden of [
    'passport_status',
    'passport_create',
    'passport_lock',
    'passport_unlock_operational',
    'passport_unlock_root',
    'passport_clear',
  ]) {
    assert.doesNotMatch(
      stripJsComments(source),
      new RegExp(`['"]${forbidden}['"]`),
      `${forbidden} must stay in passportAdapter.js, not drawer source`,
    );
  }
});

test('phase15ac drawer does not claim root, capability, username, wallet, or ledger authority', () => {
  const source = stripJsComments(readRequired(DRAWER));

  for (const forbidden of [
    'pinReceivedFromWebview: true',
    'secretMaterialReturned: true',
    'recoveryRootUnsealed: true',
    'walletOrLedgerMutated: true',
    'rootVmkUnlocked: true',
    'rootFactorUnsealed: true',
    'issueCapability',
    'mutateUsername',
    'directWallet',
    'directLedger',
    'solana',
    'rox',
  ]) {
    assert.doesNotMatch(source, new RegExp(forbidden, 'i'));
  }

  assert.match(source, /Root confirmation remains redacted/);
  assert.match(source, /No PIN or\s+recovery material is accepted by this React drawer/);
});
