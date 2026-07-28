export const TV_VERIFIED_VIDEO_PLAYBACK_SCHEMA =
  'crablink.tv.verified-video-playback.v1';

export const TV_VERIFIED_VIDEO_ELEMENT_SOURCE_SCHEMA =
  'crablink.tv.verified-video-element-source.v1';

export const TV_VERIFIED_VIDEO_PLAYBACK_STATE = Object.freeze({
  IDLE: 'idle',
  READY: 'ready',
  REJECTED: 'rejected',
});

export const TV_VERIFIED_VIDEO_CONTROL = Object.freeze({
  BACK: 'back',
  PLAY: 'play',
  PAUSE: 'pause',
  SEEK_BACKWARD: 'seek-backward',
  SEEK_FORWARD: 'seek-forward',
  FULLSCREEN: 'fullscreen',
});

const EXPECTED_SOURCE_HANDOFF_PROJECTION_SCHEMA =
  'crablink.tv.verified-media-source-handoff-projection.v1';

const ALLOWED_VIDEO_ELEMENT_SOURCE_PREFIXES = Object.freeze([
  'blob:',
  'crablink-media:',
  '/__crablink_tv_media__/',
]);

function cleanText(value) {
  return String(value ?? '').trim();
}

function boundedText(value, fallback = '', limit = 160) {
  const text = cleanText(value);

  if (!text) {
    return fallback;
  }

  if (text.length > limit) {
    return `${text.slice(0, limit - 3)}...`;
  }

  return text;
}

function boundedLength(value) {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return 0;
  }

  return Math.trunc(number);
}

function lowerText(value) {
  return cleanText(value).toLowerCase();
}

function controlsFor(state, seekAllowed) {
  const disabledReason =
    state === TV_VERIFIED_VIDEO_PLAYBACK_STATE.READY
      ? null
      : 'video playback is not ready';

  return [
    {
      control: TV_VERIFIED_VIDEO_CONTROL.BACK,
      label: 'Back',
      enabled: true,
      focusable: true,
      reason: null,
    },
    {
      control: TV_VERIFIED_VIDEO_CONTROL.PLAY,
      label: 'Play',
      enabled: state === TV_VERIFIED_VIDEO_PLAYBACK_STATE.READY,
      focusable: state === TV_VERIFIED_VIDEO_PLAYBACK_STATE.READY,
      reason: disabledReason,
    },
    {
      control: TV_VERIFIED_VIDEO_CONTROL.PAUSE,
      label: 'Pause',
      enabled: state === TV_VERIFIED_VIDEO_PLAYBACK_STATE.READY,
      focusable: state === TV_VERIFIED_VIDEO_PLAYBACK_STATE.READY,
      reason: disabledReason,
    },
    {
      control: TV_VERIFIED_VIDEO_CONTROL.SEEK_BACKWARD,
      label: 'Back 30s',
      enabled:
        state === TV_VERIFIED_VIDEO_PLAYBACK_STATE.READY &&
        seekAllowed === true,
      focusable:
        state === TV_VERIFIED_VIDEO_PLAYBACK_STATE.READY &&
        seekAllowed === true,
      reason:
        seekAllowed === true ? disabledReason : 'seek is not available',
    },
    {
      control: TV_VERIFIED_VIDEO_CONTROL.SEEK_FORWARD,
      label: 'Forward 30s',
      enabled:
        state === TV_VERIFIED_VIDEO_PLAYBACK_STATE.READY &&
        seekAllowed === true,
      focusable:
        state === TV_VERIFIED_VIDEO_PLAYBACK_STATE.READY &&
        seekAllowed === true,
      reason:
        seekAllowed === true ? disabledReason : 'seek is not available',
    },
    {
      control: TV_VERIFIED_VIDEO_CONTROL.FULLSCREEN,
      label: 'Fullscreen',
      enabled: state === TV_VERIFIED_VIDEO_PLAYBACK_STATE.READY,
      focusable: state === TV_VERIFIED_VIDEO_PLAYBACK_STATE.READY,
      reason: disabledReason,
    },
  ];
}

