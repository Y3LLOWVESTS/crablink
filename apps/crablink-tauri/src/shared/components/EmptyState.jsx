/**
 * RO:WHAT — Shared user-facing empty-state component.
 * RO:WHY — FINAL_BETA Phase 2; replaces scaffold text with a reusable, meaningful no-content pattern.
 * RO:INTERACTS — route pages, shared Button actions, and designSystemFoundation.css.
 * RO:INVARIANTS — no invented content or backend truth; actions are caller-owned.
 * RO:METRICS — none.
 * RO:CONFIG — title, copy, icon, actions, compact, and className.
 * RO:SECURITY — trusted React content only; no HTML injection or authority.
 * RO:TEST — designSystemFoundation.test.mjs and route-level visual smoke.
 */

export default function EmptyState({
  title = 'Nothing here yet',
  copy = '',
  icon = '○',
  actions = null,
  compact = false,
  className = '',
}) {
  const classes = [
    'cl-state',
    'cl-state-empty',
    compact ? 'cl-state-compact' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={classes}>
      <span
        className="cl-state-icon"
        aria-hidden="true"
      >
        {icon}
      </span>

      <h2>{title}</h2>

      {copy && (
        <p className="cl-state-copy">
          {copy}
        </p>
      )}

      {actions && (
        <div className="cl-state-actions">
          {actions}
        </div>
      )}
    </section>
  );
}
