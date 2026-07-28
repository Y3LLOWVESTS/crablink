import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_SCHEMA,
  TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_STATE,
} from './tvLibraryVerifiedByteRenderLifecycleModel.js';

import {
  TV_LIBRARY_VERIFIED_RENDER_DISPLAY_KIND,
} from './tvLibraryVerifiedRenderDisplayModel.js';

import {
  TV_LIBRARY_VERIFIED_ARTICLE_RENDER_SURFACE_CODE,
  TV_LIBRARY_VERIFIED_ARTICLE_RENDER_SURFACE_SCHEMA,
  TV_LIBRARY_VERIFIED_ARTICLE_RENDER_SURFACE_STATE,
  createIdleTvLibraryVerifiedArticleRenderSurface,
  projectTvLibraryVerifiedArticleRenderSurface,
} from './tvLibraryVerifiedArticleRenderSurfaceModel.js';

const HASH = 'f'.repeat(64);

function bytes(text) {
  return new TextEncoder().encode(text);
}

function readyLifecycle({
  displayKind =
    TV_LIBRARY_VERIFIED_RENDER_DISPLAY_KIND.ARTICLE_READER,
  assetKind = 'article',
  contentType = 'text/plain',
  contentLength = 37,
  canonicalCrabUrl = `crab://${HASH}.article`,
  cid = `b3:${HASH}`,
} = {}) {
  return Object.freeze({
    schema:
      TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_SCHEMA,
    state:
      TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_STATE.READY,
    ready: true,
    active: false,
    revoked: false,
    revokeRequired: false,
    displayKind,
    assetKind,
    canonicalCrabUrl,
    cid,
    contentType,
    contentLength,
    objectUrl: null,
    code:
      'TV_LIBRARY_BYTE_RENDER_READY',
    message:
      'ready',
  });
}

test('verified article render surface constants and idle view are explicit and immutable', () => {
  const idle =
    createIdleTvLibraryVerifiedArticleRenderSurface();

  assert.equal(
    idle.schema,
    TV_LIBRARY_VERIFIED_ARTICLE_RENDER_SURFACE_SCHEMA,
  );

  assert.equal(
    idle.state,
    TV_LIBRARY_VERIFIED_ARTICLE_RENDER_SURFACE_STATE.IDLE,
  );

  assert.deepEqual(
    idle.paragraphs,
    [],
  );

  assert.equal(
    Object.isFrozen(idle),
    true,
  );
});

test('verified article render surface decodes bounded verified text bytes', () => {
  const text =
    'CrabLink article title\n\nVerified body paragraph.';
  const view =
    projectTvLibraryVerifiedArticleRenderSurface({
      lifecycleView:
        readyLifecycle({
          contentLength:
            bytes(text).byteLength,
        }),
      assetBytes:
        bytes(text),
    });

  assert.equal(
    view.state,
    TV_LIBRARY_VERIFIED_ARTICLE_RENDER_SURFACE_STATE.READY,
  );

  assert.equal(
    view.ready,
    true,
  );

  assert.equal(
    view.cid,
    `b3:${HASH}`,
  );

  assert.deepEqual(
    view.paragraphs,
    [
      'CrabLink article title',
      'Verified body paragraph.',
    ],
  );

  assert.equal(
    Object.hasOwn(view, 'assetBytes'),
    false,
  );
});

test('verified article render surface renders html-like input as text paragraphs only', () => {
  const unsafeText =
    '<h1>Title</h1>\n\n<script>alert(1)</script>';
  const view =
    projectTvLibraryVerifiedArticleRenderSurface({
      lifecycleView:
        readyLifecycle({
          contentLength:
            bytes(unsafeText).byteLength,
        }),
      assetBytes:
        bytes(unsafeText),
    });

  assert.equal(
    view.state,
    TV_LIBRARY_VERIFIED_ARTICLE_RENDER_SURFACE_STATE.READY,
  );

  assert.deepEqual(
    view.paragraphs,
    [
      '<h1>Title</h1>',
      '<script>alert(1)</script>',
    ],
  );
});

test('verified article render surface accepts json article bytes as visible text', () => {
  const json =
    JSON.stringify({
      title:
        'Verified JSON article',
      body:
        'JSON stays rendered as text.',
    });

  const view =
    projectTvLibraryVerifiedArticleRenderSurface({
      lifecycleView:
        readyLifecycle({
          contentType:
            'application/json',
          contentLength:
            bytes(json).byteLength,
        }),
      assetBytes:
        bytes(json),
    });

  assert.equal(
    view.state,
    TV_LIBRARY_VERIFIED_ARTICLE_RENDER_SURFACE_STATE.READY,
  );

  assert.equal(
    view.contentType,
    'application/json',
  );

  assert.equal(
    view.paragraphs.length,
    1,
  );
});

test('verified article render surface rejects non-article and mismatched bytes', () => {
  const image =
    projectTvLibraryVerifiedArticleRenderSurface({
      lifecycleView:
        readyLifecycle({
          displayKind:
            TV_LIBRARY_VERIFIED_RENDER_DISPLAY_KIND.IMAGE_FRAME,
          assetKind:
            'image',
          contentType:
            'image/png',
          contentLength:
            4,
          canonicalCrabUrl:
            `crab://${HASH}.image`,
        }),
      assetBytes:
        new Uint8Array([1, 2, 3, 4]),
    });

  assert.equal(
    image.code,
    TV_LIBRARY_VERIFIED_ARTICLE_RENDER_SURFACE_CODE.NOT_ARTICLE,
  );

  const mismatch =
    projectTvLibraryVerifiedArticleRenderSurface({
      lifecycleView:
        readyLifecycle({
          contentLength:
            99,
        }),
      assetBytes:
        bytes('short'),
    });

  assert.equal(
    mismatch.code,
    TV_LIBRARY_VERIFIED_ARTICLE_RENDER_SURFACE_CODE.LENGTH_MISMATCH,
  );

  const decodeFailed =
    projectTvLibraryVerifiedArticleRenderSurface({
      lifecycleView:
        readyLifecycle({
          contentLength:
            2,
        }),
      assetBytes:
        new Uint8Array([0xff, 0xff]),
    });

  assert.equal(
    decodeFailed.code,
    TV_LIBRARY_VERIFIED_ARTICLE_RENDER_SURFACE_CODE.DECODE_FAILED,
  );
});
