import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_STATE,
} from './tvLibraryVerifiedByteRenderLifecycleModel.js';

import {
  TV_LIBRARY_VERIFIED_RENDER_DISPLAY_KIND,
} from './tvLibraryVerifiedRenderDisplayModel.js';

import {
  TV_LIBRARY_VERIFIED_IMAGE_OBJECT_URL_EXECUTION_CODE,
  TV_LIBRARY_VERIFIED_IMAGE_OBJECT_URL_EXECUTION_SCHEMA,
  TV_LIBRARY_VERIFIED_IMAGE_OBJECT_URL_EXECUTION_STATE,
  createIdleTvLibraryVerifiedImageObjectUrlExecution,
  executeTvLibraryVerifiedImageObjectUrl,
  revokeTvLibraryVerifiedImageObjectUrlExecution,
} from './tvLibraryVerifiedImageObjectUrlExecution.js';

const HASH = 'e'.repeat(64);

function readyLifecycle({
  displayKind =
    TV_LIBRARY_VERIFIED_RENDER_DISPLAY_KIND
      .IMAGE_FRAME,
  assetKind = 'image',
  contentType = 'image/png',
  contentLength = 4,
  canonicalCrabUrl = `crab://${HASH}.image`,
  cid = `b3:${HASH}`,
} = {}) {
  return Object.freeze({
    schema:
      'crablink.tv.library-verified-byte-render-lifecycle.v1',
    state:
      TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_STATE
        .READY,
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

function fakeObjectUrlPort() {
  let counter = 0;
  const created = [];
  const revoked = [];

  return {
    created,
    revoked,

    createObjectUrl(request) {
      counter += 1;

      const objectUrl =
        `blob:crablink-tv-phase9o-${counter}`;

      created.push({
        objectUrl,
        byteLength:
          request.assetBytes.byteLength,
        contentType:
          request.contentType,
        canonicalCrabUrl:
          request.canonicalCrabUrl,
        cid:
          request.cid,
      });

      return objectUrl;
    },

    revokeObjectUrl(objectUrl) {
      revoked.push(objectUrl);
    },
  };
}

test('image object URL execution constants and idle view are explicit and immutable', () => {
  const idle =
    createIdleTvLibraryVerifiedImageObjectUrlExecution();

  assert.equal(
    idle.schema,
    TV_LIBRARY_VERIFIED_IMAGE_OBJECT_URL_EXECUTION_SCHEMA,
  );

  assert.equal(
    idle.state,
    TV_LIBRARY_VERIFIED_IMAGE_OBJECT_URL_EXECUTION_STATE.IDLE,
  );

  assert.equal(
    idle.ready,
    false,
  );

  assert.equal(
    idle.objectUrl,
    null,
  );

  assert.equal(
    Object.isFrozen(idle),
    true,
  );
});

test('image object URL execution opens a ready image lifecycle into a render surface', () => {
  const port =
    fakeObjectUrlPort();

  const execution =
    executeTvLibraryVerifiedImageObjectUrl({
      lifecycleView:
        readyLifecycle(),
      assetBytes:
        new Uint8Array([1, 2, 3, 4]),
      objectUrlPort:
        port,
    });

  assert.equal(
    execution.state,
    TV_LIBRARY_VERIFIED_IMAGE_OBJECT_URL_EXECUTION_STATE.READY,
  );

  assert.equal(
    execution.ready,
    true,
  );

  assert.equal(
    execution.objectUrl,
    'blob:crablink-tv-phase9o-1',
  );

  assert.equal(
    execution.imageRenderSurfaceView.ready,
    true,
  );

  assert.equal(
    execution.objectUrlHandoffView.revokeRequired,
    true,
  );

  assert.equal(
    Object.hasOwn(execution, 'assetBytes'),
    false,
  );

  assert.equal(
    Object.hasOwn(execution.imageRenderSurfaceView, 'assetBytes'),
    false,
  );

  assert.deepEqual(
    port.created.map((entry) => entry.byteLength),
    [4],
  );
});

test('image object URL execution revokes stale active URLs before replacement', () => {
  const port =
    fakeObjectUrlPort();

  const first =
    executeTvLibraryVerifiedImageObjectUrl({
      lifecycleView:
        readyLifecycle(),
      assetBytes:
        new Uint8Array([1, 2, 3, 4]),
      objectUrlPort:
        port,
    });

  const second =
    executeTvLibraryVerifiedImageObjectUrl({
      currentExecutionView:
        first,
      lifecycleView:
        readyLifecycle({
          contentLength:
            3,
        }),
      assetBytes:
        new Uint8Array([5, 6, 7]),
      objectUrlPort:
        port,
    });

  assert.deepEqual(
    port.revoked,
    ['blob:crablink-tv-phase9o-1'],
  );

  assert.equal(
    second.objectUrl,
    'blob:crablink-tv-phase9o-2',
  );

  assert.equal(
    second.ready,
    true,
  );
});

test('image object URL execution rejects non-image and mismatched inputs', () => {
  const port =
    fakeObjectUrlPort();

  const article =
    executeTvLibraryVerifiedImageObjectUrl({
      lifecycleView:
        readyLifecycle({
          displayKind:
            TV_LIBRARY_VERIFIED_RENDER_DISPLAY_KIND
              .ARTICLE_READER,
          assetKind:
            'article',
          contentType:
            'text/plain',
          contentLength:
            5,
          canonicalCrabUrl:
            `crab://${HASH}.article`,
        }),
      assetBytes:
        new TextEncoder().encode('hello'),
      objectUrlPort:
        port,
    });

  assert.equal(
    article.state,
    TV_LIBRARY_VERIFIED_IMAGE_OBJECT_URL_EXECUTION_STATE.REJECTED,
  );

  assert.equal(
    article.code,
    TV_LIBRARY_VERIFIED_IMAGE_OBJECT_URL_EXECUTION_CODE.SURFACE_REJECTED,
  );

  const mismatch =
    executeTvLibraryVerifiedImageObjectUrl({
      lifecycleView:
        readyLifecycle({
          contentLength:
            9,
        }),
      assetBytes:
        new Uint8Array([1, 2, 3, 4]),
      objectUrlPort:
        port,
    });

  assert.equal(
    mismatch.state,
    TV_LIBRARY_VERIFIED_IMAGE_OBJECT_URL_EXECUTION_STATE.REJECTED,
  );

  assert.equal(
    mismatch.code,
    TV_LIBRARY_VERIFIED_IMAGE_OBJECT_URL_EXECUTION_CODE.HANDOFF_REJECTED,
  );
});

test('image object URL execution revokes active execution state', () => {
  const port =
    fakeObjectUrlPort();

  const active =
    executeTvLibraryVerifiedImageObjectUrl({
      lifecycleView:
        readyLifecycle(),
      assetBytes:
        new Uint8Array([1, 2, 3, 4]),
      objectUrlPort:
        port,
    });

  const revoked =
    revokeTvLibraryVerifiedImageObjectUrlExecution({
      executionView:
        active,
      objectUrlPort:
        port,
    });

  assert.equal(
    revoked.state,
    TV_LIBRARY_VERIFIED_IMAGE_OBJECT_URL_EXECUTION_STATE.REVOKED,
  );

  assert.equal(
    revoked.ready,
    false,
  );

  assert.equal(
    revoked.objectUrl,
    null,
  );

  assert.deepEqual(
    port.revoked,
    ['blob:crablink-tv-phase9o-1'],
  );
});
