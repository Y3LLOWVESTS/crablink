/**
 * RO:WHAT — Executes verified image object URL rendering from a ready byte lifecycle.
 * RO:WHY — Phase 9O composes lifecycle, object URL handoff, and image surface without adding authority to React.
 * RO:INTERACTS — tvLibraryVerifiedByteRenderLifecycleModel, tvLibraryVerifiedObjectUrlHandoff, image render surface.
 * RO:INVARIANTS — only ready verified image bytes become active render views; stale active URLs revoke before replacement.
 * RO:SECURITY — no fetch, invoke, Blob construction, URL creation/revocation, storage, or economic authority.
 * RO:TEST — tvLibraryVerifiedImageObjectUrlExecution.test.mjs and Phase 9O boundary.
 */

import {
  TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_STATE,
  openTvLibraryVerifiedObjectUrlHandoff,
  replaceTvLibraryVerifiedObjectUrlHandoff,
  revokeTvLibraryVerifiedObjectUrlHandoff,
} from './tvLibraryVerifiedObjectUrlHandoff.js';

import {
  TV_LIBRARY_VERIFIED_IMAGE_RENDER_SURFACE_STATE,
  createIdleTvLibraryVerifiedImageRenderSurface,
  projectTvLibraryVerifiedImageRenderSurface,
} from './tvLibraryVerifiedImageRenderSurfaceModel.js';

export const TV_LIBRARY_VERIFIED_IMAGE_OBJECT_URL_EXECUTION_SCHEMA =
  'crablink.tv.library-verified-image-object-url-execution.v1';

export const TV_LIBRARY_VERIFIED_IMAGE_OBJECT_URL_EXECUTION_STATE =
  Object.freeze({
    IDLE: 'idle',
    READY: 'ready',
    REJECTED: 'rejected',
    REVOKED: 'revoked',
  });

export const TV_LIBRARY_VERIFIED_IMAGE_OBJECT_URL_EXECUTION_CODE =
  Object.freeze({
    IDLE: 'TV_LIBRARY_IMAGE_OBJECT_URL_EXECUTION_IDLE',
    READY: 'TV_LIBRARY_IMAGE_OBJECT_URL_EXECUTION_READY',
    REVOKED: 'TV_LIBRARY_IMAGE_OBJECT_URL_EXECUTION_REVOKED',
    HANDOFF_REJECTED: 'TV_LIBRARY_IMAGE_OBJECT_URL_EXECUTION_HANDOFF_REJECTED',
    SURFACE_REJECTED: 'TV_LIBRARY_IMAGE_OBJECT_URL_EXECUTION_SURFACE_REJECTED',
  });

const MESSAGE_LIMIT = 260;

