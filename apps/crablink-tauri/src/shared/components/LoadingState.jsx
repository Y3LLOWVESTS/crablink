/**
 * RO:WHAT — Shared loading state composed from the canonical state and skeleton primitives.
 * RO:WHY — FINAL_BETA Phase 2B2; replaces the legacy card-specific loader with one consistent pending state.
 * RO:INTERACTS — route suspense, AssetResolver, gateway hydration, LoadingSkeleton, and designSystemFoundation.css.
 * RO:INVARIANTS — display only; no invented content, backend truth, receipt, reward, or wallet mutation.
 * RO:METRICS — none.
 * RO:CONFIG — title, copy, detail, skeletonCount, compact, and className.
 * RO:SECURITY — text-only trusted React rendering; no raw response body or secret material.
 * RO:TEST — phase2bSharedStates.test.mjs and focused frontend build.
 * FINAL_BETA_PHASE2B2_SHARED_STATES_V1
 */

import LoadingSkeleton from './LoadingSkeleton.jsx';

export default function LoadingState({
  title = 'Loading',
  copy = 'Preparing this CrabLink surface.',
  detail = '',
  skeletonCount = 3,
  compact = false,
  className = '',
}) {
  const classes = [
    'cl-state',
    'cl-state-loading',
    compact ? 'cl-state-compact' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section
      className={classes}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span
        className="cl-state-icon cl-loading-mark"
        aria-hidden="true"
      >
        <span />
      </span>

      <div className="cl-loading-copy">
        <p className="cl-eyebrow">
          Loading
        </p>

        <h2>{title}</h2>

        {copy && (
          <p className="cl-state-copy">
            {copy}
          </p>
        )}

        {detail && (
          <small className="cl-loading-detail">
            {detail}
          </small>
        )}
      </div>

      <LoadingSkeleton
        variant="line"
        count={skeletonCount}
        label={`${title} progress`}
        className="cl-loading-skeleton"
      />
    </section>
  );
}
