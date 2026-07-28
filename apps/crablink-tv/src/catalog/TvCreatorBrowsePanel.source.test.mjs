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

const hook =
  read('src/catalog/useTvCreatorBrowse.js');

const hookExecutable =
  stripComments(hook);

const panel =
  read('src/catalog/TvCreatorBrowsePanel.jsx');

const panelExecutable =
  stripComments(panel);

const app =
  read('src/app/TvApp.jsx');

const css =
  read('src/styles/tv.css');

test('creator browse hook derives from the reviewed catalog view without automatic loading', () => {
  assert.match(
    hook,
    /useTvCreatorBrowse/u,
  );

  assert.match(
    hook,
    /projectTvCreatorBrowseFromCatalog/u,
  );

  assert.match(
    hook,
    /creatorQuery/u,
  );

  assert.match(
    hook,
    /setCreatorQuery/u,
  );

  assert.match(
    hook,
    /clearCreatorQuery/u,
  );

  assert.doesNotMatch(
    hookExecutable,
    /\buseEffect\b/u,
  );

  assert.doesNotMatch(
    hookExecutable,
    /\bsetInterval\s*\(/u,
  );

  assert.doesNotMatch(
    hookExecutable,
    /\bsetTimeout\s*\(/u,
  );

  assert.doesNotMatch(
    hookExecutable,
    /\binvoke\s*\(/u,
  );

  assert.doesNotMatch(
    hookExecutable,
    /\bfetch\s*\(/u,
  );
});

test('creator browse panel renders local search and backend-derived creator cards only', () => {
  assert.match(
    panel,
    /TvCreatorBrowsePanel/u,
  );

  assert.match(
    panel,
    /creator-browse-search/u,
  );

  assert.match(
    panel,
    /creator-browse-clear/u,
  );

  assert.match(
    panel,
    /browseView\.creators/u,
  );

  assert.match(
    panel,
    /creators\.map/u,
  );

  assert.match(
    panel,
    /profileCrabUrl/u,
  );

  assert.match(
    panel,
    /data-tv-focusable="true"/u,
  );

  assert.doesNotMatch(
    panelExecutable,
    /sample|placeholder|mock/i,
  );
});

test('TV app integrates creator browse without direct model or transport authority in JSX', () => {
  assert.match(
    app,
    /useTvCreatorBrowse/u,
  );

  assert.match(
    app,
    /TvCreatorBrowsePanel/u,
  );

  assert.match(
    app,
    /catalogView: catalogState\.view/u,
  );

  assert.match(
    app,
    /creatorBrowseView/u,
  );

  assert.match(
    app,
    /setCreatorQuery/u,
  );

  assert.match(
    app,
    /clearCreatorQuery/u,
  );

  assert.equal(
    app.includes('onCreator={inspectCatalogItem}'),
    true,
  );

  assert.doesNotMatch(
    app,
    /projectTvCreatorBrowseFromCatalog/u,
  );

  assert.doesNotMatch(
    app,
    /tv_catalog_read/u,
  );
});

test('creator browse CSS exposes TV-friendly search, grid, and card surfaces', () => {
  for (const selector of [
    '.tv-creator-browse',
    '.tv-creator-search',
    '.tv-creator-search__controls',
    '.tv-creator-grid',
    '.tv-creator-card',
    '.tv-creator-card__eyebrow',
  ]) {
    assert.equal(
      css.includes(selector),
      true,
      `${selector} missing`,
    );
  }
});
