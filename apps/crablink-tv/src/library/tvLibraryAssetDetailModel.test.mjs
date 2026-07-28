import assert from 'node:assert/strict';
import test from 'node:test';

import { TV_CATALOG_CARD_HANDOFF_KIND } from '../catalog/tvCatalogRouteHandoff.js';

import {
  TV_LIBRARY_ASSET_DETAIL_KIND,
  TV_LIBRARY_ASSET_DETAIL_LIMITS,
  TV_LIBRARY_ASSET_DETAIL_SCHEMA,
  createIdleTvLibraryAssetDetail,
  projectTvLibraryAssetDetail,
} from './tvLibraryAssetDetailModel.js';

const HASH = 'e'.repeat(64);

function reviewedAssetHandoff(overrides = {}) {
  return Object.freeze({
    kind: TV_CATALOG_CARD_HANDOFF_KIND.DETAIL,
    targetSectionId: 'library',
    route: Object.freeze({
      kind: 'ready',
      owner: 'asset',
      routeKind: 'video',
      assetKind: 'video',
      hash: HASH,
      cid: `b3:${HASH}`,
      normalized: `crab://${HASH}.video`,
    }),
    overlay: Object.freeze({
      title: 'Featured video',
      body: 'Reviewed catalog route.',
      returnFocusKey: 'catalog-featured-video',
    }),
    ...overrides,
  });
}

test('library asset detail constants and idle view are explicit and immutable', () => {
  assert.equal(
    TV_LIBRARY_ASSET_DETAIL_SCHEMA,
    'crablink.tv.library-asset-detail.v1',
  );

  assert.equal(
    Object.isFrozen(TV_LIBRARY_ASSET_DETAIL_KIND),
    true,
  );

  assert.equal(
    Object.isFrozen(TV_LIBRARY_ASSET_DETAIL_LIMITS),
    true,
  );

  const idle =
    createIdleTvLibraryAssetDetail();

  assert.equal(
    idle.kind,
    TV_LIBRARY_ASSET_DETAIL_KIND.IDLE,
  );

  assert.equal(
    Object.isFrozen(idle),
    true,
  );
});

test('reviewed asset handoffs become bounded Library asset details', () => {
  const detail =
    projectTvLibraryAssetDetail(
      reviewedAssetHandoff(),
    );

  assert.equal(
    detail.schema,
    TV_LIBRARY_ASSET_DETAIL_SCHEMA,
  );

  assert.equal(
    detail.kind,
    TV_LIBRARY_ASSET_DETAIL_KIND.READY,
  );

  assert.equal(detail.assetKind, 'video');
  assert.equal(
    detail.canonicalCrabUrl,
    `crab://${HASH}.video`,
  );
  assert.equal(detail.cid, `b3:${HASH}`);
  assert.equal(detail.hash, HASH);
  assert.equal(
    detail.returnFocusKey,
    'catalog-featured-video',
  );
  assert.equal(Object.isFrozen(detail), true);
  assert.equal(Object.isFrozen(detail.route), true);
});

test('non-detail and non-asset handoffs fail closed', () => {
  const cases = [
    {
      kind:
        TV_CATALOG_CARD_HANDOFF_KIND.PROBLEM,
    },
    reviewedAssetHandoff({
      route: Object.freeze({
        owner: 'site',
        normalized: 'crab://creator-space',
      }),
    }),
    reviewedAssetHandoff({
      route: Object.freeze({
        owner: 'asset',
        assetKind: 'video',
        hash: HASH,
        cid: `b3:${HASH}`,
        normalized: `crab://${HASH}.image`,
      }),
    }),
  ];

  for (const handoff of cases) {
    const detail =
      projectTvLibraryAssetDetail(
        handoff,
      );

    assert.equal(
      detail.kind,
      TV_LIBRARY_ASSET_DETAIL_KIND.REJECTED,
    );

    assert.equal(
      detail.canonicalCrabUrl,
      null,
    );
  }
});

test('library asset detail bounds long text and focus keys', () => {
  const detail =
    projectTvLibraryAssetDetail(
      reviewedAssetHandoff({
        overlay: Object.freeze({
          title: 'T'.repeat(180),
          body: 'S'.repeat(400),
          returnFocusKey: 'f'.repeat(220),
        }),
      }),
    );

  assert.equal(
    detail.kind,
    TV_LIBRARY_ASSET_DETAIL_KIND.READY,
  );

  assert.equal(
    detail.title.length,
    TV_LIBRARY_ASSET_DETAIL_LIMITS.TITLE_CHARS,
  );

  assert.equal(
    detail.summary.length,
    TV_LIBRARY_ASSET_DETAIL_LIMITS.SUMMARY_CHARS,
  );

  assert.equal(
    detail.returnFocusKey.length,
    TV_LIBRARY_ASSET_DETAIL_LIMITS.FOCUS_KEY_CHARS,
  );
});
