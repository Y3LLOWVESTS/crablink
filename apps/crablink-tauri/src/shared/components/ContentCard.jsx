/**
 * RO:WHAT — Shared consumer-facing card for typed CrabLink content summaries.
 * RO:WHY — FINAL_BETA Phase 2C1; profiles, Home, Explore, Library, and templates need one visual content contract.
 * RO:INTERACTS — FeedCard, MediaCard, SiteCard, Button, typed route adapters, and designSystemFoundation.css.
 * RO:INVARIANTS — renders caller-supplied display facts only; does not infer ownership, entitlement, payment, verification, or publication truth.
 * RO:METRICS — none.
 * RO:CONFIG — kind, title, summary, creator, timeLabel, thumbnail, paidLabel, statusLabel, metadata, actions, and onOpen.
 * RO:SECURITY — React text and trusted React children only; no raw HTML, arbitrary URL fetch, or backend mutation.
 * RO:TEST — phase2cProductPrimitives.test.mjs.
 * FINAL_BETA_PHASE2C1_PRODUCT_PRIMITIVES_V1
 */

import Button from './Button.jsx';

export default function ContentCard({
  kind = 'Content',
  title,
  summary = '',
  creator = '',
  timeLabel = '',
  thumbnail = null,
  paidLabel = '',
  statusLabel = '',
  metadata = null,
  actions = null,
  openLabel = 'Open',
  onOpen = null,
  className = '',
  variant = 'content',
}) {
  const classes = [
    'cl-product-card',
    `cl-product-card-${variant}`,
    thumbnail ? 'has-media' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article className={classes}>
      {thumbnail && (
        <div className="cl-product-card-media">
          {thumbnail}
        </div>
      )}

      <div className="cl-product-card-content">
        <div className="cl-product-card-labels">
          <span className="cl-product-kind">
            {kind}
          </span>

          {paidLabel && (
            <span className="cl-product-label cl-product-label-paid">
              {paidLabel}
            </span>
          )}

          {statusLabel && (
            <span className="cl-product-label">
              {statusLabel}
            </span>
          )}
        </div>

        <h3 className="cl-product-card-title">
          {title}
        </h3>

        {summary && (
          <p className="cl-product-card-summary">
            {summary}
          </p>
        )}

        {(creator || timeLabel) && (
          <p className="cl-product-card-byline">
            {creator && (
              <span>{creator}</span>
            )}

            {creator && timeLabel && (
              <span aria-hidden="true">·</span>
            )}

            {timeLabel && (
              <span>{timeLabel}</span>
            )}
          </p>
        )}

        {metadata && (
          <div className="cl-product-card-meta">
            {metadata}
          </div>
        )}

        {(actions || onOpen) && (
          <div className="cl-product-card-actions">
            {actions}

            {onOpen && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onOpen}
              >
                {openLabel}
              </Button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
