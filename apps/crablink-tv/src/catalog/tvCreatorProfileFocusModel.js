/**
 * RO:WHAT — Builds bounded focus-return requests for the TV creator profile surface.
 * RO:WHY — Closing a creator profile or refreshing the catalog should return remote focus predictably.
 * RO:INTERACTS — TvApp, TvCreatorProfilePanel, and data-tv-focus-key controls.
 * RO:INVARIANTS — only safe focus keys are accepted; unsafe input falls back to creator browse search.
 * RO:SECURITY — no invoke, fetch, timers, storage, wallet, ledger, receipt, reward, ROC, entitlement, or finality authority.
 * RO:TEST — tvCreatorProfileFocusModel.test.mjs and check-crablink-tv-creator-profile-focus-boundary.mjs.
 */

export const TV_CREATOR_PROFILE_FOCUS_SCHEMA =
  'crablink.tv.creator-profile-focus.v1';

export const TV_CREATOR_PROFILE_FOCUS_KIND =
  Object.freeze({
    NONE:
      'none',

    RETURN:
      'return',
  });

export const TV_CREATOR_PROFILE_FOCUS_REASON =
  Object.freeze({
    PROFILE_OPENED:
      'profile-opened',

    PROFILE_CLOSED:
      'profile-closed',

    CATALOG_REFRESH:
      'catalog-refresh',
  });

export const TV_CREATOR_PROFILE_FOCUS_LIMITS =
  Object.freeze({
    MAX_FOCUS_KEY_CHARS:
      128,

    FALLBACK_FOCUS_KEY:
      'creator-browse-search',
  });

const SAFE_FOCUS_KEY =
  /^[a-z0-9][a-z0-9._:-]{0,127}$/iu;

function freezeRequest(
  value,
) {
  return Object.freeze({
    schema:
      TV_CREATOR_PROFILE_FOCUS_SCHEMA,

    ...value,
  });
}

export function normalizeTvCreatorProfileFocusKey(
  value,
  fallback =
    TV_CREATOR_PROFILE_FOCUS_LIMITS.FALLBACK_FOCUS_KEY,
) {
  const candidate =
    typeof value === 'string'
      ? value.trim()
      : '';

  if (
    candidate.length > 0 &&
    candidate.length <=
      TV_CREATOR_PROFILE_FOCUS_LIMITS.MAX_FOCUS_KEY_CHARS &&
    SAFE_FOCUS_KEY.test(candidate)
  ) {
    return candidate;
  }

  const fallbackCandidate =
    typeof fallback === 'string'
      ? fallback.trim()
      : TV_CREATOR_PROFILE_FOCUS_LIMITS.FALLBACK_FOCUS_KEY;

  return SAFE_FOCUS_KEY.test(fallbackCandidate)
    ? fallbackCandidate.slice(
        0,
        TV_CREATOR_PROFILE_FOCUS_LIMITS.MAX_FOCUS_KEY_CHARS,
      )
    : TV_CREATOR_PROFILE_FOCUS_LIMITS.FALLBACK_FOCUS_KEY;
}

export function createIdleTvCreatorProfileFocusRequest() {
  return freezeRequest({
    kind:
      TV_CREATOR_PROFILE_FOCUS_KIND.NONE,

    focusKey:
      null,

    reason:
      null,
  });
}

export function createTvCreatorProfileFocusRequest({
  returnFocusKey,
  reason =
    TV_CREATOR_PROFILE_FOCUS_REASON.PROFILE_CLOSED,
  fallbackFocusKey =
    TV_CREATOR_PROFILE_FOCUS_LIMITS.FALLBACK_FOCUS_KEY,
} = {}) {
  const focusKey =
    normalizeTvCreatorProfileFocusKey(
      returnFocusKey,
      fallbackFocusKey,
    );

  return freezeRequest({
    kind:
      TV_CREATOR_PROFILE_FOCUS_KIND.RETURN,

    focusKey,

    reason:
      Object.values(
        TV_CREATOR_PROFILE_FOCUS_REASON,
      ).includes(reason)
        ? reason
        : TV_CREATOR_PROFILE_FOCUS_REASON.PROFILE_CLOSED,
  });
}
