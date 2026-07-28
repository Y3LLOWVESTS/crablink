/**
 * RO:WHAT — Visible Home catalog panel for CrabLink TV.
 * RO:WHY — Shows reviewed catalog lifecycle states without synthetic rows or automatic network work.
 * RO:INTERACTS — useTvHomeCatalog and tvCatalogModel view kinds.
 * RO:INVARIANTS — load and refresh are explicit; cards are backend-derived only.
 * RO:SECURITY — display only; item Select opens a local bounded detail overlay.
 * RO:TEST — TvHomeCatalogPanel.source.test.mjs and check-crablink-tv-home-catalog-react-boundary.mjs.
 */

import {
  TV_CATALOG_VIEW_KIND,
} from './tvCatalogModel.js';

import {
  TV_CATALOG_THUMBNAIL_KIND,
  projectTvCatalogThumbnail,
} from './tvCatalogThumbnailModel.js';

function catalogStatusLabel(
  state,
) {
  if (state.loading) {
    return 'Loading catalog';
  }

  if (!state.loadAttempted) {
    return 'Catalog not loaded';
  }

  switch (state.view.kind) {
    case TV_CATALOG_VIEW_KIND.READY:
      return 'Catalog ready';

    case TV_CATALOG_VIEW_KIND.EMPTY:
      return 'Catalog empty';

    case TV_CATALOG_VIEW_KIND.MALFORMED:
      return 'Catalog rejected';

    case TV_CATALOG_VIEW_KIND.UNAVAILABLE:
      return 'Catalog unavailable';

    default:
      return 'Catalog waiting';
  }
}

function catalogStatusBody(
  state,
) {
  if (state.loading) {
    return 'Reading the fixed Home catalog command. No synthetic rails are displayed while the request is in flight.';
  }

  if (!state.loadAttempted) {
    return 'Press Load Home catalog to request the reviewed gateway catalog. This panel does not poll automatically.';
  }

  switch (state.view.kind) {
    case TV_CATALOG_VIEW_KIND.READY:
      return 'Rails below came from the reviewed catalog projection. Select an item for bounded local detail.';

    case TV_CATALOG_VIEW_KIND.EMPTY:
      return 'The gateway returned a valid empty catalog. No synthetic rows were invented.';

    case TV_CATALOG_VIEW_KIND.MALFORMED:
      return 'The catalog response did not pass local validation, so it was not rendered.';

    case TV_CATALOG_VIEW_KIND.UNAVAILABLE:
      return state.view.retryable
        ? 'The catalog is temporarily unavailable. You can retry manually.'
        : 'The catalog is unavailable for the current gateway posture.';

    default:
      return 'Catalog is waiting in a safe state.';
  }
}

function itemSummary(
  item,
) {
  return item.subtitle || item.crabUrl;
}

function CatalogCardThumbnail({
  item,
}) {
  const thumbnail =
    projectTvCatalogThumbnail(
      item,
    );

  const ready =
    thumbnail.kind ===
    TV_CATALOG_THUMBNAIL_KIND.IMAGE_ROUTE;

  return (
    <span
      className={`tv-catalog-thumbnail tv-catalog-thumbnail--${thumbnail.kind}`}
      data-thumbnail-kind={thumbnail.kind}
      aria-label={thumbnail.ariaLabel}
    >
      <span className="tv-catalog-thumbnail__mark">
        {ready ? 'IMG' : '—'}
      </span>

      <span className="tv-catalog-thumbnail__preview">
        {thumbnail.preview}
      </span>
    </span>
  );
}

export function TvHomeCatalogPanel({
  state,
  onLoad,
  onRefresh,
  onCatalogItem,
}) {
  const ready =
    state.view.kind === TV_CATALOG_VIEW_KIND.READY;

  const rails =
    ready
      ? state.view.rails
      : [];

  return (
    <section
      className="tv-home-catalog"
      aria-labelledby="tv-home-catalog-title"
    >
      <div className="tv-section-heading tv-home-catalog__heading">
        <div>
          <p className="tv-card-label">
            Home catalog
          </p>

          <h2 id="tv-home-catalog-title">
            Reviewed gateway rows
          </h2>

          <p className="tv-home-catalog__copy">
            {catalogStatusBody(state)}
          </p>
        </div>

        <span
          className="tv-home-catalog__status"
          aria-live="polite"
        >
          {catalogStatusLabel(state)}
        </span>
      </div>

      <div className="tv-catalog-actions">
        <button
          className="tv-action tv-action--primary"
          type="button"
          data-tv-focusable="true"
          data-tv-focus-key="home-catalog-load"
          disabled={state.loading}
          onClick={onLoad}
        >
          {state.loadAttempted
            ? 'Load again'
            : 'Load Home catalog'}
        </button>

        <button
          className="tv-action tv-action--secondary"
          type="button"
          data-tv-focusable="true"
          data-tv-focus-key="home-catalog-refresh"
          disabled={state.loading || !state.loadAttempted}
          onClick={onRefresh}
        >
          Refresh catalog
        </button>
      </div>

      {rails.length > 0 ? (
        <div className="tv-catalog-rails">
          {rails.map((rail) => (
            <section
              key={rail.id}
              className="tv-catalog-rail"
              aria-label={rail.label}
            >
              <div className="tv-catalog-rail__heading">
                <h3>{rail.label}</h3>
                <span>{rail.items.length} items</span>
              </div>

              <div className="tv-catalog-row">
                {rail.items.map((item) => {
                  const focusKey =
                    `catalog-${rail.id}-${item.id}`;

                  return (
                    <button
                      key={item.id}
                      className="tv-catalog-card"
                      type="button"
                      data-tv-focusable="true"
                      data-tv-focus-key={focusKey}
                      aria-label={`${item.title}. ${itemSummary(item)}`}
                      onClick={() => {
                        onCatalogItem(
                          item,
                          focusKey,
                        );
                      }}
                    >
                      <CatalogCardThumbnail
                        item={item}
                      />

                      <span className="tv-catalog-card__kind">
                        {item.kind}
                      </span>

                      <strong>{item.title}</strong>

                      <span>{itemSummary(item)}</span>

                      {item.progressPercent !== null ? (
                        <small>
                          {item.progressPercent}% watched
                        </small>
                      ) : (
                        <small>Press Select for details</small>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </section>
  );
}
