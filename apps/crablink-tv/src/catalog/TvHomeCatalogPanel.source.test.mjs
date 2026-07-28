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
  read('src/catalog/useTvHomeCatalog.js');

const hookExecutable =
  stripComments(hook);

const panel =
  read('src/catalog/TvHomeCatalogPanel.jsx');

const panelExecutable =
  stripComments(panel);

const app =
  read('src/app/TvApp.jsx');

const css =
  read('src/styles/tv.css');

test('Home catalog hook wires the reviewed controller without automatic loading', () => {
  assert.match(
    hook,
    /createTvCatalogAdapter/u,
  );

  assert.match(
    hook,
    /createTvCatalogInteraction/u,
  );

  assert.match(
    hook,
    /tvCatalogPort/u,
  );

  assert.match(
    hook,
    /loadHomeCatalog/u,
  );

  assert.match(
    hook,
    /refreshHomeCatalog/u,
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
});

test('Home catalog panel renders manual controls and backend-derived rails only', () => {
  assert.match(
    panel,
    /tv-home-catalog/u,
  );

  assert.match(
    panel,
    /home-catalog-load/u,
  );

  assert.match(
    panel,
    /home-catalog-refresh/u,
  );

  assert.match(
    panel,
    /state\.view\.kind === TV_CATALOG_VIEW_KIND\.READY/u,
  );

  assert.match(
    panel,
    /rails\.map/u,
  );

  assert.match(
    panel,
    /rail\.items\.map/u,
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

test('TV app integrates Home catalog without direct catalog transport authority', () => {
  assert.match(
    app,
    /useTvHomeCatalog/u,
  );

  assert.match(
    app,
    /TvHomeCatalogPanel/u,
  );

  assert.match(
    app,
    /activeSectionId === 'home'/u,
  );

  assert.match(
    app,
    /loadHomeCatalog/u,
  );

  assert.match(
    app,
    /refreshHomeCatalog/u,
  );

  assert.match(
    app,
    /inspectCatalogItem/u,
  );

  assert.doesNotMatch(
    app,
    /tv_catalog_read/u,
  );

  assert.doesNotMatch(
    app,
    /readCatalogView/u,
  );
});

test('Home catalog CSS exposes TV-friendly rail and card surfaces', () => {
  for (const selector of [
    '.tv-home-catalog',
    '.tv-catalog-actions',
    '.tv-catalog-rails',
    '.tv-catalog-rail',
    '.tv-catalog-row',
    '.tv-catalog-card',
  ]) {
    assert.equal(
      css.includes(selector),
      true,
      `${selector} missing`,
    );
  }
});
