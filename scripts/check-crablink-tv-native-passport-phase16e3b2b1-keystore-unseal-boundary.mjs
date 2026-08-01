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
      `Missing Phase 16E3B2B1 source: ${relativePath}`,
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

function stripKotlinCommentsAndQuotedStrings(
  source,
) {
  return source
    .replace(
      /"""[\s\S]*?"""/gu,
      '""',
    )
    .replace(
      /"(?:\\.|[^"\\])*"/gu,
      '""',
    )
    .replace(
      /'(?:\\.|[^'\\])*'/gu,
      "''",
    )
    .replace(
      /\/\*[\s\S]*?\*\//gu,
      '',
    )
    .replace(
      /\/\/.*$/gmu,
      '',
    );
}

const base =
  'apps/crablink-tv/src-tauri/gen/android/app/src/main/java/com/rustyonions/crablink/tv';

const deviceStore =
  read(
    `${base}/TvPassportDeviceMaterialStore.kt`,
  );

const deviceBridge =
  read(
    `${base}/TvPassportDeviceMaterialBridge.kt`,
  );

const authorityStore =
  read(
    `${base}/TvPassportDelegatedAuthorityStore.kt`,
  );

const authorityBridge =
  read(
    `${base}/TvPassportDelegatedAuthorityBridge.kt`,
  );

const verifier =
  read(
    `${base}/TvPassportNativePinVerifierStore.kt`,
  );

const mainActivity =
  read(
    `${base}/MainActivity.kt`,
  );

const jni =
  read(
    'apps/crablink-tv/src-tauri/src/passport_android_jni.rs',
  );

const lib =
  read(
    'apps/crablink-tv/src-tauri/src/lib.rs',
  );

const proguard =
  read(
    'apps/crablink-tv/src-tauri/gen/android/app/proguard-rules.pro',
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
  'device sealed-envelope read',
  deviceStore,
  [
    'readSealedEnvelopeForNative',
    'atomicFile.readFully()',
    'decodeStorePayload(',
    'validateSealedEnvelope(',
    'reviewed.sealedEnvelope',
    '.copyOf()',
    'payload.fill(',
  ],
);

requireFragments(
  'device-key Keystore unseal',
  deviceBridge,
  [
    'unsealStoredDeviceKeyForNative',
    'readSealedEnvelopeForNative',
    'keystoreBridge.unseal(',
    'LOCKED_ASSOCIATED_DATA',
    'decodeSealedBlob(',
    'DEVICE_KEY_BYTES',
    'plaintext.fill(',
    'associatedData.fill(',
    'envelope?.fill(',
    'sealed',
    'ciphertext',
  ],
);

requireFragments(
  'capability sealed-envelope read',
  authorityStore,
  [
    'readSealedCapabilityEnvelopeForNative',
    'readStoredPayload()',
    'sealedCapabilityEnvelope',
    '.copyOf()',
    'sealedAuthorizationEnvelope.fill(',
  ],
);

requireFragments(
  'narrow-capability Keystore unseal',
  authorityBridge,
  [
    'unsealStoredNarrowCapabilityForNative',
    'readPublicRecordForNative()',
    'MessageDigest',
    'SHA-256',
    'CAPABILITY_ASSOCIATED_DATA_PREFIX',
    'readSealedCapabilityEnvelopeForNative',
    'keystoreBridge.unseal(',
    'decodeSealedBlob(',
    'MAX_CAPABILITY_PLAINTEXT_BYTES',
    'plaintext.fill(',
    'publicRecordBinding',
    'capabilityAssociatedData',
  ],
);

requireFragments(
  'verified-ticket predecessor',
  verifier,
  [
    'consumeVerifiedPinTicketForNative',
    'VERIFIED_TICKET_LIFETIME_MS',
    'pendingVerifiedTicket',
  ],
);

requireFragments(
  'release keep rules',
  proguard,
  [
    'Phase 16E3B2B1 native Keystore unseal ports',
    'readSealedEnvelopeForNative',
    'unsealStoredDeviceKeyForNative',
    'readSealedCapabilityEnvelopeForNative',
    'unsealStoredNarrowCapabilityForNative',
  ],
);

