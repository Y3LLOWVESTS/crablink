#!/usr/bin/env node
/**
 * RO:WHAT — Validates the CrabLink TV Phase 9E asset-manifest frontend adapter.
 * RO:WHY — React needs a narrow adapter to call the fixed native integrity command before rendering.
 * RO:INTERACTS — tauriTvAdapter.js, tv_asset_manifest_check, Phase 9D command boundary, and TV package scripts.
 * RO:INVARIANTS — fixed command only; caller supplies one request object; no provider URL/path/command authority.
 * RO:SECURITY — no fetch, storage, cache, wallet, ledger, receipt, reward, ROC, entitlement, or finality authority.
 * RO:TEST — node scripts/check-crablink-tv-asset-manifest-adapter-boundary.mjs.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root =
  path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
  );

function read(relativePath) {
  const absolutePath =
    path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(
      `Missing Phase 9E source: ${relativePath}`,
    );
  }

  return fs.readFileSync(absolutePath, 'utf8');
}

function requireFragments(label, source, fragments) {
  for (const fragment of fragments) {
    if (!source.includes(fragment)) {
      throw new Error(`${label} missing: ${fragment}`);
    }
  }
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/^\s*\/\/[!/]?.*$/gmu, '');
}

const tauriAdapter =
  read('apps/crablink-tv/src/platform/tauriTvAdapter.js');

const executable =
  stripComments(tauriAdapter);

const adapterTest =
  read('apps/crablink-tv/src/platform/tauriTvAdapter.assetManifest.test.mjs');

const catalogAdapterTest =
  read('apps/crablink-tv/src/platform/tauriTvAdapter.catalog.test.mjs');

const nativeCommand =
  read('apps/crablink-tv/src-tauri/src/commands/asset_manifest.rs');

const commandBoundary =
  read('scripts/check-crablink-tv-asset-manifest-command-boundary.mjs');

const tvApp =
  read('apps/crablink-tv/src/app/TvApp.jsx');

const tvPackage =
  JSON.parse(read('apps/crablink-tv/package.json'));

const rootPackage =
  JSON.parse(read('package.json'));

const makeCodebundle =
  read('scripts/make_codebundle.sh');

const codebundleBoundary =
  read('scripts/check-crablink-tv-codebundle-boundary.mjs');

requireFragments(
  'Tauri asset-manifest adapter',
  tauriAdapter,
  [
    'function checkAssetManifest(request)',
    "'tv_asset_manifest_check'",
    '{ request }',
    'export const tvAssetManifestAdapter',
    'Object.freeze({',
    'checkAssetManifest',
  ],
);

if (
  !/function\s+checkAssetManifest\s*\(\s*request\s*\)\s*\{/u.test(
    tauriAdapter,
  )
) {
  throw new Error(
    'checkAssetManifest must accept exactly one request object.',
  );
}

if (
  !/invoke\s*\(\s*['"]tv_asset_manifest_check['"]\s*,\s*\{\s*request\s*\}\s*,?\s*\)/su.test(
    tauriAdapter,
  )
) {
  throw new Error(
    'checkAssetManifest must invoke exactly tv_asset_manifest_check with { request }.',
  );
}

if (
  /function\s+checkAssetManifest\s*\([^)]*(?:url|origin|path|command)/iu.test(
    tauriAdapter,
  )
) {
  throw new Error(
    'checkAssetManifest must not accept provider URL, origin, path, or command input.',
  );
}

if (
  /invoke\s*\(\s*(?:command|normalized|url|path)/iu.test(
    tauriAdapter,
  )
) {
  throw new Error(
    'Tauri adapter must not expose dynamic command invocation.',
  );
}

for (const [label, pattern] of [
  ['network fetch', /\bfetch\s*\(/u],
  ['local storage', /\blocalStorage\b/u],
  ['session storage', /\bsessionStorage\b/u],
  ['cache', /\bcache\b/iu],
  ['wallet authority', /\bwallet\b/iu],
  ['ledger authority', /\bledger\b/iu],
  ['receipt authority', /\breceipt\b/iu],
  ['reward authority', /\breward\b/iu],
  ['ROC authority', /\broc\b/iu],
  ['entitlement authority', /\bentitlement\b/iu],
  ['finality authority', /\bfinality\b/iu],
]) {
  if (pattern.test(executable)) {
    throw new Error(
      `Tauri asset-manifest adapter contains forbidden ${label}.`,
    );
  }
}

requireFragments(
  'asset-manifest adapter tests',
  adapterTest,
  [
    'Tauri TV adapter exposes one asset-manifest adapter object',
    'Tauri TV asset-manifest adapter invokes only the fixed native command',
    'Tauri TV asset-manifest adapter does not acquire transport or authority',
  ],
);

requireFragments(
  'existing catalog adapter tests stay focused',
  catalogAdapterTest,
  [
    'Tauri TV catalog transport invokes only the fixed native catalog command',
    'Tauri TV catalog transport does not acquire broad runtime authority',
  ],
);

requireFragments(
  'native asset-manifest command',
  nativeCommand,
  [
    'pub fn tv_asset_manifest_check',
    'TvAssetManifestCheckRequest',
    'TvAssetManifestCheckResult',
    'perform_asset_manifest_check',
  ],
);

requireFragments(
  'Phase 9D successor marker',
  commandBoundary,
  [
    'PHASE9D_TV_ASSET_MANIFEST_COMMAND=GREEN',
    'NEXT_PATCH=PHASE9K_LIBRARY_VERIFIED_RENDER_DISPLAY',
  ],
);

if (
  !tvApp.includes(
    'manifestAdapter:'
  ) ||
  !tvApp.includes(
    'tvAssetManifestAdapter'
  )
) {
  throw new Error(
    'TV app must pass the fixed adapter only through reviewed manual execution.',
  );
}

for (const forbidden of [
  'checkAssetManifest(',
  'tv_asset_manifest_check',
]) {
  if (tvApp.includes(forbidden)) {
    throw new Error(
      `TV app acquired direct native manifest authority: ${forbidden}`,
    );
  }
}

const tvScripts =
  tvPackage.scripts ?? {};

const rootScripts =
  rootPackage.scripts ?? {};

if (
  tvScripts['test:asset-manifest-adapter'] !==
  'node --test src/platform/tauriTvAdapter.assetManifest.test.mjs'
) {
  throw new Error(
    'TV asset-manifest adapter test script is missing or incorrect.',
  );
}

if (
  tvScripts['check:asset-manifest-adapter'] !==
  'node ../../scripts/check-crablink-tv-asset-manifest-adapter-boundary.mjs'
) {
  throw new Error(
    'TV asset-manifest adapter boundary script is missing or incorrect.',
  );
}

for (const step of [
  'npm run test:asset-manifest-adapter',
  'npm run check:asset-manifest-adapter',
]) {
  if (!String(tvScripts.check ?? '').includes(step)) {
    throw new Error(
      `TV check chain does not include ${step}.`,
    );
  }
}

if (
  rootScripts['tv:asset-manifest-adapter:test'] !==
  'npm --prefix apps/crablink-tv run test:asset-manifest-adapter'
) {
  throw new Error(
    'Root asset-manifest adapter test script is missing or incorrect.',
  );
}

if (
  rootScripts['tv:asset-manifest-adapter:check'] !==
  'npm --prefix apps/crablink-tv run check:asset-manifest-adapter'
) {
  throw new Error(
    'Root asset-manifest adapter boundary script is missing or incorrect.',
  );
}

for (const requiredPath of [
  'apps/crablink-tv/src/platform/tauriTvAdapter.assetManifest.test.mjs',
  'scripts/check-crablink-tv-asset-manifest-adapter-boundary.mjs',
]) {
  if (
    !makeCodebundle.includes(requiredPath) &&
    !codebundleBoundary.includes(requiredPath)
  ) {
    throw new Error(
      `Future codebundle coverage missing: ${requiredPath}`,
    );
  }
}

console.log(
  'CrabLink TV asset-manifest adapter boundary passed.',
);

console.log(
  'Adapter: checkAssetManifest calls the fixed tv_asset_manifest_check command with one request object.',
);

console.log(
  'Authority: no provider URL, path, dynamic command, fetch, storage, cache, wallet, ledger, receipt, reward, ROC, entitlement, or finality behavior.',
);

console.log(
  'React handoff: the fixed adapter is injected only into reviewed Phase 9J manual execution; direct native calls remain absent.',
);

console.log(
  'PHASE9E_TV_ASSET_MANIFEST_ADAPTER=GREEN',
);

console.log(
  'NEXT_PATCH=PHASE9K_LIBRARY_VERIFIED_RENDER_DISPLAY',
);
