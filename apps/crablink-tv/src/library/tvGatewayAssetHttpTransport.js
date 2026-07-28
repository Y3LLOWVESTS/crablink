/**
 * RO:WHAT — Explicit bounded HTTP transport for CrabLink TV gateway asset evidence.
 * RO:WHY — Phase 9J needs one reviewed fetch surface while React and verification models remain free of global fetch.
 * RO:INTERACTS — tvGatewayAssetFetchModel through injected fetchJson and fetchBytes functions.
 * RO:INVARIANTS — GET only; credentials omitted; cache disabled; redirects rejected; http/https origins only; bounded bodies.
 * RO:SECURITY — no storage, cookies, ambient credentials, dynamic commands, wallet, ledger, ROC, entitlement, or finality authority.
 * RO:TEST — tvGatewayAssetHttpTransport.test.mjs and check-crablink-tv-library-manual-verify-execution-foundation-boundary.mjs.
 */

export const TV_GATEWAY_ASSET_HTTP_TRANSPORT_LIMITS =
  Object.freeze({
    MAX_MANIFEST_BYTES: 65_536,
    MAX_ASSET_BYTES: 4_194_304,
  });

function normalizedUrl(value) {
  if (
    typeof value !== 'string' ||
    !value.trim()
  ) {
    throw new Error(
      'TV_GATEWAY_HTTP_URL_REQUIRED',
    );
  }

  const parsed =
    new URL(value);

  if (
    parsed.protocol !== 'http:' &&
    parsed.protocol !== 'https:'
  ) {
    throw new Error(
      'TV_GATEWAY_HTTP_SCHEME_REJECTED',
    );
  }

  if (
    parsed.username ||
    parsed.password
  ) {
    throw new Error(
      'TV_GATEWAY_HTTP_CREDENTIALS_REJECTED',
    );
  }

  return parsed.toString();
}

function normalizedOptions(options) {
  if (
    options?.method !== 'GET' ||
    options?.credentials !== 'omit' ||
    options?.cache !== 'no-store' ||
    options?.redirect !== 'error'
  ) {
    throw new Error(
      'TV_GATEWAY_HTTP_OPTIONS_REJECTED',
    );
  }

  return Object.freeze({
    method: 'GET',
    credentials: 'omit',
    cache: 'no-store',
    redirect: 'error',
  });
}

function contentLength(response) {
  const value =
    response?.headers?.get?.(
      'content-length',
    );

  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null;
  }

  const parsed =
    Number(value);

  return (
    Number.isSafeInteger(parsed) &&
    parsed >= 0
  )
    ? parsed
    : null;
}

function requireSuccessfulResponse(
  response,
  maxBytes,
) {
  if (
    !response ||
    response.ok !== true
  ) {
    throw new Error(
      'TV_GATEWAY_HTTP_STATUS_REJECTED',
    );
  }

  const declaredLength =
    contentLength(response);

  if (
    declaredLength !== null &&
    declaredLength > maxBytes
  ) {
    throw new Error(
      'TV_GATEWAY_HTTP_BODY_TOO_LARGE',
    );
  }
}

function encodedLength(text) {
  return new TextEncoder()
    .encode(text)
    .byteLength;
}

export function createTvGatewayAssetHttpTransport(
  {
    fetchImpl = globalThis.fetch,
  } = {},
) {
  if (
    typeof fetchImpl !== 'function'
  ) {
    throw new Error(
      'TV_GATEWAY_HTTP_FETCH_UNAVAILABLE',
    );
  }

  async function fetchJson(
    url,
    options,
  ) {
    const response =
      await fetchImpl(
        normalizedUrl(url),
        normalizedOptions(options),
      );

    requireSuccessfulResponse(
      response,
      TV_GATEWAY_ASSET_HTTP_TRANSPORT_LIMITS
        .MAX_MANIFEST_BYTES,
    );

    const text =
      await response.text();

    if (
      encodedLength(text) >
      TV_GATEWAY_ASSET_HTTP_TRANSPORT_LIMITS
        .MAX_MANIFEST_BYTES
    ) {
      throw new Error(
        'TV_GATEWAY_HTTP_MANIFEST_TOO_LARGE',
      );
    }

    return JSON.parse(text);
  }

  async function fetchBytes(
    url,
    options,
  ) {
    const response =
      await fetchImpl(
        normalizedUrl(url),
        normalizedOptions(options),
      );

    requireSuccessfulResponse(
      response,
      TV_GATEWAY_ASSET_HTTP_TRANSPORT_LIMITS
        .MAX_ASSET_BYTES,
    );

    const buffer =
      await response.arrayBuffer();

    if (
      buffer.byteLength <= 0 ||
      buffer.byteLength >
        TV_GATEWAY_ASSET_HTTP_TRANSPORT_LIMITS
          .MAX_ASSET_BYTES
    ) {
      throw new Error(
        'TV_GATEWAY_HTTP_ASSET_SIZE_REJECTED',
      );
    }

    return new Uint8Array(buffer);
  }

  return Object.freeze({
    fetchJson,
    fetchBytes,
  });
}

export const tvGatewayAssetHttpTransport =
  createTvGatewayAssetHttpTransport();
