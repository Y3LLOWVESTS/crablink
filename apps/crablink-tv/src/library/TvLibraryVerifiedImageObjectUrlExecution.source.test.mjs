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

const execution =
  read('src/library/tvLibraryVerifiedImageObjectUrlExecution.js');

const executionTest =
  read('src/library/tvLibraryVerifiedImageObjectUrlExecution.test.mjs');

const objectUrlHandoff =
  read('src/library/tvLibraryVerifiedObjectUrlHandoff.js');

const imageSurfaceModel =
  read('src/library/tvLibraryVerifiedImageRenderSurfaceModel.js');

const imageSurfaceComponent =
  read('src/library/TvLibraryVerifiedImageRenderSurface.jsx');

const executableExecution =
  stripComments(execution);

test('image object URL execution composes lifecycle handoff and image surface modules', () => {
  for (const fragment of [
    'TV_LIBRARY_VERIFIED_IMAGE_OBJECT_URL_EXECUTION_SCHEMA',
    'executeTvLibraryVerifiedImageObjectUrl',
    'revokeTvLibraryVerifiedImageObjectUrlExecution',
    'openTvLibraryVerifiedObjectUrlHandoff',
    'replaceTvLibraryVerifiedObjectUrlHandoff',
    'revokeTvLibraryVerifiedObjectUrlHandoff',
    'projectTvLibraryVerifiedImageRenderSurface',
    'createIdleTvLibraryVerifiedImageRenderSurface',
  ]) {
    assert.equal(
      execution.includes(fragment),
      true,
      `${fragment} missing`,
    );
  }
});

test('image object URL execution tests cover success replacement rejection and revocation', () => {
  for (const fragment of [
    'opens a ready image lifecycle into a render surface',
    'revokes stale active URLs before replacement',
    'rejects non-image and mismatched inputs',
    'revokes active execution state',
    "Object.hasOwn(execution, 'assetBytes')",
  ]) {
    assert.equal(
      executionTest.includes(fragment),
      true,
      `${fragment} missing`,
    );
  }
});

test('execution module does not own browser or React rendering authority', () => {
  for (const forbidden of [
    /\bfetch\s*\(/u,
    /\binvoke\s*\(/u,
    /\bURL\.createObjectURL\b/u,
    /\bcreateObjectURL\s*\(/u,
    /\bURL\.revokeObjectURL\b/u,
    /\brevokeObjectURL\s*\(/u,
    /\bnew\s+Blob\b/u,
    /<img\b/u,
    /\bsrc=/u,
    /\blocalStorage\b/u,
    /\bsessionStorage\b/u,
    /\bindexedDB\b/u,
    /\bdangerouslySetInnerHTML\b/u,
  ]) {
    assert.doesNotMatch(
      executableExecution,
      forbidden,
    );
  }
});

test('object URL APIs stay isolated while image src stays projected', () => {
  assert.equal(
    objectUrlHandoff.includes('urlApi.createObjectURL'),
    true,
  );

  assert.equal(
    objectUrlHandoff.includes('urlApi.revokeObjectURL'),
    true,
  );

  assert.equal(
    imageSurfaceModel.includes("objectUrl.startsWith('blob:')"),
    true,
  );

  assert.equal(
    imageSurfaceComponent.includes('src={renderSurfaceView.objectUrl}'),
    true,
  );
});
