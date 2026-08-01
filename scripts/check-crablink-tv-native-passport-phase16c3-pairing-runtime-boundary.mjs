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
      `Missing Phase 16C3 source: ${relativePath}`,
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

const pairing =
  read(
    'apps/crablink-tv/src-tauri/src/commands/pairing.rs',
  );

const pairingDto =
  read(
    'crates/crablink-native-core/src/pairing_dto.rs',
  );

const pairingRequest =
  read(
    'crates/crablink-native-core/src/tv_passport_pairing.rs',
  );

const rootAuthorization =
  read(
    'crates/crablink-native-core/src/tv_passport_authorization.rs',
  );

const viewModel =
  read(
    'apps/crablink-tv/src/pairing/tvPairingViewModel.js',
  );

const interaction =
  read(
    'apps/crablink-tv/src/pairing/tvPairingBeginInteraction.js',
  );

const panel =
  read(
    'apps/crablink-tv/src/pairing/TvPairingPanel.jsx',
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
  'Phase 16C3 native pairing runtime',
  runtime,
  [
    'OnceLock<TvPassportPairingRuntime>',
    'RwLock<TvPassportPairingRuntimeState>',
    'register_tv_pairing_public_device_record',
    'build_or_reuse_tv_passport_pairing_request',
    'generated_from_os_csprng',
    'sealed_by_android_keystore_jni',
    'stored_by_android_atomic_file',
    'TV_PASSPORT_PAIRING_TTL_MAX_MS',
    'OsRng',
    'try_fill_bytes',
    'pending_request',
    'PublicRecordUnavailable',
    'EntropyUnavailable',
  ],
);

requireFragments(
  'Phase 16C3 Android JNI handoff',
  jni,
  [
    'register_tv_pairing_public_device_record',
    'TvAndroidJniProvisioningError::PairingRuntime',
    'pairing_runtime_registration_failed',
    'register_tv_pairing_public_device_record(public_record.clone())',
  ],
);

requireFragments(
  'Phase 16C3 fixed-path pairing handoff',
  pairingBegin,
  [
    'crablink.tv.native-passport-pairing-begin.v1',
    'struct TvNativePassportPairingBeginRequest',
    'passport_pairing_request',
    'review_tv_passport_pairing_request',
    'build_or_reuse_tv_passport_pairing_request',
    'pairing_begin_request_for_gateway',
    'pairing_contract_mismatch',
    'pairing_short_code_mismatch',
    'const PAIRING_PATH: &str = "/v1/tv/pairing"',
    '.redirect(',
    'reqwest::redirect::Policy::none()',
    '.no_proxy()',
    '.post(url)',
    '.json(&request)',
    'pub async fn tv_pairing_begin',
  ],
);

requireFragments(
  'Phase 16C3 shared compatibility projection',
  `${pairingDto}\n${pairing}`,
  [
    'pub const APPROVAL_AUTHORITY: &str = "root-admin-device-required"',
    '"capability.revoke_self"',
    'device_class: "tv_read_only"',
  ],
);

requireFragments(
  'Phase 16C3 frontend projection',
  `${viewModel}\n${interaction}\n${panel}`,
  [
    'root-admin-device-required',
    'root-admin device',
    'sessionPresent: false',
    'No session has been created.',
  ],
);

requireFragments(
  'Phase 16C1 and 16C2 reuse',
  `${pairingRequest}\n${rootAuthorization}`,
  [
    'pub struct TvPassportPairingRequestV1',
    'pub fn review_tv_passport_pairing_request',
    'pub struct TvPassportRootAuthorizationV1',
    'pub fn review_and_consume_tv_passport_root_authorization',
  ],
);

const runtimeImplementation =
  runtime.split(
    '#[cfg(test)]',
  )[0];

const pairingImplementation =
  pairingBegin.split(
    '#[cfg(test)]',
  )[0];

const jniImplementation =
  jni.split(
    '#[cfg(test)]',
  )[0];

const production =
  [
    runtimeImplementation,
    pairingImplementation,
    jniImplementation,
    viewModel,
    interaction,
    panel,
  ].join('\n');

