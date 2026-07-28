import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here =
  path.dirname(fileURLToPath(import.meta.url));

const componentPath =
  path.join(here, 'TvResourceReleaseExecutorBoundaryPanel.jsx');

const component =
  fs.readFileSync(componentPath, 'utf8');

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/^\s*\/\/[!/]?.*$/gmu, '');
}

test('resource release executor boundary panel renders command metadata and queue action', () => {
  assert.match(component, /projectTvResourceReleaseExecutorBoundary/u);
  assert.match(component, /data-release-executor-state=\{boundary\.state\}/u);
  assert.match(component, /data-release-executor-operation=\{boundary\.operation\}/u);
  assert.match(component, /data-executor-boundary-ready=\{String\(/u);
  assert.match(component, /data-direct-execution-allowed=\{String\(/u);
  assert.match(component, /data-player-mutation-allowed=\{String\(/u);
  assert.match(component, /data-storage-mutation-allowed=\{String\(/u);
  assert.match(component, /data-handle-release-allowed=\{String\(/u);
  assert.match(component, /data-executor-command=\{command\.command\}/u);
  assert.match(component, /data-direct-effect-allowed=\{String\(/u);
  assert.match(component, /data-remote-control="queue-release-executor"/u);
});

test('resource release executor boundary panel does not add media, direct release, storage, source creation, or authority', () => {
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
