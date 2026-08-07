import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PHASE6_PUBLICATION_CONTRACT_CLOSEOUT,
  readPhase6PublicationContractCloseout,
} from './phase6PublicationContractCloseout.js';

test(
  'Phase 6 publication-contract closeout marker is locked',
  () => {
    assert.deepEqual(
      PHASE6_PUBLICATION_CONTRACT_CLOSEOUT
        .acceptance,
      {
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
      },
    );

    assert.equal(
      Object.isFrozen(
        PHASE6_PUBLICATION_CONTRACT_CLOSEOUT,
      ),
      true,
    );

    assert.equal(
      Object.isFrozen(
        PHASE6_PUBLICATION_CONTRACT_CLOSEOUT
          .acceptance,
      ),
      true,
    );
  },
);

test(
  'Phase 6 locks canonical summary and page schemas',
  () => {
    assert.deepEqual(
      PHASE6_PUBLICATION_CONTRACT_CLOSEOUT
        .schemas,
      {
        summary:
          'crablink.publication-summary.v1',
        page:
          'crablink.publication-page.v1',
      },
    );
  },
);

test(
  'Phase 6 locks the gateway through index read chain',
  () => {
    assert.deepEqual(
      PHASE6_PUBLICATION_CONTRACT_CLOSEOUT
        .backendRouteChain,
      [
        'svc-gateway',
        'omnigate',
        'svc-index',
      ],
    );

    assert.deepEqual(
      PHASE6_PUBLICATION_CONTRACT_CLOSEOUT
        .clientMethods,
      [
        'listCreatorPublications',
        'getCreatorPublication',
      ],
    );
  },
);

test(
  'Phase 6 remains read-only and economically non-authoritative',
  () => {
    assert.deepEqual(
      PHASE6_PUBLICATION_CONTRACT_CLOSEOUT
        .boundaries,
      {
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
      },
    );

    assert.equal(
      Object.isFrozen(
        PHASE6_PUBLICATION_CONTRACT_CLOSEOUT
          .boundaries,
      ),
      true,
    );
  },
);

test(
  'Phase 6 closeout reader returns the immutable canonical object',
  () => {
    assert.equal(
      readPhase6PublicationContractCloseout(),
      PHASE6_PUBLICATION_CONTRACT_CLOSEOUT,
    );
  },
);
