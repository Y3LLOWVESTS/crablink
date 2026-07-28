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
  TV_VERIFIED_AUDIO_ELEMENT_SOURCE_SCHEMA,
  TV_VERIFIED_AUDIO_PLAYBACK_SCHEMA,
  TV_VERIFIED_AUDIO_PLAYBACK_STATE,
  projectTvVerifiedAudioPlayback,
} from './tvVerifiedAudioPlaybackModel.js';

const localAudioPlayback = Object.freeze({
  schema: 'crablink.tv.verified-media-playback.v1',
  state: 'ready',
  playbackKind: 'audio',
  canonicalCrabUrl: 'crab://creator.example/audio/local',
  cid: 'b3:local-audio',
  contentType: 'audio/mpeg',
  contentLength: 8192,
  fullByteVerified: true,
  backendServicePathVerified: false,
});

const backendAudioPlayback = Object.freeze({
  schema: 'crablink.tv.verified-media-playback.v1',
  state: 'ready',
  playbackKind: 'audio',
  canonicalCrabUrl: 'crab://creator.example/audio/backend',
  cid: 'b3:backend-audio',
  contentType: 'audio/ogg',
  contentLength: 16384,
  fullByteVerified: false,
  backendServicePathVerified: true,
});

const backendVideoPlayback = Object.freeze({
  schema: 'crablink.tv.verified-media-playback.v1',
  state: 'ready',
  playbackKind: 'video',
  canonicalCrabUrl: 'crab://creator.example/video/backend',
  cid: 'b3:backend-video',
  contentType: 'video/mp4',
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
        ? 'media-handle-audio-local'
        : 'media-handle-audio-backend',
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
    schema: TV_VERIFIED_AUDIO_ELEMENT_SOURCE_SCHEMA,
    state: 'ready',
    mediaHandleId: sourceProjection.mediaHandleId,
    playbackKind: 'audio',
    contentType: sourceProjection.contentType,
    contentLength: sourceProjection.contentLength,
    audioElementSource: 'blob:crablink-tv-media/audio-local',
    seekAllowed: true,
    rangeStreamAllowed: sourceProjection.rangeStreamAllowed,
    ...overrides,
  };
}

test('verified audio playback projects idle without input', () => {
  const player =
    projectTvVerifiedAudioPlayback(null);

  assert.equal(player.schema, TV_VERIFIED_AUDIO_PLAYBACK_SCHEMA);
  assert.equal(player.state, TV_VERIFIED_AUDIO_PLAYBACK_STATE.IDLE);
  assert.equal(player.playerElementAttached, false);
  assert.equal(player.audioElementAttached, false);
  assert.equal(player.videoElementAttached, false);
  assert.equal(player.autoplayAllowed, false);
  assert.equal(player.remoteControlsEnabled, false);
});

test('verified audio playback accepts local full-byte audio element source', () => {
  const sourceProjection =
    makeSourceProjection(localAudioPlayback);

  const player =
    projectTvVerifiedAudioPlayback({
      sourceProjection,
      audioElementSource: makeElementSource(sourceProjection),
    });

  assert.equal(player.state, TV_VERIFIED_AUDIO_PLAYBACK_STATE.READY);
  assert.equal(player.playbackKind, 'audio');
  assert.equal(player.playerElementAttached, true);
  assert.equal(player.audioElementAttached, true);
  assert.equal(player.videoElementAttached, false);
  assert.equal(player.autoplayAllowed, false);
  assert.equal(player.remoteControlsEnabled, true);
  assert.equal(player.seekAllowed, true);
  assert.equal(player.rangeStreamAllowed, false);
  assert.equal(player.completeDigestVerified, true);
  assert.equal(player.backendServicePathVerified, false);
  assert.match(player.audioElementSource, /^blob:/u);
});

test('verified audio playback accepts backend service-path audio stream element source', () => {
  const sourceProjection =
    makeSourceProjection(backendAudioPlayback);

  const player =
    projectTvVerifiedAudioPlayback({
      sourceProjection,
      audioElementSource: makeElementSource(
        sourceProjection,
        {
          audioElementSource:
            '/__crablink_tv_media__/stream/audio-backend',
          rangeStreamAllowed: true,
        },
      ),
    });

  assert.equal(player.state, TV_VERIFIED_AUDIO_PLAYBACK_STATE.READY);
  assert.equal(player.rangeStreamAllowed, true);
  assert.equal(player.completeDigestVerified, false);
  assert.equal(player.backendServicePathVerified, true);
  assert.match(
    player.audioElementSource,
    /^\/__crablink_tv_media__\//u,
  );
});

