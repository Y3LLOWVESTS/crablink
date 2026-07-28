import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TV_LIBRARY_ASSET_DETAIL_KIND,
} from './tvLibraryAssetDetailModel.js';

import {
  TV_LIBRARY_VERIFIED_ASSET_RENDER_KIND,
} from './tvLibraryVerifiedAssetRenderModel.js';

import {
  TV_LIBRARY_VERIFY_UI_SCHEMA,
  TV_LIBRARY_VERIFY_UI_STATE,
  createIdleTvLibraryVerifyUiView,
  projectTvLibraryVerifyUiView,
  requestTvLibraryVerifyUiView,
} from './tvLibraryVerifyUiModel.js';

const HASH = 'a'.repeat(64);

function detail({
  assetKind = 'image',
} = {}) {
  return Object.freeze({
    kind: TV_LIBRARY_ASSET_DETAIL_KIND.READY,
    assetKind,
    canonicalCrabUrl:
      `crab://${HASH}.${assetKind}`,
    cid:
      `b3:${HASH}`,
  });
}

test('verify UI constants and idle view are explicit and immutable', () => {
  assert.equal(
    TV_LIBRARY_VERIFY_UI_SCHEMA,
    'crablink.tv.library-verify-ui.v1',
  );

  assert.equal(
    Object.isFrozen(TV_LIBRARY_VERIFY_UI_STATE),
    true,
  );

  const idle =
    createIdleTvLibraryVerifyUiView();

  assert.equal(
    idle.state,
    TV_LIBRARY_VERIFY_UI_STATE.IDLE,
  );

  assert.equal(idle.canRequest, false);
  assert.equal(Object.isFrozen(idle), true);
});

test('verify UI is ready for reviewed image assets without verified render facts', () => {
  const view =
    projectTvLibraryVerifyUiView({
      detailView: detail({
        assetKind: 'image',
      }),
    });

  assert.equal(
    view.state,
    TV_LIBRARY_VERIFY_UI_STATE.READY,
  );

  assert.equal(view.canRequest, true);
  assert.equal(view.assetKind, 'image');
  assert.equal(view.cid, `b3:${HASH}`);
});

test('verify UI is ready for reviewed article assets after rejected render facts', () => {
  const view =
    projectTvLibraryVerifyUiView({
      detailView: detail({
        assetKind: 'article',
      }),
      verifiedRenderView:
        Object.freeze({
          kind:
            TV_LIBRARY_VERIFIED_ASSET_RENDER_KIND.REJECTED,
          message:
            'Retry may be requested manually.',
        }),
    });

  assert.equal(
    view.state,
    TV_LIBRARY_VERIFY_UI_STATE.READY,
  );

  assert.equal(view.canRequest, true);
  assert.equal(view.assetKind, 'article');
});

test('verify UI blocks unsupported or already verified assets', () => {
  const unsupported =
    projectTvLibraryVerifyUiView({
      detailView: detail({
        assetKind: 'video',
      }),
    });

  assert.equal(
    unsupported.state,
    TV_LIBRARY_VERIFY_UI_STATE.BLOCKED,
  );

  assert.equal(unsupported.canRequest, false);

  const alreadyVerified =
    projectTvLibraryVerifyUiView({
      detailView: detail(),
      verifiedRenderView:
        Object.freeze({
          kind:
            TV_LIBRARY_VERIFIED_ASSET_RENDER_KIND.READY,
        }),
    });

  assert.equal(
    alreadyVerified.state,
    TV_LIBRARY_VERIFY_UI_STATE.BLOCKED,
  );

  assert.equal(alreadyVerified.canRequest, false);
});

test('verify UI request moves only a ready view into requested state', () => {
  const ready =
    projectTvLibraryVerifyUiView({
      detailView: detail(),
    });

  const requested =
    requestTvLibraryVerifyUiView({
      view: ready,
    });

  assert.equal(
    requested.state,
    TV_LIBRARY_VERIFY_UI_STATE.REQUESTED,
  );

  assert.equal(requested.canRequest, false);
  assert.equal(requested.assetKind, 'image');

  const rejected =
    requestTvLibraryVerifyUiView({
      view: createIdleTvLibraryVerifyUiView(),
    });

  assert.equal(
    rejected.state,
    TV_LIBRARY_VERIFY_UI_STATE.BLOCKED,
  );
});
