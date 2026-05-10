/**
 * RO:WHAT — React scaffold component for extensions/chrome/src/shared/components/FilePicker.jsx.
 * RO:WHY — CrabLink refactor; gives this UI surface a single clear owner.
 * RO:INTERACTS — App shell, route registry, shared components, and page-local CSS.
 * RO:INVARIANTS — no fake backend truth; no silent ROC spend; no direct internal-service calls.
 * RO:METRICS — none yet.
 * RO:CONFIG — app context/settings when wired.
 * RO:SECURITY — render trusted UI only; untrusted crab content belongs in sandboxed surfaces.
 * RO:TEST — component and route smoke tests once implemented.
 */

export default function FilePicker() {
  return (
    <section className="cl-card cl-scaffold-card">
      <p className="cl-eyebrow">Scaffold</p>
      <h1>FilePicker</h1>
      <p>extensions/chrome/src/shared/components/FilePicker.jsx</p>
    </section>
  );
}
