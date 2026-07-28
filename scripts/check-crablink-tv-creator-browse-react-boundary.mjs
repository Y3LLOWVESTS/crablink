#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing creator-browse React source: ${relativePath}`);
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
      throw new Error(`${label} is missing: ${fragment}`);
    }
  }
}

const hook = read('apps/crablink-tv/src/catalog/useTvCreatorBrowse.js');
const hookExecutable = stripComments(hook);
const panel = read('apps/crablink-tv/src/catalog/TvCreatorBrowsePanel.jsx');
const panelExecutable = stripComments(panel);
const sourceTest = read('apps/crablink-tv/src/catalog/TvCreatorBrowsePanel.source.test.mjs');
const model = read('apps/crablink-tv/src/catalog/tvCreatorBrowseModel.js');
const modelTest = read('apps/crablink-tv/src/catalog/tvCreatorBrowseModel.test.mjs');
const app = read('apps/crablink-tv/src/app/TvApp.jsx');
const css = read('apps/crablink-tv/src/styles/tv.css');
const creatorBoundary = read('scripts/check-crablink-tv-creator-browse-boundary.mjs');
const routeHandoffBoundary = read('scripts/check-crablink-tv-catalog-route-handoff-boundary.mjs');
const tvPackage = JSON.parse(read('apps/crablink-tv/package.json'));
const rootPackage = JSON.parse(read('package.json'));
const makeCodebundle = read('scripts/make_codebundle.sh');
const codebundleBoundary = read('scripts/check-crablink-tv-codebundle-boundary.mjs');

requireFragments('creator browse hook', hook, [
  'useTvCreatorBrowse',
  'projectTvCreatorBrowseFromCatalog',
  'creatorBrowseView',
  'creatorQuery',
  'setCreatorQuery',
  'clearCreatorQuery',
]);

requireFragments('creator browse panel', panel, [
  'TvCreatorBrowsePanel',
  'TV_CREATOR_BROWSE_KIND',
  'creator-browse-search',
  'creator-browse-clear',
  'tv-creator-grid',
  'tv-creator-card',
  'creatorItemFromBrowseCreator',
  'profileCrabUrl',
  'onCreator',
]);

requireFragments('creator browse source test', sourceTest, [
  'creator browse hook derives from the reviewed catalog view without automatic loading',
  'creator browse panel renders local search and backend-derived creator cards only',
  'TV app integrates creator browse without direct model or transport authority in JSX',
  'creator browse CSS exposes TV-friendly search, grid, and card surfaces',
  "app.includes('onCreator={inspectCatalogItem}')",
]);

requireFragments('creator browse model', model, [
  'projectTvCreatorBrowseFromCatalog',
  'searchTvCreatorBrowse',
  'TV_CREATOR_BROWSE_KIND',
]);

requireFragments('creator browse model tests', modelTest, [
  'creator browse extracts sorted unique creators from the reviewed creator rail',
  'creator browse filters loose ready views to creator site routes only',
]);

requireFragments('TV app creator browse integration', app, [
  'useTvCreatorBrowse',
  'TvCreatorBrowsePanel',
  'creatorBrowseView',
  'creatorQuery',
  'setCreatorQuery',
  'clearCreatorQuery',
  'catalogView: catalogState.view',
  'onCreator={inspectCatalogItem}',
]);

requireFragments('creator browse CSS', css, [
  '.tv-creator-browse',
  '.tv-creator-search',
  '.tv-creator-search__controls',
  '.tv-creator-grid',
  '.tv-creator-card',
  '.tv-creator-card__eyebrow',
]);

requireFragments('creator browse foundation boundary', creatorBoundary, [
  'PHASE8C_CREATOR_BROWSING_FOUNDATION=GREEN',
]);

requireFragments('catalog route handoff boundary', routeHandoffBoundary, [
  'PHASE8B_CATALOG_CARD_ROUTE_HANDOFF=GREEN',
]);

for (const [label, source] of [
  ['creator browse hook', hookExecutable],
  ['creator browse panel', panelExecutable],
]) {
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
    ['receipt authority', /\breceipt\b/iu],
    ['reward authority', /\breward\b/iu],
    ['ROC authority', /\broc\b/iu],
    ['entitlement authority', /\bentitlement\b/iu],
    ['finality authority', /\bfinality\b/iu],
  ]) {
    if (pattern.test(source)) {
      throw new Error(`${label} acquired forbidden ${forbiddenLabel}.`);
    }
  }
}

if (/projectTvCreatorBrowseFromCatalog/u.test(app)) {
  throw new Error('TvApp must not own creator-browse projection rules.');
}

if (/tv_catalog_read/u.test(app)) {
  throw new Error('TvApp must not invoke the native catalog command directly.');
}

const tvScripts = tvPackage.scripts ?? {};
const rootScripts = rootPackage.scripts ?? {};

if (
  tvScripts['test:creator-browse-react'] !==
  'node --test src/catalog/TvCreatorBrowsePanel.source.test.mjs'
) {
  throw new Error('TV creator-browse-react test script is missing or incorrect.');
}

if (
  tvScripts['check:creator-browse-react'] !==
  'node ../../scripts/check-crablink-tv-creator-browse-react-boundary.mjs'
) {
  throw new Error('TV creator-browse-react boundary script is missing or incorrect.');
}

if (
  !String(tvScripts.check ?? '').includes(
    'npm run test:creator-browse && npm run check:creator-browse && npm run test:creator-browse-react && npm run check:creator-browse-react',
  )
) {
  throw new Error('TV full acceptance does not run creator browse foundation then React panel in order.');
}

if (
  rootScripts['tv:creator-browse-react:test'] !==
  'npm --prefix apps/crablink-tv run test:creator-browse-react'
) {
  throw new Error('Root creator-browse-react test script is missing or incorrect.');
}

if (
  rootScripts['tv:creator-browse-react:check'] !==
  'node scripts/check-crablink-tv-creator-browse-react-boundary.mjs'
) {
  throw new Error('Root creator-browse-react boundary script is missing or incorrect.');
}

for (const requiredPath of [
  'apps/crablink-tv/src/catalog/useTvCreatorBrowse.js',
  'apps/crablink-tv/src/catalog/TvCreatorBrowsePanel.jsx',
  'apps/crablink-tv/src/catalog/TvCreatorBrowsePanel.source.test.mjs',
  'scripts/check-crablink-tv-creator-browse-react-boundary.mjs',
]) {
  if (
    !makeCodebundle.includes(requiredPath) &&
    !codebundleBoundary.includes(requiredPath)
  ) {
    throw new Error(`Future codebundle coverage is missing: ${requiredPath}`);
  }
}

console.log('CrabLink TV creator browse React boundary passed.');
console.log('Panel: visible creator browse search and creator cards render from the reviewed creator-browse model.');
console.log('Search: local only, bounded by the creator-browse model, with remote-focusable search and clear controls.');
console.log('Select: creator cards reuse the existing catalog card route handoff and return-focus behavior.');
console.log('Authority: no invoke, fetch, storage, wallet, ledger, receipts, rewards, ROC, entitlement, or finality behavior was added.');
console.log('PHASE8C_CREATOR_BROWSE_REACT_PANEL=GREEN');
console.log('NEXT_PATCH=PHASE9K_LIBRARY_VERIFIED_RENDER_DISPLAY');
