import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const appRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);

function read(relativePath) {
  return fs.readFileSync(
    path.join(appRoot, relativePath),
    'utf8',
  );
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/^\s*\/\/.*$/gmu, '');
}

const model =
  read('src/library/tvLibraryAssetDetailModel.js');

const panel =
  read('src/library/TvLibraryAssetDetailPanel.jsx');

const app =
  read('src/app/TvApp.jsx');

const css =
  read('src/styles/tv.css');

const modelExecutable =
  stripComments(model);

const panelExecutable =
  stripComments(panel);

test('library asset detail model projects reviewed asset route identifiers', () => {
  for (const fragment of [
    'projectTvLibraryAssetDetail',
    'TV_CATALOG_CARD_HANDOFF_KIND.DETAIL',
    "route?.owner !== 'asset'",
    'canonicalCrabUrl',
    'cid',
    'hash',
  ]) {
    assert.equal(
      model.includes(fragment),
      true,
      `${fragment} missing`,
    );
  }

  assert.doesNotMatch(
    modelExecutable,
    /\binvoke\s*\(/u,
  );

  assert.doesNotMatch(
    modelExecutable,
    /\bfetch\s*\(/u,
  );
});

test('library asset detail panel renders identifiers without raw asset loading', () => {
  for (const fragment of [
    'TvLibraryAssetDetailPanel',
    'tv-library-asset-detail',
    'library-asset-detail-clear',
    'detailView.canonicalCrabUrl',
    'detailView.cid',
    'detailView.hash',
    'verifiedRenderView',
    'tv-library-verified-render',
  ]) {
    assert.equal(
      panel.includes(fragment),
      true,
      `${fragment} missing`,
    );
  }

  assert.doesNotMatch(panelExecutable, /<img\b/u);
  assert.doesNotMatch(panelExecutable, /\bsrc=/u);
  assert.doesNotMatch(
    panelExecutable,
    /\binvoke\s*\(/u,
  );
  assert.doesNotMatch(
    panelExecutable,
    /\bfetch\s*\(/u,
  );
});

test('TV app stores Library asset detail state from reviewed asset handoffs', () => {
  for (const fragment of [
    'createIdleTvLibraryAssetDetail',
    'projectTvLibraryAssetDetail',
    'TvLibraryAssetDetailPanel',
    'libraryAssetDetailView',
    'setLibraryAssetDetailView',
    "handoff.route?.owner === 'asset'",
    "activeSectionId === 'library'",
  ]) {
    assert.equal(
      app.includes(fragment),
      true,
      `${fragment} missing`,
    );
  }

  assert.doesNotMatch(
    app,
    /tv_library_asset_read/u,
  );
});

test('library asset detail CSS exposes visible TV surfaces', () => {
  for (const selector of [
    '.tv-library-asset-detail',
    '.tv-library-asset-detail__heading',
    '.tv-library-asset-detail__copy',
    '.tv-library-asset-detail__card',
    '.tv-library-asset-detail__fact',
    '.tv-library-asset-detail__empty',
    '.tv-library-verified-render',
  ]) {
    assert.equal(
      css.includes(selector),
      true,
      `${selector} missing`,
    );
  }
});
