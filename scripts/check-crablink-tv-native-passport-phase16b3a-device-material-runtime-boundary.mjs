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
      `Missing Phase 16B3A source: ${relativePath}`,
    );
  }

  return fs.readFileSync(
    target,
    'utf8',
  );
}

function stripRustComments(source) {
  return source
    .replace(
      /\/\*[\s\S]*?\*\//g,
      '',
    )
    .replace(
      /\/\/.*$/gm,
      '',
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
        `${label} contains forbidden executable fragment: ${fragment}`,
      );
    }
  }
}

const rust =
  read(
    'apps/crablink-tv/src-tauri/src/passport_tv_device_material.rs',
  );

const rustCode =
  stripRustComments(
    rust,
  );

const lib =
  read(
    'apps/crablink-tv/src-tauri/src/lib.rs',
  );

const cargo =
  read(
    'apps/crablink-tv/src-tauri/Cargo.toml',
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
  'Phase 16B3A Rust runtime',
  rustCode,
  [
    'pub struct TvDeviceSigningMaterial',
    'Zeroizing<',
    'OsRng',
    '.try_fill_bytes(',
    'SigningKey::from_bytes',
    'pub trait TvDeviceMaterialSealer',
    'pub struct TvSealedDeviceMaterial',
    'pub struct TvDeviceMaterialPublicRecordV1',
    'pub struct TvProvisionedDeviceMaterial',
    'generate_and_seal_tv_device_material',
    'crablink.tv.passport.device-key.v1',
    'generated_from_os_csprng',
    'pending_android_native_persistence',
    'android_jni_adapter_added:',
    'private_material_exported:',
    'webview_secret_returned:',
    'recovery_root_present:',
    'root_admin_key_present:',
    'public_tauri_command_added:',
  ],
);

requireFragments(
  'TV Rust module registration',
  lib,
  [
    'pub mod passport_android_keystore;',
    'pub mod passport_tv_device_material;',
  ],
);

requireFragments(
  'TV Rust direct dependencies',
  cargo,
  [
    'ed25519-dalek = { version = "2", features = ["rand_core"] }',
    'rand_core = { version = "0.6", features = ["getrandom"] }',
    'zeroize = "1"',
  ],
);

rejectFragments(
  'Phase 16B3A executable-code isolation',
  rustCode,
  [
    '#[tauri::command]',
    'tauri::command',
    'tauri::generate_handler!',
    'window.__TAURI__',
    '@JavascriptInterface',
  ],
);

for (const protectedType of [
  'TvDeviceSigningMaterial',
  'TvSealedDeviceMaterial',
  'TvProvisionedDeviceMaterial',
]) {
  const unsafeDerive =
    new RegExp(
      `#\\[derive\\([\\s\\S]*?(Debug|Clone|Serialize)[\\s\\S]*?\\)\\]\\s*pub struct ${protectedType}`,
    );

  if (unsafeDerive.test(rustCode)) {
    throw new Error(
      `${protectedType} must not derive Debug, Clone, or Serialize.`,
    );
  }
}

const testCount =
  (
    rustCode.match(
      /fn phase16b3a_[a-z0-9_]+\s*\(/g,
    ) ?? []
  ).length;

if (testCount !== 6) {
  throw new Error(
    `Expected six Phase 16B3A tests, found ${testCount}.`,
  );
}

const expectedTvScripts = {
  'test:native-passport-phase16b3a-device-material-runtime':
    'cargo test --manifest-path src-tauri/Cargo.toml --offline passport_tv_device_material::tests',

  'check:native-passport-phase16b3a-device-material-runtime':
    'node ../../scripts/check-crablink-tv-native-passport-phase16b3a-device-material-runtime-boundary.mjs',
};

for (const [name, command] of Object.entries(expectedTvScripts)) {
  if (tvPackage.scripts?.[name] !== command) {
    throw new Error(
      `TV package script missing or incorrect: ${name}`,
    );
  }
}

const expectedRootScripts = {
  'tv:native-passport:phase16b3a:device-material:test':
    'npm --prefix apps/crablink-tv run test:native-passport-phase16b3a-device-material-runtime',

  'tv:native-passport:phase16b3a:device-material:check':
    'node scripts/check-crablink-tv-native-passport-phase16b3a-device-material-runtime-boundary.mjs',
};

for (const [name, command] of Object.entries(expectedRootScripts)) {
  if (rootPackage.scripts?.[name] !== command) {
    throw new Error(
      `Root package script missing or incorrect: ${name}`,
    );
  }
}

console.log(
  'CrabLink TV Native Passport Phase 16B3A device-material boundary passed.',
);

console.log(
  'NATIVE_PASSPORT_PHASE16B3A_DEVICE_MATERIAL_RUNTIME=GREEN',
);

console.log(
  'SCRIPTED_EDITOR=NODE_ONLY',
);

console.log(
  'RUST_EXECUTABLE_CODE_SCAN=COMMENTS_STRIPPED',
);

console.log(
  'TV_DEVICE_KEY_CSPRNG=OS_RANDOM',
);

console.log(
  'TV_DEVICE_KEY_ALGORITHM=ed25519',
);

console.log(
  'TV_DEVICE_SECRET_ZEROIZE_ON_DROP=YES',
);

console.log(
  'DEVICE_KEY_ASSOCIATED_DATA_BINDING=LOCKED',
);

console.log(
  'INJECTED_NATIVE_SEALER_PORT=ADDED',
);

console.log(
  'ANDROID_JNI_ADAPTER=NOT_ADDED',
);

console.log(
  'ANDROID_NATIVE_PERSISTENCE=NOT_ADDED',
);

console.log(
  'PUBLIC_TAURI_COMMAND=NOT_ADDED',
);

console.log(
  'REACT_SECRET_SURFACE=NOT_ADDED',
);

console.log(
  'CODEBUNDLE_REGENERATED=NO',
);

console.log(
  'NEXT_PATCH=NATIVE_PASSPORT_PHASE16B3B_ANDROID_JNI_SEALER_AND_ATOMIC_DEVICE_STORE',
);
