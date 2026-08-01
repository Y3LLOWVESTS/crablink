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

const read =
  (file) =>
    fs.readFileSync(
      path.join(
        root,
        file,
      ),
      'utf8',
    );

function must(
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

const runtime =
  read(
    'apps/crablink-tv/src-tauri/src/passport_tv_authority_runtime.rs',
  );

const jni =
  read(
    'apps/crablink-tv/src-tauri/src/passport_android_jni.rs',
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

const bundle =
  read(
    'scripts/make_codebundle.sh',
  );

must(
  'runtime',
  runtime,
  [
    'crablink.tv.delegated-authority-runtime.v1',
    'crablink.tv.device-proof-port.v1',
    'review_stored_tv_delegated_authority_record',
    'TV_DELEGATED_READ_SCOPES.contains',
    'RuntimeLocked',
    'ProofRequestBeyondAuthority',
    'phase16d3_hydrates_valid_authority_as_locked_runtime',
    'phase16d3_revoked_and_expired_authority_block_proofs',
    'phase16d3_invalid_hydration_clears_prior_runtime_authority',
    'phase16d3_locked_runtime_never_invokes_device_proof_port',
    'phase16d3_device_proof_port_accepts_only_after_test_unlock',
  ],
);

const tests =
  [
    ...runtime.matchAll(
      /fn (phase16d3_[a-z0-9_]+)\(\)/gu,
    ),
  ];

if (tests.length !== 5) {
  throw new Error(
    `Phase 16D3 test count ${tests.length}; expected 5`,
  );
}

const testBoundary =
  runtime.indexOf(
    '#[cfg(test)]\nmod tests',
  );

const productionRuntime =
  runtime.slice(
    0,
    testBoundary,
  );

for (
  const forbidden
  of [
    'wallet.spend',
    'wallet.transfer',
    'rootPrivateKey',
    'recoveryPhrase',
    '@JavascriptInterface',
  ]
) {
  if (
    `${productionRuntime}\n${jni}\n${bridge}`
      .includes(
        forbidden,
      )
  ) {
    throw new Error(
      `Forbidden production fragment: ${forbidden}`,
    );
  }
}

must(
  'lib',
  lib,
  [
    'mod passport_tv_authority_runtime;',
  ],
);

must(
  'jni',
  jni,
  [
    'hydrate_global_tv_authority_runtime',
    'clear_global_tv_authority_runtime',
    'TvPassportDelegatedAuthorityBridge_hydrateStoredAuthorityForNative',
    'readStoredDelegatedAuthorityPublicRecordForNative',
  ],
);

must(
  'bridge',
  bridge,
  [
    'external fun hydrateStoredAuthorityForNative',
    'hydrateStoredDelegatedAuthorityOnStartupForNative',
    'System.currentTimeMillis()',
  ],
);

must(
  'activity',
  activity,
  [
    'hydrateStoredDelegatedAuthorityOnStartupForNative',
  ],
);

must(
  'proguard',
  proguard,
  [
    'hydrateStoredAuthorityForNative(long)',
    'hydrateStoredDelegatedAuthorityOnStartupForNative',
  ],
);

must(
  'codebundle',
  bundle,
  [
    'check-crablink-tv-native-passport-phase16d3-authority-runtime-boundary.mjs',
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
    'test:native-passport-phase16d3-authority-runtime'
  ]
  !==
  'cargo test --manifest-path src-tauri/Cargo.toml --offline phase16d3_'
) {
  throw new Error(
    'TV Phase 16D3 test script mismatch',
  );
}

if (
  tvPackage.scripts[
    'check:native-passport-phase16d3-authority-runtime'
  ]
  !==
  'node ../../scripts/check-crablink-tv-native-passport-phase16d3-authority-runtime-boundary.mjs'
) {
  throw new Error(
    'TV Phase 16D3 boundary script mismatch',
  );
}

if (
  rootPackage.scripts[
    'tv:native-passport:phase16d3:authority-runtime:test'
  ]
  !==
  'npm --prefix apps/crablink-tv run test:native-passport-phase16d3-authority-runtime'
) {
  throw new Error(
    'Root Phase 16D3 test script mismatch',
  );
}

if (
  rootPackage.scripts[
    'tv:native-passport:phase16d3:authority-runtime:check'
  ]
  !==
  'node scripts/check-crablink-tv-native-passport-phase16d3-authority-runtime-boundary.mjs'
) {
  throw new Error(
    'Root Phase 16D3 boundary script mismatch',
  );
}

console.log(
  'CrabLink TV Native Passport Phase 16D3 authority-runtime boundary passed.',
);

console.log(
  'NATIVE_PASSPORT_PHASE16D3_AUTHORITY_RUNTIME=GREEN',
);

console.log(
  'DEVICE_PROOF_SIGNING_RUNTIME=LOCKED_PENDING_PHASE16E',
);

console.log(
  'OPERATIONAL_UNLOCK=NOT_ADDED',
);

console.log(
  'PUBLIC_TAURI_COMMAND=NOT_ADDED',
);

console.log(
  'NEXT_ACTION=FRESH_ANDROID_ARMV7_BUILD_VERIFICATION',
);
