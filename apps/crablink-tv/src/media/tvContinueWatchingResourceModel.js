export const TV_CONTINUE_WATCHING_RESOURCE_SCHEMA =
  'crablink.tv.continue-watching-resource.v1';

export const TV_PLAYBACK_PROGRESS_EVENT_SCHEMA =
  'crablink.tv.playback-progress-event.v1';

export const TV_CONTINUE_WATCHING_RESOURCE_STATE = Object.freeze({
  IDLE: 'idle',
  READY: 'ready',
  REJECTED: 'rejected',
});

export const TV_CONTINUE_WATCHING_POSTURE = Object.freeze({
  NONE: 'none',
  RESUME_CANDIDATE: 'resume-candidate',
  COMPLETE: 'complete',
});

export const TV_RESOURCE_RELEASE_POSTURE = Object.freeze({
  NONE: 'none',
  REQUESTED: 'requested',
  BLOCKED: 'blocked',
});

export const TV_RESOURCE_RELEASE_REASON = Object.freeze({
  BACK: 'back',
  ENDED: 'ended',
  ERROR: 'error',
  UNLOAD: 'unload',
});

const VIDEO_PLAYBACK_SCHEMA =
  'crablink.tv.verified-video-playback.v1';

const AUDIO_PLAYBACK_SCHEMA =
  'crablink.tv.verified-audio-playback.v1';

const MAX_POSITION_SECONDS = 24 * 60 * 60;
const MIN_RESUME_SECONDS = 10;
const COMPLETE_RATIO = 0.92;
const COMPLETE_REMAINING_SECONDS = 30;

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

function boundedSeconds(value) {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return 0;
  }

  return Math.min(
    MAX_POSITION_SECONDS,
    Math.trunc(number),
  );
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

function baseProjection(overrides = {}) {
  return {
    schema: TV_CONTINUE_WATCHING_RESOURCE_SCHEMA,
    state: TV_CONTINUE_WATCHING_RESOURCE_STATE.IDLE,
    mediaKind: 'unknown',
    mediaHandleId: '',
    canonicalCrabUrl: '',
    cid: '',
    contentType: '',
    durationSeconds: 0,
    positionSeconds: 0,
    remainingSeconds: 0,
    progressRatio: 0,
    continueWatchingPosture: TV_CONTINUE_WATCHING_POSTURE.NONE,
    persistCandidate: false,
    persistAllowed: false,
    storageMutationRequested: false,
    releasePosture: TV_RESOURCE_RELEASE_POSTURE.NONE,
    releaseRequested: false,
    releaseReason: '',
    releaseSideEffectAllowed: false,
    completed: false,
    statusLabel: 'No playback progress has been reviewed.',
    releaseLabel: 'Resource release is not requested.',
    problem: null,
    ...overrides,
  };
}

function rejectedProjection(code, message, mediaKind = 'unknown') {
  return baseProjection({
    state: TV_CONTINUE_WATCHING_RESOURCE_STATE.REJECTED,
    mediaKind,
    releasePosture: TV_RESOURCE_RELEASE_POSTURE.BLOCKED,
    releaseSideEffectAllowed: false,
    statusLabel: 'Continue-watching/resource truth rejected this input.',
    releaseLabel: 'Resource release is blocked.',
    problem: {
      code,
      message,
    },
  });
}

function validateProgressEvent(playerView, mediaKind, progressEvent) {
  if (!progressEvent || typeof progressEvent !== 'object') {
    return null;
  }

  if (hasRawReferenceKey(progressEvent)) {
    return {
      code: 'RAW_PROGRESS_REFERENCE_REJECTED',
      message:
        'Playback progress truth must not expose raw media references.',
    };
  }

  if (progressEvent.schema !== TV_PLAYBACK_PROGRESS_EVENT_SCHEMA) {
    return {
      code: 'UNSUPPORTED_PROGRESS_EVENT_SCHEMA',
      message: 'Playback progress event schema is not accepted.',
    };
  }

  if (lowerText(progressEvent.mediaKind) !== mediaKind) {
    return {
      code: 'PROGRESS_MEDIA_KIND_MISMATCH',
      message: 'Playback progress media kind does not match the player.',
    };
  }

  if (
    cleanText(progressEvent.mediaHandleId) !==
    cleanText(playerView.mediaHandleId)
  ) {
    return {
      code: 'PROGRESS_MEDIA_HANDLE_MISMATCH',
      message: 'Playback progress handle does not match the player.',
    };
  }

  return null;
}

function releaseReasonFor(progressEvent) {
  const reason = lowerText(progressEvent?.releaseReason);

  if (
    Object.values(TV_RESOURCE_RELEASE_REASON).includes(reason)
  ) {
    return reason;
  }

  return '';
}

