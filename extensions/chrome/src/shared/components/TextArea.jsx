/**
 * RO:WHAT — Shared CrabLink multi-line text input.
 * RO:WHY — App Integration; Concerns: DX; keeps creator draft text areas consistent.
 * RO:INTERACTS — Field.jsx and route-local form state.
 * RO:INVARIANTS — controlled/uncontrolled input only; no validation truth or backend mutation.
 * RO:METRICS — none.
 * RO:CONFIG — rows/size/className props.
 * RO:SECURITY — does not render user text as HTML.
 * RO:TEST — visual/manual form smoke.
 */

export default function TextArea({
  className = '',
  size = 'md',
  rows = 4,
  spellCheck = true,
  ...props
}) {
  return (
    <textarea
      className={['cl-textarea', `cl-textarea-${size}`, className].filter(Boolean).join(' ')}
      rows={rows}
      spellCheck={spellCheck}
      {...props}
    />
  );
}