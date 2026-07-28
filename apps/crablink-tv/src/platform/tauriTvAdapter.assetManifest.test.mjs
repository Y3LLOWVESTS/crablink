import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const appRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);

const source = fs.readFileSync(
  path.join(appRoot, 'src/platform/tauriTvAdapter.js'),
  'utf8',
);

const executableSource = source
  .replace(/\/\*[\s\S]*?\*\//gu, '')
  .replace(/^\s*\/\/.*$/gmu, '');

test('Tauri TV adapter exposes one asset-manifest adapter object', () => {
  assert.match(
    source,
    /function\s+checkAssetManifest\s*\(\s*request\s*\)\s*\{/u,
  );

  assert.match(
    source,
    /export\s+const\s+tvAssetManifestAdapter\s*=/u,
  );

  assert.match(
    source,
    /Object\.freeze\s*\(\s*\{\s*checkAssetManifest,?\s*\}\s*\)/su,
  );
});

test('Tauri TV asset-manifest adapter invokes only the fixed native command', () => {
  assert.match(
    source,
    /invoke\s*\(\s*['"]tv_asset_manifest_check['"]\s*,\s*\{\s*request\s*\}\s*,?\s*\)/su,
  );

  assert.doesNotMatch(
    source,
    /function\s+checkAssetManifest\s*\([^)]*(?:url|origin|path|command)/iu,
  );

  assert.doesNotMatch(
    source,
    /invoke\s*\(\s*(?:command|normalized|url|path)/iu,
  );
});

test('Tauri TV asset-manifest adapter does not acquire transport or authority', () => {
  for (const forbidden of [
    /\bfetch\s*\(/u,
    /\blocalStorage\b/u,
    /\bsessionStorage\b/u,
    /\bwallet\b/iu,
    /\bledger\b/iu,
    /\breceipt\b/iu,
    /\breward\b/iu,
    /\broc\b/iu,
    /\bentitlement\b/iu,
    /\bfinality\b/iu,
  ]) {
    assert.doesNotMatch(executableSource, forbidden);
  }
});
