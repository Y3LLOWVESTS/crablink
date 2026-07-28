/**
 * RO:WHAT — Projects bounded catalog thumbnail descriptors from already-reviewed catalog items.
 * RO:WHY — TV cards need truthful visual hints without adding image transport, arbitrary fetches, or fake artwork.
 * RO:INTERACTS — tvCatalogModel thumbnailCrabUrl and tvRouteRegistry image-route review.
 * RO:INVARIANTS — absent stays absent; only crab:// image asset routes become thumbnail descriptors.
 * RO:SECURITY — no invoke, fetch, storage, wallet, ledger, receipt, reward, ROC, entitlement, or finality authority.
 * RO:TEST — tvCatalogThumbnailModel.test.mjs and check-crablink-tv-catalog-thumbnail-boundary.mjs.
 */

import {
  TV_ROUTE_RESULT_KIND,
  resolveTvRouteInput,
} from '../navigation/tvRouteRegistry.js';

export const TV_CATALOG_THUMBNAIL_SCHEMA =
  'crablink.tv.catalog-thumbnail.v1';

export const TV_CATALOG_THUMBNAIL_KIND =
  Object.freeze({
    ABSENT:
      'absent',

    IMAGE_ROUTE:
      'image-route',
  });

export const TV_CATALOG_THUMBNAIL_LIMITS =
  Object.freeze({
    MAX_ROUTE_BYTES:
      192,

    PREVIEW_CHARS:
      12,
  });

function frozenThumbnail(
  value,
) {
  return Object.freeze({
    schema:
      TV_CATALOG_THUMBNAIL_SCHEMA,

    ...value,
  });
}

function absentThumbnail() {
  return frozenThumbnail({
    kind:
      TV_CATALOG_THUMBNAIL_KIND.ABSENT,

    route:
      null,

    preview:
      'No image',

    ariaLabel:
      'No reviewed thumbnail image',
  });
}

function fitsRouteLimit(
  route,
) {
  return (
    new TextEncoder()
      .encode(route)
      .length <=
    TV_CATALOG_THUMBNAIL_LIMITS.MAX_ROUTE_BYTES
  );
}

function routePreview(
  route,
) {
  return route
    .replace(
      /^crab:\/\//u,
      '',
    )
    .slice(
      0,
      TV_CATALOG_THUMBNAIL_LIMITS.PREVIEW_CHARS,
    );
}

export function projectTvCatalogThumbnail(
  item,
) {
  const thumbnailCrabUrl =
    item?.thumbnailCrabUrl;

  if (
    thumbnailCrabUrl === null ||
    thumbnailCrabUrl === undefined ||
    thumbnailCrabUrl === ''
  ) {
    return absentThumbnail();
  }

  if (
    typeof thumbnailCrabUrl !== 'string'
  ) {
    return absentThumbnail();
  }

  const reviewed =
    resolveTvRouteInput(
      thumbnailCrabUrl,
      {
        requireCrabScheme:
          true,
      },
    );

  if (
    reviewed.kind !==
      TV_ROUTE_RESULT_KIND.READY ||
    reviewed.owner !== 'asset' ||
    reviewed.assetKind !== 'image' ||
    !fitsRouteLimit(
      reviewed.normalized,
    )
  ) {
    return absentThumbnail();
  }

  const preview =
    routePreview(
      reviewed.normalized,
    );

  return frozenThumbnail({
    kind:
      TV_CATALOG_THUMBNAIL_KIND.IMAGE_ROUTE,

    route:
      reviewed.normalized,

    preview,

    ariaLabel:
      `Reviewed image thumbnail ${preview}`,
  });
}
