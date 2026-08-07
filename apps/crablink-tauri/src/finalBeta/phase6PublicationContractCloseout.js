/**
 * RO:WHAT — Formal FINAL_BETA Phase 6 publication-contract closeout.
 * RO:WHY — Locks the canonical read-projection boundaries before profile timeline UI begins.
 * RO:INTERACTS — publication DTOs, svc-index, Omnigate, svc-gateway, desktop adapter, and memory adapter.
 * RO:INVARIANTS — bounded public reads only; backend-derived projection; unknown fields reject.
 * RO:SECURITY — no economic truth, publishing mutation, follow mutation, wallet, ledger, receipt, or settlement authority.
 * RO:TEST — phase6PublicationContractCloseout.test.mjs.
 */

// FINAL_BETA_PHASE6_PUBLICATION_CONTRACT_CLOSEOUT_V1

export const PHASE6_PUBLICATION_CONTRACT_CLOSEOUT =
  Object.freeze({
    acceptance:
      Object.freeze({
        phase:
          'FINAL_BETA_PHASE6_PUBLICATION_CONTRACT',
        status:
          'GREEN',
        profilePublicationProjection:
          'GREEN',
        pagination:
          'BOUNDED',
        unknownFields:
          'REJECTED',
        economicTruthInProjection:
          'NO',
        nextPhase:
          'FINAL_BETA_PHASE7_PROFILE_TIMELINE',
      }),

    schemas:
      Object.freeze({
        summary:
          'crablink.publication-summary.v1',
        page:
          'crablink.publication-page.v1',
      }),

    backendRouteChain:
      Object.freeze([
        'svc-gateway',
        'omnigate',
        'svc-index',
      ]),

    clientMethods:
      Object.freeze([
        'listCreatorPublications',
        'getCreatorPublication',
      ]),

    boundaries:
      Object.freeze({
        readProjectionOnly:
          true,
        directIndexAccessFromCrabLink:
          false,
        directOmnigateAccessFromCrabLink:
          false,
        publicationMutation:
          false,
        followMutation:
          false,
        walletMutation:
          false,
        ledgerMutation:
          false,
        receiptAuthority:
          false,
        paidEntitlementAuthority:
          false,
        settlementAuthority:
          false,
      }),
  });

export function readPhase6PublicationContractCloseout() {
  return PHASE6_PUBLICATION_CONTRACT_CLOSEOUT;
}
