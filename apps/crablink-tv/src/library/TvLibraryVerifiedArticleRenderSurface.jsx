/**
 * RO:WHAT — Renders a safe verified article/text surface on the TV Library detail page.
 * RO:WHY — Phase 9P completes the non-image verified content surface without unsafe HTML injection.
 * RO:INTERACTS — tvLibraryVerifiedArticleRenderSurfaceModel and TvLibraryAssetDetailPanel.
 * RO:INVARIANTS — renders only projected paragraphs; rejected/idle states stay truthful.
 * RO:SECURITY — no fetch, invoke, Blob construction, object URL authority, unsafe HTML injection, storage, or economic authority.
 * RO:TEST — TvLibraryVerifiedArticleRenderSurface.source.test.mjs and Phase 9P boundary.
 */

import {
  TV_LIBRARY_VERIFIED_ARTICLE_RENDER_SURFACE_STATE,
} from './tvLibraryVerifiedArticleRenderSurfaceModel.js';

export function TvLibraryVerifiedArticleRenderSurface({
  renderSurfaceView,
}) {
  const state =
    renderSurfaceView?.state ??
    TV_LIBRARY_VERIFIED_ARTICLE_RENDER_SURFACE_STATE.IDLE;

  const ready =
    state ===
      TV_LIBRARY_VERIFIED_ARTICLE_RENDER_SURFACE_STATE.READY &&
    renderSurfaceView?.ready === true &&
    Array.isArray(renderSurfaceView.paragraphs);

  return (
    <section
      className="tv-library-verified-article-surface"
      data-tv-library-verified-article-render-state={state}
      aria-live="polite"
    >
      <div className="tv-library-verified-article-surface__status">
        <span>Verified article surface</span>

        <strong>
          {ready
            ? renderSurfaceView.title
            : state ===
                TV_LIBRARY_VERIFIED_ARTICLE_RENDER_SURFACE_STATE.REJECTED
              ? 'Article surface rejected'
              : 'Article surface waiting'}
        </strong>
      </div>

      {ready ? (
        <article className="tv-library-verified-article-surface__reader">
          <div className="tv-library-verified-article-surface__meta">
            <span>{renderSurfaceView.contentType}</span>
            <code>{renderSurfaceView.cid}</code>
          </div>

          {renderSurfaceView.paragraphs.map(
            (paragraph, index) => (
              <p
                key={`${renderSurfaceView.cid}-${index}`}
                className="tv-library-verified-article-surface__paragraph"
              >
                {paragraph}
              </p>
            ),
          )}
        </article>
      ) : (
        <p className="tv-library-verified-article-surface__placeholder">
          {renderSurfaceView?.message ??
            'Verified article rendering is waiting for ready verified bytes.'}
        </p>
      )}
    </section>
  );
}
