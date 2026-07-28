import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here =
  path.dirname(fileURLToPath(import.meta.url));

const componentPath =
  path.join(here, 'TvMediaErrorRetryTruthPanel.jsx');

const component =
  fs.readFileSync(componentPath, 'utf8');

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/^\s*\/\/[!/]?.*$/gmu, '');
}

test('media error retry truth panel renders status and user retry metadata', () => {
  assert.match(component, /projectTvMediaErrorRetryTruth/u);
  assert.match(component, /data-media-error-state=\{truth\.state\}/u);
  assert.match(component, /data-media-kind=\{truth\.mediaKind\}/u);
  assert.match(component, /data-retry-allowed=\{String\(truth\.retryAllowed\)\}/u);
  assert.match(component, /data-retry-posture=\{truth\.retryPosture\}/u);
  assert.match(component, /data-automatic-retry-allowed=\{String\(/u);
  assert.match(component, /data-remote-control="retry"/u);
  assert.match(component, /data-retry-control=\{truth\.retryControl \|\| 'none'\}/u);
});

test('media error retry truth panel does not add media, source creation, storage, or authority', () => {
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
