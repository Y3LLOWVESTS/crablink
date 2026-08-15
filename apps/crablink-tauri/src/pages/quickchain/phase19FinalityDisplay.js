/**
 * RO:WHAT — FINAL_BETA Phase 19 display-only projection for backend-derived
 * QuickChain network/checkpoint/verification/challenge status.
 * RO:WHY — CrabLink may show network truth after Phase 19 proves it, but the
 * client must never calculate or decide checkpoint finality.
 * RO:INTERACTS — QuickchainReadinessPage and an optional upstream
 * backendQuickchainStatus display snapshot.
 * RO:INVARIANTS — missing/untrusted values stay unavailable; no signature,
 * receipt, cache, quorum-count, or local proof inference creates finality.
 * RO:SECURITY — display transformation only. No fetch, Tauri invoke, wallet,
 * ledger, checkpoint production, signature verification, challenge
 * adjudication, settlement, or paid-unlock authority.
 */

const BACKEND_SOURCE =
  'rustyonions_backend_readonly';

const UNAVAILABLE =
  'unavailable';

const NETWORK_VALUES =
  new Set([
    'ready',
    'degraded',
    'unavailable',
  ]);

const VERIFICATION_VALUES =
  new Set([
    'accepted',
    'challenge_required',
    'rejected',
    'unavailable',
  ]);

const CHALLENGE_VALUES =
  new Set([
    'none',
    'challenge_required',
    'queued_for_transport',
    'transport_acknowledged',
    'unavailable',
  ]);

export function normalizePhase19QuickchainDisplayStatus(
  input,
) {
  const raw =
    input
    && typeof input === 'object'
      ? input
      : null;

  if (
    !raw
    || raw.source !== BACKEND_SOURCE
  ) {
    return unavailableStatus();
  }

  const network =
    NETWORK_VALUES.has(
      raw.network,
    )
      ? raw.network
      : UNAVAILABLE;

  const checkpointObserved =
    raw.checkpointObserved === true
      ? 'observed'
      : raw.checkpointObserved === false
        ? 'not_observed'
        : UNAVAILABLE;

  const verification =
    VERIFICATION_VALUES.has(
      raw.verification,
    )
      ? raw.verification
      : UNAVAILABLE;

  const challenge =
    CHALLENGE_VALUES.has(
      raw.challenge,
    )
      ? raw.challenge
      : UNAVAILABLE;

  const checkpointHash =
    normalizeCheckpointHash(
      raw.checkpointHash,
    );

  return Object.freeze({
    schema:
      'crablink.final-beta-phase19-quickchain-display.v1',

    source:
      BACKEND_SOURCE,

    sourceLabel:
      'RustyOnions backend read-only status',

    network,

    checkpointObserved,

    checkpointHash,

    verification,

    challenge,

    degraded:
      network === 'degraded',

    finalityDecision:
      'not_computed_by_crablink',

    challengeAcceptance:
      'not_decided_by_crablink',

    walletMutation:
      false,

    ledgerMutation:
      false,

    paidUnlockAuthority:
      false,

    finalityAuthority:
      false,
  });
}

export function phase19StatusLabel(
  value,
) {
  switch (value) {
    case 'ready':
      return 'READY';

    case 'degraded':
      return 'DEGRADED';

    case 'observed':
      return 'OBSERVED';

    case 'not_observed':
      return 'NOT OBSERVED';

    case 'accepted':
      return 'VERIFIED';

    case 'challenge_required':
      return 'CHALLENGE REQUIRED';

    case 'rejected':
      return 'REJECTED';

    case 'none':
      return 'NONE';

    case 'queued_for_transport':
      return 'QUEUED';

    case 'transport_acknowledged':
      return 'TRANSPORT ACKNOWLEDGED';

    default:
      return 'UNAVAILABLE';
  }
}

function unavailableStatus() {
  return Object.freeze({
    schema:
      'crablink.final-beta-phase19-quickchain-display.v1',

    source:
      UNAVAILABLE,

    sourceLabel:
      'No backend QuickChain status supplied',

    network:
      UNAVAILABLE,

    checkpointObserved:
      UNAVAILABLE,

    checkpointHash:
      '',

    verification:
      UNAVAILABLE,

    challenge:
      UNAVAILABLE,

    degraded:
      false,

    finalityDecision:
      'not_computed_by_crablink',

    challengeAcceptance:
      'not_decided_by_crablink',

    walletMutation:
      false,

    ledgerMutation:
      false,

    paidUnlockAuthority:
      false,

    finalityAuthority:
      false,
  });
}

function normalizeCheckpointHash(
  value,
) {
  const text =
    typeof value === 'string'
      ? value.trim()
      : '';

  if (
    !/^b3:[0-9a-f]{64}$/.test(
      text,
    )
  ) {
    return '';
  }

  return text;
}
