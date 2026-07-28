import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TV_CONTINUE_WATCHING_POSTURE,
  TV_CONTINUE_WATCHING_RESOURCE_SCHEMA,
  TV_CONTINUE_WATCHING_RESOURCE_STATE,
  TV_PLAYBACK_PROGRESS_EVENT_SCHEMA,
  TV_RESOURCE_RELEASE_POSTURE,
  projectTvContinueWatchingResourceTruth,
} from './tvContinueWatchingResourceModel.js';

function videoPlayer(overrides = {}) {
  return {
    schema: 'crablink.tv.verified-video-playback.v1',
    state: 'ready',
    playbackKind: 'video',
    mediaHandleId: 'media-handle-video-progress',
    canonicalCrabUrl: 'crab://creator.example/video/progress',
    cid: 'b3:video-progress',
    contentType: 'video/mp4',
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
    mediaHandleId: 'media-handle-audio-progress',
    canonicalCrabUrl: 'crab://creator.example/audio/progress',
    cid: 'b3:audio-progress',
    contentType: 'audio/mpeg',
    playerElementAttached: true,
    audioElementAttached: true,
    videoElementAttached: false,
    autoplayAllowed: false,
    ...overrides,
  };
}

function progressEvent(playerView, overrides = {}) {
  const mediaKind =
    playerView.schema === 'crablink.tv.verified-video-playback.v1'
      ? 'video'
      : 'audio';

  return {
    schema: TV_PLAYBACK_PROGRESS_EVENT_SCHEMA,
    mediaKind,
    mediaHandleId: playerView.mediaHandleId,
    durationSeconds: 300,
    positionSeconds: 60,
    ended: false,
    releaseReason: '',
    ...overrides,
  };
}

test('continue watching resource truth projects idle without input', () => {
  const truth =
    projectTvContinueWatchingResourceTruth(null);

  assert.equal(
    truth.schema,
    TV_CONTINUE_WATCHING_RESOURCE_SCHEMA,
  );
  assert.equal(
    truth.state,
    TV_CONTINUE_WATCHING_RESOURCE_STATE.IDLE,
  );
  assert.equal(truth.persistCandidate, false);
  assert.equal(truth.storageMutationRequested, false);
  assert.equal(truth.releaseRequested, false);
  assert.equal(truth.releaseSideEffectAllowed, false);
});

test('continue watching resource truth marks video resume candidate', () => {
  const playerView = videoPlayer();

  const truth =
    projectTvContinueWatchingResourceTruth({
      playerView,
      progressEvent: progressEvent(playerView, {
        durationSeconds: 600,
        positionSeconds: 120,
      }),
    });

  assert.equal(
    truth.state,
    TV_CONTINUE_WATCHING_RESOURCE_STATE.READY,
  );
  assert.equal(truth.mediaKind, 'video');
  assert.equal(
    truth.continueWatchingPosture,
    TV_CONTINUE_WATCHING_POSTURE.RESUME_CANDIDATE,
  );
  assert.equal(truth.persistCandidate, true);
  assert.equal(truth.persistAllowed, true);
  assert.equal(truth.storageMutationRequested, false);
  assert.equal(truth.completed, false);
  assert.equal(truth.progressRatio, 0.2);
});

test('continue watching resource truth marks audio resume candidate', () => {
  const playerView = audioPlayer();

  const truth =
    projectTvContinueWatchingResourceTruth({
      playerView,
      progressEvent: progressEvent(playerView, {
        durationSeconds: 1000,
        positionSeconds: 250,
      }),
    });

  assert.equal(truth.mediaKind, 'audio');
  assert.equal(
    truth.continueWatchingPosture,
    TV_CONTINUE_WATCHING_POSTURE.RESUME_CANDIDATE,
  );
  assert.equal(truth.persistCandidate, true);
  assert.equal(truth.contentType, 'audio/mpeg');
});

test('continue watching resource truth does not persist below threshold', () => {
  const playerView = videoPlayer();

  const truth =
    projectTvContinueWatchingResourceTruth({
      playerView,
      progressEvent: progressEvent(playerView, {
        durationSeconds: 600,
        positionSeconds: 5,
      }),
    });

  assert.equal(
    truth.continueWatchingPosture,
    TV_CONTINUE_WATCHING_POSTURE.NONE,
  );
  assert.equal(truth.persistCandidate, false);
  assert.equal(truth.persistAllowed, false);
});

