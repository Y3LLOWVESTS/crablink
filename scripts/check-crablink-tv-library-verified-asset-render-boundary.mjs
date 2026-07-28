#!/usr/bin/env node
/**
 * RO:WHAT — Validates the CrabLink TV Phase 9F Library verified asset render surface.
 * RO:WHY — Library can expose verified render facts without gateway fetch or raw byte rendering.
 * RO:INTERACTS — verified render model, Library detail panel, TvApp state, and Phase 9E adapter boundary.
 * RO:INVARIANTS — render facts must match active Library identifiers; native verification-flow composition is owned by Phase 9H; UI wiring remains deferred.
 * RO:SECURITY — no fetch, storage, cache, raw bytes, wallet, ledger, receipt, reward, ROC, entitlement, or finality authority.
 * RO:TEST — node scripts/check-crablink-tv-library-verified-asset-render-boundary.mjs.
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
      `Missing Phase 9F source: ${relativePath}`,
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

const renderModel =
  read('apps/crablink-tv/src/library/tvLibraryVerifiedAssetRenderModel.js');

const renderModelTest =
  read('apps/crablink-tv/src/library/tvLibraryVerifiedAssetRenderModel.test.mjs');

const renderSourceTest =
  read('apps/crablink-tv/src/library/TvLibraryVerifiedAssetRender.source.test.mjs');

const detailPanel =
  read('apps/crablink-tv/src/library/TvLibraryAssetDetailPanel.jsx');

const detailSourceTest =
  read('apps/crablink-tv/src/library/TvLibraryAssetDetailPanel.source.test.mjs');

const app =
  read('apps/crablink-tv/src/app/TvApp.jsx');

const css =
  read('apps/crablink-tv/src/styles/tv.css');

const adapter =
  read('apps/crablink-tv/src/platform/tauriTvAdapter.js');

const phase9eBoundary =
  read('scripts/check-crablink-tv-asset-manifest-adapter-boundary.mjs');

const libraryAcceptanceBoundary =
  read('scripts/check-crablink-tv-library-asset-detail-acceptance-boundary.mjs');

const tvPackage =
  JSON.parse(read('apps/crablink-tv/package.json'));

const rootPackage =
  JSON.parse(read('package.json'));

const makeCodebundle =
  read('scripts/make_codebundle.sh');

const codebundleBoundary =
  read('scripts/check-crablink-tv-codebundle-boundary.mjs');

const executableModel =
  stripComments(renderModel);

const executablePanel =
  stripComments(detailPanel);

const executableApp =
  stripComments(app);

requireFragments(
  'verified render model',
  renderModel,
  [
    'TV_LIBRARY_VERIFIED_ASSET_RENDER_SCHEMA',
    'TV_LIBRARY_VERIFIED_ASSET_RENDER_KIND',
    'TV_LIBRARY_VERIFIED_ASSET_RENDER_LIMITS',
    'createIdleTvLibraryVerifiedAssetRender',
    'projectTvLibraryVerifiedAssetRender',
    'verification.verified !== true',
    'verification.crabUrl',
    'verification.contentCid',
    'detail.canonicalCrabUrl',
    'detail.cid',
    'SUPPORTED_RENDER_KINDS',
  ],
);

requireFragments(
  'verified render model tests',
  renderModelTest,
  [
    'verified render constants and idle view are explicit and immutable',
    'native verified image results become bounded Library render facts',
    'native verified article results become bounded Library render facts',
    'unverified mismatched and unsupported render results fail closed',
    'missing or non-renderable Library details remain idle',
  ],
);

requireFragments(
  'verified render source tests',
  renderSourceTest,
  [
    'verified render model binds native result to active Library identifiers',
    'Library panel exposes verified render facts without raw bytes or src loading',
    'TV app stores reviewed execution render facts without direct native calls',
    'verified render CSS exposes visible proof surfaces',
  ],
);

requireFragments(
  'Library detail panel verified render surface',
  detailPanel,
  [
    'verifiedRenderView',
    'TV_LIBRARY_VERIFIED_ASSET_RENDER_KIND',
    'tv-library-verified-render',
    'data-tv-library-verified-render-kind',
    'verifiedRenderView.contentType',
    'verifiedRenderView.contentLength',
    'verifiedRenderView.maxVerifiedAssetBytes',
    'Verified render pending',
  ],
);

requireFragments(
  'TV app verified render state',
  app,
  [
    'createIdleTvLibraryVerifiedAssetRender',
    'projectTvLibraryVerifiedAssetRender',
    'libraryVerifiedAssetRenderView',
    'setLibraryVerifiedAssetRenderView',
    'verifiedRenderView={libraryVerifiedAssetRenderView}',
  ],
);

requireFragments(
  'Phase 9E adapter remains available for reviewed execution injection',
  adapter + '\n' + phase9eBoundary,
  [
    'tvAssetManifestAdapter',
    'function checkAssetManifest(request)',
    'PHASE9E_TV_ASSET_MANIFEST_ADAPTER=GREEN',
    'NEXT_PATCH=PHASE9K_LIBRARY_VERIFIED_RENDER_DISPLAY',
  ],
);

requireFragments(
  'Library acceptance successor marker',
  libraryAcceptanceBoundary,
  [
    'PHASE9B_LIBRARY_ASSET_DETAIL_ACCEPTANCE=GREEN',
    'NEXT_PATCH=PHASE9K_LIBRARY_VERIFIED_RENDER_DISPLAY',
  ],
);

requireFragments(
  'verified render CSS',
  css,
  [
    '.tv-library-verified-render',
    '.tv-library-verified-render__facts',
    '.tv-library-verified-render__fact',
    '.tv-library-verified-render__status',
  ],
);

for (const [label, source] of [
  ['verified render model', executableModel],
  ['Library detail panel', executablePanel],
]) {
  for (const [forbiddenLabel, pattern] of [
    ['dynamic invoke', /\binvoke\s*\(/u],
    ['network fetch', /\bfetch\s*\(/u],
    ['local storage', /\blocalStorage\b/u],
    ['session storage', /\bsessionStorage\b/u],
    ['indexedDB', /\bindexedDB\b/u],
    ['raw asset bytes field', /\b(?:rawBytes|assetBytes)\b/u],
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

for (const [forbiddenLabel, pattern] of [
  ['dynamic invoke', /\binvoke\s*\(/u],
  ['network fetch', /\bfetch\s*\(/u],
  ['local storage', /\blocalStorage\b/u],
  ['session storage', /\bsessionStorage\b/u],
  ['indexedDB', /\bindexedDB\b/u],
  ['raw asset bytes field', /\b(?:rawBytes|assetBytes)\b/u],
]) {
  if (pattern.test(executableApp)) {
    throw new Error(
      `TV app executable surface acquired forbidden ${forbiddenLabel}.`,
    );
  }
}

if (/\bcheckAssetManifest\s*\(/u.test(executableApp)) {
  throw new Error(
    'TV app must not invoke manifest verification before Phase 9G fetch wiring.',
  );
}

for (const selector of [
  '.tv-library-verified-render',
  '.tv-library-verified-render__facts',
  '.tv-library-verified-render__fact',
]) {
  if (!detailSourceTest.includes(selector) && !renderSourceTest.includes(selector)) {
    throw new Error(
      `Verified render source-test coverage missing: ${selector}`,
    );
  }
}

const tvScripts =
  tvPackage.scripts ?? {};

const rootScripts =
  rootPackage.scripts ?? {};

if (
  tvScripts['test:library-verified-asset-render'] !==
  'node --test src/library/tvLibraryVerifiedAssetRenderModel.test.mjs'
) {
  throw new Error(
    'TV verified render model test script is missing or incorrect.',
  );
}

if (
  tvScripts['test:library-verified-asset-render-react'] !==
  'node --test src/library/TvLibraryVerifiedAssetRender.source.test.mjs'
) {
  throw new Error(
    'TV verified render source test script is missing or incorrect.',
  );
}

if (
  tvScripts['check:library-verified-asset-render'] !==
  'node ../../scripts/check-crablink-tv-library-verified-asset-render-boundary.mjs'
) {
  throw new Error(
    'TV verified render boundary script is missing or incorrect.',
  );
}

for (const step of [
  'npm run test:library-verified-asset-render',
  'npm run test:library-verified-asset-render-react',
  'npm run check:library-verified-asset-render',
]) {
  if (!String(tvScripts.check ?? '').includes(step)) {
    throw new Error(
      `TV check chain does not include ${step}.`,
    );
  }
}

if (
  rootScripts['tv:library-verified-asset-render:test'] !==
  'npm --prefix apps/crablink-tv run test:library-verified-asset-render'
) {
  throw new Error(
    'Root verified render model test script is missing or incorrect.',
  );
}

if (
  rootScripts['tv:library-verified-asset-render-react:test'] !==
  'npm --prefix apps/crablink-tv run test:library-verified-asset-render-react'
) {
  throw new Error(
    'Root verified render source test script is missing or incorrect.',
  );
}

if (
  rootScripts['tv:library-verified-asset-render:check'] !==
  'npm --prefix apps/crablink-tv run check:library-verified-asset-render'
) {
  throw new Error(
    'Root verified render boundary script is missing or incorrect.',
  );
}

for (const requiredPath of [
  'apps/crablink-tv/src/library/tvLibraryVerifiedAssetRenderModel.js',
  'apps/crablink-tv/src/library/tvLibraryVerifiedAssetRenderModel.test.mjs',
  'apps/crablink-tv/src/library/TvLibraryVerifiedAssetRender.source.test.mjs',
  'scripts/check-crablink-tv-library-verified-asset-render-boundary.mjs',
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
  'CrabLink TV Library verified asset render boundary passed.',
);

console.log(
  'Projection: native verified image/article facts bind to the active Library canonical URL, B3 CID, and asset kind.',
);

console.log(
  'Rendering: Library displays verified render status and facts without img/src/raw asset bytes.',
);

console.log(
  'Authority: verified render projection remains byte-free; React uses reviewed execution injection without direct fetch, invoke, or native manifest calls.',
);

console.log(
  'PHASE9F_LIBRARY_VERIFIED_ASSET_RENDER=GREEN',
);

console.log(
  'NEXT_PATCH=PHASE9K_LIBRARY_VERIFIED_RENDER_DISPLAY',
);
