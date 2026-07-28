import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TV_MEDIA_ERROR_RETRY_STATE,
  TV_MEDIA_PLAYER_EVENT_SCHEMA,
  TV_MEDIA_RETRY_POSTURE,
  projectTvMediaErrorRetryTruth,
} from './tvMediaErrorRetryTruthModel.js';

function videoPlayer(overrides = {}) {
  return {
    schema: 'crablink.tv.verified-video-playback.v1',
    state: 'ready',
    playbackKind: 'video',
    mediaHandleId: 'media-handle-video-error',
    playerElementAttached: true,
    videoElementAttached: true,
    audioElementAttached: false,
    autoplayAllowed: false,
    ...overrides,
  };
}

function audioPlayer(overrides = {}) {
  return {
    schema: 'crablink.tv.verified-audio-playback.v1',
    state: 'ready',
    playbackKind: 'audio',
    mediaHandleId: 'media-handle-audio-error',
    playerElementAttached: true,
    audioElementAttached: true,
    videoElementAttached: false,
    autoplayAllowed: false,
    ...overrides,
  };
}

function focusView(mediaKind = 'video', overrides = {}) {
  return {
    schema: 'crablink.tv.playback-controls-focus.v1',
    state: 'ready',
    mediaKind,
    remoteActivationEnabled: true,
    controls: [
      {
        control: 'play',
        label: 'Play',
        enabled: true,
        focusable: true,
        selected: true,
        activationAllowed: true,
      },
    ],
    ...overrides,
  };
}

function mediaEvent(playerView, overrides = {}) {
  const mediaKind =
    playerView.schema === 'crablink.tv.verified-video-playback.v1'
      ? 'video'
      : 'audio';

  return {
    schema: TV_MEDIA_PLAYER_EVENT_SCHEMA,
    eventKind: 'playing',
    mediaKind,
    mediaHandleId: playerView.mediaHandleId,
    retryCount: 0,
    maxRetries: 3,
    canRetry: false,
    ...overrides,
  };
}

test('media error retry truth projects idle without player view', () => {
  const truth =
    projectTvMediaErrorRetryTruth(null);

  assert.equal(truth.state, TV_MEDIA_ERROR_RETRY_STATE.IDLE);
  assert.equal(truth.retryAllowed, false);
  assert.equal(truth.automaticRetryAllowed, false);
});

test('media error retry truth reports healthy playback events', () => {
  const playerView = videoPlayer();
  const truth =
    projectTvMediaErrorRetryTruth({
      playerView,
      focusView: focusView('video'),
      mediaEvent: mediaEvent(playerView, {
        eventKind: 'playing',
      }),
    });

  assert.equal(truth.state, TV_MEDIA_ERROR_RETRY_STATE.HEALTHY);
  assert.equal(truth.mediaKind, 'video');
  assert.equal(truth.retryPosture, TV_MEDIA_RETRY_POSTURE.NONE);
  assert.equal(truth.retryAllowed, false);
});

test('media error retry truth reports buffering without retry exposure', () => {
  const playerView = audioPlayer();
  const truth =
    projectTvMediaErrorRetryTruth({
      playerView,
      focusView: focusView('audio'),
      mediaEvent: mediaEvent(playerView, {
        eventKind: 'waiting',
      }),
    });

  assert.equal(truth.state, TV_MEDIA_ERROR_RETRY_STATE.BUFFERING);
  assert.equal(truth.buffering, true);
  assert.equal(truth.retryAllowed, false);
  assert.equal(truth.automaticRetryAllowed, false);
});

test('media error retry truth reports ended playback without error retry', () => {
  const playerView = videoPlayer();
  const truth =
    projectTvMediaErrorRetryTruth({
      playerView,
      focusView: focusView('video'),
      mediaEvent: mediaEvent(playerView, {
        eventKind: 'ended',
      }),
    });

  assert.equal(truth.state, TV_MEDIA_ERROR_RETRY_STATE.ENDED);
  assert.equal(truth.ended, true);
  assert.equal(truth.retryAllowed, false);
});

test('media error retry truth allows user retry for focused network errors', () => {
  const playerView = videoPlayer();
  const truth =
    projectTvMediaErrorRetryTruth({
      playerView,
      focusView: focusView('video'),
      mediaEvent: mediaEvent(playerView, {
        eventKind: 'error',
        errorCode: 'MEDIA_ERR_NETWORK',
        errorMessage: 'temporary network interruption',
        canRetry: true,
        retryCount: 1,
        maxRetries: 3,
      }),
    });

  assert.equal(truth.state, TV_MEDIA_ERROR_RETRY_STATE.ERROR);
  assert.equal(truth.retryPosture, TV_MEDIA_RETRY_POSTURE.USER_ALLOWED);
  assert.equal(truth.retryAllowed, true);
  assert.equal(truth.retryControl, 'play');
  assert.equal(truth.userRetryRequired, true);
  assert.equal(truth.automaticRetryAllowed, false);
});

