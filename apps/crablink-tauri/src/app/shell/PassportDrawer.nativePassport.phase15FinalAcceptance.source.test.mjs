import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = path.resolve(new URL('../../../../..', import.meta.url).pathname);

const FILES = Object.freeze({
  drawer: path.join(ROOT, 'apps/crablink-tauri/src/app/shell/PassportDrawer.jsx'),
  adapter: path.join(ROOT, 'apps/crablink-tauri/src/adapters/passportAdapter.js'),
  adapterTest: path.join(ROOT, 'apps/crablink-tauri/src/adapters/passportAdapter.test.mjs'),
  drawerCommandsTest: path.join(
    ROOT,
    'apps/crablink-tauri/src/app/shell/PassportDrawer.nativePassport.source.test.mjs',
  ),
  statusAcceptanceTest: path.join(
    ROOT,
    'apps/crablink-tauri/src/app/shell/PassportDrawer.nativePassport.statusAcceptance.source.test.mjs',
  ),
  commandAcceptanceTest: path.join(
    ROOT,
    'apps/crablink-tauri/src/app/shell/PassportDrawer.nativePassport.commandAcceptance.source.test.mjs',
  ),
  manualAcceptanceTest: path.join(
    ROOT,
    'apps/crablink-tauri/src/app/shell/PassportDrawer.nativePassport.manualAcceptance.source.test.mjs',
  ),
  rustCommands: path.join(ROOT, 'apps/crablink-tauri/src-tauri/src/commands/passport.rs'),
  rustLib: path.join(ROOT, 'apps/crablink-tauri/src-tauri/src/lib.rs'),
  phase15aa: path.join(
    ROOT,
    'apps/crablink-tauri/src-tauri/tests/phase15aa_desktop_clear_command_bridge.rs',
  ),
  phase15z: path.join(
    ROOT,
    'apps/crablink-tauri/src-tauri/tests/phase15z_desktop_root_confirmation_command_bridge.rs',
  ),
  phase15y: path.join(
    ROOT,
    'apps/crablink-tauri/src-tauri/tests/phase15y_desktop_create_status_command_acceptance.rs',
  ),
});

const COMMANDS = Object.freeze([
  ['passport_status', 'readNativePassportStatus', 'status'],
  ['passport_create', 'createNativePassport', 'create'],
  ['passport_lock', 'lockNativePassport', 'lock'],
  ['passport_unlock_operational', 'unlockNativePassportOperational', 'unlockOperational'],
  ['passport_unlock_root', 'confirmNativePassportRoot', 'unlockRoot'],
  ['passport_clear', 'clearNativePassport', 'clear'],
]);

function readRequired(file) {
  return fs.readFileSync(file, 'utf8');
}

function stripJsComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

function stripRustComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

function functionBody(source, marker) {
  const start = source.indexOf(marker);

  assert.notEqual(start, -1, `${marker} must exist`);

  const open = source.indexOf('{', start);
  assert.notEqual(open, -1, `${marker} opening brace must exist`);

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

  throw new Error(`${marker} body was not bounded`);
}

function rustFunctionSignature(source, rustFn) {
  const marker = `pub fn ${rustFn}`;
  const start = source.indexOf(marker);

  assert.notEqual(start, -1, `${rustFn} must exist`);

  const open = source.indexOf('{', start);
  assert.notEqual(open, -1, `${rustFn} opening brace must exist`);

  return source.slice(start, open);
}

function handlerBlock(source) {
  const parts = source.split('generate_handler![');

  assert.ok(parts.length >= 2, 'Tauri generate_handler block must exist');

  const block = parts[1].split(']').shift();

  assert.ok(block, 'Tauri generate_handler block must be bounded');

  return block;
}

function countOccurrences(source, needle) {
  return source.split(needle).length - 1;
}

