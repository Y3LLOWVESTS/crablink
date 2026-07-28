import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const appRoot =
  path.resolve(
    path.dirname(
      fileURLToPath(import.meta.url),
    ),
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
  read('src/library/tvLibraryVerifiedArticleRenderSurfaceModel.js');

const modelTest =
  read('src/library/tvLibraryVerifiedArticleRenderSurfaceModel.test.mjs');

const component =
  read('src/library/TvLibraryVerifiedArticleRenderSurface.jsx');

const panel =
  read('src/library/TvLibraryAssetDetailPanel.jsx');

const app =
  read('src/app/TvApp.jsx');

const css =
  read('src/styles/tv.css');

const executableModel =
  stripComments(model);

const executableComponent =
  stripComments(component);

const executablePanel =
  stripComments(panel);

const executableApp =
  stripComments(app);

test('verified article surface model decodes only ready article lifecycle bytes', () => {
  for (const fragment of [
    'TV_LIBRARY_VERIFIED_ARTICLE_RENDER_SURFACE_SCHEMA',
    'projectTvLibraryVerifiedArticleRenderSurface',
    'TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_STATE.READY',
    'TV_LIBRARY_VERIFIED_RENDER_DISPLAY_KIND.ARTICLE_READER',
    'TextDecoder',
    'contentLength !== byteLength',
    'Object.hasOwn(view, \'assetBytes\')',
  ]) {
    assert.equal(
      model.includes(fragment) ||
        modelTest.includes(fragment),
      true,
      `${fragment} missing`,
    );
  }
});

test('verified article surface component renders text nodes without unsafe HTML', () => {
  for (const fragment of [
    'TvLibraryVerifiedArticleRenderSurface',
    'renderSurfaceView.paragraphs.map',
    'tv-library-verified-article-surface__reader',
    'tv-library-verified-article-surface__paragraph',
    'data-tv-library-verified-article-render-state',
    '{paragraph}',
  ]) {
    assert.equal(
      component.includes(fragment),
      true,
      `${fragment} missing`,
    );
  }

  for (const forbidden of [
    /\bdangerouslySetInnerHTML\b/u,
    /\binnerHTML\b/u,
    /\bfetch\s*\(/u,
    /\binvoke\s*\(/u,
    /\bURL\.createObjectURL\b/u,
    /\bcreateObjectURL\s*\(/u,
    /\bURL\.revokeObjectURL\b/u,
    /\brevokeObjectURL\s*\(/u,
    /\bnew\s+Blob\b/u,
    /\blocalStorage\b/u,
    /\bsessionStorage\b/u,
    /\bindexedDB\b/u,
  ]) {
    assert.doesNotMatch(
      executableComponent,
      forbidden,
    );
  }
});

test('Library panel and app wire the article surface without direct rendering authority', () => {
  for (const fragment of [
    'TvLibraryVerifiedArticleRenderSurface',
    'articleRenderSurfaceView',
  ]) {
    assert.equal(
      panel.includes(fragment),
      true,
      `panel missing ${fragment}`,
    );
  }

  for (const fragment of [
    'createIdleTvLibraryVerifiedArticleRenderSurface',
    'libraryVerifiedArticleRenderSurfaceView',
    'setLibraryVerifiedArticleRenderSurfaceView',
    'articleRenderSurfaceView={libraryVerifiedArticleRenderSurfaceView}',
  ]) {
    assert.equal(
      app.includes(fragment),
      true,
      `app missing ${fragment}`,
    );
  }

  for (const forbidden of [
    /\bdangerouslySetInnerHTML\b/u,
    /\binnerHTML\b/u,
    /\bURL\.createObjectURL\b/u,
    /\bcreateObjectURL\s*\(/u,
    /\bURL\.revokeObjectURL\b/u,
    /\brevokeObjectURL\s*\(/u,
    /\bnew\s+Blob\b/u,
    /\bfetch\s*\(/u,
    /\binvoke\s*\(/u,
  ]) {
    assert.doesNotMatch(
      executablePanel,
      forbidden,
    );

    assert.doesNotMatch(
      executableApp,
      forbidden,
    );
  }
});

test('verified article CSS exposes a bounded ten-foot reader surface', () => {
  for (const fragment of [
    '.tv-library-verified-article-surface',
    '.tv-library-verified-article-surface__reader',
    '.tv-library-verified-article-surface__paragraph',
    '.tv-library-verified-article-surface__placeholder',
  ]) {
    assert.equal(
      css.includes(fragment),
      true,
      `${fragment} missing`,
    );
  }
});
