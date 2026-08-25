/**
 * RO:WHAT — Locks the CN-4 protected username React-safe adapter and Tauri command boundary.
 * RO:WHY — Real username/profile mutation must carry public user intent while Passport/device/capability/proof authority remains native.
 * RO:INTERACTS — passportAdapter.js, tauriPlatform.js, Rust Passport command bridge, and protected username HTTP runtime.
 * RO:INVARIANTS — one fixed command; four public profile fields cross inward; backend-confirmed public username identifiers alone may cross outward.
 * RO:METRICS — none.
 * RO:CONFIG — controlled-beta desktop command boundary.
 * RO:SECURITY — no Passport subject, Device ID, capability ID/material, nonce, proof, signature, PIN, seed, root, VMK, wallet, or ledger authority crosses from the WebView.
 * RO:TEST — node --test this file.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  isAllowedTauriCommand,
} from '../platform/tauriPlatform.js';

import {
  normalizePassportUsernameClaimDto,
} from './passportAdapter.js';

const ROOT = path.resolve(
  path.dirname(
    fileURLToPath(import.meta.url),
  ),
  '../../../..',
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

function read(file) {
  return fs.readFileSync(
    file,
    'utf8',
  );
}

function boundedFunction(
  source,
  marker,
) {
  const start = source.indexOf(marker);

  assert.notEqual(
    start,
    -1,
    `${marker} must exist`,
  );

  /*
   * Do not treat object/default-parameter braces as the function body.
   * The protected username adapter intentionally has:
   *
   *   profileIntent = {}
   *
   * so the first brace after the function name belongs to that default
   * value. Find the opening parameter parenthesis, balance the complete
   * parameter list, then locate the body brace after it.
   */
  const parametersOpening =
    source.indexOf(
      '(',
      start,
    );

  assert.notEqual(
    parametersOpening,
    -1,
    `${marker} must have parameters`,
  );

  let parameterDepth = 0;
  let parametersClosing = -1;

  for (
    let index = parametersOpening;
    index < source.length;
    index += 1
  ) {
    if (source[index] === '(') {
      parameterDepth += 1;
    }

    if (source[index] === ')') {
      parameterDepth -= 1;

      if (parameterDepth === 0) {
        parametersClosing = index;
        break;
      }
    }
  }

  assert.notEqual(
    parametersClosing,
    -1,
    `${marker} parameter list must be bounded`,
  );

  const opening =
    source.indexOf(
      '{',
      parametersClosing,
    );

  assert.notEqual(
    opening,
    -1,
    `${marker} must have a body`,
  );

  let depth = 0;

  for (
    let index = opening;
    index < source.length;
    index += 1
  ) {
    if (source[index] === '{') {
      depth += 1;
    }

    if (source[index] === '}') {
      depth -= 1;

      if (depth === 0) {
        return source.slice(
          start,
          index + 1,
        );
      }
    }
  }

  throw new Error(
    `${marker} body was not bounded`,
  );
}

