#!/usr/bin/env node
/**
 * RO:WHAT — Validates the shared read-only CrabLink catalog port and package registration.
 * RO:WHY — TV Phase 8 needs a portable catalog-read boundary before adapters or transport.
 * RO:INTERACTS — @crablink/platform contract, package exports, root acceptance scripts.
 * RO:INVARIANTS — exactly readCatalog; immutable; no construction-time read or ambient authority.
 * RO:SECURITY — no fetch, invoke, storage, wallet, ledger, receipt, reward, ROC, entitlement, or finality authority.
 * RO:TEST — npm run platform:catalog:check.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const paths = {
  contract: 'packages/crablink-platform/src/contracts/catalogPort.js',
  tests: 'packages/crablink-platform/src/contracts/catalogPort.test.mjs',
  index: 'packages/crablink-platform/src/index.js',
  platformPackage: 'packages/crablink-platform/package.json',
  rootPackage: 'package.json',
};

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing catalog-port source: ${relativePath}`);
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

const contract = read(paths.contract);
const tests = read(paths.tests);
const index = read(paths.index);
const platformPackage = JSON.parse(read(paths.platformPackage));
const rootPackage = JSON.parse(read(paths.rootPackage));

requireFragments('catalog contract', contract, [
  'createMethodPort',
  'createCatalogPort',
  "'readCatalog'",
  "'catalog port'",
]);
requireFragments('platform exports', index, [
  'createCatalogPort',
  './contracts/catalogPort.js',
]);

for (const fragment of [
  'catalog port exposes exactly one immutable read method',
  'catalog port fails closed when readCatalog is absent',
  'catalog port construction performs no read',
  'catalog port preserves adapter results without inventing success',
  'catalog port preserves adapter errors',
]) {
  if (!tests.includes(fragment)) {
    throw new Error(`Catalog-port test is missing: ${fragment}`);
  }
}

for (const [label, pattern] of [
  ['Tauri API', /@tauri-apps\/api/],
  ['Chrome API', /\bchrome\./],
  ['native invoke', /\binvoke\s*\(/],
  ['network fetch', /\bfetch\s*\(/],
  ['local storage', /\blocalStorage\b/],
  ['session storage', /\bsessionStorage\b/],
]) {
  if (pattern.test(contract)) {
    throw new Error(`Catalog port contains forbidden ${label}.`);
  }
}

const scripts = platformPackage.scripts ?? {};
assert.equal(
  platformPackage.exports?.['./catalog'],
  './src/contracts/catalogPort.js',
  'Platform catalog export is missing or incorrect.',
);
assert.equal(
  scripts['test:catalog'],
  'node --test src/contracts/catalogPort.test.mjs',
  'Platform catalog test command is missing or incorrect.',
);
assert.equal(
  scripts['check:catalog-boundary'],
  'node ../../scripts/check-crablink-platform-catalog-boundary.mjs',
  'Platform catalog boundary command is missing or incorrect.',
);
assert.equal(
  scripts.check,
  'npm run test && npm run test:catalog && npm run check:boundary && npm run check:catalog-boundary && npm run check:memory',
  'Platform acceptance command does not include catalog checks.',
);
assert.equal(
  rootPackage.scripts?.['platform:catalog:test'],
  'npm --prefix packages/crablink-platform run test:catalog',
  'Root catalog test command is missing or incorrect.',
);
assert.equal(
  rootPackage.scripts?.['platform:catalog:check'],
  'node scripts/check-crablink-platform-catalog-boundary.mjs',
  'Root catalog boundary command is missing or incorrect.',
);

const module = await import(
  pathToFileURL(path.join(root, paths.contract)).href,
);
const readCatalog = async () => ({ state: 'ready' });
const port = module.createCatalogPort({
  readCatalog,
  hiddenAuthority: async () => true,
});
assert.deepEqual(Object.keys(port), ['readCatalog']);
assert.equal(Object.isFrozen(port), true);
assert.equal(port.readCatalog, readCatalog);
assert.equal(port.hiddenAuthority, undefined);

console.log('CrabLink read-only catalog-port boundary passed.');
console.log('Catalog port: exactly one immutable readCatalog method.');
console.log('Adapter, transport, native command, and economic authority remain absent.');
