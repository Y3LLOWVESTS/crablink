/**
 * RO:WHAT — Proves CN-4 production RegisterRoot is exposed only through the fixed native Tauri/adapter path and one controlled advanced Passport drawer trigger.
 * RO:WHY — Windows needs durable server-side Passport root enrollment before backend device possession can succeed, without giving React root-signing authority.
 * RO:INTERACTS — tauriPlatform.js, passportAdapter.js, Tauri generate_handler!, passport_register_root command, Passport drawer.
 * RO:INVARIANTS — exact command only; zero caller authority; root/PIN/challenge/proof authority remains native; one controlled drawer trigger invokes only the fixed adapter action.
 * RO:METRICS — none.
 * RO:CONFIG — controlled-beta desktop command boundary.
 * RO:SECURITY — no PIN, RecoveryRoot, VMK, root key, challenge, proof, signature, capability, wallet, or ledger authority crosses into caller input.
 * RO:TEST — node --test this file.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  ALLOWED_TAURI_COMMANDS,
  isAllowedTauriCommand,
} from '../platform/tauriPlatform.js';

const ROOT =
  fileURLToPath(
    new URL('../../../..', import.meta.url),
  );

const PLATFORM =
  path.join(
    ROOT,
    'apps/crablink-tauri/src/platform/tauriPlatform.js',
  );

const ADAPTER =
  path.join(
    ROOT,
    'apps/crablink-tauri/src/adapters/passportAdapter.js',
  );

const LIB =
  path.join(
    ROOT,
    'apps/crablink-tauri/src-tauri/src/lib.rs',
  );

const PASSPORT_COMMAND =
  path.join(
    ROOT,
    'apps/crablink-tauri/src-tauri/src/commands/passport.rs',
  );

const DRAWER =
  path.join(
    ROOT,
    'apps/crablink-tauri/src/app/shell/PassportDrawer.jsx',
  );

function readRequired(file) {
  return fs.readFileSync(file, 'utf8');
}

function occurrenceCount(source, marker) {
  return source.split(marker).length - 1;
}

function bracketBlock(source, marker) {
  const start = source.indexOf(marker);

  assert.notEqual(start, -1, `${marker} must exist`);

  const open = source.indexOf('[', start);

  assert.notEqual(
    open,
    -1,
    `${marker} must contain an array literal`,
  );

  let depth = 0;

  for (
    let index = open;
    index < source.length;
    index += 1
  ) {
    const character = source[index];

    if (character === '[') depth += 1;

    if (character === ']') {
      depth -= 1;

      if (depth === 0) {
        return source.slice(open, index + 1);
      }
    }
  }

  throw new Error(`${marker} array literal was not bounded`);
}

function functionBody(source, marker) {
  const start = source.indexOf(marker);

  assert.notEqual(start, -1, `${marker} must exist`);

  const open = source.indexOf('{', start);

  assert.notEqual(
    open,
    -1,
    `${marker} opening brace must exist`,
  );

  let depth = 0;

  for (
    let index = open;
    index < source.length;
    index += 1
  ) {
    const character = source[index];

    if (character === '{') depth += 1;

    if (character === '}') {
      depth -= 1;

      if (depth === 0) {
        return source.slice(start, index + 1);
      }
    }
  }

  throw new Error(`${marker} body was not bounded`);
}

test(
  'CN4 RegisterRoot exact command is normally allowlisted and registered once',
  () => {
    const platform = readRequired(PLATFORM);
    const adapter = readRequired(ADAPTER);
    const lib = readRequired(LIB);

    assert.equal(
      ALLOWED_TAURI_COMMANDS.filter(
        (command) =>
          command === 'passport_register_root',
      ).length,
      1,
    );

    assert.equal(
      isAllowedTauriCommand(
        'passport_register_root',
      ),
      true,
    );

    for (const command of [
      'passport_register_root_extra',
      'passport_register_admin_root',
      'passport_register_root_proof',
      'passport_register_root_signature',
    ]) {
      assert.equal(
        isAllowedTauriCommand(command),
        false,
        `${command} must remain rejected`,
      );
    }

    assert.equal(
      occurrenceCount(
        lib,
        'commands::passport::passport_register_root,',
      ),
      1,
    );

    assert.equal(
      occurrenceCount(
        adapter,
        "registerRoot: 'passport_register_root'",
      ),
      1,
    );

    const exceptions =
      bracketBlock(
        platform,
        'REVIEWED_FORBIDDEN_PATTERN_EXCEPTIONS',
      );

    assert.doesNotMatch(
      exceptions,
      /passport_register_root/,
      'RegisterRoot must not gain a forbidden-pattern exception when normal admission suffices',
    );
  },
);

test(
  'CN4 RegisterRoot adapter action is fixed and zero argument',
  () => {
    const adapter = readRequired(ADAPTER);

    const body =
      functionBody(
        adapter,
        'export async function registerNativePassportRoot()',
      );

    assert.match(
      body,
      /runPassportCommand\(\s*PASSPORT_COMMANDS\.registerRoot\s*\)/,
    );

    assert.doesNotMatch(
      body,
      /callTauri\s*\([^)]*,\s*\{/,
    );

    for (const forbidden of [
      /\bpin\b\s*[:=]/i,
      /\bpassword\b\s*[:=]/i,
      /\bsecret\b\s*[:=]/i,
      /\bchallenge\b\s*[:=]/i,
      /\bproof\b\s*[:=]/i,
      /\bsignature\b\s*[:=]/i,
      /\brootPublicKey\b\s*[:=]/,
      /\bpassportId\b\s*[:=]/,
    ]) {
      assert.doesNotMatch(body, forbidden);
    }
  },
);

test(
  'CN4 RegisterRoot Rust command accepts AppState only and emits redacted command truth',
  () => {
    const rust = readRequired(PASSPORT_COMMAND);

    const body =
      functionBody(
        rust,
        'pub async fn passport_register_root(',
      );

    const signature =
      body.slice(
        0,
        body.indexOf('{'),
      );

    assert.match(
      signature,
      /pub async fn passport_register_root\(\s*state:\s*State<'_,\s*AppState>,?\s*\)/s,
    );

    for (const forbidden of [
      'intent:',
      'pin:',
      'password:',
      'passport_id:',
      'device_id:',
      'requested_scopes:',
      'challenge:',
      'signature:',
      'root_public_key:',
      'proof_signed_payload_hex:',
    ]) {
      assert.equal(
        signature.includes(forbidden),
        false,
        `caller authority field forbidden in RegisterRoot signature: ${forbidden}`,
      );
    }

    for (const required of [
      'redacted: true',
      'pin_received_from_webview: false',
      'secret_material_returned: false',
      'wallet_or_ledger_mutated: false',
    ]) {
      assert.equal(
        body.includes(required),
        true,
        `missing redacted RegisterRoot command marker: ${required}`,
      );
    }

    for (const forbidden of [
      'proof_signed_payload_hex',
      'root_private_key',
      'recovery_words',
      'seed_phrase',
      'raw_capability',
    ]) {
      assert.equal(
        body.includes(forbidden),
        false,
        `RegisterRoot command must not return authority material: ${forbidden}`,
      );
    }
  },
);

test(
  'CN4 RegisterRoot command exposure adds exactly one controlled drawer action',
  () => {
    const drawer = readRequired(DRAWER);

    assert.equal(
      occurrenceCount(
        drawer,
        'registerNativePassportRoot',
      ),
      2,
      'RegisterRoot must appear once in the import and once in the controlled action',
    );

    assert.doesNotMatch(
      drawer,
      /\bpassport_register_root\b/,
      'React must never invoke the raw Tauri command name directly',
    );

    const importIndex =
      drawer.indexOf('registerNativePassportRoot');

    assert.notEqual(
      importIndex,
      -1,
      'RegisterRoot adapter import must exist',
    );

    const actionIndex =
      drawer.indexOf(
        'registerNativePassportRoot',
        importIndex + 1,
      );

    assert.notEqual(
      actionIndex,
      -1,
      'RegisterRoot controlled action must exist',
    );

    const buttonStart =
      drawer.lastIndexOf(
        '<button',
        actionIndex,
      );

    const buttonEndMarker =
      drawer.indexOf(
        '</button>',
        actionIndex,
      );

    assert.notEqual(
      buttonStart,
      -1,
      'RegisterRoot button opening tag must exist',
    );

    assert.notEqual(
      buttonEndMarker,
      -1,
      'RegisterRoot button closing tag must exist',
    );

    const button =
      drawer.slice(
        buttonStart,
        buttonEndMarker + '</button>'.length,
      );

    assert.match(
      button,
      /runNativePassportCommand\(\s*registerNativePassportRoot,\s*'register root',?\s*\)/s,
      'drawer must dispatch only through the fixed RegisterRoot adapter action',
    );

    assert.match(
      button,
      /'Register Passport root'/,
    );

    assert.match(
      button,
      /'Registering Passport root…'/,
    );

    assert.match(
      button,
      /disabled=\{!nativePassportAvailable \|\| nativePassportBusy\}/,
      'RegisterRoot must reuse the existing native busy gate',
    );

    assert.doesNotMatch(
      button,
      /\bcallTauri\s*\(/,
      'drawer must not invoke Tauri directly',
    );

    assert.doesNotMatch(
      button,
      /\bpassport_register_root\b/,
      'raw RegisterRoot command must stay outside React',
    );

    for (const forbiddenCallerAuthority of [
      /\bpassportId\s*=/,
      /\brootPublicKey\s*=/,
      /\brequestedScopes\s*=/,
      /\bchallenge\s*=/,
      /\bproof\s*=/,
      /\bsignature\s*=/,
      /\bpin\s*=/i,
    ]) {
      assert.doesNotMatch(
        button,
        forbiddenCallerAuthority,
        'RegisterRoot drawer action gained caller-owned authority input',
      );
    }
  },
);
