#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
  const target =
    path.join(
      root,
      relativePath,
    );

  if (!fs.existsSync(target)) {
    throw new Error(
      `Missing Phase 16B3B source: ${relativePath}`,
    );
  }

  return fs.readFileSync(
    target,
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
  for (const fragment of fragments) {
    if (source.includes(fragment)) {
      throw new Error(
        `${label} contains forbidden fragment: ${fragment}`,
      );
    }
  }
}

function stripCommentsAndQuotedStrings(
  source,
) {
  return source
    .replace(
      /\/\*[\s\S]*?\*\//g,
      '',
    )
    .replace(
      /\/\/.*$/gm,
      '',
    )
    .replace(
      /"(?:\\.|[^"\\])*"/g,
      '""',
    )
    .replace(
      /'(?:\\.|[^'\\])*'/g,
      "''",
    );
}

const material =
  read(
    'apps/crablink-tv/src-tauri/src/passport_tv_device_material.rs',
  );

const jni =
  read(
    'apps/crablink-tv/src-tauri/src/passport_android_jni.rs',
  );

const store =
  read(
    'apps/crablink-tv/src-tauri/gen/android/app/src/main/java/com/rustyonions/crablink/tv/TvPassportDeviceMaterialStore.kt',
  );

const bridge =
  read(
    'apps/crablink-tv/src-tauri/gen/android/app/src/main/java/com/rustyonions/crablink/tv/TvPassportDeviceMaterialBridge.kt',
  );

const executableSources = [
  stripCommentsAndQuotedStrings(
    jni,
  ),

  stripCommentsAndQuotedStrings(
    store,
  ),

  stripCommentsAndQuotedStrings(
    bridge,
  ),
];

const mainActivity =
  read(
    'apps/crablink-tv/src-tauri/gen/android/app/src/main/java/com/rustyonions/crablink/tv/MainActivity.kt',
  );

const proguard =
  read(
    'apps/crablink-tv/src-tauri/gen/android/app/proguard-rules.pro',
  );

