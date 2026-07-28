#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing catalog-interaction source: ${relativePath}`);
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

const interaction = read('apps/crablink-tv/src/catalog/tvCatalogInteraction.js');
const executableInteraction = stripComments(interaction);
const interactionTest = read('apps/crablink-tv/src/catalog/tvCatalogInteraction.test.mjs');
const catalogAdapter = read('apps/crablink-tv/src/catalog/tvCatalogAdapter.js');
const catalogModel = read('apps/crablink-tv/src/catalog/tvCatalogModel.js');
const tauriAdapter = read('apps/crablink-tv/src/platform/tauriTvAdapter.js');
const tvApp = read('apps/crablink-tv/src/app/TvApp.jsx');
const tvPackage = JSON.parse(read('apps/crablink-tv/package.json'));
const rootPackage = JSON.parse(read('package.json'));
const makeCodebundle = read('scripts/make_codebundle.sh');
const codebundleBoundary = read('scripts/check-crablink-tv-codebundle-boundary.mjs');

requireFragments('catalog interaction controller', interaction, [
  'INITIAL_TV_CATALOG_INTERACTION_STATE',
  'createTvCatalogInteraction',
  'createTvCatalogLoadingView',
  'createTvCatalogUnavailableView',
  'readCatalogView',
  'loadCatalog',
  'refreshCatalog',
  'getState',
  'inFlight',
  'operationVersion',
]);

requireFragments('catalog interaction tests', interactionTest, [
  'catalog interaction starts immutable and performs no read during construction',
  'catalog interaction publishes loading then ready view from the adapter',
  'duplicate catalog loads share one in-flight operation',
  'catalog refresh supersedes a slower previous load',
  'catalog interaction preserves sanitized unavailable views',
  'catalog interaction fails closed for thrown or malformed adapter results',
]);

requireFragments('catalog adapter', catalogAdapter, [
  'createTvCatalogAdapter',
  'readCatalogView',
  'projectTvCatalogResponse',
]);

requireFragments('catalog model', catalogModel, [
  'TV_CATALOG_VIEW_KIND',
  'createTvCatalogLoadingView',
  'createTvCatalogUnavailableView',
]);

requireFragments('Tauri catalog transport', tauriAdapter, [
  'export const tvCatalogPort',
  "'tv_catalog_read'",
]);

for (const [label, pattern] of [
  ['Tauri API', /@tauri-apps\/api/u],
  ['native invocation', /\binvoke\s*\(/u],
  ['network fetch', /\bfetch\s*\(/u],
  ['automatic polling', /\bsetInterval\s*\(/u],
  ['timer polling', /\bsetTimeout\s*\(/u],
  ['local storage', /\blocalStorage\b/u],
  ['session storage', /\bsessionStorage\b/u],
  ['indexed storage', /\bindexedDB\b/u],
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
  if (pattern.test(executableInteraction)) {
    throw new Error(`Catalog interaction acquired forbidden ${label}.`);
  }
}

for (const forbidden of [
  'createTvCatalogInteraction',
  'readCatalogView',
  'tvCatalogPort',
]) {
  if (tvApp.includes(forbidden)) {
    throw new Error(`React catalog integration was added before the next slice: ${forbidden}`);
  }
}

const tvScripts = tvPackage.scripts ?? {};
const rootScripts = rootPackage.scripts ?? {};

if (
  tvScripts['test:catalog-interaction'] !==
  'node --test src/catalog/tvCatalogInteraction.test.mjs'
) {
  throw new Error('TV catalog-interaction test command is missing or incorrect.');
}

if (
  tvScripts['check:catalog-interaction'] !==
  'node ../../scripts/check-crablink-tv-catalog-interaction-boundary.mjs'
) {
  throw new Error('TV catalog-interaction boundary command is missing or incorrect.');
}

if (
  !String(tvScripts.check ?? '').includes(
    'npm run test:catalog-transport && npm run check:catalog-transport && npm run test:catalog-interaction && npm run check:catalog-interaction',
  )
) {
  throw new Error('TV full acceptance does not run catalog transport then catalog interaction in order.');
}

if (
  rootScripts['tv:catalog-interaction:test'] !==
  'npm --prefix apps/crablink-tv run test:catalog-interaction'
) {
  throw new Error('Root TV catalog-interaction test script is missing or incorrect.');
}

if (
  rootScripts['tv:catalog-interaction:check'] !==
  'node scripts/check-crablink-tv-catalog-interaction-boundary.mjs'
) {
  throw new Error('Root TV catalog-interaction boundary script is missing or incorrect.');
}

for (const requiredPath of [
  'apps/crablink-tv/src/catalog/tvCatalogInteraction.js',
  'apps/crablink-tv/src/catalog/tvCatalogInteraction.test.mjs',
  'scripts/check-crablink-tv-catalog-interaction-boundary.mjs',
]) {
  if (
    !makeCodebundle.includes(requiredPath) &&
    !codebundleBoundary.includes(requiredPath)
  ) {
    throw new Error(`Future codebundle coverage is missing: ${requiredPath}`);
  }
}

console.log('CrabLink TV catalog interaction boundary passed.');
console.log('Controller: explicit loadCatalog and refreshCatalog over the pure catalog adapter.');
console.log('Lifecycle: immutable loading state, duplicate in-flight sharing, stale refresh suppression, and sanitized unavailable fallback.');
console.log('React Home catalog integration: manual-load panel active.');
console.log('Automatic polling, invoke, fetch, storage, wallet, ledger, receipts, rewards, ROC, entitlement, and finality authority: absent.');
console.log('PHASE8A_CATALOG_INTERACTION_CONTROLLER=GREEN');
console.log('NEXT_PATCH=PHASE8B_CATALOG_CARD_ROUTE_HANDOFF');
