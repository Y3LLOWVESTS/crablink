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
  read('src/library/tvLibraryVerifiedAssetRenderModel.js');

const panel =
  read('src/library/TvLibraryAssetDetailPanel.jsx');

const app =
  read('src/app/TvApp.jsx');

const css =
  read('src/styles/tv.css');

const adapter =
  read('src/platform/tauriTvAdapter.js');

const executableModel =
  stripComments(model);

const executablePanel =
  stripComments(panel);

const executableApp =
  stripComments(app);

test('verified render model binds native result to active Library identifiers', () => {
  for (const fragment of [
    'projectTvLibraryVerifiedAssetRender',
    'verification.verified !== true',
    'verification.crabUrl',
    'verification.contentCid',
    'detail.canonicalCrabUrl',
    'detail.cid',
    'SUPPORTED_RENDER_KINDS',
  ]) {
    assert.equal(
      model.includes(fragment),
      true,
      `${fragment} missing`,
    );
  }

  for (const forbidden of [
    /\binvoke\s*\(/u,
    /\bfetch\s*\(/u,
    /\blocalStorage\b/u,
    /\bsessionStorage\b/u,
    /\bindexedDB\b/u,
  ]) {
    assert.doesNotMatch(
      executableModel,
      forbidden,
    );
  }
});

test('Library panel exposes verified render facts without raw bytes or src loading', () => {
  for (const fragment of [
    'verifiedRenderView',
    'tv-library-verified-render',
    'data-tv-library-verified-render-kind',
    'verifiedRenderView.contentType',
    'verifiedRenderView.contentLength',
    'verifiedRenderView.maxVerifiedAssetBytes',
    'Verified render pending',
  ]) {
    assert.equal(
      panel.includes(fragment),
      true,
      `${fragment} missing`,
    );
  }

  assert.doesNotMatch(executablePanel, /<img\b/u);
  assert.doesNotMatch(executablePanel, /\bsrc=/u);
  assert.doesNotMatch(executablePanel, /\binvoke\s*\(/u);
  assert.doesNotMatch(executablePanel, /\bfetch\s*\(/u);
  assert.doesNotMatch(executablePanel, /\bassetBytes\b/u);
});

test('TV app stores reviewed execution render facts without direct native calls', () => {
  for (const fragment of [
    'createIdleTvLibraryVerifiedAssetRender',
    'projectTvLibraryVerifiedAssetRender',
    'libraryVerifiedAssetRenderView',
    'setLibraryVerifiedAssetRenderView',
    'verifiedRenderView={libraryVerifiedAssetRenderView}',
    'manifestAdapter:',
    'tvAssetManifestAdapter',
  ]) {
    assert.equal(
      app.includes(fragment),
      true,
      `${fragment} missing`,
    );
  }

  assert.equal(
    adapter.includes('tvAssetManifestAdapter'),
    true,
  );

  assert.doesNotMatch(
    executableApp,
    /\bcheckAssetManifest\s*\(/u,
  );

  assert.doesNotMatch(
    executableApp,
    /\binvoke\s*\(/u,
  );

  assert.doesNotMatch(
    executableApp,
    /\bfetch\s*\(/u,
  );
});

test('verified render CSS exposes visible proof surfaces', () => {
  for (const selector of [
    '.tv-library-verified-render',
    '.tv-library-verified-render__facts',
    '.tv-library-verified-render__fact',
    '.tv-library-verified-render__status',
  ]) {
    assert.equal(
      css.includes(selector),
      true,
      `${selector} missing`,
    );
  }
});
