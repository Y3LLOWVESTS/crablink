/**
 * RO:WHAT — Public entry point for platform-neutral CrabLink behavior.
 * RO:WHY — Desktop and TV require one tested source for shared route semantics.
 * RO:INTERACTS — crabUrl.js and future shared display-normalization families.
 * RO:INVARIANTS — no Chrome APIs, Tauri APIs, DOM assumptions, or backend authority.
 */

export const CRABLINK_CORE_PACKAGE =
  '@crablink/core';

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
} from './crabUrl.js';

export {
  assetKindLabel,
  describeAssetKind,
  normalizeRouteKind,
  resolveAssetRouteOwner,
  routeKindLabel,
} from './routeMetadata.js';

export {
  RECEIPT_DISPLAY_FILTERS,
  buildReceiptProofText,
  countReceiptDisplayGroups,
  filterReceiptDisplayList,
  formatReceiptAmount,
  formatReceiptTimestamp,
  normalizeReceiptAction,
  normalizeReceiptDisplay,
  normalizeReceiptDisplayList,
  receiptActionLabel,
  receiptDisplayClassName,
  receiptDisplayKey,
  receiptTimestampMillis,
} from './receiptDisplay.js';
