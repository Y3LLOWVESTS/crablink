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
      `Missing Phase 16C1 source: ${relativePath}`,
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

const pairingRequest =
  read(
    'crates/crablink-native-core/src/tv_passport_pairing.rs',
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
  'Phase 16C1 pairing request module',
  pairingRequest,
  [
    'crablink.tv.passport-pairing-request.v1',
    'tv_read_only',
    'ed25519',
    'root-signed-device-authorization',
    'pending_external_root_admin',
    'pub struct TvPassportPairingRequestV1',
    'pub fn build_tv_passport_pairing_request',
    'pub fn review_tv_passport_pairing_request',
    'pairing_request_id',
    'device_public_key_hex',
    'nonce_hex',
    'issued_at_ms',
    'expires_at_ms',
    'short_verification_code',
    'short_code_is_authority: false',
    'root_admin_authorization_required: true',
    'companion_passport_pairing_required: false',
    'authorization_present: false',
    'session_present: false',
    'TV_PASSPORT_PAIRING_TTL_MAX_MS',
    'PAIRING_TRANSCRIPT_DOMAIN',
    'blake3::hash',
  ],
);

requireFragments(
  'Phase 16C1 core export',
  coreLib,
  [
    'pub mod tv_passport_pairing;',
  ],
);

const requiredScopes = [
  'identity.read',
  'catalog.read',
  'content.read',
  'entitlement.read',
  'receipts.read',
  'confirmed_roc.read',
  'capability.revoke_self',
];

for (const scope of requiredScopes) {
  if (
    !pairingRequest.includes(
      `"${scope}"`,
    )
    || !delegatedContract.includes(
      `'${scope}'`,
    )
  ) {
    throw new Error(
      `Rust/JS delegated scope alignment is missing: ${scope}`,
    );
  }
}

const implementationOnly =
  pairingRequest.split(
    '#[cfg(test)]',
  )[0];

for (
  const [
    label,
    pattern,
  ]
  of [
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
      'private signing key',
      /\bSigningKey\b/u,
    ],
    [
      'signature creation',
      /\.sign\s*\(/u,
    ],
    [
      'capability issuance',
      /issue_capability/u,
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
      `Phase 16C1 contains forbidden ${label}.`,
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
    'Phase 16C1 added a public Passport Tauri command.',
  );
}

const expectedTvTest =
  'cargo test --manifest-path ../../crates/crablink-native-core/Cargo.toml --offline tv_passport_pairing::tests::phase16c1_';

const expectedTvCheck =
  'node ../../scripts/check-crablink-tv-native-passport-phase16c1-pairing-request-boundary.mjs';

if (
  tvPackage.scripts[
    'test:native-passport-phase16c1-pairing-request'
  ] !== expectedTvTest
) {
  throw new Error(
    'Phase 16C1 TV test script mismatch.',
  );
}

if (
  tvPackage.scripts[
    'check:native-passport-phase16c1-pairing-request'
  ] !== expectedTvCheck
) {
  throw new Error(
    'Phase 16C1 TV boundary script mismatch.',
  );
}

if (
  rootPackage.scripts[
    'tv:native-passport:phase16c1:pairing-request:test'
  ]
  !==
  'npm --prefix apps/crablink-tv run test:native-passport-phase16c1-pairing-request'
) {
  throw new Error(
    'Phase 16C1 root test script mismatch.',
  );
}

if (
  rootPackage.scripts[
    'tv:native-passport:phase16c1:pairing-request:check'
  ]
  !==
  'node scripts/check-crablink-tv-native-passport-phase16c1-pairing-request-boundary.mjs'
) {
  throw new Error(
    'Phase 16C1 root boundary script mismatch.',
  );
}

if (
  !makeCodebundle.includes(
    'check-crablink-tv-native-passport-phase16c1-pairing-request-boundary.mjs',
  )
) {
  throw new Error(
    'Phase 16C1 boundary is missing from future codebundles.',
  );
}

console.log(
  'CrabLink TV Native Passport Phase 16C1 public pairing-request boundary passed.',
);

console.log(
  'NATIVE_PASSPORT_PHASE16C1_PUBLIC_PAIRING_REQUEST=GREEN',
);

console.log(
  'PATCH_2_OF_5=OPEN',
);

console.log(
  'PHASE16C_SLICE=1',
);

console.log(
  'PAIRING_REQUEST_PUBLIC_MATERIAL_ONLY=YES',
);

console.log(
  'TV_DEVICE_CLASS=tv_read_only',
);

console.log(
  'AUTHORIZATION_MODE=root-signed-device-authorization',
);

console.log(
  'ROOT_ADMIN_AUTHORIZATION_REQUIRED=YES',
);

console.log(
  'COMPANION_PASSPORT_PAIRING_REQUIRED=NO',
);

console.log(
  'SHORT_CODE_AUTHORITY=NO',
);

console.log(
  'DETERMINISTIC_REQUEST_ID=BLAKE3_TRANSCRIPT',
);

console.log(
  'REQUEST_NONCE_BOUND=YES',
);

console.log(
  'REQUEST_EXPIRY_BOUNDED=YES',
);

console.log(
  'TV_SELF_APPROVAL=FORBIDDEN',
);

console.log(
  'PUBLIC_TAURI_COMMAND=NOT_ADDED',
);

console.log(
  'EXISTING_EIGHT_COMMAND_ALLOWLIST=PRESERVED',
);

console.log(
  'ROOT_ADMIN_AUTHORIZATION_VERIFICATION=NEXT_SLICE',
);

console.log(
  'REPLAY_CONSUMPTION=NEXT_SLICE',
);

console.log(
  'CODEBUNDLE_REGENERATED=NO',
);

console.log(
  'NEXT_PATCH=NATIVE_PASSPORT_PHASE16C2_ROOT_ADMIN_AUTHORIZATION_HANDOFF_AND_REPLAY_REVIEW',
);
