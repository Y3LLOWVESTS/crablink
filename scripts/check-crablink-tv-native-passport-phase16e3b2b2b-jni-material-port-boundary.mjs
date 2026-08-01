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
      `Missing Phase 16E3B2B2B source: ${relativePath}`,
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

const materialPort =
  read(
    'apps/crablink-tv/src-tauri/src/passport_android_operational_material_port.rs',
  );

const unlock =
  read(
    'apps/crablink-tv/src-tauri/src/passport_tv_operational_unlock.rs',
  );

const jni =
  read(
    'apps/crablink-tv/src-tauri/src/passport_android_jni.rs',
  );

const lib =
  read(
    'apps/crablink-tv/src-tauri/src/lib.rs',
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
  'Phase 16E3B2B2B module registration',
  lib,
  [
    '#[cfg(target_os = "android")]',
    'mod passport_android_operational_material_port;',
    'mod passport_android_jni;',
  ],
);

requireFragments(
  'Phase 16E3B2B2B JNI material port',
  materialPort,
  [
    '#![cfg(target_os = "android")]',
    '#![forbid(unsafe_code)]',
    'AndroidJniOperationalMaterialPort',
    'TvOperationalMaterialPort',
    'TvOperationalMaterialPortError',
    'TvOperationalUnlockReceiptV1',
    'Zeroizing<Vec<u8>>',
    'call_zeroizing_java_byte_array',
    'clear_java_byte_array',
    'set_byte_array_region',
    'convert_byte_array',
    'clear_pending_exception',
    'consumeVerifiedPinTicketForNative',
    'unsealStoredDeviceKeyForNative',
    'unsealStoredNarrowCapabilityForNative',
    'VERIFIED_PIN_TICKET_BYTES',
    'DEVICE_SIGNING_KEY_BYTES',
    'MAX_NARROW_CAPABILITY_BYTES',
    'JAVA_ARRAY_ZERO_CHUNK_BYTES',
    'VerifiedTicketUnavailable',
    'VerifiedTicketInvalid',
    'VerifiedTicketClearFailed',
    'unlock_after_consumed_verified_ticket',
    'drop(verified_ticket);',
    'unlock_global_after_verified_native_pin',
  ],
);

requireFragments(
  'Phase 16E3B2B2B ticket predecessor',
  verifier,
  [
    'consumeVerifiedPinTicketForNative',
    'VERIFIED_TICKET_BYTES',
    'VERIFIED_TICKET_LIFETIME_MS',
    'pendingVerifiedTicket',
    'ticket?.fill(',
  ],
);

requireFragments(
  'Phase 16E3B2B2B device-unseal predecessor',
  deviceBridge,
  [
    'unsealStoredDeviceKeyForNative',
    'keystoreBridge.unseal(',
    'DEVICE_KEY_BYTES',
  ],
);

requireFragments(
  'Phase 16E3B2B2B capability-unseal predecessor',
  authorityBridge,
  [
    'unsealStoredNarrowCapabilityForNative',
    'keystoreBridge.unseal(',
    'MAX_CAPABILITY_PLAINTEXT_BYTES',
  ],
);

requireFragments(
  'Phase 16E3B2B2B global-runtime predecessor',
  unlock,
  [
    'GLOBAL_TV_OPERATIONAL_UNLOCK_RUNTIME',
    'unlock_global_after_verified_native_pin',
    'TvOperationalMaterialPort',
    'Zeroizing<Vec<u8>>',
  ],
);

rejectFragments(
  'Phase 16E3B2B2B exported JNI surface',
  materialPort,
  [
    '#[no_mangle]',
    'extern "system"',
    'pub extern',
    'jstring',
    'JString',
    'java_string_or_null',
    'new_string(',
  ],
);

rejectFragments(
  'Phase 16E3B2B2B serialization surface',
  materialPort,
  [
    'serde::',
    'Serialize',
    'Deserialize',
    'serde_json',
    'JSONObject',
  ],
);

rejectFragments(
  'Phase 16E3B2B2B secret logging surface',
  materialPort,
  [
    'println!',
    'eprintln!',
    'dbg!',
    'tracing::',
    'log::',
  ],
);

rejectFragments(
  'Phase 16E3B2B2B forbidden secret inputs',
  materialPort,
  [
    'pin: String',
    'pin: &str',
    'pin: Vec<u8>',
    'CharArray',
    'recovery_phrase',
    'recoveryPhrase',
    'root_private_key',
    'rootPrivateKey',
    'wallet.spend',
    'wallet.transfer',
    'ledger.write',
  ],
);

const successorExport =
  'Java_com_rustyonions_crablink_tv_TvPassportOperationalUnlockBridge_unlockAfterVerifiedNativePin';

const successorExportPresent =
  jni.includes(
    successorExport,
  );

