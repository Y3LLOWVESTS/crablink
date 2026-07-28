/**
 * RO:WHAT — Projects a verified image render surface from an active object URL handoff.
 * RO:WHY — Phase 9N needs a bounded image-view contract before execution wiring opens real URLs.
 * RO:INTERACTS — tvLibraryVerifiedObjectUrlHandoff and TvLibraryVerifiedImageRenderSurface.
 * RO:INVARIANTS — only active blob object URLs for verified image content become renderable.
 * RO:SECURITY — no fetch, invoke, Blob construction, URL creation/revocation, storage, or economic authority.
 * RO:TEST — tvLibraryVerifiedImageRenderSurfaceModel.test.mjs and Phase 9N boundary.
 */

import {
  TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_SCHEMA,
  TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_STATE,
} from './tvLibraryVerifiedObjectUrlHandoff.js';

export const TV_LIBRARY_VERIFIED_IMAGE_RENDER_SURFACE_SCHEMA =
  'crablink.tv.library-verified-image-render-surface.v1';

export const TV_LIBRARY_VERIFIED_IMAGE_RENDER_SURFACE_STATE =
  Object.freeze({
    IDLE: 'idle',
    READY: 'ready',
    REJECTED: 'rejected',
  });

export const TV_LIBRARY_VERIFIED_IMAGE_RENDER_SURFACE_CODE =
  Object.freeze({
    IDLE: 'TV_LIBRARY_IMAGE_RENDER_SURFACE_IDLE',
    READY: 'TV_LIBRARY_IMAGE_RENDER_SURFACE_READY',
    NOT_ACTIVE: 'TV_LIBRARY_IMAGE_RENDER_SURFACE_NOT_ACTIVE',
    NOT_IMAGE: 'TV_LIBRARY_IMAGE_RENDER_SURFACE_NOT_IMAGE',
    INVALID_OBJECT_URL: 'TV_LIBRARY_IMAGE_RENDER_SURFACE_INVALID_OBJECT_URL',
    MISSING_IDENTIFIER: 'TV_LIBRARY_IMAGE_RENDER_SURFACE_MISSING_IDENTIFIER',
  });

export const TV_LIBRARY_VERIFIED_IMAGE_RENDER_SURFACE_LIMITS =
  Object.freeze({
    ROUTE_CHARS: 192,
    CID_CHARS: 67,
    CONTENT_TYPE_CHARS: 96,
    MESSAGE_CHARS: 240,
  });

