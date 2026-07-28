export const TV_VERIFIED_AUDIO_PLAYBACK_SCHEMA =
  'crablink.tv.verified-audio-playback.v1';

export const TV_VERIFIED_AUDIO_ELEMENT_SOURCE_SCHEMA =
  'crablink.tv.verified-audio-element-source.v1';

export const TV_VERIFIED_AUDIO_PLAYBACK_STATE = Object.freeze({
  IDLE: 'idle',
  READY: 'ready',
  REJECTED: 'rejected',
});

export const TV_VERIFIED_AUDIO_CONTROL = Object.freeze({
  BACK: 'back',
  PLAY: 'play',
  PAUSE: 'pause',
  SEEK_BACKWARD: 'seek-backward',
  SEEK_FORWARD: 'seek-forward',
});

const EXPECTED_SOURCE_HANDOFF_PROJECTION_SCHEMA =
  'crablink.tv.verified-media-source-handoff-projection.v1';

const ALLOWED_AUDIO_ELEMENT_SOURCE_PREFIXES = Object.freeze([
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
    state === TV_VERIFIED_AUDIO_PLAYBACK_STATE.READY
      ? null
      : 'audio playback is not ready';

  return [
    {
      control: TV_VERIFIED_AUDIO_CONTROL.BACK,
      label: 'Back',
      enabled: true,
      focusable: true,
      reason: null,
    },
    {
      control: TV_VERIFIED_AUDIO_CONTROL.PLAY,
      label: 'Play',
      enabled: state === TV_VERIFIED_AUDIO_PLAYBACK_STATE.READY,
      focusable: state === TV_VERIFIED_AUDIO_PLAYBACK_STATE.READY,
      reason: disabledReason,
    },
    {
      control: TV_VERIFIED_AUDIO_CONTROL.PAUSE,
      label: 'Pause',
      enabled: state === TV_VERIFIED_AUDIO_PLAYBACK_STATE.READY,
      focusable: state === TV_VERIFIED_AUDIO_PLAYBACK_STATE.READY,
      reason: disabledReason,
    },
    {
      control: TV_VERIFIED_AUDIO_CONTROL.SEEK_BACKWARD,
      label: 'Back 30s',
      enabled:
        state === TV_VERIFIED_AUDIO_PLAYBACK_STATE.READY &&
        seekAllowed === true,
      focusable:
        state === TV_VERIFIED_AUDIO_PLAYBACK_STATE.READY &&
        seekAllowed === true,
      reason:
        seekAllowed === true ? disabledReason : 'seek is not available',
    },
    {
      control: TV_VERIFIED_AUDIO_CONTROL.SEEK_FORWARD,
      label: 'Forward 30s',
      enabled:
        state === TV_VERIFIED_AUDIO_PLAYBACK_STATE.READY &&
        seekAllowed === true,
      focusable:
        state === TV_VERIFIED_AUDIO_PLAYBACK_STATE.READY &&
        seekAllowed === true,
      reason:
        seekAllowed === true ? disabledReason : 'seek is not available',
    },
  ];
}

function idleProjection() {
  return {
    schema: TV_VERIFIED_AUDIO_PLAYBACK_SCHEMA,
    state: TV_VERIFIED_AUDIO_PLAYBACK_STATE.IDLE,
    playbackKind: 'audio',
    mediaHandleId: '',
    audioElementSource: '',
    canonicalCrabUrl: '',
    cid: '',
    contentType: '',
    contentLength: 0,
    playerElementAttached: false,
    audioElementAttached: false,
    videoElementAttached: false,
    autoplayAllowed: false,
    nativeMediaPluginRequired: false,
    remoteControlsEnabled: false,
    seekAllowed: false,
    rangeStreamAllowed: false,
    completeDigestVerified: false,
    backendServicePathVerified: false,
    statusLabel: 'No verified audio source selected.',
    truthLabel: 'Audio player has not reviewed a source handoff.',
    controls: controlsFor(TV_VERIFIED_AUDIO_PLAYBACK_STATE.IDLE, false),
    problem: null,
  };
}

function rejectedProjection(code, message) {
  return {
    schema: TV_VERIFIED_AUDIO_PLAYBACK_SCHEMA,
    state: TV_VERIFIED_AUDIO_PLAYBACK_STATE.REJECTED,
    playbackKind: 'audio',
    mediaHandleId: '',
    audioElementSource: '',
    canonicalCrabUrl: '',
    cid: '',
    contentType: '',
    contentLength: 0,
    playerElementAttached: false,
    audioElementAttached: false,
    videoElementAttached: false,
    autoplayAllowed: false,
    nativeMediaPluginRequired: false,
    remoteControlsEnabled: false,
    seekAllowed: false,
    rangeStreamAllowed: false,
    completeDigestVerified: false,
    backendServicePathVerified: false,
    statusLabel: 'Verified audio playback rejected.',
    truthLabel: 'Audio source is not safe to attach.',
    controls: controlsFor(TV_VERIFIED_AUDIO_PLAYBACK_STATE.REJECTED, false),
    problem: {
      code,
      message,
    },
  };
}

function audioElementSourceProblem(value) {
  const text = cleanText(value);
  const lower = text.toLowerCase();

  if (!text) {
    return {
      code: 'AUDIO_ELEMENT_SOURCE_REQUIRED',
      message: 'Audio playback requires a reviewed element source.',
    };
  }

  if (text.length > 2048) {
    return {
      code: 'AUDIO_ELEMENT_SOURCE_TOO_LONG',
      message: 'Audio element source is too long.',
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
        code: 'AUDIO_ELEMENT_SOURCE_REJECTED',
        message: 'Audio element source must be app-local or opaque.',
      };
    }
  }

  const allowed =
    ALLOWED_AUDIO_ELEMENT_SOURCE_PREFIXES.some((prefix) =>
      lower.startsWith(prefix),
    );

  if (!allowed) {
    return {
      code: 'AUDIO_ELEMENT_SOURCE_REJECTED',
      message: 'Audio element source prefix is not accepted.',
    };
  }

  return null;
}