rejectFragments(
  'Phase 16C3 production surface',
  production,
  [
    'companion-crablink-required',
    'trusted companion',
    'recoveryPhrase',
    'root_private_key',
    'rootAdminPrivateKey',
    'device_private_key',
    'rawCapability',
    'sessionToken',
    'issue_capability',
    'create_session',
    'approvePairingLocally',
    'wallet_mutation',
    'ledger_mutation',
  ],
);

const strictNativeProduction =
  [
    runtimeImplementation,
    pairingImplementation,
  ].join('\n');

rejectFragments(
  'Phase 16C3 runtime and transport secret identifier',
  strictNativeProduction,
  [
    'secret_seed',
    'secretSeed',
  ],
);

const jniSecretSeedOccurrenceCount =
  [
    ...jniImplementation.matchAll(
      /\bsecret_seed\b/gu,
    ),
  ].length;

if (
  jniSecretSeedOccurrenceCount !== 2
) {
  throw new Error(
    `Phase 16C3 JNI secret_seed occurrence count was ${jniSecretSeedOccurrenceCount}; expected exactly 2 reviewed local-use occurrences.`,
  );
}

requireFragments(
  'Phase 16C3 reviewed JNI borrowed-secret use',
  jniImplementation,
  [
    'secret_seed: &[u8],',
    '.byte_array_from_slice(secret_seed)',
  ],
);

