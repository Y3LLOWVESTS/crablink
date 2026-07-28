import {
  TV_ROUTE_RESULT_KIND,
  resolveTvRouteInput,
} from '../navigation/tvRouteRegistry.js';

export const TV_CATALOG_SCHEMA =
  'crablink.tv.catalog.v1';

export const TV_CATALOG_MAX_RAILS =
  7;

export const TV_CATALOG_MAX_ITEMS_PER_RAIL =
  32;

export const TV_CATALOG_VIEW_KIND =
  Object.freeze({
    LOADING:
      'loading',

    UNAVAILABLE:
      'unavailable',

    MALFORMED:
      'malformed',

    EMPTY:
      'empty',

    READY:
      'ready',
  });

export const TV_CATALOG_RAIL =
  Object.freeze({
    CONTINUE_WATCHING:
      'continue-watching',

    FOLLOWING:
      'following',

    RECENT_PURCHASES:
      'recent-purchases',

    RECENTLY_VIEWED:
      'recently-viewed',

    FEATURED:
      'featured',

    RECENT_PUBLIC:
      'recent-public',

    CREATORS:
      'creators',
  });

const RAIL_LABELS =
  Object.freeze({
    [TV_CATALOG_RAIL.CONTINUE_WATCHING]:
      'Continue Watching',

    [TV_CATALOG_RAIL.FOLLOWING]:
      'Following',

    [TV_CATALOG_RAIL.RECENT_PURCHASES]:
      'Recent Purchases',

    [TV_CATALOG_RAIL.RECENTLY_VIEWED]:
      'Recently Viewed',

    [TV_CATALOG_RAIL.FEATURED]:
      'Featured',

    [TV_CATALOG_RAIL.RECENT_PUBLIC]:
      'Recent Public Content',

    [TV_CATALOG_RAIL.CREATORS]:
      'Creators',
  });

const UNAVAILABLE_CODES =
  Object.freeze([
    'catalog_unavailable',
    'gateway_unconfigured',
    'gateway_unreachable',
  ]);

function isRecord(
  value,
) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}

function boundedText(
  value,
  maximum,
  {
    required = false,
  } = {},
) {
  if (
    typeof value !== 'string'
  ) {
    return required
      ? null
      : '';
  }

  const text =
    value.trim();

  if (
    (!text && required) ||
    text.length > maximum
  ) {
    return null;
  }

  return text;
}

function validTimestamp(
  value,
) {
  if (
    typeof value !== 'string' ||
    value.length > 40 ||
    !/^\d{4}-\d{2}-\d{2}T/.test(
      value,
    )
  ) {
    return false;
  }

  return Number.isFinite(
    Date.parse(value),
  );
}

function reviewRoute(
  crabUrl,
) {
  const route =
    resolveTvRouteInput(
      crabUrl,
      {
        requireCrabScheme: true,
      },
    );

  if (
    route.kind ===
      TV_ROUTE_RESULT_KIND.PROBLEM ||
    route.kind ===
      TV_ROUTE_RESULT_KIND.NOT_FOUND
  ) {
    return null;
  }

  if (
    route.owner !== 'asset' &&
    route.owner !== 'site'
  ) {
    return null;
  }

  return route;
}

function normalizeThumbnail(
  value,
) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return null;
  }

  const route =
    reviewRoute(value);

  if (
    !route ||
    route.owner !== 'asset' ||
    route.assetKind !== 'image'
  ) {
    return undefined;
  }

  return route.normalized;
}

function normalizeProgress(
  value,
) {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  if (
    !Number.isInteger(value) ||
    value < 0 ||
    value > 100
  ) {
    return undefined;
  }

  return value;
}