test(
  'CN4 protected username command is normally allowlisted and registered once',
  () => {
    const platform = read(PLATFORM);
    const lib = read(LIB);

    assert.equal(
      isAllowedTauriCommand(
        'passport_claim_username',
      ),
      true,
    );

    const allowedMatch =
      platform.match(
        /ALLOWED_TAURI_COMMANDS\s*=\s*Object\.freeze\(\[([\s\S]*?)\]\)/,
      );

    assert.ok(allowedMatch);

    assert.equal(
      (
        allowedMatch[1].match(
          /['"]passport_claim_username['"]/g,
        ) || []
      ).length,
      1,
    );

    const exceptionMatch =
      platform.match(
        /REVIEWED_FORBIDDEN_PATTERN_EXCEPTIONS\s*=\s*[\r\n\s]*new Set\(\[([\s\S]*?)\]\)/,
      );

    assert.ok(exceptionMatch);

    assert.doesNotMatch(
      exceptionMatch[1],
      /passport_claim_username/,
      'claim command must not gain a forbidden-pattern exception',
    );

    assert.equal(
      (
        lib.match(
          /commands::passport::passport_claim_username/g,
        ) || []
      ).length,
      1,
    );
  },
);

test(
  'CN4 adapter forwards public profile intent only',
  () => {
    const adapter = read(ADAPTER);

    assert.match(
      adapter,
      /claimUsername:\s*[\r\n\s]*['"]passport_claim_username['"]/,
    );

    const body = boundedFunction(
      adapter,
      'export async function claimNativePassportUsername(',
    );

    for (const required of [
      'requested_username',
      'display_name',
      'bio',
      'avatar_image',
      'PASSPORT_COMMANDS.claimUsername',
      'normalizePassportUsernameClaimDto',
    ]) {
      assert.ok(
        body.includes(required),
        `missing public claim marker ${required}`,
      );
    }

    assert.equal(
      (
        body.match(
          /callTauri\s*\(/g,
        ) || []
      ).length,
      1,
    );

    for (const forbidden of [
      'passportSubject',
      'passport_subject',
      'passportId',
      'passport_id',
      'deviceId',
      'device_id',
      'capabilityId',
      'capability_id',
      'requestNonce',
      'request_nonce',
      'proofSignature',
      'proof_signature',
      'deviceSignature',
      'device_signature',
      'rootKeyEpoch',
      'root_key_epoch',
      'pin',
      'seed',
      'vmk',
      'wallet',
      'ledger',
    ]) {
      assert.equal(
        body.includes(forbidden),
        false,
        `adapter gained forbidden authority marker ${forbidden}`,
      );
    }
  },
);

test(
  'CN4 blank optional profile fields are normalized to null before native claim',
  () => {
    const adapter = read(ADAPTER);

    const helper = boundedFunction(
      adapter,
      'function optionalPublicProfileText(',
    );

    assert.match(
      helper,
      /typeof value !== ['"]string['"]/,
    );

    assert.match(
      helper,
      /value\.trim\(\)/,
    );

    assert.match(
      helper,
      /normalized\.length > 0/,
    );

    assert.match(
      helper,
      /:\s*null/,
    );

    const claim = boundedFunction(
      adapter,
      'export async function claimNativePassportUsername(',
    );

    for (const field of [
      'display_name',
      'bio',
      'avatar_image',
    ]) {
      assert.ok(
        claim.includes(field),
        `missing optional profile field ${field}`,
      );
    }

    assert.equal(
      claim.includes(
        'optionalPublicProfileText',
      ),
      true,
      'optional public strings must pass through blank-to-null normalization',
    );
  },
);

test(
  'CN4 Rust command accepts public intent plus AppState only',
  () => {
    const rust = read(RUST);

    const body = boundedFunction(
      rust,
      'pub async fn passport_claim_username(',
    );

    assert.match(
      body,
      /intent:\s*DesktopProtectedUsernameClaimIntentV1/,
    );

    assert.match(
      body,
      /state:\s*State<'_,\s*AppState>/,
    );

    assert.match(
      body,
      /claim_physical_m1_protected_username/,
    );

    for (const forbidden of [
      'passport_subject:',
      'passport_id:',
      'device_id:',
      'capability_id:',
      'request_nonce:',
      'device_signature:',
      'root_key_epoch:',
      'recovery_words',
      'device_signing_seed',
    ]) {
      assert.equal(
        body.includes(forbidden),
        false,
        `Rust command gained forbidden authority marker ${forbidden}`,
      );
    }
  },
);

test(
  'CN4 adapter exposes public identifiers only after backend-confirmed success',
  () => {
    const green =
      normalizePassportUsernameClaimDto({
        schema:
          'crablink.native-passport.username-claim-command.v1',
        commandName:
          'passport_claim_username',
        sourcePhaseLabel:
          'CN4_PHYSICAL_M1_PROTECTED_USERNAME_HTTP_V1',
        state:
          'username_claimed',
        username:
          'testmac',
        handle:
          '@testmac',
        profileCrabUrl:
          'crab://@testmac',
        backendConfirmed:
          true,
      });

    assert.equal(
      green.backendConfirmed,
      true,
    );

    assert.equal(
      green.username,
      'testmac',
    );

    assert.equal(
      green.handle,
      '@testmac',
    );

    assert.equal(
      green.profileCrabUrl,
      'crab://@testmac',
    );

    const rejected =
      normalizePassportUsernameClaimDto({
        state:
          'username_claim_rejected',
        username:
          'should-not-pass',
        handle:
          '@should-not-pass',
        profileCrabUrl:
          'crab://@should-not-pass',
        backendConfirmed:
          false,
      });

    assert.equal(
      rejected.backendConfirmed,
      false,
    );

    assert.equal(
      rejected.username,
      '',
    );

    assert.equal(
      rejected.handle,
      '',
    );

    assert.equal(
      rejected.profileCrabUrl,
      '',
    );

    for (const forbidden of [
      'passportSubject',
      'deviceId',
      'capabilityId',
      'requestNonce',
      'proof',
      'signature',
      'secret',
    ]) {
      assert.equal(
        Object.hasOwn(
          rejected,
          forbidden,
        ),
        false,
      );
    }
  },
);
