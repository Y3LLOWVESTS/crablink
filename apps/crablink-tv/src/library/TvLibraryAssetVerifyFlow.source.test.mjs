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

const verifyFlow =
  read('src/library/tvLibraryAssetVerifyFlow.js');

const app =
  read('src/app/TvApp.jsx');

const panel =
  read('src/library/TvLibraryAssetDetailPanel.jsx');

const adapter =
  read('src/platform/tauriTvAdapter.js');

const executableVerifyFlow =
  stripComments(verifyFlow);

const executableApp =
  stripComments(app);

const executablePanel =
  stripComments(panel);

test('verify flow composes gateway evidence native adapter and render projection', () => {
  for (const fragment of [
    'runTvLibraryAssetVerifyFlow',
    'projectTvGatewayAssetFetchRequest',
    'readTvGatewayAssetEvidence',
    'manifestAdapter.checkAssetManifest',
    'projectTvLibraryVerifiedAssetRender',
    'nativeManifestRequest',
    'assetBytes',
  ]) {
    assert.equal(
      verifyFlow.includes(fragment),
      true,
      `${fragment} missing`,
    );
  }
});

test('verify flow uses injected manifest adapter instead of importing Tauri adapter', () => {
  assert.equal(
    adapter.includes('tvAssetManifestAdapter'),
    true,
  );

  assert.equal(
    executableVerifyFlow.includes('tauriTvAdapter'),
    false,
  );

  assert.equal(
    executableVerifyFlow.includes('tvAssetManifestAdapter'),
    false,
  );

  assert.doesNotMatch(
    executableVerifyFlow,
    /\binvoke\s*\(/u,
  );
});

test('verify flow has no global fetch storage or rendering side effects', () => {
  for (const forbidden of [
    /\bfetch\s*\(/u,
    /\blocalStorage\b/u,
    /\bsessionStorage\b/u,
    /\bindexedDB\b/u,
    /<img\b/u,
    /\bsrc=/u,
    /\bcreateObjectURL\b/u,
  ]) {
    assert.doesNotMatch(
      executableVerifyFlow,
      forbidden,
    );
  }
});

test('React surfaces still do not run the verify flow automatically', () => {
  for (const forbidden of [
    /\btvLibraryAssetVerifyFlow\b/u,
    /\brunTvLibraryAssetVerifyFlow\b/u,
    /\bprojectTvGatewayAssetFetchRequest\b/u,
    /\breadTvGatewayAssetEvidence\b/u,
    /\bcheckAssetManifest\s*\(/u,
    /\binvoke\s*\(/u,
    /\bfetch\s*\(/u,
  ]) {
    assert.doesNotMatch(
      executableApp,
      forbidden,
    );

    assert.doesNotMatch(
      executablePanel,
      forbidden,
    );
  }
});
