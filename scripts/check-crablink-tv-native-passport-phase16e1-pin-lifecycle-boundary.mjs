#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing Phase 16E1 source: ${relativePath}`);
  }

  return fs.readFileSync(absolutePath, 'utf8');
}

function requireFragments(label, source, fragments) {
  for (const fragment of fragments) {
    if (!source.includes(fragment)) {
      throw new Error(`${label} missing: ${fragment}`);
    }
  }
}

function rejectFragments(label, source, fragments) {
  for (const fragment of fragments) {
    if (source.includes(fragment)) {
      throw new Error(
        `${label} contains forbidden fragment: ${fragment}`,
      );
    }
  }
}

const lifecycle = read(
  'apps/crablink-tv/src-tauri/src/passport_tv_native_pin_lifecycle.rs',
);

const lib = read(
  'apps/crablink-tv/src-tauri/src/lib.rs',
);

const tvPackage = JSON.parse(
  read('apps/crablink-tv/package.json'),
);

const rootPackage = JSON.parse(
  read('package.json'),
);

const codebundleScript = read(
  'scripts/make_codebundle.sh',
);

requireFragments(
  'Phase 16E1 lifecycle',
  lifecycle,
  [
    'crablink.tv.native-pin-lifecycle.v1',
    'TvNativePinLifecycleInputsV1',
    'TvNativePinLifecycleSnapshotV1',
    'TvNativePinLifecycleRuntime',
    'TvNativePinPromptResult',
    'TvLifecycleLockReason',
    'DeviceMaterialAbsent',
    'DeviceAuthorizationAbsent',
    'CapabilityAbsent',
    'DeviceRevoked',
    'NativePinCancelled',
    'NativePinRejected',
    'NativePromptUnavailable',
    'hydrate_restart_locked',
    'record_native_pin_result',
    'operational_secret_present',
    'proof_sensitive_ready',
    'phase16e1_distinguishes_material_authority_capability_and_session',
    'phase16e1_restart_hydration_always_begins_locked',
    'phase16e1_native_pin_acceptance_requires_complete_authority',
    'phase16e1_cancel_wrong_pin_and_unavailable_prompt_fail_closed',
    'phase16e1_background_and_suspension_clear_operational_state',
    'phase16e1_revocation_blocks_unlock_and_proof_readiness',
  ],
);

const tests = [
  ...lifecycle.matchAll(
    /fn\s+(phase16e1_[a-z0-9_]+)\s*\(\s*\)/gu,
  ),
];

if (tests.length !== 6) {
  throw new Error(
    `Phase 16E1 test count ${tests.length}; expected 6`,
  );
}

rejectFragments(
  'Phase 16E1 lifecycle',
  lifecycle,
  [
    'pin: String',
    'pin: &str',
    'pin: Vec<u8>',
    'pin_bytes',
    'recovery_phrase',
    'root_private_key',
    'wallet.spend',
    'wallet.transfer',
    'ledger.write',
  ],
);

requireFragments(
  'Phase 16E1 registration',
  lib,
  [
    'mod passport_tv_native_pin_lifecycle;',
  ],
);

const commands = [
  ...new Set(
    [...lib.matchAll(/commands::[a-z_]+::(tv_[a-z_]+)/gu)]
      .map((match) => match[1]),
  ),
];

if (
  commands.length !== 8 ||
  commands.some((command) => command.includes('passport'))
) {
  throw new Error(
    `TV command allowlist changed: ${commands.join(',')}`,
  );
}

if (
  tvPackage.scripts[
    'test:native-passport-phase16e1-pin-lifecycle'
  ] !==
  'cargo test --manifest-path src-tauri/Cargo.toml --offline phase16e1_'
) {
  throw new Error('Phase 16E1 TV test script mismatch');
}

if (
  tvPackage.scripts[
    'check:native-passport-phase16e1-pin-lifecycle'
  ] !==
  'node ../../scripts/check-crablink-tv-native-passport-phase16e1-pin-lifecycle-boundary.mjs'
) {
  throw new Error('Phase 16E1 TV boundary script mismatch');
}

if (
  rootPackage.scripts[
    'tv:native-passport:phase16e1:pin-lifecycle:test'
  ] !==
  'npm --prefix apps/crablink-tv run test:native-passport-phase16e1-pin-lifecycle'
) {
  throw new Error('Phase 16E1 root test script mismatch');
}

if (
  rootPackage.scripts[
    'tv:native-passport:phase16e1:pin-lifecycle:check'
  ] !==
  'node scripts/check-crablink-tv-native-passport-phase16e1-pin-lifecycle-boundary.mjs'
) {
  throw new Error('Phase 16E1 root boundary script mismatch');
}

if (
  !codebundleScript.includes(
    'check-crablink-tv-native-passport-phase16e1-pin-lifecycle-boundary.mjs',
  )
) {
  throw new Error(
    'Phase 16E1 boundary absent from future codebundle selection',
  );
}

console.log(
  'CrabLink TV Native Passport Phase 16E1 PIN/lifecycle boundary passed.',
);

console.log(
  'NATIVE_PASSPORT_PHASE16E1_PIN_LIFECYCLE=GREEN',
);

console.log(
  'NATIVE_ANDROID_PIN_PROMPT=NOT_ADDED',
);

console.log(
  'PRODUCTION_DEVICE_MATERIAL_UNSEAL=NOT_ADDED',
);

console.log(
  'DEVICE_PROOF_SIGNING_RUNTIME=LOCKED_PENDING_PHASE16E2_AND_E3',
);

console.log(
  'PUBLIC_TAURI_COMMAND=NOT_ADDED',
);
