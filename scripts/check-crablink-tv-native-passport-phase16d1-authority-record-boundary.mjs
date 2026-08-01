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
      `Missing Phase 16D1 source: ${relativePath}`,
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

const authority =
  read(
    'apps/crablink-tv/src-tauri/src/passport_tv_delegated_authority.rs',
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
  'Phase 16D1 authority record',
  authority,
  [
    'crablink.tv.delegated-authority-record.v1',
    'crablink.tv.delegated-authority-review.v1',
    'tv_read_only',
    'root-signed-device-authorization',
    'device-bound',
    'ed25519',
    'authorized_locked',
    'revoked',
    'expired',
    'identity.read',
    'catalog.read',
    'content.read',
    'entitlement.read',
    'receipts.read',
    'confirmed_roc.read',
    'capability.revoke_self',
    'deny_unknown_fields',
    'review_stored_tv_delegated_authority_record',
    'authorization_material_sealed',
    'capability_material_sealed',
    'raw_authorization_returned',
    'raw_capability_returned',
    'webview_secret_returned',
    'recovery_root_present',
    'root_admin_key_present',
    'session_present',
    'operationally_unlocked',
    'phase16d1_accepts_exact_bound_authority_as_locked',
    'phase16d1_revoked_and_expired_records_fail_closed',
    'phase16d1_rejects_passport_device_and_identifier_mismatch',
    'phase16d1_rejects_scope_expansion_duplicates_and_reordering',
    'phase16d1_redacted_review_exposes_no_raw_authority_material',
  ],
);

requireFragments(
  'Phase 16D1 module registration',
  tvLib,
  [
    '#[cfg(any(test, target_os = "android"))]',
    'mod passport_tv_delegated_authority;',
  ],
);

const production =
  authority.split(
    '#[cfg(test)]',
  )[0];

rejectFragments(
  'Phase 16D1 production authority expansion',
  production,
  [
    'wallet.spend',
    'wallet.transfer',
    'content.publish',
    'ledger.write',
    'node.control',
    'operator.admin',
    'capability.delegate_unbounded',
    'bridge.settle',
    'staking.open',
    'issue_capability',
    'create_session',
    'approve_pairing',
    'sign_root_authorization',
    'root_private_key',
    'recovery_phrase',
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
    'Phase 16D1 added a public Passport command.',
  );
}

const expectedTvTest =
  'cargo test --manifest-path src-tauri/Cargo.toml --offline phase16d1_';

const expectedTvCheck =
  'node ../../scripts/check-crablink-tv-native-passport-phase16d1-authority-record-boundary.mjs';

if (
  tvPackage.scripts[
    'test:native-passport-phase16d1-authority-record'
  ] !== expectedTvTest
) {
  throw new Error(
    'Phase 16D1 TV test script mismatch.',
  );
}

if (
  tvPackage.scripts[
    'check:native-passport-phase16d1-authority-record'
  ] !== expectedTvCheck
) {
  throw new Error(
    'Phase 16D1 TV boundary script mismatch.',
  );
}

if (
  rootPackage.scripts[
    'tv:native-passport:phase16d1:authority-record:test'
  ]
  !==
  'npm --prefix apps/crablink-tv run test:native-passport-phase16d1-authority-record'
) {
  throw new Error(
    'Phase 16D1 root test script mismatch.',
  );
}

if (
  rootPackage.scripts[
    'tv:native-passport:phase16d1:authority-record:check'
  ]
  !==
  'node scripts/check-crablink-tv-native-passport-phase16d1-authority-record-boundary.mjs'
) {
  throw new Error(
    'Phase 16D1 root check script mismatch.',
  );
}

if (
  !makeCodebundle.includes(
    'check-crablink-tv-native-passport-phase16d1-authority-record-boundary.mjs',
  )
) {
  throw new Error(
    'Phase 16D1 boundary is absent from future codebundles.',
  );
}

console.log(
  'CrabLink TV Native Passport Phase 16D1 authority-record boundary passed.',
);

console.log(
  'NATIVE_PASSPORT_PHASE16D1_AUTHORITY_RECORD=GREEN',
);

console.log(
  'PATCH_3_OF_5=OPEN',
);

console.log(
  'PHASE16D_SLICE=1',
);

console.log(
  'DELEGATED_AUTHORITY_PUBLIC_RECORD_REVIEW=ADDED',
);

console.log(
  'DEVICE_CLASS=tv_read_only',
);

console.log(
  'AUTHORIZATION_MODE=root-signed-device-authorization',
);

console.log(
  'CAPABILITY_BINDING=device-bound',
);

console.log(
  'PROOF_KEY_ALGORITHM=ed25519',
);

console.log(
  'PASSPORT_BINDING=REQUIRED',
);

console.log(
  'DEVICE_KEY_BINDING=REQUIRED',
);

console.log(
  'EXACT_READ_SCOPE_ALLOWLIST=REQUIRED',
);

console.log(
  'REVOCATION_POSTURE=FAIL_CLOSED',
);

console.log(
  'EXPIRY_POSTURE=FAIL_CLOSED',
);

console.log(
  'DEFAULT_ACCEPTED_STATE=authorized_locked',
);

console.log(
  'RAW_AUTHORIZATION_RETURNED=NO',
);

console.log(
  'RAW_CAPABILITY_RETURNED=NO',
);

console.log(
  'SESSION_CREATED=NO',
);

console.log(
  'OPERATIONAL_UNLOCK=NOT_ADDED',
);

console.log(
  'AUTHORIZATION_SIGNATURE_VERIFICATION=OWNED_BY_EXISTING_NATIVE_CORE_HANDOFF',
);

console.log(
  'BACKEND_CAPABILITY_ACCEPTANCE=NOT_CLAIMED',
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
  'NEXT_PATCH=NATIVE_PASSPORT_PHASE16D2_SEALED_AUTHORIZATION_AND_CAPABILITY_STORE',
);
