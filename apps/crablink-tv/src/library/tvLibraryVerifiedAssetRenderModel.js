/**
 * RO:WHAT — Projects a bounded Library render proof from a native verified asset result.
 * RO:WHY — Library needs a visible render-ready contract before gateway fetching or raw rendering.
 * RO:INTERACTS — TvLibraryAssetDetailPanel, tv_asset_manifest_check result DTOs, and future gateway asset fetch.
 * RO:INVARIANTS — verified results must match the active Library detail canonical URL, B3 CID, and asset kind.
 * RO:SECURITY — no invoke, fetch, storage, raw bytes, wallet, ledger, receipt, reward, ROC, entitlement, or finality authority.
 * RO:TEST — tvLibraryVerifiedAssetRenderModel.test.mjs and check-crablink-tv-library-verified-asset-render-boundary.mjs.
 */

import {
  TV_LIBRARY_ASSET_DETAIL_KIND,
} from './tvLibraryAssetDetailModel.js';

export const TV_LIBRARY_VERIFIED_ASSET_RENDER_SCHEMA =
  'crablink.tv.library-verified-asset-render.v1';

export const TV_LIBRARY_VERIFIED_ASSET_RENDER_KIND =
  Object.freeze({
    IDLE: 'idle',
    READY: 'ready',
    REJECTED: 'rejected',
  });

export const TV_LIBRARY_VERIFIED_ASSET_RENDER_LIMITS =
  Object.freeze({
    ASSET_KIND_CHARS: 32,
    RENDER_KIND_CHARS: 32,
    ROUTE_CHARS: 192,
    CID_CHARS: 67,
    CONTENT_TYPE_CHARS: 96,
    CODE_CHARS: 96,
    MESSAGE_CHARS: 240,
    MAX_VISIBLE_LENGTH: 4_194_304,
  });

const SUPPORTED_RENDER_KINDS =
  Object.freeze(
    new Set([
      'image',
      'article',
    ]),
  );

function freeze(value) {
  return Object.freeze({
    schema: TV_LIBRARY_VERIFIED_ASSET_RENDER_SCHEMA,
    ...value,
  });
}

function boundedText(value, fallback, maxLength) {
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
    TV_LIBRARY_VERIFIED_ASSET_RENDER_LIMITS.MAX_VISIBLE_LENGTH,
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
      TV_LIBRARY_VERIFIED_ASSET_RENDER_LIMITS.ASSET_KIND_CHARS,
    );

  const canonicalCrabUrl =
    boundedText(
      detailView.canonicalCrabUrl,
      '',
      TV_LIBRARY_VERIFIED_ASSET_RENDER_LIMITS.ROUTE_CHARS,
    );

  const cid =
    boundedText(
      detailView.cid,
      '',
      TV_LIBRARY_VERIFIED_ASSET_RENDER_LIMITS.CID_CHARS,
    );

  if (
    !SUPPORTED_RENDER_KINDS.has(assetKind) ||
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

export function createIdleTvLibraryVerifiedAssetRender(
  {
    message =
      'Manifest verification has not been requested for this Library asset.',
  } = {},
) {
  return freeze({
    kind: TV_LIBRARY_VERIFIED_ASSET_RENDER_KIND.IDLE,
    verified: false,
    renderKind: null,
    assetKind: null,
    canonicalCrabUrl: null,
    cid: null,
    contentType: null,
    contentLength: null,
    maxVerifiedAssetBytes: null,
    code: 'TV_LIBRARY_VERIFIED_RENDER_IDLE',
    message: boundedText(
      message,
      'Manifest verification has not been requested for this Library asset.',
      TV_LIBRARY_VERIFIED_ASSET_RENDER_LIMITS.MESSAGE_CHARS,
    ),
  });
}

function rejectedRender(code, message) {
  return freeze({
    kind: TV_LIBRARY_VERIFIED_ASSET_RENDER_KIND.REJECTED,
    verified: false,
    renderKind: null,
    assetKind: null,
    canonicalCrabUrl: null,
    cid: null,
    contentType: null,
    contentLength: null,
    maxVerifiedAssetBytes: null,
    code: boundedText(
      code,
      'TV_LIBRARY_VERIFIED_RENDER_REJECTED',
      TV_LIBRARY_VERIFIED_ASSET_RENDER_LIMITS.CODE_CHARS,
    ),
    message: boundedText(
      message,
      'The verified asset result did not match the active Library asset.',
      TV_LIBRARY_VERIFIED_ASSET_RENDER_LIMITS.MESSAGE_CHARS,
    ),
  });
}

export function projectTvLibraryVerifiedAssetRender(
  {
    detailView,
    verification,
  } = {},
) {
  const detail =
    canonicalDetail(detailView);

  if (!detail) {
    return createIdleTvLibraryVerifiedAssetRender({
      message:
        'Select a reviewed image or article asset before rendering verification.',
    });
  }

  if (!verification) {
    return createIdleTvLibraryVerifiedAssetRender({
      message:
        'Awaiting manifest bytes and a native verification result for this asset.',
    });
  }

  const renderKind =
    boundedText(
      verification.renderKind,
      '',
      TV_LIBRARY_VERIFIED_ASSET_RENDER_LIMITS.RENDER_KIND_CHARS,
    );

  const assetKind =
    boundedText(
      verification.assetKind,
      '',
      TV_LIBRARY_VERIFIED_ASSET_RENDER_LIMITS.ASSET_KIND_CHARS,
    );

  const canonicalCrabUrl =
    boundedText(
      verification.crabUrl,
      '',
      TV_LIBRARY_VERIFIED_ASSET_RENDER_LIMITS.ROUTE_CHARS,
    );

  const cid =
    boundedText(
      verification.contentCid,
      '',
      TV_LIBRARY_VERIFIED_ASSET_RENDER_LIMITS.CID_CHARS,
    );

  if (verification.verified !== true) {
    return rejectedRender(
      'TV_LIBRARY_VERIFIED_RENDER_NOT_VERIFIED',
      'Native asset verification did not return a verified result.',
    );
  }

  if (
    renderKind !== detail.assetKind ||
    assetKind !== detail.assetKind ||
    canonicalCrabUrl !== detail.canonicalCrabUrl ||
    cid !== detail.cid ||
    !SUPPORTED_RENDER_KINDS.has(renderKind)
  ) {
    return rejectedRender(
      'TV_LIBRARY_VERIFIED_RENDER_MISMATCH',
      'The verified render result did not match the active Library asset identifiers.',
    );
  }

  return freeze({
    kind: TV_LIBRARY_VERIFIED_ASSET_RENDER_KIND.READY,
    verified: true,
    renderKind,
    assetKind,
    canonicalCrabUrl,
    cid,
    contentType: boundedText(
      verification.contentType,
      'application/octet-stream',
      TV_LIBRARY_VERIFIED_ASSET_RENDER_LIMITS.CONTENT_TYPE_CHARS,
    ),
    contentLength: boundedLength(
      verification.contentLength,
    ),
    maxVerifiedAssetBytes: boundedLength(
      verification.maxVerifiedAssetBytes,
    ),
    code: 'TV_LIBRARY_VERIFIED_RENDER_READY',
    message:
      renderKind === 'image'
        ? 'Verified image render is ready for the safe renderer surface.'
        : 'Verified article render is ready for the safe reader surface.',
  });
}
