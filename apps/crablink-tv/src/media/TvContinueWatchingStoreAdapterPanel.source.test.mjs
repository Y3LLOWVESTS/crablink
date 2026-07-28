import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here =
  path.dirname(fileURLToPath(import.meta.url));

const componentPath =
  path.join(here, 'TvContinueWatchingStoreAdapterPanel.jsx');

const component =
  fs.readFileSync(componentPath, 'utf8');

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/^\s*\/\/[!/]?.*$/gmu, '');
}

test('continue watching store adapter panel renders operation metadata and actions', () => {
  assert.match(component, /projectTvContinueWatchingStoreAdapter/u);
  assert.match(component, /data-store-adapter-state=\{adapter\.state\}/u);
  assert.match(component, /data-store-operation=\{adapter\.operation\}/u);
  assert.match(component, /data-store-write-requested=\{String\(adapter\.storeWriteRequested\)\}/u);
  assert.match(component, /data-storage-side-effect-allowed=\{String\(/u);
  assert.match(component, /data-adapter-execution-allowed=\{String\(/u);
  assert.match(component, /data-release-operation=\{adapter\.releaseOperation\}/u);
  assert.match(component, /data-release-side-effect-allowed=\{String\(/u);
  assert.match(component, /data-remote-control="queue-store-operation"/u);
  assert.match(component, /data-remote-control="queue-release-operation"/u);
});

test('continue watching store adapter panel does not add media, direct storage, source creation, or authority', () => {
  const executable = stripComments(component);

  for (const forbidden of [
    '<video',
    '<audio',
    'src=',
    'autoPlay',
    'fetch(',
    'invoke(',
    'URL.createObjectURL',
    'URL.revokeObjectURL',
    'new Blob',
    'dangerouslySetInnerHTML',
    'innerHTML',
    'localStorage',
    'sessionStorage',
    'indexedDB',
    'wallet',
    'ledger',
    'entitlement',
    'finality',
    'providerFallback',
    'directProvider',
  ]) {
    assert.equal(
      executable.includes(forbidden),
      false,
      `forbidden component fragment present: ${forbidden}`,
    );
  }
});
