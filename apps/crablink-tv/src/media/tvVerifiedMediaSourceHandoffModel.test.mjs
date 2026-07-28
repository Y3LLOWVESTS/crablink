import assert from 'node:assert/strict';
import test from 'node:test';

import {
  projectTvVerifiedMediaPlaybackSurface,
} from './tvVerifiedMediaPlaybackSurfaceModel.js';

import {
  TV_VERIFIED_MEDIA_SOURCE_DELIVERY_MODE,
  TV_VERIFIED_MEDIA_SOURCE_HANDOFF_KIND,
  TV_VERIFIED_MEDIA_SOURCE_HANDOFF_PROJECTION_SCHEMA,
  TV_VERIFIED_MEDIA_SOURCE_HANDOFF_SCHEMA,
  TV_VERIFIED_MEDIA_SOURCE_HANDOFF_STATE,
  projectTvVerifiedMediaSourceHandoff,
} from './tvVerifiedMediaSourceHandoffModel.js';

const readyVideoPlayback = Object.freeze({
  schema: 'crablink.tv.verified-media-playback.v1',
  state: 'ready',
  playbackKind: 'video',
  canonicalCrabUrl: 'crab://creator.example/video/demo',
  cid: 'b3:demo-video',
  contentType: 'video/mp4',
  contentLength: 4096,
  fullByteVerified: true,
  backendServicePathVerified: false,
});

const readyAudioPlayback = Object.freeze({
  schema: 'crablink.tv.verified-media-playback.v1',
  state: 'ready',
  playbackKind: 'audio',
  canonicalCrabUrl: 'crab://creator.example/audio/demo',
  cid: 'b3:demo-audio',
  contentType: 'audio/mpeg',
  contentLength: 2048,
  fullByteVerified: false,
  backendServicePathVerified: true,
});

function localSurface() {
  return projectTvVerifiedMediaPlaybackSurface(
    readyVideoPlayback,
  );
}

function backendSurface() {
  return projectTvVerifiedMediaPlaybackSurface(
    readyAudioPlayback,
  );
}

function localHandoff(overrides = {}) {
  return {
    schema: TV_VERIFIED_MEDIA_SOURCE_HANDOFF_SCHEMA,
    state: 'ready',
    handoffKind:
      TV_VERIFIED_MEDIA_SOURCE_HANDOFF_KIND.ISOLATED_OBJECT_SOURCE,
    deliveryMode:
      TV_VERIFIED_MEDIA_SOURCE_DELIVERY_MODE.LOCAL_FULL_BYTE,
    mediaHandleId: 'media-handle-local-demo',
    playbackKind: 'video',
    canonicalCrabUrl: readyVideoPlayback.canonicalCrabUrl,
    cid: readyVideoPlayback.cid,
    contentType: readyVideoPlayback.contentType,
    contentLength: readyVideoPlayback.contentLength,
    completeDigestVerified: true,
    backendServicePathVerified: false,
    rangeStreamAllowed: false,
    ...overrides,
  };
}

function backendHandoff(overrides = {}) {
  return {
    schema: TV_VERIFIED_MEDIA_SOURCE_HANDOFF_SCHEMA,
    state: 'ready',
    handoffKind:
      TV_VERIFIED_MEDIA_SOURCE_HANDOFF_KIND.GATEWAY_STREAM_SOURCE,
    deliveryMode:
      TV_VERIFIED_MEDIA_SOURCE_DELIVERY_MODE.BACKEND_SERVICE_PATH,
    mediaHandleId: 'media-handle-backend-demo',
    playbackKind: 'audio',
    canonicalCrabUrl: readyAudioPlayback.canonicalCrabUrl,
    cid: readyAudioPlayback.cid,
    contentType: readyAudioPlayback.contentType,
    contentLength: readyAudioPlayback.contentLength,
    completeDigestVerified: false,
    backendServicePathVerified: true,
    rangeStreamAllowed: true,
    ...overrides,
  };
}

