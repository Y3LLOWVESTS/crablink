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

function sliceBetween(
  label,
  source,
  startFragment,
  endFragment,
) {
  const start = source.indexOf(startFragment);

  const end = source.indexOf(
    endFragment,
    start + startFragment.length,
  );

  assert.notEqual(
    start,
    -1,
    `${label} start fragment missing`,
  );

  assert.notEqual(
    end,
    -1,
    `${label} end fragment missing`,
  );

  assert.equal(
    end > start,
    true,
    `${label} source order invalid`,
  );

  return source.slice(start, end);
}

const routeHandoff = read(
  'src/catalog/tvCatalogRouteHandoff.js',
);

const model = read(
  'src/library/tvLibraryAssetDetailModel.js',
);

const panel = read(
  'src/library/TvLibraryAssetDetailPanel.jsx',
);

const app = read(
  'src/app/TvApp.jsx',
);

const css = read(
  'src/styles/tv.css',
);

const modelExecutable =
  stripComments(model);

const panelExecutable =
  stripComments(panel);

test('reviewed Home asset routes open persistent Library detail', () => {
  for (const fragment of [
    "reviewed.owner === 'asset'",
    "return 'library';",
  ]) {
    assert.equal(
      routeHandoff.includes(fragment),
      true,
      `${fragment} missing`,
    );
  }

  for (const fragment of [
    "handoff.route?.owner === 'asset'",
    'projectTvLibraryAssetDetail',
    'setLibraryAssetDetailView',
    'navigateToSection',
    'handoff.targetSectionId',
    'TvLibraryAssetDetailPanel',
    "activeSectionId === 'library'",
  ]) {
    assert.equal(
      app.includes(fragment),
      true,
      `${fragment} missing`,
    );
  }
});

test('Library detail visibly exposes canonical reviewed identifiers', () => {
  for (const fragment of [
    'canonicalAssetRoute',
    'canonicalCrabUrl',
    'route.normalized',
    'route.cid',
    'route.hash',
    'returnFocusKey',
  ]) {
    assert.equal(
      model.includes(fragment),
      true,
      `${fragment} missing`,
    );
  }

  for (const fragment of [
    'detailView.assetKind',
    'detailView.canonicalCrabUrl',
    'detailView.cid',
    'detailView.hash',
    'library-asset-detail-clear',
    'Clear asset detail',
  ]) {
    assert.equal(
      panel.includes(fragment),
      true,
      `${fragment} missing`,
    );
  }

  for (const selector of [
    '.tv-library-asset-detail',
    '.tv-library-asset-detail__card',
    '.tv-library-asset-detail__fact',
    '.tv-library-asset-detail__empty',
  ]) {
    assert.equal(
      css.includes(selector),
      true,
      `${selector} missing`,
    );
  }
});

test('Library clear behavior stays isolated from creator-profile focus', () => {
  const clearSlice = sliceBetween(
    'Library clear handler',
    app,
    '  function clearLibraryAssetDetail()',
    '  function inspectCatalogItem(',
  );

  for (const fragment of [
    'setLibraryAssetDetailView',
    'createIdleTvLibraryAssetDetail',
    'Library asset detail cleared',
  ]) {
    assert.equal(
      clearSlice.includes(fragment),
      true,
      `${fragment} missing from clear handler`,
    );
  }

  for (const forbidden of [
    'setCreatorProfileView',
    'setCreatorProfileFocusRequest',
    'createTvCreatorProfileFocusRequest',
    'navigateToSection',
  ]) {
    assert.equal(
      clearSlice.includes(forbidden),
      false,
      `${forbidden} leaked into Library clear handler`,
    );
  }

  for (const fragment of [
    'creatorProfileFocusRequest',
    'window.requestAnimationFrame',
    'document.querySelectorAll',
    'dataset.tvReturnFocusKey',
  ]) {
    assert.equal(
      app.includes(fragment),
      true,
      `${fragment} creator focus regression`,
    );
  }
});

test('Library acceptance adds no raw loading or authority behavior', () => {
  for (const [label, source] of [
    ['model', modelExecutable],
    ['panel', panelExecutable],
  ]) {
    for (const pattern of [
      /\binvoke\s*\(/u,
      /\bfetch\s*\(/u,
      /\bsetInterval\s*\(/u,
      /\bsetTimeout\s*\(/u,
      /\blocalStorage\b/u,
      /\bsessionStorage\b/u,
      /\bindexedDB\b/u,
      /<img\b/u,
      /<video\b/u,
      /<audio\b/u,
      /\bsrc=/u,
      /tv_library_asset_read/u,
      /tv_asset_manifest_read/u,
    ]) {
      assert.doesNotMatch(
        source,
        pattern,
        `${label} acquired forbidden behavior: ${pattern}`,
      );
    }
  }

  const appAcceptanceSlice = [
    sliceBetween(
      'Library clear handler',
      app,
      '  function clearLibraryAssetDetail()',
      '  function inspectCatalogItem(',
    ),

    sliceBetween(
      'Library asset handoff',
      app,
      "    if (\n      handoff.route?.owner === 'asset'",
      '    navigateToSection(\n      handoff.targetSectionId,',
    ),

    sliceBetween(
      'Library detail render',
      app,
      "      {activeSectionId === 'library' ? (",
      "      {activeSectionId === 'settings' ? (",
    ),
  ].join('\n');

  for (const pattern of [
    /\binvoke\s*\(/u,
    /\bfetch\s*\(/u,
    /\bsetInterval\s*\(/u,
    /\bsetTimeout\s*\(/u,
    /\blocalStorage\b/u,
    /\bsessionStorage\b/u,
    /\bindexedDB\b/u,
    /tv_library_asset_read/u,
    /tv_asset_manifest_read/u,
  ]) {
    assert.doesNotMatch(
      appAcceptanceSlice,
      pattern,
      `app Library slice acquired forbidden behavior: ${pattern}`,
    );
  }
});
