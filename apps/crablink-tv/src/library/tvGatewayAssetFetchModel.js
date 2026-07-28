/**
 * RO:WHAT — Builds and executes a bounded gateway asset-evidence fetch for TV Library assets.
 * RO:WHY — Library verified rendering needs manifest JSON and asset bytes before native integrity review.
 * RO:INTERACTS — tvLibraryAssetDetailModel, tvLibraryVerifiedAssetRenderModel, future native manifest check flow.
 * RO:INVARIANTS — request is bound to the active Library canonical URL, B3 CID, and asset kind.
 * RO:SECURITY — no global fetch, storage, cache persistence, wallet, ledger, receipt, reward, ROC, entitlement, or finality authority.
 * RO:TEST — tvGatewayAssetFetchModel.test.mjs and check-crablink-tv-gateway-asset-fetch-boundary.mjs.
 */

import {
  TV_LIBRARY_ASSET_DETAIL_KIND,
} from './tvLibraryAssetDetailModel.js';

import {
  TV_LIBRARY_VERIFIED_ASSET_RENDER_LIMITS,
} from './tvLibraryVerifiedAssetRenderModel.js';

export const TV_GATEWAY_ASSET_FETCH_SCHEMA =
  'crablink.tv.gateway-asset-fetch.v1';

export const TV_GATEWAY_ASSET_EVIDENCE_SCHEMA =
  'crablink.tv.gateway-asset-evidence.v1';

export const TV_GATEWAY_ASSET_FETCH_STATE =
  Object.freeze({
    IDLE: 'idle',
    READY: 'ready',
    REJECTED: 'rejected',
  });

export const TV_GATEWAY_ASSET_FETCH_LIMITS =
  Object.freeze({
    ORIGIN_CHARS: 160,
    ROUTE_CHARS: TV_LIBRARY_VERIFIED_ASSET_RENDER_LIMITS.ROUTE_CHARS,
    CID_CHARS: TV_LIBRARY_VERIFIED_ASSET_RENDER_LIMITS.CID_CHARS,
    ASSET_KIND_CHARS:
      TV_LIBRARY_VERIFIED_ASSET_RENDER_LIMITS.ASSET_KIND_CHARS,
    MESSAGE_CHARS: 240,
    CODE_CHARS: 96,
    MAX_ASSET_BYTES:
      TV_LIBRARY_VERIFIED_ASSET_RENDER_LIMITS.MAX_VISIBLE_LENGTH,
  });

const SUPPORTED_ASSET_KINDS =
  Object.freeze(
    new Set([
      'image',
      'article',
    ]),
  );

function freeze(value) {
  return Object.freeze(value);
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

function rejectedFetch(code, message) {
  return freeze({
    schema: TV_GATEWAY_ASSET_FETCH_SCHEMA,
    state: TV_GATEWAY_ASSET_FETCH_STATE.REJECTED,
    ready: false,
    code: boundedText(
      code,
      'TV_GATEWAY_ASSET_FETCH_REJECTED',
      TV_GATEWAY_ASSET_FETCH_LIMITS.CODE_CHARS,
    ),
    message: boundedText(
      message,
      'The gateway asset fetch request was rejected.',
      TV_GATEWAY_ASSET_FETCH_LIMITS.MESSAGE_CHARS,
    ),
  });
}

export function createIdleTvGatewayAssetFetch(
  {
    message =
      'Gateway asset fetch has not been prepared for this Library asset.',
  } = {},
) {
  return freeze({
    schema: TV_GATEWAY_ASSET_FETCH_SCHEMA,
    state: TV_GATEWAY_ASSET_FETCH_STATE.IDLE,
    ready: false,
    code: 'TV_GATEWAY_ASSET_FETCH_IDLE',
    message: boundedText(
      message,
      'Gateway asset fetch has not been prepared for this Library asset.',
      TV_GATEWAY_ASSET_FETCH_LIMITS.MESSAGE_CHARS,
    ),
  });
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
      TV_GATEWAY_ASSET_FETCH_LIMITS.ASSET_KIND_CHARS,
    );

  const canonicalCrabUrl =
    boundedText(
      detailView.canonicalCrabUrl,
      '',
      TV_GATEWAY_ASSET_FETCH_LIMITS.ROUTE_CHARS,
    );

  const cid =
    boundedText(
      detailView.cid,
      '',
      TV_GATEWAY_ASSET_FETCH_LIMITS.CID_CHARS,
    );

  if (
    !SUPPORTED_ASSET_KINDS.has(assetKind) ||
    !canonicalCrabUrl ||
    !cid
  ) {
    return null;
  }

  return freeze({
    assetKind,
    canonicalCrabUrl,
    cid,
  });
}

function normalizeGatewayOrigin(value) {
  const text =
    boundedText(
      value,
      '',
      TV_GATEWAY_ASSET_FETCH_LIMITS.ORIGIN_CHARS,
    );

  if (!text) {
    return null;
  }

  let parsed;

  try {
    parsed = new URL(text);
  } catch {
    return null;
  }

  if (
    parsed.protocol !== 'https:' &&
    parsed.protocol !== 'http:'
  ) {
    return null;
  }

  if (
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    (parsed.pathname && parsed.pathname !== '/')
  ) {
    return null;
  }

  return parsed.origin;
}

