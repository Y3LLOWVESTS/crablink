/**
 * RO:WHAT — Shared explicit confirmation dialog.
 * RO:WHY — FINAL_BETA Phase 2; creates a consistent confirmation boundary for destructive and economic user intent.
 * RO:INTERACTS — Button, modal layering, route-owned confirmation state, and designSystemFoundation.css.
 * RO:INVARIANTS — caller owns mutation; dialog never performs background action; cancel remains available while not busy.
 * RO:METRICS — none.
 * RO:CONFIG — open, title, copy, labels, tone, busy, confirm/cancel callbacks, and children.
 * RO:SECURITY — no silent spend, no automatic confirmation, no secret collection, and no raw backend content.
 * RO:TEST — designSystemFoundation.test.mjs and future interaction tests.
 */

import Button from './Button.jsx';

export default function ConfirmDialog({
  open = false,
  title,
  copy = '',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'primary',
  busy = false,
  onConfirm,
  onCancel,
  children = null,
}) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="cl-confirm-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !busy
        ) {
          onCancel?.();
        }
      }}
    >
      <section
        className="cl-confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cl-confirm-title"
        aria-describedby={
          copy
            ? 'cl-confirm-copy'
            : undefined
        }
      >
        <header className="cl-confirm-header">
          <h2 id="cl-confirm-title">
            {title}
          </h2>
        </header>

        <div className="cl-confirm-body">
          {copy && (
            <p id="cl-confirm-copy">
              {copy}
            </p>
          )}

          {children}
        </div>

        <footer className="cl-confirm-actions">
          <Button
            variant="secondary"
            disabled={busy}
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>

          <Button
            variant={
              tone === 'danger'
                ? 'danger'
                : 'primary'
            }
            disabled={busy}
            aria-busy={busy}
            onClick={onConfirm}
          >
            {busy
              ? 'Working…'
              : confirmLabel}
          </Button>
        </footer>
      </section>
    </div>
  );
}
