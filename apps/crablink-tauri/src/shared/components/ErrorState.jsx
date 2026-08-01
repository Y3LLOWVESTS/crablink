/**
 * RO:WHAT — Shared normal-mode error-state component.
 * RO:WHY — FINAL_BETA Phase 2; presents actionable failure without exposing raw JSON or developer-only diagnostics.
 * RO:INTERACTS — route pages, Button actions, DeveloperDisclosure, and designSystemFoundation.css.
 * RO:INVARIANTS — visible failure, bounded public facts, no fake success, and no automatic retry mutation.
 * RO:METRICS — none.
 * RO:CONFIG — title, copy, reason, correlationId, retry action, secondary action, and compact.
 * RO:SECURITY — does not render arbitrary error objects, stacks, tokens, capabilities, or raw backend bodies.
 * RO:TEST — designSystemFoundation.test.mjs.
 */

import Button from './Button.jsx';

export default function ErrorState({
  title = 'Something went wrong',
  copy = 'CrabLink could not complete this request.',
  reason = '',
  correlationId = '',
  retryLabel = 'Try again',
  onRetry = null,
  secondaryAction = null,
  compact = false,
  className = '',
}) {
  const classes = [
    'cl-state',
    'cl-state-error',
    compact ? 'cl-state-compact' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const hasDetails =
    Boolean(reason) ||
    Boolean(correlationId);

  return (
    <section
      className={classes}
      role="alert"
    >
      <span
        className="cl-state-icon"
        aria-hidden="true"
      >
        !
      </span>

      <h2>{title}</h2>

      {copy && (
        <p className="cl-state-copy">
          {copy}
        </p>
      )}

      {hasDetails && (
        <dl className="cl-state-detail">
          {reason && (
            <>
              <dt>Reason</dt>
              <dd>{reason}</dd>
            </>
          )}

          {correlationId && (
            <>
              <dt>Reference</dt>
              <dd>{correlationId}</dd>
            </>
          )}
        </dl>
      )}

      {(onRetry || secondaryAction) && (
        <div className="cl-state-actions">
          {onRetry && (
            <Button
              variant="primary"
              onClick={onRetry}
            >
              {retryLabel}
            </Button>
          )}

          {secondaryAction}
        </div>
      )}
    </section>
  );
}
