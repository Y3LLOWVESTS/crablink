/**
 * RO:WHAT — Locks the Physical M1 DeviceKey-possession React→adapter→Tauri command boundary.
 * RO:WHY — Real possession may be triggered by user intent, but Passport/device identity, challenge, signature, scope, and key custody must remain native-owned.
 * RO:INTERACTS — passportAdapter.js, PassportDrawer.jsx, commands/passport.rs, and the fixed passport_verify_device_possession command.
 * RO:INVARIANTS — one fixed command literal; zero user arguments; redacted command DTO only; React never receives DeviceKey, proof signature, capability, PIN, or identity authority.
 * RO:METRICS — none.
 * RO:CONFIG — Physical M1 desktop controlled-beta acceptance.
 * RO:SECURITY — source-boundary test only; no raw invoke, secret DTO, RecoveryRoot, capability, username, wallet, or ledger authority.
 * RO:TEST — node --test this file.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  normalizePassportCommandDto,
} from '../../adapters/passportAdapter.js';

const ROOT = path.resolve(
  new URL('../../../../..', import.meta.url).pathname,
);

const ADAPTER = path.join(
  ROOT,
  'apps/crablink-tauri/src/adapters/passportAdapter.js',
);

const DRAWER = path.join(
  ROOT,
  'apps/crablink-tauri/src/app/shell/PassportDrawer.jsx',
);

const COMMANDS = path.join(
  ROOT,
  'apps/crablink-tauri/src-tauri/src/commands/passport.rs',
);

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

test(
  'physical M1 possession command is fixed and adapter invocation has zero user arguments',
  () => {
    const adapter = read(ADAPTER);
    const drawer = stripComments(read(DRAWER));

    assert.equal(
      (
        adapter.match(
          /['"]passport_verify_device_possession['"]/g,
        ) || []
      ).length,
      1,
    );

    assert.match(
      adapter,
      /verifyDevicePossession:\s*[\r\n\s]*['"]passport_verify_device_possession['"]/,
    );

    assert.match(
      adapter,
      /export async function verifyNativePassportDevicePossession\(\)/,
    );

    assert.match(
      adapter,
      /runPassportCommand\([\r\n\s]*PASSPORT_COMMANDS\.verifyDevicePossession[\r\n\s]*\)/,
    );

    assert.doesNotMatch(
      drawer,
      /['"]passport_verify_device_possession['"]/,
      'raw command literal must stay in passportAdapter.js',
    );

    assert.doesNotMatch(
      drawer,
      /\binvoke\s*\(/,
    );

    assert.doesNotMatch(
      drawer,
      /\bcallTauri\s*\(/,
    );
  },
);

test(
  'drawer exposes only a zero-argument possession intent',
  () => {
    const drawer = stripComments(read(DRAWER));

    assert.match(
      drawer,
      /verifyNativePassportDevicePossession/,
    );

    assert.match(
      drawer,
      /runNativePassportCommand\(\s*verifyNativePassportDevicePossession,\s*['"]verify device possession['"]\s*,?\s*\)/,
    );

    assert.match(
      drawer,
      /Verify device possession/,
    );

    assert.doesNotMatch(
      drawer,
      /verifyNativePassportDevicePossession\s*\([^)]*(passport|device|scope|challenge|signature|pin|secret|seed|key|vmk|capability)[^)]*\)/i,
    );
  },
);

test(
  'Rust command accepts only AppState and returns redacted non-capability status',
  () => {
    const commands = read(COMMANDS);

    const after = commands
      .split(
        'pub async fn passport_verify_device_possession',
      )[1];

    assert.ok(
      after,
      'possession command must exist',
    );

    const signature = after
      .split('->')[0];

    assert.match(
      signature,
      /state:\s*State<'_,\s*AppState>/,
    );

    for (const forbidden of [
      'passport_id:',
      'device_id:',
      'scope:',
      'challenge:',
      'signature:',
      'pin:',
      'password:',
      'secret:',
      'String',
      'Vec<u8>',
    ]) {
      assert.equal(
        signature.includes(forbidden),
        false,
        `public possession command accepts forbidden input ${forbidden}`,
      );
    }

    const body = after
      .split('#[cfg(test)]')[0];

    for (const required of [
      'prove_physical_m1_device_session',
      '"possession_proven"',
      '"possession_rejected"',
      'redacted: true',
      'native_secure_input_requested: false',
      'pin_received_from_webview: false',
      'secret_material_returned: false',
      'session_changed: false',
      'recovery_root_unsealed: false',
      'wallet_or_ledger_mutated: false',
    ]) {
      assert.ok(
        body.includes(required),
        `possession command missing required boundary ${required}`,
      );
    }

    for (const forbidden of [
      'issue_capability(',
      'claim_username(',
      'device_signing_seed',
      'proof_signature:',
      'RecoveryRoot',
    ]) {
      assert.equal(
        body.includes(forbidden),
        false,
        `possession command gained forbidden authority ${forbidden}`,
      );
    }
  },
);

test(
  'React normalization drops proof and capability-shaped unexpected fields',
  () => {
    const normalized =
      normalizePassportCommandDto(
        {
          schema:
            'crablink.native-passport.device-possession-command.v1',
          commandName:
            'passport_verify_device_possession',
          state:
            'possession_proven',
          redacted: true,

          proofSignature:
            'must-never-reach-react-state',

          deviceSigningSeed:
            'must-never-reach-react-state',

          capability:
            'must-never-reach-react-state',

          pinReceivedFromWebview: true,
          secretMaterialReturned: true,
          sessionChanged: true,
          recoveryRootUnsealed: true,
        },
        'passport_verify_device_possession',
      );

    assert.equal(
      normalized.state,
      'possession_proven',
    );

    assert.equal(
      normalized.pinReceivedFromWebview,
      false,
    );

    assert.equal(
      normalized.secretMaterialReturned,
      false,
    );

    assert.equal(
      Object.hasOwn(
        normalized,
        'proofSignature',
      ),
      false,
    );

    assert.equal(
      Object.hasOwn(
        normalized,
        'deviceSigningSeed',
      ),
      false,
    );

    assert.equal(
      Object.hasOwn(
        normalized,
        'capability',
      ),
      false,
    );
  },
);
