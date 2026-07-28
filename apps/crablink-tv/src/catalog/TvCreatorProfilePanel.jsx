/**
 * RO:WHAT — Visible TV creator profile page for reviewed creator catalog selections.
 * RO:WHY — Provides a real creator destination while gateway-backed profile hydration is still deferred.
 * RO:INTERACTS — tvCreatorProfileModel and TvApp selection state.
 * RO:INVARIANTS — renders READY creator profiles only; Close returns to Home-side browsing context.
 * RO:SECURITY — no invoke, fetch, storage, wallet, ledger, receipt, reward, ROC, entitlement, or finality authority.
 * RO:TEST — TvCreatorProfilePanel.source.test.mjs and check-crablink-tv-creator-profile-boundary.mjs.
 */

import {
  TV_CREATOR_PROFILE_KIND,
} from './tvCreatorProfileModel.js';

import {
  TV_CREATOR_PROFILE_FOCUS_KIND,
  TV_CREATOR_PROFILE_FOCUS_REASON,
} from './tvCreatorProfileFocusModel.js';

function creatorProfileFocusCopy(
  focusRequest,
) {
  if (
    focusRequest?.kind !==
    TV_CREATOR_PROFILE_FOCUS_KIND.RETURN
  ) {
    return null;
  }

  if (
    focusRequest.reason ===
    TV_CREATOR_PROFILE_FOCUS_REASON.PROFILE_OPENED
  ) {
    return 'Profile opened. Focus is parked on the close control.';
  }

  if (
    focusRequest.reason ===
    TV_CREATOR_PROFILE_FOCUS_REASON.CATALOG_REFRESH
  ) {
    return 'Catalog refresh requested. Focus will return to the reviewed control.';
  }

  if (
    focusRequest.reason ===
    TV_CREATOR_PROFILE_FOCUS_REASON.PROFILE_CLOSED
  ) {
    return 'Profile close requested. Focus will return to the originating creator card.';
  }

  return 'Focus return is ready.';
}

export function TvCreatorProfilePanel({
  profileView,
  focusRequest,
  onClose,
}) {
  if (
    profileView?.kind !==
    TV_CREATOR_PROFILE_KIND.READY
  ) {
    return null;
  }

  const focusCopy =
    creatorProfileFocusCopy(
      focusRequest,
    );

  return (
    <section
      className="tv-creator-profile-page"
      aria-labelledby="tv-creator-profile-title"
      data-tv-creator-profile-kind={profileView.kind}
    >
      <div className="tv-section-heading tv-creator-profile-page__heading">
        <div>
          <p className="tv-card-label">
            Creator profile
          </p>

          <h2 id="tv-creator-profile-title">
            {profileView.title}
          </h2>

          <p className="tv-creator-profile-page__copy">
            {profileView.subtitle}
          </p>
        </div>

        <button
          className="tv-action tv-action--secondary"
          type="button"
          data-tv-focusable="true"
          data-tv-focus-key="creator-profile-close"
          onClick={() => {
            onClose(
              profileView.returnFocusKey,
            );
          }}
        >
          Back to creators
        </button>
      </div>

      <div className="tv-creator-profile-card">
        <span className="tv-creator-profile-card__label">
          Reviewed route
        </span>

        <strong>{profileView.siteName}</strong>

        <code>{profileView.profileCrabUrl}</code>

        <p>
          Gateway-backed creator hydration is not active in this
          build. This page only confirms the reviewed local creator
          route and keeps selection return state.
        </p>
      </div>

      {focusCopy ? (
        <div
          className="tv-creator-profile-status tv-creator-profile-status--return"
          data-tv-profile-focus-kind={focusRequest.kind}
        >
          <span className="tv-creator-profile-status__label">
            Return focus target
          </span>

          <strong className="tv-creator-profile-status__value">
            {focusRequest.focusKey}
          </strong>

          <p>{focusCopy}</p>

          <span
            className="tv-creator-profile-status__label"
            data-tv-profile-focus-reason={focusRequest.reason}
          >
            profile-focus-refresh
          </span>
        </div>
      ) : null}
    </section>
  );
}
