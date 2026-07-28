import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TV_LIBRARY_ASSET_DETAIL_KIND,
} from './tvLibraryAssetDetailModel.js';

import {
  TV_LIBRARY_VERIFIED_ASSET_RENDER_KIND,
} from './tvLibraryVerifiedAssetRenderModel.js';

import {
  TV_LIBRARY_VERIFIED_RENDER_DISPLAY_KIND,
  TV_LIBRARY_VERIFIED_RENDER_DISPLAY_LIMITS,
  TV_LIBRARY_VERIFIED_RENDER_DISPLAY_SCHEMA,
  TV_LIBRARY_VERIFIED_RENDER_DISPLAY_STATE,
  createIdleTvLibraryVerifiedRenderDisplay,
  projectTvLibraryVerifiedRenderDisplay,
} from './tvLibraryVerifiedRenderDisplayModel.js';

const HASH = 'a'.repeat(64);

function detail({
  assetKind = 'image',
  hash = HASH,
} = {}) {
  return Object.freeze({
    kind: TV_LIBRARY_ASSET_DETAIL_KIND.READY,
    assetKind,
    canonicalCrabUrl:
      `crab://${hash}.${assetKind}`,
    cid:
      `b3:${hash}`,
  });
}

function renderView({
  renderKind = 'image',
  assetKind = 'image',
  hash = HASH,
  kind =
    TV_LIBRARY_VERIFIED_ASSET_RENDER_KIND.READY,
  verified = true,
  contentType = 'image/png',
  contentLength = 512,
} = {}) {
  return Object.freeze({
    schema:
      'crablink.tv.library-verified-asset-render.v1',
    kind,
    verified,
    renderKind,
    assetKind,
    canonicalCrabUrl:
      `crab://${hash}.${assetKind}`,
    cid:
      `b3:${hash}`,
    contentType,
    contentLength,
    maxVerifiedAssetBytes:
      4_194_304,
    code:
      'TV_LIBRARY_VERIFIED_RENDER_READY',
    message:
      'ready',
  });
}

test('verified display constants and idle view are explicit and immutable', () => {
  const idle =
    createIdleTvLibraryVerifiedRenderDisplay();

  assert.equal(
    idle.schema,
    TV_LIBRARY_VERIFIED_RENDER_DISPLAY_SCHEMA,
  );

  assert.equal(
    idle.state,
    TV_LIBRARY_VERIFIED_RENDER_DISPLAY_STATE.IDLE,
  );

  assert.equal(
    idle.ready,
    false,
  );

  assert.equal(
    Object.isFrozen(idle),
    true,
  );

  assert.equal(
    TV_LIBRARY_VERIFIED_RENDER_DISPLAY_LIMITS
      .MAX_VISIBLE_LENGTH,
    4_194_304,
  );
});

test('verified display projects a distinct image frame surface', () => {
  const view =
    projectTvLibraryVerifiedRenderDisplay({
      detailView:
        detail(),
      verifiedRenderView:
        renderView(),
    });

  assert.equal(
    view.state,
    TV_LIBRARY_VERIFIED_RENDER_DISPLAY_STATE.READY,
  );

  assert.equal(
    view.ready,
    true,
  );

  assert.equal(
    view.displayKind,
    TV_LIBRARY_VERIFIED_RENDER_DISPLAY_KIND.IMAGE_FRAME,
  );

  assert.equal(
    view.title,
    'Verified image display',
  );

  assert.equal(
    view.canonicalCrabUrl,
    `crab://${HASH}.image`,
  );

  assert.equal(
    view.cid,
    `b3:${HASH}`,
  );
});

test('verified display projects a distinct article reader surface', () => {
  const view =
    projectTvLibraryVerifiedRenderDisplay({
      detailView:
        detail({
          assetKind:
            'article',
        }),
      verifiedRenderView:
        renderView({
          renderKind:
            'article',
          assetKind:
            'article',
          contentType:
            'text/plain; charset=utf-8',
        }),
    });

  assert.equal(
    view.state,
    TV_LIBRARY_VERIFIED_RENDER_DISPLAY_STATE.READY,
  );

  assert.equal(
    view.displayKind,
    TV_LIBRARY_VERIFIED_RENDER_DISPLAY_KIND.ARTICLE_READER,
  );

  assert.equal(
    view.title,
    'Verified article reader',
  );

  assert.match(
    view.copy,
    /unsafe HTML/u,
  );
});

test('verified display rejects stale or mismatched render facts', () => {
  const view =
    projectTvLibraryVerifiedRenderDisplay({
      detailView:
        detail(),
      verifiedRenderView:
        renderView({
          hash:
            'b'.repeat(64),
        }),
    });

  assert.equal(
    view.state,
    TV_LIBRARY_VERIFIED_RENDER_DISPLAY_STATE.REJECTED,
  );

  assert.equal(
    view.ready,
    false,
  );

  assert.equal(
    view.code,
    'TV_LIBRARY_VERIFIED_DISPLAY_MISMATCH',
  );
});

test('verified display stays idle until render facts are ready', () => {
  const view =
    projectTvLibraryVerifiedRenderDisplay({
      detailView:
        detail(),
      verifiedRenderView:
        renderView({
          kind:
            TV_LIBRARY_VERIFIED_ASSET_RENDER_KIND.REJECTED,
          verified:
            false,
        }),
    });

  assert.equal(
    view.state,
    TV_LIBRARY_VERIFIED_RENDER_DISPLAY_STATE.IDLE,
  );

  assert.equal(
    view.ready,
    false,
  );
});