/**
 * RO:WHAT — Shared paid-access truth helpers for CrabLink Tauri stabilization.
 * RO:WHY — Product beta paid UX needs deterministic retry keys, backend-proof checks, and redacted/source-labeled failures without making React authority.
 * RO:INTERACTS — AssetContentViewAccess, SiteVisitAccess, contentViewClient, siteVisitClient, recentReceipts.
 * RO:INVARIANTS — idempotency_key is retry glue, not authority; operation_id is backend durable ledger-op display metadata; backend receipt/access truth is required before render.
 * RO:METRICS — none; callers surface gateway correlation and receipt fields.
 * RO:CONFIG — no knobs; uses caller-supplied backend quote/payment metadata.
 * RO:SECURITY — no secrets; no local balance mutation; no cached receipt entitlement; errors are redacted before UI display.
 * RO:TEST — npm run check:internal-roc-stabilization-paid-ux.
 */

const MAX_IDEMPOTENCY_KEY_BYTES = 64;

const SECRET_ERROR_PATTERNS = Object.freeze([
  /bearer\s+[a-z0-9._~+\/-]+=*/gi,
  /(authorization\s*[:=]\s*)[^\s,;}]+/gi,
  /(token\s*[:=]\s*)[^\s,;}]+/gi,
  /(secret\s*[:=]\s*)[^\s,;}]+/gi,
  /(seed\s*[:=]\s*)[^\s,;}]+/gi,
  /(private[_-]?key\s*[:=]\s*)[^\s,;}]+/gi,
]);

export function makeStablePaidIdempotencyKey({
  scope = 'paid-access',
  target = '',
  payer = '',
  recipient = '',
  amountMinor = '',
  quoteId = '',
  quoteHash = '',
  action = '',
} = {}) {
  const cleanScope = sanitizeKeyPart(scope || 'paid-access') || 'paid-access';
  const cleanTarget = sanitizeKeyPart(target || 'target');
  const cleanPayer = sanitizeKeyPart(payer || 'payer');
  const cleanRecipient = sanitizeKeyPart(recipient || 'recipient');
  const cleanAmount = sanitizeKeyPart(amountMinor || 'amount');
  const cleanQuote = sanitizeKeyPart(quoteId || quoteHash || 'quote');
  const cleanAction = sanitizeKeyPart(action || cleanScope);

  const material = [cleanScope, cleanAction, cleanTarget, cleanPayer, cleanRecipient, cleanAmount, cleanQuote]
    .filter(Boolean)
    .join(':');

  const hash = fnv1aHex(material || cleanScope);
  const prefix = `cl-paid:${cleanScope}:${hash}`;
  const suffix = [cleanTarget.slice(0, 14), cleanPayer.slice(0, 10), cleanQuote.slice(0, 10)]
    .filter(Boolean)
    .join(':');

  return compactPaidIdempotencyKey(suffix ? `${prefix}:${suffix}` : prefix);
}

export function buildPaidRetryState({
  status = 'idle',
  idempotencyKey = '',
  sourceLabel = 'backend-paid-route',
  proof = null,
} = {}) {
  const key = compactPaidIdempotencyKey(idempotencyKey);

  return Object.freeze({
    schema: 'crablink.paid-access.retry-state.v1',
    displayOnly: true,
    sourceLabel: cleanSourceLabel(sourceLabel),
    status: cleanString(status || 'idle'),
    statusLabel: paidRetryStatusLabel(status),
    idempotencyKey: key,
    canRetry: Boolean(key && status !== 'confirmed'),
    backendProof: proof ? Object.freeze({ ...proof }) : null,
    truthBoundary:
      'Display-only retry state. Backend wallet/ledger/access response remains paid-access truth.',
  });
}

export function clearPaidRetryKey(ref) {
  if (ref && typeof ref === 'object') {
    ref.current = '';
  }
}

export function describeBackendPaymentProof(summary = {}) {
  const data = objectOrEmpty(summary);
  const txid = firstString(data.txid, data.tx_id);
  const receiptHash = firstString(data.receiptHash, data.receipt_hash);
  const ledgerRoot = firstString(data.ledgerRoot, data.ledger_root);
  const operationId = firstString(data.operationId, data.operation_id);
  const idempotencyKey = firstString(
    data.idempotencyKey,
    data.idempotency_key,
    data.clientIdempotencyKey,
    data.client_idempotency_key,
  );

  return Object.freeze({
    schema: 'crablink.backend-payment-proof.v1',
    hasProof: Boolean(txid || receiptHash || ledgerRoot || operationId),
    txid,
    receiptHash,
    ledgerRoot,
    operationId,
    idempotencyKey,
    sourceLabel: 'backend-derived wallet/ledger receipt metadata',
    displayOnly: true,
  });
}

