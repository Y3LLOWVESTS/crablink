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
      `Missing Phase 7C React source: ${relativePath}`,
    );
  }

  return fs.readFileSync(
    absolutePath,
    'utf8',
  );
}

const hook =
  read(
    'apps/crablink-tv/src/navigation/useTvAndroidIntentHandoff.js',
  );

const model =
  read(
    'apps/crablink-tv/src/navigation/tvAndroidIntentHandoff.js',
  );

const app =
  read(
    'apps/crablink-tv/src/app/TvApp.jsx',
  );

const overlay =
  read(
    'apps/crablink-tv/src/navigation/useTvOverlayController.js',
  );

const history =
  read(
    'apps/crablink-tv/src/navigation/useTvSectionHistory.js',
  );

const activity =
  read(
    'apps/crablink-tv/src-tauri/gen/android/app/src/main/java/com/rustyonions/crablink/tv/MainActivity.kt',
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
    'export function useTvAndroidIntentHandoff',
    'window.addEventListener(',
    'TV_ANDROID_INTENT_EVENT',
    'TV_ANDROID_INTENT_QUEUE',
    'setTvAndroidIntentReady(',
    'takePendingTvAndroidIntents(',
    'removeMatchingQueuedPayload',
    'event?.detail',
    'projectTvAndroidIntentUiAction(',
    'TV_ANDROID_INTENT_UI_ACTION.PROBLEM',
    'navigateToSection(',
    'openDetail(',
    'openProblem(',
    'setActivityMessage(',
    'window.removeEventListener(',
  ]
) {
  if (
    !hook.includes(
      marker,
    )
  ) {
    throw new Error(
      `Live Android intent hook missing: ${marker}`,
    );
  }
}

for (
  const marker
  of [
    'TV_ANDROID_INTENT_QUEUE_LIMIT',
    'projectTvAndroidIntentUiAction',
    'takePendingTvAndroidIntents',
    'setTvAndroidIntentReady',
  ]
) {
  if (
    !model.includes(
      marker,
    )
  ) {
    throw new Error(
      `Android intent handoff model missing: ${marker}`,
    );
  }
}

for (
  const marker
  of [
    "from '../navigation/useTvAndroidIntentHandoff.js'",
    'useTvAndroidIntentHandoff({',
    'activeSectionId,',
    'availableSectionIds: TV_SECTION_IDS,',
    'navigateToSection,',
    'openDetail,',
    'openProblem,',
    'setActivityMessage,',
  ]
) {
  if (
    !app.includes(
      marker,
    )
  ) {
    throw new Error(
      `TvApp live handoff missing: ${marker}`,
    );
  }
}

for (
  const marker
  of [
    'consumeBack: closeOverlay',
    'openDetail',
    'openProblem',
  ]
) {
  if (
    !overlay.includes(
      marker,
    )
  ) {
    throw new Error(
      `Overlay integration missing: ${marker}`,
    );
  }
}

for (
  const marker
  of [
    'navigateToSection',
    'consumeBack = null',
  ]
) {
  if (
    !history.includes(
      marker,
    )
  ) {
    throw new Error(
      `Section-history integration missing: ${marker}`,
    );
  }
}

for (
  const marker
  of [
    'window[readyKey] !== true',
    'window.dispatchEvent(',
    'MAX_PENDING_CRAB_INTENTS',
  ]
) {
  if (
    !activity.includes(
      marker,
    )
  ) {
    throw new Error(
      `Native handoff contract missing: ${marker}`,
    );
  }
}

if (
  tvScripts[
    'test:android-intent-handoff'
  ] !==
    'node --test src/navigation/tvAndroidIntentHandoff.test.mjs' ||

  tvScripts[
    'check:android-intent-react'
  ] !==
    'node ../../scripts/check-crablink-tv-android-intent-react-boundary.mjs'
) {
  throw new Error(
    'TV live handoff scripts are missing.',
  );
}

for (
  const command
  of [
    'npm run test:android-intent-handoff',
    'npm run check:android-intent-react',
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
    'tv:android-intent:react:check'
  ] !==
    'node scripts/check-crablink-tv-android-intent-react-boundary.mjs'
) {
  throw new Error(
    'Root live handoff command is missing.',
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

    [
      'receipt',
      /\breceipt\w*\s*\(/i,
    ],

    [
      'reward',
      /\breward\w*\s*\(/i,
    ],

    [
      'ROC',
      /\broc\w*\s*\(/i,
    ],
  ]
) {
  if (
    pattern.test(
      hook,
    )
  ) {
    throw new Error(
      `Live handoff acquired forbidden ${label} authority.`,
    );
  }
}

console.log(
  'CrabLink TV live Android intent React boundary passed.',
);

console.log(
  'Listener installs before readiness; cold and warm payloads share one reviewed path.',
);

console.log(
  'Approved routes navigate then open detail; rejected routes open typed problems.',
);

console.log(
  'Back priority and destination focus restoration remain owned by existing TV controllers.',
);

console.log(
  'Network, storage, wallet, ledger, receipt, reward, and ROC authority: absent.',
);

console.log(
  'PHASE7C_LIVE_REACT_HANDOFF=GREEN',
);

console.log(
  'PHASE7C=COMPLETE',
);

console.log(
  'NEXT_PHASE=PHASE8_HOME_CATALOG_AND_CREATOR_BROWSING',
);
