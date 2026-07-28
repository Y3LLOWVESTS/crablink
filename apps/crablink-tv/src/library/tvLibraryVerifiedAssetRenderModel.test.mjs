import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TV_LIBRARY_ASSET_DETAIL_KIND,
} from './tvLibraryAssetDetailModel.js';

import {
  TV_LIBRARY_VERIFIED_ASSET_RENDER_KIND,
  TV_LIBRARY_VERIFIED_ASSET_RENDER_LIMITS,
  TV_LIBRARY_VERIFIED_ASSET_RENDER_SCHEMA,
  createIdleTvLibraryVerifiedAssetRender,
  projectTvLibraryVerifiedAssetRender,
} from './tvLibraryVerifiedAssetRenderModel.js';

const IMAGE_HASH = 'a'.repeat(64);
const ARTICLE_HASH = 'b'.repeat(64);

function detail({
  assetKind = 'image',
  hash = IMAGE_HASH,
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

function verification({
  renderKind = 'image',
  assetKind = 'image',
  hash = IMAGE_HASH,
  contentType = 'image/png',
  contentLength = 12,
  maxVerifiedAssetBytes = 4_194_304,
  verified = true,
} = {}) {
  return Object.freeze({
    schema:
      'crablink.tv.asset-manifest-check-result.v1',
    verified,
    renderKind,
    assetKind,
    crabUrl:
      `crab://${hash}.${assetKind}`,
    contentCid:
      `b3:${hash}`,
    contentType,
    contentLength,
    maxVerifiedAssetBytes,
  });
}

test('verified render constants and idle view are explicit and immutable', () => {
  assert.equal(
    TV_LIBRARY_VERIFIED_ASSET_RENDER_SCHEMA,
    'crablink.tv.library-verified-asset-render.v1',
  );

  assert.equal(
    Object.isFrozen(TV_LIBRARY_VERIFIED_ASSET_RENDER_KIND),
    true,
  );

  assert.equal(
    Object.isFrozen(TV_LIBRARY_VERIFIED_ASSET_RENDER_LIMITS),
    true,
  );

  const idle =
    createIdleTvLibraryVerifiedAssetRender();

  assert.equal(
    idle.kind,
    TV_LIBRARY_VERIFIED_ASSET_RENDER_KIND.IDLE,
  );

  assert.equal(idle.verified, false);
  assert.equal(Object.isFrozen(idle), true);
});

test('native verified image results become bounded Library render facts', () => {
  const render =
    projectTvLibraryVerifiedAssetRender({
      detailView: detail(),
      verification: verification(),
    });

  assert.equal(
    render.schema,
    TV_LIBRARY_VERIFIED_ASSET_RENDER_SCHEMA,
  );

  assert.equal(
    render.kind,
    TV_LIBRARY_VERIFIED_ASSET_RENDER_KIND.READY,
  );

  assert.equal(render.verified, true);
  assert.equal(render.renderKind, 'image');
  assert.equal(render.assetKind, 'image');
  assert.equal(render.canonicalCrabUrl, `crab://${IMAGE_HASH}.image`);
  assert.equal(render.cid, `b3:${IMAGE_HASH}`);
  assert.equal(render.contentType, 'image/png');
  assert.equal(render.contentLength, 12);
  assert.equal(Object.isFrozen(render), true);
});

test('native verified article results become bounded Library render facts', () => {
  const render =
    projectTvLibraryVerifiedAssetRender({
      detailView: detail({
        assetKind: 'article',
        hash: ARTICLE_HASH,
      }),
      verification: verification({
        renderKind: 'article',
        assetKind: 'article',
        hash: ARTICLE_HASH,
        contentType:
          'text/markdown; charset=utf-8',
        contentLength: 33,
      }),
    });

  assert.equal(
    render.kind,
    TV_LIBRARY_VERIFIED_ASSET_RENDER_KIND.READY,
  );

  assert.equal(render.renderKind, 'article');
  assert.equal(render.assetKind, 'article');
  assert.equal(render.canonicalCrabUrl, `crab://${ARTICLE_HASH}.article`);
  assert.equal(render.cid, `b3:${ARTICLE_HASH}`);
  assert.equal(
    render.contentType,
    'text/markdown; charset=utf-8',
  );
  assert.equal(render.contentLength, 33);
});

test('unverified mismatched and unsupported render results fail closed', () => {
  for (const candidate of [
    verification({
      verified: false,
    }),
    verification({
      hash: 'c'.repeat(64),
    }),
    verification({
      renderKind: 'article',
    }),
    verification({
      renderKind: 'video',
      assetKind: 'video',
      hash: IMAGE_HASH,
    }),
  ]) {
    const render =
      projectTvLibraryVerifiedAssetRender({
        detailView: detail(),
        verification: candidate,
      });

    assert.equal(
      render.kind,
      TV_LIBRARY_VERIFIED_ASSET_RENDER_KIND.REJECTED,
    );

    assert.equal(render.verified, false);
    assert.equal(render.canonicalCrabUrl, null);
  }
});

test('missing or non-renderable Library details remain idle', () => {
  for (const detailView of [
    null,
    Object.freeze({
      kind: TV_LIBRARY_ASSET_DETAIL_KIND.REJECTED,
    }),
    detail({
      assetKind: 'video',
    }),
  ]) {
    const render =
      projectTvLibraryVerifiedAssetRender({
        detailView,
        verification: verification(),
      });

    assert.equal(
      render.kind,
      TV_LIBRARY_VERIFIED_ASSET_RENDER_KIND.IDLE,
    );

    assert.equal(render.verified, false);
  }
});