export function hasBackendPaymentProof(summary = {}) {
  return describeBackendPaymentProof(summary).hasProof;
}

export function ensureBackendPaymentProof(
  summary = {},
  {
    message = 'Backend payment did not return wallet/ledger receipt proof. CrabLink will keep paid content locked.',
    sourceLabel = 'backend-paid-route',
  } = {},
) {
  const proof = describeBackendPaymentProof(summary);

  if (proof.hasProof) {
    return proof;
  }

  const error = new Error(redactForDisplay(message));
  error.name = 'PaidAccessTruthError';
  error.reason = 'payment_missing_backend_receipt';
  error.retryable = true;
  error.sourceLabel = cleanSourceLabel(sourceLabel);
  error.backendProof = proof;
  return throwError(error);
}

export function sanitizePaidAccessError(
  error,
  {
    sourceLabel = 'backend-paid-route',
    idempotencyKey = '',
    fallbackReason = 'paid_access_failed',
  } = {},
) {
  const rawMessage = error?.message || String(error || 'Paid access request failed.');
  const clean = redactForDisplay(rawMessage);

  return Object.freeze({
    name: cleanString(error?.name || 'PaidAccessError') || 'PaidAccessError',
    message: clean || 'Paid access request failed.',
    reason: cleanString(error?.reason || error?.code || fallbackReason) || fallbackReason,
    status: Number(error?.status || error?.response?.status || 0),
    retryable: Boolean(
      error?.retryable ||
        error?.status === 408 ||
        error?.status === 429 ||
        error?.status >= 500,
    ),
    correlationId: cleanString(error?.correlationId || error?.response?.correlationId || ''),
    sourceLabel: cleanSourceLabel(error?.sourceLabel || sourceLabel),
    idempotencyKey: compactPaidIdempotencyKey(
      idempotencyKey || error?.idempotencyKey || error?.idempotency_key || '',
    ),
    backendProof: error?.backendProof || null,
    displayOnly: true,
    truthBoundary:
      'Failure state is display-only and locked. It does not create access, receipt, balance, or finality truth.',
  });
}

export function paidRetryStatusLabel(status) {
  switch (cleanString(status)) {
    case 'paying':
      return 'backend payment pending — retry key reserved';
    case 'retrying':
      return 'retrying with the same backend idempotency key';
    case 'failed':
      return 'failed / locked — safe retry may reuse the same key';
    case 'confirmed':
      return 'backend-confirmed receipt/access response returned';
    default:
      return 'no payment retry active';
  }
}

export function redactForDisplay(value) {
  let clean = cleanString(value || 'Paid access request failed.');

  for (const pattern of SECRET_ERROR_PATTERNS) {
    clean = clean.replace(pattern, (_match, prefix = '') => `${prefix}[redacted]`);
  }

  clean = clean.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();

  if (clean.length > 240) {
    return `${clean.slice(0, 237)}...`;
  }

  return clean || 'Paid access request failed.';
}

function compactPaidIdempotencyKey(value) {
  const normalized = sanitizeKeyPart(value);

  if (normalized && normalized.length <= MAX_IDEMPOTENCY_KEY_BYTES) {
    return normalized;
  }

  const hash = fnv1aHex(normalized || 'paid-access-retry');
  const prefix = 'cl-paid';
  const budget = MAX_IDEMPOTENCY_KEY_BYTES - prefix.length - hash.length - 2;
  const suffix = normalized.slice(0, Math.max(0, budget));

  return suffix ? `${prefix}:${hash}:${suffix}` : `${prefix}:${hash}`;
}

function cleanSourceLabel(value) {
  const clean = sanitizeKeyPart(value || 'backend-paid-route');
  return clean || 'backend-paid-route';
}

function sanitizeKeyPart(value) {
  return cleanString(value)
    .toLowerCase()
    .replace(/[^a-z0-9_.:-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function cleanString(value) {
  return String(value || '').trim();
}

function objectOrEmpty(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function firstString(...values) {
  for (const value of values) {
    const clean = cleanString(value);
    if (clean) {
      return clean;
    }
  }

  return '';
}

function fnv1aHex(input) {
  let hash = 0x811c9dc5;
  const text = String(input || '');

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return hash.toString(16).padStart(8, '0');
}

function throwError(error) {
  throw error;
}
