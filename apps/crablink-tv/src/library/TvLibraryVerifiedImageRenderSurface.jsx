/**
 * RO:WHAT — Renders an already-verified image object URL on the TV Library detail surface.
 * RO:WHY — Phase 9N adds the first real image render slot without adding fetch or object URL authority to React.
 * RO:INTERACTS — tvLibraryVerifiedImageRenderSurfaceModel and TvLibraryAssetDetailPanel.
 * RO:INVARIANTS — displays only projected ready surfaces; inactive states remain truthful.
 * RO:SECURITY — no fetch, invoke, Blob construction, URL creation/revocation, storage, or economic authority.
 * RO:TEST — TvLibraryVerifiedImageRenderSurface.source.test.mjs and Phase 9N boundary.
 */

import {
  TV_LIBRARY_VERIFIED_IMAGE_RENDER_SURFACE_STATE,
} from './tvLibraryVerifiedImageRenderSurfaceModel.js';

export function TvLibraryVerifiedImageRenderSurface({
  renderSurfaceView,
}) {
  const state =
    renderSurfaceView?.state ??
    TV_LIBRARY_VERIFIED_IMAGE_RENDER_SURFACE_STATE.IDLE;

  const ready =
    state ===
      TV_LIBRARY_VERIFIED_IMAGE_RENDER_SURFACE_STATE.READY &&
    renderSurfaceView?.ready === true &&
    typeof renderSurfaceView.objectUrl === 'string';

  return (
    <div
      className="tv-library-verified-image-surface"
      data-tv-library-verified-image-render-state={state}
      aria-live="polite"
    >
      <div className="tv-library-verified-image-surface__status">
        <span>Verified image surface</span>

        <strong>
          {ready
            ? 'Image ready'
            : state ===
                TV_LIBRARY_VERIFIED_IMAGE_RENDER_SURFACE_STATE.REJECTED
              ? 'Image surface rejected'
              : 'Image surface waiting'}
        </strong>
      </div>

      {ready ? (
        <figure className="tv-library-verified-image-surface__frame">
          <img
            className="tv-library-verified-image-surface__image"
            src={renderSurfaceView.objectUrl}
            alt={renderSurfaceView.altText}
            decoding="async"
            loading="eager"
            referrerPolicy="no-referrer"
          />

          <figcaption className="tv-library-verified-image-surface__caption">
            <span>{renderSurfaceView.contentType}</span>
            <code>{renderSurfaceView.cid}</code>
          </figcaption>
        </figure>
      ) : (
        <p className="tv-library-verified-image-surface__placeholder">
          {renderSurfaceView?.message ??
            'Verified image rendering is waiting for an active object URL handoff.'}
        </p>
      )}
    </div>
  );
}
