#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing Home catalog source: ${relativePath}`);
  }

  return fs.readFileSync(absolutePath, 'utf8');
}

function requireFragments(label, source, fragments) {
  for (const fragment of fragments) {
    if (!source.includes(fragment)) {
      throw new Error(`${label} is missing: ${fragment}`);
    }
  }
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/^\s*\/\/.*$/gmu, '');
}

const hook = read('apps/crablink-tv/src/catalog/useTvHomeCatalog.js');
const panel = read('apps/crablink-tv/src/catalog/TvHomeCatalogPanel.jsx');
const testSource = read('apps/crablink-tv/src/catalog/TvHomeCatalogPanel.source.test.mjs');
const interaction = read('apps/crablink-tv/src/catalog/tvCatalogInteraction.js');
const adapter = read('apps/crablink-tv/src/catalog/tvCatalogAdapter.js');
const model = read('apps/crablink-tv/src/catalog/tvCatalogModel.js');
const tauriAdapter = read('apps/crablink-tv/src/platform/tauriTvAdapter.js');
const app = read('apps/crablink-tv/src/app/TvApp.jsx');
const css = read('apps/crablink-tv/src/styles/tv.css');
const tvPackage = JSON.parse(read('apps/crablink-tv/package.json'));
const rootPackage = JSON.parse(read('package.json'));
const makeCodebundle = read('scripts/make_codebundle.sh');
const codebundleBoundary = read('scripts/check-crablink-tv-codebundle-boundary.mjs');

const hookExecutable = stripComments(hook);
const panelExecutable = stripComments(panel);

requireFragments('Home catalog hook', hook, [
  'useTvHomeCatalog',
  'tvCatalogPort',
  'createTvCatalogAdapter',
  'createTvCatalogInteraction',
  'loadHomeCatalog',
  'refreshHomeCatalog',
  'summarizeCatalogState',
]);

requireFragments('Home catalog panel', panel, [
  'TvHomeCatalogPanel',
  'TV_CATALOG_VIEW_KIND',
  'home-catalog-load',
  'home-catalog-refresh',
  'tv-home-catalog',
  'tv-catalog-rails',
  'tv-catalog-card',
  'onCatalogItem',
]);

requireFragments('Home catalog source tests', testSource, [
  'Home catalog hook wires the reviewed controller without automatic loading',
  'Home catalog panel renders manual controls and backend-derived rails only',
  'TV app integrates Home catalog without direct catalog transport authority',
  'Home catalog CSS exposes TV-friendly rail and card surfaces',
]);

requireFragments('catalog interaction controller', interaction, [
  'createTvCatalogInteraction',
  'loadCatalog',
  'refreshCatalog',
  'operationVersion',
]);

requireFragments('catalog adapter', adapter, [
  'createTvCatalogAdapter',
  'readCatalogView',
]);

requireFragments('catalog model', model, [
  'TV_CATALOG_VIEW_KIND',
  'TV_CATALOG_RAIL',
]);

requireFragments('Tauri catalog transport', tauriAdapter, [
  'export const tvCatalogPort',
  "'tv_catalog_read'",
]);

requireFragments('TV app Home integration', app, [
  'useTvHomeCatalog',
  'TvHomeCatalogPanel',
  "activeSectionId === 'home'",
  'catalogState',
  'loadHomeCatalog',
  'refreshHomeCatalog',
  'inspectCatalogItem',
  'projectTvCatalogCardRouteHandoff',
]);

requireFragments('Home catalog CSS', css, [
  '.tv-home-catalog',
  '.tv-catalog-actions',
  '.tv-catalog-rails',
  '.tv-catalog-rail',
  '.tv-catalog-row',
  '.tv-catalog-card',
]);

for (const [label, source] of [
  ['Home catalog hook', hookExecutable],
  ['Home catalog panel', panelExecutable],
]) {
  for (const [forbiddenLabel, pattern] of [
    ['direct invoke', /\binvoke\s*\(/u],
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

if (/tv_catalog_read/u.test(app)) {
  throw new Error('TvApp must not invoke the native catalog command directly.');
}

if (/readCatalogView/u.test(app)) {
  throw new Error('TvApp must not consume the pure adapter directly.');
}

const tvScripts = tvPackage.scripts ?? {};
const rootScripts = rootPackage.scripts ?? {};

if (
  tvScripts['test:home-catalog-react'] !==
  'node --test src/catalog/TvHomeCatalogPanel.source.test.mjs'
) {
  throw new Error('TV Home catalog React test script is missing or incorrect.');
}

if (
  tvScripts['check:home-catalog-react'] !==
  'node ../../scripts/check-crablink-tv-home-catalog-react-boundary.mjs'
) {
  throw new Error('TV Home catalog React boundary script is missing or incorrect.');
}

if (
  !String(tvScripts.check ?? '').includes(
    'npm run test:catalog-interaction && npm run check:catalog-interaction && npm run test:home-catalog-react && npm run check:home-catalog-react',
  )
) {
  throw new Error('TV full acceptance does not run catalog interaction then Home catalog React in order.');
}

if (
  rootScripts['tv:home-catalog-react:test'] !==
  'npm --prefix apps/crablink-tv run test:home-catalog-react'
) {
  throw new Error('Root Home catalog React test script is missing or incorrect.');
}

if (
  rootScripts['tv:home-catalog-react:check'] !==
  'node scripts/check-crablink-tv-home-catalog-react-boundary.mjs'
) {
  throw new Error('Root Home catalog React boundary script is missing or incorrect.');
}

for (const requiredPath of [
  'apps/crablink-tv/src/catalog/useTvHomeCatalog.js',
  'apps/crablink-tv/src/catalog/TvHomeCatalogPanel.jsx',
  'apps/crablink-tv/src/catalog/TvHomeCatalogPanel.source.test.mjs',
  'scripts/check-crablink-tv-home-catalog-react-boundary.mjs',
]) {
  if (
    !makeCodebundle.includes(requiredPath) &&
    !codebundleBoundary.includes(requiredPath)
  ) {
    throw new Error(`Future codebundle coverage is missing: ${requiredPath}`);
  }
}

console.log('CrabLink TV Home catalog React boundary passed.');
console.log('Home: visible manual-load catalog panel connected through the reviewed controller.');
console.log('Lifecycle: loading, unavailable, malformed, empty, and ready states are rendered truthfully.');
console.log('Rails and cards: backend-derived only; no synthetic rows, polling, or direct native command authority.');
console.log('Catalog card route handoff: reviewed by pure route model.');
console.log('Remote focus: load, refresh, and catalog cards are focusable TV controls.');
console.log('Wallet, ledger, receipts, rewards, ROC, entitlement, and finality authority: absent.');
console.log('PHASE8B_HOME_CATALOG_REACT_INTEGRATION=GREEN');
console.log('NEXT_PATCH=PHASE9K_LIBRARY_VERIFIED_RENDER_DISPLAY');
