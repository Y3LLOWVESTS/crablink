import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TV_LIBRARY_ASSET_DETAIL_KIND,
} from '../library/tvLibraryAssetDetailModel.js';

import {
  TV_VERIFIED_MEDIA_FACTS_SCHEMA,
  TV_VERIFIED_MEDIA_PLAYBACK_CODE,
  TV_VERIFIED_MEDIA_PLAYBACK_KIND,
  TV_VERIFIED_MEDIA_PLAYBACK_SCHEMA,
  TV_VERIFIED_MEDIA_PLAYBACK_STATE,
  TV_VERIFIED_MEDIA_SOURCE_MODE,
  TV_VERIFIED_MEDIA_VERIFICATION_POSTURE,
  createIdleTvVerifiedMediaPlayback,
  projectTvVerifiedMediaPlayback,
} from './tvVerifiedMediaPlaybackModel.js';

const HASH = Object.freeze({
  video: 'a'.repeat(64),
  music: 'b'.repeat(64),
  podcast: 'c'.repeat(64),
});

function detail({
  assetKind = 'video',
  hash = HASH.video,
  kind =
    TV_LIBRARY_ASSET_DETAIL_KIND.READY,
} = {}) {
  return Object.freeze({
    schema:
      'crablink.tv.library-asset-detail.v1',
    kind,
    title:
      `${assetKind} asset`,
    summary:
      'Reviewed catalog media route.',
    assetKind,
    canonicalCrabUrl:
      `crab://${hash}.${assetKind}`,
    cid:
      `b3:${hash}`,
    hash,
    route: Object.freeze({
      owner: 'asset',
      assetKind,
      normalized:
        `crab://${hash}.${assetKind}`,
      cid:
        `b3:${hash}`,
      hash,
    }),
    returnFocusKey:
      'catalog-media-card',
  });
}

function facts({
  assetKind = 'video',
  hash = HASH.video,
  contentType = 'video/mp4',
  contentLength = 12_000_000,
  maxPlaybackBytes = 50_000_000,
  verificationPosture =
    TV_VERIFIED_MEDIA_VERIFICATION_POSTURE.LOCAL_FULL_BYTE,
  sourceMode =
    TV_VERIFIED_MEDIA_SOURCE_MODE.VERIFIED_OBJECT,
  schema =
    TV_VERIFIED_MEDIA_FACTS_SCHEMA,
  state = 'ready',
  verified = true,
} = {}) {
  return Object.freeze({
    schema,
    state,
    verified,
    assetKind,
    canonicalCrabUrl:
      `crab://${hash}.${assetKind}`,
    cid:
      `b3:${hash}`,
    contentType,
    contentLength,
    maxPlaybackBytes,
    verificationPosture,
    sourceMode,
  });
}

function project(
  assetKind,
  options = {},
) {
  const hash =
    HASH[assetKind] ??
    'd'.repeat(64);

  return projectTvVerifiedMediaPlayback({
    detailView:
      detail({
        assetKind,
        hash,
      }),
    mediaFacts:
      facts({
        assetKind,
        hash,
        ...options,
      }),
  });
}

test('verified media playback idle view is explicit immutable and source-free', () => {
  const view =
    createIdleTvVerifiedMediaPlayback();

  assert.equal(
    view.schema,
    TV_VERIFIED_MEDIA_PLAYBACK_SCHEMA,
  );

  assert.equal(
    view.state,
    TV_VERIFIED_MEDIA_PLAYBACK_STATE.IDLE,
  );

  assert.equal(
    view.ready,
    false,
  );

  assert.equal(
    view.sourceAttached,
    false,
  );

  assert.equal(
    Object.hasOwn(
      view,
      'sourceUrl',
    ),
    false,
  );

  assert.equal(
    Object.hasOwn(
      view,
      'assetBytes',
    ),
    false,
  );

  assert.equal(
    Object.isFrozen(view),
    true,
  );
});

test('verified media playback accepts locally full-byte-verified video facts', () => {
  const view =
    project('video');

  assert.equal(
    view.state,
    TV_VERIFIED_MEDIA_PLAYBACK_STATE.READY,
  );

  assert.equal(
    view.playbackKind,
    TV_VERIFIED_MEDIA_PLAYBACK_KIND.VIDEO,
  );

  assert.equal(
    view.contentType,
    'video/mp4',
  );

  assert.equal(
    view.fullByteVerified,
    true,
  );

  assert.equal(
    view.backendServicePathVerified,
    false,
  );

  assert.equal(
    view.streaming,
    false,
  );

  assert.match(
    view.verificationLabel,
    /Full B3 bytes verified/u,
  );
});

