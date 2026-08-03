/**
 * Controlled Crab address and search field.
 *
 * Parsing, history, search, and navigation remain caller-owned. The placeholder
 * intentionally names no concrete route because Phase 3 owns route semantics.
 *
 * FINAL_BETA_PHASE2C2_SHELL_PRIMITIVES_V2
 */

import Button from './Button.jsx';

export default function CrabAddressField({
  value = '',
  onChange = null,
  onSubmit = null,
  onBack = null,
  onForward = null,
  canGoBack = false,
  canGoForward = false,
  label = 'Crab address or search',
  placeholder = 'Enter a Crab address or search',
  submitLabel = 'Go',
  busy = false,
  disabled = false,
  className = '',
}) {
  return (
    <form
      className={[
        'cl-crab-address-field',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="search"
      onSubmit={(event) => {
        event.preventDefault();

        if (
          !disabled &&
          !busy
        ) {
          onSubmit?.(
            value,
            event,
          );
        }
      }}
    >
      <div className="cl-address-history-actions">
        <Button
          variant="ghost"
          size="sm"
          aria-label="Go back"
          disabled={
            disabled ||
            !canGoBack
          }
          onClick={onBack}
        >
          ←
        </Button>

        <Button
          variant="ghost"
          size="sm"
          aria-label="Go forward"
          disabled={
            disabled ||
            !canGoForward
          }
          onClick={onForward}
        >
          →
        </Button>
      </div>

      <label className="cl-address-input-shell">
        <span className="cl-visually-hidden">
          {label}
        </span>

        <span
          className="cl-address-scheme"
          aria-hidden="true"
        >
          crab
        </span>

        <input
          className="cl-address-input"
          type="text"
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck="false"
          onChange={(event) => {
            onChange?.(
              event.target.value,
              event,
            );
          }}
        />
      </label>

      <Button
        variant="primary"
        size="sm"
        type="submit"
        busy={busy}
        busyLabel="Opening…"
        disabled={disabled}
      >
        {submitLabel}
      </Button>
    </form>
  );
}
