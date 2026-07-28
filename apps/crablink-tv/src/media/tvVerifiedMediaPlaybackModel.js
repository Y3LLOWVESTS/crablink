/**
 * RO:WHAT — Projects strict playback readiness for verified CrabLink TV media.
 * RO:WHY — Phase 10A separates media truth from source handoff, controls, and rendering.
 * RO:INTERACTS — tvLibraryAssetDetailModel and future media verification/source/player modules.
 * RO:INVARIANTS — exact route/CID/kind binding; matching media family; explicit verification posture; configured byte ceiling.
 * RO:SECURITY — no fetch, invoke, URLs, raw bytes, browser storage, economic authority, or direct-provider fallback.
 * RO:TEST — tvVerifiedMediaPlaybackModel.test.mjs and its Phase 10A boundary.
 */

import { TV_LIBRARY_ASSET_DETAIL_KIND } from '../library/tvLibraryAssetDetailModel.js';

export const TV_VERIFIED_MEDIA_FACTS_SCHEMA =
  'crablink.tv.verified-media-facts.v1';
export const TV_VERIFIED_MEDIA_PLAYBACK_SCHEMA =
  'crablink.tv.verified-media-playback.v1';

export const TV_VERIFIED_MEDIA_PLAYBACK_STATE = Object.freeze({
  IDLE: 'idle',
  READY: 'ready',
  REJECTED: 'rejected',
});

export const TV_VERIFIED_MEDIA_PLAYBACK_KIND = Object.freeze({
  VIDEO: 'video',
  AUDIO: 'audio',
});

export const TV_VERIFIED_MEDIA_VERIFICATION_POSTURE = Object.freeze({
  LOCAL_FULL_BYTE: 'local-full-byte-verified',
  BACKEND_SERVICE_PATH: 'backend-service-path-verified',
});

export const TV_VERIFIED_MEDIA_SOURCE_MODE = Object.freeze({
  VERIFIED_OBJECT: 'verified-object',
  GATEWAY_STREAM: 'gateway-stream',
});

export const TV_VERIFIED_MEDIA_PLAYBACK_CODE = Object.freeze({
  IDLE: 'TV_VERIFIED_MEDIA_PLAYBACK_IDLE',
  READY: 'TV_VERIFIED_MEDIA_PLAYBACK_READY',
  UNSUPPORTED_ASSET: 'TV_VERIFIED_MEDIA_PLAYBACK_UNSUPPORTED_ASSET',
  FACTS_REJECTED: 'TV_VERIFIED_MEDIA_PLAYBACK_FACTS_REJECTED',
  IDENTIFIER_MISMATCH: 'TV_VERIFIED_MEDIA_PLAYBACK_IDENTIFIER_MISMATCH',
  CONTENT_TYPE_MISMATCH: 'TV_VERIFIED_MEDIA_PLAYBACK_CONTENT_TYPE_MISMATCH',
  SOURCE_POSTURE_MISMATCH:
    'TV_VERIFIED_MEDIA_PLAYBACK_SOURCE_POSTURE_MISMATCH',
  CONTENT_LENGTH_INVALID:
    'TV_VERIFIED_MEDIA_PLAYBACK_CONTENT_LENGTH_INVALID',
  CONTENT_LENGTH_LIMIT:
    'TV_VERIFIED_MEDIA_PLAYBACK_CONTENT_LENGTH_LIMIT',
});

export const TV_VERIFIED_MEDIA_PLAYBACK_LIMITS = Object.freeze({
  ASSET_KIND_CHARS: 32,
  ROUTE_CHARS: 192,
  CID_CHARS: 67,
  CONTENT_TYPE_CHARS: 96,
  CODE_CHARS: 96,
  MESSAGE_CHARS: 280,
});

const SUPPORTED_ASSET_KINDS = new Set(['video', 'music', 'podcast']);

function freeze(value) {
  return Object.freeze({
    schema: TV_VERIFIED_MEDIA_PLAYBACK_SCHEMA,
    ...value,
  });
}

function boundedText(value, fallback, maxLength) {
  const text =
    typeof value === 'string'
      ? value.trim()
      : '';

  return (text || fallback).slice(0, maxLength);
}

