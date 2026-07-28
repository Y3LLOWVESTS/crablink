#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

function read(relativePath) {
  const absolutePath =
    path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(
      `Missing Phase 9B source: ${relativePath}`,
    );
  }

  return fs.readFileSync(
    absolutePath,
    'utf8',
  );
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/^\s*\/\/.*$/gmu, '');
}

function requireFragments(
  label,
  source,
  fragments,
) {
  for (const fragment of fragments) {
    if (!source.includes(fragment)) {
      throw new Error(
        `${label} missing: ${fragment}`,
      );
    }
  }
}

function sliceBetween(
  label,
  source,
  startFragment,
  endFragment,
) {
  const start =
    source.indexOf(startFragment);

  const end =
    source.indexOf(
      endFragment,
      start + startFragment.length,
    );

  if (
    start < 0 ||
    end < 0 ||
    end <= start
  ) {
    throw new Error(
      `${label} slice could not be isolated.`,
    );
  }

  return source.slice(start, end);
}

const acceptanceTest = read(
  'apps/crablink-tv/src/library/' +
  'TvLibraryAssetDetailAcceptance.source.test.mjs',
);

const routeHandoff = read(
  'apps/crablink-tv/src/catalog/' +
  'tvCatalogRouteHandoff.js',
);

const creatorFocus = read(
  'apps/crablink-tv/src/catalog/' +
  'tvCreatorProfileFocusModel.js',
);

const model = read(
  'apps/crablink-tv/src/library/' +
  'tvLibraryAssetDetailModel.js',
);

const modelExecutable =
  stripComments(model);

const modelTest = read(
  'apps/crablink-tv/src/library/' +
  'tvLibraryAssetDetailModel.test.mjs',
);

const panel = read(
  'apps/crablink-tv/src/library/' +
  'TvLibraryAssetDetailPanel.jsx',
);

const panelExecutable =
  stripComments(panel);

const panelTest = read(
  'apps/crablink-tv/src/library/' +
  'TvLibraryAssetDetailPanel.source.test.mjs',
);

const app = read(
  'apps/crablink-tv/src/app/TvApp.jsx',
);

const css = read(
  'apps/crablink-tv/src/styles/tv.css',
);

const phase8Boundary = read(
  'scripts/' +
  'check-crablink-tv-phase8-home-catalog-acceptance-boundary.mjs',
);

const phase9aBoundary = read(
  'scripts/' +
  'check-crablink-tv-library-asset-detail-boundary.mjs',
);

const tvPackage = JSON.parse(
  read('apps/crablink-tv/package.json'),
);

const rootPackage = JSON.parse(
  read('package.json'),
);

const makeCodebundle = read(
  'scripts/make_codebundle.sh',
);

const codebundleBoundary = read(
  'scripts/' +
  'check-crablink-tv-codebundle-boundary.mjs',
);

requireFragments(
  'Phase 9B acceptance tests',
  acceptanceTest,
  [
    'reviewed Home asset routes open persistent Library detail',
    'Library detail visibly exposes canonical reviewed identifiers',
    'Library clear behavior stays isolated from creator-profile focus',
    'Library acceptance adds no raw loading or authority behavior',
  ],
);

requireFragments(
  'catalog route handoff',
  routeHandoff,
  [
    "reviewed.owner === 'asset'",
    "return 'library';",
  ],
);

requireFragments(
  'Library asset detail model',
  model,
  [
    'TV_LIBRARY_ASSET_DETAIL_SCHEMA',
    'TV_LIBRARY_ASSET_DETAIL_KIND',
    'canonicalAssetRoute',
    'projectTvLibraryAssetDetail',
    'canonicalCrabUrl',
    'cid',
    'hash',
    'returnFocusKey',
  ],
);

requireFragments(
  'Library asset detail model tests',
  modelTest,
  [
    'library asset detail constants and idle view are explicit and immutable',
    'reviewed asset handoffs become bounded Library asset details',
    'non-detail and non-asset handoffs fail closed',
    'library asset detail bounds long text and focus keys',
  ],
);

