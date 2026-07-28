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

function sliceAround(source, marker, radius = 900) {
  const index =
    source.indexOf(marker);

  assert.notEqual(
    index,
    -1,
    `${marker} missing`,
  );

  return source.slice(
    Math.max(0, index - radius),
    index + marker.length + radius,
  );
}

const app =
  read('src/app/TvApp.jsx');

const panel =
  read('src/catalog/TvCreatorProfilePanel.jsx');

const panelExecutable =
  stripComments(panel);

const appProfilePolishExecutable =
  stripComments(
    [
      sliceAround(
        app,
        'focusRequest={creatorProfileFocusRequest}',
      ),
      sliceAround(
        app,
        'refreshHomeCatalogWithProfileFocus',
        1600,
      ),
      sliceAround(
        app,
        'dataset.tvReturnFocusKey',
        1200,
      ),
    ].join('\n'),
  );

const css =
  read('src/styles/tv.css');

test('creator profile panel exposes visible focus and refresh status', () => {
  for (const fragment of [
    'focusRequest',
    'creatorProfileFocusCopy',
    'tv-creator-profile-status',
    'data-tv-profile-focus-kind',
    'Return focus target',
    'profile-focus-refresh',
  ]) {
    assert.equal(
      panel.includes(fragment),
      true,
      `${fragment} missing`,
    );
  }

  assert.doesNotMatch(
    panelExecutable,
    /\binvoke\s*\(/u,
  );

  assert.doesNotMatch(
    panelExecutable,
    /\bfetch\s*\(/u,
  );
});

test('TV app passes the bounded profile focus request into the profile panel', () => {
  for (const fragment of [
    'creatorProfileFocusRequest',
    'focusRequest={creatorProfileFocusRequest}',
    'refreshHomeCatalogWithProfileFocus',
    'setCreatorProfileFocusRequest',
    'dataset.tvReturnFocusKey',
  ]) {
    assert.equal(
      app.includes(fragment),
      true,
      `${fragment} missing`,
    );
  }

  assert.doesNotMatch(
    appProfilePolishExecutable,
    /tv_creator_profile_read/u,
  );
});

test('creator profile polish CSS exposes status surfaces', () => {
  for (const selector of [
    '.tv-creator-profile-status',
    '.tv-creator-profile-status__label',
    '.tv-creator-profile-status__value',
    '.tv-creator-profile-status--return',
  ]) {
    assert.equal(
      css.includes(selector),
      true,
      `${selector} missing`,
    );
  }
});

test('creator profile polish keeps transport and authority absent in the new surface', () => {
  for (const [label, source] of [
    ['profile app polish slice', appProfilePolishExecutable],
    ['profile panel', panelExecutable],
  ]) {
    for (const pattern of [
      /\binvoke\s*\(/u,
      /\bfetch\s*\(/u,
      /\blocalStorage\b/u,
      /\bsessionStorage\b/u,
      /\bindexedDB\b/u,
      /\bwallet\b/iu,
      /\bledger\b/iu,
      /\bfinality\b/iu,
      /tv_creator_profile_read/u,
    ]) {
      assert.doesNotMatch(
        source,
        pattern,
        `${label} contains ${pattern}`,
      );
    }
  }
});
