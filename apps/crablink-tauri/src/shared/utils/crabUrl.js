/**
 * RO:WHAT — Desktop compatibility surface for the shared CrabLink URL parser.
 * RO:WHY — Existing desktop consumers retain their import path while behavior moves to @crablink/core.
 * RO:INTERACTS — contentViewClient, siteClient, siteVisitClient, packages/crablink-core.
 * RO:INVARIANTS — this file defines no parser rules and adds no platform authority.
 * RO:SECURITY — re-export only; no Chrome, Tauri, DOM, network, storage, wallet, receipt, or ledger access.
 * RO:TEST — npm --prefix apps/crablink-tauri run check:shared-crab-url.
 */

export {
  crabImageUrlToCid,
  initCrabUrl,
  isB3Cid,
  isRawHash,
  isTypedAssetUrl,
  makeCrabAssetUrl,
  makeCrabSiteUrl,
  normalizeAssetKind,
  normalizeB3Cid,
  normalizeHash,
  normalizeSiteName,
  normalizeTypedAssetUrl,
  parseCrabInput,
  parseTypedAssetBody,
  stripCrabPrefix,
  stripQueryAndHash,
} from '../../../../../packages/crablink-core/src/index.js';
