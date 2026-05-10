/**
 * RO:WHAT — Shared CrabLink single-line text input.
 * RO:WHY — App Integration; Concerns: DX; keeps route forms visually consistent.
 * RO:INTERACTS — Field.jsx and route-local form state.
 * RO:INVARIANTS — controlled/uncontrolled input only; no validation truth or backend mutation.
 * RO:METRICS — none.
 * RO:CONFIG — standard input props plus size/className.
 * RO:SECURITY — does not execute or interpret input values.
 * RO:TEST — visual/manual form smoke.
 */

export default function TextInput({
  className = '',
  size = 'md',
  spellCheck = false,
  type = 'text',
  ...props
}) {
  return (
    <input
      className={['cl-input', `cl-input-${size}`, className].filter(Boolean).join(' ')}
      spellCheck={spellCheck}
      type={type}
      {...props}
    />
  );
}