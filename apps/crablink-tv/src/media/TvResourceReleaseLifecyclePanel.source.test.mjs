import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here =
  path.dirname(fileURLToPath(import.meta.url));

const componentPath =
  path.join(here, 'TvResourceReleaseLifecyclePanel.jsx');

const component =
  fs.readFileSync(componentPath, 'utf8');

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/^\s*\/\/[!/]?.*$/gmu, '');
}

test('resource release lifecycle panel renders lifecycle metadata and queue action', () => {
  assert.match(component, /projectTvResourceReleaseLifecycle/u);
  assert.match(component, /data-release-lifecycle-state=\{lifecycle\.state\}/u);
  assert.match(component, /data-release-reason=\{lifecycle\.releaseReason \|\| 'none'\}/u);
  assert.match(component, /data-release-plan-ready=\{String\(lifecycle\.releasePlanReady\)\}/u);
  assert.match(component, /data-release-execution-allowed=\{String\(/u);
  assert.match(component, /data-player-mutation-allowed=\{String\(/u);
  assert.match(component, /data-handle-release-allowed=\{String\(/u);
  assert.match(component, /data-storage-flush-side-effect-allowed=\{String\(/u);
  assert.match(component, /data-remote-control="release-lifecycle-ready"/u);
});

test('resource release lifecycle panel does not add media, direct release, storage, source creation, or authority', () => {
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
