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

function read(relativePath) {
  const absolutePath =
    path.join(
      root,
      relativePath,
    );

  if (!fs.existsSync(absolutePath)) {
    throw new Error(
      `Missing Phase 16C4A source: ${relativePath}`,
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
  for (const fragment of fragments) {
    if (!source.includes(fragment)) {
      throw new Error(
        `${label} is missing: ${fragment}`,
      );
    }
  }
}

function rejectFragments(
  label,
  source,
  fragments,
) {
  for (const fragment of fragments) {
    if (source.includes(fragment)) {
      throw new Error(
        `${label} contains forbidden fragment: ${fragment}`,
      );
    }
  }
}

const runtime =
  read(
    'apps/crablink-tv/src-tauri/src/passport_tv_pairing_runtime.rs',
  );

const jni =
  read(
    'apps/crablink-tv/src-tauri/src/passport_android_jni.rs',
  );

const pairingBegin =
  read(
    'apps/crablink-tv/src-tauri/src/commands/pairing_begin.rs',
  );

const bridge =
  read(
    'apps/crablink-tv/src-tauri/gen/android/app/src/main/java/com/rustyonions/crablink/tv/TvPassportDeviceMaterialBridge.kt',
  );

const store =
  read(
    'apps/crablink-tv/src-tauri/gen/android/app/src/main/java/com/rustyonions/crablink/tv/TvPassportDeviceMaterialStore.kt',
  );

const mainActivity =
  read(
    'apps/crablink-tv/src-tauri/gen/android/app/src/main/java/com/rustyonions/crablink/tv/MainActivity.kt',
  );

const proguard =
  read(
    'apps/crablink-tv/src-tauri/gen/android/app/proguard-rules.pro',
  );

const tvLib =
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

const makeCodebundle =
  read(
    'scripts/make_codebundle.sh',
  );

requireFragments(
  'Phase 16C4A Rust startup hydration',
  runtime,
  [
    'MAX_STORED_PUBLIC_RECORD_JSON_BYTES',
    'StoredTvDeviceMaterialPublicRecordV1',
    'register_tv_pairing_public_device_record_json',
    'decode_stored_tv_device_public_record_json',
    '#[serde(',
    'deny_unknown_fields',
    'generated_from_os_csprng',
    'sealed_by_android_keystore_jni',
    'stored_by_android_atomic_file',
    'PublicRecordJsonInvalid',
    'phase16c4_hydrates_valid_stored_public_record_json',
    'phase16c4_rejects_unknown_or_unsafe_stored_public_record_json',
    'phase16c4_changed_hydrated_key_invalidates_pending_request',
  ],
);

requireFragments(
  'Phase 16C4A JNI startup hydration',
  jni,
  [
    'crablink.tv.passport-startup-hydration.v1',
    'hydrate_stored_public_record',
    'readStoredPublicRecordForNative',
    'register_tv_pairing_public_device_record_json',
    'Java_com_rustyonions_crablink_tv_TvPassportDeviceMaterialBridge_hydrateStoredPublicRecord',
    'stored_public_record_read_failed',
    'stored_public_record_invalid',
    'public_record_hydrated',
    'authorization_present:',
    'capability_present:',
    'session_present:',
    'exception_clear',
    'catch_unwind',
  ],
);

const requiredFalseStateFields = [
  {
    field:
      'authorization_present',

    pattern:
      /\bauthorization_present\s*:\s*false\s*,/u,
  },
  {
    field:
      'capability_present',

    pattern:
      /\bcapability_present\s*:\s*false\s*,/u,
  },
  {
    field:
      'session_present',

    pattern:
      /\bsession_present\s*:\s*false\s*,/u,
  },
];

for (
  const {
    field,
    pattern,
  }
  of requiredFalseStateFields
) {
  if (
    !pattern.test(
      jni,
    )
  ) {
    throw new Error(
      `Phase 16C4A false-state field is not locked false: ${field}`,
    );
  }
}

requireFragments(
  'Phase 16C4A Android bridge',
  bridge,
  [
    'external fun hydrateStoredPublicRecord()',
    'fun readStoredPublicRecordForNative()',
    'store.readPublicRecordJson()',
  ],
);

requireFragments(
  'Phase 16C4A Android store',
  store,
  [
    '@Synchronized',
    'fun readPublicRecordJson()',
    'atomicFile.readFully()',
    'decodeStorePayload(',
    'validatePublicRecordBytes(',
    'validateSealedEnvelope(',
    'String(',
    'StandardCharsets.UTF_8',
  ],
);

requireFragments(
  'Phase 16C4A Android startup',
  mainActivity,
  [
    'super.onCreate(savedInstanceState)',
    'tvPassportDeviceMaterialBridge',
    '.hydrateStoredPublicRecord()',
    'enqueueCrabIntent(intent)',
  ],
);

const superIndex =
  mainActivity.indexOf(
    'super.onCreate(savedInstanceState)',
  );

const hydrationIndex =
  mainActivity.indexOf(
    '.hydrateStoredPublicRecord()',
  );

const intentIndex =
  mainActivity.indexOf(
    'enqueueCrabIntent(intent)',
  );

if (
  superIndex < 0
  || hydrationIndex <= superIndex
  || intentIndex <= hydrationIndex
) {
  throw new Error(
    'Phase 16C4A startup hydration ordering is invalid.',
  );
}

requireFragments(
  'Phase 16C4A release JNI keep rules',
  proguard,
  [
    'public native java.lang.String hydrateStoredPublicRecord();',
    'public java.lang.String readStoredPublicRecordForNative();',
  ],
);

const storeReadStart =
  store.indexOf(
    'fun readPublicRecordJson()',
  );

const storeReadEnd =
  store.indexOf(
    '@Synchronized\n  fun inspect()',
    storeReadStart,
  );

if (
  storeReadStart < 0
  || storeReadEnd < 0
) {
  throw new Error(
    'Unable to isolate Phase 16C4A store read method.',
  );
}

const storeReadMethod =
  store.slice(
    storeReadStart,
    storeReadEnd,
  );

requireFragments(
  'Phase 16C4A public-record-only read',
  storeReadMethod,
  [
    'reviewed.publicRecordBytes',
    'validateSealedEnvelope(',
  ],
);

rejectFragments(
  'Phase 16C4A public-record-only return',
  storeReadMethod,
  [
    'return reviewed.sealedEnvelope',
    'encodeStorePayload(',
    'keystoreBridge',
  ],
);

const production =
  [
    runtime.split(
      '#[cfg(test)]',
    )[0],

    jni,
    bridge,
    mainActivity,
  ].join('\n');

rejectFragments(
  'Phase 16C4A production surface',
  production,
  [
    '@JavascriptInterface',
    'recoveryPhrase',
    'rootPrivateKey',
    'rootAdminPrivateKey',
    'rawCapability',
    'sessionToken',
    'issue_capability',
    'create_session',
    'approvePairingLocally',
  ],
);

if (
  pairingBegin.includes(
    'TvPassportPairingRuntimeError::PublicRecordJsonInvalid',
  ) === false
) {
  throw new Error(
    'Phase 16C4A pairing command does not fail closed for invalid hydrated JSON.',
  );
}

const registeredCommands =
  [
    ...tvLib.matchAll(
      /commands::[a-z_]+::(tv_[a-z_]+)/gu,
    ),
  ]
    .map(
      (match) =>
        match[1],
    );

const uniqueCommands =
  [
    ...new Set(
      registeredCommands,
    ),
  ];

if (uniqueCommands.length !== 8) {
  throw new Error(
    `TV command allowlist changed to ${uniqueCommands.length}; expected 8.`,
  );
}

if (
  uniqueCommands.some(
    (command) =>
      command.includes(
        'passport',
      ),
  )
) {
  throw new Error(
    'Phase 16C4A added a public Passport Tauri command.',
  );
}

const expectedTvTest =
  'cargo test --manifest-path src-tauri/Cargo.toml --offline phase16c4_';

const expectedTvCheck =
  'node ../../scripts/check-crablink-tv-native-passport-phase16c4a-startup-hydration-boundary.mjs';

if (
  tvPackage.scripts[
    'test:native-passport-phase16c4a-startup-hydration'
  ] !== expectedTvTest
) {
  throw new Error(
    'Phase 16C4A TV test script mismatch.',
  );
}

if (
  tvPackage.scripts[
    'check:native-passport-phase16c4a-startup-hydration'
  ] !== expectedTvCheck
) {
  throw new Error(
    'Phase 16C4A TV boundary script mismatch.',
  );
}

if (
  rootPackage.scripts[
    'tv:native-passport:phase16c4a:startup-hydration:test'
  ]
  !==
  'npm --prefix apps/crablink-tv run test:native-passport-phase16c4a-startup-hydration'
) {
  throw new Error(
    'Phase 16C4A root test script mismatch.',
  );
}

if (
  rootPackage.scripts[
    'tv:native-passport:phase16c4a:startup-hydration:check'
  ]
  !==
  'node scripts/check-crablink-tv-native-passport-phase16c4a-startup-hydration-boundary.mjs'
) {
  throw new Error(
    'Phase 16C4A root boundary script mismatch.',
  );
}

if (
  !makeCodebundle.includes(
    'check-crablink-tv-native-passport-phase16c4a-startup-hydration-boundary.mjs',
  )
) {
  throw new Error(
    'Phase 16C4A boundary is missing from future codebundles.',
  );
}

console.log(
  'CrabLink TV Native Passport Phase 16C4A startup-hydration boundary passed.',
);

console.log(
  'NATIVE_PASSPORT_PHASE16C4A_STARTUP_HYDRATION=GREEN',
);

console.log(
  'PATCH_2_OF_5=OPEN',
);

console.log(
  'PHASE16C_SLICE=4A',
);

console.log(
  'ANDROID_STARTUP_PUBLIC_RECORD_HYDRATION=ADDED',
);

console.log(
  'HYDRATED_MATERIAL=REDACTED_PUBLIC_RECORD_ONLY',
);

console.log(
  'SEALED_DEVICE_MATERIAL_RETURNED_TO_RUST=NO',
);

console.log(
  'ROOT_AUTHORIZATION_STORED=NO',
);

console.log(
  'CAPABILITY_STORED=NO',
);

console.log(
  'SESSION_CREATED=NO',
);

console.log(
  'CORRUPT_STORE_POSTURE=FAIL_CLOSED',
);

console.log(
  'UNKNOWN_JSON_FIELDS=REJECTED',
);

console.log(
  'CHANGED_DEVICE_KEY_INVALIDATES_PENDING_REQUEST=YES',
);

console.log(
  'PUBLIC_TAURI_COMMAND=NOT_ADDED',
);

console.log(
  'EXISTING_EIGHT_COMMAND_ALLOWLIST=PRESERVED',
);

console.log(
  'REACT_SECRET_SURFACE=NOT_ADDED',
);

console.log(
  'PHASE16D_AUTHORIZATION_AND_CAPABILITY_STORAGE=DEFERRED_TO_OWNER_PHASE',
);

console.log(
  'CODEBUNDLE_REGENERATED=NO',
);

console.log(
  'NEXT_PATCH=NATIVE_PASSPORT_PHASE16C4B_DURABLE_PAIRING_REPLAY_ADAPTER',
);