requireFragments(
  'Library asset detail panel',
  panel,
  [
    'TvLibraryAssetDetailPanel',
    'detailView.assetKind',
    'detailView.canonicalCrabUrl',
    'detailView.cid',
    'detailView.hash',
    'library-asset-detail-clear',
    'Clear asset detail',
  ],
);

requireFragments(
  'Library asset detail panel tests',
  panelTest,
  [
    'library asset detail model projects reviewed asset route identifiers',
    'library asset detail panel renders identifiers without raw asset loading',
    'TV app stores Library asset detail state from reviewed asset handoffs',
    'library asset detail CSS exposes visible TV surfaces',
  ],
);

requireFragments(
  'TV app Library integration',
  app,
  [
    'libraryAssetDetailView',
    'setLibraryAssetDetailView',
    'clearLibraryAssetDetail',
    'projectTvLibraryAssetDetail',
    "handoff.route?.owner === 'asset'",
    'TvLibraryAssetDetailPanel',
    "activeSectionId === 'library'",
  ],
);

requireFragments(
  'creator profile focus regression surface',
  app,
  [
    'creatorProfileFocusRequest',
    'window.requestAnimationFrame',
    'document.querySelectorAll',
    'dataset.tvReturnFocusKey',
  ],
);

requireFragments(
  'creator focus model',
  creatorFocus,
  [
    'TV_CREATOR_PROFILE_FOCUS_KIND',
    'TV_CREATOR_PROFILE_FOCUS_REASON',
    'createTvCreatorProfileFocusRequest',
  ],
);

requireFragments(
  'Library asset detail CSS',
  css,
  [
    '.tv-library-asset-detail',
    '.tv-library-asset-detail__heading',
    '.tv-library-asset-detail__copy',
    '.tv-library-asset-detail__card',
    '.tv-library-asset-detail__fact',
    '.tv-library-asset-detail__empty',
  ],
);

requireFragments(
  'Phase 8 acceptance boundary',
  phase8Boundary,
  [
    'PHASE8H_PHASE8_HOME_CATALOG_ACCEPTANCE=GREEN',
    'PHASE8_HOME_CATALOG_TRACK=COMPLETE',
    'NEXT_PATCH=PHASE9K_LIBRARY_VERIFIED_RENDER_DISPLAY',
  ],
);

requireFragments(
  'Phase 9A boundary',
  phase9aBoundary,
  [
    'PHASE9A_LIBRARY_ASSET_DETAIL_FOUNDATION=GREEN',
    'NEXT_PATCH=PHASE9K_LIBRARY_VERIFIED_RENDER_DISPLAY',
  ],
);

