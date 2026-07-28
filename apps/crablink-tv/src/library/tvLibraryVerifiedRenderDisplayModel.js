/**
 * RO:WHAT — Projects content-specific verified display shells for TV Library image/article assets.
 * RO:WHY — Phase 9K makes verified Library results visibly useful before byte-render lifecycle expansion.
 * RO:INTERACTS — tvLibraryAssetDetailModel, tvLibraryVerifiedAssetRenderModel, and TvLibraryAssetDetailPanel.
 * RO:INVARIANTS — display shells require active-detail identifier match and verified render facts.
 * RO:SECURITY — no fetch, invoke, object URL, img/src, storage, wallet, ledger, ROC, entitlement, or finality authority.
 * RO:TEST — tvLibraryVerifiedRenderDisplayModel.test.mjs and check-crablink-tv-library-verified-render-display-boundary.mjs.
 */

import {
  TV_LIBRARY_ASSET_DETAIL_KIND,
} from './tvLibraryAssetDetailModel.js';

import {
  TV_LIBRARY_VERIFIED_ASSET_RENDER_KIND,
} from './tvLibraryVerifiedAssetRenderModel.js';

export const TV_LIBRARY_VERIFIED_RENDER_DISPLAY_SCHEMA =
  'crablink.tv.library-verified-render-display.v1';

export const TV_LIBRARY_VERIFIED_RENDER_DISPLAY_STATE =
  Object.freeze({
    IDLE: 'idle',
    READY: 'ready',
    REJECTED: 'rejected',
  });

export const TV_LIBRARY_VERIFIED_RENDER_DISPLAY_KIND =
  Object.freeze({
    IMAGE_FRAME: 'image-frame',
    ARTICLE_READER: 'article-reader',
  });

export const TV_LIBRARY_VERIFIED_RENDER_DISPLAY_LIMITS =
  Object.freeze({
    MESSAGE_CHARS: 260,
    CODE_CHARS: 96,
    TITLE_CHARS: 96,
    COPY_CHARS: 320,
    CONTENT_TYPE_CHARS: 96,
    CID_CHARS: 67,
    ROUTE_CHARS: 192,
    ASSET_KIND_CHARS: 32,
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
      TV_LIBRARY_VERIFIED_RENDER_DISPLAY_SCHEMA,
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
    TV_LIBRARY_VERIFIED_RENDER_DISPLAY_LIMITS
      .MAX_VISIBLE_LENGTH,
  );
}

