export const TV_VERIFIED_MEDIA_SOURCE_HANDOFF_SCHEMA =
  'crablink.tv.verified-media-source-handoff.v1';

export const TV_VERIFIED_MEDIA_SOURCE_HANDOFF_PROJECTION_SCHEMA =
  'crablink.tv.verified-media-source-handoff-projection.v1';

export const TV_VERIFIED_MEDIA_SOURCE_HANDOFF_STATE = Object.freeze({
  IDLE: 'idle',
  READY: 'ready',
  REJECTED: 'rejected',
});

export const TV_VERIFIED_MEDIA_SOURCE_HANDOFF_KIND = Object.freeze({
  ISOLATED_OBJECT_SOURCE: 'isolated-object-source',
  GATEWAY_STREAM_SOURCE: 'gateway-stream-source',
});

export const TV_VERIFIED_MEDIA_SOURCE_DELIVERY_MODE = Object.freeze({
  LOCAL_FULL_BYTE: 'local-full-byte',
  BACKEND_SERVICE_PATH: 'backend-service-path',
});

const EXPECTED_PLAYBACK_SURFACE_SCHEMA =
  'crablink.tv.verified-media-playback-surface.v1';

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

function boundedText(value, fallback = '') {
  const text = cleanText(value);

  if (!text) {
    return fallback;
  }

  if (text.length > 160) {
    return `${text.slice(0, 157)}...`;
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

function idleProjection() {
  return {
    schema: TV_VERIFIED_MEDIA_SOURCE_HANDOFF_PROJECTION_SCHEMA,
    state: TV_VERIFIED_MEDIA_SOURCE_HANDOFF_STATE.IDLE,
    playbackKind: 'unknown',
    handoffKind: '',
    deliveryMode: '',
    mediaHandleId: '',
    canonicalCrabUrl: '',
    cid: '',
    contentType: '',
    contentLength: 0,
    sourceAttached: false,
    sourceReadyForPlayerElement: false,
    playerElementAttached: false,
    autoplayAllowed: false,
    seekAllowed: false,
    rangeStreamAllowed: false,
    completeDigestVerified: false,
    backendServicePathVerified: false,
    statusLabel: 'No media source handoff selected.',
    truthLabel: 'Source handoff has not been reviewed.',
    problem: null,
  };
}

function rejectedProjection(code, message) {
  return {
    schema: TV_VERIFIED_MEDIA_SOURCE_HANDOFF_PROJECTION_SCHEMA,
    state: TV_VERIFIED_MEDIA_SOURCE_HANDOFF_STATE.REJECTED,
    playbackKind: 'unknown',
    handoffKind: '',
    deliveryMode: '',
    mediaHandleId: '',
    canonicalCrabUrl: '',
    cid: '',
    contentType: '',
    contentLength: 0,
    sourceAttached: false,
    sourceReadyForPlayerElement: false,
    playerElementAttached: false,
    autoplayAllowed: false,
    seekAllowed: false,
    rangeStreamAllowed: false,
    completeDigestVerified: false,
    backendServicePathVerified: false,
    statusLabel: 'Media source handoff rejected.',
    truthLabel: 'Source handoff is not safe to attach.',
    problem: {
      code,
      message,
    },
  };
}

function sourceTruthLabel(sourceHandoff) {
  const deliveryMode = lowerText(sourceHandoff.deliveryMode);

  if (
    deliveryMode ===
    TV_VERIFIED_MEDIA_SOURCE_DELIVERY_MODE.LOCAL_FULL_BYTE
  ) {
    return 'Local full-byte media handle reviewed for player handoff.';
  }

  if (
    deliveryMode ===
    TV_VERIFIED_MEDIA_SOURCE_DELIVERY_MODE.BACKEND_SERVICE_PATH
  ) {
    return 'Backend service-path stream handle reviewed for player handoff.';
  }

  return 'Unknown media handoff truth.';
}

function expectedDeliveryForSurface(surfaceView) {
  if (surfaceView?.fullByteVerified === true) {
    return TV_VERIFIED_MEDIA_SOURCE_DELIVERY_MODE.LOCAL_FULL_BYTE;
  }

  if (surfaceView?.backendServicePathVerified === true) {
    return TV_VERIFIED_MEDIA_SOURCE_DELIVERY_MODE.BACKEND_SERVICE_PATH;
  }

  return '';
}

function expectedHandoffKindForDelivery(deliveryMode) {
  if (
    deliveryMode ===
    TV_VERIFIED_MEDIA_SOURCE_DELIVERY_MODE.LOCAL_FULL_BYTE
  ) {
    return TV_VERIFIED_MEDIA_SOURCE_HANDOFF_KIND.ISOLATED_OBJECT_SOURCE;
  }

  if (
    deliveryMode ===
    TV_VERIFIED_MEDIA_SOURCE_DELIVERY_MODE.BACKEND_SERVICE_PATH
  ) {
    return TV_VERIFIED_MEDIA_SOURCE_HANDOFF_KIND.GATEWAY_STREAM_SOURCE;
  }

  return '';
}

function compareRequiredFields(surfaceView, sourceHandoff) {
  const comparisons = [
    [
      'PLAYBACK_KIND_MISMATCH',
      'Source handoff playback kind does not match the playback surface.',
      lowerText(surfaceView.playbackKind),
      lowerText(sourceHandoff.playbackKind),
    ],
    [
      'CANONICAL_CRAB_URL_MISMATCH',
      'Source handoff canonical crab identity does not match.',
      cleanText(surfaceView.canonicalCrabUrl),
      cleanText(sourceHandoff.canonicalCrabUrl),
    ],
    [
      'CID_MISMATCH',
      'Source handoff content identity does not match.',
      cleanText(surfaceView.cid),
      cleanText(sourceHandoff.cid),
    ],
    [
      'CONTENT_TYPE_MISMATCH',
      'Source handoff content type does not match.',
      lowerText(surfaceView.contentType),
      lowerText(sourceHandoff.contentType),
    ],
    [
      'CONTENT_LENGTH_MISMATCH',
      'Source handoff content length does not match.',
      String(boundedLength(surfaceView.contentLength)),
      String(boundedLength(sourceHandoff.contentLength)),
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

export function projectTvVerifiedMediaSourceHandoff(input) {
  if (!input || typeof input !== 'object') {
    return idleProjection();
  }

  const surfaceView = input.surfaceView;
  const sourceHandoff = input.sourceHandoff;

  if (!surfaceView || typeof surfaceView !== 'object') {
    return idleProjection();
  }

  if (surfaceView.schema !== EXPECTED_PLAYBACK_SURFACE_SCHEMA) {
    return rejectedProjection(
      'UNSUPPORTED_PLAYBACK_SURFACE_SCHEMA',
      'Source handoff requires the Phase 10B playback surface schema.',
    );
  }

  if (surfaceView.state !== 'ready') {
    return rejectedProjection(
      'PLAYBACK_SURFACE_NOT_READY',
      'Source handoff only accepts a ready playback surface.',
    );
  }

  if (!sourceHandoff || typeof sourceHandoff !== 'object') {
    return idleProjection();
  }

  if (hasRawReferenceKey(sourceHandoff)) {
    return rejectedProjection(
      'RAW_MEDIA_REFERENCE_REJECTED',
      'Source handoff must use an opaque media handle, not raw media references.',
    );
  }

  if (
    sourceHandoff.schema !==
    TV_VERIFIED_MEDIA_SOURCE_HANDOFF_SCHEMA
  ) {
    return rejectedProjection(
      'UNSUPPORTED_SOURCE_HANDOFF_SCHEMA',
      'Source handoff schema is not accepted.',
    );
  }

  if (sourceHandoff.state !== 'ready') {
    return rejectedProjection(
      'SOURCE_HANDOFF_NOT_READY',
      'Source handoff is not ready.',
    );
  }

  const fieldProblem =
    compareRequiredFields(surfaceView, sourceHandoff);

  if (fieldProblem) {
    return rejectedProjection(
      fieldProblem.code,
      fieldProblem.message,
    );
  }

  const deliveryMode = lowerText(sourceHandoff.deliveryMode);
  const expectedDelivery =
    expectedDeliveryForSurface(surfaceView);

  if (!expectedDelivery || deliveryMode !== expectedDelivery) {
    return rejectedProjection(
      'DELIVERY_MODE_MISMATCH',
      'Source handoff delivery mode does not match verification truth.',
    );
  }

  const handoffKind = lowerText(sourceHandoff.handoffKind);
  const expectedHandoffKind =
    expectedHandoffKindForDelivery(deliveryMode);

  if (handoffKind !== expectedHandoffKind) {
    return rejectedProjection(
      'HANDOFF_KIND_MISMATCH',
      'Source handoff kind does not match delivery mode.',
    );
  }

  if (
    deliveryMode ===
      TV_VERIFIED_MEDIA_SOURCE_DELIVERY_MODE.LOCAL_FULL_BYTE &&
    sourceHandoff.completeDigestVerified !== true
  ) {
    return rejectedProjection(
      'LOCAL_FULL_BYTE_DIGEST_REQUIRED',
      'Local full-byte handoff requires completed digest verification.',
    );
  }

  if (
    deliveryMode ===
      TV_VERIFIED_MEDIA_SOURCE_DELIVERY_MODE.BACKEND_SERVICE_PATH &&
    sourceHandoff.backendServicePathVerified !== true
  ) {
    return rejectedProjection(
      'BACKEND_SERVICE_PATH_REVIEW_REQUIRED',
      'Backend service-path handoff requires service-path review.',
    );
  }

  const mediaHandleId =
    boundedText(sourceHandoff.mediaHandleId);

  if (!mediaHandleId) {
    return rejectedProjection(
      'MEDIA_HANDLE_ID_REQUIRED',
      'Source handoff requires an opaque media handle id.',
    );
  }

  const rangeStreamAllowed =
    deliveryMode ===
    TV_VERIFIED_MEDIA_SOURCE_DELIVERY_MODE.BACKEND_SERVICE_PATH
      ? sourceHandoff.rangeStreamAllowed === true
      : false;

  return {
    schema: TV_VERIFIED_MEDIA_SOURCE_HANDOFF_PROJECTION_SCHEMA,
    state: TV_VERIFIED_MEDIA_SOURCE_HANDOFF_STATE.READY,
    playbackKind: lowerText(surfaceView.playbackKind),
    handoffKind,
    deliveryMode,
    mediaHandleId,
    canonicalCrabUrl: boundedText(surfaceView.canonicalCrabUrl),
    cid: boundedText(surfaceView.cid),
    contentType: boundedText(surfaceView.contentType),
    contentLength: boundedLength(surfaceView.contentLength),
    sourceAttached: true,
    sourceReadyForPlayerElement: true,
    playerElementAttached: false,
    autoplayAllowed: false,
    seekAllowed: true,
    rangeStreamAllowed,
    completeDigestVerified:
      sourceHandoff.completeDigestVerified === true,
    backendServicePathVerified:
      sourceHandoff.backendServicePathVerified === true,
    statusLabel:
      'Media source handoff accepted; player element attach is pending.',
    truthLabel: sourceTruthLabel(sourceHandoff),
    problem: null,
  };
}
