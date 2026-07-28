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
  read('src/library/tvLibraryVerifyUiModel.js');

const panel =
  read('src/library/TvLibraryAssetDetailPanel.jsx');

const app =
  read('src/app/TvApp.jsx');

const css =
  read('src/styles/tv.css');

const executableModel =
  stripComments(model);

const executablePanel =
  stripComments(panel);

const executableApp =
  stripComments(app);

test('verify UI model remains action eligibility state only', () => {
  for (const fragment of [
    'TV_LIBRARY_VERIFY_UI_SCHEMA',
    'projectTvLibraryVerifyUiView',
    'requestTvLibraryVerifyUiView',
    'TV_LIBRARY_ASSET_DETAIL_KIND.READY',
    'TV_LIBRARY_VERIFIED_ASSET_RENDER_KIND.READY',
    'canRequest',
  ]) {
    assert.equal(
      model.includes(fragment),
      true,
      `${fragment} missing`,
    );
  }

  for (const forbidden of [
    /\brunTvLibraryAssetVerifyFlow\b/u,
    /\bcheckAssetManifest\s*\(/u,
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

test('Library panel exposes remote verification execution states', () => {
  for (const fragment of [
    'verifyUiView',
    'manualVerifyExecutionView',
    'onVerifyAsset',
    'tv-library-verify-ui',
    'data-tv-library-verify-ui-state',
    'data-tv-library-manual-verify-execution-state',
    'library-asset-verify',
    'Verifying…',
    'Verify again',
  ]) {
    assert.equal(
      panel.includes(fragment),
      true,
      `${fragment} missing`,
    );
  }

  assert.doesNotMatch(executablePanel, /\bassetBytes\b/u);
  assert.doesNotMatch(executablePanel, /<img\b/u);
  assert.doesNotMatch(executablePanel, /\bsrc=/u);
  assert.doesNotMatch(executablePanel, /\binvoke\s*\(/u);
  assert.doesNotMatch(executablePanel, /\bfetch\s*\(/u);
});

test('TV app keeps Phase 9I action state while reviewed execution owns verification', () => {
  for (const fragment of [
    'createIdleTvLibraryVerifyUiView',
    'projectTvLibraryVerifyUiView',
    'requestTvLibraryVerifyUiView',
    'libraryVerifyUiView',
    'requestLibraryAssetVerification',
    'verifyUiView={libraryVerifyUiView}',
    'onVerifyAsset={requestLibraryAssetVerification}',
  ]) {
    assert.equal(
      app.includes(fragment),
      true,
      `${fragment} missing`,
    );
  }

  for (const forbidden of [
    /\brunTvLibraryAssetVerifyFlow\s*\(/u,
    /\bcheckAssetManifest\s*\(/u,
    /\bprojectTvGatewayAssetFetchRequest\s*\(/u,
    /\breadTvGatewayAssetEvidence\s*\(/u,
    /\binvoke\s*\(/u,
    /\bfetch\s*\(/u,
  ]) {
    assert.doesNotMatch(
      executableApp,
      forbidden,
    );
  }
});

test('verify UI CSS exposes visible TV surfaces', () => {
  for (const selector of [
    '.tv-library-verify-ui',
    '.tv-library-verify-ui__status',
    '.tv-library-verify-ui__message',
    '.tv-library-verify-ui__code',
    '.tv-library-asset-detail__actions',
  ]) {
    assert.equal(
      css.includes(selector),
      true,
      `${selector} missing`,
    );
  }
});
