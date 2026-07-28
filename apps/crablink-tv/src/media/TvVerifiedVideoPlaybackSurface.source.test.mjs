import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here =
  path.dirname(fileURLToPath(import.meta.url));

const componentPath =
  path.join(here, 'TvVerifiedVideoPlaybackSurface.jsx');

const component =
  fs.readFileSync(componentPath, 'utf8');

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/^\s*\/\/[!/]?.*$/gmu, '');
}

test('verified video playback surface renders one video element and remote controls', () => {
  assert.match(component, /projectTvVerifiedVideoPlayback/u);
  assert.match(component, /<video/u);
  assert.match(component, /src=\{player\.videoElementSource\}/u);
  assert.match(component, /preload="metadata"/u);
  assert.match(component, /playsInline/u);
  assert.match(component, /controls=\{false\}/u);
  assert.match(component, /data-remote-control=\{control\.control\}/u);
  assert.match(component, /requestFullscreen/u);
});

test('verified video playback surface does not add audio, source creation, storage, or authority', () => {
  const executable = stripComments(component);

  for (const forbidden of [
    '<audio',
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
