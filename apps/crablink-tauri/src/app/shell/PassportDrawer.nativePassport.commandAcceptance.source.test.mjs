import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = path.resolve(new URL('../../../../..', import.meta.url).pathname);

const FILES = Object.freeze({
  drawer: path.join(ROOT, 'apps/crablink-tauri/src/app/shell/PassportDrawer.jsx'),
  adapter: path.join(ROOT, 'apps/crablink-tauri/src/adapters/passportAdapter.js'),
  rustCommands: path.join(ROOT, 'apps/crablink-tauri/src-tauri/src/commands/passport.rs'),
  rustLib: path.join(ROOT, 'apps/crablink-tauri/src-tauri/src/lib.rs'),
});

const COMMANDS = Object.freeze([
  {
    rustFn: 'passport_status',
    adapterFunction: 'readNativePassportStatus',
    adapterKey: 'status',
    commandLiteral: 'passport_status',
  },
  {
    rustFn: 'passport_create',
    adapterFunction: 'createNativePassport',
    adapterKey: 'create',
    commandLiteral: 'passport_create',
  },
  {
    rustFn: 'passport_lock',
    adapterFunction: 'lockNativePassport',
    adapterKey: 'lock',
    commandLiteral: 'passport_lock',
  },
  {
    rustFn: 'passport_unlock_operational',
    adapterFunction: 'unlockNativePassportOperational',
    adapterKey: 'unlockOperational',
    commandLiteral: 'passport_unlock_operational',
  },
  {
    rustFn: 'passport_unlock_root',
    adapterFunction: 'confirmNativePassportRoot',
    adapterKey: 'unlockRoot',
    commandLiteral: 'passport_unlock_root',
  },
  {
    rustFn: 'passport_clear',
    adapterFunction: 'clearNativePassport',
    adapterKey: 'clear',
    commandLiteral: 'passport_clear',
  },
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
  const split = source.split('generate_handler![');

  assert.ok(split.length >= 2, 'Tauri generate_handler block must exist');

  const block = split[1].split(']').shift();

  assert.ok(block, 'Tauri generate_handler block must be bounded');

  return block;
}

function countOccurrences(source, needle) {
  return source.split(needle).length - 1;
}

test('phase15ae Rust exposes the fixed Native Passport command set once', () => {
  const commandsSource = stripRustComments(readRequired(FILES.rustCommands));
  const libSource = stripRustComments(readRequired(FILES.rustLib));
  const handler = handlerBlock(libSource);

  for (const command of COMMANDS) {
    assert.match(commandsSource, new RegExp(`pub fn ${command.rustFn}\\b`));

    const signature = rustFunctionSignature(commandsSource, command.rustFn);

    assert.match(signature, /State<'_, AppState>/);
    assert.doesNotMatch(signature, /\bpin\b\s*[:=]/i);
    assert.doesNotMatch(signature, /\bpassword\b\s*[:=]/i);
    assert.doesNotMatch(signature, /\bsecret\b\s*[:=]/i);
    assert.doesNotMatch(signature, /\bString\b/);
    assert.doesNotMatch(signature, /\bVec\s*</);
    assert.doesNotMatch(signature, /\bDeserialize\b/);

    const handlerEntry = `commands::passport::${command.rustFn},`;

    assert.equal(
      countOccurrences(handler, handlerEntry),
      1,
      `${handlerEntry} must be registered exactly once`,
    );
  }

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
    assert.doesNotMatch(commandsSource, new RegExp(`pub fn ${forbidden}\\b`, 'i'));
    assert.doesNotMatch(handler, new RegExp(`commands::passport::${forbidden}`, 'i'));
  }
});

test('phase15ae adapter maps every public function to the reviewed fixed command names', () => {
  const adapterSource = stripJsComments(readRequired(FILES.adapter));

  for (const command of COMMANDS) {
    const commandMapEntry = `${command.adapterKey}: '${command.commandLiteral}'`;

    assert.match(
      adapterSource,
      new RegExp(commandMapEntry.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      `${commandMapEntry} must exist`,
    );

    const marker = `export async function ${command.adapterFunction}`;

    assert.match(adapterSource, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

    const body = functionBody(adapterSource, marker);

    assert.doesNotMatch(body, /\binvoke\s*\(/);
    assert.doesNotMatch(body, /@tauri-apps\/api\/core/);
    assert.doesNotMatch(body, /\bpin\b\s*[:=]/i);
    assert.doesNotMatch(body, /\bpassword\b\s*[:=]/i);
    assert.doesNotMatch(body, /\bsecret\b\s*[:=]/i);
  }

  assert.match(adapterSource, /import\s+\{\s*callTauri\s*\}\s+from\s+['"]\.\.\/platform\/tauriPlatform\.js['"]/);
  assert.match(adapterSource, /const dto = await callTauri\(commandName\);/);
  assert.doesNotMatch(adapterSource, /callTauri\s*\(\s*commandName\s*,\s*\{/);
});

test('phase15ae drawer uses adapter functions only and does not duplicate Tauri command names', () => {
  const drawerSource = stripJsComments(readRequired(FILES.drawer));

  for (const command of COMMANDS) {
    assert.match(drawerSource, new RegExp(`\\b${command.adapterFunction}\\b`));

    assert.doesNotMatch(
      drawerSource,
      new RegExp(`['"]${command.commandLiteral}['"]`),
      `${command.commandLiteral} must remain inside passportAdapter.js, not drawer source`,
    );
  }

  for (const required of [
    'runNativePassportCommand(createNativePassport,',
    'runNativePassportCommand(unlockNativePassportOperational,',
    'runNativePassportCommand(lockNativePassport,',
    'runNativePassportCommand(confirmNativePassportRoot,',
    'runNativePassportCommand(clearNativePassport,',
    'readNativePassportStatus()',
    'nativePassportStatusRowsFromDto(',
    'nativePassportCommandRowsFromDto(',
  ]) {
    assert.match(drawerSource, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  const runBody = functionBody(drawerSource, 'function runNativePassportCommand');

  assert.match(runBody, /const commandResult = await command\(\);/);
  assert.match(runBody, /const status = await readNativePassportStatus\(\);/);
  assert.doesNotMatch(runBody, /command\([^)]*(pin|password|secret|seed|key|vmk|recovery)[^)]*\)/i);

  assert.doesNotMatch(drawerSource, /\binvoke\s*\(/);
  assert.doesNotMatch(drawerSource, /\bcallTauri\s*\(/);
  assert.doesNotMatch(drawerSource, /@tauri-apps\/api\/core/);
});

test('phase15ae redacted DTO safety is preserved across Rust, adapter, and drawer', () => {
  const combined = stripRustComments(readRequired(FILES.rustCommands))
    + '\n'
    + stripJsComments(readRequired(FILES.adapter))
    + '\n'
    + stripJsComments(readRequired(FILES.drawer));

  for (const required of [
    'redacted: true',
    'pinReceivedFromWebview: false',
    'secretMaterialReturned: false',
    'recoveryRootUnsealed: false',
    'walletOrLedgerMutated: false',
    'PIN from WebView',
    'Secret material returned',
    'Recovery root unsealed',
    'Wallet or ledger mutated',
    'NATIVE_PASSPORT_PHASE15AD_DRAWER_NATIVE_STATUS_ACCEPTANCE',
  ]) {
    assert.match(combined, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  for (const forbidden of [
    'pin_received_from_webview: true',
    'secret_material_returned: true',
    'root_material_returned: true',
    'recovery_root_unsealed: true',
    'wallet_or_ledger_mutated: true',
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
    assert.doesNotMatch(combined, new RegExp(forbidden, 'i'));
  }
});

test('phase15ae acceptance documents the current command surface without adding behavior', () => {
  const adapterSource = readRequired(FILES.adapter);
  const drawerSource = readRequired(FILES.drawer);
  const rustCommands = readRequired(FILES.rustCommands);

  assert.match(adapterSource, /NATIVE_PASSPORT_PHASE15AB_DESKTOP_PASSPORT_COMMAND_ADAPTERS/);
  assert.match(drawerSource, /NATIVE_PASSPORT_PHASE15AD_DRAWER_NATIVE_STATUS_ACCEPTANCE/);

  for (const required of [
    'PASSPORT_STATUS_COMMAND',
    'PASSPORT_CREATE_COMMAND',
    'PASSPORT_CLEAR_COMMAND',
    'PASSPORT_UNLOCK_ROOT_COMMAND',
    'PASSPORT_UNLOCK_OPERATIONAL_COMMAND',
    'PASSPORT_LOCK_COMMAND',
  ]) {
    assert.match(rustCommands, new RegExp(required));
  }

  assert.doesNotMatch(adapterSource, /createCapability|issueCapability|usernameMutation|walletMutation|ledgerMutation/i);
  assert.doesNotMatch(drawerSource, /createCapability|issueCapability|usernameMutation|walletMutation|ledgerMutation/i);
});
