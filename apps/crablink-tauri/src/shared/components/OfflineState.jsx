/**
 * RO:WHAT — Shared offline or unreachable-network state.
 * RO:WHY — FINAL_BETA Phase 2; clearly distinguishes cached/local viewing from fresh network hydration.
 * RO:INTERACTS — feed, profile, site, media, gateway-backed pages, Button, and designSystemFoundation.css.
 * RO:INVARIANTS — offline state never claims fresh delivery, creator reward, receipt, ledger truth, or QuickChain finality.
 * RO:METRICS — none.
 * RO:CONFIG — title, copy, cachedAt, retry action, and compact.
 * RO:SECURITY — display only; no network mutation or cached entitlement grant.
 * RO:TEST — designSystemFoundation.test.mjs.
 */

import Button from './Button.jsx';

export default function OfflineState({
  title = 'You appear to be offline',
  copy =
    'Previously verified local content may remain available, but fresh network updates cannot be confirmed.',
  cachedAt = '',
  retryLabel = 'Check connection',
  onRetry = null,
  compact = false,
  className = '',
}) {
  const classes = [
    'cl-state',
    'cl-state-offline',
    compact ? 'cl-state-compact' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section
      className={classes}
      role="status"
    >
      <span
        className="cl-state-icon"
        aria-hidden="true"
      >
        ↯
      </span>

      <h2>{title}</h2>

      <p className="cl-state-copy">
        {copy}
      </p>

      {cachedAt && (
        <dl className="cl-state-detail">
          <dt>Cached content</dt>
          <dd>{cachedAt}</dd>
        </dl>
      )}

      {onRetry && (
        <div className="cl-state-actions">
          <Button
            variant="secondary"
            onClick={onRetry}
          >
            {retryLabel}
          </Button>
        </div>
      )}
    </section>
  );
}
