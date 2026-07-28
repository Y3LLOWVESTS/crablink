import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here =
  path.dirname(fileURLToPath(import.meta.url));

const componentPath =
  path.join(here, 'TvPlaybackControlsFocusRail.jsx');

const component =
  fs.readFileSync(componentPath, 'utf8');

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/^\s*\/\/[!/]?.*$/gmu, '');
}

test('playback controls focus rail renders remote focus metadata and buttons', () => {
  assert.match(component, /projectTvPlaybackControlsFocus/u);
  assert.match(component, /data-playback-controls-state=\{focus\.state\}/u);
  assert.match(component, /data-media-kind=\{focus\.mediaKind\}/u);
  assert.match(component, /data-focused-control=\{focus\.focusedControl\}/u);
  assert.match(component, /data-remote-focus-enabled=\{String\(focus\.remoteFocusEnabled\)\}/u);
  assert.match(component, /data-remote-control=\{control\.control\}/u);
  assert.match(component, /data-focused=\{String\(control\.selected === true\)\}/u);
  assert.match(component, /data-activation-allowed=\{String\(/u);
});

test('playback controls focus rail does not add media elements, source creation, storage, or authority', () => {
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
