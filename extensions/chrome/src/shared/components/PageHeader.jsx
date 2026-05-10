/**
 * RO:WHAT — Shared page header for CrabLink route-owned pages.
 * RO:WHY — App Integration; Concerns: DX; gives every built-in page a consistent professional opening section.
 * RO:INTERACTS — pages/* and shared action components.
 * RO:INVARIANTS — presentational only; no backend truth or wallet mutation.
 * RO:METRICS — none.
 * RO:CONFIG — title/copy/actions props.
 * RO:SECURITY — no untrusted HTML.
 * RO:TEST — visual/manual route smoke.
 */

export default function PageHeader({ eyebrow = '', title, copy = '', actions = null, meta = null }) {
  return (
    <header className="cl-page-header">
      <div>
        {eyebrow && <p className="cl-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {copy && <p className="cl-page-copy">{copy}</p>}
        {meta && <div className="cl-page-meta">{meta}</div>}
      </div>

      {actions && <div className="cl-page-actions">{actions}</div>}
    </header>
  );
}