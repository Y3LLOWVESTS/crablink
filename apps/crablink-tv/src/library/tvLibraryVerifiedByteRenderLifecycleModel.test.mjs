import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TV_LIBRARY_ASSET_DETAIL_KIND,
} from './tvLibraryAssetDetailModel.js';

import {
  TV_LIBRARY_VERIFIED_RENDER_DISPLAY_KIND,
  TV_LIBRARY_VERIFIED_RENDER_DISPLAY_STATE,
} from './tvLibraryVerifiedRenderDisplayModel.js';

import {
  TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_CODE,
  TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_SCHEMA,
  TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_STATE,
  activateTvLibraryVerifiedByteRenderLifecycle,
  createIdleTvLibraryVerifiedByteRenderLifecycle,
  prepareTvLibraryVerifiedByteRenderLifecycle,
  revokeTvLibraryVerifiedByteRenderLifecycle,
  shouldRevokeTvLibraryVerifiedByteRenderLifecycle,
} from './tvLibraryVerifiedByteRenderLifecycleModel.js';

const HASH = 'a'.repeat(64);

function detail({
  assetKind = 'image',
  hash = HASH,
} = {}) {
  return Object.freeze({
    kind:
      TV_LIBRARY_ASSET_DETAIL_KIND.READY,
    assetKind,
    canonicalCrabUrl:
      `crab://${hash}.${assetKind}`,
    cid:
      `b3:${hash}`,
  });
}

function display({
  displayKind =
    TV_LIBRARY_VERIFIED_RENDER_DISPLAY_KIND
      .IMAGE_FRAME,
  assetKind = 'image',
  hash = HASH,
  state =
    TV_LIBRARY_VERIFIED_RENDER_DISPLAY_STATE
      .READY,
  ready = true,
  contentType = 'image/png',
  contentLength = 512,
} = {}) {
  return Object.freeze({
    schema:
      'crablink.tv.library-verified-render-display.v1',
    state,
    ready,
    displayKind,
    assetKind,
    canonicalCrabUrl:
      `crab://${hash}.${assetKind}`,
    cid:
      `b3:${hash}`,
    contentType,
    contentLength,
    code:
      'TV_LIBRARY_VERIFIED_DISPLAY_READY',
    message:
      'ready',
  });
}

test('verified byte lifecycle constants and idle view are explicit and immutable', () => {
  const idle =
    createIdleTvLibraryVerifiedByteRenderLifecycle();

  assert.equal(
    idle.schema,
    TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_SCHEMA,
  );

  assert.equal(
    idle.state,
    TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_STATE.IDLE,
  );

  assert.equal(
    idle.revokeRequired,
    false,
  );

  assert.equal(
    Object.isFrozen(idle),
    true,
  );
});

test('verified byte lifecycle prepares image and article render tickets', () => {
  const imageTicket =
    prepareTvLibraryVerifiedByteRenderLifecycle({
      detailView:
        detail(),
      verifiedRenderDisplayView:
        display(),
    });

  assert.equal(
    imageTicket.state,
    TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_STATE.READY,
  );

  assert.equal(
    imageTicket.displayKind,
    TV_LIBRARY_VERIFIED_RENDER_DISPLAY_KIND.IMAGE_FRAME,
  );

  assert.equal(
    imageTicket.canonicalCrabUrl,
    `crab://${HASH}.image`,
  );

  const articleTicket =
    prepareTvLibraryVerifiedByteRenderLifecycle({
      detailView:
        detail({
          assetKind:
            'article',
        }),
      verifiedRenderDisplayView:
        display({
          displayKind:
            TV_LIBRARY_VERIFIED_RENDER_DISPLAY_KIND.ARTICLE_READER,
          assetKind:
            'article',
          contentType:
            'text/plain; charset=utf-8',
        }),
    });

  assert.equal(
    articleTicket.state,
    TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_STATE.READY,
  );

  assert.equal(
    articleTicket.displayKind,
    TV_LIBRARY_VERIFIED_RENDER_DISPLAY_KIND.ARTICLE_READER,
  );
});

test('verified byte lifecycle rejects unverified unsupported or stale display facts', () => {
  assert.equal(
    prepareTvLibraryVerifiedByteRenderLifecycle({
      detailView:
        detail(),
      verifiedRenderDisplayView:
        display({
          state:
            TV_LIBRARY_VERIFIED_RENDER_DISPLAY_STATE.IDLE,
          ready:
            false,
        }),
    }).code,
    TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_CODE.NOT_VERIFIED,
  );

  assert.equal(
    prepareTvLibraryVerifiedByteRenderLifecycle({
      detailView:
        detail(),
      verifiedRenderDisplayView:
        display({
          displayKind:
            'video-frame',
        }),
    }).code,
    TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_CODE.UNSUPPORTED,
  );

  assert.equal(
    prepareTvLibraryVerifiedByteRenderLifecycle({
      detailView:
        detail(),
      verifiedRenderDisplayView:
        display({
          hash:
            'b'.repeat(64),
        }),
    }).code,
    TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_CODE.MISMATCH,
  );
});

test('verified byte lifecycle activates only bounded blob object URLs', () => {
  const ready =
    prepareTvLibraryVerifiedByteRenderLifecycle({
      detailView:
        detail(),
      verifiedRenderDisplayView:
        display(),
    });

  assert.equal(
    activateTvLibraryVerifiedByteRenderLifecycle({
      lifecycleView:
        ready,
      objectUrl:
        'https://example.invalid/image.png',
    }).code,
    TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_CODE.INVALID_OBJECT_URL,
  );

  const active =
    activateTvLibraryVerifiedByteRenderLifecycle({
      lifecycleView:
        ready,
      objectUrl:
        'blob:crablink-tv-verified-image',
    });

  assert.equal(
    active.state,
    TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_STATE.ACTIVE,
  );

  assert.equal(
    active.revokeRequired,
    true,
  );

  assert.equal(
    active.objectUrl,
    'blob:crablink-tv-verified-image',
  );
});

test('verified byte lifecycle revokes active stale object URLs', () => {
  const ready =
    prepareTvLibraryVerifiedByteRenderLifecycle({
      detailView:
        detail(),
      verifiedRenderDisplayView:
        display(),
    });

  const active =
    activateTvLibraryVerifiedByteRenderLifecycle({
      lifecycleView:
        ready,
      objectUrl:
        'blob:crablink-tv-verified-image',
    });

  assert.equal(
    shouldRevokeTvLibraryVerifiedByteRenderLifecycle({
      lifecycleView:
        active,
      detailView:
        detail(),
    }),
    false,
  );

  assert.equal(
    shouldRevokeTvLibraryVerifiedByteRenderLifecycle({
      lifecycleView:
        active,
      detailView:
        detail({
          hash:
            'b'.repeat(64),
        }),
    }),
    true,
  );

  const revoked =
    revokeTvLibraryVerifiedByteRenderLifecycle({
      lifecycleView:
        active,
    });

  assert.equal(
    revoked.state,
    TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_STATE.REVOKED,
  );

  assert.equal(
    revoked.objectUrl,
    null,
  );

  assert.equal(
    revoked.revokeRequired,
    false,
  );
});