function freeze(value) {
  return Object.freeze({
    schema:
      TV_LIBRARY_VERIFIED_IMAGE_OBJECT_URL_EXECUTION_SCHEMA,
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

function executionView({
  state,
  code,
  message,
  objectUrlHandoffView,
  imageRenderSurfaceView,
}) {
  const imageView =
    imageRenderSurfaceView ??
    createIdleTvLibraryVerifiedImageRenderSurface();

  const handoffView =
    objectUrlHandoffView ?? null;

  return freeze({
    state,
    ready:
      state ===
        TV_LIBRARY_VERIFIED_IMAGE_OBJECT_URL_EXECUTION_STATE.READY &&
      imageView.state ===
        TV_LIBRARY_VERIFIED_IMAGE_RENDER_SURFACE_STATE.READY,
    active:
      handoffView?.state ===
      TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_STATE.ACTIVE,
    revoked:
      state ===
        TV_LIBRARY_VERIFIED_IMAGE_OBJECT_URL_EXECUTION_STATE.REVOKED ||
      handoffView?.state ===
        TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_STATE.REVOKED,
    revokeRequired:
      handoffView?.revokeRequired === true,
    objectUrlHandoffView:
      handoffView,
    imageRenderSurfaceView:
      imageView,
    objectUrl:
      imageView?.objectUrl ?? null,
    canonicalCrabUrl:
      imageView?.canonicalCrabUrl ??
      handoffView?.canonicalCrabUrl ??
      null,
    cid:
      imageView?.cid ??
      handoffView?.cid ??
      null,
    contentType:
      imageView?.contentType ??
      handoffView?.contentType ??
      null,
    contentLength:
      imageView?.contentLength ??
      handoffView?.contentLength ??
      null,
    code:
      boundedText(
        code,
        TV_LIBRARY_VERIFIED_IMAGE_OBJECT_URL_EXECUTION_CODE.IDLE,
        96,
      ),
    message:
      boundedText(
        message,
        'Verified image object URL execution is waiting.',
        MESSAGE_LIMIT,
      ),
  });
}

function rejectedExecution({
  code =
    TV_LIBRARY_VERIFIED_IMAGE_OBJECT_URL_EXECUTION_CODE
      .HANDOFF_REJECTED,
  message,
  objectUrlHandoffView,
  imageRenderSurfaceView,
}) {
  return executionView({
    state:
      TV_LIBRARY_VERIFIED_IMAGE_OBJECT_URL_EXECUTION_STATE.REJECTED,
    code,
    message:
      message ??
      'Verified image object URL execution rejected the current render request.',
    objectUrlHandoffView,
    imageRenderSurfaceView:
      imageRenderSurfaceView ??
      createIdleTvLibraryVerifiedImageRenderSurface({
        message:
          'Verified image surface is waiting for an accepted object URL handoff.',
      }),
  });
}

export function createIdleTvLibraryVerifiedImageObjectUrlExecution(
  {
    message =
      'Verified image object URL execution is waiting for ready verified bytes.',
  } = {},
) {
  return executionView({
    state:
      TV_LIBRARY_VERIFIED_IMAGE_OBJECT_URL_EXECUTION_STATE.IDLE,
    code:
      TV_LIBRARY_VERIFIED_IMAGE_OBJECT_URL_EXECUTION_CODE.IDLE,
    message,
    objectUrlHandoffView: null,
    imageRenderSurfaceView:
      createIdleTvLibraryVerifiedImageRenderSurface({
        message,
      }),
  });
}

export function executeTvLibraryVerifiedImageObjectUrl(
  {
    currentExecutionView,
    currentObjectUrlHandoffView,
    lifecycleView,
    assetBytes,
    objectUrlPort,
  } = {},
) {
  const existingHandoff =
    currentObjectUrlHandoffView ??
    currentExecutionView?.objectUrlHandoffView ??
    null;

  const nextHandoff =
    existingHandoff?.state ===
      TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_STATE.ACTIVE
      ? replaceTvLibraryVerifiedObjectUrlHandoff({
          currentHandoffView:
            existingHandoff,
          nextLifecycleView:
            lifecycleView,
          assetBytes,
          objectUrlPort,
        })
      : openTvLibraryVerifiedObjectUrlHandoff({
          lifecycleView,
          assetBytes,
          objectUrlPort,
        });

  if (
    nextHandoff.state ===
    TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_STATE.REJECTED
  ) {
    return rejectedExecution({
      objectUrlHandoffView:
        nextHandoff,
      code:
        TV_LIBRARY_VERIFIED_IMAGE_OBJECT_URL_EXECUTION_CODE
          .HANDOFF_REJECTED,
      message:
        nextHandoff.message,
    });
  }

  const imageRenderSurfaceView =
    projectTvLibraryVerifiedImageRenderSurface({
      objectUrlHandoffView:
        nextHandoff,
    });

  if (
    imageRenderSurfaceView.state !==
    TV_LIBRARY_VERIFIED_IMAGE_RENDER_SURFACE_STATE.READY
  ) {
    return rejectedExecution({
      objectUrlHandoffView:
        nextHandoff,
      imageRenderSurfaceView,
      code:
        TV_LIBRARY_VERIFIED_IMAGE_OBJECT_URL_EXECUTION_CODE
          .SURFACE_REJECTED,
      message:
        imageRenderSurfaceView.message,
    });
  }

  return executionView({
    state:
      TV_LIBRARY_VERIFIED_IMAGE_OBJECT_URL_EXECUTION_STATE.READY,
    code:
      TV_LIBRARY_VERIFIED_IMAGE_OBJECT_URL_EXECUTION_CODE.READY,
    message:
      'Verified image object URL execution produced a ready TV image surface.',
    objectUrlHandoffView:
      nextHandoff,
    imageRenderSurfaceView,
  });
}

export function revokeTvLibraryVerifiedImageObjectUrlExecution(
  {
    executionView:
      currentExecutionView,
    objectUrlHandoffView,
    objectUrlPort,
  } = {},
) {
  const currentHandoff =
    objectUrlHandoffView ??
    currentExecutionView?.objectUrlHandoffView ??
    null;

  const revokedHandoff =
    revokeTvLibraryVerifiedObjectUrlHandoff({
      handoffView:
        currentHandoff,
      objectUrlPort,
    });

  if (
    revokedHandoff.state ===
    TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_STATE.REJECTED
  ) {
    return rejectedExecution({
      objectUrlHandoffView:
        revokedHandoff,
      code:
        TV_LIBRARY_VERIFIED_IMAGE_OBJECT_URL_EXECUTION_CODE
          .HANDOFF_REJECTED,
      message:
        revokedHandoff.message,
    });
  }

  return executionView({
    state:
      revokedHandoff.state ===
        TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_STATE.REVOKED
        ? TV_LIBRARY_VERIFIED_IMAGE_OBJECT_URL_EXECUTION_STATE.REVOKED
        : TV_LIBRARY_VERIFIED_IMAGE_OBJECT_URL_EXECUTION_STATE.IDLE,
    code:
      revokedHandoff.state ===
        TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_STATE.REVOKED
        ? TV_LIBRARY_VERIFIED_IMAGE_OBJECT_URL_EXECUTION_CODE.REVOKED
        : TV_LIBRARY_VERIFIED_IMAGE_OBJECT_URL_EXECUTION_CODE.IDLE,
    message:
      revokedHandoff.state ===
        TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_STATE.REVOKED
        ? 'Verified image object URL execution revoked the active image URL.'
        : 'No active verified image object URL execution needed revocation.',
    objectUrlHandoffView:
      revokedHandoff,
    imageRenderSurfaceView:
      createIdleTvLibraryVerifiedImageRenderSurface({
        message:
          'Verified image surface cleared after object URL revocation.',
      }),
  });
}
