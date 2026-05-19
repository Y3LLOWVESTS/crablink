/**
 * RO:WHAT — Shared row/wrap of page actions for CrabLink route pages.
 * RO:WHY — App Integration; Concerns: DX; standardizes action placement for copy, clear, preview, prepare, publish, and debug controls.
 * RO:INTERACTS — Button, CopyButton, route pages, future paid confirmation flows.
 * RO:INVARIANTS — layout only; actions are caller-provided; no silent ROC spend or backend mutation.
 * RO:METRICS — none.
 * RO:CONFIG — align/density/className props.
 * RO:SECURITY — caller must gate paid/destructive actions explicitly.
 * RO:TEST — visual/manual route action smoke.
 */

export default function ActionBar({
  children,
  className = '',
  align = 'end',
  density = 'normal',
  label = 'Page actions',
}) {
  return (
    <div
      className={[
        'cl-action-bar',
        `cl-action-align-${align}`,
        `cl-action-density-${density}`,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={label}
    >
      {children}
    </div>
  );
}