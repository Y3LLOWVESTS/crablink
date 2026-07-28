#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing catalog-read source: ${relativePath}`);
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

const catalogRead = read('apps/crablink-tv/src-tauri/src/commands/catalog_read.rs');
const commands = read('apps/crablink-tv/src-tauri/src/commands/mod.rs');
const lib = read('apps/crablink-tv/src-tauri/src/lib.rs');
const cargo = read('apps/crablink-tv/src-tauri/Cargo.toml');
const tauriAdapter = read('apps/crablink-tv/src/platform/tauriTvAdapter.js');
const tauriExecutable = stripComments(tauriAdapter);
const catalogAdapter = read('apps/crablink-tv/src/catalog/tvCatalogAdapter.js');
const catalogModel = read('apps/crablink-tv/src/catalog/tvCatalogModel.js');
const tvApp = read('apps/crablink-tv/src/app/TvApp.jsx');
const tvPackage = JSON.parse(read('apps/crablink-tv/package.json'));
const rootPackage = JSON.parse(read('package.json'));
const executable = stripComments(catalogRead);

requireFragments('native catalog read', catalogRead, [
  'pub async fn tv_catalog_read()',
  'perform_catalog_read',
  'const CATALOG_PATH: &str = "/v1/tv/catalog"',
  'const MAX_CATALOG_RESPONSE_BYTES: usize = 256 * 1024',
  'reqwest::redirect::Policy::none()',
  '.no_proxy()',
  '.connect_timeout',
  '.timeout',
  '.content_length()',
  '.chunk()',
  'serde_json::from_slice',
  'TvCatalogReadError',
  '"gateway_unconfigured"',
  '"gateway_unreachable"',
  '"catalog_unavailable"',
  'GET /v1/tv/catalog HTTP/1.1',
]);

if (!/pub\s+async\s+fn\s+tv_catalog_read\s*\(\s*\)/u.test(catalogRead)) {
  throw new Error('tv_catalog_read must accept zero caller arguments.');
}

for (const [label, pattern] of [
  ['caller URL', /tv_catalog_read\s*\([^)]*(?:url|origin|path)/isu],
  ['POST transport', /\.post\s*\(/u],
  ['credentials', /authorization|bearer|cookie/iu],
  ['wallet authority', /\bwallet\b/iu],
  ['ledger authority', /\bledger\b/iu],
  ['receipt authority', /\breceipt\b/iu],
  ['reward authority', /\breward\b/iu],
  ['finality authority', /\bfinality\b/iu],
]) {
  if (pattern.test(executable)) {
    throw new Error(`native catalog read contains forbidden ${label}`);
  }
}

requireFragments('command module registry', commands, [
  'pub(crate) mod catalog_read;',
]);

requireFragments('Tauri command registry', lib, [
  'commands::catalog_read::tv_catalog_read',
]);

requireFragments('Rust transport dependencies', cargo, [
  'reqwest = { version = "0.12"',
  'default-features = false',
  '"rustls-tls"',
  '"stream"',
  'serde_json = "1"',
]);

requireFragments('catalog model', catalogModel, [
  "'crablink.tv.catalog.v1'",
  'TV_CATALOG_MAX_RAILS',
  'TV_CATALOG_MAX_ITEMS_PER_RAIL',
]);

requireFragments('Tauri catalog transport', tauriAdapter, [
  'createCatalogPort',
  'function readCatalog()',
  "'tv_catalog_read'",
  'export const tvCatalogPort',
]);

if (!/function\s+readCatalog\s*\(\s*\)\s*\{/u.test(tauriAdapter)) {
  throw new Error('Tauri catalog transport must use a zero-argument readCatalog operation.');
}

if (!/invoke\s*\(\s*['"]tv_catalog_read['"]\s*,?\s*\)/u.test(tauriAdapter)) {
  throw new Error('Tauri catalog transport must call the fixed tv_catalog_read command.');
}

for (const [label, pattern] of [
  ['dynamic invoke', /invoke\s*\(\s*(?:command|normalized|request|url|path)/iu],
  ['network fetch', /\bfetch\s*\(/u],
  ['storage', /\b(?:localStorage|sessionStorage)\b/u],
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

if (/\binvoke\s*\(/u.test(catalogAdapter)) {
  throw new Error('Pure TV catalog adapter must not invoke Tauri directly.');
}

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
  tvScripts['test:catalog-read'] !==
  'cargo test --manifest-path src-tauri/Cargo.toml --offline commands::catalog_read::tests'
) {
  throw new Error('TV catalog-read focused test command is missing or incorrect.');
}

if (
  tvScripts['check:catalog-read'] !==
  'node ../../scripts/check-crablink-tv-catalog-read-boundary.mjs'
) {
  throw new Error('TV catalog-read boundary command is missing or incorrect.');
}

if (
  !String(tvScripts.check ?? '').includes(
    'npm run test:catalog-adapter && npm run check:catalog-adapter && npm run test:catalog-read && npm run check:catalog-read && npm run test:catalog-transport && npm run check:catalog-transport',
  )
) {
  throw new Error('TV full acceptance does not run catalog adapter, native catalog read, and catalog transport in order.');
}

if (
  rootScripts['tv:catalog-read:test'] !==
  'npm --prefix apps/crablink-tv run test:catalog-read'
) {
  throw new Error('Root TV catalog-read test command is missing or incorrect.');
}

if (
  rootScripts['tv:catalog-read:check'] !==
  'node scripts/check-crablink-tv-catalog-read-boundary.mjs'
) {
  throw new Error('Root TV catalog-read boundary command is missing or incorrect.');
}

console.log('CrabLink TV native catalog-read boundary passed.');
console.log('Operation: zero-argument FetchHomeCatalog through tv_catalog_read.');
console.log('Route contract: fixed reviewed-origin GET /v1/tv/catalog.');
console.log('Bounds: reviewed timeout, redirects/proxies disabled, 256 KiB streamed JSON maximum.');
console.log('Errors: gateway_unconfigured, gateway_unreachable, or catalog_unavailable only.');
console.log('Backend implementation: not claimed by this client contract.');
console.log('Tauri JavaScript transport: read-only fixed-command catalog port.');
console.log('React Home catalog integration: manual-load panel active.');
console.log('Wallet, ledger, receipts, rewards, ROC, entitlement, and finality authority: absent.');
console.log('PHASE8A_FIXED_NATIVE_CATALOG_READ=GREEN');
console.log('NEXT_PATCH=PHASE8B_CATALOG_CARD_ROUTE_HANDOFF');
