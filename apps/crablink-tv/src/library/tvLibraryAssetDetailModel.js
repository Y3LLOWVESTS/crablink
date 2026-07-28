/**
 * RO:WHAT — Projects a bounded Library asset detail from a reviewed catalog handoff.
 * RO:WHY — Asset cards need a truthful persistent Library surface before network hydration.
 * RO:INTERACTS — tvCatalogRouteHandoff, TvLibraryAssetDetailPanel, and TvApp.
 * RO:INVARIANTS — only DETAIL handoffs with canonical asset routes become frozen ready views.
 * RO:SECURITY — no invoke, fetch, storage, wallet, ledger, receipt, reward, ROC, entitlement, or finality authority.
 * RO:TEST — tvLibraryAssetDetailModel.test.mjs and check-crablink-tv-library-asset-detail-boundary.mjs.
 */

import { TV_CATALOG_CARD_HANDOFF_KIND } from '../catalog/tvCatalogRouteHandoff.js';

export const TV_LIBRARY_ASSET_DETAIL_SCHEMA =
  'crablink.tv.library-asset-detail.v1';

export const TV_LIBRARY_ASSET_DETAIL_KIND = Object.freeze({
  IDLE: 'idle',
  READY: 'ready',
  REJECTED: 'rejected',
});

export const TV_LIBRARY_ASSET_DETAIL_LIMITS = Object.freeze({
  TITLE_CHARS: 96,
  SUMMARY_CHARS: 240,
  ASSET_KIND_CHARS: 32,
  ROUTE_CHARS: 192,
  CID_CHARS: 67,
  HASH_CHARS: 64,
  FOCUS_KEY_CHARS: 128,
  CODE_CHARS: 96,
});

function freeze(value) {
  return Object.freeze({
    schema: TV_LIBRARY_ASSET_DETAIL_SCHEMA,
    ...value,
  });
}

function boundedText(value, fallback, maxLength) {
  const text = typeof value === 'string' ? value.trim() : '';
  return (text || fallback).slice(0, maxLength);
}

function boundedFocusKey(value) {
  return boundedText(
    value,
    'home-catalog-load',
    TV_LIBRARY_ASSET_DETAIL_LIMITS.FOCUS_KEY_CHARS,
  );
}

function canonicalAssetRoute(route) {
  const assetKind = boundedText(
    route?.assetKind,
    '',
    TV_LIBRARY_ASSET_DETAIL_LIMITS.ASSET_KIND_CHARS,
  );

  const hash = boundedText(
    route?.hash,
    '',
    TV_LIBRARY_ASSET_DETAIL_LIMITS.HASH_CHARS,
  );

  const cid = boundedText(
    route?.cid,
    '',
    TV_LIBRARY_ASSET_DETAIL_LIMITS.CID_CHARS,
  );

  const normalized = boundedText(
    route?.normalized,
    '',
    TV_LIBRARY_ASSET_DETAIL_LIMITS.ROUTE_CHARS,
  );

  if (
    route?.owner !== 'asset' ||
    !/^[a-z][a-z0-9-]{0,31}$/u.test(assetKind) ||
    !/^[0-9a-f]{64}$/u.test(hash) ||
    cid !== `b3:${hash}` ||
    normalized !== `crab://${hash}.${assetKind}`
  ) {
    return null;
  }

  return Object.freeze({
    assetKind,
    normalized,
    cid,
    hash,
  });
}

export function createIdleTvLibraryAssetDetail() {
  return freeze({
    kind: TV_LIBRARY_ASSET_DETAIL_KIND.IDLE,
    title: 'No Library asset selected',
    summary: 'Choose a reviewed asset card from the Home catalog.',
    assetKind: null,
    canonicalCrabUrl: null,
    cid: null,
    hash: null,
    route: null,
    returnFocusKey: 'home-catalog-load',
  });
}

function rejectedDetail(code, returnFocusKey) {
  return freeze({
    kind: TV_LIBRARY_ASSET_DETAIL_KIND.REJECTED,
    title: 'Library asset unavailable',
    summary:
      'The selected card did not contain a canonical reviewed asset route.',
    assetKind: null,
    canonicalCrabUrl: null,
    cid: null,
    hash: null,
    route: null,
    code: boundedText(
      code,
      'TV_LIBRARY_ASSET_DETAIL_REJECTED',
      TV_LIBRARY_ASSET_DETAIL_LIMITS.CODE_CHARS,
    ),
    returnFocusKey,
  });
}

export function projectTvLibraryAssetDetail(
  handoff,
  {
    initiatingFocusKey,
  } = {},
) {
  const returnFocusKey = boundedFocusKey(
    initiatingFocusKey ??
      handoff?.overlay?.returnFocusKey,
  );

  if (
    handoff?.kind !==
    TV_CATALOG_CARD_HANDOFF_KIND.DETAIL
  ) {
    return rejectedDetail(
      'TV_LIBRARY_ASSET_DETAIL_HANDOFF_REJECTED',
      returnFocusKey,
    );
  }

  const route =
    canonicalAssetRoute(
      handoff.route,
    );

  if (!route) {
    return rejectedDetail(
      'TV_LIBRARY_ASSET_DETAIL_ROUTE_REJECTED',
      returnFocusKey,
    );
  }

  return freeze({
    kind: TV_LIBRARY_ASSET_DETAIL_KIND.READY,
    title: boundedText(
      handoff?.overlay?.title,
      `${route.assetKind} asset`,
      TV_LIBRARY_ASSET_DETAIL_LIMITS.TITLE_CHARS,
    ),
    summary: boundedText(
      handoff?.overlay?.body,
      'Reviewed catalog asset route.',
      TV_LIBRARY_ASSET_DETAIL_LIMITS.SUMMARY_CHARS,
    ),
    assetKind: route.assetKind,
    canonicalCrabUrl: route.normalized,
    cid: route.cid,
    hash: route.hash,
    route,
    returnFocusKey,
  });
}