test('verified media source handoff projects idle without input', () => {
  const projection =
    projectTvVerifiedMediaSourceHandoff(null);

  assert.equal(
    projection.schema,
    TV_VERIFIED_MEDIA_SOURCE_HANDOFF_PROJECTION_SCHEMA,
  );
  assert.equal(
    projection.state,
    TV_VERIFIED_MEDIA_SOURCE_HANDOFF_STATE.IDLE,
  );
  assert.equal(projection.sourceAttached, false);
  assert.equal(projection.sourceReadyForPlayerElement, false);
  assert.equal(projection.playerElementAttached, false);
  assert.equal(projection.autoplayAllowed, false);
});

test('verified media source handoff accepts local full-byte video handle', () => {
  const projection =
    projectTvVerifiedMediaSourceHandoff({
      surfaceView: localSurface(),
      sourceHandoff: localHandoff(),
    });

  assert.equal(
    projection.state,
    TV_VERIFIED_MEDIA_SOURCE_HANDOFF_STATE.READY,
  );
  assert.equal(projection.playbackKind, 'video');
  assert.equal(
    projection.deliveryMode,
    TV_VERIFIED_MEDIA_SOURCE_DELIVERY_MODE.LOCAL_FULL_BYTE,
  );
  assert.equal(
    projection.handoffKind,
    TV_VERIFIED_MEDIA_SOURCE_HANDOFF_KIND.ISOLATED_OBJECT_SOURCE,
  );
  assert.equal(projection.sourceAttached, true);
  assert.equal(projection.sourceReadyForPlayerElement, true);
  assert.equal(projection.playerElementAttached, false);
  assert.equal(projection.completeDigestVerified, true);
  assert.equal(projection.backendServicePathVerified, false);
  assert.equal(projection.rangeStreamAllowed, false);
  assert.match(
    projection.truthLabel,
    /Local full-byte media handle/u,
  );
});

test('verified media source handoff accepts backend service-path audio stream handle', () => {
  const projection =
    projectTvVerifiedMediaSourceHandoff({
      surfaceView: backendSurface(),
      sourceHandoff: backendHandoff(),
    });

  assert.equal(
    projection.state,
    TV_VERIFIED_MEDIA_SOURCE_HANDOFF_STATE.READY,
  );
  assert.equal(projection.playbackKind, 'audio');
  assert.equal(
    projection.deliveryMode,
    TV_VERIFIED_MEDIA_SOURCE_DELIVERY_MODE.BACKEND_SERVICE_PATH,
  );
  assert.equal(
    projection.handoffKind,
    TV_VERIFIED_MEDIA_SOURCE_HANDOFF_KIND.GATEWAY_STREAM_SOURCE,
  );
  assert.equal(projection.sourceAttached, true);
  assert.equal(projection.sourceReadyForPlayerElement, true);
  assert.equal(projection.playerElementAttached, false);
  assert.equal(projection.completeDigestVerified, false);
  assert.equal(projection.backendServicePathVerified, true);
  assert.equal(projection.rangeStreamAllowed, true);
  assert.match(
    projection.truthLabel,
    /Backend service-path stream handle/u,
  );
});

test('verified media source handoff rejects identifier and content mismatches', () => {
  const mismatchCases = [
    [
      'PLAYBACK_KIND_MISMATCH',
      {
        playbackKind: 'audio',
      },
    ],
    [
      'CANONICAL_CRAB_URL_MISMATCH',
      {
        canonicalCrabUrl: 'crab://creator.example/video/other',
      },
    ],
    [
      'CID_MISMATCH',
      {
        cid: 'b3:other-video',
      },
    ],
    [
      'CONTENT_TYPE_MISMATCH',
      {
        contentType: 'video/webm',
      },
    ],
    [
      'CONTENT_LENGTH_MISMATCH',
      {
        contentLength: 4097,
      },
    ],
  ];

  for (const [expectedCode, overrides] of mismatchCases) {
    const projection =
      projectTvVerifiedMediaSourceHandoff({
        surfaceView: localSurface(),
        sourceHandoff: localHandoff(overrides),
      });

    assert.equal(
      projection.state,
      TV_VERIFIED_MEDIA_SOURCE_HANDOFF_STATE.REJECTED,
    );
    assert.equal(projection.problem.code, expectedCode);
    assert.equal(projection.sourceAttached, false);
    assert.equal(projection.playerElementAttached, false);
  }
});