requireFragments(
  'device public-record sensitive denylist literals',
  deviceStore,
  [
    '"recoveryPhrase"',
    '"recoveryRoot"',
    '"rootPrivateKey"',
    '"rootAdminKey"',
    '"rawCapability"',
  ],
);

requireFragments(
  'authority public-record sensitive denylist literals',
  authorityStore,
  [
    '"recoveryPhrase"',
    '"recoveryRoot"',
    '"rootPrivateKey"',
    '"rootAdminKey"',
    '"rawCapability"',
  ],
);

const productionSources =
  [
    deviceStore,
    deviceBridge,
    authorityStore,
    authorityBridge,
  ]
    .join(
      '\n',
    );

const executableProductionSources =
  stripKotlinCommentsAndQuotedStrings(
    productionSources,
  );

rejectFragments(
  'Phase 16E3B2B1 executable secret surfaces',
  executableProductionSources,
  [
    '@JavascriptInterface',
    'evaluateJavascript',
    'localStorage',
    'sessionStorage',
    'String(pin)',
    'pin.concatToString()',
    'pin.joinToString(',
    'recoveryPhrase',
    'rootPrivateKey',
    'wallet.spend',
    'wallet.transfer',
    'ledger.write',
  ],
);

for (
  const marker
  of [
    '.requestUnlock(',
    '.enroll(',
    '.verify(',
    'unlockOperationalRuntimeAfterVerifiedNativePin',
  ]
) {
  if (
    mainActivity.includes(
      marker,
    )
  ) {
    throw new Error(
      `Phase 16E3B2B1 premature MainActivity invocation: ${marker}`,
    );
  }
}

for (
  const marker
  of [
    'consumeVerifiedPinTicketForNative',
    'unsealStoredDeviceKeyForNative',
    'unsealStoredNarrowCapabilityForNative',
    'unlockOperationalRuntimeAfterVerifiedNativePin',
  ]
) {
  if (
    jni.includes(
      marker,
    )
  ) {
    throw new Error(
      `Phase 16E3B2B1 premature JNI handoff: ${marker}`,
    );
  }
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
    'check:native-passport-phase16e3b2b1-keystore-unseal'
  ] !==
  'node ../../scripts/check-crablink-tv-native-passport-phase16e3b2b1-keystore-unseal-boundary.mjs'
) {
  throw new Error(
    'Phase 16E3B2B1 TV boundary script mismatch',
  );
}

if (
  rootPackage.scripts[
    'tv:native-passport:phase16e3b2b1:keystore-unseal:check'
  ] !==
  'node scripts/check-crablink-tv-native-passport-phase16e3b2b1-keystore-unseal-boundary.mjs'
) {
  throw new Error(
    'Phase 16E3B2B1 root boundary script mismatch',
  );
}

if (
  !codebundle.includes(
    'check-crablink-tv-native-passport-phase16e3b2b1-keystore-unseal-boundary.mjs',
  )
) {
  throw new Error(
    'Phase 16E3B2B1 boundary absent from future codebundle selection',
  );
}

console.log(
  'CrabLink TV Native Passport Phase 16E3B2B1 Keystore-unseal boundary passed.',
);

console.log(
  'NATIVE_PASSPORT_PHASE16E3B2B1_KEYSTORE_UNSEAL=GREEN',
);

console.log(
  'DEVICE_KEY_UNSEAL=ANDROID_KEYSTORE_NATIVE_ONLY_NOT_INVOKED',
);

console.log(
  'CAPABILITY_UNSEAL=ANDROID_KEYSTORE_NATIVE_ONLY_NOT_INVOKED',
);

console.log(
  'VERIFIED_PIN_TICKET_CONSUMPTION=NOT_CONNECTED',
);

console.log(
  'JNI_OPERATIONAL_UNLOCK_HANDOFF=NOT_ADDED',
);

console.log(
  'PROMPT_INVOCATION=NOT_ADDED',
);

console.log(
  'PUBLIC_TAURI_COMMAND=NOT_ADDED',
);

console.log(
  'NEXT_PATCH=NATIVE_PASSPORT_PHASE16E3B2B2_VERIFIED_TICKET_JNI_RUNTIME_HANDOFF',
);