test('phase15ag final acceptance files and phase labels are present', () => {
  for (const [label, file] of Object.entries(FILES)) {
    assert.ok(fs.existsSync(file), `${label} must exist`);
  }

  const drawer = readRequired(FILES.drawer);
  const adapter = readRequired(FILES.adapter);

  for (const required of [
    'NATIVE_PASSPORT_PHASE15AD_DRAWER_NATIVE_STATUS_ACCEPTANCE',
    'NATIVE_PASSPORT_PHASE15AF_DESKTOP_PASSPORT_NATIVE_MANUAL_ACCEPTANCE',
    'Native Passport runtime',
    'Native Passport status truth',
    'Last native command truth',
    'Native Passport manual acceptance',
    'nativePassportStatusRowsFromDto',
    'nativePassportCommandRowsFromDto',
    'nativePassportManualAcceptanceRowsFromState',
  ]) {
    assert.match(drawer, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  assert.match(
    adapter,
    /NATIVE_PASSPORT_PHASE15AB_DESKTOP_PASSPORT_COMMAND_ADAPTERS/,
  );

  for (const testFile of [
    FILES.adapterTest,
    FILES.drawerCommandsTest,
    FILES.statusAcceptanceTest,
    FILES.commandAcceptanceTest,
    FILES.manualAcceptanceTest,
  ]) {
    assert.match(readRequired(testFile), /phase15a[b-z]/i);
  }
});

test('phase15ag command chain stays fixed from Rust to adapter to drawer', () => {
  const rustCommands = stripRustComments(readRequired(FILES.rustCommands));
  const rustLib = stripRustComments(readRequired(FILES.rustLib));
  const adapter = stripJsComments(readRequired(FILES.adapter));
  const drawer = stripJsComments(readRequired(FILES.drawer));
  const handler = handlerBlock(rustLib);

  for (const [commandLiteral, adapterFunction, adapterKey] of COMMANDS) {
    assert.match(rustCommands, new RegExp(`pub fn ${commandLiteral}\\b`));

    const signature = rustFunctionSignature(rustCommands, commandLiteral);

    assert.match(signature, /State<'_, AppState>/);
    assert.doesNotMatch(signature, /\bpin\b\s*[:=]/i);
    assert.doesNotMatch(signature, /\bpassword\b\s*[:=]/i);
    assert.doesNotMatch(signature, /\bsecret\b\s*[:=]/i);
    assert.doesNotMatch(signature, /\bString\b/);
    assert.doesNotMatch(signature, /\bVec\s*</);

    assert.equal(
      countOccurrences(handler, `commands::passport::${commandLiteral},`),
      1,
      `${commandLiteral} must be registered exactly once`,
    );

    assert.match(
      adapter,
      new RegExp(`${adapterKey}: '${commandLiteral}'`.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    );
    assert.match(adapter, new RegExp(`export async function ${adapterFunction}\\b`));
    assert.match(drawer, new RegExp(`\\b${adapterFunction}\\b`));

    assert.doesNotMatch(
      drawer,
      new RegExp(`['"]${commandLiteral}['"]`),
      `${commandLiteral} must remain in passportAdapter.js, not the drawer`,
    );
  }
});

test('phase15ag React surfaces do not carry PINs, raw invoke, or duplicated native authority', () => {
  const adapter = stripJsComments(readRequired(FILES.adapter));
  const drawer = stripJsComments(readRequired(FILES.drawer));

  assert.match(adapter, /const dto = await callTauri\(commandName\);/);
  assert.doesNotMatch(adapter, /callTauri\s*\(\s*commandName\s*,\s*\{/);
  assert.doesNotMatch(adapter, /\binvoke\s*\(/);
  assert.doesNotMatch(drawer, /\binvoke\s*\(/);
  assert.doesNotMatch(drawer, /\bcallTauri\s*\(/);
  assert.doesNotMatch(drawer, /@tauri-apps\/api\/core/);

  const commandBody = functionBody(drawer, 'function runNativePassportCommand');

  assert.match(commandBody, /const commandResult = await command\(\);/);
  assert.match(commandBody, /const status = await readNativePassportStatus\(\);/);
  assert.doesNotMatch(
    commandBody,
    /command\([^)]*(pin|password|secret|seed|key|vmk|recovery)[^)]*\)/i,
  );

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
    assert.doesNotMatch(`${adapter}\n${drawer}`, new RegExp(forbidden, 'i'));
  }
});

test('phase15ag drawer status and manual acceptance remain display-only', () => {
  const drawer = readRequired(FILES.drawer);

  const statusRows = functionBody(drawer, 'function nativePassportStatusRowsFromDto');
  const commandRows = functionBody(drawer, 'function nativePassportCommandRowsFromDto');
  const manualRows = functionBody(drawer, 'function nativePassportManualAcceptanceRowsFromState');

  for (const body of [statusRows, commandRows, manualRows]) {
    assert.doesNotMatch(body, /\binvoke\s*\(/);
    assert.doesNotMatch(body, /\bcallTauri\s*\(/);
    assert.doesNotMatch(body, /setNativePassportState\s*\(/);
    assert.doesNotMatch(body, /readNativePassportStatus\s*\(/);
    assert.doesNotMatch(body, /runNativePassportCommand\s*\(/);
  }

  for (const required of [
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
    'Manual acceptance phase',
    'Runtime boundary',
    'Create path',
    'Operational unlock path',
    'Lock path',
    'Root confirmation path',
    'Clear path',
    'React secret boundary',
  ]) {
    assert.match(drawer, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('phase15ag final acceptance retains Rust regression coverage anchors', () => {
  const rustCommands = stripRustComments(readRequired(FILES.rustCommands));
  const phase15aa = readRequired(FILES.phase15aa);
  const phase15z = readRequired(FILES.phase15z);
  const phase15y = readRequired(FILES.phase15y);

  for (const required of [
    'PASSPORT_STATUS_COMMAND',
    'PASSPORT_CREATE_COMMAND',
    'PASSPORT_UNLOCK_OPERATIONAL_COMMAND',
    'PASSPORT_LOCK_COMMAND',
    'PASSPORT_UNLOCK_ROOT_COMMAND',
    'PASSPORT_CLEAR_COMMAND',
    'pin_received_from_webview: false',
    'secret_material_returned: false',
    'recovery_root_unsealed: false',
    'wallet_or_ledger_mutated: false',
  ]) {
    assert.match(rustCommands, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  assert.match(phase15aa, /phase15aa_clear_removes_vault_drops_session_and_status_returns_no_passport/);
  assert.match(phase15z, /phase15z_root_bridge_uses_native_prompt_but_refuses_fake_root_success/);
  assert.match(phase15y, /phase15y_passport_create_command_is_redacted_native_pin_only_and_locked/);

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
  ]) {
    assert.doesNotMatch(rustCommands, new RegExp(`pub fn ${forbidden}\\b`, 'i'));
  }
});
