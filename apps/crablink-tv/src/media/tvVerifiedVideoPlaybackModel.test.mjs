import assert from 'node:assert/strict';
import test from 'node:test';

import {
  projectTvVerifiedMediaPlaybackSurface,
} from './tvVerifiedMediaPlaybackSurfaceModel.js';

import {
  TV_VERIFIED_MEDIA_SOURCE_DELIVERY_MODE,
  TV_VERIFIED_MEDIA_SOURCE_HANDOFF_KIND,
  TV_VERIFIED_MEDIA_SOURCE_HANDOFF_SCHEMA,
  projectTvVerifiedMediaSourceHandoff,
} from './tvVerifiedMediaSourceHandoffModel.js';

import {
  TV_VERIFIED_VIDEO_ELEMENT_SOURCE_SCHEMA,
  TV_VERIFIED_VIDEO_PLAYBACK_SCHEMA,
  TV_VERIFIED_VIDEO_PLAYBACK_STATE,
  projectTvVerifiedVideoPlayback,
} from './tvVerifiedVideoPlaybackModel.js';

const localVideoPlayback = Object.freeze({
  schema: 'crablink.tv.verified-media-playback.v1',
  state: 'ready',
  playbackKind: 'video',
  canonicalCrabUrl: 'crab://creator.example/video/local',
  cid: 'b3:local-video',
  contentType: 'video/mp4',
  contentLength: 8192,
  fullByteVerified: true,
  backendServicePathVerified: false,
});

const backendVideoPlayback = Object.freeze({
  schema: 'crablink.tv.verified-media-playback.v1',
  state: 'ready',
  playbackKind: 'video',
  canonicalCrabUrl: 'crab://creator.example/video/backend',
  cid: 'b3:backend-video',
  contentType: 'video/webm',
  contentLength: 16384,
  fullByteVerified: false,
  backendServicePathVerified: true,
});

const backendAudioPlayback = Object.freeze({
  schema: 'crablink.tv.verified-media-playback.v1',
  state: 'ready',
  playbackKind: 'audio',
  canonicalCrabUrl: 'crab://creator.example/audio/backend',
  cid: 'b3:backend-audio',
  contentType: 'audio/mpeg',
  contentLength: 4096,
  fullByteVerified: false,
  backendServicePathVerified: true,
});

function makeSurface(playback) {
  return projectTvVerifiedMediaPlaybackSurface(playback);
}

function makeSourceProjection(playback, overrides = {}) {
  const surfaceView = makeSurface(playback);
  const local =
    surfaceView.fullByteVerified === true;

  return projectTvVerifiedMediaSourceHandoff({
    surfaceView,
    sourceHandoff: {
      schema: TV_VERIFIED_MEDIA_SOURCE_HANDOFF_SCHEMA,
      state: 'ready',
      handoffKind: local
        ? TV_VERIFIED_MEDIA_SOURCE_HANDOFF_KIND.ISOLATED_OBJECT_SOURCE
        : TV_VERIFIED_MEDIA_SOURCE_HANDOFF_KIND.GATEWAY_STREAM_SOURCE,
      deliveryMode: local
        ? TV_VERIFIED_MEDIA_SOURCE_DELIVERY_MODE.LOCAL_FULL_BYTE
        : TV_VERIFIED_MEDIA_SOURCE_DELIVERY_MODE.BACKEND_SERVICE_PATH,
      mediaHandleId: local
        ? 'media-handle-video-local'
        : 'media-handle-video-backend',
      playbackKind: playback.playbackKind,
      canonicalCrabUrl: playback.canonicalCrabUrl,
      cid: playback.cid,
      contentType: playback.contentType,
      contentLength: playback.contentLength,
      completeDigestVerified: local,
      backendServicePathVerified: !local,
      rangeStreamAllowed: !local,
      ...overrides,
    },
  });
}

function makeElementSource(sourceProjection, overrides = {}) {
  return {
    schema: TV_VERIFIED_VIDEO_ELEMENT_SOURCE_SCHEMA,
    state: 'ready',
    mediaHandleId: sourceProjection.mediaHandleId,
    playbackKind: 'video',
    contentType: sourceProjection.contentType,
    contentLength: sourceProjection.contentLength,
    videoElementSource: 'blob:crablink-tv-media/video-local',
    seekAllowed: true,
    rangeStreamAllowed: sourceProjection.rangeStreamAllowed,
    ...overrides,
  };
}

test('verified video playback projects idle without input', () => {
  const player =
    projectTvVerifiedVideoPlayback(null);

  assert.equal(player.schema, TV_VERIFIED_VIDEO_PLAYBACK_SCHEMA);
  assert.equal(player.state, TV_VERIFIED_VIDEO_PLAYBACK_STATE.IDLE);
  assert.equal(player.playerElementAttached, false);
  assert.equal(player.videoElementAttached, false);
  assert.equal(player.audioElementAttached, false);
  assert.equal(player.autoplayAllowed, false);
  assert.equal(player.remoteControlsEnabled, false);
});