test('verified media source handoff rejects delivery truth mismatches', () => {
  const wrongDelivery =
    projectTvVerifiedMediaSourceHandoff({
      surfaceView: localSurface(),
      sourceHandoff: localHandoff({
        deliveryMode:
          TV_VERIFIED_MEDIA_SOURCE_DELIVERY_MODE.BACKEND_SERVICE_PATH,
        handoffKind:
          TV_VERIFIED_MEDIA_SOURCE_HANDOFF_KIND.GATEWAY_STREAM_SOURCE,
        backendServicePathVerified: true,
        completeDigestVerified: false,
      }),
    });

  assert.equal(
    wrongDelivery.problem.code,
    'DELIVERY_MODE_MISMATCH',
  );

  const missingDigest =
    projectTvVerifiedMediaSourceHandoff({
      surfaceView: localSurface(),
      sourceHandoff: localHandoff({
        completeDigestVerified: false,
      }),
    });

  assert.equal(
    missingDigest.problem.code,
    'LOCAL_FULL_BYTE_DIGEST_REQUIRED',
  );

  const missingServicePathReview =
    projectTvVerifiedMediaSourceHandoff({
      surfaceView: backendSurface(),
      sourceHandoff: backendHandoff({
        backendServicePathVerified: false,
      }),
    });

  assert.equal(
    missingServicePathReview.problem.code,
    'BACKEND_SERVICE_PATH_REVIEW_REQUIRED',
  );
});

test('verified media source handoff rejects stale schemas and non-ready states', () => {
  const staleSurface =
    projectTvVerifiedMediaSourceHandoff({
      surfaceView: {
        ...localSurface(),
        schema: 'crablink.tv.old-surface.v0',
      },
      sourceHandoff: localHandoff(),
    });

  assert.equal(
    staleSurface.problem.code,
    'UNSUPPORTED_PLAYBACK_SURFACE_SCHEMA',
  );

  const staleHandoff =
    projectTvVerifiedMediaSourceHandoff({
      surfaceView: localSurface(),
      sourceHandoff: localHandoff({
        schema: 'crablink.tv.old-source.v0',
      }),
    });

  assert.equal(
    staleHandoff.problem.code,
    'UNSUPPORTED_SOURCE_HANDOFF_SCHEMA',
  );

  const nonReady =
    projectTvVerifiedMediaSourceHandoff({
      surfaceView: localSurface(),
      sourceHandoff: localHandoff({
        state: 'pending',
      }),
    });

  assert.equal(nonReady.problem.code, 'SOURCE_HANDOFF_NOT_READY');
});

test('verified media source handoff rejects raw media references and keeps player absent', () => {
  const rawReferenceHandoff =
    localHandoff({
      [['source', 'Url'].join('')]: 'crab://unsafe/raw-media',
    });

  const projection =
    projectTvVerifiedMediaSourceHandoff({
      surfaceView: localSurface(),
      sourceHandoff: rawReferenceHandoff,
    });

  assert.equal(
    projection.problem.code,
    'RAW_MEDIA_REFERENCE_REJECTED',
  );
  assert.equal(projection.sourceAttached, false);
  assert.equal(projection.sourceReadyForPlayerElement, false);
  assert.equal(projection.playerElementAttached, false);
  assert.equal(projection.autoplayAllowed, false);
});

test('verified media source handoff output has no authority or media byte fields', () => {
  const projection =
    projectTvVerifiedMediaSourceHandoff({
      surfaceView: localSurface(),
      sourceHandoff: localHandoff(),
    });

  const serialized = JSON.stringify(projection);

  for (const forbidden of [
    'wallet',
    'ledger',
    'entitlement',
    'finality',
    'providerFallback',
    'directProvider',
    'assetBytes',
    'rawBody',
    'signedUrl',
    'objectUrl',
    'sourceUrl',
  ]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});