function compareSourceFields(sourceProjection, audioElementSource) {
  const comparisons = [
    [
      'MEDIA_HANDLE_ID_MISMATCH',
      'Audio element source handle does not match source handoff.',
      cleanText(sourceProjection.mediaHandleId),
      cleanText(audioElementSource.mediaHandleId),
    ],
    [
      'PLAYBACK_KIND_MISMATCH',
      'Audio element source kind does not match source handoff.',
      'audio',
      lowerText(audioElementSource.playbackKind),
    ],
    [
      'CONTENT_TYPE_MISMATCH',
      'Audio element source type does not match source handoff.',
      lowerText(sourceProjection.contentType),
      lowerText(audioElementSource.contentType),
    ],
    [
      'CONTENT_LENGTH_MISMATCH',
      'Audio element source length does not match source handoff.',
      String(boundedLength(sourceProjection.contentLength)),
      String(boundedLength(audioElementSource.contentLength)),
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

export function projectTvVerifiedAudioPlayback(input) {
  if (!input || typeof input !== 'object') {
    return idleProjection();
  }

  const sourceProjection = input.sourceProjection;
  const audioElementSource = input.audioElementSource;

  if (!sourceProjection || typeof sourceProjection !== 'object') {
    return idleProjection();
  }

  if (
    sourceProjection.schema !==
    EXPECTED_SOURCE_HANDOFF_PROJECTION_SCHEMA
  ) {
    return rejectedProjection(
      'UNSUPPORTED_SOURCE_HANDOFF_PROJECTION_SCHEMA',
      'Audio playback requires the Phase 10C source handoff projection.',
    );
  }

  if (sourceProjection.state !== 'ready') {
    return rejectedProjection(
      'SOURCE_HANDOFF_PROJECTION_NOT_READY',
      'Audio playback only accepts ready source handoff projections.',
    );
  }

  if (sourceProjection.playbackKind !== 'audio') {
    return rejectedProjection(
      'AUDIO_PLAYBACK_KIND_REQUIRED',
      'Audio playback surface only accepts audio handoffs.',
    );
  }

  if (sourceProjection.sourceReadyForPlayerElement !== true) {
    return rejectedProjection(
      'SOURCE_NOT_READY_FOR_PLAYER_ELEMENT',
      'Source handoff is not ready for player attachment.',
    );
  }

  if (!audioElementSource || typeof audioElementSource !== 'object') {
    return rejectedProjection(
      'AUDIO_ELEMENT_SOURCE_REQUIRED',
      'Audio playback requires a reviewed element source.',
    );
  }

  if (
    audioElementSource.schema !==
    TV_VERIFIED_AUDIO_ELEMENT_SOURCE_SCHEMA
  ) {
    return rejectedProjection(
      'UNSUPPORTED_AUDIO_ELEMENT_SOURCE_SCHEMA',
      'Audio element source schema is not accepted.',
    );
  }

  if (audioElementSource.state !== 'ready') {
    return rejectedProjection(
      'AUDIO_ELEMENT_SOURCE_NOT_READY',
      'Audio element source is not ready.',
    );
  }

  const fieldProblem =
    compareSourceFields(sourceProjection, audioElementSource);

  if (fieldProblem) {
    return rejectedProjection(
      fieldProblem.code,
      fieldProblem.message,
    );
  }

  const sourceProblem =
    audioElementSourceProblem(
      audioElementSource.audioElementSource,
    );

  if (sourceProblem) {
    return rejectedProjection(
      sourceProblem.code,
      sourceProblem.message,
    );
  }

  const seekAllowed =
    sourceProjection.seekAllowed === true &&
    audioElementSource.seekAllowed !== false;

  const rangeStreamAllowed =
    sourceProjection.rangeStreamAllowed === true &&
    audioElementSource.rangeStreamAllowed === true;

  return {
    schema: TV_VERIFIED_AUDIO_PLAYBACK_SCHEMA,
    state: TV_VERIFIED_AUDIO_PLAYBACK_STATE.READY,
    playbackKind: 'audio',
    mediaHandleId: boundedText(sourceProjection.mediaHandleId),
    audioElementSource: boundedText(
      audioElementSource.audioElementSource,
      '',
      2048,
    ),
    canonicalCrabUrl: boundedText(sourceProjection.canonicalCrabUrl),
    cid: boundedText(sourceProjection.cid),
    contentType: boundedText(sourceProjection.contentType),
    contentLength: boundedLength(sourceProjection.contentLength),
    playerElementAttached: true,
    audioElementAttached: true,
    videoElementAttached: false,
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
      'Verified audio player is ready for remote-controlled playback.',
    truthLabel:
      sourceProjection.truthLabel ||
      'Verified source handoff accepted for audio playback.',
    controls: controlsFor(
      TV_VERIFIED_AUDIO_PLAYBACK_STATE.READY,
      seekAllowed,
    ),
    problem: null,
  };
}
