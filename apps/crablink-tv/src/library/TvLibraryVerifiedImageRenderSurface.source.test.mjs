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
  read('src/library/tvLibraryVerifiedImageRenderSurfaceModel.js');

const modelTest =
  read('src/library/tvLibraryVerifiedImageRenderSurfaceModel.test.mjs');

const component =
  read('src/library/TvLibraryVerifiedImageRenderSurface.jsx');

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

test('verified image render surface model only accepts active image object URL views', () => {
  for (const fragment of [
    'TV_LIBRARY_VERIFIED_IMAGE_RENDER_SURFACE_SCHEMA',
    'TV_LIBRARY_VERIFIED_IMAGE_RENDER_SURFACE_STATE',
    'createIdleTvLibraryVerifiedImageRenderSurface',
    'projectTvLibraryVerifiedImageRenderSurface',
    'TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_STATE.ACTIVE',
    "objectUrl.startsWith('blob:')",
    "contentType.startsWith('image/')",
    "Object.hasOwn(view, 'assetBytes')",
  ]) {
    assert.equal(
      model.includes(fragment) ||
        modelTest.includes(fragment),
      true,
      `${fragment} missing`,
    );
  }
});

test('verified image render component owns the only image tag and binds src to projected object URL', () => {
  for (const fragment of [
    '<img',
    'src={renderSurfaceView.objectUrl}',
    'alt={renderSurfaceView.altText}',
    'data-tv-library-verified-image-render-state',
    'tv-library-verified-image-surface__frame',
    'tv-library-verified-image-surface__placeholder',
  ]) {
    assert.equal(
      component.includes(fragment),
      true,
      `${fragment} missing`,
    );
  }

  for (const forbidden of [
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
    /\bdangerouslySetInnerHTML\b/u,
  ]) {
    assert.doesNotMatch(
      executableComponent,
      forbidden,
    );
  }
});

test('Library panel and app wire the image surface without direct image or object URL authority', () => {
  for (const fragment of [
    'TvLibraryVerifiedImageRenderSurface',
    'imageRenderSurfaceView',
  ]) {
    assert.equal(
      panel.includes(fragment),
      true,
      `panel missing ${fragment}`,
    );
  }

  for (const fragment of [
    'createIdleTvLibraryVerifiedImageRenderSurface',
    'libraryVerifiedImageRenderSurfaceView',
    'setLibraryVerifiedImageRenderSurfaceView',
    'imageRenderSurfaceView={libraryVerifiedImageRenderSurfaceView}',
  ]) {
    assert.equal(
      app.includes(fragment),
      true,
      `app missing ${fragment}`,
    );
  }

  for (const forbidden of [
    /<img\b/u,
    /\bsrc=/u,
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

test('verified image render CSS exposes a bounded ten-foot image surface', () => {
  for (const fragment of [
    '.tv-library-verified-image-surface',
    '.tv-library-verified-image-surface__frame',
    '.tv-library-verified-image-surface__image',
    '.tv-library-verified-image-surface__caption',
    '.tv-library-verified-image-surface__placeholder',
  ]) {
    assert.equal(
      css.includes(fragment),
      true,
      `${fragment} missing`,
    );
  }
});

test('model and component do not acquire authority outside projected rendering', () => {
  for (const source of [
    executableModel,
    executableComponent,
  ]) {
    for (const forbidden of [
      /\bwallet\b/u,
      /\bledger\b/u,
      /\bROC\b/u,
      /\bentitlement\b/u,
      /\bfinality\b/u,
      /\breceipt\b/u,
      /\breward\b/u,
      /\bstorage\b/u,
    ]) {
      assert.doesNotMatch(
        source,
        forbidden,
      );
    }
  }
});
