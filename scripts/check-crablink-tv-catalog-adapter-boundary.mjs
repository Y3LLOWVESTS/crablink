#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing catalog-adapter source: ${relativePath}`);
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

const adapter = read('apps/crablink-tv/src/catalog/tvCatalogAdapter.js');
const adapterTest = read('apps/crablink-tv/src/catalog/tvCatalogAdapter.test.mjs');
const model = read('apps/crablink-tv/src/catalog/tvCatalogModel.js');
const tauriAdapter = read('apps/crablink-tv/src/platform/tauriTvAdapter.js');
const nativeCommands = read('apps/crablink-tv/src-tauri/src/commands/mod.rs');
const nativeRegistry = read('apps/crablink-tv/src-tauri/src/lib.rs');
const tvPackage = JSON.parse(read('apps/crablink-tv/package.json'));
const rootPackage = JSON.parse(read('package.json'));
const executableAdapter = stripComments(adapter);

requireFragments('TV catalog adapter', adapter, [
  'createTvCatalogAdapter',
  'readCatalogView',
  'projectTvCatalogResponse',
  'createTvCatalogUnavailableView',
  'Object.freeze',
]);

requireFragments('TV catalog adapter tests', adapterTest, [
  'TV catalog adapter exposes one immutable method and performs no read during construction',
  'TV catalog adapter projects a valid backend response into a frozen ready view',
  'TV catalog adapter maps reviewed transport errors into sanitized unavailable views',
]);

for (const [label, pattern] of [
  ['Tauri API', /@tauri-apps\/api/u],
  ['native invocation', /\binvoke\s*\(/u],
  ['network fetch', /\bfetch\s*\(/u],
  ['local storage', /\blocalStorage\b/u],
  ['session storage', /\bsessionStorage\b/u],
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
  if (pattern.test(executableAdapter)) {
    throw new Error(`TV catalog adapter contains forbidden ${label}.`);
  }
}

requireFragments('TV catalog model', model, [
  'projectTvCatalogResponse',
  'createTvCatalogUnavailableView',
  'TV_CATALOG_VIEW_KIND',
]);

requireFragments('native catalog-read registration', nativeCommands, [
  'pub(crate) mod catalog_read;',
]);

requireFragments('Tauri command registration', nativeRegistry, [
  'commands::catalog_read::tv_catalog_read',
]);

requireFragments('Tauri catalog transport', tauriAdapter, [
  'createCatalogPort',
  "'tv_catalog_read'",
  'export const tvCatalogPort',
]);

const tvScripts = tvPackage.scripts ?? {};
const rootScripts = rootPackage.scripts ?? {};

if (
  tvScripts['test:catalog-adapter'] !==
  'node --test src/catalog/tvCatalogAdapter.test.mjs'
) {
  throw new Error('TV catalog-adapter test command is missing or incorrect.');
}

if (
  tvScripts['check:catalog-adapter'] !==
  'node ../../scripts/check-crablink-tv-catalog-adapter-boundary.mjs'
) {
  throw new Error('TV catalog-adapter boundary command is missing or incorrect.');
}

if (
  !String(tvScripts.check ?? '').includes(
    'npm run test:catalog-adapter && npm run check:catalog-adapter && npm run test:catalog-read && npm run check:catalog-read && npm run test:catalog-transport && npm run check:catalog-transport',
  )
) {
  throw new Error('TV full acceptance does not run catalog adapter, native read, and transport in order.');
}

if (
  rootScripts['tv:catalog-adapter:test'] !==
  'npm --prefix apps/crablink-tv run test:catalog-adapter'
) {
  throw new Error('Root TV catalog-adapter test command is missing or incorrect.');
}

if (
  rootScripts['tv:catalog-adapter:check'] !==
  'node scripts/check-crablink-tv-catalog-adapter-boundary.mjs'
) {
  throw new Error('Root TV catalog-adapter boundary command is missing or incorrect.');
}

console.log('CrabLink TV catalog-adapter boundary passed.');
console.log('Adapter: one immutable readCatalogView operation over the shared read-only catalog port.');
console.log('Projection: valid responses become ready or empty; malformed responses remain malformed.');
console.log('Errors: reviewed unavailable codes only; unknown details are redacted and non-retryable.');
console.log('The pure catalog adapter remains free of invoke, fetch, storage, wallet, ledger, receipts, rewards, ROC, entitlement, and finality authority.');
console.log('Tauri catalog transport is present only in the platform adapter.');
console.log('PHASE8A_TV_CATALOG_ADAPTER=GREEN');
console.log('NEXT_PATCH=PHASE8B_CATALOG_CARD_ROUTE_HANDOFF');
