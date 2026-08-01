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
      `Missing Phase 16E3B1 source: ${relativePath}`,
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

const verifier =
  read(
    'apps/crablink-tv/src-tauri/gen/android/app/src/main/java/com/rustyonions/crablink/tv/TvPassportNativePinVerifierStore.kt',
  );

const prompt =
  read(
    'apps/crablink-tv/src-tauri/gen/android/app/src/main/java/com/rustyonions/crablink/tv/TvPassportNativePinPrompt.kt',
  );

const mainActivity =
  read(
    'apps/crablink-tv/src-tauri/gen/android/app/src/main/java/com/rustyonions/crablink/tv/MainActivity.kt',
  );

const proguard =
  read(
    'apps/crablink-tv/src-tauri/gen/android/app/proguard-rules.pro',
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
  'Phase 16E3B1 PIN verifier',
  verifier,
  [
    'class TvPassportNativePinVerifierStore',
    'TvPassportNativePinVerifierInspection',
    'crablink.tv.native-pin-verifier-inspection.v1',
    'AtomicFile',
    'noBackupFilesDir',
    'SecureRandom',
    'MessageDigest',
    'SHA-256',
    'keystoreBridge.seal(',
    'keystoreBridge.unseal(',
    'fun enroll(',
    'fun verify(',
    'fun inspect(',
    'fun delete(',
    'PIN_VERIFIER_ASSOCIATED_DATA_PREFIX',
    'VERIFIER_PLAINTEXT_MAGIC',
    'MAX_FAILED_ATTEMPTS',
    'FAILED_ATTEMPT_COOLDOWN_MS',
    'recordWrongPin',
    'associatedData.fill(',
    'verifierPlaintext.fill(',
    'plaintext?.fill(',
    'pinStored =',
    'pinHashStored =',
    'pinDigestStored =',
    'webviewSecretReturned =',
    'operationallyUnlocked =',
    'proofSigningActivated =',
  ],
);

rejectFragments(
  'Phase 16E3B1 PIN verifier',
  verifier,
  [
    'String(pin)',
    'pin.concatToString()',
    'pin.joinToString(',
    'pin.toString()',
    'SharedPreferences',
    'localStorage',
    'sessionStorage',
    '@JavascriptInterface',
    'evaluateJavascript',
    'WebView',
    'Base64',
    'pinHash:',
    'pinDigest:',
    'rootPrivateKey',
    'recoveryPhrase',
    'wallet.spend',
    'wallet.transfer',
    'ledger.write',
  ],
);

requireFragments(
  'Phase 16E3B1 MainActivity ownership',
  mainActivity,
  [
    'TvPassportNativePinVerifierStore(',
    'passportNativePinVerifierStoreForNativeRuntime',
  ],
);

if (
  mainActivity.includes(
    '.enroll(',
  ) ||
  mainActivity.includes(
    '.verify(',
  ) ||
  mainActivity.includes(
    '.requestUnlock(',
  )
) {
  throw new Error(
    'Phase 16E3B1 must not invoke enrollment, verification, or unlock',
  );
}

requireFragments(
  'Phase 16E3B1 prompt predecessor',
  prompt,
  [
    'TvPassportNativePinVerifier',
    'TvPassportNativePinVerification',
    'pin.fill(',
  ],
);

requireFragments(
  'Phase 16E3B1 ProGuard posture',
  proguard,
  [
    'TvPassportNativePinVerifierStore',
    'TvPassportNativePinVerifierInspection',
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
    'check:native-passport-phase16e3b1-pin-verifier'
  ] !==
  'node ../../scripts/check-crablink-tv-native-passport-phase16e3b1-pin-verifier-boundary.mjs'
) {
  throw new Error(
    'Phase 16E3B1 TV boundary script mismatch',
  );
}

if (
  rootPackage.scripts[
    'tv:native-passport:phase16e3b1:pin-verifier:check'
  ] !==
  'node scripts/check-crablink-tv-native-passport-phase16e3b1-pin-verifier-boundary.mjs'
) {
  throw new Error(
    'Phase 16E3B1 root boundary script mismatch',
  );
}

if (
  !codebundle.includes(
    'check-crablink-tv-native-passport-phase16e3b1-pin-verifier-boundary.mjs',
  )
) {
  throw new Error(
    'Phase 16E3B1 boundary absent from future codebundle selection',
  );
}

console.log(
  'CrabLink TV Native Passport Phase 16E3B1 PIN-verifier boundary passed.',
);

console.log(
  'NATIVE_PASSPORT_PHASE16E3B1_PIN_VERIFIER=GREEN',
);

console.log(
  'PIN_VERIFIER_STORAGE=ANDROID_KEYSTORE_SEALED_RANDOM_CHALLENGE',
);

console.log(
  'RAW_PIN_PERSISTED=NO',
);

console.log(
  'PIN_HASH_PERSISTED=NO',
);

console.log(
  'PIN_DIGEST_PERSISTED=NO',
);

console.log(
  'PROMPT_INVOCATION=NOT_ADDED',
);

console.log(
  'DEVICE_MATERIAL_UNSEAL=NOT_ADDED',
);

console.log(
  'JNI_OPERATIONAL_UNLOCK_HANDOFF=NOT_ADDED',
);

console.log(
  'PUBLIC_TAURI_COMMAND=NOT_ADDED',
);

console.log(
  'NEXT_PATCH=NATIVE_PASSPORT_PHASE16E3B2_PROMPT_UNSEAL_AND_JNI_HANDOFF',
);
