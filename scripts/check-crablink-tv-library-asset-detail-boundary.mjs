#!/usr/bin/env node
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
      `Missing Library asset detail source: ${relativePath}`,
    );
  }

  return fs.readFileSync(absolutePath, 'utf8');
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/^\s*\/\/.*$/gmu, '');
}

function requireFragments(label, source, fragments) {
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

const model =
  read(
    'apps/crablink-tv/src/library/' +
    'tvLibraryAssetDetailModel.js',
  );

const modelExecutable =
  stripComments(model);

const modelTest =
  read(
    'apps/crablink-tv/src/library/' +
    'tvLibraryAssetDetailModel.test.mjs',
  );

const panel =
  read(
    'apps/crablink-tv/src/library/' +
    'TvLibraryAssetDetailPanel.jsx',
  );

const panelExecutable =
  stripComments(panel);

const sourceTest =
  read(
    'apps/crablink-tv/src/library/' +
    'TvLibraryAssetDetailPanel.source.test.mjs',
  );

const app =
  read('apps/crablink-tv/src/app/TvApp.jsx');

const css =
  read('apps/crablink-tv/src/styles/tv.css');

const routeHandoff =
  read(
    'apps/crablink-tv/src/catalog/' +
    'tvCatalogRouteHandoff.js',
  );

const tvPackage =
  JSON.parse(
    read('apps/crablink-tv/package.json'),
  );

const rootPackage =
  JSON.parse(
    read('package.json'),
  );

const makeCodebundle =
  read('scripts/make_codebundle.sh');

const codebundleBoundary =
  read(
    'scripts/' +
    'check-crablink-tv-codebundle-boundary.mjs',
  );

const predecessors = [
  [
    'home catalog React boundary',
    'scripts/check-crablink-tv-home-catalog-react-boundary.mjs',
    'PHASE8B_HOME_CATALOG_REACT_INTEGRATION=GREEN',
  ],
  [
    'catalog route handoff boundary',
    'scripts/check-crablink-tv-catalog-route-handoff-boundary.mjs',
    'PHASE8B_CATALOG_CARD_ROUTE_HANDOFF=GREEN',
  ],
  [
    'creator browse boundary',
    'scripts/check-crablink-tv-creator-browse-boundary.mjs',
    'PHASE8C_CREATOR_BROWSING_FOUNDATION=GREEN',
  ],
  [
    'creator browse React boundary',
    'scripts/check-crablink-tv-creator-browse-react-boundary.mjs',
    'PHASE8C_CREATOR_BROWSE_REACT_PANEL=GREEN',
  ],
  [
    'catalog thumbnail boundary',
    'scripts/check-crablink-tv-catalog-thumbnail-boundary.mjs',
    'PHASE8D_BOUNDED_CATALOG_THUMBNAILS=GREEN',
  ],
  [
    'creator profile boundary',
    'scripts/check-crablink-tv-creator-profile-boundary.mjs',
    'PHASE8E_CREATOR_PROFILE_PAGE_FOUNDATION=GREEN',
  ],
  [
    'creator profile focus boundary',
    'scripts/check-crablink-tv-creator-profile-focus-boundary.mjs',
    'PHASE8F_PROFILE_RETURN_FOCUS_AND_REFRESH=GREEN',
  ],
  [
    'creator profile acceptance boundary',
    'scripts/check-crablink-tv-creator-profile-acceptance-boundary.mjs',
    'PHASE8G_CREATOR_PROFILE_ACCEPTANCE_POLISH=GREEN',
  ],
  [
    'Phase 8 Home catalog acceptance boundary',
    'scripts/check-crablink-tv-phase8-home-catalog-acceptance-boundary.mjs',
    'PHASE8H_PHASE8_HOME_CATALOG_ACCEPTANCE=GREEN',
  ],
];

requireFragments(
  'Library asset detail model',
  model,
  [
    'TV_LIBRARY_ASSET_DETAIL_SCHEMA',
    'TV_LIBRARY_ASSET_DETAIL_KIND',
    'TV_LIBRARY_ASSET_DETAIL_LIMITS',
    'createIdleTvLibraryAssetDetail',
    'projectTvLibraryAssetDetail',
    'TV_CATALOG_CARD_HANDOFF_KIND.DETAIL',
    "route?.owner !== 'asset'",
    'canonicalCrabUrl',
    'cid',
    'hash',
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
    'tv-library-asset-detail',
    'library-asset-detail-clear',
    'detailView.canonicalCrabUrl',
    'detailView.cid',
    'detailView.hash',
    'Clear asset detail',
  ],
);

requireFragments(
  'Library asset detail source tests',
  sourceTest,
  [
    'library asset detail model projects reviewed asset route identifiers',
    'library asset detail panel renders identifiers without raw asset loading',
    'TV app stores Library asset detail state from reviewed asset handoffs',
    'library asset detail CSS exposes visible TV surfaces',
  ],
);

requireFragments(
  'TV app Library asset detail integration',
  app,
  [
    'createIdleTvLibraryAssetDetail',
    'projectTvLibraryAssetDetail',
    'TvLibraryAssetDetailPanel',
    'libraryAssetDetailView',
    'setLibraryAssetDetailView',
    'clearLibraryAssetDetail',
    "handoff.route?.owner === 'asset'",
    "activeSectionId === 'library'",
  ],
);

requireFragments(
  'catalog route handoff asset ownership',
  routeHandoff,
  [
    "reviewed.owner === 'asset'",
    "return 'library';",
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

for (
  const [
    label,
    relativePath,
    greenMarker,
  ] of predecessors
) {
  requireFragments(
    label,
    read(relativePath),
    [
      greenMarker,
      'NEXT_PATCH=PHASE9K_LIBRARY_VERIFIED_RENDER_DISPLAY',
    ],
  );
}

for (const [label, source] of [
  [
    'Library asset detail model',
    modelExecutable,
  ],
  [
    'Library asset detail panel',
    panelExecutable,
  ],
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
    ['raw source attribute', /\bsrc=/u],
    ['storage authority', /\bstorage\b/iu],
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

const appLibrarySlice = [
  sliceBetween(
    'Library clear handler',
    app,
    '  function clearLibraryAssetDetail()',
    '  function inspectCatalogItem(',
  ),
  sliceBetween(
    'Library catalog handoff',
    app,
    "    if (\n      handoff.route?.owner === 'asset'",
    '    navigateToSection(\n      handoff.targetSectionId,',
  ),
  sliceBetween(
    'Library panel render',
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
  [
    'native Library asset read',
    /tv_library_asset_read/u,
  ],
]) {
  if (pattern.test(appLibrarySlice)) {
    throw new Error(
      'Library asset detail app slice acquired ' +
      `forbidden ${forbiddenLabel}.`,
    );
  }
}

const tvScripts =
  tvPackage.scripts ?? {};

const rootScripts =
  rootPackage.scripts ?? {};

if (
  tvScripts['test:library-asset-detail'] !==
  'node --test src/library/tvLibraryAssetDetailModel.test.mjs'
) {
  throw new Error(
    'TV Library asset-detail model test script is missing or incorrect.',
  );
}

if (
  tvScripts['test:library-asset-detail-react'] !==
  'node --test src/library/TvLibraryAssetDetailPanel.source.test.mjs'
) {
  throw new Error(
    'TV Library asset-detail React source test script is missing or incorrect.',
  );
}

if (
  tvScripts['check:library-asset-detail'] !==
  'node ../../scripts/check-crablink-tv-library-asset-detail-boundary.mjs'
) {
  throw new Error(
    'TV Library asset-detail boundary script is missing or incorrect.',
  );
}

if (
  !String(tvScripts.check ?? '').includes(
    'npm run test:phase8-home-catalog-acceptance && ' +
    'npm run check:phase8-home-catalog-acceptance && ' +
    'npm run test:library-asset-detail && ' +
    'npm run test:library-asset-detail-react && ' +
    'npm run check:library-asset-detail',
  )
) {
  throw new Error(
    'TV acceptance does not run Library asset detail after Phase 8 acceptance.',
  );
}

if (
  rootScripts['tv:library-asset-detail:test'] !==
  'npm --prefix apps/crablink-tv run test:library-asset-detail'
) {
  throw new Error(
    'Root Library asset-detail test script is missing or incorrect.',
  );
}

if (
  rootScripts['tv:library-asset-detail-react:test'] !==
  'npm --prefix apps/crablink-tv run test:library-asset-detail-react'
) {
  throw new Error(
    'Root Library asset-detail React test script is missing or incorrect.',
  );
}

if (
  rootScripts['tv:library-asset-detail:check'] !==
  'node scripts/check-crablink-tv-library-asset-detail-boundary.mjs'
) {
  throw new Error(
    'Root Library asset-detail boundary script is missing or incorrect.',
  );
}

for (const requiredPath of [
  'apps/crablink-tv/src/library/tvLibraryAssetDetailModel.js',
  'apps/crablink-tv/src/library/tvLibraryAssetDetailModel.test.mjs',
  'apps/crablink-tv/src/library/TvLibraryAssetDetailPanel.jsx',
  'apps/crablink-tv/src/library/TvLibraryAssetDetailPanel.source.test.mjs',
  'scripts/check-crablink-tv-library-asset-detail-boundary.mjs',
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
  'CrabLink TV Library asset detail boundary passed.',
);

console.log(
  'Projection: reviewed asset handoffs become bounded Library views with canonical identifiers only.',
);

console.log(
  'Rendering: Library exposes a visible detail or truthful empty state without raw asset loading.',
);

console.log(
  'Authority: no invoke, fetch, storage, wallet, ledger, receipts, rewards, ROC, entitlement, or finality behavior was added.',
);

console.log(
  'PHASE9A_LIBRARY_ASSET_DETAIL_FOUNDATION=GREEN',
);

console.log(
  'NEXT_PATCH=PHASE9K_LIBRARY_VERIFIED_RENDER_DISPLAY',
);
