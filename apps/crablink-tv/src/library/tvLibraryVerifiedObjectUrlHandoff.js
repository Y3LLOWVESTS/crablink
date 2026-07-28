/**
 * RO:WHAT — Creates and revokes verified Library object URLs behind one isolated handoff port.
 * RO:WHY — Phase 9M needs real browser byte handoff without letting React fetch, invoke, or own raw rendering.
 * RO:INTERACTS — tvLibraryVerifiedByteRenderLifecycleModel and future verified image/article surfaces.
 * RO:INVARIANTS — only ready verified lifecycle tickets can create object URLs; active URLs must be revocable.
 * RO:SECURITY — no fetch, invoke, storage, wallet, ledger, ROC, entitlement, finality, or React rendering authority.
 * RO:TEST — tvLibraryVerifiedObjectUrlHandoff.test.mjs and check-crablink-tv-library-verified-object-url-handoff-boundary.mjs.
 */

import {
  TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_LIMITS,
  TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_STATE,
  activateTvLibraryVerifiedByteRenderLifecycle,
  revokeTvLibraryVerifiedByteRenderLifecycle,
} from './tvLibraryVerifiedByteRenderLifecycleModel.js';

import {
  TV_LIBRARY_VERIFIED_RENDER_DISPLAY_KIND,
} from './tvLibraryVerifiedRenderDisplayModel.js';

export const TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_SCHEMA =
  'crablink.tv.library-verified-object-url-handoff.v1';

export const TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_STATE =
  Object.freeze({
    IDLE: 'idle',
    ACTIVE: 'active',
    REVOKED: 'revoked',
    REJECTED: 'rejected',
  });

export const TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_CODE =
  Object.freeze({
    IDLE: 'TV_LIBRARY_OBJECT_URL_HANDOFF_IDLE',
    ACTIVE: 'TV_LIBRARY_OBJECT_URL_HANDOFF_ACTIVE',
    REVOKED: 'TV_LIBRARY_OBJECT_URL_HANDOFF_REVOKED',
    NOT_READY: 'TV_LIBRARY_OBJECT_URL_HANDOFF_NOT_READY',
    EMPTY_BYTES: 'TV_LIBRARY_OBJECT_URL_HANDOFF_EMPTY_BYTES',
    OVERSIZED_BYTES: 'TV_LIBRARY_OBJECT_URL_HANDOFF_OVERSIZED_BYTES',
    LENGTH_MISMATCH: 'TV_LIBRARY_OBJECT_URL_HANDOFF_LENGTH_MISMATCH',
    CONTENT_TYPE_MISMATCH: 'TV_LIBRARY_OBJECT_URL_HANDOFF_CONTENT_TYPE_MISMATCH',
    UNSUPPORTED_DISPLAY: 'TV_LIBRARY_OBJECT_URL_HANDOFF_UNSUPPORTED_DISPLAY',
    PORT_UNAVAILABLE: 'TV_LIBRARY_OBJECT_URL_HANDOFF_PORT_UNAVAILABLE',
    CREATE_FAILED: 'TV_LIBRARY_OBJECT_URL_HANDOFF_CREATE_FAILED',
    REVOKE_FAILED: 'TV_LIBRARY_OBJECT_URL_HANDOFF_REVOKE_FAILED',
  });

const MESSAGE_LIMIT = 280;

function freeze(value) {
  return Object.freeze({
    schema:
      TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_SCHEMA,
    ...value,
  });
}

function boundedText(
  value,
  fallback,
  limit,
) {
  const text =
    typeof value === 'string'
      ? value.trim()
      : '';

  return (text || fallback).slice(
    0,
    limit,
  );
}

function rejectHandoff({
  code,
  message,
  lifecycleView,
} = {}) {
  return freeze({
    state:
      TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_STATE
        .REJECTED,
    active: false,
    revoked: false,
    revokeRequired: false,
    objectUrl: null,
    displayKind:
      lifecycleView?.displayKind ?? null,
    assetKind:
      lifecycleView?.assetKind ?? null,
    canonicalCrabUrl:
      lifecycleView?.canonicalCrabUrl ?? null,
    cid:
      lifecycleView?.cid ?? null,
    contentType:
      lifecycleView?.contentType ?? null,
    contentLength:
      lifecycleView?.contentLength ?? null,
    code:
      boundedText(
        code,
        TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_CODE
          .CREATE_FAILED,
        96,
      ),
    message:
      boundedText(
        message,
        'Verified object URL handoff rejected the current byte render request.',
        MESSAGE_LIMIT,
      ),
  });
}