function baseView(state, ready, code, message) {
  return freeze({
    state,
    ready,
    sourceAttached: false,
    playbackKind: null,
    assetKind: null,
    canonicalCrabUrl: null,
    cid: null,
    contentType: null,
    contentLength: null,
    maxPlaybackBytes: null,
    verificationPosture: null,
    sourceMode: null,
    fullByteVerified: false,
    backendServicePathVerified: false,
    streaming: false,
    verificationLabel: null,
    code: boundedText(
      code,
      TV_VERIFIED_MEDIA_PLAYBACK_CODE.FACTS_REJECTED,
      TV_VERIFIED_MEDIA_PLAYBACK_LIMITS.CODE_CHARS,
    ),
    message: boundedText(
      message,
      'Verified media playback readiness rejected the current facts.',
      TV_VERIFIED_MEDIA_PLAYBACK_LIMITS.MESSAGE_CHARS,
    ),
  });
}

export function createIdleTvVerifiedMediaPlayback({
  message =
    'Verified media playback is waiting for reviewed media facts.',
} = {}) {
  return baseView(
    TV_VERIFIED_MEDIA_PLAYBACK_STATE.IDLE,
    false,
    TV_VERIFIED_MEDIA_PLAYBACK_CODE.IDLE,
    message,
  );
}

function reject(code, message) {
  return baseView(
    TV_VERIFIED_MEDIA_PLAYBACK_STATE.REJECTED,
    false,
    code,
    message,
  );
}

function canonicalDetail(detailView) {
  if (
    detailView?.kind !==
    TV_LIBRARY_ASSET_DETAIL_KIND.READY
  ) {
    return null;
  }

  const assetKind = boundedText(
    detailView.assetKind,
    '',
    TV_VERIFIED_MEDIA_PLAYBACK_LIMITS.ASSET_KIND_CHARS,
  );

  const canonicalCrabUrl = boundedText(
    detailView.canonicalCrabUrl,
    '',
    TV_VERIFIED_MEDIA_PLAYBACK_LIMITS.ROUTE_CHARS,
  );

  const cid = boundedText(
    detailView.cid,
    '',
    TV_VERIFIED_MEDIA_PLAYBACK_LIMITS.CID_CHARS,
  );

  const hash =
    cid.startsWith('b3:')
      ? cid.slice(3)
      : '';

  if (
    !SUPPORTED_ASSET_KINDS.has(assetKind) ||
    !/^[0-9a-f]{64}$/u.test(hash) ||
    canonicalCrabUrl !==
      `crab://${hash}.${assetKind}`
  ) {
    return null;
  }

  return Object.freeze({
    assetKind,
    canonicalCrabUrl,
    cid,
  });
}

function playbackKindFor(assetKind) {
  if (assetKind === 'video') {
    return TV_VERIFIED_MEDIA_PLAYBACK_KIND.VIDEO;
  }

  if (
    assetKind === 'music' ||
    assetKind === 'podcast'
  ) {
    return TV_VERIFIED_MEDIA_PLAYBACK_KIND.AUDIO;
  }

  return null;
}

function contentTypeMatches(playbackKind, contentType) {
  if (
    playbackKind ===
    TV_VERIFIED_MEDIA_PLAYBACK_KIND.VIDEO
  ) {
    return contentType.startsWith('video/');
  }

  if (
    playbackKind ===
    TV_VERIFIED_MEDIA_PLAYBACK_KIND.AUDIO
  ) {
    return contentType.startsWith('audio/');
  }

  return false;
}

function sourcePostureMatches(
  verificationPosture,
  sourceMode,
) {
  if (
    verificationPosture ===
    TV_VERIFIED_MEDIA_VERIFICATION_POSTURE.LOCAL_FULL_BYTE
  ) {
    return (
      sourceMode ===
      TV_VERIFIED_MEDIA_SOURCE_MODE.VERIFIED_OBJECT
    );
  }

  if (
    verificationPosture ===
    TV_VERIFIED_MEDIA_VERIFICATION_POSTURE.BACKEND_SERVICE_PATH
  ) {
    return (
      sourceMode ===
      TV_VERIFIED_MEDIA_SOURCE_MODE.GATEWAY_STREAM
    );
  }

  return false;
}

function positiveSafeInteger(value) {
  return (
    Number.isSafeInteger(value) &&
    value > 0
  );
}

