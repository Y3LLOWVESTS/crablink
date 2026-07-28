/**
 * RO:WHAT — Platform-neutral read-only catalog contract.
 * RO:WHY — TV, desktop, and future mobile clients need one narrow catalog-read vocabulary.
 * RO:INTERACTS — platform adapters, TV catalog model, gateway/omnigate-backed catalog reads.
 * RO:INVARIANTS — exactly readCatalog; construction performs no read or fallback.
 * RO:SECURITY — no transport, storage, wallet, ledger, receipt, reward, ROC, entitlement, or finality authority.
 * RO:TEST — catalogPort.test.mjs and check-crablink-platform-catalog-boundary.mjs.
 */

import { createMethodPort } from './portContract.js';

const METHODS = Object.freeze(['readCatalog']);

export function createCatalogPort(methods) {
  return createMethodPort('catalog port', methods, METHODS);
}