function idleProjection() {
  return {
    schema: TV_VERIFIED_VIDEO_PLAYBACK_SCHEMA,
    state: TV_VERIFIED_VIDEO_PLAYBACK_STATE.IDLE,
    playbackKind: 'video',
    mediaHandleId: '',
    videoElementSource: '',
    canonicalCrabUrl: '',
    cid: '',
    contentType: '',
    contentLength: 0,
    playerElementAttached: false,
    videoElementAttached: false,
    audioElementAttached: false,
    autoplayAllowed: false,
    nativeMediaPluginRequired: false,
    remoteControlsEnabled: false,
    seekAllowed: false,
    rangeStreamAllowed: false,
    completeDigestVerified: false,
    backendServicePathVerified: false,
    statusLabel: 'No verified video source selected.',
    truthLabel: 'Video player has not reviewed a source handoff.',
    controls: controlsFor(TV_VERIFIED_VIDEO_PLAYBACK_STATE.IDLE, false),
    problem: null,
  };
}

function rejectedProjection(code, message) {
  return {
    schema: TV_VERIFIED_VIDEO_PLAYBACK_SCHEMA,
    state: TV_VERIFIED_VIDEO_PLAYBACK_STATE.REJECTED,
    playbackKind: 'video',
    mediaHandleId: '',
    videoElementSource: '',
    canonicalCrabUrl: '',
    cid: '',
    contentType: '',
    contentLength: 0,
    playerElementAttached: false,
    videoElementAttached: false,
    audioElementAttached: false,
    autoplayAllowed: false,
    nativeMediaPluginRequired: false,
    remoteControlsEnabled: false,
    seekAllowed: false,
    rangeStreamAllowed: false,
    completeDigestVerified: false,
    backendServicePathVerified: false,
    statusLabel: 'Verified video playback rejected.',
    truthLabel: 'Video source is not safe to attach.',
    controls: controlsFor(TV_VERIFIED_VIDEO_PLAYBACK_STATE.REJECTED, false),
    problem: {
      code,
      message,
    },
  };
}

function videoElementSourceProblem(value) {
  const text = cleanText(value);
  const lower = text.toLowerCase();

  if (!text) {
    return {
      code: 'VIDEO_ELEMENT_SOURCE_REQUIRED',
      message: 'Video playback requires a reviewed element source.',
    };
  }

  if (text.length > 2048) {
    return {
      code: 'VIDEO_ELEMENT_SOURCE_TOO_LONG',
      message: 'Video element source is too long.',
    };
  }

  for (const forbiddenPrefix of [
    'javascript:',
    'data:',
    'file:',
    'http:',
    'https:',
    '//',
  ]) {
    if (lower.startsWith(forbiddenPrefix)) {
      return {
        code: 'VIDEO_ELEMENT_SOURCE_REJECTED',
        message: 'Video element source must be app-local or opaque.',
      };
    }
  }

  const allowed =
    ALLOWED_VIDEO_ELEMENT_SOURCE_PREFIXES.some((prefix) =>
      lower.startsWith(prefix),
    );

  if (!allowed) {
    return {
      code: 'VIDEO_ELEMENT_SOURCE_REJECTED',
      message: 'Video element source prefix is not accepted.',
    };
  }

  return null;
}

function compareSourceFields(sourceProjection, videoElementSource) {
  const comparisons = [
    [
      'MEDIA_HANDLE_ID_MISMATCH',
      'Video element source handle does not match source handoff.',
      cleanText(sourceProjection.mediaHandleId),
      cleanText(videoElementSource.mediaHandleId),
    ],
    [
      'PLAYBACK_KIND_MISMATCH',
      'Video element source kind does not match source handoff.',
      'video',
      lowerText(videoElementSource.playbackKind),
    ],
    [
      'CONTENT_TYPE_MISMATCH',
      'Video element source type does not match source handoff.',
      lowerText(sourceProjection.contentType),
      lowerText(videoElementSource.contentType),
    ],
    [
      'CONTENT_LENGTH_MISMATCH',
      'Video element source length does not match source handoff.',
      String(boundedLength(sourceProjection.contentLength)),
      String(boundedLength(videoElementSource.contentLength)),
    ],
  ];

  for (const [code, message, expected, actual] of comparisons) {
    if (!expected || expected !== actual) {
      return {
        code,
        message,
      };
    }
  }

  return null;
}

