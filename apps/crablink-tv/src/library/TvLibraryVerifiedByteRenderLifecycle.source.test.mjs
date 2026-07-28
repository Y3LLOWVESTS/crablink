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

const lifecycleModel =
  read(
    'src/library/tvLibraryVerifiedByteRenderLifecycleModel.js',
  );

const lifecycleTest =
  read(
    'src/library/tvLibraryVerifiedByteRenderLifecycleModel.test.mjs',
  );

const app =
  read('src/app/TvApp.jsx');

const panel =
  read('src/library/TvLibraryAssetDetailPanel.jsx');

const executableModel =
  stripComments(lifecycleModel);

const executableApp =
  stripComments(app);

const executablePanel =
  stripComments(panel);

test('byte render lifecycle model owns object URL state without creating URLs', () => {
  for (const fragment of [
    'prepareTvLibraryVerifiedByteRenderLifecycle',
    'activateTvLibraryVerifiedByteRenderLifecycle',
    'revokeTvLibraryVerifiedByteRenderLifecycle',
    'shouldRevokeTvLibraryVerifiedByteRenderLifecycle',
    'revokeRequired',
    'blob:',
    'canonicalCrabUrl',
    'cid',
  ]) {
    assert.equal(
      lifecycleModel.includes(fragment),
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
    /\bdangerouslySetInnerHTML\b/u,
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

test('byte render lifecycle tests cover activation revocation and stale cleanup', () => {
  for (const fragment of [
    'activates only bounded blob object URLs',
    'revokes active stale object URLs',
    'rejects unverified unsupported or stale display facts',
  ]) {
    assert.equal(
      lifecycleTest.includes(fragment),
      true,
      `${fragment} missing`,
    );
  }
});

test('Phase 9L does not wire React byte rendering yet', () => {
  for (const forbidden of [
    /\bURL\.createObjectURL\b/u,
    /\bcreateObjectURL\s*\(/u,
    /\bURL\.revokeObjectURL\b/u,
    /\brevokeObjectURL\s*\(/u,
    /\bnew\s+Blob\b/u,
    /<img\b/u,
    /\bsrc=/u,
    /\bfetch\s*\(/u,
    /\binvoke\s*\(/u,
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
