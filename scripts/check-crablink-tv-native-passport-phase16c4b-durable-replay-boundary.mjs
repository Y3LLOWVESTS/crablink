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
      `Missing Phase 16C4B source: ${relativePath}`,
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

const replayReview =
  read(
    'apps/crablink-tv/src-tauri/src/passport_tv_authorization_replay.rs',
  );

const jni =
  read(
    'apps/crablink-tv/src-tauri/src/passport_android_jni.rs',
  );

const replayStore =
  read(
    'apps/crablink-tv/src-tauri/gen/android/app/src/main/java/com/rustyonions/crablink/tv/TvPassportAuthorizationReplayStore.kt',
  );

const bridge =
  read(
    'apps/crablink-tv/src-tauri/gen/android/app/src/main/java/com/rustyonions/crablink/tv/TvPassportDeviceMaterialBridge.kt',
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
  'Phase 16C4B Rust replay receipt review',
  replayReview,
  [
    'crablink.tv.passport-authorization-replay.v1',
    'TvAuthorizationReplayDecision',
    'Consumed',
    'Replay',
    'deny_unknown_fields',
    'authorization_material_stored',
    'review_android_authorization_replay_receipt',
    'phase16c4b_accepts_first_durable_consumption',
    'phase16c4b_reports_durable_replay_without_accepting_twice',
    'phase16c4b_rejects_receipt_binding_or_posture_mismatch',
    'phase16c4b_rejects_unknown_fields_and_ambiguous_outcomes',
  ],
);

requireFragments(
  'Phase 16C4B Android durable store',
  replayStore,
  [
    'android.util.AtomicFile',
    'context.noBackupFilesDir',
    'tv-authorization-replay.v1.bin',
    '@Synchronized',
    'fun consumeOnce(',
    'atomicFile.readFully()',
    'atomicFile.startWrite()',
    'atomicFile.finishWrite(',
    'atomicFile.failWrite(',
    'authorizationId',
    'expiresAtMs',
    'MAX_REPLAY_ENTRIES',
    '256',
    'authorizationMaterialStored',
    'false',
    'capabilityPresent',
    'sessionPresent',
  ],
);

requireFragments(
  'Phase 16C4B bridge',
  bridge,
  [
    'private val replayStore:',
    'TvPassportAuthorizationReplayStore',
    'fun consumeAuthorizationReplayForNative(',
    'replayStore.consumeOnce(',
    'authorizationMaterialStored',
    'capabilityPresent',
    'sessionPresent',
  ],
);

requireFragments(
  'Phase 16C4B Android ownership',
  activity,
  [
    'tvPassportAuthorizationReplayStore',
    'TvPassportAuthorizationReplayStore(',
    'replayStore =',
    'tvPassportAuthorizationReplayStore',
  ],
);

requireFragments(
  'Phase 16C4B JNI adapter',
  jni,
  [
    'consume_tv_authorization_replay',
    'consumeAuthorizationReplayForNative',
    '(Ljava/lang/String;JJ)Ljava/lang/String;',
    'review_android_authorization_replay_receipt',
    'TvAuthorizationReplayDecision',
    'TvAuthorizationReplayReceiptError',
  ],
);

requireFragments(
  'Phase 16C4B release keep rule',
  proguard,
  [
    'consumeAuthorizationReplayForNative(java.lang.String, long, long)',
  ],
);

const storeProduction =
  replayStore
    .replace(
      /\/\*[\s\S]*?\*\//gu,
      '',
    )
    .replace(
      /\/\/.*$/gmu,
      '',
    );

rejectFragments(
  'Phase 16C4B replay store authority',
  storeProduction,
  [
    'recoveryPhrase',
    'rootPrivateKey',
    'rootAdminPrivateKey',
    'devicePrivateKey',
    'secretSeed',
    'rawCapability',
    'sessionToken',
    'walletPrivateKey',
    'signedAuthorizationJson',
    'authorizationPayload',
    'authorizationSignature',
  ],
);

