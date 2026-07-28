#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import {
  fileURLToPath,
} from 'node:url';

const scriptDir = path.dirname(
  fileURLToPath(import.meta.url),
);

const root = path.resolve(
  scriptDir,
  '..',
);

const paths = {
  shared:
    'packages/crablink-core/src/receiptDisplay.js',
  sharedTests:
    'packages/crablink-core/src/receiptDisplay.test.mjs',
  sharedIndex:
    'packages/crablink-core/src/index.js',
  sharedPackage:
    'packages/crablink-core/package.json',
  recent:
    'apps/crablink-tauri/src/shared/receipts/recentReceipts.js',
  desktopTests:
    'apps/crablink-tauri/src/shared/receipts/receiptDisplay.shared.test.mjs',
  page:
    'apps/crablink-tauri/src/pages/receipts/ReceiptsPage.jsx',
  panel:
    'apps/crablink-tauri/src/app/shell/RecentReceiptsPanel.jsx',
  desktopPackage:
    'apps/crablink-tauri/package.json',
  rootPackage:
    'package.json',
};

function read(relativePath) {
  const absolutePath =
    path.join(
      root,
      relativePath,
    );

  if (!fs.existsSync(absolutePath)) {
    throw new Error(
      `Missing receipt display source: ${relativePath}`,
    );
  }

  return fs.readFileSync(
    absolutePath,
    'utf8',
  );
}

const shared =
  read(paths.shared);

const sharedTests =
  read(paths.sharedTests);

const sharedIndex =
  read(paths.sharedIndex);

const recent =
  read(paths.recent);

const desktopTests =
  read(paths.desktopTests);

const page =
  read(paths.page);

const panel =
  read(paths.panel);

const sharedPackage =
  JSON.parse(
    read(paths.sharedPackage),
  );

const desktopPackage =
  JSON.parse(
    read(paths.desktopPackage),
  );

const rootPackage =
  JSON.parse(
    read(paths.rootPackage),
  );

for (const fragment of [
  'export const RECEIPT_DISPLAY_FILTERS',
  'export function normalizeReceiptDisplay',
  'export function normalizeReceiptDisplayList',
  'export function filterReceiptDisplayList',
  'export function countReceiptDisplayGroups',
  'export function buildReceiptProofText',
  'export function receiptDisplayKey',
  'raw.backendDerived !== true',
  'paidEntitlementAuthority: false',
  'Object.freeze({',
]) {
  if (!shared.includes(fragment)) {
    throw new Error(
      `Shared receipt display behavior is missing: ${fragment}`,
    );
  }
}

for (const fragment of [
  'projects explicit backend receipt metadata',
  'rejects proof-shaped input unless backend origin is explicit',
  'rejects explicit backend labels without a receipt proof field',
  'sorts receipt displays newest first without mutating the caller list',
  'builds bounded proof text from allowlisted display fields only',
]) {
  if (!sharedTests.includes(fragment)) {
    throw new Error(
      `Shared receipt display test is missing: ${fragment}`,
    );
  }
}

for (const fragment of [
  "from './receiptDisplay.js'",
  'normalizeReceiptDisplay',
  'normalizeReceiptDisplayList',
  'buildReceiptProofText',
]) {
  if (!sharedIndex.includes(fragment)) {
    throw new Error(
      `Shared core receipt export is missing: ${fragment}`,
    );
  }
}

if (
  sharedPackage.exports?.[
    './receipt-display'
  ] !==
  './src/receiptDisplay.js'
) {
  throw new Error(
    'Shared package receipt-display export is missing or incorrect.',
  );
}

for (
  const [
    label,
    source,
  ] of [
    [
      'recentReceipts',
      recent,
    ],
    [
      'ReceiptsPage',
      page,
    ],
    [
      'RecentReceiptsPanel',
      panel,
    ],
  ]
) {
  if (
    !source.includes(
      'packages/crablink-core/src/index.js',
    )
  ) {
    throw new Error(
      `${label} does not consume shared receipt display behavior.`,
    );
  }
}

