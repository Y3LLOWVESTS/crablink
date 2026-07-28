#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing catalog-transport source: ${relativePath}`);
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

const tauriAdapter = read('apps/crablink-tv/src/platform/tauriTvAdapter.js');
const tauriExecutable = stripComments(tauriAdapter);
const transportTest = read('apps/crablink-tv/src/platform/tauriTvAdapter.catalog.test.mjs');
const catalogAdapter = read('apps/crablink-tv/src/catalog/tvCatalogAdapter.js');
const catalogModel = read('apps/crablink-tv/src/catalog/tvCatalogModel.js');
const catalogPort = read('packages/crablink-platform/src/contracts/catalogPort.js');
const nativeRead = read('apps/crablink-tv/src-tauri/src/commands/catalog_read.rs');
const nativeCommands = read('apps/crablink-tv/src-tauri/src/commands/mod.rs');
const nativeRegistry = read('apps/crablink-tv/src-tauri/src/lib.rs');
const tvPackage = JSON.parse(read('apps/crablink-tv/package.json'));
const rootPackage = JSON.parse(read('package.json'));
const tvApp = read('apps/crablink-tv/src/app/TvApp.jsx');

requireFragments('Tauri catalog transport', tauriAdapter, [
  'createCatalogPort',
  'function readCatalog()',
  "'tv_catalog_read'",
  'export const tvCatalogPort',
  'createCatalogPort({',
  'readCatalog',
]);

if (!/function\s+readCatalog\s*\(\s*\)\s*\{/u.test(tauriAdapter)) {
  throw new Error('readCatalog must accept zero caller arguments.');
}

if (!/invoke\s*\(\s*['"]tv_catalog_read['"]\s*,?\s*\)/u.test(tauriAdapter)) {
  throw new Error('readCatalog must invoke exactly tv_catalog_read.');
}

if (/invoke\s*\(\s*(?:command|normalized|request|url|path)/iu.test(tauriAdapter)) {
  throw new Error('Tauri adapter must not expose dynamic command invocation.');
}

for (const [label, pattern] of [
  ['network fetch', /\bfetch\s*\(/u],
  ['local storage', /\blocalStorage\b/u],
  ['session storage', /\bsessionStorage\b/u],
  ['wallet authority', /\bwallet\b/iu],
  ['ledger authority', /\bledger\b/iu],
  ['receipt authority', /\breceipt\b/iu],
  ['reward authority', /\breward\b/iu],
  ['ROC authority', /\broc\b/iu],
  ['entitlement authority', /\bentitlement\b/iu],
  ['finality authority', /\bfinality\b/iu],
]) {
  if (pattern.test(tauriExecutable)) {
    throw new Error(`Tauri catalog transport contains forbidden ${label}.`);
  }
}

requireFragments('catalog transport tests', transportTest, [
  'Tauri TV adapter exposes catalog through one shared immutable port',
  'Tauri TV catalog transport invokes only the fixed native catalog command',
  'Tauri TV catalog transport does not acquire broad runtime authority',
]);

requireFragments('pure catalog adapter', catalogAdapter, [
  'createTvCatalogAdapter',
  'readCatalogView',
  'projectTvCatalogResponse',
  'createTvCatalogUnavailableView',
]);

if (/\binvoke\s*\(/u.test(catalogAdapter)) {
  throw new Error('Pure TV catalog adapter must not invoke Tauri directly.');
}

requireFragments('catalog model', catalogModel, [
  'projectTvCatalogResponse',
  'createTvCatalogUnavailableView',
  'TV_CATALOG_VIEW_KIND',
]);

requireFragments('shared catalog port', catalogPort, [
  'createCatalogPort',
  "'readCatalog'",
]);

requireFragments('native catalog read', nativeRead, [
  'pub async fn tv_catalog_read()',
  'const CATALOG_PATH: &str = "/v1/tv/catalog"',
  'const MAX_CATALOG_RESPONSE_BYTES: usize = 256 * 1024',
  'reqwest::redirect::Policy::none()',
  '.no_proxy()',
]);

requireFragments('native command registration', nativeCommands, [
  'pub(crate) mod catalog_read;',
]);

requireFragments('Tauri command registration', nativeRegistry, [
  'commands::catalog_read::tv_catalog_read',
]);

for (const forbidden of [
  'tvCatalogPort',
  'readCatalogView',
  'tv_catalog_read',
]) {
  if (tvApp.includes(forbidden)) {
    throw new Error(`React catalog integration was added before the next slice: ${forbidden}`);
  }
}

const tvScripts = tvPackage.scripts ?? {};
const rootScripts = rootPackage.scripts ?? {};

if (
  tvScripts['test:catalog-transport'] !==
  'node --test src/platform/tauriTvAdapter.catalog.test.mjs'
) {
  throw new Error('TV catalog-transport test script is missing or incorrect.');
}

if (
  tvScripts['check:catalog-transport'] !==
  'node ../../scripts/check-crablink-tv-catalog-transport-boundary.mjs'
) {
  throw new Error('TV catalog-transport boundary script is missing or incorrect.');
}

if (
  !String(tvScripts.check ?? '').includes(
    'npm run test:catalog-read && npm run check:catalog-read && npm run test:catalog-transport && npm run check:catalog-transport',
  )
) {
  throw new Error('TV full acceptance does not run catalog read then catalog transport in order.');
}

if (
  rootScripts['tv:catalog-transport:test'] !==
  'npm --prefix apps/crablink-tv run test:catalog-transport'
) {
  throw new Error('Root TV catalog-transport test script is missing or incorrect.');
}

if (
  rootScripts['tv:catalog-transport:check'] !==
  'node scripts/check-crablink-tv-catalog-transport-boundary.mjs'
) {
  throw new Error('Root TV catalog-transport boundary script is missing or incorrect.');
}

console.log('CrabLink TV catalog transport boundary passed.');
console.log('Transport: shared read-only catalog port backed by fixed tv_catalog_read.');
console.log('Native route contract: reviewed-origin GET /v1/tv/catalog remains the only catalog command.');
console.log('Pure adapter: still projects backend results without Tauri invoke authority.');
console.log('React Home catalog integration: manual-load panel active.');
console.log('Wallet, ledger, receipts, rewards, ROC, entitlement, and finality authority: absent.');
console.log('PHASE8A_TAURI_CATALOG_TRANSPORT=GREEN');
console.log('NEXT_PATCH=PHASE8B_CATALOG_CARD_ROUTE_HANDOFF');
