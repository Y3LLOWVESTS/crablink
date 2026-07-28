import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here =
  path.dirname(fileURLToPath(import.meta.url));

const componentPath =
  path.join(here, 'TvVerifiedMediaPlaybackSurface.jsx');

const component =
  fs.readFileSync(componentPath, 'utf8');

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/^\s*\/\/[!/]?.*$/gmu, '');
}

test('verified media playback surface component renders shell and remote controls', () => {
  assert.match(
    component,
    /projectTvVerifiedMediaPlaybackSurface/,
  );
  assert.match(
    component,
    /data-playback-state=\{surface\.state\}/,
  );
  assert.match(
    component,
    /data-source-attached=\{String\(surface\.sourceAttached\)\}/,
  );
  assert.match(
    component,
    /data-player-element-attached=\{String\(surface\.playerElementAttached\)\}/,
  );
  assert.match(
    component,
    /data-remote-control=\{control\.control\}/,
  );
  assert.match(
    component,
    /disabled=\{!control\.enabled\}/,
  );
});

test('verified media playback surface component does not attach media source or player yet', () => {
  const executable = stripComments(component);

  for (const forbidden of [
    '<video',
    '<audio',
    'src=',
    'dangerouslySetInnerHTML',
    'innerHTML',
    'fetch(',
    'invoke(',
    'URL.createObjectURL',
    'URL.revokeObjectURL',
    'new Blob',
    'localStorage',
    'sessionStorage',
    'indexedDB',
    'autoPlay',
  ]) {
    assert.equal(
      executable.includes(forbidden),
      false,
      `forbidden component fragment present: ${forbidden}`,
    );
  }
});
