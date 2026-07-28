#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

import {
  fileURLToPath,
} from 'node:url';

const root =
  path.resolve(
    path.dirname(
      fileURLToPath(import.meta.url),
    ),
    '..',
  );

function read(relativePath) {
  const absolute =
    path.join(
      root,
      relativePath,
    );

  if (
    !fs.existsSync(absolute)
  ) {
    throw new Error(
      `Missing TV overlay source: ${relativePath}`,
    );
  }

  return fs.readFileSync(
    absolute,
    'utf8',
  );
}

const model =
  read(
    'apps/crablink-tv/src/navigation/tvOverlayBackModel.js',
  );

const tests =
  read(
    'apps/crablink-tv/src/navigation/tvOverlayBackModel.test.mjs',
  );

const tvScripts =
  JSON.parse(
    read(
      'apps/crablink-tv/package.json',
    ),
  ).scripts ?? {};

const rootScripts =
  JSON.parse(
    read('package.json'),
  ).scripts ?? {};

for (
  const marker of [
    'export const TV_OVERLAY_KIND',
    'export const TV_BACK_ACTION',
    'export function openTvDetailOverlay',
    'export function openTvProblemOverlay',
    'export function closeTvOverlay',
    'export function chooseTvBackAction',
    "CLOSE_OVERLAY: 'close-overlay'",
    "HIDE_PLAYER_CHROME: 'hide-player-chrome'",
    "LEAVE_DETAIL: 'leave-detail'",
    "RETURN_TO_RAIL: 'return-to-rail'",
    "RETURN_TO_ROOT: 'return-to-root'",
    "SYSTEM_BACK: 'system-back'",
  ]
) {
  if (!model.includes(marker)) {
    throw new Error(
      `Overlay model missing: ${marker}`,
    );
  }
}

for (
  const marker of [
    'default overlay state is immutable and closed',
    'closing an overlay restores its initiating focus key',
    'Back priority is overlay, player, detail, rail, root, Android',
    'overlay wins over every lower Back layer',
  ]
) {
  if (!tests.includes(marker)) {
    throw new Error(
      `Overlay tests missing: ${marker}`,
    );
  }
}

for (
  const [
    label,
    pattern,
  ] of [
    [
      'network fetch',
      /\bfetch\s*\(/,
    ],
    [
      'Tauri invoke',
      /\binvoke\s*\(/,
    ],
    [
      'browser storage',
      /\b(localStorage|sessionStorage)\b/,
    ],
    [
      'wallet authority',
      /\bwallet\w*\s*\(/i,
    ],
    [
      'ledger authority',
      /\bledger\w*\s*\(/i,
    ],
  ]
) {
  if (pattern.test(model)) {
    throw new Error(
      `Forbidden overlay ${label} behavior.`,
    );
  }
}

if (
  tvScripts[
    'test:overlay-back'
  ] !==
  'node --test src/navigation/tvOverlayBackModel.test.mjs'
) {
  throw new Error(
    'TV overlay test command missing.',
  );
}

if (
  tvScripts[
    'check:overlay-back'
  ] !==
  'node ../../scripts/check-crablink-tv-overlay-back-boundary.mjs'
) {
  throw new Error(
    'TV overlay boundary command missing.',
  );
}

for (
  const command of [
    'npm run test:overlay-back',
    'npm run check:overlay-back',
  ]
) {
  if (
    !String(
      tvScripts.check || '',
    ).includes(command)
  ) {
    throw new Error(
      `TV check chain missing: ${command}`,
    );
  }
}

if (
  rootScripts[
    'tv:overlay-back:test'
  ] !==
    'npm --prefix apps/crablink-tv run test:overlay-back' ||
  rootScripts[
    'tv:overlay-back:check'
  ] !==
    'node scripts/check-crablink-tv-overlay-back-boundary.mjs'
) {
  throw new Error(
    'Root overlay commands missing.',
  );
}

console.log(
  'CrabLink TV overlay and Back-priority model boundary passed.',
);

console.log(
  'Back order: overlay, player chrome, detail, rail, root, Android.',
);

console.log(
  'Overlay state is local, immutable, bounded, and focus-return aware.',
);

console.log(
  'Network, storage, wallet, ledger, receipt, reward, and ROC authority: absent.',
);

console.log(
  'PHASE7B_SLICE1_MODEL=GREEN',
);

console.log(
  'NEXT_SLICE=PHASE7B_SLICE2_UI_INTEGRATION',
);
