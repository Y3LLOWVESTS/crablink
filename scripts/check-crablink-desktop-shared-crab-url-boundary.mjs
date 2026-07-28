#!/usr/bin/env node
/**
 * RO:WHAT — Validates desktop migration to the shared CrabLink URL parser.
 * RO:WHY — Desktop consumers must use shared behavior without a risky broad import rewrite.
 * RO:INTERACTS — desktop compatibility shim, three current consumers, @crablink/core, package scripts.
 * RO:INVARIANTS — one parser implementation; compatibility re-export only.
 * RO:SECURITY — migration adds no Chrome, Tauri, DOM, network, storage, wallet, receipt, or ledger authority.
 * RO:TEST — npm run core:desktop:boundary:check.
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  fileURLToPath,
} from 'node:url';

const root = path.resolve(
  path.dirname(
    fileURLToPath(import.meta.url),
  ),
  '..',
);

const paths = {
  shim:
    'apps/crablink-tauri/src/shared/utils/crabUrl.js',
  tests:
    'apps/crablink-tauri/src/shared/utils/crabUrl.shared.test.mjs',
  contentClient:
    'apps/crablink-tauri/src/shared/api/contentViewClient.js',
  siteClient:
    'apps/crablink-tauri/src/shared/api/siteClient.js',
  siteVisitClient:
    'apps/crablink-tauri/src/shared/api/siteVisitClient.js',
  sharedIndex:
    'packages/crablink-core/src/index.js',
  sharedParser:
    'packages/crablink-core/src/crabUrl.js',
  desktopPackage:
    'apps/crablink-tauri/package.json',
  rootPackage:
    'package.json',
};

function read(relativePath) {
  const absolutePath =
    path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(
      `Missing desktop shared-parser source: ${relativePath}`,
    );
  }

  return fs.readFileSync(
    absolutePath,
    'utf8',
  );
}

const shim = read(paths.shim);
const tests = read(paths.tests);
const sharedIndex =
  read(paths.sharedIndex);
const sharedParser =
  read(paths.sharedParser);

const consumers = [
  [
    paths.contentClient,
    read(paths.contentClient),
  ],
  [
    paths.siteClient,
    read(paths.siteClient),
  ],
  [
    paths.siteVisitClient,
    read(paths.siteVisitClient),
  ],
];

const desktopPackage =
  JSON.parse(
    read(paths.desktopPackage),
  );

const rootPackage =
  JSON.parse(
    read(paths.rootPackage),
  );

for (const marker of [
  "from '../../../../../packages/crablink-core/src/index.js'",
  'parseCrabInput',
  'normalizeSiteName',
  'makeCrabAssetUrl',
  'crabImageUrlToCid',
]) {
  if (!shim.includes(marker)) {
    throw new Error(
      `Desktop compatibility shim is missing: ${marker}`,
    );
  }
}

for (const forbidden of [
  "const CRAB_PREFIX",
  "const B3_PREFIX",
  "const HEX_64_RE",
  "const TYPED_ASSET_RE",
  "export function",
  "function parseCrabInput",
  "function normalizeSiteName",
]) {
  if (shim.includes(forbidden)) {
    throw new Error(
      `Desktop parser rule duplication remains: ${forbidden}`,
    );
  }
}

for (const [
  consumerPath,
  source,
] of consumers) {
  if (
    !source.includes(
      "from '../utils/crabUrl.js'",
    )
  ) {
    throw new Error(
      `Desktop consumer left the reviewed compatibility path: ${consumerPath}`,
    );
  }
}

for (const marker of [
  "CRABLINK_CORE_PACKAGE",
  "from './crabUrl.js'",
]) {
  if (!sharedIndex.includes(marker)) {
    throw new Error(
      `Shared core index is missing: ${marker}`,
    );
  }
}

for (const marker of [
  'export function parseCrabInput',
  'export function normalizeSiteName',
  'export function makeCrabAssetUrl',
  'export function crabImageUrlToCid',
]) {
  if (!sharedParser.includes(marker)) {
    throw new Error(
      `Shared parser implementation is missing: ${marker}`,
    );
  }
}

for (const marker of [
  'desktop compatibility surface delegates every parser export',
  'desktop parser identity now reports the shared core module',
  'desktop raw-hash parsing uses the shared canonical asset model',
  'desktop site and typed-asset helpers retain compatible output',
  'desktop compatibility parser still fails closed on invalid input',
]) {
  if (!tests.includes(marker)) {
    throw new Error(
      `Desktop migration tests are missing: ${marker}`,
    );
  }
}

const expectedDesktopScripts = {
  'test:shared-crab-url':
    'node --test src/shared/utils/crabUrl.shared.test.mjs',
  'check:shared-crab-url-boundary':
    'node ../../scripts/check-crablink-desktop-shared-crab-url-boundary.mjs',
  'check:shared-crab-url':
    'npm run test:shared-crab-url && npm run check:shared-crab-url-boundary',
};

for (const [
  scriptName,
  expected,
] of Object.entries(
  expectedDesktopScripts,
)) {
  if (
    desktopPackage.scripts?.[
      scriptName
    ] !== expected
  ) {
    throw new Error(
      `Desktop package script changed: ${scriptName}`,
    );
  }
}

if (
  !desktopPackage.scripts?.check
    ?.startsWith(
      'npm run check:shared-crab-url && ',
    )
) {
  throw new Error(
    'Desktop standard acceptance does not include the shared-parser migration.',
  );
}

const expectedRootScripts = {
  'core:desktop:test':
    'npm --prefix apps/crablink-tauri run test:shared-crab-url',
  'core:desktop:boundary:check':
    'node scripts/check-crablink-desktop-shared-crab-url-boundary.mjs',
  'core:desktop:check':
    'npm --prefix apps/crablink-tauri run check:shared-crab-url',
};

for (const [
  scriptName,
  expected,
] of Object.entries(
  expectedRootScripts,
)) {
  if (
    rootPackage.scripts?.[
      scriptName
    ] !== expected
  ) {
    throw new Error(
      `Root package script changed: ${scriptName}`,
    );
  }
}

for (const [
  label,
  forbidden,
] of [
  [
    'Chrome API',
    /\bchrome\s*\./,
  ],
  [
    'Tauri API',
    /@tauri-apps\/api/,
  ],
  [
    'Tauri invocation',
    /\binvoke\s*\(/,
  ],
  [
    'DOM document',
    /\bdocument\s*\./,
  ],
  [
    'browser window',
    /\bwindow\s*\./,
  ],
  [
    'network fetch',
    /\bfetch\s*\(/,
  ],
  [
    'local storage',
    /\blocalStorage\b/,
  ],
  [
    'session storage',
    /\bsessionStorage\b/,
  ],
]) {
  if (forbidden.test(shim)) {
    throw new Error(
      `Forbidden desktop parser-shim ${label} found.`,
    );
  }
}

console.log(
  'CrabLink desktop shared-parser migration boundary passed.',
);

console.log(
  'Implementation: @crablink/core is the only crab:// parser rule owner.',
);

console.log(
  'Compatibility: three existing desktop consumers retain their reviewed local import path.',
);

console.log(
  'Authority: re-export only; no Chrome, Tauri, DOM, network, storage, wallet, receipt, ROC, or ledger access.',
);
