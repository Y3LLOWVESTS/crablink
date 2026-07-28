#!/usr/bin/env node
/**
 * RO:WHAT — Validates CrabLink TV Phase 9H Library asset verify-flow composition.
 * RO:WHY — Gateway evidence, native manifest check, and verified render projection need one deterministic flow before UI wiring.
 * RO:INTERACTS — tvLibraryAssetVerifyFlow, Phase 9G gateway evidence, Phase 9E adapter contract, Phase 9F render projection.
 * RO:INVARIANTS — verification stays bound to active Library canonical URL, B3 CID, and asset kind.
 * RO:SECURITY — no global fetch, React auto-fetch, storage, img/src rendering, wallet, ledger, receipt, reward, ROC, entitlement, or finality authority.
 * RO:TEST — node scripts/check-crablink-tv-library-asset-verify-flow-boundary.mjs.
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
      `Missing Phase 9H source: ${relativePath}`,
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

const verifyFlow =
  read('apps/crablink-tv/src/library/tvLibraryAssetVerifyFlow.js');

const verifyFlowTest =
  read('apps/crablink-tv/src/library/tvLibraryAssetVerifyFlow.test.mjs');

const verifyFlowSourceTest =
  read('apps/crablink-tv/src/library/TvLibraryAssetVerifyFlow.source.test.mjs');

const app =
  read('apps/crablink-tv/src/app/TvApp.jsx');

const panel =
  read('apps/crablink-tv/src/library/TvLibraryAssetDetailPanel.jsx');

const adapter =
  read('apps/crablink-tv/src/platform/tauriTvAdapter.js');

const phase9gBoundary =
  read('scripts/check-crablink-tv-gateway-asset-fetch-boundary.mjs');

const phase9fBoundary =
  read('scripts/check-crablink-tv-library-verified-asset-render-boundary.mjs');

const phase9eBoundary =
  read('scripts/check-crablink-tv-asset-manifest-adapter-boundary.mjs');

const tvPackage =
  JSON.parse(read('apps/crablink-tv/package.json'));

const rootPackage =
  JSON.parse(read('package.json'));

const makeCodebundle =
  read('scripts/make_codebundle.sh');

const codebundleBoundary =
  read('scripts/check-crablink-tv-codebundle-boundary.mjs');

const executableVerifyFlow =
  stripComments(verifyFlow);

const executableApp =
  stripComments(app);

const executablePanel =
  stripComments(panel);

requireFragments(
  'Library asset verify flow',
  verifyFlow,
  [
    'TV_LIBRARY_ASSET_VERIFY_FLOW_SCHEMA',
    'TV_LIBRARY_ASSET_VERIFY_FLOW_STATE',
    'createIdleTvLibraryAssetVerifyFlow',
    'runTvLibraryAssetVerifyFlow',
    'projectTvGatewayAssetFetchRequest',
    'readTvGatewayAssetEvidence',
    'manifestAdapter.checkAssetManifest',
    'nativeManifestRequest',
    'projectTvLibraryVerifiedAssetRender',
    'TV_LIBRARY_VERIFIED_ASSET_RENDER_KIND.READY',
    'assetBytes',
  ],
);

requireFragments(
  'Library asset verify flow tests',
  verifyFlowTest,
  [
    'verify flow constants and idle view are explicit and immutable',
    'verify flow composes gateway evidence native check and render projection',
    'verify flow accepts article render facts through the same bounded path',
    'verify flow fails closed before native verification when gateway request or evidence is bad',
    'verify flow fails closed for missing native adapter native failures and mismatched render results',
  ],
);

requireFragments(
  'Library asset verify flow source tests',
  verifyFlowSourceTest,
  [
    'verify flow composes gateway evidence native adapter and render projection',
    'verify flow uses injected manifest adapter instead of importing Tauri adapter',
    'verify flow has no global fetch storage or rendering side effects',
    'React surfaces still do not run the verify flow automatically',
  ],
);

requireFragments(
  'Phase 9G successor marker',
  phase9gBoundary,
  [
    'PHASE9G_TV_GATEWAY_ASSET_FETCH=GREEN',
    'NEXT_PATCH=PHASE9K_LIBRARY_VERIFIED_RENDER_DISPLAY',
  ],
);

requireFragments(
  'Phase 9F successor marker',
  phase9fBoundary,
  [
    'PHASE9F_LIBRARY_VERIFIED_ASSET_RENDER=GREEN',
    'NEXT_PATCH=PHASE9K_LIBRARY_VERIFIED_RENDER_DISPLAY',
  ],
);

requireFragments(
  'Phase 9E successor marker',
  phase9eBoundary,
  [
    'PHASE9E_TV_ASSET_MANIFEST_ADAPTER=GREEN',
    'NEXT_PATCH=PHASE9K_LIBRARY_VERIFIED_RENDER_DISPLAY',
  ],
);

requireFragments(
  'Phase 9E adapter contract still exists',
  adapter,
  [
    'tvAssetManifestAdapter',
    'checkAssetManifest(request)',
    'tv_asset_manifest_check',
  ],
);

for (const [label, source] of [
  ['Library asset verify flow', executableVerifyFlow],
]) {
  for (const [forbiddenLabel, pattern] of [
    ['global fetch', /\bfetch\s*\(/u],
    ['dynamic invoke', /\binvoke\s*\(/u],
    ['local storage', /\blocalStorage\b/u],
    ['session storage', /\bsessionStorage\b/u],
    ['indexedDB', /\bindexedDB\b/u],
    ['img rendering', /<img\b/u],
    ['src rendering', /\bsrc=/u],
    ['object URL rendering', /\bcreateObjectURL\b/u],
    ['wallet authority', /\bwallet\b/iu],
    ['ledger authority', /\bledger\b/iu],
    ['receipt authority', /\breceipt\b/iu],
    ['reward authority', /\breward\b/iu],
    ['ROC authority', /\broc\b/iu],
    ['entitlement authority', /\bentitlement\b/iu],
    ['finality authority', /\bfinality\b/iu],
  ]) {
    if (pattern.test(source)) {
      throw new Error(
        `${label} acquired forbidden ${forbiddenLabel}.`,
      );
    }
  }
}

if (
  executableVerifyFlow.includes('tvAssetManifestAdapter') ||
  executableVerifyFlow.includes('tauriTvAdapter')
) {
  throw new Error(
    'Verify flow must depend on an injected manifest adapter, not import Tauri directly.',
  );
}

for (const [label, source] of [
  ['TV app executable surface', executableApp],
  ['Library detail panel executable surface', executablePanel],
]) {
  for (const [forbiddenLabel, pattern] of [
    ['verify flow import', /\btvLibraryAssetVerifyFlow\b/u],
    ['verify flow call', /\brunTvLibraryAssetVerifyFlow\b/u],
    ['gateway request projection', /\bprojectTvGatewayAssetFetchRequest\b/u],
    ['gateway evidence read', /\breadTvGatewayAssetEvidence\b/u],
    ['native manifest check call', /\bcheckAssetManifest\s*\(/u],
    ['dynamic invoke', /\binvoke\s*\(/u],
    ['global fetch', /\bfetch\s*\(/u],
    ['raw asset bytes field', /\b(?:rawBytes|assetBytes)\b/u],
  ]) {
    if (pattern.test(source)) {
      throw new Error(
        `${label} consumed Phase 9H before UI ownership: ${forbiddenLabel}.`,
      );
    }
  }
}

const tvScripts =
  tvPackage.scripts ?? {};

const rootScripts =
  rootPackage.scripts ?? {};

if (
  tvScripts['test:library-asset-verify-flow'] !==
  'node --test src/library/tvLibraryAssetVerifyFlow.test.mjs'
) {
  throw new Error(
    'TV Library asset verify-flow model test script is missing or incorrect.',
  );
}

if (
  tvScripts['test:library-asset-verify-flow-source'] !==
  'node --test src/library/TvLibraryAssetVerifyFlow.source.test.mjs'
) {
  throw new Error(
    'TV Library asset verify-flow source test script is missing or incorrect.',
  );
}

if (
  tvScripts['check:library-asset-verify-flow'] !==
  'node ../../scripts/check-crablink-tv-library-asset-verify-flow-boundary.mjs'
) {
  throw new Error(
    'TV Library asset verify-flow boundary script is missing or incorrect.',
  );
}

for (const step of [
  'npm run test:library-asset-verify-flow',
  'npm run test:library-asset-verify-flow-source',
  'npm run check:library-asset-verify-flow',
]) {
  if (!String(tvScripts.check ?? '').includes(step)) {
    throw new Error(
      `TV check chain does not include ${step}.`,
    );
  }
}

if (
  rootScripts['tv:library-asset-verify-flow:test'] !==
  'npm --prefix apps/crablink-tv run test:library-asset-verify-flow'
) {
  throw new Error(
    'Root Library asset verify-flow model test script is missing or incorrect.',
  );
}

if (
  rootScripts['tv:library-asset-verify-flow-source:test'] !==
  'npm --prefix apps/crablink-tv run test:library-asset-verify-flow-source'
) {
  throw new Error(
    'Root Library asset verify-flow source test script is missing or incorrect.',
  );
}

if (
  rootScripts['tv:library-asset-verify-flow:check'] !==
  'npm --prefix apps/crablink-tv run check:library-asset-verify-flow'
) {
  throw new Error(
    'Root Library asset verify-flow boundary script is missing or incorrect.',
  );
}

for (const requiredPath of [
  'apps/crablink-tv/src/library/tvLibraryAssetVerifyFlow.js',
  'apps/crablink-tv/src/library/tvLibraryAssetVerifyFlow.test.mjs',
  'apps/crablink-tv/src/library/TvLibraryAssetVerifyFlow.source.test.mjs',
  'scripts/check-crablink-tv-library-asset-verify-flow-boundary.mjs',
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
  'CrabLink TV Library asset verify-flow boundary passed.',
);

console.log(
  'Flow: active Library detail composes gateway evidence, native manifest check, and verified render projection.',
);

console.log(
  'Binding: verification remains bound to active Library canonical URL, B3 CID, and asset kind.',
);

console.log(
  'Authority: React auto-run, global fetch, storage, img/src rendering, wallet, ledger, receipt, reward, ROC, entitlement, and finality remain absent.',
);

console.log(
  'PHASE9H_LIBRARY_ASSET_VERIFY_FLOW=GREEN',
);

console.log(
  'NEXT_PATCH=PHASE9K_LIBRARY_VERIFIED_RENDER_DISPLAY',
);
