/**
 * RO:WHAT — Locks the CN-4 purpose-specific username-capability Tauri boundary.
 * RO:WHY — Physical IssueCapability must be callable from product intent without exposing caller authority, DeviceKey material, proof material, or the issued capability to React.
 * RO:INTERACTS — Rust Passport command, Tauri handler registry, central command allowlist, Passport adapter, native capability runtime/session, and lock/clear lifecycle.
 * RO:INVARIANTS — one fixed zero-argument command; Rust derives all authority natively; response is redacted state only; lock/clear revoke the in-memory capability before proceeding.
 * RO:METRICS — none.
 * RO:CONFIG — none; gateway/scopes/trust remain native runtime constants.
 * RO:SECURITY — no capability ID/material/expiry/signature, PIN, root, seed, DeviceKey, wallet, or ledger material crosses the WebView boundary.
 * RO:TEST — run with `node --test src/adapters/passportUsernameCapability.source.test.mjs`.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = path.resolve(
  new URL('../../../..', import.meta.url).pathname,
);

const RUST = path.join(
  ROOT,
  'apps/crablink-tauri/src-tauri/src/commands/passport.rs',
);

const LIB = path.join(
  ROOT,
  'apps/crablink-tauri/src-tauri/src/lib.rs',
);

const PLATFORM = path.join(
  ROOT,
  'apps/crablink-tauri/src/platform/tauriPlatform.js',
);

const ADAPTER = path.join(
  ROOT,
  'apps/crablink-tauri/src/adapters/passportAdapter.js',
);

function readRequired(file) {
  return fs.readFileSync(file, 'utf8');
}

function functionBlock(source, marker) {
  const start = source.indexOf(marker);

  assert.notEqual(
    start,
    -1,
    `${marker} must exist`,
  );

  const open = source.indexOf('{', start);

  assert.notEqual(
    open,
    -1,
    `${marker} must have a body`,
  );

  let depth = 0;

  for (
    let index = open;
    index < source.length;
    index += 1
  ) {
    if (source[index] === '{') depth += 1;

    if (source[index] === '}') {
      depth -= 1;

      if (depth === 0) {
        return source.slice(start, index + 1);
      }
    }
  }

  throw new Error(`${marker} body was not bounded`);
}

test(
  'CN4 username capability is allowlisted once, excepted once, and Rust-registered once',
  () => {
    const platform = readRequired(PLATFORM);
    const lib = readRequired(LIB);

    const allowlistMatch = platform.match(
      /ALLOWED_TAURI_COMMANDS\s*=\s*Object\.freeze\(\[([\s\S]*?)\]\)/,
    );

    assert.ok(
      allowlistMatch,
      'central allowlist must exist',
    );

    const exceptionMatch = platform.match(
      /REVIEWED_FORBIDDEN_PATTERN_EXCEPTIONS\s*=\s*[\r\n\s]*new Set\(\[([\s\S]*?)\]\)/,
    );

    assert.ok(
      exceptionMatch,
      'reviewed forbidden-pattern exception set must exist',
    );

    assert.equal(
      (
        allowlistMatch[1].match(
          /['"]passport_issue_username_capability['"]/g,
        ) || []
      ).length,
      1,
      'purpose-specific command must appear once in the central allowlist',
    );

    assert.equal(
      (
        exceptionMatch[1].match(
          /['"]passport_issue_username_capability['"]/g,
        ) || []
      ).length,
      1,
      'purpose-specific command must appear once in the exact reviewed exception set',
    );

    assert.equal(
      (
        lib.match(
          /commands::passport::passport_issue_username_capability/g,
        ) || []
      ).length,
      1,
      'Rust handler must be registered exactly once',
    );

    assert.doesNotMatch(
      allowlistMatch[1],
      /['"]passport_issue_capability['"]/,
      'broad capability command must remain absent from the allowlist',
    );

    assert.doesNotMatch(
      exceptionMatch[1],
      /['"]passport_issue_capability['"]/,
      'broad capability command must remain absent from reviewed exceptions',
    );
  },
);

test(
  'CN4 adapter exposes only zero-argument username capability intent',
  () => {
    const adapter = readRequired(ADAPTER);

    assert.match(
      adapter,
      /issueUsernameCapability:\s*[\r\n\s]*['"]passport_issue_username_capability['"]/,
    );

    const body = functionBlock(
      adapter,
      'export async function issueNativePassportUsernameCapability()',
    );

    assert.match(
      body,
      /runPassportCommand\([\r\n\s]*PASSPORT_COMMANDS\.issueUsernameCapability,[\r\n\s]*\)/,
    );

    assert.doesNotMatch(body, /callTauri\s*\(/);

    assert.match(
      body,
      /export async function issueNativePassportUsernameCapability\(\)/,
    );

    assert.equal(
      (body.match(/runPassportCommand\s*\(/g) || []).length,
      1,
      'adapter must issue exactly one fixed Passport command',
    );

    assert.doesNotMatch(
      body,
      /runPassportCommand\([\s\S]*?PASSPORT_COMMANDS\.issueUsernameCapability\s*,\s*\{/,
      'adapter must not pass an authority-bearing object argument',
    );

    assert.doesNotMatch(body, /passportId|deviceId|scope|signature|capabilityId|expiresAt|pin|secret/i);
  },
);

test(
  'CN4 Rust command accepts only AppState and emits redacted outcome state',
  () => {
    const rust = readRequired(RUST);

    const body = functionBlock(
      rust,
      'pub async fn passport_issue_username_capability(',
    );

    assert.match(
      body,
      /state:\s*State<'_,\s*AppState>/,
    );

    assert.match(
      body,
      /Result<PassportOperationalCommandDtoV1,\s*PassportStatusProblemV1>/,
    );

    assert.match(
      body,
      /issue_physical_m1_username_capability\(state\.inner\(\)\)\.await/,
    );

    assert.match(body, /"capability_issued"/);
    assert.match(body, /"capability_rejected"/);

    for (const required of [
      'redacted: true',
      'pin_received_from_webview: false',
      'secret_material_returned: false',
      'recovery_root_unsealed: false',
      'wallet_or_ledger_mutated: false',
    ]) {
      assert.ok(
        body.includes(required),
        `missing redaction marker ${required}`,
      );
    }

    for (const forbidden of [
      'capability_id',
      'capabilityId',
      'expires_at_ms',
      'expiresAtMs',
      'proof_signature',
      'service_signature',
      'device_signing_seed',
      'recovery_words',
    ]) {
      assert.equal(
        body.includes(forbidden),
        false,
        `Rust command leaked ${forbidden}`,
      );
    }
  },
);

test(
  'CN4 lock and clear revoke native capability session before other lifecycle mutation',
  () => {
    const rust = readRequired(RUST);

    const lock = functionBlock(
      rust,
      'pub fn passport_lock(',
    );

    const clear = functionBlock(
      rust,
      'pub fn passport_clear(',
    );

    const lockCapabilityClear =
      lock.indexOf(
        '.passport_capability_session',
      );

    const lockOperational =
      lock.indexOf(
        'lock_desktop_native_passport_operational',
      );

    assert.ok(lockCapabilityClear >= 0);
    assert.ok(lockOperational >= 0);
    assert.ok(
      lockCapabilityClear < lockOperational,
      'capability authority must clear before operational lock',
    );

    const clearCapability =
      clear.indexOf(
        '.passport_capability_session',
      );

    const clearAuthorization =
      clear.indexOf(
        '.passport_device_authorization_store',
      );

    assert.ok(clearCapability >= 0);
    assert.ok(clearAuthorization >= 0);
    assert.ok(
      clearCapability < clearAuthorization,
      'capability authority must clear before durable authorization cleanup',
    );

    assert.match(
      lock,
      /\.clear\(\)[\s\S]*map_err\(\|_\|\s*unavailable_problem\(\)\)/,
    );

    assert.match(
      clear,
      /\.clear\(\)[\s\S]*map_err\(\|_\|\s*unavailable_problem\(\)\)/,
    );
  },
);

test(
  'CN4 generic adapter normalization does not pass capability-shaped fields through',
  () => {
    const adapter = readRequired(ADAPTER);

    const normalizeStart =
      adapter.indexOf(
        'export function normalizePassportCommandDto',
      );

    assert.notEqual(normalizeStart, -1);

    const nextFunction =
      adapter.indexOf(
        'export function normalizeRecoveryCeremonyDto',
        normalizeStart,
      );

    assert.notEqual(nextFunction, -1);

    const normalizer = adapter.slice(
      normalizeStart,
      nextFunction,
    );

    for (const forbidden of [
      'capabilityId',
      'capability_id',
      'capabilityMaterial',
      'proofSignature',
      'proof_signature',
      'serviceSignature',
      'service_signature',
      'expiresAtMs',
      'expires_at_ms',
    ]) {
      assert.equal(
        normalizer.includes(forbidden),
        false,
        `normalizer passes forbidden ${forbidden}`,
      );
    }

    assert.ok(
      normalizer.includes(
        'secretMaterialReturned: false',
      ),
    );

    assert.ok(
      normalizer.includes(
        'recoveryRootUnsealed: false',
      ),
    );

    assert.ok(
      normalizer.includes(
        'walletOrLedgerMutated: false',
      ),
    );
  },
);
