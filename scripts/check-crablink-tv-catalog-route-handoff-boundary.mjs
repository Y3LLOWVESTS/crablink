#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing catalog route-handoff source: ${relativePath}`);
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

const handoff = read('apps/crablink-tv/src/catalog/tvCatalogRouteHandoff.js');
const handoffExecutable = stripComments(handoff);
const handoffTest = read('apps/crablink-tv/src/catalog/tvCatalogRouteHandoff.test.mjs');
const panel = read('apps/crablink-tv/src/catalog/TvHomeCatalogPanel.jsx');
const homeBoundary = read('scripts/check-crablink-tv-home-catalog-react-boundary.mjs');
const routeRegistry = read('apps/crablink-tv/src/navigation/tvRouteRegistry.js');
const routeRegistryTest = read('apps/crablink-tv/src/navigation/tvRouteRegistry.test.mjs');
const overlayModel = read('apps/crablink-tv/src/navigation/tvOverlayBackModel.js');
const app = read('apps/crablink-tv/src/app/TvApp.jsx');
const tvPackage = JSON.parse(read('apps/crablink-tv/package.json'));
const rootPackage = JSON.parse(read('package.json'));
const makeCodebundle = read('scripts/make_codebundle.sh');
const codebundleBoundary = read('scripts/check-crablink-tv-codebundle-boundary.mjs');

requireFragments('catalog card route handoff model', handoff, [
  'TV_CATALOG_CARD_HANDOFF_KIND',
  'TV_CATALOG_CARD_DEFAULT_SECTIONS',
  'projectTvCatalogCardRouteHandoff',
  'resolveTvRouteInput',
  'requireCrabScheme',
  'chooseTargetSection',
  "reviewed.owner === 'asset'",
  "reviewed.owner === 'site'",
  "reviewed.owner === 'section'",
  'buildProblem',
]);

requireFragments('catalog card route handoff tests', handoffTest, [
  'catalog card route handoff exposes frozen policy constants',
  'asset catalog cards target Library with a bounded detail overlay',
  'creator catalog cards stay on Home as reviewed site routes',
  'section catalog cards only target approved available sections',
  'unapproved catalog card routes become typed problems',
  'missing and unsupported catalog route inputs fail closed',
]);

requireFragments('catalog card panel', panel, [
  'onCatalogItem',
  'data-tv-focus-key={focusKey}',
  'item.crabUrl',
]);

requireFragments('Home catalog React boundary', homeBoundary, [
  'projectTvCatalogCardRouteHandoff',
  'Catalog card route handoff: reviewed by pure route model.',
]);

requireFragments('TV route registry', routeRegistry, [
  'TV_ROUTE_RESULT_KIND',
  'TV_ROUTE_PROBLEM_CODE',
  'resolveTvRouteInput',
]);

requireFragments('TV route registry tests', routeRegistryTest, [
  'approved typed assets preserve canonical identifiers',
  'creator names resolve as site routes',
  'unsupported assets and malformed input fail closed',
]);

requireFragments('TV overlay model', overlayModel, [
  'openTvDetailOverlay',
  'openTvProblemOverlay',
  'returnFocusKey',
]);

requireFragments('TV app catalog card handoff', app, [
  'projectTvCatalogCardRouteHandoff',
  'TV_CATALOG_CARD_HANDOFF_KIND.PROBLEM',
  'inspectCatalogItem',
  'navigateToSection(',
  'openDetail(',
  'openProblem(',
]);

for (const [label, pattern] of [
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
  if (pattern.test(handoffExecutable)) {
    throw new Error(`Catalog card route handoff acquired forbidden ${label}.`);
  }
}

if (/tv_catalog_read/u.test(app)) {
  throw new Error('TvApp must not invoke the native catalog command directly.');
}

if (/readCatalogView/u.test(app)) {
  throw new Error('TvApp must not consume the pure catalog adapter directly.');
}

const tvScripts = tvPackage.scripts ?? {};
const rootScripts = rootPackage.scripts ?? {};

if (
  tvScripts['test:catalog-route-handoff'] !==
  'node --test src/catalog/tvCatalogRouteHandoff.test.mjs'
) {
  throw new Error('TV catalog-route-handoff test script is missing or incorrect.');
}

if (
  tvScripts['check:catalog-route-handoff'] !==
  'node ../../scripts/check-crablink-tv-catalog-route-handoff-boundary.mjs'
) {
  throw new Error('TV catalog-route-handoff boundary script is missing or incorrect.');
}

if (
  !String(tvScripts.check ?? '').includes(
    'npm run test:home-catalog-react && npm run check:home-catalog-react && npm run test:catalog-route-handoff && npm run check:catalog-route-handoff',
  )
) {
  throw new Error('TV full acceptance does not run Home catalog then catalog route handoff in order.');
}

if (
  rootScripts['tv:catalog-route-handoff:test'] !==
  'npm --prefix apps/crablink-tv run test:catalog-route-handoff'
) {
  throw new Error('Root catalog-route-handoff test script is missing or incorrect.');
}

if (
  rootScripts['tv:catalog-route-handoff:check'] !==
  'node scripts/check-crablink-tv-catalog-route-handoff-boundary.mjs'
) {
  throw new Error('Root catalog-route-handoff boundary script is missing or incorrect.');
}

for (const requiredPath of [
  'apps/crablink-tv/src/catalog/tvCatalogRouteHandoff.js',
  'apps/crablink-tv/src/catalog/tvCatalogRouteHandoff.test.mjs',
  'scripts/check-crablink-tv-catalog-route-handoff-boundary.mjs',
]) {
  if (
    !makeCodebundle.includes(requiredPath) &&
    !codebundleBoundary.includes(requiredPath)
  ) {
    throw new Error(`Future codebundle coverage is missing: ${requiredPath}`);
  }
}

console.log('CrabLink TV catalog card route-handoff boundary passed.');
console.log('Handoff: catalog cards are re-reviewed through the TV route registry before navigation.');
console.log('Targets: asset cards open Library detail; creator/site cards stay Home; approved section cards target their section.');
console.log('Failures: unapproved, unsupported, or malformed card routes become typed problem overlays.');
console.log('Authority: no invoke, fetch, storage, wallet, ledger, receipts, rewards, ROC, entitlement, or finality behavior was added.');
console.log('PHASE8B_CATALOG_CARD_ROUTE_HANDOFF=GREEN');
console.log('NEXT_PATCH=PHASE9K_LIBRARY_VERIFIED_RENDER_DISPLAY');