if (
  successorExportPresent
) {
  requireFragments(
    'Phase 16E3B2B2B reviewed successor export',
    jni,
    [
      successorExport,
      'unlock_operational_runtime_from_verified_ticket',
      'fail_closed_global_operational_unlock',
    ],
  );

  rejectFragments(
    'Phase 16E3B2B2B unauthorized successor export',
    jni,
    [
      'unlockOperationalRuntimeAfterVerifiedNativePin',
      'AndroidJniOperationalMaterialPort',
    ],
  );
} else {
  rejectFragments(
    'Phase 16E3B2B2B premature existing JNI export',
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
}

rejectFragments(
  'Phase 16E3B2B2B premature Android invocation',
  mainActivity,
  [
    'unlockOperationalRuntimeAfterVerifiedNativePin',
    'unlockAfterVerifiedNativePin',
    '.requestUnlock(',
    '.enroll(',
    '.verify(',
  ],
);

const orchestrationStart =
  materialPort.indexOf(
    'pub(crate) fn unlock_after_consumed_verified_ticket',
  );

if (
  orchestrationStart <
  0
) {
  throw new Error(
    'Phase 16E3B2B2B orchestration function missing',
  );
}

const orchestration =
  materialPort.slice(
    orchestrationStart,
  );

const ticketIndex =
  orchestration.indexOf(
    '"consumeVerifiedPinTicketForNative"',
  );

const ticketLengthIndex =
  orchestration.indexOf(
    'verified_ticket.len()',
  );

const ticketDropIndex =
  orchestration.indexOf(
    'drop(verified_ticket);',
  );

const portIndex =
  orchestration.indexOf(
    'AndroidJniOperationalMaterialPort',
  );

const unlockIndex =
  orchestration.indexOf(
    'unlock_global_after_verified_native_pin',
  );

if (
  !(
    ticketIndex >=
      0 &&
    ticketLengthIndex >
      ticketIndex &&
    ticketDropIndex >
      ticketLengthIndex &&
    portIndex >
      ticketDropIndex &&
    unlockIndex >
      portIndex
  )
) {
  throw new Error(
    'Phase 16E3B2B2B ticket-consume ordering is invalid',
  );
}

const setRegionCount =
  (
    materialPort.match(
      /set_byte_array_region/gu,
    ) ?? []
  ).length;

const convertArrayCount =
  (
    materialPort.match(
      /convert_byte_array/gu,
    ) ?? []
  ).length;

const ticketMethodCount =
  (
    materialPort.match(
      /"consumeVerifiedPinTicketForNative"/gu,
    ) ?? []
  ).length;

const deviceMethodCount =
  (
    materialPort.match(
      /"unsealStoredDeviceKeyForNative"/gu,
    ) ?? []
  ).length;

const capabilityMethodCount =
  (
    materialPort.match(
      /"unsealStoredNarrowCapabilityForNative"/gu,
    ) ?? []
  ).length;

if (
  setRegionCount !==
  1
) {
  throw new Error(
    `Expected one Java-array zeroization call, found ${setRegionCount}`,
  );
}

if (
  convertArrayCount !==
  1
) {
  throw new Error(
    `Expected one Java-array conversion helper, found ${convertArrayCount}`,
  );
}

if (
  ticketMethodCount !==
    1 ||
  deviceMethodCount !==
    1 ||
  capabilityMethodCount !==
    1
) {
  throw new Error(
    'Phase 16E3B2B2B native method-call count mismatch',
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

const expectedTvScript =
  'node ../../scripts/check-crablink-tv-native-passport-phase16e3b2b2b-jni-material-port-boundary.mjs';

const expectedRootScript =
  'node scripts/check-crablink-tv-native-passport-phase16e3b2b2b-jni-material-port-boundary.mjs';

if (
  tvPackage.scripts[
    'check:native-passport-phase16e3b2b2b-jni-material-port'
  ] !==
  expectedTvScript
) {
  throw new Error(
    'Phase 16E3B2B2B TV package script mismatch',
  );
}

if (
  rootPackage.scripts[
    'tv:native-passport:phase16e3b2b2b:jni-material-port:check'
  ] !==
  expectedRootScript
) {
  throw new Error(
    'Phase 16E3B2B2B root package script mismatch',
  );
}

if (
  !codebundle.includes(
    'check-crablink-tv-native-passport-phase16e3b2b2b-jni-material-port-boundary.mjs',
  )
) {
  throw new Error(
    'Phase 16E3B2B2B boundary absent from future codebundle selection',
  );
}

console.log(
  'CrabLink TV Native Passport Phase 16E3B2B2B JNI material-port boundary passed.',
);

console.log(
  'NATIVE_PASSPORT_PHASE16E3B2B2B_JNI_MATERIAL_PORT=GREEN',
);

console.log(
  'VERIFIED_PIN_TICKET=CONSUMED_ONCE_BEFORE_UNSEAL',
);

console.log(
  'JAVA_SECRET_ARRAYS=ZEROIZED_THROUGH_JNI',
);

console.log(
  'RUST_SECRET_BUFFERS=ZEROIZING',
);

console.log(
  'DEVICE_KEY_UNSEAL=CONNECTED_NOT_INVOKED',
);

console.log(
  'CAPABILITY_UNSEAL=CONNECTED_NOT_INVOKED',
);

console.log(
  'GLOBAL_OPERATIONAL_RUNTIME=CONNECTED_NOT_INVOKED',
);

console.log(
  successorExportPresent
    ? 'JNI_EXPORT=OWNED_BY_PHASE16E3B2B2C'
    : 'JNI_EXPORT=NOT_ADDED',
);

console.log(
  'PROMPT_INVOCATION=NOT_ADDED',
);

console.log(
  'PUBLIC_TAURI_COMMAND=NOT_ADDED',
);

console.log(
  successorExportPresent
    ? 'NEXT_PATCH=NATIVE_PASSPORT_PHASE16E3B3_PIN_ENROLLMENT_AND_PROMPT_INVOCATION'
    : 'NEXT_PATCH=NATIVE_PASSPORT_PHASE16E3B2B2C_REDACTED_JNI_EXPORT',
);
