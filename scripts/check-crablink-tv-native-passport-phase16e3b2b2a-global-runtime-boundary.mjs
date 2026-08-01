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
      `Missing Phase 16E3B2B2A source: ${relativePath}`,
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

const jni =
  read(
    'apps/crablink-tv/src-tauri/src/passport_android_jni.rs',
  );

const mainActivity =
  read(
    'apps/crablink-tv/src-tauri/gen/android/app/src/main/java/com/rustyonions/crablink/tv/MainActivity.kt',
  );

const verifier =
  read(
    'apps/crablink-tv/src-tauri/gen/android/app/src/main/java/com/rustyonions/crablink/tv/TvPassportNativePinVerifierStore.kt',
  );

const deviceBridge =
  read(
    'apps/crablink-tv/src-tauri/gen/android/app/src/main/java/com/rustyonions/crablink/tv/TvPassportDeviceMaterialBridge.kt',
  );

const authorityBridge =
  read(
    'apps/crablink-tv/src-tauri/gen/android/app/src/main/java/com/rustyonions/crablink/tv/TvPassportDelegatedAuthorityBridge.kt',
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
  'Phase 16E3B2B2A global operational runtime',
  unlock,
  [
    '#[cfg(target_os = "android")]',
    'use std::sync::{Mutex, OnceLock};',
    'GLOBAL_TV_OPERATIONAL_UNLOCK_RUNTIME',
    'OnceLock<Mutex<TvOperationalUnlockRuntime>>',
    'global_tv_operational_unlock_runtime',
    'unlock_global_after_verified_native_pin',
    'TvOperationalUnlockError::RuntimeUnavailable',
    'global_tv_authority_runtime',
    'authority_runtime.snapshot()',
    'device_authorized',
    'authority_snapshot.authorization_present',
    'authority_snapshot.capability_present',
    'authority_snapshot.device_bound',
    'authority_snapshot.passport_bound',
    'authority_snapshot.revoked',
    'hydrate_restart_locked(',
    'TvNativePinPromptResult::Accepted',
    'unlock_after_native_pin(',
  ],
);

requireFragments(
  'Phase 16E3B2B2A authority runtime access',
  authority,
  [
    'static GLOBAL_TV_AUTHORITY_RUNTIME',
    'pub(crate) fn global_tv_authority_runtime()',
    'hydrate_global_tv_authority_runtime',
    'clear_global_tv_authority_runtime',
  ],
);

requireFragments(
  'Phase 16E3B2A verified-ticket predecessor',
  verifier,
  [
    'consumeVerifiedPinTicketForNative',
    'pendingVerifiedTicket',
    'VERIFIED_TICKET_LIFETIME_MS',
  ],
);

requireFragments(
  'Phase 16E3B2B1 device-unseal predecessor',
  deviceBridge,
  [
    'unsealStoredDeviceKeyForNative',
    'keystoreBridge.unseal(',
  ],
);

requireFragments(
  'Phase 16E3B2B1 capability-unseal predecessor',
  authorityBridge,
  [
    'unsealStoredNarrowCapabilityForNative',
    'keystoreBridge.unseal(',
  ],
);

const phase16e3b2b2cBoundaryRelativePath =
  'scripts/check-crablink-tv-native-passport-phase16e3b2b2c-redacted-jni-export-boundary.mjs';

const phase16e3b2b2cBridgeRelativePath =
  'apps/crablink-tv/src-tauri/gen/android/app/src/main/java/com/rustyonions/crablink/tv/TvPassportOperationalUnlockBridge.kt';

const phase16e3b2b2cPresent =
  fs.existsSync(
    path.join(
      root,
      phase16e3b2b2cBoundaryRelativePath,
    ),
  ) &&
  fs.existsSync(
    path.join(
      root,
      phase16e3b2b2cBridgeRelativePath,
    ),
  );

if (
  phase16e3b2b2cPresent
) {
  const phase16e3b2b2cBoundary =
    read(
      phase16e3b2b2cBoundaryRelativePath,
    );

  const operationalBridge =
    read(
      phase16e3b2b2cBridgeRelativePath,
    );

  requireFragments(
    'Phase 16E3B2B2C authorized successor boundary',
    phase16e3b2b2cBoundary,
    [
      'NATIVE_PASSPORT_PHASE16E3B2B2C_REDACTED_JNI_EXPORT=GREEN',
      'JNI_EXPORT_COUNT=1',
      'PIN_ARGUMENT_CROSSES_JNI=NO',
      'PROMPT_INVOCATION=NOT_ADDED',
    ],
  );

  requireFragments(
    'Phase 16E3B2B2C authorized operational bridge',
    operationalBridge,
    [
      'class TvPassportOperationalUnlockBridge',
      'unlockAfterVerifiedNativePin',
    ],
  );

  requireFragments(
    'Phase 16E3B2B2C authorized JNI handoff',
    jni,
    [
      'Java_com_rustyonions_crablink_tv_TvPassportOperationalUnlockBridge_unlockAfterVerifiedNativePin',
      'unlock_operational_runtime_from_verified_ticket',
      'fail_closed_global_operational_unlock',
    ],
  );

  requireFragments(
    'Phase 16E3B2B2C MainActivity bridge ownership',
    mainActivity,
    [
      'TvPassportOperationalUnlockBridge',
    ],
  );

  rejectFragments(
    'Phase 16E3B2B2C premature Android prompt invocation',
    mainActivity,
    [
      '.requestUnlock(',
      '.enroll(',
      '.verify(',
    ],
  );
} else {
  rejectFragments(
    'Phase 16E3B2B2A premature JNI handoff',
    jni,
    [
      'consumeVerifiedPinTicketForNative',
      'unsealStoredDeviceKeyForNative',
      'unsealStoredNarrowCapabilityForNative',
      'unlockOperationalRuntimeAfterVerifiedNativePin',
      'unlockAfterVerifiedNativePin',
      'AndroidJniOperationalMaterialPort',
    ],
  );

  rejectFragments(
    'Phase 16E3B2B2A premature Android invocation',
    mainActivity,
    [
      'unlockOperationalRuntimeAfterVerifiedNativePin',
      'unlockAfterVerifiedNativePin',
      '.requestUnlock(',
      '.enroll(',
      '.verify(',
    ],
  );
}

