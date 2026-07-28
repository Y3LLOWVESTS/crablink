#!/usr/bin/env node
/**
 * RO:WHAT — Validates the Phase 4 platform-neutral CrabLink core boundary.
 * RO:WHY — Shared parser behavior must remain usable by desktop and TV without ambient authority.
 * RO:INTERACTS — @crablink/core package, crabUrl.js, parser tests, package scripts.
 * RO:INVARIANTS — no Chrome, Tauri, DOM, network, storage, wallet, or ledger authority.
 * RO:TEST — npm run core:boundary:check.
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
  package:
    'packages/crablink-core/package.json',
  index:
    'packages/crablink-core/src/index.js',
  parser:
    'packages/crablink-core/src/crabUrl.js',
  tests:
    'packages/crablink-core/src/crabUrl.test.mjs',
  rootPackage:
    'package.json',
};

function read(relativePath) {
  const absolutePath =
    path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(
      `Missing shared-core source: ${relativePath}`,
    );
  }

  return fs.readFileSync(
    absolutePath,
    'utf8',
  );
}

const packageJson =
  JSON.parse(read(paths.package));

const rootPackage =
  JSON.parse(read(paths.rootPackage));

const index =
  read(paths.index);

const parser =
  read(paths.parser);

const tests =
  read(paths.tests);

if (
  packageJson.name !==
  '@crablink/core'
) {
  throw new Error(
    'Shared core package identity changed.',
  );
}

if (
  packageJson.scripts?.test !==
  'node --test src/*.test.mjs'
) {
  throw new Error(
    'Shared core package test command is missing.',
  );
}

if (
  packageJson.scripts?.check !==
  'npm run test && npm run check:boundary && npm run check:route-metadata && npm run check:receipt-display'
) {
  throw new Error(
    'Shared core package acceptance command is missing.',
  );
}

if (
  rootPackage.scripts?.[
    'core:check'
  ] !==
  'npm --prefix packages/crablink-core run check'
) {
  throw new Error(
    'Root shared-core acceptance command is missing.',
  );
}

for (const marker of [
  'CRABLINK_CORE_PACKAGE',
  "from './crabUrl.js'",
  'parseCrabInput',
  'normalizeTypedAssetUrl',
  'makeCrabAssetUrl',
  'makeCrabSiteUrl',
]) {
  if (!index.includes(marker)) {
    throw new Error(
      `Shared core index is missing: ${marker}`,
    );
  }
}

for (const marker of [
  "const CRAB_PREFIX = 'crab://'",
  "const B3_PREFIX = 'b3:'",
  'export function parseCrabInput',
  'export function parseTypedAssetBody',
  'export function normalizeHash',
  'export function normalizeB3Cid',
  'export function normalizeSiteName',
  'export function makeCrabAssetUrl',
  'export function makeCrabSiteUrl',
  'export function crabImageUrlToCid',
  "module: '@crablink/core/crab-url'",
]) {
  if (!parser.includes(marker)) {
    throw new Error(
      `Shared crab URL parser is missing: ${marker}`,
    );
  }
}

for (const marker of [
  'exports the real platform-neutral core package identity',
  'normalizes raw hashes and b3 CIDs',
  'maps a raw hash to the canonical image asset route',
  'parses typed assets and removes query and fragment data',
  'recognizes caller-owned built-in routes without inventing others',
  'normalizes safe site names and fails closed on unusable input',
  'converts only image asset routes back to b3 CIDs',
]) {
  if (!tests.includes(marker)) {
    throw new Error(
      `Shared crab URL tests are missing: ${marker}`,
    );
  }
}

const productionSource =
  `${index}\n${parser}`;

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
    'browser window',
    /\bwindow\s*\./,
  ],
  [
    'DOM document',
    /\bdocument\s*\./,
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
    'network fetch',
    /\bfetch\s*\(/,
  ],
  [
    'XML HTTP request',
    /\bXMLHttpRequest\b/,
  ],
  [
    'desktop app import',
    /apps\/crablink-tauri/,
  ],
  [
    'TV app import',
    /apps\/crablink-tv/,
  ],
]) {
  if (forbidden.test(productionSource)) {
    throw new Error(
      `Forbidden shared-core ${label} found.`,
    );
  }
}

console.log(
  'CrabLink shared-core boundary passed.',
);

console.log(
  'Behavior family: crab://, b3 CID, typed asset, built-in route, and site-name parsing.',
);

console.log(
  'Authority: pure normalization only; no Chrome, Tauri, DOM, network, storage, wallet, receipt, or ledger access.',
);

console.log(
  'Consumer migration: intentionally deferred until parser tests are green.',
);