test('continue watching resource truth marks complete near the end', () => {
  const playerView = audioPlayer();

  const truth =
    projectTvContinueWatchingResourceTruth({
      playerView,
      progressEvent: progressEvent(playerView, {
        durationSeconds: 600,
        positionSeconds: 575,
      }),
    });

  assert.equal(
    truth.continueWatchingPosture,
    TV_CONTINUE_WATCHING_POSTURE.COMPLETE,
  );
  assert.equal(truth.completed, true);
  assert.equal(truth.persistCandidate, false);
  assert.equal(truth.persistAllowed, false);
});

test('continue watching resource truth marks complete on ended release', () => {
  const playerView = videoPlayer();

  const truth =
    projectTvContinueWatchingResourceTruth({
      playerView,
      progressEvent: progressEvent(playerView, {
        positionSeconds: 150,
        ended: true,
        releaseReason: 'ended',
      }),
    });

  assert.equal(truth.completed, true);
  assert.equal(
    truth.releasePosture,
    TV_RESOURCE_RELEASE_POSTURE.REQUESTED,
  );
  assert.equal(truth.releaseRequested, true);
  assert.equal(truth.releaseReason, 'ended');
  assert.equal(truth.releaseSideEffectAllowed, false);
});

test('continue watching resource truth requests release for back, error, and unload', () => {
  const playerView = videoPlayer();

  for (const releaseReason of ['back', 'error', 'unload']) {
    const truth =
      projectTvContinueWatchingResourceTruth({
        playerView,
        progressEvent: progressEvent(playerView, {
          releaseReason,
        }),
      });

    assert.equal(
      truth.releasePosture,
      TV_RESOURCE_RELEASE_POSTURE.REQUESTED,
    );
    assert.equal(truth.releaseRequested, true);
    assert.equal(truth.releaseReason, releaseReason);
    assert.equal(truth.releaseSideEffectAllowed, false);
  }
});

test('continue watching resource truth rejects mismatches and raw progress references', () => {
  const playerView = audioPlayer();

  const wrongKind =
    projectTvContinueWatchingResourceTruth({
      playerView,
      progressEvent: progressEvent(playerView, {
        mediaKind: 'video',
      }),
    });

  assert.equal(
    wrongKind.problem.code,
    'PROGRESS_MEDIA_KIND_MISMATCH',
  );

  const wrongHandle =
    projectTvContinueWatchingResourceTruth({
      playerView,
      progressEvent: progressEvent(playerView, {
        mediaHandleId: 'other-handle',
      }),
    });

  assert.equal(
    wrongHandle.problem.code,
    'PROGRESS_MEDIA_HANDLE_MISMATCH',
  );

  const rawReference =
    projectTvContinueWatchingResourceTruth({
      playerView,
      progressEvent: progressEvent(playerView, {
        [['source', 'Url'].join('')]:
          'https://provider.example/media',
      }),
    });

  assert.equal(
    rawReference.problem.code,
    'RAW_PROGRESS_REFERENCE_REJECTED',
  );
});

test('continue watching resource truth rejects stale schemas and unsafe player posture', () => {
  const playerView = videoPlayer();

  const stalePlayer =
    projectTvContinueWatchingResourceTruth({
      playerView: {
        ...playerView,
        schema: 'crablink.tv.old-player.v0',
      },
      progressEvent: progressEvent(playerView),
    });

  assert.equal(
    stalePlayer.problem.code,
    'UNSUPPORTED_PLAYER_SCHEMA',
  );

  const notReady =
    projectTvContinueWatchingResourceTruth({
      playerView: {
        ...playerView,
        state: 'rejected',
      },
      progressEvent: progressEvent(playerView),
    });

  assert.equal(notReady.problem.code, 'PLAYER_VIEW_NOT_READY');

  const autoplay =
    projectTvContinueWatchingResourceTruth({
      playerView: {
        ...playerView,
        autoplayAllowed: true,
      },
      progressEvent: progressEvent(playerView),
    });

  assert.equal(autoplay.problem.code, 'AUTOPLAY_NOT_ALLOWED');

  const staleProgress =
    projectTvContinueWatchingResourceTruth({
      playerView,
      progressEvent: progressEvent(playerView, {
        schema: 'crablink.tv.old-progress.v0',
      }),
    });

  assert.equal(
    staleProgress.problem.code,
    'UNSUPPORTED_PROGRESS_EVENT_SCHEMA',
  );
});

test('continue watching resource truth output has no source creation, storage mutation, or authority fields', () => {
  const playerView = audioPlayer();

  const truth =
    projectTvContinueWatchingResourceTruth({
      playerView,
      progressEvent: progressEvent(playerView, {
        releaseReason: 'back',
      }),
    });

  const serialized = JSON.stringify(truth);

  assert.equal(truth.storageMutationRequested, false);
  assert.equal(truth.releaseSideEffectAllowed, false);

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
