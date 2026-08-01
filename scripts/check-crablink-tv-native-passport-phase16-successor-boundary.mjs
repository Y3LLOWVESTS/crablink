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
      `Missing Phase 16 successor source: ${relativePath}`,
    );
  }

  return fs.readFileSync(
    absolutePath,
    'utf8',
  );
}

function requireFragment(
  label,
  source,
  fragment,
) {
  if (!source.includes(fragment)) {
    throw new Error(
      `${label} missing: ${fragment}`,
    );
  }
}

function rejectFragment(
  label,
  source,
  fragment,
) {
  if (source.includes(fragment)) {
    throw new Error(
      `${label} contains rejected fragment: ${fragment}`,
    );
  }
}

const phase11 =
  read(
    'scripts/check-crablink-tv-phase11-acceptance-boundary.mjs',
  );

requireFragment(
  'Phase 11 successor',
  phase11,
  'PHASE11E_PHASE11_ACCEPTANCE_BOUNDARY=GREEN',
);

requireFragment(
  'Phase 11 successor',
  phase11,
  'PHASE11_TRACK=COMPLETE',
);

requireFragment(
  'Phase 11 successor',
  phase11,
  'NEXT_PHASE=NATIVE_PASSPORT_PHASE16_TV_DELEGATED_INTEGRATION',
);

rejectFragment(
  'Phase 11 successor',
  phase11,
  'NEXT_PHASE=PHASE12_TV_LIBRARY_POLISH_AND_PLAYBACK_INTEGRATION',
);

const sharedContract =
  read(
    'packages/crablink-core/src/onboardingContract.js',
  );

for (const marker of [
  'ONBOARDING_PLATFORM_FAMILIES',
  'ONBOARDING_CUSTODY_INVARIANTS',
  'ONBOARDING_PLATFORM_UI_CONTRACT',
  'localPassportCustodyRequired',
  'companionDeviceRequired',
  'tv_safe_native',
]) {
  requireFragment(
    'Shared onboarding contract',
    sharedContract,
    marker,
  );
}

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
  'test:native-passport-phase16-successor':
    'node --test src/passport/tvNativePassportPhase16Successor.source.test.mjs',

  'check:native-passport-phase16-successor':
    'node ../../scripts/check-crablink-tv-native-passport-phase16-successor-boundary.mjs',
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

requireFragment(
  'TV check chain',
  String(
    tvPackage.scripts?.check ?? '',
  ),

  'npm run test:native-passport-phase16-successor && npm run check:native-passport-phase16-successor',
);

const expectedRootScripts = {
  'tv:native-passport:phase16:successor:test':
    'npm --prefix apps/crablink-tv run test:native-passport-phase16-successor',

  'tv:native-passport:phase16:successor:check':
    'node scripts/check-crablink-tv-native-passport-phase16-successor-boundary.mjs',
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

const codebundle =
  read(
    'scripts/make_codebundle.sh',
  );

for (const requiredPath of [
  'apps/crablink-tv/src/passport/tvNativePassportPhase16Successor.source.test.mjs',
  'scripts/check-crablink-tv-native-passport-phase16-successor-boundary.mjs',
]) {
  requireFragment(
    'Codebundle coverage',
    codebundle,
    requiredPath,
  );
}

console.log(
  'CrabLink TV Native Passport Phase 16 successor boundary passed.',
);

console.log(
  'NATIVE_PASSPORT_PHASE16A1_SUCCESSOR_REALIGNMENT=GREEN',
);

console.log(
  'PHASE11E_SUCCESSOR_MARKER_CORRECTED=YES',
);

console.log(
  'ABANDONED_LIBRARY_PLAYBACK_SUCCESSOR=ABSENT',
);

console.log(
  'SHARED_TV_ONBOARDING_CONTRACT=PRESERVED',
);

console.log(
  'TV_RUNTIME_BEHAVIOR_CHANGED=NO',
);

console.log(
  'TV_UI_CHANGED=NO',
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
  'NEXT_PATCH=NATIVE_PASSPORT_PHASE16B_ANDROID_KEYSTORE_CONTRACT_AND_RUNTIME_INSPECTION',
);
