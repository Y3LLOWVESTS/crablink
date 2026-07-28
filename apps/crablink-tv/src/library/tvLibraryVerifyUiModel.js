/**
 * RO:WHAT — Projects the manual TV Library verify action state.
 * RO:WHY — Phase 9I exposes a visible, remote-focusable verify control without executing verification automatically.
 * RO:INTERACTS — tvLibraryAssetDetailModel, tvLibraryVerifiedAssetRenderModel, TvLibraryAssetDetailPanel, and TvApp.
 * RO:INVARIANTS — the UI action is bound to the active Library asset detail and cannot fabricate verification.
 * RO:SECURITY — no fetch, invoke, storage, raw-byte rendering, wallet, ledger, receipt, reward, ROC, entitlement, or finality authority.
 * RO:TEST — tvLibraryVerifyUiModel.test.mjs and check-crablink-tv-library-verify-ui-boundary.mjs.
 */

import {
  TV_LIBRARY_ASSET_DETAIL_KIND,
} from './tvLibraryAssetDetailModel.js';

import {
  TV_LIBRARY_VERIFIED_ASSET_RENDER_KIND,
} from './tvLibraryVerifiedAssetRenderModel.js';

export const TV_LIBRARY_VERIFY_UI_SCHEMA =
  'crablink.tv.library-verify-ui.v1';

export const TV_LIBRARY_VERIFY_UI_STATE =
  Object.freeze({
    IDLE: 'idle',
    READY: 'ready',
    REQUESTED: 'requested',
    BLOCKED: 'blocked',
  });

export const TV_LIBRARY_VERIFY_UI_LIMITS =
  Object.freeze({
    CODE_CHARS: 96,
    MESSAGE_CHARS: 240,
    ASSET_KIND_CHARS: 24,
    ROUTE_CHARS: 180,
    CID_CHARS: 96,
  });

const VERIFYABLE_ASSET_KINDS =
  Object.freeze(
    new Set([
      'image',
      'article',
    ]),
  );

function freeze(value) {
  return Object.freeze({
    schema: TV_LIBRARY_VERIFY_UI_SCHEMA,
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

function boundedDetail(detailView) {
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
      TV_LIBRARY_VERIFY_UI_LIMITS.ASSET_KIND_CHARS,
    );

  const canonicalCrabUrl =
    boundedText(
      detailView.canonicalCrabUrl,
      '',
      TV_LIBRARY_VERIFY_UI_LIMITS.ROUTE_CHARS,
    );

  const cid =
    boundedText(
      detailView.cid,
      '',
      TV_LIBRARY_VERIFY_UI_LIMITS.CID_CHARS,
    );

  if (!assetKind || !canonicalCrabUrl || !cid) {
    return null;
  }

  return Object.freeze({
    assetKind,
    canonicalCrabUrl,
    cid,
  });
}

export function createIdleTvLibraryVerifyUiView(
  {
    message =
      'Select a reviewed Library image or article before manual verification.',
  } = {},
) {
  return freeze({
    state: TV_LIBRARY_VERIFY_UI_STATE.IDLE,
    canRequest: false,
    code: 'TV_LIBRARY_VERIFY_UI_IDLE',
    message: boundedText(
      message,
      'Select a reviewed Library image or article before manual verification.',
      TV_LIBRARY_VERIFY_UI_LIMITS.MESSAGE_CHARS,
    ),
  });
}

function blockedView({
  code,
  message,
  detail,
}) {
  return freeze({
    state: TV_LIBRARY_VERIFY_UI_STATE.BLOCKED,
    canRequest: false,
    code: boundedText(
      code,
      'TV_LIBRARY_VERIFY_UI_BLOCKED',
      TV_LIBRARY_VERIFY_UI_LIMITS.CODE_CHARS,
    ),
    message: boundedText(
      message,
      'Manual verification is blocked for this Library asset.',
      TV_LIBRARY_VERIFY_UI_LIMITS.MESSAGE_CHARS,
    ),
    ...(detail ?? {}),
  });
}

export function projectTvLibraryVerifyUiView(
  {
    detailView,
    verifiedRenderView,
  } = {},
) {
  const detail =
    boundedDetail(detailView);

  if (!detail) {
    return createIdleTvLibraryVerifyUiView();
  }

  if (
    !VERIFYABLE_ASSET_KINDS.has(detail.assetKind)
  ) {
    return blockedView({
      code: 'TV_LIBRARY_VERIFY_UI_UNSUPPORTED_ASSET',
      message:
        'Only image and article assets can be manually verified in this TV phase.',
      detail,
    });
  }

  if (
    verifiedRenderView?.kind ===
    TV_LIBRARY_VERIFIED_ASSET_RENDER_KIND.READY
  ) {
    return blockedView({
      code: 'TV_LIBRARY_VERIFY_UI_ALREADY_VERIFIED',
      message:
        'This Library asset already has native verified render facts.',
      detail,
    });
  }

  return freeze({
    state: TV_LIBRARY_VERIFY_UI_STATE.READY,
    canRequest: true,
    code: 'TV_LIBRARY_VERIFY_UI_READY',
    message:
      'Manual verification is ready. Press Verify asset to run the reviewed gateway and native checks.',
    ...detail,
  });
}

export function requestTvLibraryVerifyUiView(
  {
    view,
  } = {},
) {
  if (
    view?.schema !== TV_LIBRARY_VERIFY_UI_SCHEMA ||
    view.canRequest !== true ||
    view.state !== TV_LIBRARY_VERIFY_UI_STATE.READY
  ) {
    return blockedView({
      code: 'TV_LIBRARY_VERIFY_UI_REQUEST_REJECTED',
      message:
        'Manual verification can only be requested from a ready Library verify UI state.',
    });
  }

  return freeze({
    state: TV_LIBRARY_VERIFY_UI_STATE.REQUESTED,
    canRequest: false,
    code: 'TV_LIBRARY_VERIFY_UI_REQUESTED',
    message:
      'Manual verification request accepted. Reviewed execution is starting.',
    assetKind: view.assetKind,
    canonicalCrabUrl: view.canonicalCrabUrl,
    cid: view.cid,
  });
}
