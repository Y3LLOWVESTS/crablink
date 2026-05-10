/**
 * RO:WHAT — Shared statistic/status chip for CrabLink route panels.
 * RO:WHY — App Integration; Concerns: DX; standardizes stats such as tags, links, completeness, balance, and policy counts.
 * RO:INTERACTS — local creator routes, profile/wallet summaries, future asset pages.
 * RO:INVARIANTS — display only; caller owns truth and source labels.
 * RO:METRICS — none.
 * RO:CONFIG — label/value/help/tone/size props.
 * RO:SECURITY — never invents backend truth.
 * RO:TEST — visual/manual stat panel smoke.
 */

export default function StatChip({
  label = '',
  value = '',
  help = '',
  tone = 'neutral',
  size = 'md',
  className = '',
}) {
  return (
    <div
      className={['cl-stat-chip', `cl-stat-${tone}`, `cl-stat-${size}`, className]
        .filter(Boolean)
        .join(' ')}
    >
      <strong>{value}</strong>
      {label && <span>{label}</span>}
      {help && <small>{help}</small>}
    </div>
  );
}