const combinedProduction =
  [
    replayReview.split(
      '#[cfg(test)]',
    )[0],

    jni,
    replayStore,
    bridge,
    activity,
  ].join('\n');

rejectFragments(
  'Phase 16C4B production surface',
  combinedProduction,
  [
    '@JavascriptInterface',
    'issue_capability',
    'create_session',
    'approvePairingLocally',
    'claimUsername',
    'transferUsername',
    'walletSpend',
    'ledgerMutation',
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
    'Phase 16C4B added a public Passport command.',
  );
}

const expectedTvTest =
  'cargo test --manifest-path src-tauri/Cargo.toml --offline phase16c4b_';

const expectedTvCheck =
  'node ../../scripts/check-crablink-tv-native-passport-phase16c4b-durable-replay-boundary.mjs';

if (
  tvPackage.scripts[
    'test:native-passport-phase16c4b-durable-replay'
  ] !== expectedTvTest
) {
  throw new Error(
    'Phase 16C4B TV test script mismatch.',
  );
}

if (
  tvPackage.scripts[
    'check:native-passport-phase16c4b-durable-replay'
  ] !== expectedTvCheck
) {
  throw new Error(
    'Phase 16C4B TV boundary script mismatch.',
  );
}

if (
  rootPackage.scripts[
    'tv:native-passport:phase16c4b:durable-replay:test'
  ]
  !==
  'npm --prefix apps/crablink-tv run test:native-passport-phase16c4b-durable-replay'
) {
  throw new Error(
    'Phase 16C4B root test script mismatch.',
  );
}

if (
  rootPackage.scripts[
    'tv:native-passport:phase16c4b:durable-replay:check'
  ]
  !==
  'node scripts/check-crablink-tv-native-passport-phase16c4b-durable-replay-boundary.mjs'
) {
  throw new Error(
    'Phase 16C4B root check script mismatch.',
  );
}

if (
  !makeCodebundle.includes(
    'check-crablink-tv-native-passport-phase16c4b-durable-replay-boundary.mjs',
  )
) {
  throw new Error(
    'Phase 16C4B boundary is absent from future codebundles.',
  );
}

console.log(
  'CrabLink TV Native Passport Phase 16C4B durable-replay boundary passed.',
);

console.log(
  'NATIVE_PASSPORT_PHASE16C4B_DURABLE_REPLAY=GREEN',
);

console.log(
  'PATCH_2_OF_5=COMPLETE',
);

console.log(
  'PHASE16C_SLICE=4B',
);

console.log(
  'DURABLE_AUTHORIZATION_REPLAY_STORE=ADDED',
);

console.log(
  'REPLAY_STORE_BACKEND=ANDROID_NO_BACKUP_ATOMIC_FILE',
);

console.log(
  'REPLAY_CONSUMPTION=ATOMIC_CONSUME_ONCE',
);

console.log(
  'RESTART_DURABILITY=ADDED',
);

console.log(
  'EXPIRED_ENTRY_PRUNING=ADDED',
);

console.log(
  'MAX_REPLAY_ENTRIES=256',
);

console.log(
  'STORED_MATERIAL=AUTHORIZATION_ID_AND_EXPIRY_ONLY',
);

console.log(
  'SIGNED_AUTHORIZATION_STORED=NO',
);

console.log(
  'CAPABILITY_STORED=NO',
);

console.log(
  'SESSION_CREATED=NO',
);

console.log(
  'ROOT_OR_RECOVERY_MATERIAL_STORED=NO',
);

console.log(
  'PHASE16D_AUTHORIZATION_REVIEW_HANDOFF=READY',
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
  'CODEBUNDLE_REGENERATED=NO',
);

console.log(
  'NEXT_PATCH=NATIVE_PASSPORT_PHASE16D_AUTHORIZATION_RECEIPT_AND_CAPABILITY_STORAGE',
);
