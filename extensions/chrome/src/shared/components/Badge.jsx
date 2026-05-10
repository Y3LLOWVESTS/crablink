/**
 * RO:WHAT — Shared CrabLink status badge component.
 * RO:WHY — App Integration; Concerns: DX/SEC; keeps route kind, policy, feature-gate, and truth-state labels consistent.
 * RO:INTERACTS — route pages, cards, action bars, shell status surfaces.
 * RO:INVARIANTS — presentational only; no backend truth is created here.
 * RO:METRICS — none.
 * RO:CONFIG — tone, size, title, children props.
 * RO:SECURITY — renders trusted React text/children only.
 * RO:TEST — visual/manual component smoke through home and local creator routes.
 */

export default function Badge({
  children,
  className = '',
  tone = 'neutral',
  size = 'sm',
  title = '',
  uppercase = true,
}) {
  const classes = [
    'cl-badge',
    `cl-badge-${tone}`,
    `cl-badge-${size}`,
    uppercase ? 'is-uppercase' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} title={title || undefined}>
      {children}
    </span>
  );
}