/**
 * RO:WHAT — Platform-neutral route labels and typed-asset display mapping.
 * RO:WHY — Desktop and TV must describe the same route and asset kinds consistently.
 * RO:INTERACTS — desktop registry/router, TV section metadata, crabUrl.js.
 * RO:INVARIANTS — display and owner selection only; no component or backend authority.
 * RO:SECURITY — no Chrome, Tauri, DOM, network, storage, wallet, receipt, session, ROC, or ledger access.
 * RO:TEST — node --test src/routeMetadata.test.mjs.
 */

const SAFE_ROUTE_KIND =
  /^[a-z][a-z0-9_-]{0,63}$/;

const CONTROL_CHARACTERS =
  /[\u0000-\u001f\u007f-\u009f]/u;

const CANONICAL_ROUTE_LABELS =
  Object.freeze({
    notFound: 'Not Found',
    podcasts: 'Podcasts',
    chat: 'Chat',
    make: 'Make Studio',
  });

const CANONICAL_ASSET_LABELS =
  Object.freeze({
    chat: 'Chat Room',
  });

function normalizeDisplayLabel(value) {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();

  if (
    trimmed.length === 0 ||
    trimmed.length > 80 ||
    CONTROL_CHARACTERS.test(trimmed)
  ) {
    return '';
  }

  return trimmed;
}

export function normalizeRouteKind(
  value,
  fallback = '',
) {
  const raw =
    String(value || '').trim();

  if (
    raw === 'notFound' ||
    raw.toLowerCase() === 'notfound'
  ) {
    return 'notFound';
  }

  const normalized =
    raw.toLowerCase();

  if (SAFE_ROUTE_KIND.test(normalized)) {
    return normalized;
  }

  const safeFallback =
    String(fallback || '')
      .trim()
      .toLowerCase();

  return SAFE_ROUTE_KIND.test(safeFallback)
    ? safeFallback
    : '';
}

export function routeKindLabel(
  kind,
  overrides = {},
) {
  const normalized =
    normalizeRouteKind(kind);

  if (!normalized) {
    return 'Unknown';
  }

  if (
    overrides !== null &&
    typeof overrides === 'object' &&
    Object.prototype.hasOwnProperty.call(
      overrides,
      normalized,
    )
  ) {
    const override =
      normalizeDisplayLabel(
        overrides[normalized],
      );

    if (override) {
      return override;
    }
  }

  const canonical =
    CANONICAL_ROUTE_LABELS[
      normalized
    ];

  if (canonical) {
    return canonical;
  }

  return normalized
    .split(/[-_]/)
    .filter(Boolean)
    .map(
      (part) =>
        part.slice(0, 1).toUpperCase() +
        part.slice(1),
    )
    .join(' ');
}

export function assetKindLabel(kind) {
  const normalized =
    normalizeRouteKind(kind);

  if (!normalized) {
    return 'Unknown Asset';
  }

  return (
    CANONICAL_ASSET_LABELS[
      normalized
    ] ??
    `${routeKindLabel(normalized)} Asset`
  );
}

export function resolveAssetRouteOwner(
  assetKind,
  supportedRouteKinds = [],
  fallback = 'asset',
) {
  const normalizedKind =
    normalizeRouteKind(assetKind);

  const normalizedFallback =
    normalizeRouteKind(
      fallback,
      'asset',
    ) || 'asset';

  const supported = new Set(
    Array.isArray(supportedRouteKinds)
      ? supportedRouteKinds
          .map((value) =>
            normalizeRouteKind(value),
          )
          .filter(Boolean)
      : [],
  );

  return (
    normalizedKind &&
    supported.has(normalizedKind)
  )
    ? normalizedKind
    : normalizedFallback;
}

export function describeAssetKind(
  assetKind,
  supportedRouteKinds = [],
  fallback = 'asset',
) {
  const kind =
    normalizeRouteKind(assetKind);

  return Object.freeze({
    kind,
    label:
      assetKindLabel(kind),
    routeOwner:
      resolveAssetRouteOwner(
        kind,
        supportedRouteKinds,
        fallback,
      ),
  });
}
