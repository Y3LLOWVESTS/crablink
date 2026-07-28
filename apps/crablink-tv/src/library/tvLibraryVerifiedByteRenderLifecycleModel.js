/**
 * RO:WHAT — Models verified byte-render lifecycle state for CrabLink TV Library assets.
 * RO:WHY — Real object URL rendering must be identifier-bound, explicit, and revocable.
 * RO:INTERACTS — tvLibraryAssetDetailModel and tvLibraryVerifiedRenderDisplayModel.
 * RO:INVARIANTS — lifecycle tickets require verified display facts matching the active Library detail.
 * RO:SECURITY — no fetch, invoke, Blob construction, URL.createObjectURL, src rendering, storage, wallet, ledger, ROC, entitlement, or finality authority.
 * RO:TEST — tvLibraryVerifiedByteRenderLifecycleModel.test.mjs and check-crablink-tv-library-verified-byte-render-lifecycle-boundary.mjs.
 */

import {
  TV_LIBRARY_ASSET_DETAIL_KIND,
} from './tvLibraryAssetDetailModel.js';

import {
  TV_LIBRARY_VERIFIED_RENDER_DISPLAY_KIND,
  TV_LIBRARY_VERIFIED_RENDER_DISPLAY_STATE,
} from './tvLibraryVerifiedRenderDisplayModel.js';

export const TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_SCHEMA =
  'crablink.tv.library-verified-byte-render-lifecycle.v1';

export const TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_STATE =
  Object.freeze({
    IDLE: 'idle',
    READY: 'ready',
    ACTIVE: 'active',
    REVOKED: 'revoked',
    REJECTED: 'rejected',
  });

export const TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_CODE =
  Object.freeze({
    IDLE: 'TV_LIBRARY_BYTE_RENDER_IDLE',
    READY: 'TV_LIBRARY_BYTE_RENDER_READY',
    ACTIVE: 'TV_LIBRARY_BYTE_RENDER_ACTIVE',
    REVOKED: 'TV_LIBRARY_BYTE_RENDER_REVOKED',
    MISMATCH: 'TV_LIBRARY_BYTE_RENDER_MISMATCH',
    NOT_VERIFIED: 'TV_LIBRARY_BYTE_RENDER_NOT_VERIFIED',
    UNSUPPORTED: 'TV_LIBRARY_BYTE_RENDER_UNSUPPORTED',
    INVALID_OBJECT_URL: 'TV_LIBRARY_BYTE_RENDER_INVALID_OBJECT_URL',
  });

export const TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_LIMITS =
  Object.freeze({
    ROUTE_CHARS: 192,
    CID_CHARS: 67,
    ASSET_KIND_CHARS: 32,
    CONTENT_TYPE_CHARS: 96,
    OBJECT_URL_CHARS: 512,
    MESSAGE_CHARS: 280,
    MAX_VISIBLE_LENGTH: 4_194_304,
  });

const SUPPORTED_DISPLAY_KINDS =
  Object.freeze(
    new Set([
      TV_LIBRARY_VERIFIED_RENDER_DISPLAY_KIND.IMAGE_FRAME,
      TV_LIBRARY_VERIFIED_RENDER_DISPLAY_KIND.ARTICLE_READER,
    ]),
  );

function freeze(value) {
  return Object.freeze({
    schema:
      TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_SCHEMA,
    ...value,
  });
}

function boundedText(
  value,
  fallback,
  maxLength,
) {
  const text =
    typeof value === 'string'
      ? value.trim()
      : '';

  return (text || fallback).slice(
    0,
    maxLength,
  );
}

function boundedLength(value) {
  const number =
    Number.isSafeInteger(value) && value >= 0
      ? value
      : 0;

  return Math.min(
    number,
    TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_LIMITS
      .MAX_VISIBLE_LENGTH,
  );
}

function activeDetailIdentity(detailView) {
  if (
    detailView?.kind !==
    TV_LIBRARY_ASSET_DETAIL_KIND.READY
  ) {
    return null;
  }

  const assetKind =
    boundedText(
      detailView.assetKind,
      '',
      TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_LIMITS
        .ASSET_KIND_CHARS,
    );

  const canonicalCrabUrl =
    boundedText(
      detailView.canonicalCrabUrl,
      '',
      TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_LIMITS
        .ROUTE_CHARS,
    );

  const cid =
    boundedText(
      detailView.cid,
      '',
      TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_LIMITS
        .CID_CHARS,
    );

  if (
    !assetKind ||
    !canonicalCrabUrl ||
    !cid
  ) {
    return null;
  }

  return Object.freeze({
    assetKind,
    canonicalCrabUrl,
    cid,
  });
}

function rejectedLifecycle({
  code,
  message,
} = {}) {
  return freeze({
    state:
      TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_STATE
        .REJECTED,

    ready: false,
    active: false,
    revoked: false,
    revokeRequired: false,
    displayKind: null,
    assetKind: null,
    canonicalCrabUrl: null,
    cid: null,
    contentType: null,
    contentLength: null,
    objectUrl: null,

    code:
      boundedText(
        code,
        TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_CODE
          .MISMATCH,
        96,
      ),

    message:
      boundedText(
        message,
        'Verified byte render lifecycle rejected the current asset state.',
        TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_LIMITS
          .MESSAGE_CHARS,
      ),
  });
}