const forbiddenJniSecretSurfaces = [
  {
    label: 'camel-case secret identifier',
    pattern: /\bsecretSeed\b/u,
  },
  {
    label: 'public secret field',
    pattern: /\bpub\s+secret_seed\s*:/u,
  },
  {
    label: 'owned String secret',
    pattern: /\bsecret_seed\s*:\s*String\b/u,
  },
  {
    label: 'owned vector secret',
    pattern: /\bsecret_seed\s*:\s*Vec\s*</u,
  },
  {
    label: 'owned fixed-array secret',
    pattern: /\bsecret_seed\s*:\s*\[\s*u8\s*;/u,
  },
  {
    label: 'direct secret serialization',
    pattern: /serde_json::to_(?:string|vec)\s*\(\s*&?\s*secret_seed\b/u,
  },
  {
    label: 'direct secret return',
    pattern: /\breturn\s+secret_seed\b/u,
  },
  {
    label: 'secret field assignment',
    pattern: /(?:\.|\[\s*['"])secret_seed(?:['"]\s*\])?\s*=/u,
  },
];

for (
  const {
    label,
    pattern,
  }
  of forbiddenJniSecretSurfaces
) {
  if (
    pattern.test(
      jniImplementation,
    )
  ) {
    throw new Error(
      `Phase 16C3 JNI secret boundary violation: ${label}.`,
    );
  }
}

const frontendProduction =
  [
    viewModel,
    interaction,
    panel,
  ].join('\n');

const forbiddenFrontendSecretWrites = [
  {
    label: 'snake-case secret field emission',
    pattern: /\bsecret_seed\s*:/u,
  },
  {
    label: 'camel-case secret field emission',
    pattern: /\bsecretSeed\s*:/u,
  },
  {
    label: 'snake-case secret declaration',
    pattern: /\b(?:const|let|var)\s+secret_seed\b/u,
  },
  {
    label: 'camel-case secret declaration',
    pattern: /\b(?:const|let|var)\s+secretSeed\b/u,
  },
  {
    label: 'snake-case secret assignment',
    pattern: /(?:\.|\[\s*['"])secret_seed(?:['"]\s*\])?\s*=/u,
  },
  {
    label: 'camel-case secret assignment',
    pattern: /(?:\.|\[\s*['"])secretSeed(?:['"]\s*\])?\s*=/u,
  },
];

for (
  const {
    label,
    pattern,
  }
  of forbiddenFrontendSecretWrites
) {
  if (
    pattern.test(
      frontendProduction,
    )
  ) {
    throw new Error(
      `Phase 16C3 frontend secret write detected: ${label}.`,
    );
  }
}

if (
  pairingImplementation.includes(
    'SigningKey',
  )
) {
  throw new Error(
    'Phase 16C3 cannot sign as the Passport root.',
  );
}

if (
  pairingImplementation.includes(
    '.sign(',
  )
) {
  throw new Error(
    'Phase 16C3 pairing transport cannot create signatures.',
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
    'Phase 16C3 added a public Passport command.',
  );
}

const expectedTest =
  'cargo test --manifest-path src-tauri/Cargo.toml --offline phase16c3_';

const expectedCheck =
  'node ../../scripts/check-crablink-tv-native-passport-phase16c3-pairing-runtime-boundary.mjs';

if (
  tvPackage.scripts[
    'test:native-passport-phase16c3-pairing-runtime'
  ] !== expectedTest
) {
  throw new Error(
    'Phase 16C3 TV test script mismatch.',
  );
}

if (
  tvPackage.scripts[
    'check:native-passport-phase16c3-pairing-runtime'
  ] !== expectedCheck
) {
  throw new Error(
    'Phase 16C3 TV boundary script mismatch.',
  );
}

if (
  rootPackage.scripts[
    'tv:native-passport:phase16c3:pairing-runtime:test'
  ]
  !==
  'npm --prefix apps/crablink-tv run test:native-passport-phase16c3-pairing-runtime'
) {
  throw new Error(
    'Phase 16C3 root test script mismatch.',
  );
}

if (
  rootPackage.scripts[
    'tv:native-passport:phase16c3:pairing-runtime:check'
  ]
  !==
  'node scripts/check-crablink-tv-native-passport-phase16c3-pairing-runtime-boundary.mjs'
) {
  throw new Error(
    'Phase 16C3 root boundary script mismatch.',
  );
}

if (
  !makeCodebundle.includes(
    'check-crablink-tv-native-passport-phase16c3-pairing-runtime-boundary.mjs',
  )
) {
  throw new Error(
    'Phase 16C3 boundary is missing from future codebundles.',
  );
}

console.log(
  'CrabLink TV Native Passport Phase 16C3 pairing-runtime boundary passed.',
);

console.log(
  'NATIVE_PASSPORT_PHASE16C3_PAIRING_RUNTIME_HANDOFF=GREEN',
);

console.log(
  'PATCH_2_OF_5=OPEN',
);

console.log(
  'PHASE16C_SLICE=3',
);

console.log(
  'JNI_PUBLIC_DEVICE_RECORD_REGISTRATION=ADDED',
);

console.log(
  'PAIRING_NONCE_SOURCE=OS_CSPRNG',
);

console.log(
  'PAIRING_REQUEST_REUSE=UNTIL_EXPIRY',
);

console.log(
  'PAIRING_REQUEST_DEVICE_KEY_BOUND=YES',
);

console.log(
  'EXISTING_TV_PAIRING_COMMAND=REUSED',
);

console.log(
  'PUBLIC_TAURI_COMMAND_COUNT=8',
);

console.log(
  'FIXED_GATEWAY_PATH=/v1/tv/pairing',
);

console.log(
  'BACKEND_SHORT_CODE_REPLACEMENT=REJECTED',
);

console.log(
  'APPROVAL_AUTHORITY=root-admin-device-required',
);

console.log(
  'COMPANION_PASSPORT_PAIRING_REQUIRED=NO',
);

console.log(
  'SESSION_PRESENT=NO',
);

console.log(
  'CAPABILITY_PRESENT=NO',
);

console.log(
  'ANDROID_STARTUP_PUBLIC_RECORD_HYDRATION=PENDING',
);

console.log(
  'AUTHORIZATION_RECEIPT_STORE=PENDING',
);

console.log(
  'DURABLE_REPLAY_ADAPTER=PENDING',
);

console.log(
  'ROOT_SIGNING_IMPLEMENTATION=NOT_ADDED',
);

console.log(
  'REACT_SECRET_SURFACE=NOT_ADDED',
);

console.log(
  'CODEBUNDLE_REGENERATED=NO',
);

console.log(
  'NEXT_PATCH=NATIVE_PASSPORT_PHASE16C4_ANDROID_STARTUP_HYDRATION_AND_AUTHORIZATION_RECEIPT_STORE',
);