function normalizeItem(
  value,
) {
  if (
    !isRecord(value)
  ) {
    return null;
  }

  const id =
    boundedText(
      value.id,
      80,
      {
        required: true,
      },
    );

  if (
    !id ||
    !/^[a-zA-Z0-9._:-]+$/.test(
      id,
    )
  ) {
    return null;
  }

  const title =
    boundedText(
      value.title,
      120,
      {
        required: true,
      },
    );

  const subtitle =
    boundedText(
      value.subtitle,
      180,
    );

  if (
    !title ||
    subtitle === null
  ) {
    return null;
  }

  const route =
    reviewRoute(
      value.crabUrl,
    );

  if (!route) {
    return null;
  }

  const expectedKind =
    route.owner === 'site'
      ? 'creator'
      : 'content';

  if (
    value.kind !==
    expectedKind
  ) {
    return null;
  }

  const thumbnailCrabUrl =
    normalizeThumbnail(
      value.thumbnailCrabUrl,
    );

  if (
    thumbnailCrabUrl ===
    undefined
  ) {
    return null;
  }

  const progressPercent =
    normalizeProgress(
      value.progressPercent,
    );

  if (
    progressPercent ===
    undefined
  ) {
    return null;
  }

  return Object.freeze({
    id,

    kind:
      expectedKind,

    crabUrl:
      route.normalized,

    title,

    subtitle,

    thumbnailCrabUrl,

    progressPercent,
  });
}

function normalizeRail(
  value,
) {
  if (
    !isRecord(value) ||
    !Object.hasOwn(
      RAIL_LABELS,
      value.id,
    ) ||
    !Array.isArray(
      value.items,
    ) ||
    value.items.length >
      TV_CATALOG_MAX_ITEMS_PER_RAIL
  ) {
    return undefined;
  }

  const items = [];

  for (
    const item
    of value.items
  ) {
    const normalized =
      normalizeItem(item);

    if (!normalized) {
      return undefined;
    }

    items.push(
      normalized,
    );
  }

  if (
    items.length === 0
  ) {
    return null;
  }

  return Object.freeze({
    id:
      value.id,

    label:
      RAIL_LABELS[value.id],

    items:
      Object.freeze(items),
  });
}

export function normalizeTvCatalogResponse(
  value,
) {
  if (
    !isRecord(value) ||
    value.schema !==
      TV_CATALOG_SCHEMA ||
    !validTimestamp(
      value.generatedAt,
    ) ||
    !Array.isArray(
      value.rails,
    ) ||
    value.rails.length >
      TV_CATALOG_MAX_RAILS
  ) {
    return null;
  }

  const railIds =
    new Set();

  const rails = [];

  for (
    const rail
    of value.rails
  ) {
    const normalized =
      normalizeRail(rail);

    if (
      normalized ===
      undefined
    ) {
      return null;
    }

    if (
      normalized ===
      null
    ) {
      continue;
    }

    if (
      railIds.has(
        normalized.id,
      )
    ) {
      return null;
    }

    railIds.add(
      normalized.id,
    );

    rails.push(
      normalized,
    );
  }

  return Object.freeze({
    schema:
      TV_CATALOG_SCHEMA,

    generatedAt:
      value.generatedAt,

    rails:
      Object.freeze(rails),
  });
}

export function createTvCatalogLoadingView() {
  return Object.freeze({
    kind:
      TV_CATALOG_VIEW_KIND.LOADING,

    rails:
      Object.freeze([]),
  });
}

export function createTvCatalogUnavailableView({
  code =
    'catalog_unavailable',

  retryable = false,
} = {}) {
  const safeCode =
    UNAVAILABLE_CODES.includes(
      code,
    )
      ? code
      : 'catalog_unavailable';

  return Object.freeze({
    kind:
      TV_CATALOG_VIEW_KIND.UNAVAILABLE,

    code:
      safeCode,

    retryable:
      retryable === true,

    rails:
      Object.freeze([]),
  });
}

export function projectTvCatalogResponse(
  value,
) {
  const catalog =
    normalizeTvCatalogResponse(
      value,
    );

  if (!catalog) {
    return Object.freeze({
      kind:
        TV_CATALOG_VIEW_KIND.MALFORMED,

      code:
        'catalog_response_malformed',

      rails:
        Object.freeze([]),
    });
  }

  if (
    catalog.rails.length === 0
  ) {
    return Object.freeze({
      kind:
        TV_CATALOG_VIEW_KIND.EMPTY,

      generatedAt:
        catalog.generatedAt,

      rails:
        catalog.rails,
    });
  }

  return Object.freeze({
    kind:
      TV_CATALOG_VIEW_KIND.READY,

    generatedAt:
      catalog.generatedAt,

    rails:
      catalog.rails,
  });
}
