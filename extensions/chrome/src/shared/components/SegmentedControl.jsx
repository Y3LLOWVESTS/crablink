/**
 * RO:WHAT — Shared segmented control for Builder/Developer and route sub-mode toggles.
 * RO:WHY — App Integration; Concerns: DX; avoids repeated toggle button markup across pages.
 * RO:INTERACTS — local draft pages, shell settings, future manifest/developer panels.
 * RO:INVARIANTS — local UI state only; no backend mutation.
 * RO:METRICS — none.
 * RO:CONFIG — options/value/onChange/ariaLabel props.
 * RO:SECURITY — no privileged action; caller decides meaning of selected value.
 * RO:TEST — manual Builder/Developer toggle smoke.
 */

export default function SegmentedControl({
  options = [],
  value = '',
  onChange = null,
  ariaLabel = 'View mode',
  className = '',
  size = 'md',
}) {
  return (
    <div
      className={['cl-segmented-control', `cl-segmented-${size}`, className]
        .filter(Boolean)
        .join(' ')}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const optionValue = typeof option === 'string' ? option : option.value;
        const label = typeof option === 'string' ? option : option.label;
        const disabled = typeof option === 'object' && Boolean(option.disabled);
        const active = optionValue === value;

        return (
          <button
            key={optionValue}
            type="button"
            className={active ? 'is-active' : ''}
            disabled={disabled}
            aria-pressed={active}
            onClick={() => {
              if (!disabled && typeof onChange === 'function') {
                onChange(optionValue);
              }
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}