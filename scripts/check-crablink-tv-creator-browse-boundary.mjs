#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing creator-browse source: ${relativePath}`);
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

const creatorBrowse = read('apps/crablink-tv/src/catalog/tvCreatorBrowseModel.js');
const creatorBrowseExecutable = stripComments(creatorBrowse);
const creatorBrowseTest = read('apps/crablink-tv/src/catalog/tvCreatorBrowseModel.test.mjs');
const catalogModel = read('apps/crablink-tv/src/catalog/tvCatalogModel.js');
const routeRegistry = read('apps/crablink-tv/src/navigation/tvRouteRegistry.js');
const routeHandoffBoundary = read('scripts/check-crablink-tv-catalog-route-handoff-boundary.mjs');
const tvPackage = JSON.parse(read('apps/crablink-tv/package.json'));
const rootPackage = JSON.parse(read('package.json'));
const makeCodebundle = read('scripts/make_codebundle.sh');
const codebundleBoundary = read('scripts/check-crablink-tv-codebundle-boundary.mjs');

requireFragments('creator browse model', creatorBrowse, [
  'TV_CREATOR_BROWSE_SCHEMA',
  'TV_CREATOR_BROWSE_KIND',
  'TV_CREATOR_BROWSE_LIMITS',
  'projectTvCreatorBrowseFromCatalog',
  'searchTvCreatorBrowse',
  'TV_CATALOG_RAIL.CREATORS',
  'TV_CATALOG_VIEW_KIND.READY',
  "item.kind !== 'creator'",
  'resolveTvRouteInput',
  "reviewed.owner !== 'site'",
  'dedupeCreators',
  'sortCreators',
]);

requireFragments('creator browse tests', creatorBrowseTest, [
  'creator browse policy constants are explicit and immutable',
  'creator browse extracts sorted unique creators from the reviewed creator rail',
  'creator browse rejects non-ready catalog states and non-creator rails',
  'creator browse filters loose ready views to creator site routes only',
  'creator browse search filters by title, subtitle, site name, or route',
  'creator browse applies safe limits without mutating the source view',
  'creator browse bounds text fields and query size',
]);

requireFragments('catalog model', catalogModel, [
  'TV_CATALOG_RAIL',
  'TV_CATALOG_VIEW_KIND',
  'projectTvCatalogResponse',
  "route.owner === 'site'",
]);

requireFragments('route registry', routeRegistry, [
  'TV_ROUTE_RESULT_KIND',
  'resolveTvRouteInput',
]);

requireFragments('route handoff boundary', routeHandoffBoundary, [
  'PHASE8B_CATALOG_CARD_ROUTE_HANDOFF=GREEN',
]);

for (const [label, pattern] of [
  ['native invoke', /\binvoke\s*\(/u],
  ['network fetch', /\bfetch\s*\(/u],
  ['automatic interval', /\bsetInterval\s*\(/u],
  ['automatic timer', /\bsetTimeout\s*\(/u],
  ['local storage', /\blocalStorage\b/u],
  ['session storage', /\bsessionStorage\b/u],
  ['indexed storage', /\bindexedDB\b/u],
  ['React import', /\bfrom 'react'\b/u],
  ['DOM window', /\bwindow\b/u],
  ['DOM document', /\bdocument\b/u],
  ['wallet authority', /\bwallet\b/iu],
  ['ledger authority', /\bledger\b/iu],
  ['receipt authority', /\breceipt\b/iu],
  ['reward authority', /\breward\b/iu],
  ['ROC authority', /\broc\b/iu],
  ['entitlement authority', /\bentitlement\b/iu],
  ['finality authority', /\bfinality\b/iu],
]) {
  if (pattern.test(creatorBrowseExecutable)) {
    throw new Error(`Creator browse model acquired forbidden ${label}.`);
  }
}

const tvScripts = tvPackage.scripts ?? {};
const rootScripts = rootPackage.scripts ?? {};

if (
  tvScripts['test:creator-browse'] !==
  'node --test src/catalog/tvCreatorBrowseModel.test.mjs'
) {
  throw new Error('TV creator-browse test script is missing or incorrect.');
}

if (
  tvScripts['check:creator-browse'] !==
  'node ../../scripts/check-crablink-tv-creator-browse-boundary.mjs'
) {
  throw new Error('TV creator-browse boundary script is missing or incorrect.');
}

if (
  !String(tvScripts.check ?? '').includes(
    'npm run test:catalog-route-handoff && npm run check:catalog-route-handoff && npm run test:creator-browse && npm run check:creator-browse',
  )
) {
  throw new Error('TV full acceptance does not run route handoff then creator browse in order.');
}

if (
  rootScripts['tv:creator-browse:test'] !==
  'npm --prefix apps/crablink-tv run test:creator-browse'
) {
  throw new Error('Root creator-browse test script is missing or incorrect.');
}

if (
  rootScripts['tv:creator-browse:check'] !==
  'node scripts/check-crablink-tv-creator-browse-boundary.mjs'
) {
  throw new Error('Root creator-browse boundary script is missing or incorrect.');
}

for (const requiredPath of [
  'apps/crablink-tv/src/catalog/tvCreatorBrowseModel.js',
  'apps/crablink-tv/src/catalog/tvCreatorBrowseModel.test.mjs',
  'scripts/check-crablink-tv-creator-browse-boundary.mjs',
]) {
  if (
    !makeCodebundle.includes(requiredPath) &&
    !codebundleBoundary.includes(requiredPath)
  ) {
    throw new Error(`Future codebundle coverage is missing: ${requiredPath}`);
  }
}

console.log('CrabLink TV creator browsing boundary passed.');
console.log('Foundation: creator browse view is projected from the reviewed catalog creator rail.');
console.log('Rules: READY catalog only, creator cards only, crab:// site routes only, sorted and deduped.');
console.log('Search: local bounded creator search over title, subtitle, site name, and profile route.');
console.log('Authority: no invoke, fetch, storage, React, DOM, wallet, ledger, receipts, rewards, ROC, entitlement, or finality behavior was added.');
console.log('PHASE8C_CREATOR_BROWSING_FOUNDATION=GREEN');
console.log('NEXT_PATCH=PHASE9K_LIBRARY_VERIFIED_RENDER_DISPLAY');