for (const [label, source] of [
  ['Library asset detail model', modelExecutable],
  ['Library asset detail panel', panelExecutable],
]) {
  for (const [forbiddenLabel, pattern] of [
    ['native invoke', /\binvoke\s*\(/u],
    ['network fetch', /\bfetch\s*\(/u],
    ['automatic interval', /\bsetInterval\s*\(/u],
    ['automatic timer', /\bsetTimeout\s*\(/u],
    ['local storage', /\blocalStorage\b/u],
    ['session storage', /\bsessionStorage\b/u],
    ['indexed storage', /\bindexedDB\b/u],
    ['raw image element', /<img\b/u],
    ['raw video element', /<video\b/u],
    ['raw audio element', /<audio\b/u],
    ['raw source attribute', /\bsrc=/u],
    ['native Library asset read', /tv_library_asset_read/u],
    ['native manifest read', /tv_asset_manifest_read/u],
  ]) {
    if (pattern.test(source)) {
      throw new Error(
        `${label} acquired forbidden ${forbiddenLabel}.`,
      );
    }
  }
}

const clearSlice = sliceBetween(
  'Library clear handler',
  app,
  '  function clearLibraryAssetDetail()',
  '  function inspectCatalogItem(',
);

requireFragments(
  'Library clear handler',
  clearSlice,
  [
    'setLibraryAssetDetailView',
    'createIdleTvLibraryAssetDetail',
    'Library asset detail cleared',
  ],
);

for (const forbidden of [
  'setCreatorProfileView',
  'setCreatorProfileFocusRequest',
  'createTvCreatorProfileFocusRequest',
  'navigateToSection',
]) {
  if (clearSlice.includes(forbidden)) {
    throw new Error(
      `Library clear handler changed unrelated state: ${forbidden}`,
    );
  }
}

const appAcceptanceSlice = [
  clearSlice,

  sliceBetween(
    'Library asset handoff',
    app,
    "    if (\n      handoff.route?.owner === 'asset'",
    '    navigateToSection(\n      handoff.targetSectionId,',
  ),

  sliceBetween(
    'Library detail render',
    app,
    "      {activeSectionId === 'library' ? (",
    "      {activeSectionId === 'settings' ? (",
  ),
].join('\n');

for (const [forbiddenLabel, pattern] of [
  ['native invoke', /\binvoke\s*\(/u],
  ['network fetch', /\bfetch\s*\(/u],
  ['automatic interval', /\bsetInterval\s*\(/u],
  ['automatic timer', /\bsetTimeout\s*\(/u],
  ['local storage', /\blocalStorage\b/u],
  ['session storage', /\bsessionStorage\b/u],
  ['indexed storage', /\bindexedDB\b/u],
  ['native Library asset read', /tv_library_asset_read/u],
  ['native manifest read', /tv_asset_manifest_read/u],
]) {
  if (pattern.test(appAcceptanceSlice)) {
    throw new Error(
      'Library acceptance app slice acquired ' +
      `forbidden ${forbiddenLabel}.`,
    );
  }
}

const tvScripts =
  tvPackage.scripts ?? {};

const rootScripts =
  rootPackage.scripts ?? {};

if (
  tvScripts[
    'test:library-asset-detail-acceptance'
  ] !==
  'node --test src/library/TvLibraryAssetDetailAcceptance.source.test.mjs'
) {
  throw new Error(
    'TV Phase 9B acceptance test script is missing or incorrect.',
  );
}

if (
  tvScripts[
    'check:library-asset-detail-acceptance'
  ] !==
  'node ../../scripts/check-crablink-tv-library-asset-detail-acceptance-boundary.mjs'
) {
  throw new Error(
    'TV Phase 9B acceptance boundary script is missing or incorrect.',
  );
}

if (
  !String(tvScripts.check ?? '').includes(
    'npm run test:library-asset-detail && ' +
    'npm run test:library-asset-detail-react && ' +
    'npm run check:library-asset-detail && ' +
    'npm run test:library-asset-detail-acceptance && ' +
    'npm run check:library-asset-detail-acceptance',
  )
) {
  throw new Error(
    'TV acceptance chain does not run Phase 9B after Phase 9A.',
  );
}

if (
  rootScripts[
    'tv:library-asset-detail-acceptance:test'
  ] !==
  'npm --prefix apps/crablink-tv run test:library-asset-detail-acceptance'
) {
  throw new Error(
    'Root Phase 9B acceptance test script is missing or incorrect.',
  );
}

if (
  rootScripts[
    'tv:library-asset-detail-acceptance:check'
  ] !==
  'node scripts/check-crablink-tv-library-asset-detail-acceptance-boundary.mjs'
) {
  throw new Error(
    'Root Phase 9B acceptance boundary script is missing or incorrect.',
  );
}

for (const requiredPath of [
  'apps/crablink-tv/src/library/TvLibraryAssetDetailAcceptance.source.test.mjs',
  'scripts/check-crablink-tv-library-asset-detail-acceptance-boundary.mjs',
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
  'CrabLink TV Library asset detail acceptance boundary passed.',
);

console.log(
  'Routing: reviewed Home asset cards open a persistent Library detail surface.',
);

console.log(
  'Truth: canonical crab URL, B3 CID, hash, and asset kind remain visible without raw loading.',
);

console.log(
  'Isolation: Library clear behavior does not mutate creator-profile focus state.',
);

console.log(
  'Authority: no native asset read, gateway fetch, storage, wallet, ledger, entitlement, receipt, reward, ROC, or finality behavior was added.',
);

console.log(
  'PHASE9B_LIBRARY_ASSET_DETAIL_ACCEPTANCE=GREEN',
);

console.log(
  'NEXT_PATCH=PHASE9K_LIBRARY_VERIFIED_RENDER_DISPLAY',
);