test('media error retry truth blocks retry when play activation is unavailable', () => {
  const playerView = audioPlayer();
  const truth =
    projectTvMediaErrorRetryTruth({
      playerView,
      focusView: focusView('audio', {
        controls: [
          {
            control: 'play',
            enabled: true,
            focusable: true,
            selected: true,
            activationAllowed: false,
          },
        ],
      }),
      mediaEvent: mediaEvent(playerView, {
        eventKind: 'error',
        errorCode: 'MEDIA_ERR_DECODE',
        canRetry: true,
      }),
    });

  assert.equal(truth.state, TV_MEDIA_ERROR_RETRY_STATE.ERROR);
  assert.equal(truth.retryPosture, TV_MEDIA_RETRY_POSTURE.BLOCKED);
  assert.equal(truth.retryAllowed, false);
  assert.match(
    truth.retryLabel,
    /user-driven Play focus activation/u,
  );
});

test('media error retry truth blocks retry after limit or unsupported source errors', () => {
  const playerView = videoPlayer();

  const limitReached =
    projectTvMediaErrorRetryTruth({
      playerView,
      focusView: focusView('video'),
      mediaEvent: mediaEvent(playerView, {
        eventKind: 'error',
        errorCode: 'MEDIA_ERR_NETWORK',
        canRetry: true,
        retryCount: 3,
        maxRetries: 3,
      }),
    });

  assert.equal(limitReached.retryAllowed, false);
  assert.match(limitReached.retryLabel, /limit/u);

  const unsupported =
    projectTvMediaErrorRetryTruth({
      playerView,
      focusView: focusView('video'),
      mediaEvent: mediaEvent(playerView, {
        eventKind: 'error',
        errorCode: 'MEDIA_ERR_SRC_NOT_SUPPORTED',
        canRetry: true,
      }),
    });

  assert.equal(unsupported.retryAllowed, false);
  assert.equal(
    unsupported.retryPosture,
    TV_MEDIA_RETRY_POSTURE.BLOCKED,
  );
});

test('media error retry truth rejects media event mismatches and raw references', () => {
  const playerView = audioPlayer();

  const wrongKind =
    projectTvMediaErrorRetryTruth({
      playerView,
      focusView: focusView('audio'),
      mediaEvent: mediaEvent(playerView, {
        mediaKind: 'video',
      }),
    });

  assert.equal(
    wrongKind.problem.code,
    'MEDIA_EVENT_KIND_MISMATCH',
  );

  const wrongHandle =
    projectTvMediaErrorRetryTruth({
      playerView,
      focusView: focusView('audio'),
      mediaEvent: mediaEvent(playerView, {
        mediaHandleId: 'other-handle',
      }),
    });

  assert.equal(
    wrongHandle.problem.code,
    'MEDIA_EVENT_HANDLE_MISMATCH',
  );

  const rawEvent =
    projectTvMediaErrorRetryTruth({
      playerView,
      focusView: focusView('audio'),
      mediaEvent: mediaEvent(playerView, {
        [['source', 'Url'].join('')]:
          'https://provider.example/media',
      }),
    });

  assert.equal(
    rawEvent.problem.code,
    'RAW_MEDIA_EVENT_REFERENCE_REJECTED',
  );
});

test('media error retry truth rejects stale schemas and unsafe player posture', () => {
  const playerView = videoPlayer();

  const stalePlayer =
    projectTvMediaErrorRetryTruth({
      playerView: {
        ...playerView,
        schema: 'crablink.tv.old-player.v0',
      },
      mediaEvent: mediaEvent(playerView),
    });

  assert.equal(stalePlayer.problem.code, 'UNSUPPORTED_PLAYER_SCHEMA');

  const notReady =
    projectTvMediaErrorRetryTruth({
      playerView: {
        ...playerView,
        state: 'rejected',
      },
      mediaEvent: mediaEvent(playerView),
    });

  assert.equal(notReady.problem.code, 'PLAYER_VIEW_NOT_READY');

  const autoplay =
    projectTvMediaErrorRetryTruth({
      playerView: {
        ...playerView,
        autoplayAllowed: true,
      },
      mediaEvent: mediaEvent(playerView),
    });

  assert.equal(autoplay.problem.code, 'AUTOPLAY_NOT_ALLOWED');

  const staleEvent =
    projectTvMediaErrorRetryTruth({
      playerView,
      mediaEvent: mediaEvent(playerView, {
        schema: 'crablink.tv.old-event.v0',
      }),
    });

  assert.equal(
    staleEvent.problem.code,
    'UNSUPPORTED_MEDIA_EVENT_SCHEMA',
  );
});

test('media error retry truth output has no media creation, storage, or authority fields', () => {
  const playerView = audioPlayer();
  const truth =
    projectTvMediaErrorRetryTruth({
      playerView,
      focusView: focusView('audio'),
      mediaEvent: mediaEvent(playerView, {
        eventKind: 'error',
        errorCode: 'MEDIA_ERR_NETWORK',
        canRetry: true,
      }),
    });

  const serialized = JSON.stringify(truth);

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
    'localStorage',
    'sessionStorage',
  ]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});
