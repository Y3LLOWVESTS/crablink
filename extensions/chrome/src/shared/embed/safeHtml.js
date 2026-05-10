/**
 * RO:WHAT — Safe HTML helper placeholder for CrabLink site rendering.
 * RO:WHY — Separates untrusted crab content handling from trusted shell UI.
 * RO:INTERACTS — sandboxFrame and site renderer.
 * RO:INVARIANTS — no arbitrary script execution; sanitizer rules must fail closed.
 * RO:METRICS — none.
 * RO:CONFIG — none.
 * RO:SECURITY — all untrusted HTML must be sanitized/sandboxed before display.
 * RO:TEST — sanitizer tests before production use.
 */

export function markUntrustedHtml(html) {
  return String(html || '');
}

