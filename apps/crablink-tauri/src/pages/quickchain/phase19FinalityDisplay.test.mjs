import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizePhase19QuickchainDisplayStatus,
  phase19StatusLabel,
} from './phase19FinalityDisplay.js';

const HASH =
  `b3:${'a'.repeat(64)}`;

test(
  'missing status remains unavailable and cannot fabricate finality',
  () => {
    const status =
      normalizePhase19QuickchainDisplayStatus();

    assert.equal(
      status.network,
      'unavailable',
    );

    assert.equal(
      status.checkpointObserved,
      'unavailable',
    );

    assert.equal(
      status.verification,
      'unavailable',
    );

    assert.equal(
      status.challenge,
      'unavailable',
    );

    assert.equal(
      status.finalityAuthority,
      false,
    );

    assert.equal(
      status.finalityDecision,
      'not_computed_by_crablink',
    );
  },
);

test(
  'backend-derived Phase 19 status is projected without becoming authority',
  () => {
    const status =
      normalizePhase19QuickchainDisplayStatus({
        source:
          'rustyonions_backend_readonly',

        network:
          'ready',

        checkpointObserved:
          true,

        checkpointHash:
          HASH,

        verification:
          'accepted',

        challenge:
          'none',
      });

    assert.equal(
      status.network,
      'ready',
    );

    assert.equal(
      status.checkpointObserved,
      'observed',
    );

    assert.equal(
      status.checkpointHash,
      HASH,
    );

    assert.equal(
      status.verification,
      'accepted',
    );

    assert.equal(
      status.challenge,
      'none',
    );

    assert.equal(
      status.finalityAuthority,
      false,
    );

    assert.equal(
      status.walletMutation,
      false,
    );

    assert.equal(
      status.ledgerMutation,
      false,
    );

    assert.equal(
      status.paidUnlockAuthority,
      false,
    );
  },
);

test(
  'untrusted local-looking values cannot manufacture network truth',
  () => {
    const status =
      normalizePhase19QuickchainDisplayStatus({
        source:
          'local_cache',

        network:
          'ready',

        checkpointObserved:
          true,

        checkpointHash:
          HASH,

        verification:
          'accepted',

        challenge:
          'none',

        validatorSignatureCount:
          3,

        receiptCount:
          99,

        finalized:
          true,
      });

    assert.equal(
      status.network,
      'unavailable',
    );

    assert.equal(
      status.checkpointObserved,
      'unavailable',
    );

    assert.equal(
      status.checkpointHash,
      '',
    );

    assert.equal(
      status.finalityAuthority,
      false,
    );
  },
);

test(
  'signature counts and finality-shaped fields are ignored rather than interpreted',
  () => {
    const status =
      normalizePhase19QuickchainDisplayStatus({
        source:
          'rustyonions_backend_readonly',

        network:
          'ready',

        validatorSignatureCount:
          3,

        requiredSignatures:
          2,

        finalized:
          true,

        finality:
          'finalized',
      });

    assert.equal(
      status.network,
      'ready',
    );

    assert.equal(
      status.checkpointObserved,
      'unavailable',
    );

    assert.equal(
      status.verification,
      'unavailable',
    );

    assert.equal(
      status.finalityDecision,
      'not_computed_by_crablink',
    );

    assert.equal(
      Object.hasOwn(
        status,
        'finalized',
      ),
      false,
    );
  },
);

test(
  'degraded backend state remains degraded without inventing checkpoint evidence',
  () => {
    const status =
      normalizePhase19QuickchainDisplayStatus({
        source:
          'rustyonions_backend_readonly',

        network:
          'degraded',
      });

    assert.equal(
      status.network,
      'degraded',
    );

    assert.equal(
      status.degraded,
      true,
    );

    assert.equal(
      status.checkpointObserved,
      'unavailable',
    );

    assert.equal(
      status.checkpointHash,
      '',
    );
  },
);

test(
  'challenge transport acknowledgement is not challenge acceptance or finality',
  () => {
    const status =
      normalizePhase19QuickchainDisplayStatus({
        source:
          'rustyonions_backend_readonly',

        network:
          'ready',

        checkpointObserved:
          true,

        checkpointHash:
          HASH,

        verification:
          'challenge_required',

        challenge:
          'transport_acknowledged',
      });

    assert.equal(
      status.verification,
      'challenge_required',
    );

    assert.equal(
      status.challenge,
      'transport_acknowledged',
    );

    assert.equal(
      status.challengeAcceptance,
      'not_decided_by_crablink',
    );

    assert.equal(
      status.finalityAuthority,
      false,
    );
  },
);

test(
  'display labels remain descriptive only',
  () => {
    assert.equal(
      phase19StatusLabel(
        'ready',
      ),
      'READY',
    );

    assert.equal(
      phase19StatusLabel(
        'observed',
      ),
      'OBSERVED',
    );

    assert.equal(
      phase19StatusLabel(
        'challenge_required',
      ),
      'CHALLENGE REQUIRED',
    );

    assert.equal(
      phase19StatusLabel(
        'unknown',
      ),
      'UNAVAILABLE',
    );
  },
);
