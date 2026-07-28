/**
 * RO:WHAT — Projects creator browsing rows from the reviewed Home catalog view.
 * RO:WHY — Creator browsing should reuse catalog proofing and TV route ownership before adding a visible creator surface.
 * RO:INTERACTS — tvCatalogModel creator rail and tvRouteRegistry site-route review.
 * RO:INVARIANTS — READY catalog only; creator rail only; creator cards only; crab:// site routes only; no synthetic creators.
 * RO:SECURITY — no invoke, fetch, storage, wallet, ledger, receipt, reward, ROC, entitlement, or finality authority.
 * RO:TEST — tvCreatorBrowseModel.test.mjs and check-crablink-tv-creator-browse-boundary.mjs.
 */

import {
  TV_CATALOG_RAIL,
  TV_CATALOG_VIEW_KIND,
} from './tvCatalogModel.js';

import {
  TV_ROUTE_RESULT_KIND,
  resolveTvRouteInput,
} from '../navigation/tvRouteRegistry.js';

export const TV_CREATOR_BROWSE_SCHEMA =
  'crablink.tv.creator-browse.v1';

export const TV_CREATOR_BROWSE_KIND =
  Object.freeze({
    EMPTY:
      'empty',

    READY:
      'ready',
  });

export const TV_CREATOR_BROWSE_LIMITS =
  Object.freeze({
    MAX_CREATORS:
      32,

    MAX_TITLE_BYTES:
      96,

    MAX_SUBTITLE_BYTES:
      180,

    MAX_QUERY_BYTES:
      64,
  });

function freezeArray(
  values,
) {
  return Object.freeze(
    values.map(
      (value) =>
        Object.freeze(value),
    ),
  );
}

function utf8Trim(
  value,
  fallback,
  maxBytes,
) {
  const text =
    typeof value === 'string'
      ? value.trim()
      : '';

  const candidate =
    text.length > 0
      ? text
      : fallback;

  const encoder =
    new TextEncoder();

  let output = '';

  for (const char of candidate) {
    const next =
      output + char;

    if (
      encoder.encode(next).length >
      maxBytes
    ) {
      break;
    }

    output = next;
  }

  return output;
}

function normalizeQuery(
  value,
) {
  return utf8Trim(
    value,
    '',
    TV_CREATOR_BROWSE_LIMITS.MAX_QUERY_BYTES,
  )
    .toLowerCase();
}

function creatorSearchBlob(
  creator,
) {
  return [
    creator.title,
    creator.subtitle,
    creator.siteName,
    creator.profileCrabUrl,
  ]
    .join(' ')
    .toLowerCase();
}

function creatorFromCatalogItem(
  item,
) {
  if (
    !item ||
    item.kind !== 'creator'
  ) {
    return null;
  }

  const reviewed =
    resolveTvRouteInput(
      item.crabUrl,
      {
        requireCrabScheme:
          true,
      },
    );

  if (
    reviewed.kind !==
      TV_ROUTE_RESULT_KIND.READY ||
    reviewed.owner !== 'site'
  ) {
    return null;
  }

  return Object.freeze({
    id:
      utf8Trim(
        item.id,
        reviewed.siteName,
        96,
      ),

    title:
      utf8Trim(
        item.title,
        reviewed.siteName,
        TV_CREATOR_BROWSE_LIMITS.MAX_TITLE_BYTES,
      ),

    subtitle:
      utf8Trim(
        item.subtitle,
        'Public creator profile',
        TV_CREATOR_BROWSE_LIMITS.MAX_SUBTITLE_BYTES,
      ),

    siteName:
      reviewed.siteName,

    profileCrabUrl:
      reviewed.normalized,
  });
}

function readyCreatorRails(
  catalogView,
) {
  if (
    !catalogView ||
    catalogView.kind !==
      TV_CATALOG_VIEW_KIND.READY ||
    !Array.isArray(
      catalogView.rails,
    )
  ) {
    return [];
  }

  return catalogView.rails.filter(
    (rail) =>
      rail &&
      rail.id ===
        TV_CATALOG_RAIL.CREATORS &&
      Array.isArray(
        rail.items,
      ),
  );
}

function dedupeCreators(
  creators,
) {
  const byProfile =
    new Map();

  for (const creator of creators) {
    if (
      !byProfile.has(
        creator.profileCrabUrl,
      )
    ) {
      byProfile.set(
        creator.profileCrabUrl,
        creator,
      );
    }
  }

  return [
    ...byProfile.values(),
  ];
}

function sortCreators(
  creators,
) {
  return creators.sort(
    (left, right) =>
      left.title.localeCompare(
        right.title,
        'en',
        {
          sensitivity:
            'base',
        },
      ) ||
      left.siteName.localeCompare(
        right.siteName,
        'en',
        {
          sensitivity:
            'base',
        },
      ),
  );
}

function createCreatorBrowseView(
  creators,
) {
  const frozenCreators =
    freezeArray(
      creators,
    );

  return Object.freeze({
    schema:
      TV_CREATOR_BROWSE_SCHEMA,

    kind:
      frozenCreators.length > 0
        ? TV_CREATOR_BROWSE_KIND.READY
        : TV_CREATOR_BROWSE_KIND.EMPTY,

    creators:
      frozenCreators,
  });
}

export function projectTvCreatorBrowseFromCatalog(
  catalogView,
  {
    query = '',
    maxCreators =
      TV_CREATOR_BROWSE_LIMITS.MAX_CREATORS,
  } = {},
) {
  const normalizedQuery =
    normalizeQuery(
      query,
    );

  const safeLimit =
    Number.isInteger(maxCreators) &&
    maxCreators > 0
      ? Math.min(
          maxCreators,
          TV_CREATOR_BROWSE_LIMITS.MAX_CREATORS,
        )
      : TV_CREATOR_BROWSE_LIMITS.MAX_CREATORS;

  const creators =
    readyCreatorRails(
      catalogView,
    )
      .flatMap(
        (rail) =>
          rail.items,
      )
      .map(
        creatorFromCatalogItem,
      )
      .filter(Boolean);

  const filtered =
    normalizedQuery.length > 0
      ? creators.filter(
          (creator) =>
            creatorSearchBlob(
              creator,
            ).includes(
              normalizedQuery,
            ),
        )
      : creators;

  return createCreatorBrowseView(
    sortCreators(
      dedupeCreators(
        filtered,
      ),
    )
      .slice(
        0,
        safeLimit,
      ),
  );
}

export function searchTvCreatorBrowse(
  browseView,
  query,
) {
  if (
    !browseView ||
    !Array.isArray(
      browseView.creators,
    )
  ) {
    return createCreatorBrowseView([]);
  }

  const normalizedQuery =
    normalizeQuery(
      query,
    );

  if (
    normalizedQuery.length === 0
  ) {
    return createCreatorBrowseView(
      [...browseView.creators],
    );
  }

  return createCreatorBrowseView(
    browseView.creators.filter(
      (creator) =>
        creatorSearchBlob(
          creator,
        ).includes(
          normalizedQuery,
        ),
    ),
  );
}