function progressTruthFor(playerView, progressEvent) {
  const durationSeconds =
    boundedSeconds(
      progressEvent?.durationSeconds ?? progressEvent?.duration,
    );

  const requestedPosition =
    boundedSeconds(
      progressEvent?.positionSeconds ?? progressEvent?.position,
    );

  const positionSeconds =
    durationSeconds > 0
      ? Math.min(durationSeconds, requestedPosition)
      : requestedPosition;

  const remainingSeconds =
    durationSeconds > 0
      ? Math.max(0, durationSeconds - positionSeconds)
      : 0;

  const progressRatio =
    durationSeconds > 0
      ? Number((positionSeconds / durationSeconds).toFixed(4))
      : 0;

  const eventEnded =
    progressEvent?.ended === true ||
    releaseReasonFor(progressEvent) === TV_RESOURCE_RELEASE_REASON.ENDED;

  const completed =
    eventEnded ||
    (
      durationSeconds > 0 &&
      (
        progressRatio >= COMPLETE_RATIO ||
        remainingSeconds <= COMPLETE_REMAINING_SECONDS
      )
    );

  const persistCandidate =
    positionSeconds >= MIN_RESUME_SECONDS &&
    completed !== true;

  const continueWatchingPosture =
    completed
      ? TV_CONTINUE_WATCHING_POSTURE.COMPLETE
      : persistCandidate
        ? TV_CONTINUE_WATCHING_POSTURE.RESUME_CANDIDATE
        : TV_CONTINUE_WATCHING_POSTURE.NONE;

  return {
    durationSeconds,
    positionSeconds,
    remainingSeconds,
    progressRatio,
    completed,
    persistCandidate,
    continueWatchingPosture,
    statusLabel:
      completed
        ? 'Playback is complete; continue-watching resume should be cleared by an explicit storage layer.'
        : persistCandidate
          ? 'Playback progress is a continue-watching resume candidate.'
          : 'Playback progress is below continue-watching threshold.',
  };
}

function releaseTruthFor(progressEvent) {
  const releaseReason =
    releaseReasonFor(progressEvent);

  if (!releaseReason) {
    return {
      releasePosture: TV_RESOURCE_RELEASE_POSTURE.NONE,
      releaseRequested: false,
      releaseReason: '',
      releaseLabel: 'Resource release is not requested.',
    };
  }

  return {
    releasePosture: TV_RESOURCE_RELEASE_POSTURE.REQUESTED,
    releaseRequested: true,
    releaseReason,
    releaseLabel:
      `Resource release requested after ${releaseReason}.`,
  };
}

export function projectTvContinueWatchingResourceTruth(input) {
  if (!input || typeof input !== 'object') {
    return baseProjection();
  }

  const playerView = input.playerView;
  const progressEvent = input.progressEvent;

  if (!playerView || typeof playerView !== 'object') {
    return baseProjection();
  }

  const mediaKind =
    mediaKindForPlayer(playerView);

  if (mediaKind === 'unknown') {
    return rejectedProjection(
      'UNSUPPORTED_PLAYER_SCHEMA',
      'Continue-watching/resource truth requires a verified video or audio player.',
    );
  }

  if (playerView.state !== 'ready') {
    return rejectedProjection(
      'PLAYER_VIEW_NOT_READY',
      'Continue-watching/resource truth only accepts ready player views.',
      mediaKind,
    );
  }

  if (playerView.playerElementAttached !== true) {
    return rejectedProjection(
      'PLAYER_ELEMENT_NOT_ATTACHED',
      'Continue-watching/resource truth requires an attached player element.',
      mediaKind,
    );
  }

  if (playerView.autoplayAllowed === true) {
    return rejectedProjection(
      'AUTOPLAY_NOT_ALLOWED',
      'Continue-watching/resource truth must remain user driven.',
      mediaKind,
    );
  }

  const progressProblem =
    validateProgressEvent(playerView, mediaKind, progressEvent);

  if (progressProblem) {
    return rejectedProjection(
      progressProblem.code,
      progressProblem.message,
      mediaKind,
    );
  }

  if (!progressEvent) {
    return baseProjection({
      state: TV_CONTINUE_WATCHING_RESOURCE_STATE.READY,
      mediaKind,
      mediaHandleId: boundedText(playerView.mediaHandleId),
      canonicalCrabUrl: boundedText(playerView.canonicalCrabUrl),
      cid: boundedText(playerView.cid),
      contentType: boundedText(playerView.contentType),
      statusLabel:
        'Verified player is ready; no progress event has been emitted.',
    });
  }

  const progressTruth =
    progressTruthFor(playerView, progressEvent);

  const releaseTruth =
    releaseTruthFor(progressEvent);

  return baseProjection({
    state: TV_CONTINUE_WATCHING_RESOURCE_STATE.READY,
    mediaKind,
    mediaHandleId: boundedText(playerView.mediaHandleId),
    canonicalCrabUrl: boundedText(playerView.canonicalCrabUrl),
    cid: boundedText(playerView.cid),
    contentType: boundedText(playerView.contentType),
    durationSeconds: progressTruth.durationSeconds,
    positionSeconds: progressTruth.positionSeconds,
    remainingSeconds: progressTruth.remainingSeconds,
    progressRatio: progressTruth.progressRatio,
    continueWatchingPosture:
      progressTruth.continueWatchingPosture,
    persistCandidate: progressTruth.persistCandidate,
    persistAllowed: progressTruth.persistCandidate,
    storageMutationRequested: false,
    releasePosture: releaseTruth.releasePosture,
    releaseRequested: releaseTruth.releaseRequested,
    releaseReason: releaseTruth.releaseReason,
    releaseSideEffectAllowed: false,
    completed: progressTruth.completed,
    statusLabel: progressTruth.statusLabel,
    releaseLabel: releaseTruth.releaseLabel,
  });
}