export function projectTvVerifiedMediaPlayback({
  detailView,
  mediaFacts,
} = {}) {
  if (
    detailView?.kind !==
    TV_LIBRARY_ASSET_DETAIL_KIND.READY
  ) {
    return createIdleTvVerifiedMediaPlayback({
      message:
        'Select a reviewed video, music, or podcast asset before playback review.',
    });
  }

  const detail =
    canonicalDetail(detailView);

  if (!detail) {
    return reject(
      TV_VERIFIED_MEDIA_PLAYBACK_CODE.UNSUPPORTED_ASSET,
      'The active Library asset is not a supported Phase 10 media kind.',
    );
  }

  if (
    mediaFacts?.schema !==
      TV_VERIFIED_MEDIA_FACTS_SCHEMA ||
    mediaFacts.state !== 'ready' ||
    mediaFacts.verified !== true
  ) {
    return reject(
      TV_VERIFIED_MEDIA_PLAYBACK_CODE.FACTS_REJECTED,
      'Playback readiness requires explicit ready verified media facts.',
    );
  }

  const assetKind = boundedText(
    mediaFacts.assetKind,
    '',
    TV_VERIFIED_MEDIA_PLAYBACK_LIMITS.ASSET_KIND_CHARS,
  );

  const canonicalCrabUrl = boundedText(
    mediaFacts.canonicalCrabUrl,
    '',
    TV_VERIFIED_MEDIA_PLAYBACK_LIMITS.ROUTE_CHARS,
  );

  const cid = boundedText(
    mediaFacts.cid,
    '',
    TV_VERIFIED_MEDIA_PLAYBACK_LIMITS.CID_CHARS,
  );

  if (
    assetKind !== detail.assetKind ||
    canonicalCrabUrl !==
      detail.canonicalCrabUrl ||
    cid !== detail.cid
  ) {
    return reject(
      TV_VERIFIED_MEDIA_PLAYBACK_CODE.IDENTIFIER_MISMATCH,
      'Verified media facts did not match the active Library identifiers.',
    );
  }

  const playbackKind =
    playbackKindFor(assetKind);

  const contentType = boundedText(
    mediaFacts.contentType,
    '',
    TV_VERIFIED_MEDIA_PLAYBACK_LIMITS.CONTENT_TYPE_CHARS,
  ).toLowerCase();

  if (
    !playbackKind ||
    !contentTypeMatches(
      playbackKind,
      contentType,
    )
  ) {
    return reject(
      TV_VERIFIED_MEDIA_PLAYBACK_CODE.CONTENT_TYPE_MISMATCH,
      'The verified media content type did not match the selected asset kind.',
    );
  }

  const verificationPosture = boundedText(
    mediaFacts.verificationPosture,
    '',
    64,
  );

  const sourceMode =
    boundedText(
      mediaFacts.sourceMode,
      '',
      64,
    );

  if (
    !sourcePostureMatches(
      verificationPosture,
      sourceMode,
    )
  ) {
    return reject(
      TV_VERIFIED_MEDIA_PLAYBACK_CODE.SOURCE_POSTURE_MISMATCH,
      'The verified media source mode did not match its verification posture.',
    );
  }

  const {
    contentLength,
    maxPlaybackBytes,
  } = mediaFacts;

  if (
    !positiveSafeInteger(contentLength) ||
    !positiveSafeInteger(maxPlaybackBytes)
  ) {
    return reject(
      TV_VERIFIED_MEDIA_PLAYBACK_CODE.CONTENT_LENGTH_INVALID,
      'Verified media length and playback ceiling must be positive safe integers.',
    );
  }

  if (
    contentLength >
    maxPlaybackBytes
  ) {
    return reject(
      TV_VERIFIED_MEDIA_PLAYBACK_CODE.CONTENT_LENGTH_LIMIT,
      'Verified media length exceeded the configured playback ceiling.',
    );
  }

  const fullByteVerified =
    verificationPosture ===
    TV_VERIFIED_MEDIA_VERIFICATION_POSTURE.LOCAL_FULL_BYTE;

  const backendServicePathVerified =
    verificationPosture ===
    TV_VERIFIED_MEDIA_VERIFICATION_POSTURE.BACKEND_SERVICE_PATH;

  return freeze({
    state:
      TV_VERIFIED_MEDIA_PLAYBACK_STATE.READY,
    ready: true,
    sourceAttached: false,
    playbackKind,
    assetKind,
    canonicalCrabUrl,
    cid,
    contentType,
    contentLength,
    maxPlaybackBytes,
    verificationPosture,
    sourceMode,
    fullByteVerified,
    backendServicePathVerified,
    streaming:
      sourceMode ===
      TV_VERIFIED_MEDIA_SOURCE_MODE.GATEWAY_STREAM,
    verificationLabel:
      fullByteVerified
        ? 'Full B3 bytes verified on this device.'
        : 'B3 manifest and gateway service path verified; full local byte verification is incomplete.',
    code:
      TV_VERIFIED_MEDIA_PLAYBACK_CODE.READY,
    message:
      'Verified media facts are ready for a separate reviewed source handoff.',
  });
}
