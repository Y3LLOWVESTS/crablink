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
  read('src/library/tvLibraryVerifiedRenderDisplayModel.js');

const panel =
  read('src/library/TvLibraryAssetDetailPanel.jsx');

const css =
  read('src/styles/tv.css');

const executableModel =
  stripComments(model);

const executablePanel =
  stripComments(panel);

test('verified display model creates image and article surfaces without byte authority', () => {
  for (const fragment of [
    'projectTvLibraryVerifiedRenderDisplay',
    'IMAGE_FRAME',
    'ARTICLE_READER',
    'displayKindForRender',
    'verifiedRenderView.canonicalCrabUrl',
    'verifiedRenderView.cid',
    'detail.canonicalCrabUrl',
    'detail.cid',
    'unsafe HTML injection',
  ]) {
    assert.equal(
      model.includes(fragment),
      true,
      `${fragment} missing`,
    );
  }

  for (const forbidden of [
    /\bfetch\s*\(/u,
    /\binvoke\s*\(/u,
    /\bcreateObjectURL\s*\(/u,
    /\bURL\.createObjectURL\b/u,
    /\bBlob\b/u,
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

test('Library panel exposes distinct verified display surfaces', () => {
  for (const fragment of [
    'verifiedRenderDisplayView',
    'projectTvLibraryVerifiedRenderDisplay',
    'tv-library-verified-display',
    'data-tv-library-verified-display-state',
    'data-tv-library-verified-display-kind',
    'tv-library-verified-display__image-frame',
    'tv-library-verified-display__article-reader',
    'Verified image display',
    'Verified article reader',
  ]) {
    assert.equal(
      panel.includes(fragment),
      true,
      `${fragment} missing`,
    );
  }

  assert.doesNotMatch(
    executablePanel,
    /<img\b/u,
  );

  assert.doesNotMatch(
    executablePanel,
    /\bsrc=/u,
  );

  assert.doesNotMatch(
    executablePanel,
    /\bdangerouslySetInnerHTML\b/u,
  );

  assert.doesNotMatch(
    executablePanel,
    /\bfetch\s*\(/u,
  );

  assert.doesNotMatch(
    executablePanel,
    /\binvoke\s*\(/u,
  );
});

test('verified display CSS exposes ten-foot image and article shells', () => {
  for (const selector of [
    '.tv-library-verified-display',
    '.tv-library-verified-display__status',
    '.tv-library-verified-display__image-frame',
    '.tv-library-verified-display__image-glyph',
    '.tv-library-verified-display__article-reader',
    '.tv-library-verified-display__article-lines',
  ]) {
    assert.equal(
      css.includes(selector),
      true,
      `${selector} missing`,
    );
  }
});