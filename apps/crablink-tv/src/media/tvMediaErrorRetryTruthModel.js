export const TV_MEDIA_ERROR_RETRY_TRUTH_SCHEMA =
  'crablink.tv.media-error-retry-truth.v1';

export const TV_MEDIA_PLAYER_EVENT_SCHEMA =
  'crablink.tv.media-player-event.v1';

export const TV_MEDIA_ERROR_RETRY_STATE = Object.freeze({
  IDLE: 'idle',
  HEALTHY: 'healthy',
  BUFFERING: 'buffering',
  ENDED: 'ended',
  ERROR: 'error',
  REJECTED: 'rejected',
});

export const TV_MEDIA_RETRY_POSTURE = Object.freeze({
  NONE: 'none',
  USER_ALLOWED: 'user-allowed',
  BLOCKED: 'blocked',
});

export const TV_MEDIA_PLAYER_EVENT_KIND = Object.freeze({
  LOADED_METADATA: 'loadedmetadata',
  CAN_PLAY: 'canplay',
  PLAYING: 'playing',
  PAUSED: 'paused',
  WAITING: 'waiting',
  STALLED: 'stalled',
  ENDED: 'ended',
  ERROR: 'error',
});

const VIDEO_PLAYBACK_SCHEMA =
  'crablink.tv.verified-video-playback.v1';

const AUDIO_PLAYBACK_SCHEMA =
  'crablink.tv.verified-audio-playback.v1';

const CONTROLS_FOCUS_SCHEMA =
  'crablink.tv.playback-controls-focus.v1';

const RETRY_CONTROL = 'play';

const RETRYABLE_ERROR_CODES =
  new Set([
    'MEDIA_ERR_NETWORK',
    'MEDIA_ERR_DECODE',
  ]);

const RAW_REFERENCE_KEY_PARTS = Object.freeze([
  ['s', 'r', 'c'],
  ['u', 'r', 'l'],
  ['source', 'Ref'],
  ['source', 'Location'],
  ['source', 'Url'],
  ['object', 'Url'],
  ['signed', 'Url'],
  ['asset', 'Bytes'],
  ['bytes'],
  ['blob'],
  ['raw', 'Body'],
  ['provider', 'Url'],
]);

const RAW_REFERENCE_KEYS =
  new Set(
    RAW_REFERENCE_KEY_PARTS.map((parts) =>
      parts.join('').toLowerCase(),
    ),
  );

function cleanText(value) {
  return String(value ?? '').trim();
}

function lowerText(value) {
  return cleanText(value).toLowerCase();
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

function boundedInteger(value, fallback = 0) {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return fallback;
  }

  return Math.trunc(number);
}

function mediaKindForPlayer(playerView) {
  if (playerView?.schema === VIDEO_PLAYBACK_SCHEMA) {
    return 'video';
  }

  if (playerView?.schema === AUDIO_PLAYBACK_SCHEMA) {
    return 'audio';
  }

  return 'unknown';
}

function hasRawReferenceKey(value, seen = new Set()) {
  if (!value || typeof value !== 'object') {
    return false;
  }

  if (seen.has(value)) {
    return false;
  }

  seen.add(value);

  for (const [key, nested] of Object.entries(value)) {
    const normalizedKey = String(key).toLowerCase();

    if (RAW_REFERENCE_KEYS.has(normalizedKey)) {
      return true;
    }

    if (hasRawReferenceKey(nested, seen)) {
      return true;
    }
  }

  return false;
}

function hasPlayActivation(focusView) {
  if (!focusView || typeof focusView !== 'object') {
    return false;
  }

  if (focusView.schema !== CONTROLS_FOCUS_SCHEMA) {
    return false;
  }

  if (focusView.state !== 'ready') {
    return false;
  }

  if (focusView.remoteActivationEnabled !== true) {
    return false;
  }

  if (!Array.isArray(focusView.controls)) {
    return false;
  }

  return focusView.controls.some((control) =>
    lowerText(control?.control) === RETRY_CONTROL &&
    control?.enabled === true &&
    control?.activationAllowed === true,
  );
}

function baseProjection(overrides = {}) {
  return {
    schema: TV_MEDIA_ERROR_RETRY_TRUTH_SCHEMA,
    state: TV_MEDIA_ERROR_RETRY_STATE.IDLE,
    mediaKind: 'unknown',
    mediaHandleId: '',
    eventKind: '',
    errorCode: '',
    errorMessage: '',
    retryPosture: TV_MEDIA_RETRY_POSTURE.NONE,
    retryAllowed: false,
    retryControl: '',
    userRetryRequired: false,
    automaticRetryAllowed: false,
    retryCount: 0,
    maxRetries: 0,
    buffering: false,
    ended: false,
    statusLabel: 'No media playback event has been reviewed.',
    retryLabel: 'Retry is not available.',
    problem: null,
    ...overrides,
  };
}