function gatewayAssetUrl({
  origin,
  part,
  canonicalCrabUrl,
  cid,
  assetKind,
}) {
  const params =
    new URLSearchParams({
      crabUrl: canonicalCrabUrl,
      cid,
      assetKind,
    });

  return new URL(
    `/tv/assets/${part}?${params.toString()}`,
    origin,
  ).toString();
}

export function projectTvGatewayAssetFetchRequest(
  {
    detailView,
    gatewayOrigin,
  } = {},
) {
  const detail =
    canonicalDetail(detailView);

  if (!detail) {
    return createIdleTvGatewayAssetFetch({
      message:
        'Select a reviewed image or article asset before preparing gateway fetch.',
    });
  }

  const origin =
    normalizeGatewayOrigin(gatewayOrigin);

  if (!origin) {
    return rejectedFetch(
      'TV_GATEWAY_ASSET_FETCH_BAD_ORIGIN',
      'Gateway origin must be an http or https origin without credentials, path, query, or fragment.',
    );
  }

  const manifestUrl =
    gatewayAssetUrl({
      origin,
      part: 'manifest',
      canonicalCrabUrl: detail.canonicalCrabUrl,
      cid: detail.cid,
      assetKind: detail.assetKind,
    });

  const assetUrl =
    gatewayAssetUrl({
      origin,
      part: 'content',
      canonicalCrabUrl: detail.canonicalCrabUrl,
      cid: detail.cid,
      assetKind: detail.assetKind,
    });

  return freeze({
    schema: TV_GATEWAY_ASSET_FETCH_SCHEMA,
    state: TV_GATEWAY_ASSET_FETCH_STATE.READY,
    ready: true,
    method: 'GET',
    credentialsMode: 'omit',
    cacheMode: 'no-store',
    redirectMode: 'error',
    assetKind: detail.assetKind,
    canonicalCrabUrl: detail.canonicalCrabUrl,
    cid: detail.cid,
    manifestUrl,
    assetUrl,
    maxAssetBytes:
      TV_GATEWAY_ASSET_FETCH_LIMITS.MAX_ASSET_BYTES,
  });
}

function requestOptions(request) {
  return freeze({
    method: request.method,
    credentials: request.credentialsMode,
    cache: request.cacheMode,
    redirect: request.redirectMode,
  });
}

function isReadyRequest(request) {
  return Boolean(
    request &&
      request.schema === TV_GATEWAY_ASSET_FETCH_SCHEMA &&
      request.state === TV_GATEWAY_ASSET_FETCH_STATE.READY &&
      request.ready === true &&
      request.method === 'GET' &&
      request.credentialsMode === 'omit' &&
      request.cacheMode === 'no-store' &&
      request.redirectMode === 'error' &&
      request.manifestUrl &&
      request.assetUrl,
  );
}

function normalizeBytes(value) {
  if (value instanceof Uint8Array) {
    return value;
  }

  if (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        Number.isInteger(entry) &&
        entry >= 0 &&
        entry <= 255,
    )
  ) {
    return Uint8Array.from(value);
  }

  return null;
}

export async function readTvGatewayAssetEvidence(
  {
    request,
    transport,
  } = {},
) {
  if (!isReadyRequest(request)) {
    return rejectedFetch(
      'TV_GATEWAY_ASSET_FETCH_BAD_REQUEST',
      'Gateway asset fetch requires a ready request projection.',
    );
  }

  if (
    typeof transport?.fetchJson !== 'function' ||
    typeof transport?.fetchBytes !== 'function'
  ) {
    return rejectedFetch(
      'TV_GATEWAY_ASSET_FETCH_NO_TRANSPORT',
      'Gateway asset fetch requires explicit JSON and byte transport functions.',
    );
  }

  try {
    const options =
      requestOptions(request);

    const manifest =
      await transport.fetchJson(
        request.manifestUrl,
        options,
      );

    const fetchedBytes =
      await transport.fetchBytes(
        request.assetUrl,
        options,
      );

    const assetBytes =
      normalizeBytes(fetchedBytes);

    if (!assetBytes) {
      return rejectedFetch(
        'TV_GATEWAY_ASSET_FETCH_BAD_BYTES',
        'Gateway asset content must be returned as a byte array.',
      );
    }

    if (
      assetBytes.byteLength <= 0 ||
      assetBytes.byteLength > request.maxAssetBytes
    ) {
      return rejectedFetch(
        'TV_GATEWAY_ASSET_FETCH_SIZE_REJECTED',
        'Gateway asset content was empty or exceeded the TV verification byte limit.',
      );
    }

    return freeze({
      schema: TV_GATEWAY_ASSET_EVIDENCE_SCHEMA,
      state: TV_GATEWAY_ASSET_FETCH_STATE.READY,
      ready: true,
      request,
      manifest,
      assetBytes,
      contentLength: assetBytes.byteLength,
      evidenceAuthority:
        'gateway-response-awaiting-native-asset-verification',
    });
  } catch {
    return rejectedFetch(
      'TV_GATEWAY_ASSET_FETCH_TRANSPORT_FAILED',
      'Gateway asset fetch failed before native verification could run.',
    );
  }
}
