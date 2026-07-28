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
  projectTvVerifiedVideoPlayback,
} from './tvVerifiedVideoPlaybackModel.js';

import {
  TV_VERIFIED_AUDIO_ELEMENT_SOURCE_SCHEMA,
  projectTvVerifiedAudioPlayback,
} from './tvVerifiedAudioPlaybackModel.js';

import {
  TV_PLAYBACK_CONTROL,
  TV_PLAYBACK_CONTROLS_FOCUS_SCHEMA,
  TV_PLAYBACK_CONTROLS_FOCUS_STATE,
  projectTvPlaybackControlsFocus,
} from './tvPlaybackControlsFocusModel.js';

const readyVideoPlayback = Object.freeze({
  schema: 'crablink.tv.verified-media-playback.v1',
  state: 'ready',
  playbackKind: 'video',
  canonicalCrabUrl: 'crab://creator.example/video/focus',
  cid: 'b3:video-focus',
  contentType: 'video/mp4',
  contentLength: 8192,
  fullByteVerified: true,
  backendServicePathVerified: false,
});

const readyAudioPlayback = Object.freeze({
  schema: 'crablink.tv.verified-media-playback.v1',
  state: 'ready',
  playbackKind: 'audio',
  canonicalCrabUrl: 'crab://creator.example/audio/focus',
  cid: 'b3:audio-focus',
  contentType: 'audio/mpeg',
  contentLength: 4096,
  fullByteVerified: false,
  backendServicePathVerified: true,
});

function makeSourceProjection(playback) {
  const surfaceView =
    projectTvVerifiedMediaPlaybackSurface(playback);

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
        ? 'media-handle-focus-video'
        : 'media-handle-focus-audio',
      playbackKind: playback.playbackKind,
      canonicalCrabUrl: playback.canonicalCrabUrl,
      cid: playback.cid,
      contentType: playback.contentType,
      contentLength: playback.contentLength,
      completeDigestVerified: local,
      backendServicePathVerified: !local,
      rangeStreamAllowed: !local,
    },
  });
}

function makeVideoPlayer() {
  const sourceProjection =
    makeSourceProjection(readyVideoPlayback);

  return projectTvVerifiedVideoPlayback({
    sourceProjection,
    videoElementSource: {
      schema: TV_VERIFIED_VIDEO_ELEMENT_SOURCE_SCHEMA,
      state: 'ready',
      mediaHandleId: sourceProjection.mediaHandleId,
      playbackKind: 'video',
      contentType: sourceProjection.contentType,
      contentLength: sourceProjection.contentLength,
      videoElementSource: 'blob:crablink-tv-media/video-focus',
      seekAllowed: true,
      rangeStreamAllowed: sourceProjection.rangeStreamAllowed,
    },
  });
}

function makeAudioPlayer() {
  const sourceProjection =
    makeSourceProjection(readyAudioPlayback);

  return projectTvVerifiedAudioPlayback({
    sourceProjection,
    audioElementSource: {
      schema: TV_VERIFIED_AUDIO_ELEMENT_SOURCE_SCHEMA,
      state: 'ready',
      mediaHandleId: sourceProjection.mediaHandleId,
      playbackKind: 'audio',
      contentType: sourceProjection.contentType,
      contentLength: sourceProjection.contentLength,
      audioElementSource:
        '/__crablink_tv_media__/stream/audio-focus',
      seekAllowed: true,
      rangeStreamAllowed: true,
    },
  });
}

test('playback controls focus projects idle without player view', () => {
  const focus =
    projectTvPlaybackControlsFocus(null);

  assert.equal(focus.schema, TV_PLAYBACK_CONTROLS_FOCUS_SCHEMA);
  assert.equal(focus.state, TV_PLAYBACK_CONTROLS_FOCUS_STATE.IDLE);
  assert.equal(focus.focusedControl, TV_PLAYBACK_CONTROL.BACK);
  assert.equal(focus.remoteFocusEnabled, true);
  assert.equal(focus.remoteActivationEnabled, false);
  assert.equal(focus.playerElementAttached, false);
});

test('playback controls focus accepts verified video player and includes fullscreen', () => {
  const focus =
    projectTvPlaybackControlsFocus({
      playerView: makeVideoPlayer(),
      focusRequest: {
        control: TV_PLAYBACK_CONTROL.PLAY,
      },
    });

  assert.equal(focus.state, TV_PLAYBACK_CONTROLS_FOCUS_STATE.READY);
  assert.equal(focus.mediaKind, 'video');
  assert.equal(focus.focusedControl, TV_PLAYBACK_CONTROL.PLAY);
  assert.equal(focus.remoteFocusEnabled, true);
  assert.equal(focus.remoteActivationEnabled, true);
  assert.equal(focus.autoplayAllowed, false);
  assert.ok(
    focus.controls.some(
      (control) =>
        control.control === TV_PLAYBACK_CONTROL.FULLSCREEN &&
        control.enabled === true,
    ),
  );
});

