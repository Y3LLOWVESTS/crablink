#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing Phase 8 acceptance source: ${relativePath}`);
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
      throw new Error(`${label} missing: ${fragment}`);
    }
  }
}

const app = read('apps/crablink-tv/src/app/TvApp.jsx');
const homePanel = read('apps/crablink-tv/src/catalog/TvHomeCatalogPanel.jsx');
const creatorBrowsePanel = read('apps/crablink-tv/src/catalog/TvCreatorBrowsePanel.jsx');
const creatorProfilePanel = read('apps/crablink-tv/src/catalog/TvCreatorProfilePanel.jsx');
const catalogModel = read('apps/crablink-tv/src/catalog/tvCatalogModel.js');
const routeHandoff = read('apps/crablink-tv/src/catalog/tvCatalogRouteHandoff.js');
const thumbnailModel = read('apps/crablink-tv/src/catalog/tvCatalogThumbnailModel.js');
const creatorBrowseModel = read('apps/crablink-tv/src/catalog/tvCreatorBrowseModel.js');
const creatorProfileModel = read('apps/crablink-tv/src/catalog/tvCreatorProfileModel.js');
const creatorProfileFocusModel = read('apps/crablink-tv/src/catalog/tvCreatorProfileFocusModel.js');
const acceptanceTest = read('apps/crablink-tv/src/catalog/TvHomeCatalogPhase8Acceptance.source.test.mjs');

const boundaries = [
  ['home catalog React boundary', read('scripts/check-crablink-tv-home-catalog-react-boundary.mjs'), 'PHASE8B_HOME_CATALOG_REACT_INTEGRATION=GREEN'],
  ['catalog route handoff boundary', read('scripts/check-crablink-tv-catalog-route-handoff-boundary.mjs'), 'PHASE8B_CATALOG_CARD_ROUTE_HANDOFF=GREEN'],
  ['creator browse boundary', read('scripts/check-crablink-tv-creator-browse-boundary.mjs'), 'PHASE8C_CREATOR_BROWSING_FOUNDATION=GREEN'],
  ['creator browse React boundary', read('scripts/check-crablink-tv-creator-browse-react-boundary.mjs'), 'PHASE8C_CREATOR_BROWSE_REACT_PANEL=GREEN'],
  ['catalog thumbnail boundary', read('scripts/check-crablink-tv-catalog-thumbnail-boundary.mjs'), 'PHASE8D_BOUNDED_CATALOG_THUMBNAILS=GREEN'],
  ['creator profile boundary', read('scripts/check-crablink-tv-creator-profile-boundary.mjs'), 'PHASE8E_CREATOR_PROFILE_PAGE_FOUNDATION=GREEN'],
  ['creator profile focus boundary', read('scripts/check-crablink-tv-creator-profile-focus-boundary.mjs'), 'PHASE8F_PROFILE_RETURN_FOCUS_AND_REFRESH=GREEN'],
  ['creator profile acceptance boundary', read('scripts/check-crablink-tv-creator-profile-acceptance-boundary.mjs'), 'PHASE8G_CREATOR_PROFILE_ACCEPTANCE_POLISH=GREEN'],
];

const tvPackage = JSON.parse(read('apps/crablink-tv/package.json'));
const rootPackage = JSON.parse(read('package.json'));
const makeCodebundle = read('scripts/make_codebundle.sh');
const codebundleBoundary = read('scripts/check-crablink-tv-codebundle-boundary.mjs');

const phase8Executable = stripComments(
  [
    homePanel,
    creatorBrowsePanel,
    creatorProfilePanel,
    catalogModel,
    routeHandoff,
    thumbnailModel,
    creatorBrowseModel,
    creatorProfileModel,
    creatorProfileFocusModel,
  ].join('\n'),
);

requireFragments('TV app Phase 8 integration', app, [
  'useTvHomeCatalog',
  'TvHomeCatalogPanel',
  'projectTvCatalogCardRouteHandoff',
  'useTvCreatorBrowse',
  'TvCreatorBrowsePanel',
  'projectTvCreatorProfile',
  'TvCreatorProfilePanel',
  'creatorProfileFocusRequest',
  'focusRequest={creatorProfileFocusRequest}',
]);

requireFragments('Phase 8 acceptance source test', acceptanceTest, [
  'Phase 8 Home catalog surfaces are wired through the TV app',
  'Phase 8 Home catalog model stack owns catalog, thumbnails, creator browse, profile, and focus',
  'Phase 8 Home catalog executable surfaces do not add forbidden authority',
  'Phase 8 Home catalog package acceptance includes every focused slice',
  'projectTvCatalogResponse',
  "read('package.json')",
]);

