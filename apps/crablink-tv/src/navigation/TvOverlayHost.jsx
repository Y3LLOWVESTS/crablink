import {
  TV_OVERLAY_KIND,
  normalizeTvOverlayState,
} from './tvOverlayBackModel.js';

export function TvOverlayHost({
  state,
  onClose,
}) {
  const overlay =
    normalizeTvOverlayState(state);

  if (
    overlay.overlayKind ===
    TV_OVERLAY_KIND.NONE
  ) {
    return null;
  }

  const problem =
    overlay.overlayKind ===
    TV_OVERLAY_KIND.PROBLEM;

  return (
    <div
      className="tv-overlay-backdrop"
      data-tv-focus-scope="active"
    >
      <section
        className={
          `tv-overlay ` +
          `tv-overlay--${overlay.overlayKind}`
        }
        role="dialog"
        aria-modal="true"
        aria-labelledby="tv-overlay-title"
        aria-describedby="tv-overlay-body"
        data-tv-overlay-kind={
          overlay.overlayKind
        }
      >
        <p className="tv-card-label">
          {problem
            ? 'CrabLink TV problem'
            : 'CrabLink TV detail'}
        </p>

        <h2 id="tv-overlay-title">
          {overlay.title}
        </h2>

        <p
          id="tv-overlay-body"
          className="tv-overlay-body"
        >
          {overlay.body}
        </p>

        {problem && overlay.code ? (
          <p className="tv-overlay-code">
            <span>Problem code</span>
            <code>{overlay.code}</code>
          </p>
        ) : null}

        <div className="tv-overlay-actions">
          <button
            className="tv-action tv-action--primary"
            type="button"
            data-tv-focusable="true"
            data-tv-focus-key="overlay-close"
            data-tv-autofocus="true"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </section>
    </div>
  );
}
