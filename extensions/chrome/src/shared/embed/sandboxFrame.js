/**
 * RO:WHAT — Sandbox frame helper placeholder for untrusted crab content.
 * RO:WHY — Keeps CrabLink shell trusted while rendering user/site content in a cage.
 * RO:INTERACTS — SiteRender and embed registry.
 * RO:INVARIANTS — sandbox permissions must be minimal and explicit.
 * RO:METRICS — none.
 * RO:CONFIG — future sandbox policy.
 * RO:SECURITY — do not enable scripts/forms/popups without a reviewed policy.
 * RO:TEST — sandbox contract tests once wired.
 */

export function getDefaultSandboxAttributes() {
  return 'allow-same-origin';
}

