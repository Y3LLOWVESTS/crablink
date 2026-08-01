/**
 * RO:WHAT — Shared accessible modal for trusted CrabLink application UI.
 * RO:WHY — FINAL_BETA Phase 2B1; replaces the legacy scaffold with a real caller-controlled overlay.
 * RO:INTERACTS — route-owned state, Button, shell modal surfaces, and designSystemFoundation.css.
 * RO:INVARIANTS — closed means no render; dismissal never confirms an action; caller owns all mutations.
 * RO:METRICS — none.
 * RO:CONFIG — open, title, eyebrow, children, actions, close label, dismissible, busy, onClose, and className.
 * RO:SECURITY — trusted React children only; no raw HTML, network access, secret collection, wallet action, or silent confirmation.
 * RO:TEST — phase2bInteractivePrimitives.test.mjs and focused frontend build.
 * FINAL_BETA_PHASE2B1_INTERACTIVE_PRIMITIVES_V1
 */

import {
  useEffect,
  useId,
  useRef,
} from 'react';

import Button from './Button.jsx';

export default function Modal({
  open = false,
  title,
  eyebrow = '',
  children,
  actions = null,
  closeLabel = 'Close',
  dismissible = true,
  busy = false,
  onClose = null,
  className = '',
}) {
  const generatedId = useId();
  const titleId = `${generatedId}-title`;
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousFocus =
      document.activeElement;

    dialogRef.current?.focus();

    return () => {
      previousFocus?.focus?.();
    };
  }, [open]);

  if (!open) {
    return null;
  }

  function requestClose() {
    if (
      dismissible &&
      !busy
    ) {
      onClose?.();
    }
  }

  return (
    <div
      className="cl-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          requestClose();
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          requestClose();
        }
      }}
    >
      <section
        ref={dialogRef}
        className={[
          'cl-modal',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <header className="cl-modal-header">
          <div>
            {eyebrow && (
              <p className="cl-eyebrow">
                {eyebrow}
              </p>
            )}

            <h2 id={titleId}>
              {title}
            </h2>
          </div>

          {dismissible && (
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              aria-label={closeLabel}
              onClick={requestClose}
            >
              ×
            </Button>
          )}
        </header>

        <div className="cl-modal-body">
          {children}
        </div>

        {(actions || dismissible) && (
          <footer className="cl-modal-actions">
            {actions}

            {dismissible && !actions && (
              <Button
                variant="secondary"
                disabled={busy}
                onClick={requestClose}
              >
                {closeLabel}
              </Button>
            )}
          </footer>
        )}
      </section>
    </div>
  );
}
