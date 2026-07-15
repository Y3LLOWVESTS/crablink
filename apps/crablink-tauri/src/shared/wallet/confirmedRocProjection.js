/**
 * RO:WHAT — Normalize a receipt-backed Phase 22 confirmed-ROC projection.
 * RO:WHY — CrabLink may display confirmed ROC only from backend receipt truth.
 * RO:INVARIANTS — pending evidence never supplies an amount; client data grants no economic authority.
 * RO:SECURITY — display-only; no wallet/ledger mutation, receipt creation, or finality.
 */

const SCHEMA =
  'crablink.phase22.confirmed-roc-projection.v1';

const SOURCE =
  'wallet_ledger_receipt_only';

const B3 =
  /^b3:[0-9a-f]{64}$/;

const TOKEN =
  /^[A-Za-z0-9_.:/-]{1,512}$/;

function unconfirmed(reason) {
  return Object.freeze({
    state: 'unconfirmed',
    confirmed: false,
    amountMinor: null,
    label: 'ROC pending confirmation',
    source: 'unavailable',
    backendDerived: false,
    displayOnly: true,
    reason: String(
      reason || 'receipt truth unavailable',
    ),
    walletMutation: false,
    ledgerMutation: false,
    finalityAuthority: false,
  });
}

export function normalizeConfirmedRocProjection(input) {
  if (
    !input
    || typeof input !== 'object'
    || Array.isArray(input)
  ) {
    return unconfirmed(
      'projection missing',
    );
  }

  if (
    input.schema !== SCHEMA
    || input.version !== 1
  ) {
    return unconfirmed(
      'projection schema mismatch',
    );
  }

  if (input.source !== SOURCE) {
    return unconfirmed(
      'projection source is not wallet/ledger receipt truth',
    );
  }

  const amount =
    String(
      input.confirmedRocMinorUnits || '',
    );

  if (
    !/^(?:0|[1-9][0-9]*)$/.test(amount)
  ) {
    return unconfirmed(
      'confirmed ROC amount is not canonical decimal',
    );
  }

  try {
    if (BigInt(amount) <= 0n) {
      return unconfirmed(
        'confirmed ROC amount must be positive',
      );
    }
  } catch (_error) {
    return unconfirmed(
      'confirmed ROC amount is invalid',
    );
  }

  if (
    !TOKEN.test(
      String(input.epochId || ''),
    )
    || !TOKEN.test(
      String(input.accountId || ''),
    )
    || !B3.test(
      String(input.lastLedgerRoot || ''),
    )
    || !B3.test(
      String(input.transitionHash || ''),
    )
    || !B3.test(
      String(input.economicsConfigHash || ''),
    )
  ) {
    return unconfirmed(
      'projection identity is invalid',
    );
  }

  const operationIds =
    Array.isArray(input.operationIds)
      ? input.operationIds.map(String)
      : [];

  const receiptCount =
    Number(input.receiptCount);

  const ledgerSequence =
    Number(input.lastLedgerSeq);

  if (
    !Number.isSafeInteger(receiptCount)
    || receiptCount <= 0
    || operationIds.length !== receiptCount
    || operationIds.some(
      (value) => !TOKEN.test(value),
    )
    || new Set(operationIds).size
      !== operationIds.length
    || !Number.isSafeInteger(
      ledgerSequence,
    )
    || ledgerSequence <= 0
  ) {
    return unconfirmed(
      'wallet/ledger receipt set is invalid',
    );
  }

  if (
    input.walletReceiptConfirmed !== true
    || input.ledgerReplayConfirmed !== true
    || input.userNodeReplayAccepted !== true
    || input.pendingEvidenceOnly !== false
    || input.displayOnly !== true
    || input.clientWalletMutation !== false
    || input.clientLedgerMutation !== false
    || input.clientFinalityAuthority !== false
  ) {
    return unconfirmed(
      'receipt or authority posture is not confirmed',
    );
  }

  return Object.freeze({
    state: 'confirmed',
    confirmed: true,

    amountMinor: amount,
    label:
      `${amount} ROC minor units`,

    source: 'ledger',
    sourceDetail: SOURCE,

    backendDerived: true,
    displayOnly: true,

    epochId:
      String(input.epochId),

    accountId:
      String(input.accountId),

    receiptCount,

    operationIds:
      Object.freeze([...operationIds]),

    ledgerSequence,

    ledgerRoot:
      String(input.lastLedgerRoot),

    transitionHash:
      String(input.transitionHash),

    economicsConfigHash:
      String(input.economicsConfigHash),

    truthBoundary:
      'Wallet/ledger receipt projection. CrabLink display only; ron-ledger remains durable economic truth.',

    walletMutation: false,
    ledgerMutation: false,
    finalityAuthority: false,
  });
}
