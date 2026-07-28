/**
 * RO:WHAT — Reviews catalog-card selections before TV navigation or detail overlays.
 * RO:WHY — Catalog cards are backend-derived, so their crab:// routes must be re-owned by the TV route registry before UI handoff.
 * RO:INTERACTS — tvRouteRegistry, tvRouteMetadata, TvHomeCatalogPanel, and TvApp overlay/navigation handlers.
 * RO:INVARIANTS — assets target Library; creator/site routes stay Home; section routes target approved sections; failures become typed problems.
 * RO:SECURITY — no invoke, fetch, storage, wallet, ledger, receipt, reward, ROC, entitlement, or finality authority.
 * RO:TEST — tvCatalogRouteHandoff.test.mjs and check-crablink-tv-catalog-route-handoff-boundary.mjs.
 */

import {
  TV_ROUTE_PROBLEM_CODE,
  TV_ROUTE_RESULT_KIND,
  resolveTvRouteInput,
} from '../navigation/tvRouteRegistry.js';

import {
  tvRouteLabel,
} from '../navigation/tvRouteMetadata.js';

export const TV_CATALOG_CARD_HANDOFF_KIND =
  Object.freeze({
    DETAIL:
      'detail',

    PROBLEM:
      'problem',
  });

export const TV_CATALOG_CARD_DEFAULT_SECTIONS =
  Object.freeze([
    'home',
    'earn',
    'library',
    'pair',
    'settings',
    'receipts',
  ]);

const FALLBACK_PROBLEM_CODE =
  TV_ROUTE_PROBLEM_CODE.TV_ROUTE_PROBLEM ??
  'TV_ROUTE_PROBLEM';

function frozenCopy(
  value,
) {
  return Object.freeze({
    ...value,
  });
}

function safeText(
  value,
  fallback,
  maxLength,
) {
  const text =
    typeof value === 'string'
      ? value.trim()
      : '';

  const candidate =
    text.length > 0
      ? text
      : fallback;

  return candidate.slice(
    0,
    maxLength,
  );
}

function safeFocusKey(
  value,
) {
  return safeText(
    value,
    'home-catalog-load',
    128,
  );
}

function sectionSet(
  value,
) {
  const source =
    Array.isArray(value) &&
    value.length > 0
      ? value
      : TV_CATALOG_CARD_DEFAULT_SECTIONS;

  return new Set(
    source
      .filter(
        (sectionId) =>
          typeof sectionId === 'string' &&
          /^[a-z][a-z0-9-]{0,31}$/.test(
            sectionId,
          ),
      ),
  );
}

function chooseTargetSection(
  reviewed,
  availableSections,
  fallbackSectionId,
) {
  const fallback =
    availableSections.has(
      fallbackSectionId,
    )
      ? fallbackSectionId
      : 'home';

  if (
    reviewed.owner === 'asset' &&
    availableSections.has('library')
  ) {
    return 'library';
  }

  if (
    reviewed.owner === 'site' &&
    availableSections.has('home')
  ) {
    return 'home';
  }

  if (
    reviewed.owner === 'section' &&
    availableSections.has(
      reviewed.sectionId,
    )
  ) {
    return reviewed.sectionId;
  }

  return availableSections.has(
    fallback,
  )
    ? fallback
    : 'home';
}

function buildDetailBody(
  item,
  reviewed,
) {
  const label =
    tvRouteLabel(
      reviewed.routeKind,
    );

  const subtitle =
    safeText(
      item?.subtitle,
      'Reviewed catalog card',
      180,
    );

  const route =
    safeText(
      reviewed.normalized,
      item?.crabUrl ?? 'crab://unknown',
      160,
    );

  return safeText(
    `${subtitle} Route: ${route}. Surface: ${label}.`,
    'Reviewed catalog route.',
    520,
  );
}

function buildProblem(
  item,
  reviewed,
  returnFocusKey,
) {
  const code =
    typeof reviewed?.code === 'string' &&
    reviewed.code.length > 0
      ? reviewed.code
      : FALLBACK_PROBLEM_CODE;

  return Object.freeze({
    kind:
      TV_CATALOG_CARD_HANDOFF_KIND.PROBLEM,

    overlay:
      Object.freeze({
        title:
          'Catalog card route rejected',

        body:
          'This catalog card route is not owned by CrabLink TV.',

        code,

        returnFocusKey,
      }),
  });
}

export function projectTvCatalogCardRouteHandoff(
  item,
  {
    availableSectionIds =
      TV_CATALOG_CARD_DEFAULT_SECTIONS,

    fallbackSectionId =
      'home',

    initiatingFocusKey =
      'home-catalog-load',
  } = {},
) {
  const returnFocusKey =
    safeFocusKey(
      initiatingFocusKey,
    );

  const reviewed =
    resolveTvRouteInput(
      item?.crabUrl,
      {
        requireCrabScheme:
          true,
      },
    );

  if (
    reviewed.kind !==
    TV_ROUTE_RESULT_KIND.READY
  ) {
    return buildProblem(
      item,
      reviewed,
      returnFocusKey,
    );
  }

  const availableSections =
    sectionSet(
      availableSectionIds,
    );

  const targetSectionId =
    chooseTargetSection(
      reviewed,
      availableSections,
      fallbackSectionId,
    );

  const title =
    safeText(
      item?.title,
      'Catalog item',
      96,
    );

  return Object.freeze({
    kind:
      TV_CATALOG_CARD_HANDOFF_KIND.DETAIL,

    targetSectionId,

    route:
      frozenCopy(
        reviewed,
      ),

    overlay:
      Object.freeze({
        title,

        body:
          buildDetailBody(
            item,
            reviewed,
          ),

        returnFocusKey,
      }),
  });
}