export function projectTvVerifiedVideoPlayback(input) {
  if (!input || typeof input !== 'object') {
    return idleProjection();
  }

  const sourceProjection = input.sourceProjection;
  const videoElementSource = input.videoElementSource;

  if (!sourceProjection || typeof sourceProjection !== 'object') {
    return idleProjection();
  }

  if (
    sourceProjection.schema !==
    EXPECTED_SOURCE_HANDOFF_PROJECTION_SCHEMA
  ) {
    return rejectedProjection(
      'UNSUPPORTED_SOURCE_HANDOFF_PROJECTION_SCHEMA',
      'Video playback requires the Phase 10C source handoff projection.',
    );
  }

  if (sourceProjection.state !== 'ready') {
    return rejectedProjection(
      'SOURCE_HANDOFF_PROJECTION_NOT_READY',
      'Video playback only accepts ready source handoff projections.',
    );
  }

  if (sourceProjection.playbackKind !== 'video') {
    return rejectedProjection(
      'VIDEO_PLAYBACK_KIND_REQUIRED',
      'Video playback surface only accepts video handoffs.',
    );
  }

  if (sourceProjection.sourceReadyForPlayerElement !== true) {
    return rejectedProjection(
      'SOURCE_NOT_READY_FOR_PLAYER_ELEMENT',
      'Source handoff is not ready for player attachment.',
    );
  }

  if (!videoElementSource || typeof videoElementSource !== 'object') {
    return rejectedProjection(
      'VIDEO_ELEMENT_SOURCE_REQUIRED',
      'Video playback requires a reviewed element source.',
    );
  }

  if (
    videoElementSource.schema !==
    TV_VERIFIED_VIDEO_ELEMENT_SOURCE_SCHEMA
  ) {
    return rejectedProjection(
      'UNSUPPORTED_VIDEO_ELEMENT_SOURCE_SCHEMA',
      'Video element source schema is not accepted.',
    );
  }

  if (videoElementSource.state !== 'ready') {
    return rejectedProjection(
      'VIDEO_ELEMENT_SOURCE_NOT_READY',
      'Video element source is not ready.',
    );
  }

  const fieldProblem =
    compareSourceFields(sourceProjection, videoElementSource);

  if (fieldProblem) {
    return rejectedProjection(
      fieldProblem.code,
      fieldProblem.message,
    );
  }

  const sourceProblem =
    videoElementSourceProblem(
      videoElementSource.videoElementSource,
    );

  if (sourceProblem) {
    return rejectedProjection(
      sourceProblem.code,
      sourceProblem.message,
    );
  }

  const seekAllowed =
    sourceProjection.seekAllowed === true &&
    videoElementSource.seekAllowed !== false;

  const rangeStreamAllowed =
    sourceProjection.rangeStreamAllowed === true &&
    videoElementSource.rangeStreamAllowed === true;

  return {
    schema: TV_VERIFIED_VIDEO_PLAYBACK_SCHEMA,
    state: TV_VERIFIED_VIDEO_PLAYBACK_STATE.READY,
    playbackKind: 'video',
    mediaHandleId: boundedText(sourceProjection.mediaHandleId),
    videoElementSource: boundedText(
      videoElementSource.videoElementSource,
      '',
      2048,
    ),
    canonicalCrabUrl: boundedText(sourceProjection.canonicalCrabUrl),
    cid: boundedText(sourceProjection.cid),
    contentType: boundedText(sourceProjection.contentType),
    contentLength: boundedLength(sourceProjection.contentLength),
    playerElementAttached: true,
    videoElementAttached: true,
    audioElementAttached: false,
    autoplayAllowed: false,
    nativeMediaPluginRequired: false,
    remoteControlsEnabled: true,
    seekAllowed,
    rangeStreamAllowed,
    completeDigestVerified:
      sourceProjection.completeDigestVerified === true,
    backendServicePathVerified:
      sourceProjection.backendServicePathVerified === true,
    statusLabel:
      'Verified video player is ready for remote-controlled playback.',
    truthLabel:
      sourceProjection.truthLabel ||
      'Verified source handoff accepted for video playback.',
    controls: controlsFor(
      TV_VERIFIED_VIDEO_PLAYBACK_STATE.READY,
      seekAllowed,
    ),
    problem: null,
  };
}