for (
  const [
    label,
    source,
    forbiddenFunctions,
  ] of [
    [
      'recentReceipts',
      recent,
      [
        'function formatAmount(',
        'function normalizeAction(',
        'function timestampForSort(',
        'function labelFromAction(',
      ],
    ],
    [
      'ReceiptsPage',
      page,
      [
        'function normalizeReceiptList(',
        'function filterReceipts(',
        'function buildCounts(',
        'function buildProofText(',
        'function receiptKey(',
        'function normalizeAction(',
        'function labelFromAction(',
        'function formatAmount(',
        'function timestampForSort(',
        'function formatTimestamp(',
        'function classSafe(',
      ],
    ],
    [
      'RecentReceiptsPanel',
      panel,
      [
        'function normalizeReceiptList(',
        'function filterReceipts(',
        'function buildCounts(',
        'function buildProofText(',
        'function receiptKey(',
        'function normalizeAction(',
        'function labelFromAction(',
        'function formatAmount(',
        'function timestampForSort(',
        'function formatTimestamp(',
        'function classSafe(',
      ],
    ],
  ]
) {
  for (
    const fragment of
    forbiddenFunctions
  ) {
    if (source.includes(fragment)) {
      throw new Error(
        `${label} still duplicates shared receipt display behavior: ${fragment}`,
      );
    }
  }
}

for (const fragment of [
  'desktop receipt normalization feeds the shared display projection',
  'desktop receipt display list rejects non-backend display hints',
  'desktop receipt grouping and proof text use shared behavior',
]) {
  if (!desktopTests.includes(fragment)) {
    throw new Error(
      `Desktop receipt migration test is missing: ${fragment}`,
    );
  }
}

for (
  const [
    label,
    pattern,
  ] of [
    [
      'Tauri API',
      /@tauri-apps\/api/,
    ],
    [
      'Tauri invocation',
      /\binvoke\s*\(/,
    ],
    [
      'network fetch',
      /\bfetch\s*\(/,
    ],
    [
      'DOM window',
      /\bwindow\b/,
    ],
    [
      'DOM document',
      /\bdocument\b/,
    ],
    [
      'local storage',
      /\blocalStorage\b/,
    ],
    [
      'session storage',
      /\bsessionStorage\b/,
    ],
    [
      'navigator',
      /\bnavigator\b/,
    ],
    [
      'wallet mutation',
      /\bwallet\w*\s*\(/i,
    ],
    [
      'ledger mutation',
      /\bledger\w*\s*\(/i,
    ],
  ]
) {
  if (pattern.test(shared)) {
    throw new Error(
      `Forbidden shared receipt display ${label} found.`,
    );
  }
}

for (const fragment of [
  'paidEntitlementAuthority: true',
  'displayOnly: false',
  'raw,',
  'secret:',
  'bearerToken:',
  'sessionToken:',
]) {
  if (shared.includes(fragment)) {
    throw new Error(
      `Forbidden receipt display authority or secret field found: ${fragment}`,
    );
  }
}

const coreScripts =
  sharedPackage.scripts ?? {};

const desktopScripts =
  desktopPackage.scripts ?? {};

const rootScripts =
  rootPackage.scripts ?? {};

if (
  coreScripts[
    'test:receipt-display'
  ] !==
  'node --test src/receiptDisplay.test.mjs'
) {
  throw new Error(
    'Core test:receipt-display command is missing or incorrect.',
  );
}

if (
  coreScripts[
    'check:receipt-display'
  ] !==
  'node ../../scripts/check-crablink-receipt-display-boundary.mjs'
) {
  throw new Error(
    'Core check:receipt-display command is missing or incorrect.',
  );
}

if (
  desktopScripts[
    'test:receipt-display'
  ] !==
  'node --test src/shared/receipts/receiptDisplay.shared.test.mjs'
) {
  throw new Error(
    'Desktop test:receipt-display command is missing or incorrect.',
  );
}

if (
  desktopScripts[
    'check:receipt-display-boundary'
  ] !==
  'node ../../scripts/check-crablink-receipt-display-boundary.mjs'
) {
  throw new Error(
    'Desktop receipt display boundary command is missing or incorrect.',
  );
}

if (
  rootScripts[
    'core:receipt-display:test'
  ] !==
  'npm --prefix packages/crablink-core run test:receipt-display'
) {
  throw new Error(
    'Root core:receipt-display:test command is missing or incorrect.',
  );
}

if (
  rootScripts[
    'core:desktop:receipt-display:test'
  ] !==
  'npm --prefix apps/crablink-tauri run test:receipt-display'
) {
  throw new Error(
    'Root core:desktop:receipt-display:test command is missing or incorrect.',
  );
}

console.log(
  'CrabLink shared receipt display boundary passed.',
);

console.log(
  'Shared projection accepts explicit backend-derived receipt metadata only.',
);

console.log(
  'Unknown fields and secret-shaped input are discarded from display output.',
);

console.log(
  'Desktop receipt page, drawer panel, and receipt cache normalization use shared behavior.',
);

console.log(
  'TV receipt UI remains deferred until a real backend-derived TV receipt surface exists.',
);

console.log(
  'Paid entitlement, confirmed ROC, wallet, ledger, session, and finality authority are unchanged.',
);