export function createIdleTvLibraryVerifiedObjectUrlHandoff(
  {
    message =
      'Verified object URL handoff is waiting for a ready byte-render lifecycle.',
  } = {},
) {
  return freeze({
    state:
      TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_STATE.IDLE,
    active: false,
    revoked: false,
    revokeRequired: false,
    objectUrl: null,
    displayKind: null,
    assetKind: null,
    canonicalCrabUrl: null,
    cid: null,
    contentType: null,
    contentLength: null,
    code:
      TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_CODE.IDLE,
    message:
      boundedText(
        message,
        'Verified object URL handoff is waiting for a ready byte-render lifecycle.',
        MESSAGE_LIMIT,
      ),
  });
}

function byteLengthOf(assetBytes) {
  if (
    assetBytes instanceof ArrayBuffer
  ) {
    return assetBytes.byteLength;
  }

  if (
    ArrayBuffer.isView(assetBytes)
  ) {
    return assetBytes.byteLength;
  }

  return -1;
}

function contentTypeMatchesDisplay(
  lifecycleView,
) {
  const contentType =
    String(
      lifecycleView?.contentType ?? '',
    ).toLowerCase();

  if (
    lifecycleView?.displayKind ===
    TV_LIBRARY_VERIFIED_RENDER_DISPLAY_KIND
      .IMAGE_FRAME
  ) {
    return contentType.startsWith('image/');
  }

  if (
    lifecycleView?.displayKind ===
    TV_LIBRARY_VERIFIED_RENDER_DISPLAY_KIND
      .ARTICLE_READER
  ) {
    return (
      contentType.startsWith('text/') ||
      contentType === 'application/json' ||
      contentType.endsWith('+json')
    );
  }

  return false;
}

function validateReadyBytes({
  lifecycleView,
  assetBytes,
}) {
  if (
    lifecycleView?.state !==
      TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_STATE
        .READY ||
    lifecycleView.ready !== true
  ) {
    return rejectHandoff({
      lifecycleView,
      code:
        TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_CODE
          .NOT_READY,
      message:
        'Object URL handoff requires a ready verified byte-render lifecycle.',
    });
  }

  if (!contentTypeMatchesDisplay(lifecycleView)) {
    return rejectHandoff({
      lifecycleView,
      code:
        TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_CODE
          .UNSUPPORTED_DISPLAY,
      message:
        'Object URL handoff supports only verified image and article content types.',
    });
  }

  const byteLength =
    byteLengthOf(assetBytes);

  if (byteLength <= 0) {
    return rejectHandoff({
      lifecycleView,
      code:
        TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_CODE
          .EMPTY_BYTES,
      message:
        'Object URL handoff requires non-empty verified bytes.',
    });
  }

  if (
    byteLength >
    TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_LIMITS
      .MAX_VISIBLE_LENGTH
  ) {
    return rejectHandoff({
      lifecycleView,
      code:
        TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_CODE
          .OVERSIZED_BYTES,
      message:
        'Object URL handoff rejected bytes above the visible asset limit.',
    });
  }

  if (
    Number.isSafeInteger(
      lifecycleView.contentLength,
    ) &&
    lifecycleView.contentLength > 0 &&
    lifecycleView.contentLength !== byteLength
  ) {
    return rejectHandoff({
      lifecycleView,
      code:
        TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_CODE
          .LENGTH_MISMATCH,
      message:
        'Object URL handoff rejected bytes whose length no longer matches verified display facts.',
    });
  }

  return null;
}

function requirePort(
  objectUrlPort,
  lifecycleView,
) {
  if (
    !objectUrlPort ||
    typeof objectUrlPort.createObjectUrl !== 'function' ||
    typeof objectUrlPort.revokeObjectUrl !== 'function'
  ) {
    return rejectHandoff({
      lifecycleView,
      code:
        TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_CODE
          .PORT_UNAVAILABLE,
      message:
        'Object URL handoff requires an explicit create/revoke port.',
    });
  }

  return null;
}

function handoffFromLifecycle(
  lifecycleView,
  {
    state,
    code,
    message,
  },
) {
  return freeze({
    state,
    active:
      state ===
      TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_STATE.ACTIVE,
    revoked:
      state ===
      TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_STATE.REVOKED,
    revokeRequired:
      lifecycleView?.revokeRequired === true,
    objectUrl:
      lifecycleView?.objectUrl ?? null,
    displayKind:
      lifecycleView?.displayKind ?? null,
    assetKind:
      lifecycleView?.assetKind ?? null,
    canonicalCrabUrl:
      lifecycleView?.canonicalCrabUrl ?? null,
    cid:
      lifecycleView?.cid ?? null,
    contentType:
      lifecycleView?.contentType ?? null,
    contentLength:
      lifecycleView?.contentLength ?? null,
    code,
    message:
      boundedText(
        message,
        'Verified object URL handoff state changed.',
        MESSAGE_LIMIT,
      ),
  });
}