function freeze(value) {
  return Object.freeze({
    schema:
      TV_LIBRARY_VERIFIED_IMAGE_RENDER_SURFACE_SCHEMA,
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

function idleSurface(
  message =
    'Verified image rendering is waiting for an active object URL handoff.',
) {
  return freeze({
    state:
      TV_LIBRARY_VERIFIED_IMAGE_RENDER_SURFACE_STATE.IDLE,
    ready: false,
    objectUrl: null,
    assetKind: null,
    canonicalCrabUrl: null,
    cid: null,
    contentType: null,
    contentLength: null,
    altText:
      'Verified CrabLink image asset',
    code:
      TV_LIBRARY_VERIFIED_IMAGE_RENDER_SURFACE_CODE.IDLE,
    message:
      boundedText(
        message,
        'Verified image rendering is waiting for an active object URL handoff.',
        TV_LIBRARY_VERIFIED_IMAGE_RENDER_SURFACE_LIMITS.MESSAGE_CHARS,
      ),
  });
}

function rejectedSurface({
  code,
  message,
  handoffView,
}) {
  return freeze({
    state:
      TV_LIBRARY_VERIFIED_IMAGE_RENDER_SURFACE_STATE.REJECTED,
    ready: false,
    objectUrl: null,
    assetKind:
      handoffView?.assetKind ?? null,
    canonicalCrabUrl:
      handoffView?.canonicalCrabUrl ?? null,
    cid:
      handoffView?.cid ?? null,
    contentType:
      handoffView?.contentType ?? null,
    contentLength:
      handoffView?.contentLength ?? null,
    altText:
      'Verified CrabLink image asset',
    code:
      boundedText(
        code,
        TV_LIBRARY_VERIFIED_IMAGE_RENDER_SURFACE_CODE.NOT_ACTIVE,
        96,
      ),
    message:
      boundedText(
        message,
        'Verified image render surface rejected the current object URL handoff.',
        TV_LIBRARY_VERIFIED_IMAGE_RENDER_SURFACE_LIMITS.MESSAGE_CHARS,
      ),
  });
}

export function createIdleTvLibraryVerifiedImageRenderSurface(
  {
    message,
  } = {},
) {
  return idleSurface(message);
}

function safeIdentifier(value, limit) {
  return boundedText(
    value,
    '',
    limit,
  );
}

export function projectTvLibraryVerifiedImageRenderSurface(
  {
    objectUrlHandoffView,
  } = {},
) {
  if (!objectUrlHandoffView) {
    return idleSurface();
  }

  if (
    objectUrlHandoffView.schema !==
      TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_SCHEMA ||
    objectUrlHandoffView.state !==
      TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_STATE.ACTIVE ||
    objectUrlHandoffView.active !== true
  ) {
    return idleSurface(
      objectUrlHandoffView.message ??
        'Verified image rendering is waiting for an active object URL handoff.',
    );
  }

  const objectUrl =
    safeIdentifier(
      objectUrlHandoffView.objectUrl,
      256,
    );

  if (!objectUrl.startsWith('blob:')) {
    return rejectedSurface({
      handoffView:
        objectUrlHandoffView,
      code:
        TV_LIBRARY_VERIFIED_IMAGE_RENDER_SURFACE_CODE.INVALID_OBJECT_URL,
      message:
        'Verified image rendering requires a bounded blob object URL.',
    });
  }

  const contentType =
    safeIdentifier(
      objectUrlHandoffView.contentType,
      TV_LIBRARY_VERIFIED_IMAGE_RENDER_SURFACE_LIMITS.CONTENT_TYPE_CHARS,
    ).toLowerCase();

  if (!contentType.startsWith('image/')) {
    return rejectedSurface({
      handoffView:
        objectUrlHandoffView,
      code:
        TV_LIBRARY_VERIFIED_IMAGE_RENDER_SURFACE_CODE.NOT_IMAGE,
      message:
        'Verified image rendering requires an image content type.',
    });
  }

  const canonicalCrabUrl =
    safeIdentifier(
      objectUrlHandoffView.canonicalCrabUrl,
      TV_LIBRARY_VERIFIED_IMAGE_RENDER_SURFACE_LIMITS.ROUTE_CHARS,
    );

  const cid =
    safeIdentifier(
      objectUrlHandoffView.cid,
      TV_LIBRARY_VERIFIED_IMAGE_RENDER_SURFACE_LIMITS.CID_CHARS,
    );

  if (!canonicalCrabUrl || !cid) {
    return rejectedSurface({
      handoffView:
        objectUrlHandoffView,
      code:
        TV_LIBRARY_VERIFIED_IMAGE_RENDER_SURFACE_CODE.MISSING_IDENTIFIER,
      message:
        'Verified image rendering requires bound Library identifiers.',
    });
  }

  const assetKind =
    safeIdentifier(
      objectUrlHandoffView.assetKind,
      32,
    ) || 'image';

  return freeze({
    state:
      TV_LIBRARY_VERIFIED_IMAGE_RENDER_SURFACE_STATE.READY,
    ready: true,
    objectUrl,
    assetKind,
    canonicalCrabUrl,
    cid,
    contentType,
    contentLength:
      Number.isSafeInteger(
        objectUrlHandoffView.contentLength,
      )
        ? objectUrlHandoffView.contentLength
        : null,
    altText:
      `Verified CrabLink ${assetKind} asset ${cid}`,
    code:
      TV_LIBRARY_VERIFIED_IMAGE_RENDER_SURFACE_CODE.READY,
    message:
      'Verified image object URL is ready for the TV image surface.',
  });
}
