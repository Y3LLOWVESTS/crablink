/**
 * RO:WHAT — Projects a bounded local TV creator profile page from a reviewed catalog creator route.
 * RO:WHY — Creator cards should open a visible profile surface instead of only a generic detail overlay.
 * RO:INTERACTS — tvRouteRegistry, tvCreatorBrowseModel, TvCreatorProfilePanel, and TvApp.
 * RO:INVARIANTS — only catalog creator items with reviewed crab:// site routes become profile pages.
 * RO:SECURITY — no invoke, fetch, storage, wallet, ledger, receipt, reward, ROC, entitlement, or finality authority.
 * RO:TEST — tvCreatorProfileModel.test.mjs and check-crablink-tv-creator-profile-boundary.mjs.
 */

import {
  TV_ROUTE_RESULT_KIND,
  resolveTvRouteInput,
} from '../navigation/tvRouteRegistry.js';

export const TV_CREATOR_PROFILE_SCHEMA =
  'crablink.tv.creator-profile.v1';

export const TV_CREATOR_PROFILE_KIND =
  Object.freeze({
    IDLE:
      'idle',

    READY:
      'ready',

    REJECTED:
      'rejected',
  });

export const TV_CREATOR_PROFILE_LIMITS =
  Object.freeze({
    TITLE_CHARS:
      96,

    SUBTITLE_CHARS:
      160,

    ROUTE_CHARS:
      192,

    FOCUS_KEY_CHARS:
      128,
  });

function freeze(
  value,
) {
  return Object.freeze({
    schema:
      TV_CREATOR_PROFILE_SCHEMA,

    ...value,
  });
}

function boundedText(
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

function boundedFocusKey(
  value,
) {
  return boundedText(
    value,
    'creator-browse-search',
    TV_CREATOR_PROFILE_LIMITS.FOCUS_KEY_CHARS,
  );
}

export function createIdleTvCreatorProfile() {
  return freeze({
    kind:
      TV_CREATOR_PROFILE_KIND.IDLE,

    title:
      'No creator selected',

    subtitle:
      'Choose a reviewed creator from the Home catalog.',

    siteName:
      null,

    profileCrabUrl:
      null,

    returnFocusKey:
      'creator-browse-search',
  });
}

function rejectedProfile(
  code,
  returnFocusKey,
) {
  return freeze({
    kind:
      TV_CREATOR_PROFILE_KIND.REJECTED,

    title:
      'Creator profile unavailable',

    subtitle:
      'The selected catalog card was not a reviewed creator profile route.',

    siteName:
      null,

    profileCrabUrl:
      null,

    code:
      boundedText(
        code,
        'TV_CREATOR_PROFILE_REJECTED',
        96,
      ),

    returnFocusKey,
  });
}

export function projectTvCreatorProfile(
  item,
  {
    initiatingFocusKey =
      'creator-browse-search',
  } = {},
) {
  const returnFocusKey =
    boundedFocusKey(
      initiatingFocusKey,
    );

  if (
    item?.kind !== 'creator'
  ) {
    return rejectedProfile(
      'TV_CREATOR_PROFILE_CARD_KIND_REJECTED',
      returnFocusKey,
    );
  }

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
      TV_ROUTE_RESULT_KIND.READY ||
    reviewed.owner !== 'site'
  ) {
    return rejectedProfile(
      reviewed?.code ??
        'TV_CREATOR_PROFILE_ROUTE_REJECTED',
      returnFocusKey,
    );
  }

  const title =
    boundedText(
      item?.title,
      reviewed.siteName,
      TV_CREATOR_PROFILE_LIMITS.TITLE_CHARS,
    );

  const subtitle =
    boundedText(
      item?.subtitle,
      `Creator route ${reviewed.siteName}`,
      TV_CREATOR_PROFILE_LIMITS.SUBTITLE_CHARS,
    );

  return freeze({
    kind:
      TV_CREATOR_PROFILE_KIND.READY,

    title,

    subtitle,

    siteName:
      reviewed.siteName,

    profileCrabUrl:
      boundedText(
        reviewed.normalized,
        item?.crabUrl,
        TV_CREATOR_PROFILE_LIMITS.ROUTE_CHARS,
      ),

    route:
      Object.freeze({
        ...reviewed,
      }),

    returnFocusKey,
  });
}
