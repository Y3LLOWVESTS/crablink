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
      `Missing Phase 16B1 source: ${relativePath}`,
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

const dependency =
  'svc-passport = { path = "../../../../RustyOnions/crates/svc-passport", default-features = false, features = ["native-passport"] }';

const tvCargo =
  read(
    'apps/crablink-tv/src-tauri/Cargo.toml',
  );

const desktopCargo =
  read(
    'apps/crablink-tauri/src-tauri/Cargo.toml',
  );

const tvLib =
  read(
    'apps/crablink-tv/src-tauri/src/lib.rs',
  );

const inspection =
  read(
    'apps/crablink-tv/src-tauri/src/passport_android_keystore.rs',
  );

const predecessor =
  read(
    'scripts/check-crablink-tv-native-passport-phase16a2-contract-boundary.mjs',
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
  'TV dependency',
  tvCargo,
  [
    dependency,
  ],
);

requireFragments(
  'Desktop dependency parity',
  desktopCargo,
  [
    dependency,
  ],
);

requireFragments(
  'TV module registration',
  tvLib,
  [
    'pub mod passport_android_keystore;',
  ],
);

rejectFragments(
  'TV public command registration',
  tvLib,
  [
    'tv_passport_android_keystore_inspect',
    'commands::passport_android_keystore',
  ],
);

requireFragments(
  'Phase 16A2 predecessor',
  predecessor,
  [
    'NATIVE_PASSPORT_PHASE16A2_TV_DELEGATED_CONTRACT_FOUNDATION=GREEN',
    'NEXT_PATCH=NATIVE_PASSPORT_PHASE16B2_ANDROID_KEYSTORE_PLATFORM_BRIDGE',
  ],
);

requireFragments(
  'Android Keystore inspection',
  inspection,
  [
    'svc_passport::native',
    'review_native_platform_sealer_contract_draft',
    'NativePlatformFamily::AndroidKeystore',
    'NativeSecureCompartment::DeviceKey',
    'crablink.tv.android-keystore-inspection.v1',
    'AndroidKeyStore',
    'device-sealer.v1',
    'android_target_bridge_pending',
    'non_android_inspection_host',
    'plaintext_fallback_allowed: false',
    'recovery_root_storage_allowed: false',
    'root_admin_key_storage_allowed: false',
    'secret_export_allowed: false',
    'webview_secret_return_allowed: false',
    'android_platform_bridge_added: false',
    'secret_storage_added: false',
    'device_key_generation_added: false',
    'delegated_authorization_storage_added: false',
    'public_tauri_command_added: false',
  ],
);

rejectFragments(
  'Android implementation boundary',
  inspection,
  [
    'KeyStore.getInstance',
    'KeyGenerator.getInstance',
    'KeyPairGenerator.getInstance',
    'Cipher.getInstance',
    'Signature.getInstance',
    'SecretKeySpec',
    'android.security.keystore',
    'jni::',
    'ndk::',
    'std::fs::',
    'File::create',
    'OpenOptions',
    'getrandom(',
    '#[tauri::command]',
  ],
);

const expectedTvScripts = {
  'test:native-passport-phase16b1-keystore-inspection':
    'cargo test --manifest-path src-tauri/Cargo.toml --offline passport_android_keystore::tests',

  'check:native-passport-phase16b1-keystore-inspection':
    'node ../../scripts/check-crablink-tv-native-passport-phase16b1-keystore-inspection-boundary.mjs',
};

for (const [
  name,
  command,
] of Object.entries(
  expectedTvScripts,
)) {
  if (
    tvPackage.scripts?.[name] !==
    command
  ) {
    throw new Error(
      `TV package script missing or incorrect: ${name}`,
    );
  }
}

for (const fragment of [
  'npm run test:native-passport-phase16b1-keystore-inspection',
  'npm run check:native-passport-phase16b1-keystore-inspection',
]) {
  if (
    !String(
      tvPackage.scripts?.check ?? '',
    ).includes(fragment)
  ) {
    throw new Error(
      `TV check chain missing: ${fragment}`,
    );
  }
}

const expectedRootScripts = {
  'tv:native-passport:phase16b1:keystore:test':
    'npm --prefix apps/crablink-tv run test:native-passport-phase16b1-keystore-inspection',

  'tv:native-passport:phase16b1:keystore:check':
    'node scripts/check-crablink-tv-native-passport-phase16b1-keystore-inspection-boundary.mjs',
};

for (const [
  name,
  command,
] of Object.entries(
  expectedRootScripts,
)) {
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
  'CrabLink TV Native Passport Phase 16B1 Android Keystore inspection boundary passed.',
);

console.log(
  'NATIVE_PASSPORT_PHASE16B1_ANDROID_KEYSTORE_CONTRACT_INSPECTION=GREEN',
);

console.log(
  'CANONICAL_SVC_PASSPORT_SEALER_CONTRACT=CONSUMED',
);

console.log(
  'APPROVED_SECURE_COMPARTMENT=device_key_only',
);

console.log(
  'RECOVERY_ROOT_COMPARTMENT_ON_TV=FORBIDDEN',
);

console.log(
  'PLAINTEXT_FALLBACK=FORBIDDEN',
);

console.log(
  'ANDROID_PLATFORM_BRIDGE=NOT_ADDED',
);

console.log(
  'SECRET_STORAGE=NOT_ADDED',
);

console.log(
  'TV_DEVICE_KEY_GENERATION=NOT_ADDED',
);

console.log(
  'PUBLIC_TAURI_COMMAND=NOT_ADDED',
);

console.log(
  'CODEBUNDLE_REGENERATED=NO',
);

console.log(
  'NEXT_PATCH=NATIVE_PASSPORT_PHASE16B3_RUST_ANDROID_BRIDGE_AND_DEVICE_MATERIAL_RUNTIME',
);
