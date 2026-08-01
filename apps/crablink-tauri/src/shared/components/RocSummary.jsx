/**
 * RO:WHAT — Shared confirmed-ROC summary surface.
 * RO:WHY — FINAL_BETA Phase 2C1; keeps confirmed, pending, stale, offline, and refresh posture visually distinct.
 * RO:INTERACTS — backend-derived wallet/ledger adapters, shell utility status, wallet pages, and receipt views.
 * RO:INVARIANTS — confirmed and pending labels come from caller-owned backend truth; cached data cannot unlock content or become economic authority.
 * RO:SECURITY — display and explicit refresh action only; no direct wallet, ledger, ROX, bridge, staking, liquidity, or settlement mutation.
 * RO:TEST — phase2cProductPrimitives.test.mjs.
 * FINAL_BETA_PHASE2C1_PRODUCT_PRIMITIVES_V1
 */

import Button from './Button.jsx';

export default function RocSummary({
  confirmedLabel = '—',
  pendingLabel = '',
  sourceLabel = '',
  updatedLabel = '',
  stale = false,
  offline = false,
  refreshing = false,
  onRefresh = null,
  className = '',
}) {
  return (
    <section
      className={[
        'cl-roc-summary',
        stale ? 'is-stale' : '',
        offline ? 'is-offline' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Confirmed ROC summary"
    >
      <div>
        <p className="cl-eyebrow">
          Confirmed ROC
        </p>

        <strong className="cl-roc-summary-value">
          {confirmedLabel}
        </strong>

        {pendingLabel && (
          <p className="cl-roc-summary-pending">
            Pending: {pendingLabel}
          </p>
        )}
      </div>

      <div className="cl-roc-summary-status">
        {offline && (
          <span className="cl-status-pill is-pending">
            Offline
          </span>
        )}

        {stale && (
          <span className="cl-product-label">
            Stale
          </span>
        )}

        {sourceLabel && (
          <span>{sourceLabel}</span>
        )}

        {updatedLabel && (
          <span>{updatedLabel}</span>
        )}

        {onRefresh && (
          <Button
            variant="secondary"
            size="sm"
            busy={refreshing}
            busyLabel="Refreshing…"
            onClick={onRefresh}
          >
            Refresh
          </Button>
        )}
      </div>
    </section>
  );
}