test('verified video playback accepts local full-byte video element source', () => {
  const sourceProjection =
    makeSourceProjection(localVideoPlayback);

  const player =
    projectTvVerifiedVideoPlayback({
      sourceProjection,
      videoElementSource: makeElementSource(sourceProjection),
    });

  assert.equal(player.state, TV_VERIFIED_VIDEO_PLAYBACK_STATE.READY);
  assert.equal(player.playbackKind, 'video');
  assert.equal(player.playerElementAttached, true);
  assert.equal(player.videoElementAttached, true);
  assert.equal(player.audioElementAttached, false);
  assert.equal(player.autoplayAllowed, false);
  assert.equal(player.remoteControlsEnabled, true);
  assert.equal(player.seekAllowed, true);
  assert.equal(player.rangeStreamAllowed, false);
  assert.equal(player.completeDigestVerified, true);
  assert.equal(player.backendServicePathVerified, false);
  assert.match(player.videoElementSource, /^blob:/u);
});

test('verified video playback accepts backend service-path video stream element source', () => {
  const sourceProjection =
    makeSourceProjection(backendVideoPlayback);

  const player =
    projectTvVerifiedVideoPlayback({
      sourceProjection,
      videoElementSource: makeElementSource(
        sourceProjection,
        {
          videoElementSource:
            '/__crablink_tv_media__/stream/video-backend',
          rangeStreamAllowed: true,
        },
      ),
    });

  assert.equal(player.state, TV_VERIFIED_VIDEO_PLAYBACK_STATE.READY);
  assert.equal(player.rangeStreamAllowed, true);
  assert.equal(player.completeDigestVerified, false);
  assert.equal(player.backendServicePathVerified, true);
  assert.match(
    player.videoElementSource,
    /^\/__crablink_tv_media__\//u,
  );
});

test('verified video playback rejects audio handoffs', () => {
  const sourceProjection =
    makeSourceProjection(backendAudioPlayback, {
      mediaHandleId: 'media-handle-audio-backend',
    });

  const player =
    projectTvVerifiedVideoPlayback({
      sourceProjection,
      videoElementSource: makeElementSource(sourceProjection),
    });

  assert.equal(
    player.state,
    TV_VERIFIED_VIDEO_PLAYBACK_STATE.REJECTED,
  );
  assert.equal(player.problem.code, 'VIDEO_PLAYBACK_KIND_REQUIRED');
  assert.equal(player.videoElementAttached, false);
});

test('verified video playback rejects unsafe or missing element sources', () => {
  const sourceProjection =
    makeSourceProjection(localVideoPlayback);

  for (const [expectedCode, elementSource] of [
    ['VIDEO_ELEMENT_SOURCE_REQUIRED', ''],
    ['VIDEO_ELEMENT_SOURCE_REJECTED', 'https://provider.example/video.mp4'],
    ['VIDEO_ELEMENT_SOURCE_REJECTED', 'javascript:alert(1)'],
    ['VIDEO_ELEMENT_SOURCE_REJECTED', 'file:///tmp/video.mp4'],
  ]) {
    const player =
      projectTvVerifiedVideoPlayback({
        sourceProjection,
        videoElementSource: makeElementSource(
          sourceProjection,
          {
            videoElementSource: elementSource,
          },
        ),
      });

    assert.equal(player.problem.code, expectedCode);
    assert.equal(player.playerElementAttached, false);
  }
});

test('verified video playback rejects handle and content mismatches', () => {
  const sourceProjection =
    makeSourceProjection(localVideoPlayback);

  const mismatchCases = [
    [
      'MEDIA_HANDLE_ID_MISMATCH',
      {
        mediaHandleId: 'wrong-handle',
      },
    ],
    [
      'PLAYBACK_KIND_MISMATCH',
      {
        playbackKind: 'audio',
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
        contentLength: 8193,
      },
    ],
  ];

  for (const [expectedCode, overrides] of mismatchCases) {
    const player =
      projectTvVerifiedVideoPlayback({
        sourceProjection,
        videoElementSource: makeElementSource(
          sourceProjection,
          overrides,
        ),
      });

    assert.equal(player.problem.code, expectedCode);
    assert.equal(player.videoElementAttached, false);
  }
});

test('verified video playback rejects stale schemas and non-ready states', () => {
  const sourceProjection =
    makeSourceProjection(localVideoPlayback);

  const staleProjection =
    projectTvVerifiedVideoPlayback({
      sourceProjection: {
        ...sourceProjection,
        schema: 'crablink.tv.old-source-projection.v0',
      },
      videoElementSource: makeElementSource(sourceProjection),
    });

  assert.equal(
    staleProjection.problem.code,
    'UNSUPPORTED_SOURCE_HANDOFF_PROJECTION_SCHEMA',
  );

  const nonReadyProjection =
    projectTvVerifiedVideoPlayback({
      sourceProjection: {
        ...sourceProjection,
        state: 'rejected',
      },
      videoElementSource: makeElementSource(sourceProjection),
    });

  assert.equal(
    nonReadyProjection.problem.code,
    'SOURCE_HANDOFF_PROJECTION_NOT_READY',
  );

  const staleElementSource =
    projectTvVerifiedVideoPlayback({
      sourceProjection,
      videoElementSource: makeElementSource(
        sourceProjection,
        {
          schema: 'crablink.tv.old-video-source.v0',
        },
      ),
    });

  assert.equal(
    staleElementSource.problem.code,
    'UNSUPPORTED_VIDEO_ELEMENT_SOURCE_SCHEMA',
  );
});

test('verified video playback output has no authority or byte fields', () => {
  const sourceProjection =
    makeSourceProjection(localVideoPlayback);

  const player =
    projectTvVerifiedVideoPlayback({
      sourceProjection,
      videoElementSource: makeElementSource(sourceProjection),
    });

  const serialized = JSON.stringify(player);

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