test('verified media playback accepts backend-verified music and podcast stream facts without claiming local full verification', () => {
  for (const [
    assetKind,
    contentType,
  ] of [
    [
      'music',
      'audio/mpeg',
    ],
    [
      'podcast',
      'audio/mp4',
    ],
  ]) {
    const view =
      project(
        assetKind,
        {
          contentType,
          verificationPosture:
            TV_VERIFIED_MEDIA_VERIFICATION_POSTURE
              .BACKEND_SERVICE_PATH,
          sourceMode:
            TV_VERIFIED_MEDIA_SOURCE_MODE
              .GATEWAY_STREAM,
        },
      );

    assert.equal(
      view.state,
      TV_VERIFIED_MEDIA_PLAYBACK_STATE.READY,
    );

    assert.equal(
      view.playbackKind,
      TV_VERIFIED_MEDIA_PLAYBACK_KIND.AUDIO,
    );

    assert.equal(
      view.fullByteVerified,
      false,
    );

    assert.equal(
      view.backendServicePathVerified,
      true,
    );

    assert.equal(
      view.streaming,
      true,
    );

    assert.match(
      view.verificationLabel,
      /full local byte verification is incomplete/u,
    );
  }
});

test('verified media playback rejects unsupported image article and live stream asset kinds', () => {
  for (const assetKind of [
    'image',
    'article',
    'stream',
  ]) {
    const view =
      project(assetKind);

    assert.equal(
      view.code,
      TV_VERIFIED_MEDIA_PLAYBACK_CODE
        .UNSUPPORTED_ASSET,
    );

    assert.equal(
      view.ready,
      false,
    );
  }
});

test('verified media playback rejects missing stale unverified and identifier-mismatched facts', () => {
  assert.equal(
    projectTvVerifiedMediaPlayback({
      detailView:
        detail({
          kind:
            TV_LIBRARY_ASSET_DETAIL_KIND.IDLE,
        }),
      mediaFacts:
        facts(),
    }).state,
    TV_VERIFIED_MEDIA_PLAYBACK_STATE.IDLE,
  );

  for (const mediaFacts of [
    null,
    facts({
      schema:
        'crablink.tv.verified-media-facts.v0',
    }),
    facts({
      state:
        'idle',
    }),
    facts({
      verified:
        false,
    }),
  ]) {
    assert.equal(
      projectTvVerifiedMediaPlayback({
        detailView:
          detail(),
        mediaFacts,
      }).code,
      TV_VERIFIED_MEDIA_PLAYBACK_CODE
        .FACTS_REJECTED,
    );
  }

  assert.equal(
    projectTvVerifiedMediaPlayback({
      detailView:
        detail(),
      mediaFacts:
        facts({
          hash:
            'e'.repeat(64),
        }),
    }).code,
    TV_VERIFIED_MEDIA_PLAYBACK_CODE
      .IDENTIFIER_MISMATCH,
  );
});

test('verified media playback rejects content-type and source-posture mismatches', () => {
  for (const [
    assetKind,
    contentType,
  ] of [
    [
      'video',
      'audio/mpeg',
    ],
    [
      'music',
      'video/mp4',
    ],
    [
      'podcast',
      'application/vnd.apple.mpegurl',
    ],
  ]) {
    assert.equal(
      project(
        assetKind,
        {
          contentType,
        },
      ).code,
      TV_VERIFIED_MEDIA_PLAYBACK_CODE
        .CONTENT_TYPE_MISMATCH,
    );
  }

  for (const options of [
    {
      verificationPosture:
        TV_VERIFIED_MEDIA_VERIFICATION_POSTURE
          .LOCAL_FULL_BYTE,
      sourceMode:
        TV_VERIFIED_MEDIA_SOURCE_MODE
          .GATEWAY_STREAM,
    },
    {
      verificationPosture:
        TV_VERIFIED_MEDIA_VERIFICATION_POSTURE
          .BACKEND_SERVICE_PATH,
      sourceMode:
        TV_VERIFIED_MEDIA_SOURCE_MODE
          .VERIFIED_OBJECT,
    },
    {
      verificationPosture:
        'unknown',
      sourceMode:
        'unknown',
    },
  ]) {
    assert.equal(
      project(
        'video',
        options,
      ).code,
      TV_VERIFIED_MEDIA_PLAYBACK_CODE
        .SOURCE_POSTURE_MISMATCH,
    );
  }
});

test('verified media playback enforces positive safe lengths and the configured media ceiling', () => {
  for (const options of [
    {
      contentLength:
        0,
    },
    {
      maxPlaybackBytes:
        0,
    },
    {
      contentLength:
        Number.MAX_SAFE_INTEGER + 1,
    },
  ]) {
    assert.equal(
      project(
        'video',
        options,
      ).code,
      TV_VERIFIED_MEDIA_PLAYBACK_CODE
        .CONTENT_LENGTH_INVALID,
    );
  }

  assert.equal(
    project(
      'video',
      {
        contentLength:
          50_000_001,
        maxPlaybackBytes:
          50_000_000,
      },
    ).code,
    TV_VERIFIED_MEDIA_PLAYBACK_CODE
      .CONTENT_LENGTH_LIMIT,
  );

  assert.equal(
    project(
      'video',
      {
        contentLength:
          50_000_000,
        maxPlaybackBytes:
          50_000_000,
      },
    ).state,
    TV_VERIFIED_MEDIA_PLAYBACK_STATE.READY,
  );
});