for (const [label, source, fragments] of [
  ['catalog model', catalogModel, ['TV_CATALOG_SCHEMA', 'projectTvCatalogResponse', 'normalizeThumbnail']],
  ['route handoff', routeHandoff, ['TV_CATALOG_CARD_HANDOFF_KIND', 'projectTvCatalogCardRouteHandoff']],
  ['thumbnail model', thumbnailModel, ['TV_CATALOG_THUMBNAIL_SCHEMA', 'projectTvCatalogThumbnail']],
  ['creator browse model', creatorBrowseModel, ['TV_CREATOR_BROWSE_SCHEMA', 'projectTvCreatorBrowseFromCatalog', 'searchTvCreatorBrowse']],
  ['creator profile model', creatorProfileModel, ['TV_CREATOR_PROFILE_SCHEMA', 'projectTvCreatorProfile']],
  ['creator profile focus model', creatorProfileFocusModel, ['TV_CREATOR_PROFILE_FOCUS_SCHEMA', 'createTvCreatorProfileFocusRequest']],
]) {
  requireFragments(label, source, fragments);
}

for (const [label, source, marker] of boundaries) {
  requireFragments(label, source, [
    marker,
    'NEXT_PATCH=PHASE9K_LIBRARY_VERIFIED_RENDER_DISPLAY',
  ]);
}

for (const [forbiddenLabel, pattern] of [
  ['native invoke', /\binvoke\s*\(/u],
  ['network fetch', /\bfetch\s*\(/u],
  ['automatic interval', /\bsetInterval\s*\(/u],
  ['automatic timer', /\bsetTimeout\s*\(/u],
  ['local storage', /\blocalStorage\b/u],
  ['session storage', /\bsessionStorage\b/u],
  ['indexed storage', /\bindexedDB\b/u],
  ['wallet authority', /\bwallet\b/iu],
  ['ledger authority', /\bledger\b/iu],
  ['finality authority', /\bfinality\b/iu],
  ['native creator profile read', /tv_creator_profile_read/u],
  ['catalog write command', /tv_catalog_write/u],
]) {
  if (pattern.test(phase8Executable)) {
    throw new Error(`Phase 8 executable surfaces acquired forbidden ${forbiddenLabel}.`);
  }
}

const tvScripts = tvPackage.scripts ?? {};
const rootScripts = rootPackage.scripts ?? {};

if (
  tvScripts['test:phase8-home-catalog-acceptance'] !==
  'node --test src/catalog/TvHomeCatalogPhase8Acceptance.source.test.mjs'
) {
  throw new Error('TV Phase 8 Home catalog acceptance test script is missing or incorrect.');
}

if (
  tvScripts['check:phase8-home-catalog-acceptance'] !==
  'node ../../scripts/check-crablink-tv-phase8-home-catalog-acceptance-boundary.mjs'
) {
  throw new Error('TV Phase 8 Home catalog acceptance boundary script is missing or incorrect.');
}

if (
  !String(tvScripts.check ?? '').includes(
    'npm run test:creator-profile-acceptance && npm run check:creator-profile-acceptance && npm run test:phase8-home-catalog-acceptance && npm run check:phase8-home-catalog-acceptance',
  )
) {
  throw new Error('TV acceptance does not close Phase 8 after creator profile acceptance.');
}

if (
  rootScripts['tv:phase8-home-catalog-acceptance:test'] !==
  'npm --prefix apps/crablink-tv run test:phase8-home-catalog-acceptance'
) {
  throw new Error('Root Phase 8 Home catalog acceptance test script is missing or incorrect.');
}

if (
  rootScripts['tv:phase8-home-catalog-acceptance:check'] !==
  'node scripts/check-crablink-tv-phase8-home-catalog-acceptance-boundary.mjs'
) {
  throw new Error('Root Phase 8 Home catalog acceptance boundary script is missing or incorrect.');
}

for (const requiredPath of [
  'apps/crablink-tv/src/catalog/TvHomeCatalogPhase8Acceptance.source.test.mjs',
  'scripts/check-crablink-tv-phase8-home-catalog-acceptance-boundary.mjs',
]) {
  if (
    !makeCodebundle.includes(requiredPath) &&
    !codebundleBoundary.includes(requiredPath)
  ) {
    throw new Error(`Future codebundle coverage missing: ${requiredPath}`);
  }
}

console.log('CrabLink TV Phase 8 Home catalog acceptance boundary passed.');
console.log('Coverage: catalog model, route handoff, thumbnails, creator browse, creator profile, focus return, and profile acceptance are wired.');
console.log('Authority: no invoke, fetch, storage, wallet, ledger, catalog write, native profile read, or finality behavior was added to Phase 8 executable surfaces.');
console.log('PHASE8H_PHASE8_HOME_CATALOG_ACCEPTANCE=GREEN');
console.log('PHASE8_HOME_CATALOG_TRACK=COMPLETE');
console.log('NEXT_PATCH=PHASE9K_LIBRARY_VERIFIED_RENDER_DISPLAY');
