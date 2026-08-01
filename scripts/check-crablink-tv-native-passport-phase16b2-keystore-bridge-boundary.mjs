#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root =
  path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
  );

function absolute(relativePath) {
  return path.join(root, relativePath);
}

function read(relativePath) {
  const target = absolute(relativePath);

  if (!fs.existsSync(target)) {
    throw new Error(
      `Missing Phase 16B2 source: ${relativePath}`,
    );
  }

  return fs.readFileSync(target, 'utf8');
}

function stripKotlinComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
}

function requireFragments(label, source, fragments) {
  for (const fragment of fragments) {
    if (!source.includes(fragment)) {
      throw new Error(
        `${label} missing: ${fragment}`,
      );
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

function rejectRegexes(label, source, patterns) {
  for (const [description, pattern] of patterns) {
    if (pattern.test(source)) {
      throw new Error(
        `${label} contains forbidden identifier: ${description}`,
      );
    }
  }
}

const oldTestPath =
  'apps/crablink-tv/src-tauri/gen/android/app/src/androidTest/java/com/rustyonions/crablink/tv/TvPassportKeystoreBridgeInstrumentedTest.kt';

if (fs.existsSync(absolute(oldTestPath))) {
  throw new Error(
    'Dependency-heavy AndroidTest source still exists.',
  );
}

const buildGradle =
  read(
    'apps/crablink-tv/src-tauri/gen/android/app/build.gradle.kts',
  );

const mainActivity =
  read(
    'apps/crablink-tv/src-tauri/gen/android/app/src/main/java/com/rustyonions/crablink/tv/MainActivity.kt',
  );

const bridge =
  read(
    'apps/crablink-tv/src-tauri/gen/android/app/src/main/java/com/rustyonions/crablink/tv/TvPassportKeystoreBridge.kt',
  );

const debugTest =
  read(
    'apps/crablink-tv/src-tauri/gen/android/app/src/debug/java/com/rustyonions/crablink/tv/TvPassportKeystoreBridgeDeviceSelfTest.kt',
  );

const predecessor =
  read(
    'scripts/check-crablink-tv-native-passport-phase16b1-keystore-inspection-boundary.mjs',
  );

const tvLib =
  read(
    'apps/crablink-tv/src-tauri/src/lib.rs',
  );

const tvPackage =
  JSON.parse(
    read('apps/crablink-tv/package.json'),
  );

const rootPackage =
  JSON.parse(
    read('package.json'),
  );

const bridgeCode =
  stripKotlinComments(bridge);

const debugCode =
  stripKotlinComments(debugTest);

requireFragments(
  'Android build configuration',
  buildGradle,
  ['minSdk = 24'],
);

rejectFragments(
  'AndroidTest dependency isolation',
  buildGradle,
  [
    'testInstrumentationRunner',
    'androidTestImplementation(',
    'androidx.test.ext:junit',
    'androidx.test.espresso',
  ],
);

requireFragments(
  'MainActivity bridge attachment',
  mainActivity,
  [
    'TvPassportKeystoreBridge()',
    'passportKeystoreBridgeForNativeRuntime',
    'tvPassportKeystoreBridge',
  ],
);

requireFragments(
  'Android Keystore implementation',
  bridgeCode,
  [
    'KeyStore.getInstance(',
    'AndroidKeyStore',
    'KeyGenerator.getInstance(',
    'KeyGenParameterSpec.Builder(',
    'KeyProperties.KEY_ALGORITHM_AES',
    'KeyProperties.PURPOSE_ENCRYPT',
    'KeyProperties.PURPOSE_DECRYPT',
    'KeyProperties.BLOCK_MODE_GCM',
    'AES/GCM/NoPadding',
    'setRandomizedEncryptionRequired(',
    'Cipher.ENCRYPT_MODE',
    'Cipher.DECRYPT_MODE',
    'cipher.updateAAD(',
    'GCMParameterSpec(',
    'deleteEntry(',
  ],
);

requireFragments(
  'Debug device self-test',
  debugCode,
  [
    'internal object TvPassportKeystoreBridgeDeviceSelfTest',
    'internal fun runAll()',
    'phase16b2_android_keystore_seal_unseal_roundtrip',
    'phase16b2_android_keystore_uses_randomized_gcm_iv',
    'phase16b2_android_keystore_rejects_wrong_associated_data',
    'phase16b2_android_keystore_rejects_ciphertext_tampering',
    'phase16b2_android_keystore_delete_is_idempotent_and_redacted',
    'TvPassportKeystoreBridge(',
    'expectUnsealFailure',
  ],
);

rejectFragments(
  'Debug executable-code API isolation',
  debugCode,
  [
    'androidx.test',
    'org.junit',
    '@Test',
    'AndroidJUnit4',
    'AndroidTestCase',
    'evaluateJavascript',
    '@JavascriptInterface',
    'HttpURLConnection',
    'OkHttpClient',
    'fetch(',
    '#[tauri::command]',
  ],
);

rejectRegexes(
  'Debug sensitive-identifier isolation',
  debugCode,
  [
    ['recoveryPhrase', /\brecoveryPhrase\b/],
    ['recovery_phrase', /\brecovery_phrase\b/],
    ['recoveryRoot', /\brecoveryRoot\b/],
    ['recovery_root', /\brecovery_root\b/],
    ['rootAdminKey', /\brootAdminKey\b/],
    ['root_admin_key', /\broot_admin_key\b/],
    ['rootPrivateKey', /\brootPrivateKey\b/],
    ['root_private_key', /\broot_private_key\b/],
    ['wallet', /\bwallet\b/],
    ['ledger', /\bledger\b/],
  ],
);

const discoveredTests =
  (
    debugCode.match(
      /^[ \t]*internal[ \t]+fun[ \t]+phase16b2_[A-Za-z0-9_]+\(\)[ \t]*\{/gm,
    ) ?? []
  ).length;

if (discoveredTests !== 5) {
  throw new Error(
    `Expected exactly 5 debug device tests, found ${discoveredTests}.`,
  );
}

requireFragments(
  'Phase 16B1 predecessor',
  predecessor,
  [
    'NATIVE_PASSPORT_PHASE16B1_ANDROID_KEYSTORE_CONTRACT_INSPECTION=GREEN',
    'NEXT_PATCH=NATIVE_PASSPORT_PHASE16B3_RUST_ANDROID_BRIDGE_AND_DEVICE_MATERIAL_RUNTIME',
  ],
);

rejectFragments(
  'Public Tauri command isolation',
  tvLib,
  [
    'tv_passport_keystore_seal',
    'tv_passport_keystore_unseal',
    'tv_passport_get_secret',
    'TvPassportKeystoreBridge',
  ],
);

const expectedTvScripts = {
  'compile:native-passport-phase16b2-keystore-bridge':
    'cd src-tauri/gen/android && ./gradlew --no-daemon --offline :app:compileArmDebugKotlin',

  'check:native-passport-phase16b2-keystore-bridge':
    'node ../../scripts/check-crablink-tv-native-passport-phase16b2-keystore-bridge-boundary.mjs',
};

for (const [name, command] of Object.entries(expectedTvScripts)) {
  if (tvPackage.scripts?.[name] !== command) {
    throw new Error(
      `TV package script missing or incorrect: ${name}`,
    );
  }
}

const expectedRootScripts = {
  'tv:native-passport:phase16b2:keystore:compile':
    'npm --prefix apps/crablink-tv run compile:native-passport-phase16b2-keystore-bridge',

  'tv:native-passport:phase16b2:keystore:check':
    'node scripts/check-crablink-tv-native-passport-phase16b2-keystore-bridge-boundary.mjs',
};

for (const [name, command] of Object.entries(expectedRootScripts)) {
  if (rootPackage.scripts?.[name] !== command) {
    throw new Error(
      `Root package script missing or incorrect: ${name}`,
    );
  }
}

console.log(
  'CrabLink TV Native Passport Phase 16B2 debug-device boundary passed.',
);

console.log(
  'NATIVE_PASSPORT_PHASE16B2_ANDROID_KEYSTORE_PLATFORM_BRIDGE=GREEN',
);

console.log(
  'SENSITIVE_IDENTIFIER_SCAN=EXACT_WORD_BOUNDARIES',
);

console.log(
  'REDACTED_RECOVERY_ROOT_STORAGE_FLAG_READ=ALLOWED',
);

console.log(
  'ACTUAL_RECOVERY_ROOT_IDENTIFIER=FORBIDDEN',
);

console.log(
  'ANDROID_DEBUG_DEVICE_SELF_TEST_COUNT=5',
);

console.log(
  'ANDROID_DEBUG_DEVICE_SELF_TEST_COMPILE=REQUIRED',
);

console.log(
  'ANDROID_DEVICE_SELF_TEST_EXECUTION=PENDING_DEVICE',
);

console.log(
  'ANDROIDTEST_DEPENDENCY_DOWNLOAD_REQUIRED=NO',
);

console.log(
  'PUBLIC_TAURI_COMMAND=NOT_ADDED',
);

console.log(
  'REACT_SECRET_SURFACE=NOT_ADDED',
);

console.log(
  'TV_DEVICE_IDENTITY_KEY_GENERATION=NOT_ADDED',
);

console.log(
  'CODEBUNDLE_REGENERATED=NO',
);

console.log(
  'NEXT_PATCH=NATIVE_PASSPORT_PHASE16B3_RUST_ANDROID_BRIDGE_AND_DEVICE_MATERIAL_RUNTIME',
);
