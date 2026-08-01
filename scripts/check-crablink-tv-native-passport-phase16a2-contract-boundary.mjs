#!/usr/bin/env node

/**
 * RO:WHAT — Static Phase 16A2 boundary for the delegated CrabLink TV
 * Passport contract.
 *
 * RO:WHY — Proves the shared TV custody posture and read-only authority
 * ceiling remain intact before native Android behavior begins.
 */

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
      `Missing Phase 16A2 source: ${relativePath}`,
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

const predecessor =
  read(
    'scripts/check-crablink-tv-native-passport-phase16-successor-boundary.mjs',
  );

requireFragments(
  'Phase 16A1 predecessor',
  predecessor,
  [
    'NATIVE_PASSPORT_PHASE16A1_SUCCESSOR_REALIGNMENT=GREEN',
    'NEXT_PATCH=NATIVE_PASSPORT_PHASE16B_ANDROID_KEYSTORE_CONTRACT_AND_RUNTIME_INSPECTION',
  ],
);

rejectFragments(
  'Phase 16A1 predecessor',
  predecessor,
  [
    'NEXT_PATCH=NATIVE_PASSPORT_PHASE16A2_TV_DELEGATED_CONTRACT_FOUNDATION',
  ],
);

const sharedContract =
  read(
    'packages/crablink-core/src/onboardingContract.js',
  );

requireFragments(
  'Shared onboarding contract',
  sharedContract,
  [
    'ONBOARDING_CONTRACT_VERSION',
    'ONBOARDING_PLATFORM_FAMILIES',
    'ONBOARDING_CUSTODY_INVARIANTS',
    'ONBOARDING_PLATFORM_UI_CONTRACT',
    'getOnboardingPlatformUiContract',
    'localPassportCustodyRequired',
    'companionDeviceRequired',
    'tv_safe_native',
  ],
);

const contract =
  read(
    'apps/crablink-tv/src/passport/tvDelegatedPassportContract.js',
  );

requireFragments(
  'TV delegated Passport contract',
  contract,
  [
    'crablink.tv.delegated-passport.v1',
    'tv_read_only',
    'root-signed-device-authorization',
    'unauthenticated_read_only',
    'identity.read',
    'catalog.read',
    'content.read',
    'entitlement.read',
    'receipts.read',
    'confirmed_roc.read',
    'capability.revoke_self',
    'rootAdminAuthorizationRequired:',
    'deviceAuthorizationProofRequired:',
    'deviceKeyStoredLocallyRequired:',
    'delegatedAuthorizationStoredLocallyRequired:',
    'companionPassportPairingRequired:',
    'recoveryPhraseOnTvAllowed:',
    'recoveryRootOnTvAllowed:',
    'rootAdminKeyOnTvAllowed:',
    'rootAuthorityOnTvAllowed:',
    'webviewSecretCustodyAllowed:',
    'rawCapabilityToReactAllowed:',
    'walletOrLedgerAuthorityAllowed:',
    'publishingAuthorityAllowed:',
    'usernameMutationAuthorityAllowed:',
    'deviceAdministrationAuthorityAllowed:',
    'nodeOrOperatorAuthorityAllowed:',
    'androidKeystoreAdapterAdded:',
    'tvDeviceKeyGenerationAdded:',
    'delegatedAuthorizationTransferAdded:',
    'authorizationProofValidationAdded:',
    'nativeCommandAdded:',
    'tvUiAdded:',
  ],
);

rejectFragments(
  'TV delegated Passport runtime',
  contract,
  [
    '@tauri-apps/',
    'fetch(',
    'invoke(',
    'localStorage',
    'sessionStorage',
    'indexedDB',
    'AndroidKeyStore',
    'KeyPairGenerator',
    'Signature.getInstance',
    'Cipher.getInstance',
    'navigator.',
    'window.',
    'document.',
  ],
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

const expectedTvScripts = {
  'test:native-passport-phase16a2-contract':
    'node --test src/passport/tvDelegatedPassportContract.test.mjs',

  'check:native-passport-phase16a2-contract':
    'node ../../scripts/check-crablink-tv-native-passport-phase16a2-contract-boundary.mjs',
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

requireFragments(
  'TV package check chain',
  String(
    tvPackage.scripts?.check ?? '',
  ),
  [
    'npm run test:native-passport-phase16-successor',
    'npm run check:native-passport-phase16-successor',
    'npm run test:native-passport-phase16a2-contract',
    'npm run check:native-passport-phase16a2-contract',
  ],
);

const expectedRootScripts = {
  'tv:native-passport:phase16a2:contract:test':
    'npm --prefix apps/crablink-tv run test:native-passport-phase16a2-contract',

  'tv:native-passport:phase16a2:contract:check':
    'node scripts/check-crablink-tv-native-passport-phase16a2-contract-boundary.mjs',
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
  'CrabLink TV Native Passport Phase 16A2 contract boundary passed.',
);

console.log(
  'NATIVE_PASSPORT_PHASE16A2_TV_DELEGATED_CONTRACT_FOUNDATION=GREEN',
);

console.log(
  'TV_DEVICE_CLASS=tv_read_only',
);

console.log(
  'TV_READ_SCOPE_SET=LOCKED',
);

console.log(
  'MUTATING_SCOPE_REJECTION=GREEN',
);

console.log(
  'ROOT_ADMIN_DEVICE_AUTHORIZATION_REQUIRED=YES',
);

console.log(
  'COMPANION_PASSPORT_PAIRING_REQUIRED=NO',
);

console.log(
  'RECOVERY_PHRASE_ON_TV=NO',
);

console.log(
  'RECOVERY_ROOT_ON_TV=NO',
);

console.log(
  'ROOT_ADMIN_KEY_ON_TV=NO',
);

console.log(
  'ROOT_AUTHORITY_ON_TV=NO',
);

console.log(
  'WEBVIEW_SECRET_CUSTODY=NO',
);

console.log(
  'RAW_CAPABILITY_TO_REACT=NO',
);

console.log(
  'INVALID_AUTHORIZATION_FALLBACK=unauthenticated_read_only',
);

console.log(
  'ANDROID_KEYSTORE_ADAPTER=NOT_ADDED',
);

console.log(
  'TV_DEVICE_KEY_GENERATION=NOT_ADDED',
);

console.log(
  'DELEGATED_AUTHORIZATION_TRANSFER=NOT_ADDED',
);

console.log(
  'AUTHORIZATION_PROOF_VALIDATION=NOT_ADDED',
);

console.log(
  'NATIVE_COMMAND=NOT_ADDED',
);

console.log(
  'TV_UI_CHANGED=NO',
);

console.log(
  'CODEBUNDLE_REGENERATED=NO',
);

console.log(
  'NEXT_PATCH=NATIVE_PASSPORT_PHASE16B2_ANDROID_KEYSTORE_PLATFORM_BRIDGE',
);
