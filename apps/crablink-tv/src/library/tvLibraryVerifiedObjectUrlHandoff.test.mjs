import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_STATE,
} from './tvLibraryVerifiedByteRenderLifecycleModel.js';

import {
  TV_LIBRARY_VERIFIED_RENDER_DISPLAY_KIND,
} from './tvLibraryVerifiedRenderDisplayModel.js';

import {
  TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_CODE,
  TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_SCHEMA,
  TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_STATE,
  createBrowserTvLibraryVerifiedObjectUrlPort,
  createIdleTvLibraryVerifiedObjectUrlHandoff,
  openTvLibraryVerifiedObjectUrlHandoff,
  replaceTvLibraryVerifiedObjectUrlHandoff,
  revokeTvLibraryVerifiedObjectUrlHandoff,
} from './tvLibraryVerifiedObjectUrlHandoff.js';

const HASH = 'c'.repeat(64);

function readyLifecycle({
  displayKind =
    TV_LIBRARY_VERIFIED_RENDER_DISPLAY_KIND
      .IMAGE_FRAME,
  assetKind = 'image',
  contentType = 'image/png',
  contentLength = 4,
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
    canonicalCrabUrl:
      `crab://${HASH}.${assetKind}`,
    cid:
      `b3:${HASH}`,
    contentType,
    contentLength,
    objectUrl: null,
    code:
      'TV_LIBRARY_BYTE_RENDER_READY',
    message:
      'ready',
  });
}

function fakePort({
  createUrl =
    'blob:crablink-tv-verified-object',
} = {}) {
  const created = [];
  const revoked = [];

  return {
    created,
    revoked,

    createObjectUrl(request) {
      created.push({
        byteLength:
          request.assetBytes.byteLength,
        contentType:
          request.contentType,
        displayKind:
          request.displayKind,
        canonicalCrabUrl:
          request.canonicalCrabUrl,
        cid:
          request.cid,
      });

      return createUrl;
    },

    revokeObjectUrl(objectUrl) {
      revoked.push(objectUrl);
    },
  };
}

