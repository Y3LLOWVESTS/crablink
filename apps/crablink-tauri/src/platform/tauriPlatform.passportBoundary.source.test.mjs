import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = path.resolve(new URL('../../../..', import.meta.url).pathname);

const PLATFORM = path.join(
  ROOT,
  'apps/crablink-tauri/src/platform/tauriPlatform.js',
);
const ADAPTER = path.join(
  ROOT,
  'apps/crablink-tauri/src/adapters/passportAdapter.js',
);

const PASSPORT_COMMANDS = Object.freeze([
  'passport_status',
  'passport_create',
  'passport_lock',
  'passport_unlock_operational',
  'passport_unlock_root',
  'passport_register_root',
  'passport_authorize_device',
  'passport_verify_device_possession',
  'passport_issue_username_capability',
  'passport_claim_username',
  'passport_clear',
]);

function readRequired(file) {
  return fs.readFileSync(file, 'utf8');
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

function bracketBlock(source, marker) {
  const start = source.indexOf(marker);

  assert.notEqual(start, -1, `${marker} must exist`);

  const open = source.indexOf('[', start);

  assert.notEqual(open, -1, `${marker} must contain an array literal`);

  let depth = 0;

  for (let index = open; index < source.length; index += 1) {
    const char = source[index];

    if (char === '[') depth += 1;
    if (char === ']') {
      depth -= 1;

      if (depth === 0) {
        return source.slice(open, index + 1);
      }
    }
  }

  throw new Error(`${marker} array literal was not bounded`);
}

test('phase15ah admits fixed Native Passport commands through CrabLink boundary policy', () => {
  const platform = stripComments(readRequired(PLATFORM));
  const allowed = bracketBlock(platform, 'ALLOWED_TAURI_COMMANDS');

  for (const command of PASSPORT_COMMANDS) {
    assert.match(
      allowed,
      new RegExp(`['"]${command}['"]`),
      `${command} must be admitted by ALLOWED_TAURI_COMMANDS`,
    );
  }

  assert.match(platform, /isAllowedTauriCommand/);
  assert.match(platform, /not authorized by CrabLink boundary policy/);
  assert.match(platform, /FORBIDDEN_COMMAND_PATTERNS/);
});

test('phase15ah passport adapter command map matches admitted command names', () => {
  const adapter = stripComments(readRequired(ADAPTER));
  const allowed = bracketBlock(stripComments(readRequired(PLATFORM)), 'ALLOWED_TAURI_COMMANDS');

  for (const command of PASSPORT_COMMANDS) {
    assert.match(adapter, new RegExp(`['"]${command}['"]`));
    assert.match(allowed, new RegExp(`['"]${command}['"]`));
  }

  assert.match(adapter, /const dto = await callTauri\(commandName\);/);
  assert.doesNotMatch(adapter, /callTauri\s*\(\s*commandName\s*,\s*\{/);
});

test('phase15ah admission does not add caller-owned identity, export, wallet, or ledger authority', () => {
  const combined = `${stripComments(readRequired(PLATFORM))}\n${stripComments(readRequired(ADAPTER))}`;
  const allowed = bracketBlock(combined, 'ALLOWED_TAURI_COMMANDS');

  for (const forbidden of [
    'passport_export_seed',
    'passport_export_private_key',
    'passport_get_seed',
    'passport_get_private_key',
    'passport_get_root',
    'passport_get_vmk',
    'passport_issue_capability',
    'passport_mutate_username',
    'passport_wallet_mutate',
    'passport_ledger_mutate',
    'direct_wallet',
    'direct_ledger',
    'unlock_paid_from_cache',
  ]) {
    assert.doesNotMatch(allowed, new RegExp(forbidden, 'i'));
  }

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
  ]) {
    assert.doesNotMatch(combined, new RegExp(forbidden, 'i'));
  }
});

test('phase15ah legacy Passport actions remain fixed no-args dispatch while protected claim is purpose-specific', () => {
  const adapter = stripComments(readRequired(ADAPTER));

  for (const required of [
    'export async function readNativePassportStatus()',
    'export async function createNativePassport()',
    'export async function lockNativePassport()',
    'export async function unlockNativePassportOperational()',
    'export async function confirmNativePassportRoot()',
    'export async function clearNativePassport()',
  ]) {
    assert.match(adapter, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  assert.doesNotMatch(adapter, /\bpin\b\s*[:=]/i);
  assert.doesNotMatch(adapter, /\bpassword\b\s*[:=]/i);
  assert.doesNotMatch(adapter, /\bsecret\b\s*[:=]/i);
});