test('playback controls focus accepts verified audio player and excludes fullscreen', () => {
  const focus =
    projectTvPlaybackControlsFocus({
      playerView: makeAudioPlayer(),
      focusRequest: {
        control: TV_PLAYBACK_CONTROL.SEEK_FORWARD,
      },
    });

  assert.equal(focus.state, TV_PLAYBACK_CONTROLS_FOCUS_STATE.READY);
  assert.equal(focus.mediaKind, 'audio');
  assert.equal(
    focus.focusedControl,
    TV_PLAYBACK_CONTROL.SEEK_FORWARD,
  );
  assert.equal(
    focus.controls.some(
      (control) => control.control === TV_PLAYBACK_CONTROL.FULLSCREEN,
    ),
    false,
  );
});

test('playback controls focus moves next and previous across focusable controls', () => {
  const playerView = makeVideoPlayer();

  const nextFocus =
    projectTvPlaybackControlsFocus({
      playerView,
      focusRequest: {
        control: TV_PLAYBACK_CONTROL.PLAY,
        move: 'next',
      },
    });

  assert.equal(nextFocus.focusedControl, TV_PLAYBACK_CONTROL.PAUSE);

  const previousFocus =
    projectTvPlaybackControlsFocus({
      playerView,
      focusRequest: {
        control: TV_PLAYBACK_CONTROL.PLAY,
        move: 'previous',
      },
    });

  assert.equal(previousFocus.focusedControl, TV_PLAYBACK_CONTROL.BACK);
});

test('playback controls focus falls back when requested control is unavailable', () => {
  const focus =
    projectTvPlaybackControlsFocus({
      playerView: makeAudioPlayer(),
      focusRequest: {
        control: TV_PLAYBACK_CONTROL.FULLSCREEN,
      },
    });

  assert.equal(focus.mediaKind, 'audio');
  assert.equal(focus.focusedControl, TV_PLAYBACK_CONTROL.BACK);
  assert.equal(
    focus.controls.find(
      (control) => control.selected === true,
    )?.control,
    TV_PLAYBACK_CONTROL.BACK,
  );
});

test('playback controls focus rejects stale schema and non-ready player', () => {
  const stale =
    projectTvPlaybackControlsFocus({
      playerView: {
        ...makeVideoPlayer(),
        schema: 'crablink.tv.old-player.v0',
      },
    });

  assert.equal(stale.problem.code, 'UNSUPPORTED_PLAYER_SCHEMA');

  const nonReady =
    projectTvPlaybackControlsFocus({
      playerView: {
        ...makeVideoPlayer(),
        state: 'rejected',
      },
    });

  assert.equal(nonReady.problem.code, 'PLAYER_VIEW_NOT_READY');
});

test('playback controls focus rejects missing element attachment and autoplay', () => {
  const missingElement =
    projectTvPlaybackControlsFocus({
      playerView: {
        ...makeVideoPlayer(),
        playerElementAttached: false,
      },
    });

  assert.equal(
    missingElement.problem.code,
    'PLAYER_ELEMENT_NOT_ATTACHED',
  );

  const autoplay =
    projectTvPlaybackControlsFocus({
      playerView: {
        ...makeAudioPlayer(),
        autoplayAllowed: true,
      },
    });

  assert.equal(autoplay.problem.code, 'AUTOPLAY_NOT_ALLOWED');
});

test('playback controls focus marks only focused enabled control as activation allowed', () => {
  const focus =
    projectTvPlaybackControlsFocus({
      playerView: makeVideoPlayer(),
      focusRequest: {
        control: TV_PLAYBACK_CONTROL.SEEK_BACKWARD,
      },
    });

  const activationControls =
    focus.controls.filter(
      (control) => control.activationAllowed === true,
    );

  assert.equal(activationControls.length, 1);
  assert.equal(
    activationControls[0].control,
    TV_PLAYBACK_CONTROL.SEEK_BACKWARD,
  );
});

test('playback controls focus keeps disabled controls non-focusable', () => {
  const playerView = makeVideoPlayer();
  const controls =
    playerView.controls.map((control) =>
      control.control === TV_PLAYBACK_CONTROL.SEEK_FORWARD
        ? {
            ...control,
            enabled: false,
            focusable: false,
            reason: 'test-disabled',
          }
        : control,
    );

  const focus =
    projectTvPlaybackControlsFocus({
      playerView: {
        ...playerView,
        controls,
      },
      focusRequest: {
        control: TV_PLAYBACK_CONTROL.SEEK_FORWARD,
      },
    });

  assert.notEqual(
    focus.focusedControl,
    TV_PLAYBACK_CONTROL.SEEK_FORWARD,
  );
  assert.equal(
    focus.controls.find(
      (control) => control.control === TV_PLAYBACK_CONTROL.SEEK_FORWARD,
    )?.focusable,
    false,
  );
});

test('playback controls focus output has no media creation, storage, or authority fields', () => {
  const focus =
    projectTvPlaybackControlsFocus({
      playerView: makeAudioPlayer(),
      focusRequest: {
        control: TV_PLAYBACK_CONTROL.PLAY,
      },
    });

  const serialized = JSON.stringify(focus);

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
