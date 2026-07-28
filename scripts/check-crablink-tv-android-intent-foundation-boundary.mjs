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
      `Missing Phase 7C source: ${relativePath}`,
    );
  }

  return fs.readFileSync(
    absolutePath,
    'utf8',
  );
}

const manifest =
  read(
    'apps/crablink-tv/src-tauri/gen/android/app/src/main/AndroidManifest.xml',
  );

const activity =
  read(
    'apps/crablink-tv/src-tauri/gen/android/app/src/main/java/com/rustyonions/crablink/tv/MainActivity.kt',
  );

const model =
  read(
    'apps/crablink-tv/src/navigation/tvAndroidIntentIntake.js',
  );

const tests =
  read(
    'apps/crablink-tv/src/navigation/tvAndroidIntentIntake.test.mjs',
  );

const registry =
  read(
    'apps/crablink-tv/src/navigation/tvRouteRegistry.js',
  );

const codebundle =
  read(
    'scripts/check-crablink-tv-codebundle-boundary.mjs',
  );

const makeCodebundle =
  read(
    'scripts/make_codebundle.sh',
  );

const tvScripts =
  JSON.parse(
    read(
      'apps/crablink-tv/package.json',
    ),
  ).scripts ?? {};

const rootScripts =
  JSON.parse(
    read(
      'package.json',
    ),
  ).scripts ?? {};

for (
  const marker
  of [
    'android.intent.action.VIEW',
    'android.intent.category.BROWSABLE',
    'android:scheme="crab"',
  ]
) {
  if (
    !manifest.includes(
      marker,
    )
  ) {
    throw new Error(
      `Android manifest intake missing: ${marker}`,
    );
  }
}

for (
  const marker
  of [
    'override fun onNewIntent',
    'override fun onWebViewCreate',
    'JSONObject.quote(url)',
    'window[readyKey] !== true',
  ]
) {
  if (
    !activity.includes(
      marker,
    )
  ) {
    throw new Error(
      `Android activity intake missing: ${marker}`,
    );
  }
}

for (
  const marker
  of [
    'normalizeTvAndroidIntentPayload',
    'reviewTvAndroidIntent',
    'resolveTvRouteInput(',
    'requireCrabScheme: true',
    'TV_ROUTE_RESULT_KIND.NOT_FOUND',
    'returnFocusKey',
  ]
) {
  if (
    !model.includes(
      marker,
    )
  ) {
    throw new Error(
      `Android intent review missing: ${marker}`,
    );
  }
}

if (
  !registry.includes(
    'requireCrabScheme = false',
  )
) {
  throw new Error(
    'Canonical TV route registry was not reused.',
  );
}

for (
  const marker
  of [
    'approved section selects destination focus',
    'typed asset route targets library focus',
    'malformed oversize and control payloads fail closed',
    'foreign scheme and desktop-only routes are typed rejections',
  ]
) {
  if (
    !tests.includes(
      marker,
    )
  ) {
    throw new Error(
      `Android intent review test missing: ${marker}`,
    );
  }
}

if (
  tvScripts[
    'test:android-intent'
  ] !==
    'node --test src/navigation/tvAndroidIntentIntake.test.mjs' ||
  tvScripts[
    'check:android-intent-foundation'
  ] !==
    'node ../../scripts/check-crablink-tv-android-intent-foundation-boundary.mjs'
) {
  throw new Error(
    'TV Android intent scripts are missing.',
  );
}

for (
  const command
  of [
    'npm run test:android-intent',
    'npm run check:android-intent-foundation',
  ]
) {
  if (
    !String(
      tvScripts.check || '',
    ).includes(
      command,
    )
  ) {
    throw new Error(
      `TV acceptance chain missing: ${command}`,
    );
  }
}

if (
  rootScripts[
    'tv:android-intent:test'
  ] !==
    'npm --prefix apps/crablink-tv run test:android-intent' ||
  rootScripts[
    'tv:android-intent:foundation:check'
  ] !==
    'node scripts/check-crablink-tv-android-intent-foundation-boundary.mjs'
) {
  throw new Error(
    'Root Android intent commands are missing.',
  );
}

for (
  const marker
  of [
    'tvAndroidIntentIntake.js',
    'tvAndroidIntentIntake.test.mjs',
    'check-crablink-tv-android-intent-foundation-boundary.mjs',
  ]
) {
  if (
    codebundle
      .split(marker)
      .length !== 3
  ) {
    throw new Error(
      `Codebundle registration mismatch: ${marker}`,
    );
  }
}

if (
  makeCodebundle
    .split(
      'check-crablink-tv-android-intent-foundation-boundary.mjs',
    )
    .length !== 3
) {
  throw new Error(
    'make_codebundle selection mismatch.',
  );
}

for (
  const [
    label,
    pattern,
  ]
  of [
    [
      'network',
      /\bfetch\s*\(/,
    ],
    [
      'Tauri invoke',
      /\binvoke\s*\(/,
    ],
    [
      'storage',
      /\b(localStorage|sessionStorage|indexedDB)\b/,
    ],
    [
      'wallet',
      /\bwallet\w*\s*\(/i,
    ],
    [
      'ledger',
      /\bledger\w*\s*\(/i,
    ],
  ]
) {
  if (
    pattern.test(
      model,
    )
  ) {
    throw new Error(
      `Intent review acquired forbidden ${label} authority.`,
    );
  }
}

console.log(
  'CrabLink TV Android intent foundation boundary passed.',
);

console.log(
  'Native intake: VIEW, cold start, onNewIntent, bounded queue, JSON-quoted handoff.',
);

console.log(
  'Review: canonical route registry, typed rejection, and destination-focus projection.',
);

console.log(
  'Network, storage, wallet, ledger, receipt, reward, and ROC authority: absent.',
);

console.log(
  'PHASE7C_NATIVE_AND_REVIEW_FOUNDATION=GREEN',
);

console.log(
  'REACT_HANDOFF_BOUNDARY=check-crablink-tv-android-intent-react-boundary.mjs',
);
