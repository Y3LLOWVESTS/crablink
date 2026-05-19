/**
 * RO:WHAT — Shared truth-boundary notice component.
 * RO:WHY — App Integration; Concerns: SEC/DX/GOV; keeps local draft state distinct from backend truth.
 * RO:INTERACTS — route pages, problem/not-found views, future manifest builders.
 * RO:INVARIANTS — never claims publication, payment, ownership, CID, or receipt truth unless supplied by backend.
 * RO:METRICS — none.
 * RO:CONFIG — tone/title/copy props.
 * RO:SECURITY — communicates safety boundaries clearly.
 * RO:TEST — visual/manual route smoke.
 */

const TONE_LABELS = {
  info: 'Info',
  warning: 'Warning',
  danger: 'Important',
  success: 'Verified',
};

export default function TruthBoundary({
  title = 'Truth boundary',
  copy,
  tone = 'info',
  children,
}) {
  const safeTone = TONE_LABELS[tone] ? tone : 'info';

  return (
    <aside className={`cl-truth-boundary cl-truth-${safeTone}`}>
      <div className="cl-truth-label">{TONE_LABELS[safeTone]}</div>
      <div>
        <h2>{title}</h2>
        {copy && <p>{copy}</p>}
        {children}
      </div>
    </aside>
  );
}