const cargo =
  read(
    'apps/crablink-tv/src-tauri/Cargo.toml',
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

requireFragments(
  'Rust sealed-envelope codec',
  material,
  [
    'TV_ANDROID_SEALED_ENVELOPE_MAGIC',
    'to_android_envelope',
    'from_android_envelope',
    'phase16b3b_android_sealed_envelope_roundtrips',
    'phase16b3b_android_sealed_envelope_rejects_corruption',
  ],
);

requireFragments(
  'Android JNI adapter',
  jni,
  [
    '#![cfg(target_os = "android")]',
    'AndroidJniDeviceMaterialSealer',
    'sealDeviceKeyForNative',
    'storeDeviceMaterialForNative',
    'generate_and_seal_tv_device_material',
    'stored_by_android_atomic_file',
    'Java_com_rustyonions_crablink_tv_TvPassportDeviceMaterialBridge_provisionAndStore',
    'catch_unwind',
    'exception_clear',
    'native_panic_blocked',
  ],
);

requireFragments(
  'Android no-backup atomic store',
  store,
  [
    'context.noBackupFilesDir',
    'AtomicFile(',
    '@Synchronized',
    'atomicFile.startWrite()',
    'atomicFile.finishWrite(',
    'atomicFile.failWrite(',
    'atomicFile.readFully()',
    'tv-device-material.v1.bin',
    'stored_by_android_atomic_file',
    'privateMaterialExported',
    'webviewSecretReturned',
    'recoveryRootPresent',
    'rootAdminKeyPresent',
    'FORBIDDEN_PUBLIC_RECORD_FIELDS',
    '"recoveryPhrase"',
    '"recoveryRoot"',
    '"rootPrivateKey"',
    '"rootAdminKey"',
    '"rawCapability"',
  ],
);

requireFragments(
  'Android JNI Kotlin bridge',
  bridge,
  [
    'external fun provisionAndStore()',
    'fun sealDeviceKeyForNative(',
    'fun storeDeviceMaterialForNative(',
    'fun inspectStoredDeviceMaterialForNative()',
    'fun deleteStoredDeviceMaterialForNative()',
    'secretSeed.fill(',
    'LOCKED_ASSOCIATED_DATA',
    'TvPassportKeystoreBridge',
    'TvPassportDeviceMaterialStore',
  ],
);

requireFragments(
  'MainActivity native bridge ownership',
  mainActivity,
  [
    'tvPassportDeviceMaterialStore',
    'TvPassportDeviceMaterialStore(',
    'tvPassportDeviceMaterialBridge',
    'TvPassportDeviceMaterialBridge(',
    'passportDeviceMaterialBridgeForNativeRuntime',
  ],
);

requireFragments(
  'Android JNI release keep rules',
  proguard,
  [
    'TvPassportDeviceMaterialBridge',
    'provisionAndStore',
    'sealDeviceKeyForNative',
    'storeDeviceMaterialForNative',
    'inspectStoredDeviceMaterialForNative',
    'deleteStoredDeviceMaterialForNative',
  ],
);

requireFragments(
  'Android JNI Cargo dependency',
  cargo,
  [
    '[target.\'cfg(target_os = "android")\'.dependencies]',
    'jni = "0.21"',
  ],
);

requireFragments(
  'Android JNI Rust module registration',
  lib,
  [
    '#[cfg(target_os = "android")]',
    'mod passport_android_jni;',
  ],
);

for (const source of executableSources) {
  rejectFragments(
    'Phase 16B3B executable authority isolation',
    source,
    [
      '#[tauri::command]',
      '@JavascriptInterface',
      'evaluateJavascript',
      'window.__TAURI__',
      'SharedPreferences',
      'getSharedPreferences',
    ],
  );

  for (const forbiddenIdentifier of [
    /\brecoveryPhrase\b/,
    /\brecoveryRoot\b/,
    /\brecovery_root\b/,
    /\brootPrivateKey\b/,
    /\broot_private_key\b/,
    /\brootAdminKey\b/,
    /\broot_admin_key\b/,
    /\brawCapability\b/,
    /\braw_capability\b/,
    /\bwalletTransfer\b/,
    /\bledgerMutation\b/,
    /\busernameClaim\b/,
    /\bdeviceAuthorization\b/,
  ]) {
    if (
      forbiddenIdentifier.test(
        source,
      )
    ) {
      throw new Error(
        `Phase 16B3B contains forbidden executable identifier: ${forbiddenIdentifier}`,
      );
    }
  }
}

const b3bTestCount =
  (
    material.match(
      /fn phase16b3b_[a-z0-9_]+\s*\(/g,
    ) ?? []
  ).length;

if (b3bTestCount !== 2) {
  throw new Error(
    `Expected exactly two Phase 16B3B Rust tests, found ${b3bTestCount}.`,
  );
}

const handler =
  lib.match(
    /tauri::generate_handler!\[\s*([\s\S]*?)\s*\]/,
  );

if (!handler) {
  throw new Error(
    'TV Tauri command allowlist was not found.',
  );
}

const commands =
  handler[1]
    .split(',')
    .map(
      (value) =>
        value.trim(),
    )
    .filter(Boolean);

if (commands.length !== 8) {
  throw new Error(
    `Expected the existing eight commands, found ${commands.length}.`,
  );
}

if (
  commands.some(
    (command) =>
      command.includes(
        'passport',
      ),
  )
) {
  throw new Error(
    'Phase 16B3B added a public Passport Tauri command.',
  );
}

const expectedTvScripts = {
  'test:native-passport-phase16b3b-jni-atomic-store':
    'cargo test --manifest-path src-tauri/Cargo.toml --offline phase16b3b_',

  'check:native-passport-phase16b3b-jni-atomic-store':
    'node ../../scripts/check-crablink-tv-native-passport-phase16b3b-jni-atomic-store-boundary.mjs',

  'compile:native-passport-phase16b3b-jni-atomic-store':
    'CARGO_NET_OFFLINE=true npm run tauri -- android build --debug --target armv7 --apk --ci',
};

for (
  const [
    name,
    command,
  ] of Object.entries(
    expectedTvScripts,
  )
) {
  if (
    tvPackage.scripts?.[name] !==
    command
  ) {
    throw new Error(
      `TV package script missing or incorrect: ${name}`,
    );
  }
}

const expectedRootScripts = {
  'tv:native-passport:phase16b3b:jni-store:test':
    'npm --prefix apps/crablink-tv run test:native-passport-phase16b3b-jni-atomic-store',

  'tv:native-passport:phase16b3b:jni-store:check':
    'node scripts/check-crablink-tv-native-passport-phase16b3b-jni-atomic-store-boundary.mjs',

  'tv:native-passport:phase16b3b:jni-store:compile':
    'npm --prefix apps/crablink-tv run compile:native-passport-phase16b3b-jni-atomic-store',
};

for (
  const [
    name,
    command,
  ] of Object.entries(
    expectedRootScripts,
  )
) {
  if (
    rootPackage.scripts?.[name] !==
    command
  ) {
    throw new Error(
      `Root package script missing or incorrect: ${name}`,
    );
  }
}

console.log(
  'CrabLink TV Native Passport Phase 16B3B JNI and atomic-store boundary passed.',
);

console.log(
  'NATIVE_PASSPORT_PHASE16B3B_JNI_ATOMIC_STORE=GREEN',
);

console.log(
  'SENSITIVE_DENYLIST_LITERALS=ALLOWED',
);

console.log(
  'SENSITIVE_EXECUTABLE_IDENTIFIERS=FORBIDDEN',
);

console.log(
  'RUST_TO_ANDROID_KEYSTORE_JNI=ADDED',
);

console.log(
  'ANDROID_NATIVE_LIBRARY_SYMBOL=ADDED',
);

console.log(
  'ANDROID_NO_BACKUP_ATOMIC_STORE=ADDED',
);

console.log(
  'DEVICE_SECRET_ZEROED_AFTER_KOTLIN_SEAL=YES',
);

console.log(
  'SEALED_DEVICE_MATERIAL_CODEC=LOCKED',
);

console.log(
  'RESTART_SAFE_REDACTED_INSPECTION=ADDED',
);

console.log(
  'RECOVERY_ROOT_STORAGE_ON_TV=FORBIDDEN',
);

console.log(
  'ROOT_ADMIN_KEY_STORAGE_ON_TV=FORBIDDEN',
);

console.log(
  'PUBLIC_TAURI_COMMAND=NOT_ADDED',
);

console.log(
  'REACT_SECRET_SURFACE=NOT_ADDED',
);

console.log(
  'ANDROID_RUNTIME_EXECUTION=PENDING_DEVICE',
);

console.log(
  'EXISTING_EIGHT_COMMAND_ALLOWLIST=PRESERVED',
);

console.log(
  'CODEBUNDLE_REGENERATED=NO',
);

console.log(
  'NEXT_PATCH=NATIVE_PASSPORT_PHASE16C_PAIRING_REQUEST_AND_ROOT_ADMIN_AUTHORIZATION',
);
