/**
 * RO:WHAT — Shared visibility contract for CrabLink developer-only React surfaces.
 * RO:WHY — FINAL_BETA Phase 5 requires engineering dashboards, fixtures, smoke tools, and development bypasses to remain unavailable in normal and release presentation.
 * RO:INTERACTS — HomeQuickActions, Passport drawer development fixtures, app settings devMode, and the Vite development-build flag.
 * RO:INVARIANTS — both a development build and an explicit local devMode setting are required; visibility never creates backend, Passport, wallet, ledger, receipt, node, or QuickChain authority.
 * RO:METRICS — none.
 * RO:CONFIG — buildDev and settings.devMode.
 * RO:SECURITY — release builds fail closed even if stale local settings contain devMode=true.
 * RO:TEST — developerSurfaceMode.test.mjs and HomeQuickActions.developerMode.source.test.mjs.
 */

export const FINAL_BETA_PHASE5A1_EXPLICIT_DEVELOPER_SURFACE =
  'FINAL_BETA_PHASE5A1_EXPLICIT_DEVELOPER_SURFACE_V1';

export function isExplicitDeveloperSurface({
  buildDev = false,
  settings = {},
} = {}) {
  return (
    buildDev === true &&
    settings?.devMode === true
  );
}

export function getDeveloperSurfacePosture({
  buildDev = false,
  settings = {},
} = {}) {
  const enabled =
    isExplicitDeveloperSurface({
      buildDev,
      settings,
    });

  return Object.freeze({
    enabled,
    buildEligible:
      buildDev === true,

    explicitlyEnabled:
      settings?.devMode === true,

    releaseVisible:
      false,

    label:
      enabled
        ? 'Developer Mode enabled'
        : 'Developer tools hidden',
  });
}
