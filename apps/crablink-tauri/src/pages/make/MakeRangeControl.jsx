/**
 * RO:WHAT — Shared range field component for crab://make controls.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; prevents repeated control markup inside MakePage.jsx.
 * RO:INTERACTS — MakePage.jsx, MakeCutoutCard future split, shared Field component.
 * RO:INVARIANTS — UI input only; caller owns state validation and side effects.
 * RO:METRICS — none.
 * RO:CONFIG — local slider min/max/step/value props.
 * RO:SECURITY — no secrets, no native authority, no backend mutation.
 * RO:TEST — npm run build; manual cutout/background slider smoke.
 */

import Field from '../../shared/components/Field.jsx';

export default function MakeRangeControl({
  disabled = false,
  help = '',
  label,
  max,
  min,
  onChange,
  step = 1,
  suffix = '',
  value,
}) {
  return (
    <Field label={label} help={help || `${value}${suffix}`}>
      <div className="make-range-control">
        <input
          className="make-range-input"
          disabled={disabled}
          max={max}
          min={min}
          step={step}
          type="range"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <strong className="make-range-value">{value}{suffix}</strong>
      </div>
    </Field>
  );
}


