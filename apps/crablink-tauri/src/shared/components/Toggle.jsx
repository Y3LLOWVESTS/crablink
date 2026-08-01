/**
 * RO:WHAT — Shared accessible controlled switch for CrabLink preferences and explicit user choices.
 * RO:WHY — FINAL_BETA Phase 2B1; replaces the legacy scaffold with a real keyboard-operable control.
 * RO:INTERACTS — caller-owned settings state, form labels, and designSystemFoundation.css.
 * RO:INVARIANTS — controlled input only; changing it invokes only the supplied callback.
 * RO:METRICS — none.
 * RO:CONFIG — checked, onChange, label, description, disabled, name, value, id, and className.
 * RO:SECURITY — no persistence, network request, Passport change, wallet action, or hidden authority.
 * RO:TEST — phase2bInteractivePrimitives.test.mjs and focused frontend build.
 * FINAL_BETA_PHASE2B1_INTERACTIVE_PRIMITIVES_V1
 */

import {
  useId,
} from 'react';

export default function Toggle({
  checked = false,
  onChange = null,
  label = '',
  description = '',
  disabled = false,
  name = '',
  value = 'on',
  id = '',
  className = '',
}) {
  const generatedId = useId();

  const controlId =
    id || generatedId;

  const descriptionId =
    description
      ? `${controlId}-description`
      : undefined;

  return (
    <label
      className={[
        'cl-toggle',
        checked ? 'is-checked' : '',
        disabled ? 'is-disabled' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      htmlFor={controlId}
    >
      <input
        id={controlId}
        className="cl-toggle-input"
        type="checkbox"
        role="switch"
        name={name || undefined}
        value={value}
        checked={Boolean(checked)}
        disabled={disabled}
        aria-checked={Boolean(checked)}
        aria-describedby={descriptionId}
        onChange={(event) => {
          onChange?.(
            event.target.checked,
            event,
          );
        }}
      />

      <span
        className="cl-toggle-track"
        aria-hidden="true"
      >
        <span className="cl-toggle-thumb" />
      </span>

      {(label || description) && (
        <span className="cl-toggle-copy">
          {label && (
            <span className="cl-toggle-label">
              {label}
            </span>
          )}

          {description && (
            <span
              id={descriptionId}
              className="cl-toggle-description"
            >
              {description}
            </span>
          )}
        </span>
      )}
    </label>
  );
}
