/**
 * RO:WHAT — Visible TV creator-browse panel projected from the reviewed catalog creator rail.
 * RO:WHY — Lets remote users browse creators without adding new gateway or native authority.
 * RO:INTERACTS — useTvCreatorBrowse, tvCreatorBrowseModel, and existing catalog card route handoff.
 * RO:INVARIANTS — cards come from browseView.creators only; search is local; select returns to the originating focus key.
 * RO:SECURITY — no native invoke, fetch, storage, payment, receipt, reward, or settlement behavior.
 * RO:TEST — TvCreatorBrowsePanel.source.test.mjs and check-crablink-tv-creator-browse-react-boundary.mjs.
 */

import {
  TV_CREATOR_BROWSE_KIND,
} from './tvCreatorBrowseModel.js';

function creatorBrowseStatusLabel(
  browseView,
) {
  return browseView.kind ===
    TV_CREATOR_BROWSE_KIND.READY
    ? 'Creators ready'
    : 'No creators';
}

function creatorBrowseBody(
  browseView,
  query,
) {
  if (
    browseView.kind ===
    TV_CREATOR_BROWSE_KIND.READY
  ) {
    return query.trim().length > 0
      ? 'Showing matching creators from the reviewed catalog view.'
      : 'Showing creators from the reviewed catalog creator rail.';
  }

  return query.trim().length > 0
    ? 'No reviewed creators matched this local search.'
    : 'Load the Home catalog to populate reviewed creator rows.';
}

function creatorItemFromBrowseCreator(
  creator,
) {
  return Object.freeze({
    id:
      creator.id,

    kind:
      'creator',

    crabUrl:
      creator.profileCrabUrl,

    title:
      creator.title,

    subtitle:
      creator.subtitle,
  });
}

export function TvCreatorBrowsePanel({
  browseView,
  query,
  onQueryChange,
  onClearQuery,
  onCreator,
}) {
  const creators =
    Array.isArray(
      browseView.creators,
    )
      ? browseView.creators
      : [];

  return (
    <section
      className="tv-creator-browse"
      aria-labelledby="tv-creator-browse-title"
    >
      <div className="tv-section-heading tv-creator-browse__heading">
        <div>
          <p className="tv-card-label">
            Creator browse
          </p>

          <h2 id="tv-creator-browse-title">
            Catalog creators
          </h2>

          <p className="tv-creator-browse__copy">
            {creatorBrowseBody(
              browseView,
              query,
            )}
          </p>
        </div>

        <span
          className="tv-creator-browse__status"
          aria-live="polite"
        >
          {creatorBrowseStatusLabel(
            browseView,
          )}
        </span>
      </div>

      <div className="tv-creator-search">
        <label htmlFor="tv-creator-search-input">
          Search reviewed creators
        </label>

        <div className="tv-creator-search__controls">
          <input
            id="tv-creator-search-input"
            type="search"
            inputMode="search"
            autoComplete="off"
            value={query}
            maxLength={64}
            data-tv-focusable="true"
            data-tv-focus-key="creator-browse-search"
            onChange={(event) => {
              onQueryChange(
                event.target.value,
              );
            }}
          />

          <button
            className="tv-action tv-action--secondary"
            type="button"
            data-tv-focusable="true"
            data-tv-focus-key="creator-browse-clear"
            disabled={query.length === 0}
            onClick={onClearQuery}
          >
            Clear
          </button>
        </div>
      </div>

      {creators.length > 0 ? (
        <div className="tv-creator-grid">
          {creators.map((creator) => {
            const focusKey =
              `creator-browse-${creator.siteName}`;

            return (
              <button
                key={creator.profileCrabUrl}
                className="tv-creator-card"
                type="button"
                data-tv-focusable="true"
                data-tv-focus-key={focusKey}
                aria-label={`${creator.title}. ${creator.subtitle}`}
                onClick={() => {
                  onCreator(
                    creatorItemFromBrowseCreator(
                      creator,
                    ),
                    focusKey,
                  );
                }}
              >
                <span className="tv-creator-card__eyebrow">
                  Creator
                </span>

                <strong>{creator.title}</strong>

                <span>{creator.subtitle}</span>

                <small>{creator.profileCrabUrl}</small>
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