function rejectedProjection(code, message, mediaKind = 'unknown') {
  return baseProjection({
    state: TV_MEDIA_ERROR_RETRY_STATE.REJECTED,
    mediaKind,
    retryPosture: TV_MEDIA_RETRY_POSTURE.BLOCKED,
    statusLabel: 'Media playback event rejected.',
    retryLabel: 'Retry is blocked.',
    problem: {
      code,
      message,
    },
  });
}

function healthyProjection(playerView, mediaKind, mediaEvent, statusLabel) {
  return baseProjection({
    state: TV_MEDIA_ERROR_RETRY_STATE.HEALTHY,
    mediaKind,
    mediaHandleId: boundedText(playerView.mediaHandleId),
    eventKind: lowerText(mediaEvent?.eventKind),
    statusLabel,
    retryLabel: 'No retry is needed.',
  });
}

function bufferingProjection(playerView, mediaKind, mediaEvent) {
  return baseProjection({
    state: TV_MEDIA_ERROR_RETRY_STATE.BUFFERING,
    mediaKind,
    mediaHandleId: boundedText(playerView.mediaHandleId),
    eventKind: lowerText(mediaEvent.eventKind),
    buffering: true,
    statusLabel:
      mediaEvent.eventKind === TV_MEDIA_PLAYER_EVENT_KIND.STALLED
        ? 'Playback is stalled; waiting for recovery or user action.'
        : 'Playback is buffering.',
    retryLabel:
      'Retry is not exposed while the player is still buffering.',
  });
}

function endedProjection(playerView, mediaKind, mediaEvent) {
  return baseProjection({
    state: TV_MEDIA_ERROR_RETRY_STATE.ENDED,
    mediaKind,
    mediaHandleId: boundedText(playerView.mediaHandleId),
    eventKind: lowerText(mediaEvent.eventKind),
    ended: true,
    statusLabel: 'Playback ended normally.',
    retryLabel: 'Replay should be a user playback action, not an error retry.',
  });
}

function retryDecision(mediaEvent, focusView) {
  const errorCode =
    boundedText(mediaEvent.errorCode || 'UNKNOWN_MEDIA_ERROR');

  const retryCount =
    boundedInteger(mediaEvent.retryCount, 0);

  const maxRetries =
    boundedInteger(mediaEvent.maxRetries, 0);

  if (!RETRYABLE_ERROR_CODES.has(errorCode)) {
    return {
      retryPosture: TV_MEDIA_RETRY_POSTURE.BLOCKED,
      retryAllowed: false,
      retryLabel: 'Retry is blocked for this media error.',
      retryCount,
      maxRetries,
    };
  }

  if (mediaEvent.canRetry !== true) {
    return {
      retryPosture: TV_MEDIA_RETRY_POSTURE.BLOCKED,
      retryAllowed: false,
      retryLabel: 'Retry was not marked safe for this event.',
      retryCount,
      maxRetries,
    };
  }

  if (maxRetries > 0 && retryCount >= maxRetries) {
    return {
      retryPosture: TV_MEDIA_RETRY_POSTURE.BLOCKED,
      retryAllowed: false,
      retryLabel: 'Retry limit has been reached.',
      retryCount,
      maxRetries,
    };
  }

  if (!hasPlayActivation(focusView)) {
    return {
      retryPosture: TV_MEDIA_RETRY_POSTURE.BLOCKED,
      retryAllowed: false,
      retryLabel:
        'Retry requires user-driven Play focus activation.',
      retryCount,
      maxRetries,
    };
  }

  return {
    retryPosture: TV_MEDIA_RETRY_POSTURE.USER_ALLOWED,
    retryAllowed: true,
    retryLabel:
      'User may retry playback with the focused Play control.',
    retryCount,
    maxRetries,
  };
}

