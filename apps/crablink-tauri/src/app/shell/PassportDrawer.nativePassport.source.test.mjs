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

test('phase15ac drawer exposes native runtime state and reviewed fixed command actions', () => {
  const source = readRequired(DRAWER);

  for (const required of [
    'nativePassportState',
    'nativePassportCommand',
    'nativePassportAvailable',
    'refreshNativePassportStatus',
    'runNativePassportCommand',
    'readNativePassportStatus',
    'createNativePassport',
    'unlockNativePassportOperational',
    'lockNativePassport',
    'confirmNativePassportRoot',
    'clearNativePassport',
    'authorizeNativePassportDevice',
    'verifyNativePassportDevicePossession',
    'issueNativePassportUsernameCapability',
    'Prepare username claim',
  ]) {
    assert.match(
      source,
      new RegExp(
        required.replace(
          /[.*+?^${}()|[\]\\]/g,
          '\\$&',
        ),
      ),
    );
  }

  assert.match(
    source,
    /nativePassportAvailable\s*=\s*isTauriRuntime\(\)/,
  );

  assert.match(
    source,
    /disabled=\{!nativePassportAvailable \|\| nativePassportBusy\}/,
  );
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

test('phase15ac drawer retains redacted authority boundaries after purpose-specific capability intent', () => {
  const source =
    stripJsComments(readRequired(DRAWER));

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
    'capabilityId',
    'proofSignature',
    'serviceSignature',
    'mutateUsername',
    'directWallet',
    'directLedger',
    'solana',
    'rox',
  ]) {
    assert.doesNotMatch(
      source,
      new RegExp(forbidden, 'i'),
    );
  }

  const statusRows = functionBody(
    source,
    'nativePassportStatusRowsFromDto',
  );

  const safeDisplay = functionBody(
    source,
    'safeNativePassportDisplayValue',
  );

  assert.match(
    statusRows,
    /safeNativePassportDisplayValue\(status\.capabilityMaterial\)/,
    'capability status may be inspected only through the redacted display helper',
  );

  assert.match(
    safeDisplay,
    /normalized === ['"]ABSENT['"]/,
  );

  assert.match(
    safeDisplay,
    /normalized === ['"]REDACTED['"]/,
  );

  assert.match(
    safeDisplay,
    /return ['"]REDACTED['"]/,
  );

  assert.doesNotMatch(
    source,
    /setNativePassportState\([^)]*capabilityMaterial/i,
    'capability material must never become React state authority',
  );

  assert.doesNotMatch(
    source,
    /\bcapabilityMaterial\s*:/i,
    'drawer must not construct capability-bearing objects',
  );

  assert.match(
    source,
    /issueNativePassportUsernameCapability/,
  );

  assert.match(
    source,
    /runNativePassportCommand\(\s*issueNativePassportUsernameCapability,\s*['"]issue username capability['"]/,
  );

  assert.doesNotMatch(
    source,
    /['"]passport_issue_username_capability['"]/,
    'raw native command name must remain outside the drawer',
  );

  assert.doesNotMatch(
    source,
    /\binvoke\s*\(/,
  );

  assert.doesNotMatch(
    source,
    /\bcallTauri\s*\(/,
  );

  assert.doesNotMatch(
    source,
    /@tauri-apps\/api\/core/,
  );
});
