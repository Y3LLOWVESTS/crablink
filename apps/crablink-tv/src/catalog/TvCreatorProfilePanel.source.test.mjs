import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const appRoot = path.resolve(
  path.dirname(
    fileURLToPath(
      import.meta.url,
    ),
  ),
  '../..',
);

function read(relativePath) {
  return fs.readFileSync(
    path.join(
      appRoot,
      relativePath,
    ),
    'utf8',
  );
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/^\s*\/\/.*$/gmu, '');
}

const model =
  read('src/catalog/tvCreatorProfileModel.js');

const modelExecutable =
  stripComments(model);

const panel =
  read('src/catalog/TvCreatorProfilePanel.jsx');

const panelExecutable =
  stripComments(panel);

const app =
  read('src/app/TvApp.jsx');

const css =
  read('src/styles/tv.css');

test('creator profile model reviews creator site routes without transport authority', () => {
  assert.match(
    model,
    /projectTvCreatorProfile/u,
  );

  assert.match(
    model,
    /createIdleTvCreatorProfile/u,
  );

  assert.match(
    model,
    /resolveTvRouteInput/u,
  );

  assert.match(
    model,
    /item\?\.kind !== 'creator'/u,
  );

  assert.match(
    model,
    /reviewed\.owner !== 'site'/u,
  );

  assert.doesNotMatch(
    modelExecutable,
    /\binvoke\s*\(/u,
  );

  assert.doesNotMatch(
    modelExecutable,
    /\bfetch\s*\(/u,
  );
});

test('creator profile panel renders a local visible page and close control', () => {
  assert.match(
    panel,
    /TvCreatorProfilePanel/u,
  );

  assert.match(
    panel,
    /tv-creator-profile-page/u,
  );

  assert.match(
    panel,
    /creator-profile-close/u,
  );

  assert.match(
    panel,
    /profileView\.profileCrabUrl/u,
  );

  assert.match(
    panel,
    /focusRequest/u,
  );

  assert.match(
    panel,
    /tv-creator-profile-status/u,
  );

  assert.match(
    panel,
    /onClose/u,
  );

  assert.doesNotMatch(
    panelExecutable,
    /\binvoke\s*\(/u,
  );

  assert.doesNotMatch(
    panelExecutable,
    /\bfetch\s*\(/u,
  );
});

test('TV app routes creator cards to profile state while preserving catalog handoff for problems', () => {
  assert.match(
    app,
    /projectTvCreatorProfile/u,
  );

  assert.match(
    app,
    /TvCreatorProfilePanel/u,
  );

  assert.match(
    app,
    /creatorProfileView/u,
  );

  assert.match(
    app,
    /setCreatorProfileView/u,
  );

  assert.match(
    app,
    /handoff\.route\?\.owner === 'site'/u,
  );

  assert.match(
    app,
    /onCreator=\{inspectCatalogItem\}/u,
  );

  assert.doesNotMatch(
    app,
    /tv_creator_profile_read/u,
  );
});

test('creator profile CSS exposes visible TV page and card surfaces', () => {
  for (const selector of [
    '.tv-creator-profile-page',
    '.tv-creator-profile-page__heading',
    '.tv-creator-profile-page__copy',
    '.tv-creator-profile-card',
    '.tv-creator-profile-card__label',
  ]) {
    assert.equal(
      css.includes(selector),
      true,
      `${selector} missing`,
    );
  }
});
