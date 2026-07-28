import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const appRoot =
  path.resolve(
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

const handoff =
  read(
    'src/library/tvLibraryVerifiedObjectUrlHandoff.js',
  );

const handoffTest =
  read(
    'src/library/tvLibraryVerifiedObjectUrlHandoff.test.mjs',
  );

const lifecycle =
  read(
    'src/library/tvLibraryVerifiedByteRenderLifecycleModel.js',
  );

const lifecycleSourceTest =
  read(
    'src/library/TvLibraryVerifiedByteRenderLifecycle.source.test.mjs',
  );

const app =
  read('src/app/TvApp.jsx');

const panel =
  read('src/library/TvLibraryAssetDetailPanel.jsx');

const executableHandoff =
  stripComments(handoff);

const executableLifecycle =
  stripComments(lifecycle);

const executableApp =
  stripComments(app);

const executablePanel =
  stripComments(panel);

test('object URL handoff isolates browser Blob and URL APIs in one module', () => {
  for (const fragment of [
    'createBrowserTvLibraryVerifiedObjectUrlPort',
    'urlApi.createObjectURL',
    'urlApi.revokeObjectURL',
    'new BlobCtor',
    'openTvLibraryVerifiedObjectUrlHandoff',
    'revokeTvLibraryVerifiedObjectUrlHandoff',
    'replaceTvLibraryVerifiedObjectUrlHandoff',
    'activateTvLibraryVerifiedByteRenderLifecycle',
    'revokeTvLibraryVerifiedByteRenderLifecycle',
  ]) {
    assert.equal(
      handoff.includes(fragment),
      true,
      `${fragment} missing`,
    );
  }

  for (const forbidden of [
    /\bfetch\s*\(/u,
    /\binvoke\s*\(/u,
    /\blocalStorage\b/u,
    /\bsessionStorage\b/u,
    /\bindexedDB\b/u,
    /\bdangerouslySetInnerHTML\b/u,
    /<img\b/u,
    /\bsrc=/u,
  ]) {
    assert.doesNotMatch(
      executableHandoff,
      forbidden,
    );
  }
});

test('object URL handoff tests cover create revoke replace and fake browser port', () => {
  for (const fragment of [
    'opens verified image bytes through an injected port',
    'opens verified article bytes through the same path',
    'rejects unsafe byte or lifecycle mismatches',
    'revokes active object URLs before replacement',
    'browser object URL port wraps only Blob and URL APIs',
  ]) {
    assert.equal(
      handoffTest.includes(fragment),
      true,
      `${fragment} missing`,
    );
  }
});

test('Phase 9M leaves React surfaces unrendered and lifecycle model byte-free', () => {
  assert.equal(
    lifecycleSourceTest.includes(
      'Phase 9L does not wire React byte rendering yet',
    ),
    true,
  );

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
      executableLifecycle,
      forbidden,
    );

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
