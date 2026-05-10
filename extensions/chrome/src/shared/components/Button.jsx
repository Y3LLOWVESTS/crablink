/**
 * RO:WHAT — Shared CrabLink button component.
 * RO:WHY — App Integration; Concerns: DX; keeps actions visually consistent across route-owned pages.
 * RO:INTERACTS — pages/* and shared UI components.
 * RO:INVARIANTS — no side effects beyond caller-provided events; disabled means no action.
 * RO:METRICS — none.
 * RO:CONFIG — variant and size props.
 * RO:SECURITY — no backend or wallet action internally.
 * RO:TEST — visual/manual component smoke.
 */

export default function Button({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  type = 'button',
  ...props
}) {
  const classes = ['cl-button', `cl-button-${variant}`, `cl-button-${size}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={classes} type={type} {...props}>
      {children}
    </button>
  );
}