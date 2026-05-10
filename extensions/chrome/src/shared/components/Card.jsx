/**
 * RO:WHAT — Shared CrabLink card component.
 * RO:WHY — App Integration; Concerns: DX; provides consistent spacing, headings, and page section layout.
 * RO:INTERACTS — route pages and shared components.
 * RO:INVARIANTS — presentational only; no backend truth or mutation.
 * RO:METRICS — none.
 * RO:CONFIG — title, eyebrow, actions props.
 * RO:SECURITY — renders React children only.
 * RO:TEST — visual/manual route smoke.
 */

export default function Card({ children, title = '', eyebrow = '', actions = null, className = '' }) {
  return (
    <section className={['cl-card', className].filter(Boolean).join(' ')}>
      {(eyebrow || title || actions) && (
        <header className="cl-card-head">
          <div>
            {eyebrow && <p className="cl-eyebrow">{eyebrow}</p>}
            {title && <h2>{title}</h2>}
          </div>
          {actions && <div className="cl-card-actions">{actions}</div>}
        </header>
      )}
      <div className="cl-card-body">{children}</div>
    </section>
  );
}