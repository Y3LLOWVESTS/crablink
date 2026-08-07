/**
 * RO:WHAT — Platform-neutral read-only creator-publication port.
 * RO:WHY — Profiles, Home, Explore, and templates need one bounded publication-read vocabulary.
 * RO:INTERACTS — desktop publication adapter, memory publication adapter, and Phase 6 publication DTOs.
 * RO:INVARIANTS — exactly listCreatorPublications and getCreatorPublication; construction performs no read.
 * RO:SECURITY — no publishing, wallet, ledger, receipt, entitlement, follow, settlement, or arbitrary transport authority.
 * RO:TEST — publicationPort.test.mjs.
 */

// FINAL_BETA_PHASE6C1_PUBLICATION_PORT_V1

import {
  createMethodPort,
} from './portContract.js';

const METHODS = Object.freeze([
  'listCreatorPublications',
  'getCreatorPublication',
]);

export function createPublicationPort(
  methods,
) {
  return createMethodPort(
    'publication port',
    methods,
    METHODS,
  );
}
