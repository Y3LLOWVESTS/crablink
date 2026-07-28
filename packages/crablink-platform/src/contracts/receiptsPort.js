/**
 * RO:WHAT — Platform-neutral recent-receipt display contract.
 * RO:WHY — Shared UI can request receipt display models without owning receipt truth.
 * RO:INTERACTS — desktop receipt adapter and deterministic memory receipt fixtures.
 * RO:INVARIANTS — exactly listRecentReceipts; the port grants no acceptance or unlock authority.
 * RO:SECURITY — receipt display is not paid entitlement, wallet, ledger, ROC, or finality proof.
 * RO:TEST — memoryAdapters.test.mjs and the platform memory boundary.
 */

import {
  createMethodPort,
} from './portContract.js';

const METHODS = Object.freeze([
  'listRecentReceipts',
]);

export function createReceiptsPort(
  methods,
) {
  return createMethodPort(
    'receipts port',
    methods,
    METHODS,
  );
}
