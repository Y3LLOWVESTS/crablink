import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_SCHEMA,
  TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_STATE,
} from './tvLibraryVerifiedObjectUrlHandoff.js';

import {
  TV_LIBRARY_VERIFIED_IMAGE_RENDER_SURFACE_CODE,
  TV_LIBRARY_VERIFIED_IMAGE_RENDER_SURFACE_SCHEMA,
  TV_LIBRARY_VERIFIED_IMAGE_RENDER_SURFACE_STATE,
  createIdleTvLibraryVerifiedImageRenderSurface,
  projectTvLibraryVerifiedImageRenderSurface,
} from './tvLibraryVerifiedImageRenderSurfaceModel.js';

const HASH = 'd'.repeat(64);

function handoff({
  state =
    TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_STATE.ACTIVE,
  active = true,
  objectUrl =
    'blob:crablink-tv-verified-image',
  contentType = 'image/png',
  assetKind = 'image',
  cid = `b3:${HASH}`,
  canonicalCrabUrl = `crab://${HASH}.image`,
  contentLength = 4,
} = {}) {
  return Object.freeze({
    schema:
      TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_SCHEMA,
    state,
    active,
    revoked: false,
    revokeRequired: true,
    objectUrl,
    displayKind: 'image_frame',
    assetKind,
    canonicalCrabUrl,
    cid,
    contentType,
    contentLength,
    code:
      'TV_LIBRARY_OBJECT_URL_HANDOFF_ACTIVE',
    message:
      'active',
  });
}

test('verified image render surface constants and idle view are explicit and immutable', () => {
  const idle =
    createIdleTvLibraryVerifiedImageRenderSurface();

  assert.equal(
    idle.schema,
    TV_LIBRARY_VERIFIED_IMAGE_RENDER_SURFACE_SCHEMA,
  );

  assert.equal(
    idle.state,
    TV_LIBRARY_VERIFIED_IMAGE_RENDER_SURFACE_STATE.IDLE,
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

test('verified image render surface accepts active image object URL handoffs', () => {
  const view =
    projectTvLibraryVerifiedImageRenderSurface({
      objectUrlHandoffView:
        handoff(),
    });

  assert.equal(
    view.state,
    TV_LIBRARY_VERIFIED_IMAGE_RENDER_SURFACE_STATE.READY,
  );

  assert.equal(
    view.ready,
    true,
  );

  assert.equal(
    view.objectUrl,
    'blob:crablink-tv-verified-image',
  );

  assert.equal(
    view.contentType,
    'image/png',
  );

  assert.equal(
    view.cid,
    `b3:${HASH}`,
  );

  assert.equal(
    Object.hasOwn(view, 'assetBytes'),
    false,
  );
});

test('verified image render surface waits for inactive handoffs', () => {
  const view =
    projectTvLibraryVerifiedImageRenderSurface({
      objectUrlHandoffView:
        handoff({
          state:
            TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_STATE.IDLE,
          active:
            false,
          objectUrl:
            null,
        }),
    });

  assert.equal(
    view.state,
    TV_LIBRARY_VERIFIED_IMAGE_RENDER_SURFACE_STATE.IDLE,
  );
});

test('verified image render surface rejects non-image or invalid object URLs', () => {
  assert.equal(
    projectTvLibraryVerifiedImageRenderSurface({
      objectUrlHandoffView:
        handoff({
          contentType:
            'text/plain',
        }),
    }).code,
    TV_LIBRARY_VERIFIED_IMAGE_RENDER_SURFACE_CODE.NOT_IMAGE,
  );

  assert.equal(
    projectTvLibraryVerifiedImageRenderSurface({
      objectUrlHandoffView:
        handoff({
          objectUrl:
            'https://example.invalid/image.png',
        }),
    }).code,
    TV_LIBRARY_VERIFIED_IMAGE_RENDER_SURFACE_CODE.INVALID_OBJECT_URL,
  );

  assert.equal(
    projectTvLibraryVerifiedImageRenderSurface({
      objectUrlHandoffView:
        handoff({
          cid:
            '',
        }),
    }).code,
    TV_LIBRARY_VERIFIED_IMAGE_RENDER_SURFACE_CODE.MISSING_IDENTIFIER,
  );
});