test('verified audio playback rejects video handoffs', () => {
  const sourceProjection =
    makeSourceProjection(backendVideoPlayback, {
      mediaHandleId: 'media-handle-video-backend',
    });

  const player =
    projectTvVerifiedAudioPlayback({
      sourceProjection,
      audioElementSource: makeElementSource(sourceProjection),
    });

  assert.equal(
    player.state,
    TV_VERIFIED_AUDIO_PLAYBACK_STATE.REJECTED,
  );
  assert.equal(player.problem.code, 'AUDIO_PLAYBACK_KIND_REQUIRED');
  assert.equal(player.audioElementAttached, false);
});

test('verified audio playback rejects unsafe or missing element sources', () => {
  const sourceProjection =
    makeSourceProjection(localAudioPlayback);

  for (const [expectedCode, elementSource] of [
    ['AUDIO_ELEMENT_SOURCE_REQUIRED', ''],
    ['AUDIO_ELEMENT_SOURCE_REJECTED', 'https://provider.example/audio.mp3'],
    ['AUDIO_ELEMENT_SOURCE_REJECTED', 'javascript:alert(1)'],
    ['AUDIO_ELEMENT_SOURCE_REJECTED', 'file:///tmp/audio.mp3'],
  ]) {
    const player =
      projectTvVerifiedAudioPlayback({
        sourceProjection,
        audioElementSource: makeElementSource(
          sourceProjection,
          {
            audioElementSource: elementSource,
          },
        ),
      });

    assert.equal(player.problem.code, expectedCode);
    assert.equal(player.playerElementAttached, false);
  }
});

test('verified audio playback rejects handle and content mismatches', () => {
  const sourceProjection =
    makeSourceProjection(localAudioPlayback);

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
        playbackKind: 'video',
      },
    ],
    [
      'CONTENT_TYPE_MISMATCH',
      {
        contentType: 'audio/ogg',
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
      projectTvVerifiedAudioPlayback({
        sourceProjection,
        audioElementSource: makeElementSource(
          sourceProjection,
          overrides,
        ),
      });

    assert.equal(player.problem.code, expectedCode);
    assert.equal(player.audioElementAttached, false);
  }
});

test('verified audio playback rejects stale schemas and non-ready states', () => {
  const sourceProjection =
    makeSourceProjection(localAudioPlayback);

  const staleProjection =
    projectTvVerifiedAudioPlayback({
      sourceProjection: {
        ...sourceProjection,
        schema: 'crablink.tv.old-source-projection.v0',
      },
      audioElementSource: makeElementSource(sourceProjection),
    });

  assert.equal(
    staleProjection.problem.code,
    'UNSUPPORTED_SOURCE_HANDOFF_PROJECTION_SCHEMA',
  );

  const nonReadyProjection =
    projectTvVerifiedAudioPlayback({
      sourceProjection: {
        ...sourceProjection,
        state: 'rejected',
      },
      audioElementSource: makeElementSource(sourceProjection),
    });

  assert.equal(
    nonReadyProjection.problem.code,
    'SOURCE_HANDOFF_PROJECTION_NOT_READY',
  );

  const staleElementSource =
    projectTvVerifiedAudioPlayback({
      sourceProjection,
      audioElementSource: makeElementSource(
        sourceProjection,
        {
          schema: 'crablink.tv.old-audio-source.v0',
        },
      ),
    });

  assert.equal(
    staleElementSource.problem.code,
    'UNSUPPORTED_AUDIO_ELEMENT_SOURCE_SCHEMA',
  );
});

test('verified audio playback output has no authority or byte fields', () => {
  const sourceProjection =
    makeSourceProjection(localAudioPlayback);

  const player =
    projectTvVerifiedAudioPlayback({
      sourceProjection,
      audioElementSource: makeElementSource(sourceProjection),
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