rejectFragments(
  'Phase 16E3B2B2A forbidden Rust secret surfaces',
  unlock,
  [
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

const productionZeroizingImports =
  (
    unlock.match(
      /^use zeroize::Zeroizing;$/gmu,
    ) ?? []
  ).length;

const testZeroizingImports =
  (
    unlock.match(
      /^[ \t]+use zeroize::Zeroizing;$/gmu,
    ) ?? []
  ).length;

if (
  productionZeroizingImports !==
  1
) {
  throw new Error(
    `Expected one production Zeroizing import, found ${productionZeroizingImports}`,
  );
}

if (
  testZeroizingImports !==
  1
) {
  throw new Error(
    `Expected one test Zeroizing import, found ${testZeroizingImports}`,
  );
}

const commands =
  [
    ...new Set(
      [
        ...lib.matchAll(
          /commands::[a-z_]+::(tv_[a-z_]+)/gu,
        ),
      ]
        .map(
          (
            match,
          ) =>
            match[
              1
            ],
        ),
    ),
  ];

if (
  commands.length !==
  8 ||
  commands.some(
    (
      command,
    ) =>
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
    'check:native-passport-phase16e3b2b2a-global-runtime'
  ] !==
  'node ../../scripts/check-crablink-tv-native-passport-phase16e3b2b2a-global-runtime-boundary.mjs'
) {
  throw new Error(
    'Phase 16E3B2B2A TV boundary script mismatch',
  );
}

if (
  rootPackage.scripts[
    'tv:native-passport:phase16e3b2b2a:global-runtime:check'
  ] !==
  'node scripts/check-crablink-tv-native-passport-phase16e3b2b2a-global-runtime-boundary.mjs'
) {
  throw new Error(
    'Phase 16E3B2B2A root boundary script mismatch',
  );
}

if (
  !codebundle.includes(
    'check-crablink-tv-native-passport-phase16e3b2b2a-global-runtime-boundary.mjs',
  )
) {
  throw new Error(
    'Phase 16E3B2B2A boundary absent from future codebundle selection',
  );
}

console.log(
  'CrabLink TV Native Passport Phase 16E3B2B2A global-runtime boundary passed.',
);

console.log(
  'NATIVE_PASSPORT_PHASE16E3B2B2A_GLOBAL_RUNTIME=GREEN',
);

console.log(
  phase16e3b2b2cPresent
    ? 'GLOBAL_OPERATIONAL_RUNTIME=CONNECTED_BY_PHASE16E3B2B2C'
    : 'GLOBAL_OPERATIONAL_RUNTIME=ADDED_NOT_INVOKED',
);

console.log(
  'GLOBAL_AUTHORITY_RUNTIME_ACCESS=NARROW_CRATE_ONLY',
);

console.log(
  phase16e3b2b2cPresent
    ? 'VERIFIED_PIN_TICKET_CONSUMPTION=CONNECTED_BY_PHASE16E3B2B2C'
    : 'VERIFIED_PIN_TICKET_CONSUMPTION=NOT_CONNECTED',
);

console.log(
  phase16e3b2b2cPresent
    ? 'ANDROID_KEYSTORE_UNSEAL_INVOCATION=CONNECTED_BY_PHASE16E3B2B2C'
    : 'ANDROID_KEYSTORE_UNSEAL_INVOCATION=NOT_CONNECTED',
);

console.log(
  phase16e3b2b2cPresent
    ? 'JNI_OPERATIONAL_UNLOCK_HANDOFF=OWNED_BY_PHASE16E3B2B2C'
    : 'JNI_OPERATIONAL_UNLOCK_HANDOFF=NOT_ADDED',
);

console.log(
  'PROMPT_INVOCATION=NOT_ADDED',
);

console.log(
  'PUBLIC_TAURI_COMMAND=NOT_ADDED',
);

console.log(
  phase16e3b2b2cPresent
    ? 'NEXT_PATCH=NATIVE_PASSPORT_PHASE16E3B3_PIN_ENROLLMENT_AND_PROMPT_INVOCATION'
    : 'NEXT_PATCH=NATIVE_PASSPORT_PHASE16E3B2B2B_VERIFIED_TICKET_JNI_MATERIAL_PORT',
);