export function createIdleTvLibraryVerifiedByteRenderLifecycle(
  {
    message =
      'Verified byte rendering is waiting for a verified display result.',
  } = {},
) {
  return freeze({
    state:
      TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_STATE
        .IDLE,

    ready: false,
    active: false,
    revoked: false,
    revokeRequired: false,
    displayKind: null,
    assetKind: null,
    canonicalCrabUrl: null,
    cid: null,
    contentType: null,
    contentLength: null,
    objectUrl: null,

    code:
      TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_CODE
        .IDLE,

    message:
      boundedText(
        message,
        'Verified byte rendering is waiting for a verified display result.',
        TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_LIMITS
          .MESSAGE_CHARS,
      ),
  });
}

export function prepareTvLibraryVerifiedByteRenderLifecycle(
  {
    detailView,
    verifiedRenderDisplayView,
  } = {},
) {
  const detail =
    activeDetailIdentity(detailView);

  if (!detail) {
    return createIdleTvLibraryVerifiedByteRenderLifecycle({
      message:
        'Select a reviewed Library asset before preparing byte rendering.',
    });
  }

  if (
    verifiedRenderDisplayView?.state !==
      TV_LIBRARY_VERIFIED_RENDER_DISPLAY_STATE.READY ||
    verifiedRenderDisplayView.ready !== true
  ) {
    return rejectedLifecycle({
      code:
        TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_CODE
          .NOT_VERIFIED,

      message:
        'Byte rendering requires a verified display-ready result.',
    });
  }

  if (
    !SUPPORTED_DISPLAY_KINDS.has(
      verifiedRenderDisplayView.displayKind,
    )
  ) {
    return rejectedLifecycle({
      code:
        TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_CODE
          .UNSUPPORTED,

      message:
        'Byte rendering supports only verified image and article display kinds.',
    });
  }

  if (
    verifiedRenderDisplayView.assetKind !==
      detail.assetKind ||
    verifiedRenderDisplayView.canonicalCrabUrl !==
      detail.canonicalCrabUrl ||
    verifiedRenderDisplayView.cid !== detail.cid
  ) {
    return rejectedLifecycle({
      code:
        TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_CODE
          .MISMATCH,

      message:
        'Verified byte render lifecycle rejected stale or mismatched display identifiers.',
    });
  }

  return freeze({
    state:
      TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_STATE
        .READY,

    ready: true,
    active: false,
    revoked: false,
    revokeRequired: false,
    displayKind:
      verifiedRenderDisplayView.displayKind,
    assetKind:
      detail.assetKind,
    canonicalCrabUrl:
      detail.canonicalCrabUrl,
    cid:
      detail.cid,
    contentType:
      boundedText(
        verifiedRenderDisplayView.contentType,
        'application/octet-stream',
        TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_LIMITS
          .CONTENT_TYPE_CHARS,
      ),
    contentLength:
      boundedLength(
        verifiedRenderDisplayView.contentLength,
      ),
    objectUrl: null,

    code:
      TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_CODE
        .READY,

    message:
      'Verified byte render lifecycle is ready for a reviewed object URL handoff.',
  });
}

function validBlobUrl(value) {
  return (
    typeof value === 'string' &&
    value.startsWith('blob:') &&
    value.length <=
      TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_LIMITS
        .OBJECT_URL_CHARS
  );
}

export function activateTvLibraryVerifiedByteRenderLifecycle(
  {
    lifecycleView,
    objectUrl,
  } = {},
) {
  if (
    lifecycleView?.state !==
    TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_STATE
      .READY
  ) {
    return rejectedLifecycle({
      code:
        TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_CODE
          .NOT_VERIFIED,

      message:
        'Only a ready verified byte render lifecycle can become active.',
    });
  }

  if (!validBlobUrl(objectUrl)) {
    return rejectedLifecycle({
      code:
        TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_CODE
          .INVALID_OBJECT_URL,

      message:
        'Verified byte render lifecycle requires a bounded blob object URL.',
    });
  }

  return freeze({
    ...lifecycleView,

    state:
      TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_STATE
        .ACTIVE,

    ready: true,
    active: true,
    revoked: false,
    revokeRequired: true,
    objectUrl:
      boundedText(
        objectUrl,
        '',
        TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_LIMITS
          .OBJECT_URL_CHARS,
      ),

    code:
      TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_CODE
        .ACTIVE,

    message:
      'Verified byte render object URL is active and must be revoked on replacement.',
  });
}

export function revokeTvLibraryVerifiedByteRenderLifecycle(
  {
    lifecycleView,
  } = {},
) {
  if (
    lifecycleView?.state !==
    TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_STATE
      .ACTIVE
  ) {
    return createIdleTvLibraryVerifiedByteRenderLifecycle({
      message:
        'No active verified byte render object URL needed revocation.',
    });
  }

  return freeze({
    ...lifecycleView,

    state:
      TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_STATE
        .REVOKED,

    ready: false,
    active: false,
    revoked: true,
    revokeRequired: false,
    objectUrl: null,

    code:
      TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_CODE
        .REVOKED,

    message:
      'Verified byte render object URL was cleared from the lifecycle model.',
  });
}

export function shouldRevokeTvLibraryVerifiedByteRenderLifecycle(
  {
    lifecycleView,
    detailView,
  } = {},
) {
  if (
    lifecycleView?.state !==
      TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_STATE
        .ACTIVE ||
    lifecycleView.revokeRequired !== true
  ) {
    return false;
  }

  const detail =
    activeDetailIdentity(detailView);

  if (!detail) {
    return true;
  }

  return (
    lifecycleView.assetKind !== detail.assetKind ||
    lifecycleView.canonicalCrabUrl !==
      detail.canonicalCrabUrl ||
    lifecycleView.cid !== detail.cid
  );
}
