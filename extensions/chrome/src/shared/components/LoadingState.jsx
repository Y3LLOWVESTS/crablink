/**
 * RO:WHAT — Shared loading state for route-owned React pages.
 * RO:WHY — CrabLink refactor; replaces scaffold loading UI with a clear, theme-safe pending state.
 * RO:INTERACTS — App route suspense fallback, AssetResolver, future protected route hydrators.
 * RO:INVARIANTS — display only; no backend truth, CID, receipt, or wallet mutation.
 * RO:METRICS — none.
 * RO:CONFIG — title/copy/detail props.
 * RO:SECURITY — no untrusted HTML; text-only render.
 * RO:TEST — manual route smoke while routes lazy-load or resolve through gateway.
 */

export default function LoadingState({
  title = 'Loading',
  copy = 'Preparing this CrabLink surface.',
  detail = '',
  className = '',
}) {
  return (
    <section
      className={['cl-card cl-loading-state', className].filter(Boolean).join(' ')}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="cl-loading-mark" aria-hidden="true">
        <span />
      </div>

      <div>
        <p className="cl-eyebrow">Working</p>
        <h2>{title}</h2>
        {copy && <p>{copy}</p>}
        {detail && <small>{detail}</small>}
      </div>
    </section>
  );
}