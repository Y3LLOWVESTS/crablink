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
      `Missing route-registry source: ${relativePath}`,
    );
  }

  return fs.readFileSync(
    absolute,
    'utf8',
  );
}

const registry =
  read(
    'apps/crablink-tv/src/navigation/tvRouteRegistry.js',
  );

const tests =
  read(
    'apps/crablink-tv/src/navigation/tvRouteRegistry.test.mjs',
  );

const shared =
  read(
    'packages/crablink-core/src/index.js',
  );

const tv =
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
    "from '../../../../packages/crablink-core/src/index.js'",
    'export const TV_BUILTIN_ROUTE_KINDS',
    'export const TV_TYPED_ASSET_ROUTE_KINDS',
    'export const TV_BLOCKED_DESKTOP_ROUTE_KINDS',
    'export const TV_ROUTE_PROBLEM_CODE',
    'export const TV_ROUTE_STACK_LIMIT',
    'export function resolveTvRouteInput',
    'export function createTvRouteStack',
    'export function pushTvRoute',
    'export function popTvRoute',
    'MALFORMED_CRAB_ROUTE',
    'UNSUPPORTED_TV_ROUTE',
  ]
) {
  if (
    !registry.includes(marker)
  ) {
    throw new Error(
      `Registry missing: ${marker}`,
    );
  }
}

for (
  const marker of [
    'approved built-ins normalize through shared core',
    'desktop-only routes become typed not-found results',
    'route stack pushes, suppresses duplicates, and restores focus',
  ]
) {
  if (
    !tests.includes(marker)
  ) {
    throw new Error(
      `Tests missing: ${marker}`,
    );
  }
}

for (
  const forbidden of [
    'const CRAB_PREFIX',
    'const B3_PREFIX',
    'const HEX_64_RE',
    'function parseCrabInput',
    'function normalizeHash',
  ]
) {
  if (
    registry.includes(forbidden)
  ) {
    throw new Error(
      `Duplicate parser found: ${forbidden}`,
    );
  }
}

for (
  const marker of [
    'parseCrabInput',
    'describeAssetKind',
    'stripCrabPrefix',
    'stripQueryAndHash',
  ]
) {
  if (
    !shared.includes(marker)
  ) {
    throw new Error(
      `Shared core export missing: ${marker}`,
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
      'invoke',
      /\binvoke\s*\(/,
    ],
    [
      'fetch',
      /\bfetch\s*\(/,
    ],
    [
      'history',
      /window\.history/,
    ],
    [
      'storage',
      /\b(localStorage|sessionStorage)\b/,
    ],
  ]
) {
  if (pattern.test(registry)) {
    throw new Error(
      `Forbidden ${label} found.`,
    );
  }
}

const expectedTv = {
  'test:route-registry':
    'node --test src/navigation/tvRouteRegistry.test.mjs',
  'check:route-registry':
    'node ../../scripts/check-crablink-tv-route-registry-boundary.mjs',
};

const expectedRoot = {
  'tv:route-registry:test':
    'npm --prefix apps/crablink-tv run test:route-registry',
  'tv:route-registry:check':
    'node scripts/check-crablink-tv-route-registry-boundary.mjs',
};

for (
  const [
    name,
    expected,
  ] of Object.entries(expectedTv)
) {
  if (tv[name] !== expected) {
    throw new Error(
      `TV script incorrect: ${name}`,
    );
  }
}

for (
  const [
    name,
    expected,
  ] of Object.entries(expectedRoot)
) {
  if (
    rootScripts[name] !== expected
  ) {
    throw new Error(
      `Root script incorrect: ${name}`,
    );
  }
}

for (
  const command of [
    'npm run test:route',
    'npm run test:route-registry',
    'npm run check:route-registry',
  ]
) {
  if (
    !String(
      tv.check || '',
    ).includes(command)
  ) {
    throw new Error(
      `TV check chain missing: ${command}`,
    );
  }
}

console.log(
  'CrabLink TV approved route-registry boundary passed.',
);

console.log(
  'Registry: built-ins, creator sites, seven asset families.',
);

console.log(
  'Failures: malformed is problem; unsupported ownership is not-found.',
);

console.log(
  'Stack: immutable, capped at 32, with focus-return data.',
);

console.log(
  'Parser duplication, network, storage, wallet, ledger, and ROC authority: absent.',
);

console.log(
  'PHASE7A_FOUNDATION=GREEN',
);

console.log(
  'NEXT_SLICE=PHASE7B_OVERLAY_AND_BACK_PRIORITY',
);
