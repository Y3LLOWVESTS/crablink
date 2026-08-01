/**
 * RO:WHAT — Shared collapsed boundary for advanced and developer-only information.
 * RO:WHY — FINAL_BETA Phase 2; keeps normal mode readable while preserving explicit access to diagnostics.
 * RO:INTERACTS — proof, manifest, route, QuickChain, node, and advanced status surfaces.
 * RO:INVARIANTS — collapsed by default; normal labels remain understandable; disclosure adds no authority.
 * RO:METRICS — none.
 * RO:CONFIG — title, summary, children, open, and className.
 * RO:SECURITY — caller must still redact secrets; this component does not make unsafe data safe.
 * RO:TEST — designSystemFoundation.test.mjs.
 */

export default function DeveloperDisclosure({
  title = 'Advanced details',
  summary = '',
  children,
  open = false,
  className = '',
}) {
  return (
    <details
      className={[
        'cl-developer-disclosure',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      open={open}
    >
      <summary>
        <span>{title}</span>

        {summary && (
          <small>{summary}</small>
        )}
      </summary>

      <div className="cl-developer-disclosure-body">
        {children}
      </div>
    </details>
  );
}
