/**
 * RO:WHAT — Constants shared by the CrabLink full-tab browser modules.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; keep route/schema literals out of controllers.
 * RO:INTERACTS — page.js, page-workflow.js, page-utils.js, ronClient.js.
 * RO:INVARIANTS — gateway-only; public crab URLs never use the legacy b3 path form; ROC stays internal.
 * RO:METRICS — none.
 * RO:CONFIG — none.
 * RO:SECURITY — constants only; no secrets or private keys.
 * RO:TEST — scripts/check-chrome.sh; node --check.
 */

export const BUILTIN_PAGE_SCHEMA = 'omnigate.builtin-page.v1';
export const ASSET_PAGE_SCHEMA = 'omnigate.asset-page.v1';
export const SITE_PAGE_SCHEMA = 'omnigate.site-page.v1';
export const BUILT_IN_RON_PAGES = new Set(['site', 'image', 'music', 'article']);
export const HOME_PAGE_URL = 'crab://site';
export const DEFAULT_HOLD_ESCROW_ACCOUNT = 'escrow_paid_write';