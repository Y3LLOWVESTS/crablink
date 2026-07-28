import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here =
  path.dirname(fileURLToPath(import.meta.url));

const componentPath =
  path.join(here, 'TvContinueWatchingResourcePanel.jsx');

const component =
  fs.readFileSync(componentPath, 'utf8');

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/^\s*\/\/[!/]?.*$/gmu, '');
}

test('continue watching resource panel renders truth metadata and actions', () => {
  assert.match(component, /projectTvContinueWatchingResourceTruth/u);
  assert.match(component, /data-continue-watching-state=\{truth\.state\}/u);
  assert.match(component, /data-media-kind=\{truth\.mediaKind\}/u);
  assert.match(component, /data-persist-candidate=\{String\(truth\.persistCandidate\)\}/u);
  assert.match(component, /data-storage-mutation-requested=\{String\(/u);
  assert.match(component, /data-release-requested=\{String\(truth\.releaseRequested\)\}/u);
  assert.match(component, /data-release-side-effect-allowed=\{String\(/u);
  assert.match(component, /data-remote-control="persist-candidate"/u);
  assert.match(component, /data-remote-control="release-requested"/u);
});

test('continue watching resource panel does not add media, source creation, storage, or authority', () => {
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