function errorProjection(playerView, mediaKind, mediaEvent, focusView) {
  const retry =
    retryDecision(mediaEvent, focusView);

  return baseProjection({
    state: TV_MEDIA_ERROR_RETRY_STATE.ERROR,
    mediaKind,
    mediaHandleId: boundedText(playerView.mediaHandleId),
    eventKind: TV_MEDIA_PLAYER_EVENT_KIND.ERROR,
    errorCode:
      boundedText(mediaEvent.errorCode || 'UNKNOWN_MEDIA_ERROR'),
    errorMessage:
      boundedText(mediaEvent.errorMessage || 'Media playback failed.'),
    retryPosture: retry.retryPosture,
    retryAllowed: retry.retryAllowed,
    retryControl: retry.retryAllowed ? RETRY_CONTROL : '',
    userRetryRequired: retry.retryAllowed === true,
    automaticRetryAllowed: false,
    retryCount: retry.retryCount,
    maxRetries: retry.maxRetries,
    statusLabel: 'Media playback reported an error.',
    retryLabel: retry.retryLabel,
  });
}

function validateEventAgainstPlayer(playerView, mediaKind, mediaEvent) {
  if (!mediaEvent || typeof mediaEvent !== 'object') {
    return null;
  }

  if (hasRawReferenceKey(mediaEvent)) {
    return {
      code: 'RAW_MEDIA_EVENT_REFERENCE_REJECTED',
      message:
        'Media event truth must not expose raw media references.',
    };
  }

  if (mediaEvent.schema !== TV_MEDIA_PLAYER_EVENT_SCHEMA) {
    return {
      code: 'UNSUPPORTED_MEDIA_EVENT_SCHEMA',
      message: 'Media event schema is not accepted.',
    };
  }

  const eventKind = lowerText(mediaEvent.eventKind);

  if (
    !Object.values(TV_MEDIA_PLAYER_EVENT_KIND).includes(eventKind)
  ) {
    return {
      code: 'UNSUPPORTED_MEDIA_EVENT_KIND',
      message: 'Media event kind is not accepted.',
    };
  }

  if (lowerText(mediaEvent.mediaKind) !== mediaKind) {
    return {
      code: 'MEDIA_EVENT_KIND_MISMATCH',
      message: 'Media event kind does not match the player.',
    };
  }

  if (
    cleanText(mediaEvent.mediaHandleId) !==
    cleanText(playerView.mediaHandleId)
  ) {
    return {
      code: 'MEDIA_EVENT_HANDLE_MISMATCH',
      message: 'Media event handle does not match the player.',
    };
  }

  return null;
}

export function projectTvMediaErrorRetryTruth(input) {
  if (!input || typeof input !== 'object') {
    return baseProjection();
  }

  const playerView = input.playerView;
  const focusView = input.focusView;
  const mediaEvent = input.mediaEvent;

  if (!playerView || typeof playerView !== 'object') {
    return baseProjection();
  }

  const mediaKind = mediaKindForPlayer(playerView);

  if (mediaKind === 'unknown') {
    return rejectedProjection(
      'UNSUPPORTED_PLAYER_SCHEMA',
      'Media error truth requires a verified video or audio player.',
    );
  }

  if (playerView.state !== 'ready') {
    return rejectedProjection(
      'PLAYER_VIEW_NOT_READY',
      'Media error truth only accepts ready player views.',
      mediaKind,
    );
  }

  if (playerView.playerElementAttached !== true) {
    return rejectedProjection(
      'PLAYER_ELEMENT_NOT_ATTACHED',
      'Media error truth requires an attached player element.',
      mediaKind,
    );
  }

  if (playerView.autoplayAllowed === true) {
    return rejectedProjection(
      'AUTOPLAY_NOT_ALLOWED',
      'Media retry truth must remain user-driven.',
      mediaKind,
    );
  }

  const eventProblem =
    validateEventAgainstPlayer(playerView, mediaKind, mediaEvent);

  if (eventProblem) {
    return rejectedProjection(
      eventProblem.code,
      eventProblem.message,
      mediaKind,
    );
  }

  if (!mediaEvent) {
    return healthyProjection(
      playerView,
      mediaKind,
      null,
      'No playback error reported.',
    );
  }

  const eventKind = lowerText(mediaEvent.eventKind);

  if (
    eventKind === TV_MEDIA_PLAYER_EVENT_KIND.WAITING ||
    eventKind === TV_MEDIA_PLAYER_EVENT_KIND.STALLED
  ) {
    return bufferingProjection(playerView, mediaKind, mediaEvent);
  }

  if (eventKind === TV_MEDIA_PLAYER_EVENT_KIND.ENDED) {
    return endedProjection(playerView, mediaKind, mediaEvent);
  }

  if (eventKind === TV_MEDIA_PLAYER_EVENT_KIND.ERROR) {
    return errorProjection(
      playerView,
      mediaKind,
      mediaEvent,
      focusView,
    );
  }

  return healthyProjection(
    playerView,
    mediaKind,
    mediaEvent,
    'Playback event indicates a healthy player state.',
  );
}