test('object URL handoff constants and idle view are explicit and immutable', () => {
  const idle =
    createIdleTvLibraryVerifiedObjectUrlHandoff();

  assert.equal(
    idle.schema,
    TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_SCHEMA,
  );

  assert.equal(
    idle.state,
    TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_STATE.IDLE,
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

test('object URL handoff opens verified image bytes through an injected port', () => {
  const port =
    fakePort();

  const active =
    openTvLibraryVerifiedObjectUrlHandoff({
      lifecycleView:
        readyLifecycle(),
      assetBytes:
        new Uint8Array([1, 2, 3, 4]),
      objectUrlPort:
        port,
    });

  assert.equal(
    active.state,
    TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_STATE.ACTIVE,
  );

  assert.equal(
    active.objectUrl,
    'blob:crablink-tv-verified-object',
  );

  assert.equal(
    active.revokeRequired,
    true,
  );

  assert.equal(
    Object.hasOwn(active, 'assetBytes'),
    false,
  );

  assert.deepEqual(
    port.created,
    [
      {
        byteLength: 4,
        contentType: 'image/png',
        displayKind:
          TV_LIBRARY_VERIFIED_RENDER_DISPLAY_KIND.IMAGE_FRAME,
        canonicalCrabUrl:
          `crab://${HASH}.image`,
        cid:
          `b3:${HASH}`,
      },
    ],
  );
});

test('object URL handoff opens verified article bytes through the same path', () => {
  const port =
    fakePort({
      createUrl:
        'blob:crablink-tv-verified-article',
    });

  const active =
    openTvLibraryVerifiedObjectUrlHandoff({
      lifecycleView:
        readyLifecycle({
          displayKind:
            TV_LIBRARY_VERIFIED_RENDER_DISPLAY_KIND
              .ARTICLE_READER,
          assetKind:
            'article',
          contentType:
            'text/plain; charset=utf-8',
          contentLength:
            5,
        }),
      assetBytes:
        new TextEncoder().encode('hello'),
      objectUrlPort:
        port,
    });

  assert.equal(
    active.state,
    TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_STATE.ACTIVE,
  );

  assert.equal(
    active.objectUrl,
    'blob:crablink-tv-verified-article',
  );

  assert.equal(
    active.displayKind,
    TV_LIBRARY_VERIFIED_RENDER_DISPLAY_KIND.ARTICLE_READER,
  );
});

test('object URL handoff rejects unsafe byte or lifecycle mismatches', () => {
  assert.equal(
    openTvLibraryVerifiedObjectUrlHandoff({
      lifecycleView:
        {
          ...readyLifecycle(),
          state:
            TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_STATE
              .IDLE,
          ready:
            false,
        },
      assetBytes:
        new Uint8Array([1, 2, 3, 4]),
      objectUrlPort:
        fakePort(),
    }).code,
    TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_CODE.NOT_READY,
  );

  assert.equal(
    openTvLibraryVerifiedObjectUrlHandoff({
      lifecycleView:
        readyLifecycle(),
      assetBytes:
        new Uint8Array([]),
      objectUrlPort:
        fakePort(),
    }).code,
    TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_CODE.EMPTY_BYTES,
  );

  assert.equal(
    openTvLibraryVerifiedObjectUrlHandoff({
      lifecycleView:
        readyLifecycle({
          contentLength:
            9,
        }),
      assetBytes:
        new Uint8Array([1, 2, 3, 4]),
      objectUrlPort:
        fakePort(),
    }).code,
    TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_CODE.LENGTH_MISMATCH,
  );

  assert.equal(
    openTvLibraryVerifiedObjectUrlHandoff({
      lifecycleView:
        readyLifecycle({
          contentType:
            'application/octet-stream',
        }),
      assetBytes:
        new Uint8Array([1, 2, 3, 4]),
      objectUrlPort:
        fakePort(),
    }).code,
    TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_CODE.UNSUPPORTED_DISPLAY,
  );
});

test('object URL handoff revokes active object URLs before replacement', () => {
  const port =
    fakePort();

  const active =
    openTvLibraryVerifiedObjectUrlHandoff({
      lifecycleView:
        readyLifecycle(),
      assetBytes:
        new Uint8Array([1, 2, 3, 4]),
      objectUrlPort:
        port,
    });

  const replaced =
    replaceTvLibraryVerifiedObjectUrlHandoff({
      currentHandoffView:
        active,
      nextLifecycleView:
        readyLifecycle(),
      assetBytes:
        new Uint8Array([5, 6, 7, 8]),
      objectUrlPort:
        port,
    });

  assert.deepEqual(
    port.revoked,
    [
      'blob:crablink-tv-verified-object',
    ],
  );

  assert.equal(
    replaced.state,
    TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_STATE.ACTIVE,
  );

  const revoked =
    revokeTvLibraryVerifiedObjectUrlHandoff({
      handoffView:
        replaced,
      objectUrlPort:
        port,
    });

  assert.equal(
    revoked.state,
    TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_STATE.REVOKED,
  );

  assert.equal(
    revoked.objectUrl,
    null,
  );

  assert.equal(
    port.revoked.length,
    2,
  );
});

test('browser object URL port wraps only Blob and URL APIs', () => {
  const createdBlobs = [];
  const revoked = [];

  class FakeBlob {
    constructor(parts, options) {
      createdBlobs.push({
        parts,
        options,
      });
    }
  }

  const port =
    createBrowserTvLibraryVerifiedObjectUrlPort({
      BlobCtor:
        FakeBlob,
      urlApi:
        {
          createObjectURL(blob) {
            assert.equal(
              blob instanceof FakeBlob,
              true,
            );

            return 'blob:browser-port';
          },

          revokeObjectURL(objectUrl) {
            revoked.push(objectUrl);
          },
        },
    });

  const objectUrl =
    port.createObjectUrl({
      assetBytes:
        new Uint8Array([1, 2]),
      contentType:
        'image/png',
    });

  assert.equal(
    objectUrl,
    'blob:browser-port',
  );

  port.revokeObjectUrl(
    objectUrl,
  );

  assert.equal(
    createdBlobs[0].options.type,
    'image/png',
  );

  assert.deepEqual(
    revoked,
    [
      'blob:browser-port',
    ],
  );
});
