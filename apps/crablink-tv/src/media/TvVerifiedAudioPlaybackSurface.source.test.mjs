import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here =
  path.dirname(fileURLToPath(import.meta.url));

const componentPath =
  path.join(here, 'TvVerifiedAudioPlaybackSurface.jsx');

const component =
  fs.readFileSync(componentPath, 'utf8');

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/^\s*\/\/[!/]?.*$/gmu, '');
}

test('verified audio playback surface renders one audio element and remote controls', () => {
  assert.match(component, /projectTvVerifiedAudioPlayback/u);
  assert.match(component, /<audio/u);
  assert.match(component, /src=\{player\.audioElementSource\}/u);
  assert.match(component, /preload="metadata"/u);
  assert.match(component, /controls=\{false\}/u);
  assert.match(component, /data-remote-control=\{control\.control\}/u);
});

test('verified audio playback surface does not add video, source creation, storage, or authority', () => {
  const executable = stripComments(component);

  for (const forbidden of [
    '<video',
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
