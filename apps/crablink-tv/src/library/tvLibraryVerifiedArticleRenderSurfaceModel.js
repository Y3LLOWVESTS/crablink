/**
 * RO:WHAT — Projects verified article/text bytes into a bounded TV article surface.
 * RO:WHY — Phase 9P completes the Library proof path for verified text/article assets without unsafe HTML.
 * RO:INTERACTS — tvLibraryVerifiedByteRenderLifecycleModel, tvLibraryVerifiedRenderDisplayModel, and article surface UI.
 * RO:INVARIANTS — only ready verified article lifecycles decode; content length and identifiers stay bound.
 * RO:SECURITY — no fetch, invoke, Blob construction, object URL authority, unsafe HTML injection, storage, or economic authority.
 * RO:TEST — tvLibraryVerifiedArticleRenderSurfaceModel.test.mjs and Phase 9P boundary.
 */

import {
  TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_LIMITS,
  TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_SCHEMA,
  TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_STATE,
} from './tvLibraryVerifiedByteRenderLifecycleModel.js';

import {
  TV_LIBRARY_VERIFIED_RENDER_DISPLAY_KIND,
} from './tvLibraryVerifiedRenderDisplayModel.js';

export const TV_LIBRARY_VERIFIED_ARTICLE_RENDER_SURFACE_SCHEMA =
  'crablink.tv.library-verified-article-render-surface.v1';

export const TV_LIBRARY_VERIFIED_ARTICLE_RENDER_SURFACE_STATE =
  Object.freeze({
    IDLE: 'idle',
    READY: 'ready',
    REJECTED: 'rejected',
  });

export const TV_LIBRARY_VERIFIED_ARTICLE_RENDER_SURFACE_CODE =
  Object.freeze({
    IDLE: 'TV_LIBRARY_ARTICLE_RENDER_SURFACE_IDLE',
    READY: 'TV_LIBRARY_ARTICLE_RENDER_SURFACE_READY',
    NOT_READY: 'TV_LIBRARY_ARTICLE_RENDER_SURFACE_NOT_READY',
    NOT_ARTICLE: 'TV_LIBRARY_ARTICLE_RENDER_SURFACE_NOT_ARTICLE',
    EMPTY_BYTES: 'TV_LIBRARY_ARTICLE_RENDER_SURFACE_EMPTY_BYTES',
    OVERSIZED_BYTES: 'TV_LIBRARY_ARTICLE_RENDER_SURFACE_OVERSIZED_BYTES',
    LENGTH_MISMATCH: 'TV_LIBRARY_ARTICLE_RENDER_SURFACE_LENGTH_MISMATCH',
    DECODE_FAILED: 'TV_LIBRARY_ARTICLE_RENDER_SURFACE_DECODE_FAILED',
    MISSING_IDENTIFIER: 'TV_LIBRARY_ARTICLE_RENDER_SURFACE_MISSING_IDENTIFIER',
  });

export const TV_LIBRARY_VERIFIED_ARTICLE_RENDER_SURFACE_LIMITS =
  Object.freeze({
    MESSAGE_CHARS: 260,
    CODE_CHARS: 96,
    ROUTE_CHARS: 192,
    CID_CHARS: 67,
    CONTENT_TYPE_CHARS: 96,
    TITLE_CHARS: 96,
    PARAGRAPH_CHARS: 560,
    MAX_PARAGRAPHS: 18,
    MAX_TEXT_BYTES: Math.min(
      262_144,
      TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_LIMITS.MAX_VISIBLE_LENGTH,
    ),
  });

