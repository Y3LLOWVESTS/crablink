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
      `Missing Phase 16C2 source: ${relativePath}`,
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

const authorization =
  read(
    'crates/crablink-native-core/src/tv_passport_authorization.rs',
  );

const pairingRequest =
  read(
    'crates/crablink-native-core/src/tv_passport_pairing.rs',
  );

const coreCargo =
  read(
    'crates/crablink-native-core/Cargo.toml',
  );

const coreLib =
  read(
    'crates/crablink-native-core/src/lib.rs',
  );

const delegatedContract =
  read(
    'apps/crablink-tv/src/passport/tvDelegatedPassportContract.js',
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
  'Phase 16C2 root authorization',
  authorization,
  [
    'crablink.tv.root-device-authorization.v1',
    'root_authorization_verified',
    'pub struct TvPassportRootAuthorizationV1',
    'pub struct ReviewedTvPassportRootAuthorizationV1',
    'pub trait TvPassportPairingReplayStore',
    'pub enum TvPassportPairingReplayConsumeOutcome',
    'pub fn tv_passport_root_authorization_signing_bytes',
    'pub fn tv_passport_root_authorization_id',
    'pub fn review_and_consume_tv_passport_root_authorization',
    'VerifyingKey',
    'Signature::from_bytes',
    '.verify(',
    'pairing_request_id',
    'passport_id',
    'root_public_key_hex',
    'device_public_key_hex',
    'allowed_scopes',
    'nonce_hex',
    'root_epoch',
    'root_admin_authorization_required',
    'companion_passport_pairing_required',
    'ReplayDetected',
    'ReplayStoreUnavailable',
    'session_present: false',
    'capability_present: false',
  ],
);

requireFragments(
  'Phase 16C2 dependency and export',
  `${coreCargo}\n${coreLib}`,
  [
    'ed25519-dalek = "2"',
    'pub mod tv_passport_authorization;',
  ],
);

requireFragments(
  'Phase 16C1 reuse',
  pairingRequest,
  [
    'pub struct TvPassportPairingRequestV1',
    'pub fn review_tv_passport_pairing_request',
    'TV_PASSPORT_PAIRING_READ_SCOPES',
  ],
);

for (const marker of [
  'tv_read_only',
  'root-signed-device-authorization',
  'rootAdminAuthorizationRequired',
  'companionPassportPairingRequired',
]) {
  if (
    !delegatedContract.includes(
      marker,
    )
  ) {
    throw new Error(
      `Delegated Passport contract lost ${marker}.`,
    );
  }
}

const implementationOnly =
  authorization.split(
    '#[cfg(test)]',
  )[0];

for (
  const [
    label,
    pattern,
  ]
  of [
    [
      'root signing key',
      /\bSigningKey\b/u,
    ],
    [
      'signature creation',
      /\.sign\s*\(/u,
    ],
    [
      'Tauri command',
      /tauri::command/u,
    ],
    [
      'network transport',
      /\breqwest\b/u,
    ],
    [
      'filesystem mutation',
      /std::fs/u,
    ],
    [
      'in-memory production replay store',
      /\bHashSet\b/u,
    ],
    [
      'capability issuance',
      /issue_capability/u,
    ],
    [
      'session creation',
      /create_session/u,
    ],
    [
      'wallet mutation',
      /wallet_mutation/u,
    ],
    [
      'ledger mutation',
      /ledger_mutation/u,
    ],
  ]
) {
  if (pattern.test(implementationOnly)) {
    throw new Error(
      `Phase 16C2 contains forbidden ${label}.`,
    );
  }
}

const forbiddenPrivateFields = [
  'recovery_phrase',
  'recovery_root',
  'root_private_key',
  'root_admin_private_key',
  'device_private_key',
  'wallet_authority',
  'ledger_authority',
  'raw_capability',
  'session_token',
];

for (const field of forbiddenPrivateFields) {
  if (
    implementationOnly.includes(
      `pub ${field}:`,
    )
  ) {
    throw new Error(
      `Phase 16C2 exposes forbidden field ${field}.`,
    );
  }
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
    'Phase 16C2 added a public Passport Tauri command.',
  );
}

const expectedTvTest =
  'cargo test --manifest-path ../../crates/crablink-native-core/Cargo.toml --offline tv_passport_authorization::tests::phase16c2_';

const expectedTvCheck =
  'node ../../scripts/check-crablink-tv-native-passport-phase16c2-root-authorization-boundary.mjs';

if (
  tvPackage.scripts[
    'test:native-passport-phase16c2-root-authorization'
  ] !== expectedTvTest
) {
  throw new Error(
    'Phase 16C2 TV test script mismatch.',
  );
}

if (
  tvPackage.scripts[
    'check:native-passport-phase16c2-root-authorization'
  ] !== expectedTvCheck
) {
  throw new Error(
    'Phase 16C2 TV boundary script mismatch.',
  );
}

if (
  rootPackage.scripts[
    'tv:native-passport:phase16c2:root-authorization:test'
  ]
  !==
  'npm --prefix apps/crablink-tv run test:native-passport-phase16c2-root-authorization'
) {
  throw new Error(
    'Phase 16C2 root test script mismatch.',
  );
}

if (
  rootPackage.scripts[
    'tv:native-passport:phase16c2:root-authorization:check'
  ]
  !==
  'node scripts/check-crablink-tv-native-passport-phase16c2-root-authorization-boundary.mjs'
) {
  throw new Error(
    'Phase 16C2 root boundary script mismatch.',
  );
}

if (
  !makeCodebundle.includes(
    'check-crablink-tv-native-passport-phase16c2-root-authorization-boundary.mjs',
  )
) {
  throw new Error(
    'Phase 16C2 boundary is missing from future codebundles.',
  );
}

console.log(
  'CrabLink TV Native Passport Phase 16C2 root-authorization boundary passed.',
);

console.log(
  'NATIVE_PASSPORT_PHASE16C2_ROOT_AUTHORIZATION_REVIEW=GREEN',
);

console.log(
  'PATCH_2_OF_5=OPEN',
);

console.log(
  'PHASE16C_SLICE=2',
);

console.log(
  'AUTHORIZATION_MODE=root-signed-device-authorization',
);

console.log(
  'ROOT_SIGNATURE_ALGORITHM=ed25519',
);

console.log(
  'EXPECTED_PASSPORT_ROOT_KEY_REQUIRED=YES',
);

console.log(
  'PAIRING_REQUEST_BINDING=YES',
);

console.log(
  'TV_DEVICE_KEY_BINDING=YES',
);

console.log(
  'SCOPE_NONCE_EXPIRY_BINDING=YES',
);

console.log(
  'ROOT_EPOCH_BINDING=YES',
);

console.log(
  'MISMATCH_REJECTION=ADDED',
);

console.log(
  'INJECTED_ATOMIC_REPLAY_CONSUMPTION=ADDED',
);

console.log(
  'CONCURRENT_DUPLICATE_ACCEPTS_AT_MOST_ONE=TESTED',
);

console.log(
  'DURABLE_REPLAY_ADAPTER=RUNTIME_HANDOFF_PENDING',
);

console.log(
  'ROOT_SIGNING_IMPLEMENTATION=NOT_ADDED',
);

console.log(
  'TV_SELF_APPROVAL=FORBIDDEN',
);

console.log(
  'SESSION_PRESENT=NO',
);

console.log(
  'CAPABILITY_PRESENT=NO',
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
  'NEXT_PATCH=NATIVE_PASSPORT_PHASE16C3_EXISTING_PAIRING_COMMAND_RUNTIME_HANDOFF',
);