export function openTvLibraryVerifiedObjectUrlHandoff(
  {
    lifecycleView,
    assetBytes,
    objectUrlPort,
  } = {},
) {
  const bytesProblem =
    validateReadyBytes({
      lifecycleView,
      assetBytes,
    });

  if (bytesProblem) {
    return bytesProblem;
  }

  const portProblem =
    requirePort(
      objectUrlPort,
      lifecycleView,
    );

  if (portProblem) {
    return portProblem;
  }

  let objectUrl;

  try {
    objectUrl =
      objectUrlPort.createObjectUrl({
        assetBytes,
        contentType:
          lifecycleView.contentType,
        displayKind:
          lifecycleView.displayKind,
        canonicalCrabUrl:
          lifecycleView.canonicalCrabUrl,
        cid:
          lifecycleView.cid,
      });
  } catch {
    return rejectHandoff({
      lifecycleView,
      code:
        TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_CODE
          .CREATE_FAILED,
      message:
        'Object URL handoff failed to create a browser object URL.',
    });
  }

  const activeLifecycle =
    activateTvLibraryVerifiedByteRenderLifecycle({
      lifecycleView,
      objectUrl,
    });

  if (
    activeLifecycle.state !==
    TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_STATE
      .ACTIVE
  ) {
    return rejectHandoff({
      lifecycleView,
      code:
        TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_CODE
          .CREATE_FAILED,
      message:
        activeLifecycle.message,
    });
  }

  return handoffFromLifecycle(
    activeLifecycle,
    {
      state:
        TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_STATE
          .ACTIVE,
      code:
        TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_CODE
          .ACTIVE,
      message:
        'Verified object URL is active and must be revoked before replacement.',
    },
  );
}

export function revokeTvLibraryVerifiedObjectUrlHandoff(
  {
    handoffView,
    objectUrlPort,
  } = {},
) {
  if (
    handoffView?.state !==
      TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_STATE
        .ACTIVE ||
    handoffView.revokeRequired !== true ||
    typeof handoffView.objectUrl !== 'string'
  ) {
    return createIdleTvLibraryVerifiedObjectUrlHandoff({
      message:
        'No active verified object URL needed revocation.',
    });
  }

  if (
    !objectUrlPort ||
    typeof objectUrlPort.revokeObjectUrl !== 'function'
  ) {
    return rejectHandoff({
      lifecycleView:
        handoffView,
      code:
        TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_CODE
          .PORT_UNAVAILABLE,
      message:
        'Object URL revocation requires an explicit revoke port.',
    });
  }

  try {
    objectUrlPort.revokeObjectUrl(
      handoffView.objectUrl,
    );
  } catch {
    return rejectHandoff({
      lifecycleView:
        handoffView,
      code:
        TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_CODE
          .REVOKE_FAILED,
      message:
        'Object URL handoff failed to revoke the active browser object URL.',
    });
  }

  const revokedLifecycle =
    revokeTvLibraryVerifiedByteRenderLifecycle({
      lifecycleView:
        handoffView,
    });

  return handoffFromLifecycle(
    revokedLifecycle,
    {
      state:
        TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_STATE
          .REVOKED,
      code:
        TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_CODE
          .REVOKED,
      message:
        'Verified object URL was revoked and cleared from active handoff state.',
    },
  );
}

export function replaceTvLibraryVerifiedObjectUrlHandoff(
  {
    currentHandoffView,
    nextLifecycleView,
    assetBytes,
    objectUrlPort,
  } = {},
) {
  const revokeView =
    revokeTvLibraryVerifiedObjectUrlHandoff({
      handoffView:
        currentHandoffView,
      objectUrlPort,
    });

  if (
    revokeView.state ===
    TV_LIBRARY_VERIFIED_OBJECT_URL_HANDOFF_STATE
      .REJECTED
  ) {
    return revokeView;
  }

  return openTvLibraryVerifiedObjectUrlHandoff({
    lifecycleView:
      nextLifecycleView,
    assetBytes,
    objectUrlPort,
  });
}

export function createBrowserTvLibraryVerifiedObjectUrlPort(
  {
    urlApi = globalThis.URL,
    BlobCtor = globalThis.Blob,
  } = {},
) {
  return Object.freeze({
    createObjectUrl({
      assetBytes,
      contentType,
    } = {}) {
      if (
        !urlApi ||
        typeof urlApi.createObjectURL !== 'function' ||
        typeof BlobCtor !== 'function'
      ) {
        throw new TypeError(
          'Browser object URL APIs are unavailable.',
        );
      }

      const blob =
        new BlobCtor(
          [assetBytes],
          {
            type:
              boundedText(
                contentType,
                'application/octet-stream',
                TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_LIMITS
                  .CONTENT_TYPE_CHARS,
              ),
          },
        );

      return urlApi.createObjectURL(blob);
    },

    revokeObjectUrl(objectUrl) {
      if (
        !urlApi ||
        typeof urlApi.revokeObjectURL !== 'function'
      ) {
        throw new TypeError(
          'Browser object URL revoke API is unavailable.',
        );
      }

      urlApi.revokeObjectURL(objectUrl);
    },
  });
}