function freeze(value) {
  return Object.freeze({
    schema:
      TV_LIBRARY_VERIFIED_ARTICLE_RENDER_SURFACE_SCHEMA,
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

function byteLengthOf(assetBytes) {
  if (assetBytes instanceof ArrayBuffer) {
    return assetBytes.byteLength;
  }

  if (ArrayBuffer.isView(assetBytes)) {
    return assetBytes.byteLength;
  }

  return -1;
}

function articleContentType(value) {
  const contentType =
    boundedText(
      value,
      '',
      TV_LIBRARY_VERIFIED_ARTICLE_RENDER_SURFACE_LIMITS.CONTENT_TYPE_CHARS,
    ).toLowerCase();

  return (
    contentType.startsWith('text/') ||
    contentType === 'application/json' ||
    contentType.endsWith('+json')
  );
}

function normalizeArticleText(value) {
  return String(value ?? '')
    .replace(/\r\n?/gu, '\n')
    .replace(
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/gu,
      ' ',
    )
    .trim();
}

function paragraphsFromText(value) {
  const normalized =
    normalizeArticleText(value);

  if (!normalized) {
    return [];
  }

  const blocks =
    normalized
      .split(/\n{2,}/u)
      .map((block) =>
        block
          .replace(/\s*\n\s*/gu, ' ')
          .replace(/\s{2,}/gu, ' ')
          .trim(),
      )
      .filter(Boolean);

  return blocks
    .slice(
      0,
      TV_LIBRARY_VERIFIED_ARTICLE_RENDER_SURFACE_LIMITS.MAX_PARAGRAPHS,
    )
    .map((block) =>
      block.slice(
        0,
        TV_LIBRARY_VERIFIED_ARTICLE_RENDER_SURFACE_LIMITS.PARAGRAPH_CHARS,
      ),
    );
}

function createDefaultTextDecoderPort() {
  return Object.freeze({
    decodeUtf8(assetBytes) {
      return new TextDecoder(
        'utf-8',
        {
          fatal: true,
        },
      ).decode(assetBytes);
    },
  });
}

function idleSurface(
  message =
    'Verified article rendering is waiting for ready verified bytes.',
) {
  return freeze({
    state:
      TV_LIBRARY_VERIFIED_ARTICLE_RENDER_SURFACE_STATE.IDLE,
    ready: false,
    assetKind: null,
    canonicalCrabUrl: null,
    cid: null,
    contentType: null,
    contentLength: null,
    title: 'Verified article surface pending',
    paragraphs: Object.freeze([]),
    code:
      TV_LIBRARY_VERIFIED_ARTICLE_RENDER_SURFACE_CODE.IDLE,
    message:
      boundedText(
        message,
        'Verified article rendering is waiting for ready verified bytes.',
        TV_LIBRARY_VERIFIED_ARTICLE_RENDER_SURFACE_LIMITS.MESSAGE_CHARS,
      ),
  });
}

function rejectedSurface({
  code,
  message,
  lifecycleView,
}) {
  return freeze({
    state:
      TV_LIBRARY_VERIFIED_ARTICLE_RENDER_SURFACE_STATE.REJECTED,
    ready: false,
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
    title: 'Verified article surface rejected',
    paragraphs: Object.freeze([]),
    code:
      boundedText(
        code,
        TV_LIBRARY_VERIFIED_ARTICLE_RENDER_SURFACE_CODE.NOT_READY,
        TV_LIBRARY_VERIFIED_ARTICLE_RENDER_SURFACE_LIMITS.CODE_CHARS,
      ),
    message:
      boundedText(
        message,
        'Verified article rendering rejected the current bytes.',
        TV_LIBRARY_VERIFIED_ARTICLE_RENDER_SURFACE_LIMITS.MESSAGE_CHARS,
      ),
  });
}

export function createIdleTvLibraryVerifiedArticleRenderSurface(
  {
    message,
  } = {},
) {
  return idleSurface(message);
}

export function projectTvLibraryVerifiedArticleRenderSurface(
  {
    lifecycleView,
    assetBytes,
    textDecoderPort =
      createDefaultTextDecoderPort(),
  } = {},
) {
  if (!lifecycleView) {
    return idleSurface();
  }

  if (
    lifecycleView.schema !==
      TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_SCHEMA ||
    lifecycleView.state !==
      TV_LIBRARY_VERIFIED_BYTE_RENDER_LIFECYCLE_STATE.READY ||
    lifecycleView.ready !== true
  ) {
    return rejectedSurface({
      lifecycleView,
      code:
        TV_LIBRARY_VERIFIED_ARTICLE_RENDER_SURFACE_CODE.NOT_READY,
      message:
        'Verified article rendering requires a ready byte-render lifecycle.',
    });
  }

  if (
    lifecycleView.displayKind !==
      TV_LIBRARY_VERIFIED_RENDER_DISPLAY_KIND.ARTICLE_READER ||
    !articleContentType(lifecycleView.contentType)
  ) {
    return rejectedSurface({
      lifecycleView,
      code:
        TV_LIBRARY_VERIFIED_ARTICLE_RENDER_SURFACE_CODE.NOT_ARTICLE,
      message:
        'Verified article rendering requires an article/text display lifecycle.',
    });
  }

  const canonicalCrabUrl =
    boundedText(
      lifecycleView.canonicalCrabUrl,
      '',
      TV_LIBRARY_VERIFIED_ARTICLE_RENDER_SURFACE_LIMITS.ROUTE_CHARS,
    );

  const cid =
    boundedText(
      lifecycleView.cid,
      '',
      TV_LIBRARY_VERIFIED_ARTICLE_RENDER_SURFACE_LIMITS.CID_CHARS,
    );

  if (!canonicalCrabUrl || !cid) {
    return rejectedSurface({
      lifecycleView,
      code:
        TV_LIBRARY_VERIFIED_ARTICLE_RENDER_SURFACE_CODE.MISSING_IDENTIFIER,
      message:
        'Verified article rendering requires bound Library identifiers.',
    });
  }

  const byteLength =
    byteLengthOf(assetBytes);

  if (byteLength <= 0) {
    return rejectedSurface({
      lifecycleView,
      code:
        TV_LIBRARY_VERIFIED_ARTICLE_RENDER_SURFACE_CODE.EMPTY_BYTES,
      message:
        'Verified article rendering requires non-empty bytes.',
    });
  }

  if (
    byteLength >
    TV_LIBRARY_VERIFIED_ARTICLE_RENDER_SURFACE_LIMITS.MAX_TEXT_BYTES
  ) {
    return rejectedSurface({
      lifecycleView,
      code:
        TV_LIBRARY_VERIFIED_ARTICLE_RENDER_SURFACE_CODE.OVERSIZED_BYTES,
      message:
        'Verified article rendering rejected bytes above the text display limit.',
    });
  }

  if (
    Number.isSafeInteger(
      lifecycleView.contentLength,
    ) &&
    lifecycleView.contentLength > 0 &&
    lifecycleView.contentLength !== byteLength
  ) {
    return rejectedSurface({
      lifecycleView,
      code:
        TV_LIBRARY_VERIFIED_ARTICLE_RENDER_SURFACE_CODE.LENGTH_MISMATCH,
      message:
        'Verified article rendering rejected bytes whose length no longer matches verified facts.',
    });
  }

  let decoded;

  try {
    decoded =
      textDecoderPort.decodeUtf8(
        assetBytes,
      );
  } catch {
    return rejectedSurface({
      lifecycleView,
      code:
        TV_LIBRARY_VERIFIED_ARTICLE_RENDER_SURFACE_CODE.DECODE_FAILED,
      message:
        'Verified article rendering could not decode UTF-8 text.',
    });
  }

  const paragraphs =
    paragraphsFromText(decoded);

  if (paragraphs.length === 0) {
    return rejectedSurface({
      lifecycleView,
      code:
        TV_LIBRARY_VERIFIED_ARTICLE_RENDER_SURFACE_CODE.EMPTY_BYTES,
      message:
        'Verified article rendering decoded no visible text.',
    });
  }

  return freeze({
    state:
      TV_LIBRARY_VERIFIED_ARTICLE_RENDER_SURFACE_STATE.READY,
    ready: true,
    assetKind:
      boundedText(
        lifecycleView.assetKind,
        'article',
        32,
      ),
    canonicalCrabUrl,
    cid,
    contentType:
      boundedText(
        lifecycleView.contentType,
        'text/plain',
        TV_LIBRARY_VERIFIED_ARTICLE_RENDER_SURFACE_LIMITS.CONTENT_TYPE_CHARS,
      ).toLowerCase(),
    contentLength:
      Number.isSafeInteger(
        lifecycleView.contentLength,
      )
        ? lifecycleView.contentLength
        : byteLength,
    title:
      'Verified article reader',
    paragraphs:
      Object.freeze(paragraphs),
    code:
      TV_LIBRARY_VERIFIED_ARTICLE_RENDER_SURFACE_CODE.READY,
    message:
      'Verified article bytes decoded into a safe TV text surface.',
  });
}
