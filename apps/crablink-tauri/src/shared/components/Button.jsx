/**
 * RO:WHAT — Shared CrabLink button with standardized visual, disabled, and busy states.
 * RO:WHY — FINAL_BETA Phase 2B2; adopts the shared interaction system while preserving caller-owned actions.
 * RO:INTERACTS — route pages, dialogs, state components, CopyButton, and designSystemFoundation.css.
 * RO:INVARIANTS — no side effects beyond caller-provided events; disabled or busy means no action.
 * RO:METRICS — none.
 * RO:CONFIG — variant, size, busy, busyLabel, disabled, type, and standard button props.
 * RO:SECURITY — no backend, Passport, wallet, receipt, or ledger authority internally.
 * RO:TEST — phase2bSharedStates.test.mjs and focused frontend build.
 * FINAL_BETA_PHASE2B2_SHARED_STATES_V1
 */

export default function Button({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  type = 'button',
  busy = false,
  busyLabel = 'Working…',
  disabled = false,
  ...props
}) {
  const classes = [
    'cl-button',
    `cl-button-${variant}`,
    `cl-button-${size}`,
    busy ? 'is-busy' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      className={classes}
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...props}
    >
      {busy && (
        <span
          className="cl-button-busy-mark"
          aria-hidden="true"
        />
      )}

      <span className="cl-button-label">
        {busy
          ? busyLabel
          : children}
      </span>
    </button>
  );
}