function canonicalDetail(detailView) {
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
      TV_LIBRARY_VERIFIED_RENDER_DISPLAY_LIMITS
        .ASSET_KIND_CHARS,
    );

  const canonicalCrabUrl =
    boundedText(
      detailView.canonicalCrabUrl,
      '',
      TV_LIBRARY_VERIFIED_RENDER_DISPLAY_LIMITS
        .ROUTE_CHARS,
    );

  const cid =
    boundedText(
      detailView.cid,
      '',
      TV_LIBRARY_VERIFIED_RENDER_DISPLAY_LIMITS
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

function rejectedDisplay({
  code,
  message,
} = {}) {
  return freeze({
    state:
      TV_LIBRARY_VERIFIED_RENDER_DISPLAY_STATE
        .REJECTED,

    ready: false,
    displayKind: null,
    assetKind: null,
    canonicalCrabUrl: null,
    cid: null,
    contentType: null,
    contentLength: null,
    title: 'Verified display unavailable',
    copy:
      boundedText(
        message,
        'Verified render facts did not match the active Library asset.',
        TV_LIBRARY_VERIFIED_RENDER_DISPLAY_LIMITS
          .COPY_CHARS,
      ),

    code:
      boundedText(
        code,
        'TV_LIBRARY_VERIFIED_DISPLAY_REJECTED',
        TV_LIBRARY_VERIFIED_RENDER_DISPLAY_LIMITS
          .CODE_CHARS,
      ),

    message:
      boundedText(
        message,
        'Verified render facts did not match the active Library asset.',
        TV_LIBRARY_VERIFIED_RENDER_DISPLAY_LIMITS
          .MESSAGE_CHARS,
      ),
  });
}

export function createIdleTvLibraryVerifiedRenderDisplay(
  {
    message =
      'Verified display is waiting for manual verification.',
  } = {},
) {
  return freeze({
    state:
      TV_LIBRARY_VERIFIED_RENDER_DISPLAY_STATE
        .IDLE,

    ready: false,
    displayKind: null,
    assetKind: null,
    canonicalCrabUrl: null,
    cid: null,
    contentType: null,
    contentLength: null,
    title: 'Verified display pending',
    copy:
      boundedText(
        message,
        'Verified display is waiting for manual verification.',
        TV_LIBRARY_VERIFIED_RENDER_DISPLAY_LIMITS
          .COPY_CHARS,
      ),

    code:
      'TV_LIBRARY_VERIFIED_DISPLAY_IDLE',

    message:
      boundedText(
        message,
        'Verified display is waiting for manual verification.',
        TV_LIBRARY_VERIFIED_RENDER_DISPLAY_LIMITS
          .MESSAGE_CHARS,
      ),
  });
}

function displayKindForRender(renderKind) {
  if (renderKind === 'image') {
    return TV_LIBRARY_VERIFIED_RENDER_DISPLAY_KIND
      .IMAGE_FRAME;
  }

  if (renderKind === 'article') {
    return TV_LIBRARY_VERIFIED_RENDER_DISPLAY_KIND
      .ARTICLE_READER;
  }

  return null;
}

export function projectTvLibraryVerifiedRenderDisplay(
  {
    detailView,
    verifiedRenderView,
  } = {},
) {
  const detail =
    canonicalDetail(detailView);

  if (!detail) {
    return createIdleTvLibraryVerifiedRenderDisplay({
      message:
        'Select a reviewed image or article asset before displaying verified render state.',
    });
  }

  if (
    verifiedRenderView?.kind !==
      TV_LIBRARY_VERIFIED_ASSET_RENDER_KIND.READY ||
    verifiedRenderView.verified !== true
  ) {
    return createIdleTvLibraryVerifiedRenderDisplay({
      message:
        verifiedRenderView?.message ??
        'Manual verification has not produced render-ready facts yet.',
    });
  }

  const displayKind =
    displayKindForRender(
      verifiedRenderView.renderKind,
    );

  if (
    !SUPPORTED_DISPLAY_KINDS.has(displayKind) ||
    verifiedRenderView.assetKind !==
      detail.assetKind ||
    verifiedRenderView.canonicalCrabUrl !==
      detail.canonicalCrabUrl ||
    verifiedRenderView.cid !== detail.cid
  ) {
    return rejectedDisplay({
      code:
        'TV_LIBRARY_VERIFIED_DISPLAY_MISMATCH',

      message:
        'Verified display facts did not match the active Library asset identifiers.',
    });
  }

  const contentType =
    boundedText(
      verifiedRenderView.contentType,
      'application/octet-stream',
      TV_LIBRARY_VERIFIED_RENDER_DISPLAY_LIMITS
        .CONTENT_TYPE_CHARS,
    );

  const contentLength =
    boundedLength(
      verifiedRenderView.contentLength,
    );

  const base = {
    state:
      TV_LIBRARY_VERIFIED_RENDER_DISPLAY_STATE
        .READY,

    ready: true,
    displayKind,
    assetKind: detail.assetKind,
    canonicalCrabUrl: detail.canonicalCrabUrl,
    cid: detail.cid,
    contentType,
    contentLength,
    code:
      'TV_LIBRARY_VERIFIED_DISPLAY_READY',
  };

  if (
    displayKind ===
    TV_LIBRARY_VERIFIED_RENDER_DISPLAY_KIND
      .IMAGE_FRAME
  ) {
    return freeze({
      ...base,

      title:
        boundedText(
          'Verified image display',
          'Verified image display',
          TV_LIBRARY_VERIFIED_RENDER_DISPLAY_LIMITS
            .TITLE_CHARS,
        ),

      copy:
        'Image integrity and metadata are verified. Byte rendering remains behind the reviewed object-URL lifecycle.',

      message:
        'Verified image display surface is ready without direct provider fallback.',
    });
  }

  return freeze({
    ...base,

    title:
      boundedText(
        'Verified article reader',
        'Verified article reader',
        TV_LIBRARY_VERIFIED_RENDER_DISPLAY_LIMITS
          .TITLE_CHARS,
      ),

    copy:
      'Article integrity and metadata are verified. Text decoding remains bounded and must not use unsafe HTML injection.',

    message:
      'Verified article display surface is ready without unsafe HTML injection.',
  });
}