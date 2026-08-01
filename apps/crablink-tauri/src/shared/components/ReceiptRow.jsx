/**
 * RO:WHAT — Shared receipt-list row for backend-derived receipt summaries.
 * RO:WHY — FINAL_BETA Phase 2C1; standardizes pending, confirmed, failed, stale, and source labels.
 * RO:INTERACTS — receipt adapters, receipt list/detail routes, paid content, and design-system tokens.
 * RO:INVARIANTS — values and statuses are display facts supplied by the caller; no payment success or entitlement is inferred.
 * RO:SECURITY — no wallet mutation, retry mutation, balance claim, receipt fabrication, or raw secret display.
 * RO:TEST — phase2cProductPrimitives.test.mjs.
 * FINAL_BETA_PHASE2C1_PRODUCT_PRIMITIVES_V1
 */

import Button from './Button.jsx';

export default function ReceiptRow({
  title = 'Receipt',
  amountLabel = '',
  status = 'pending',
  statusLabel = '',
  sourceLabel = '',
  timeLabel = '',
  stale = false,
  onOpen = null,
  className = '',
}) {
  const normalizedStatus =
    normalizeStatus(status);

  return (
    <article
      className={[
        'cl-receipt-row',
        `is-${normalizedStatus}`,
        stale ? 'is-stale' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="cl-receipt-row-main">
        <div>
          <p className="cl-receipt-row-title">
            {title}
          </p>

          {(sourceLabel || timeLabel) && (
            <p className="cl-receipt-row-meta">
              {sourceLabel && (
                <span>{sourceLabel}</span>
              )}

              {sourceLabel && timeLabel && (
                <span aria-hidden="true">·</span>
              )}

              {timeLabel && (
                <span>{timeLabel}</span>
              )}
            </p>
          )}
        </div>

        {amountLabel && (
          <strong className="cl-receipt-row-amount">
            {amountLabel}
          </strong>
        )}
      </div>

      <div className="cl-receipt-row-status">
        <span
          className={[
            'cl-status-pill',
            `is-${normalizedStatus}`,
          ].join(' ')}
        >
          {statusLabel ||
            defaultStatusLabel(
              normalizedStatus,
            )}
        </span>

        {stale && (
          <span className="cl-product-label">
            Stale
          </span>
        )}

        {onOpen && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpen}
          >
            View
          </Button>
        )}
      </div>
    </article>
  );
}

function normalizeStatus(status) {
  const value = String(
    status || '',
  ).toLowerCase();

  if (
    value === 'confirmed' ||
    value === 'failed' ||
    value === 'cancelled'
  ) {
    return value;
  }

  return 'pending';
}

function defaultStatusLabel(status) {
  return {
    confirmed: 'Confirmed',
    failed: 'Failed',
    cancelled: 'Cancelled',
    pending: 'Pending',
  }[status];
}
