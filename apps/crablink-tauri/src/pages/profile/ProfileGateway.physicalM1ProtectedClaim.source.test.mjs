/**
 * RO:WHAT — Locks crab://profile mutation to the CN-4 native protected username command.
 * RO:WHY — The real product claim surface must stop constructing caller-owned Passport authority before physical @testmac acceptance.
 * RO:INTERACTS — ProfileGateway.jsx, passportAdapter.js, identityClient.js read normalization, and publicProfileCache.
 * RO:INVARIANTS — profile reads may use identityClient; profile mutation must use claimNativePassportUsername with public intent only.
 * RO:METRICS — none.
 * RO:CONFIG — source-boundary test only.
 * RO:SECURITY — forbids caller-owned Passport subject, wallet authority, raw Tauri invoke, capability/proof/signature construction, and direct internal-service mutation.
 * RO:TEST — node --test this file.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = path.resolve(
  new URL(
    '../../../../..',
    import.meta.url,
  ).pathname,
);

const PROFILE = path.join(
  ROOT,
  'apps/crablink-tauri/src/pages/profile/ProfileGateway.jsx',
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
  const start =
    source.indexOf(marker);

  assert.notEqual(
    start,
    -1,
    `${marker} must exist`,
  );

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
    `${marker} parameter list must close`,
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
  'crab profile mutation uses the protected native Passport adapter',
  () => {
    const profile = read(PROFILE);
    const adapter = read(ADAPTER);

    assert.match(
      profile,
      /import\s*\{\s*claimNativePassportUsername,\s*\}\s*from\s*['"]\.\.\/\.\.\/adapters\/passportAdapter\.js['"]/,
    );

    assert.match(
      adapter,
      /export async function claimNativePassportUsername\s*\(/,
    );

    const claim = boundedFunction(
      profile,
      'async function claimProfile(',
    );

    assert.match(
      claim,
      /claimNativePassportUsername\s*\(\s*\{/,
    );

    for (const required of [
      'requestedUsername',
      'displayName',
      'bio',
      'avatarImage',
      'username_claimed',
      'backendConfirmed',
      'normalizePublicProfileResponse',
      'username_status',
      'confirmed',
      'writePublicProfileCache',
    ]) {
      assert.ok(
        claim.includes(required),
        `missing protected-claim marker ${required}`,
      );
    }
  },
);

test(
  'profile mutation no longer constructs caller-owned authority',
  () => {
    const profile = read(PROFILE);

    const claim = boundedFunction(
      profile,
      'async function claimProfile(',
    );

    for (const forbidden of [
      'identityClient.claimPassportProfile',
      'passport_subject',
      'passportSubject',
      'wallet_account',
      'walletAccount',
      'capabilityId',
      'capability_id',
      'deviceId',
      'device_id',
      'requestNonce',
      'request_nonce',
      'proof',
      'signature',
      'rootKeyEpoch',
      'root_key_epoch',
      'confirmed: true',
      'callTauri',
      'invoke(',
      '@tauri-apps/api/core',
      ':9090',
      ':5307',
    ]) {
      assert.equal(
        claim.includes(forbidden),
        false,
        `claim function retained forbidden marker ${forbidden}`,
      );
    }
  },
);

test(
  'gateway profile read remains separate from protected mutation',
  () => {
    const profile = read(PROFILE);

    const readProfile = boundedFunction(
      profile,
      'async function readProfile(',
    );

    assert.match(
      readProfile,
      /identityClient\.getPassportProfile/,
    );

    assert.doesNotMatch(
      readProfile,
      /claimNativePassportUsername/,
    );
  },
);

test(
  'protected claim failure remains unconfirmed and gives capability preparation guidance',
  () => {
    const profile = read(PROFILE);

    assert.match(
      profile,
      /username_claim_rejected/,
    );

    assert.match(
      profile,
      /Prepare username claim in the Passport drawer/,
    );

    assert.match(
      profile,
      /request_replay_rejected/,
    );

    assert.match(
      profile,
      /username_claim_service_unavailable/,
    );

    assert.match(
      profile,
      /backend confirmation still requires a[\s\S]*successful protected claim/,
    );
  },
);
