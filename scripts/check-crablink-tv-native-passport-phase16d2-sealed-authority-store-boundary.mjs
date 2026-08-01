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
      `Missing Phase 16D2 source: ${relativePath}`,
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

const store =
  read(
    'apps/crablink-tv/src-tauri/gen/android/app/src/main/java/com/rustyonions/crablink/tv/TvPassportDelegatedAuthorityStore.kt',
  );

const bridge =
  read(
    'apps/crablink-tv/src-tauri/gen/android/app/src/main/java/com/rustyonions/crablink/tv/TvPassportDelegatedAuthorityBridge.kt',
  );

const activity =
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

const d1Authority =
  read(
    'apps/crablink-tv/src-tauri/src/passport_tv_delegated_authority.rs',
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
  'Phase 16D2 Android store',
  store,
  [
    'android.util.AtomicFile',
    'context.noBackupFilesDir',
    'tv-delegated-authority.v1.bin',
    '@Synchronized',
    'atomicFile.startWrite()',
    'atomicFile.finishWrite(',
    'atomicFile.failWrite(',
    'atomicFile.readFully()',
    'sealedAuthorizationEnvelope',
    'sealedCapabilityEnvelope',
    'authorizationMaterialSealed',
    'capabilityMaterialSealed',
    'rawAuthorizationReturned',
    'rawCapabilityReturned',
    'operationallyUnlocked',
    'crablink.tv.delegated-authority-record.v1',
    'FORBIDDEN_PUBLIC_RECORD_FIELDS',
  ],
);

requireFragments(
  'Phase 16D2 native bridge',
  bridge,
  [
    'storeReviewedDelegatedAuthorityForNative',
    'readStoredDelegatedAuthorityPublicRecordForNative',
    'inspectStoredDelegatedAuthorityForNative',
    'deleteStoredDelegatedAuthorityForNative',
    'keystoreBridge.seal(',
    'MessageDigest',
    '"SHA-256"',
    'crablink.tv.passport.authorization.v1:',
    'crablink.tv.passport.capability.v1:',
    'rootSignedAuthorization.fill(',
    'narrowCapability.fill(',
    'publicRecordBinding.fill(',
    'rawAuthorizationReturned',
    'rawCapabilityReturned',
    'sessionPresent',
    'operationallyUnlocked',
  ],
);

requireFragments(
  'Phase 16D2 MainActivity ownership',
  activity,
  [
    'tvPassportDelegatedAuthorityStore',
    'TvPassportDelegatedAuthorityStore(',
    'tvPassportDelegatedAuthorityBridge',
    'TvPassportDelegatedAuthorityBridge(',
    'passportDelegatedAuthorityBridgeForNativeRuntime',
  ],
);

requireFragments(
  'Phase 16D2 release keep rules',
  proguard,
  [
    'TvPassportDelegatedAuthorityBridge',
    'storeReviewedDelegatedAuthorityForNative',
    'readStoredDelegatedAuthorityPublicRecordForNative',
    'inspectStoredDelegatedAuthorityForNative',
    'deleteStoredDelegatedAuthorityForNative',
  ],
);

requireFragments(
  'Phase 16D1 authority owner preservation',
  d1Authority,
  [
    'review_stored_tv_delegated_authority_record',
    'TV_DELEGATED_READ_SCOPES',
    'authorized_locked',
    'revoked',
    'expired',
  ],
);

rejectFragments(
  'Phase 16D2 public or unsafe bridge surface',
  `${store}\n${bridge}\n${activity}`,
  [
    '@JavascriptInterface',
    'SharedPreferences',
    'getSharedPreferences(',
    'fun getRawCapability',
    'fun getRawAuthorization',
    'unsealDelegatedAuthorityForNative',
    'approvePairingLocally',
    'issueCapability',
    'createSession',
    'walletSpend',
    'contentPublish',
    'claimUsername',
    'transferUsername',
    'Log.',
    'println(',
  ],
);

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
    'Phase 16D2 added a public Passport command.',
  );
}

const expectedTvCheck =
  'node ../../scripts/check-crablink-tv-native-passport-phase16d2-sealed-authority-store-boundary.mjs';

if (
  tvPackage.scripts[
    'check:native-passport-phase16d2-sealed-authority-store'
  ] !== expectedTvCheck
) {
  throw new Error(
    'Phase 16D2 TV check script mismatch.',
  );
}

if (
  rootPackage.scripts[
    'tv:native-passport:phase16d2:sealed-authority-store:check'
  ]
  !==
  'node scripts/check-crablink-tv-native-passport-phase16d2-sealed-authority-store-boundary.mjs'
) {
  throw new Error(
    'Phase 16D2 root check script mismatch.',
  );
}

if (
  !makeCodebundle.includes(
    'check-crablink-tv-native-passport-phase16d2-sealed-authority-store-boundary.mjs',
  )
) {
  throw new Error(
    'Phase 16D2 boundary is absent from future codebundles.',
  );
}

console.log(
  'CrabLink TV Native Passport Phase 16D2 sealed-authority-store boundary passed.',
);

console.log(
  'NATIVE_PASSPORT_PHASE16D2_SEALED_AUTHORITY_STORE=GREEN',
);

console.log(
  'PATCH_3_OF_5=OPEN',
);

console.log(
  'PHASE16D_SLICE=2',
);

console.log(
  'ANDROID_NO_BACKUP_ATOMIC_AUTHORITY_STORE=ADDED',
);

console.log(
  'ROOT_SIGNED_AUTHORIZATION_AT_REST=ANDROID_KEYSTORE_SEALED',
);

console.log(
  'NARROW_CAPABILITY_AT_REST=ANDROID_KEYSTORE_SEALED',
);

console.log(
  'PUBLIC_RECORD_BINDING=SHA256_AAD',
);

console.log(
  'AUTHORIZATION_AND_CAPABILITY_AAD=DOMAIN_SEPARATED',
);

console.log(
  'PLAINTEXT_INPUT_ZEROIZATION=ADDED',
);

console.log(
  'RAW_AUTHORIZATION_RETURNED=NO',
);

console.log(
  'RAW_CAPABILITY_RETURNED=NO',
);

console.log(
  'PUBLIC_RECORD_ONLY_READBACK=ADDED',
);

console.log(
  'SESSION_CREATED=NO',
);

console.log(
  'OPERATIONAL_UNLOCK=NOT_ADDED',
);

console.log(
  'BACKEND_CAPABILITY_ACCEPTANCE=NOT_CLAIMED',
);

console.log(
  'PUBLIC_TAURI_COMMAND=NOT_ADDED',
);

console.log(
  'EXISTING_EIGHT_COMMAND_ALLOWLIST=PRESERVED',
);

console.log(
  'CODEBUNDLE_REGENERATED=NO',
);

console.log(
  'NEXT_PATCH=NATIVE_PASSPORT_PHASE16D3_AUTHORIZATION_RUNTIME_HANDOFF_AND_DEVICE_PROOF_PORT',
);
