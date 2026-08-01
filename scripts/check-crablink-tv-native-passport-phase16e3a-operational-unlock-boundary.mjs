#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import {
  fileURLToPath,
} from 'node:url';

const root =
  path.resolve(
    path.dirname(
      fileURLToPath(
        import.meta.url,
      ),
    ),
    '..',
  );

function read(
  relativePath,
) {
  const absolutePath =
    path.join(
      root,
      relativePath,
    );

  if (
    !fs.existsSync(
      absolutePath,
    )
  ) {
    throw new Error(
      `Missing Phase 16E3A source: ${relativePath}`,
    );
  }

  return fs.readFileSync(
    absolutePath,
    'utf8',
  );
}

function requireFragments(
  label,
  source,
  fragments,
) {
  for (
    const fragment
    of fragments
  ) {
    if (
      !source.includes(
        fragment,
      )
    ) {
      throw new Error(
        `${label} missing: ${fragment}`,
      );
    }
  }
}

function rejectFragments(
  label,
  source,
  fragments,
) {
  for (
    const fragment
    of fragments
  ) {
    if (
      source.includes(
        fragment,
      )
    ) {
      throw new Error(
        `${label} contains forbidden fragment: ${fragment}`,
      );
    }
  }
}

const unlock =
  read(
    'apps/crablink-tv/src-tauri/src/passport_tv_operational_unlock.rs',
  );

const authority =
  read(
    'apps/crablink-tv/src-tauri/src/passport_tv_authority_runtime.rs',
  );

const lifecycle =
  read(
    'apps/crablink-tv/src-tauri/src/passport_tv_native_pin_lifecycle.rs',
  );

const lib =
  read(
    'apps/crablink-tv/src-tauri/src/lib.rs',
  );

const tvPackage =
  JSON.parse(
    read(
      'apps/crablink-tv/package.json',
    ),
  );

const rootPackage =
  JSON.parse(
    read(
      'package.json',
    ),
  );

const codebundle =
  read(
    'scripts/make_codebundle.sh',
  );

requireFragments(
  'Phase 16E3A operational unlock',
  unlock,
  [
    'crablink.tv.operational-unlock.v1',
    'TvOperationalMaterialPort',
    'TvOperationalUnlockGrant',
    'TvOperationalUnlockRuntime',
    'Zeroizing<Vec<u8>>',
    'unseal_device_signing_key',
    'unseal_narrow_capability',
    'unlock_after_native_pin',
    'clear_operational_material',
    'NativePinCancelled',
    'NativePinRejected',
    'NativePromptUnavailable',
    'DeviceMaterialUnsealFailed',
    'CapabilityUnsealFailed',
    'AuthorityUnlockFailed',
    'phase16e3a_nonaccepted_pin_never_invokes_unseal_port',
    'phase16e3a_valid_native_material_unlocks_authority_runtime',
    'phase16e3a_invalid_device_key_length_fails_closed',
    'phase16e3a_invalid_capability_length_fails_closed',
    'phase16e3a_platform_unseal_failure_fails_closed',
    'phase16e3a_lock_clears_operational_material_and_authority',
  ],
);

const tests =
  [
    ...unlock.matchAll(
      /fn\s+(phase16e3a_[a-z0-9_]+)\s*\(\s*\)/gu,
    ),
  ];

if (
  tests.length !== 6
) {
  throw new Error(
    `Phase 16E3A test count ${tests.length}; expected 6`,
  );
}

rejectFragments(
  'Phase 16E3A operational unlock',
  unlock,
  [
    'derive(Debug)]\npub(crate) struct TvOperationalUnlockRuntime',
    'Serialize)]\npub(crate) struct TvOperationalUnlockRuntime',
    'pin: String',
    'pin: &str',
    'pin: Vec<u8>',
    'recovery_phrase',
    'root_private_key',
    'wallet.spend',
    'wallet.transfer',
    'ledger.write',
  ],
);

requireFragments(
  'Phase 16E3A authority handoff',
  authority,
  [
    'TvOperationalUnlockGrant',
    'unlock_with_native_grant',
    'grant.allows_device_proof()',
    'lock_operational_state',
    'snapshot.operationally_unlocked = true',
    'snapshot.device_proof_available = true',
    'snapshot.session_present = true',
  ],
);

requireFragments(
  'Phase 16E1 predecessor',
  lifecycle,
  [
    'TvNativePinLifecycleRuntime',
    'record_native_pin_result',
    'TvLifecycleLockReason',
  ],
);

requireFragments(
  'Phase 16E3A module registration',
  lib,
  [
    'mod passport_tv_operational_unlock;',
  ],
);

const commands =
  [
    ...new Set(
      [
        ...lib.matchAll(
          /commands::[a-z_]+::(tv_[a-z_]+)/gu,
        ),
      ]
        .map(
          (match) =>
            match[1],
        ),
    ),
  ];

if (
  commands.length !== 8 ||
  commands.some(
    (command) =>
      command.includes(
        'passport',
      ),
  )
) {
  throw new Error(
    `TV command allowlist changed: ${commands.join(',')}`,
  );
}

if (
  tvPackage.scripts[
    'test:native-passport-phase16e3a-operational-unlock'
  ] !==
  'cargo test --manifest-path src-tauri/Cargo.toml --offline phase16e3a_'
) {
  throw new Error(
    'Phase 16E3A TV test script mismatch',
  );
}

if (
  tvPackage.scripts[
    'check:native-passport-phase16e3a-operational-unlock'
  ] !==
  'node ../../scripts/check-crablink-tv-native-passport-phase16e3a-operational-unlock-boundary.mjs'
) {
  throw new Error(
    'Phase 16E3A TV boundary script mismatch',
  );
}

if (
  rootPackage.scripts[
    'tv:native-passport:phase16e3a:operational-unlock:test'
  ] !==
  'npm --prefix apps/crablink-tv run test:native-passport-phase16e3a-operational-unlock'
) {
  throw new Error(
    'Phase 16E3A root test script mismatch',
  );
}

if (
  rootPackage.scripts[
    'tv:native-passport:phase16e3a:operational-unlock:check'
  ] !==
  'node scripts/check-crablink-tv-native-passport-phase16e3a-operational-unlock-boundary.mjs'
) {
  throw new Error(
    'Phase 16E3A root boundary script mismatch',
  );
}

if (
  !codebundle.includes(
    'check-crablink-tv-native-passport-phase16e3a-operational-unlock-boundary.mjs',
  )
) {
  throw new Error(
    'Phase 16E3A boundary absent from future codebundle selection',
  );
}

console.log(
  'CrabLink TV Native Passport Phase 16E3A operational-unlock boundary passed.',
);

console.log(
  'NATIVE_PASSPORT_PHASE16E3A_OPERATIONAL_UNLOCK=GREEN',
);

console.log(
  'ZEROIZING_OPERATIONAL_MATERIAL=ADDED',
);

console.log(
  'D3_PRODUCTION_UNLOCK_GRANT=ADDED',
);

console.log(
  'ANDROID_KEYSTORE_UNSEAL_JNI=NOT_ADDED',
);

console.log(
  'NATIVE_PIN_VERIFIER_HANDOFF=NOT_ADDED',
);

console.log(
  'PUBLIC_TAURI_COMMAND=NOT_ADDED',
);

console.log(
  'NEXT_PATCH=NATIVE_PASSPORT_PHASE16E3B_ANDROID_UNSEAL_AND_PIN_HANDOFF',
);
