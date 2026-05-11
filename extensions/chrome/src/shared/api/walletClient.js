/**
 * RO:WHAT — Wallet display and explicit hold API helper for the React CrabLink shell.
 * RO:WHY — Keeps balance and wallet hold flows gateway-routed, explicit, compact, and backend-contract-safe.
 * RO:INTERACTS — gatewayClient.js, BalanceChip, PassportDrawer, ImagePublishFlow, future paid asset/site flows.
 * RO:INVARIANTS — no fake balances; no silent spend; no local nonce truth; wallet/ledger truth stays backend-owned.
 * RO:METRICS — inherits x-correlation-id behavior from GatewayClient.
 * RO:CONFIG — gateway client wallet account label.
 * RO:SECURITY — no spend authority, private keys, seed phrases, or local ledger truth.
 * RO:TEST — wallet display smoke; React crab://image prepare → hold smoke.
 */

const MAX_IDEMPOTENCY_KEY_BYTES = 64;
const DEFAULT_ASSET = 'roc';

export function createWalletClient(gateway) {
  return new WalletClient(gateway);
}

export class WalletClient {
  constructor(gateway) {
    this.gateway = gateway || null;
  }

  get ready() {
    return Boolean(this.gateway);
  }

  async getBalance(account) {
    this.assertGateway();

    const walletAccount = String(account || this.gateway.walletAccount || '').trim();

    if (!walletAccount) {
      throw makeWalletError(
        'Wallet balance requires a configured wallet account label.',
        'missing_wallet_account',
      );
    }

    if (typeof this.gateway.getWalletBalance === 'function') {
      return this.gateway.getWalletBalance(walletAccount);
    }

    return this.gateway.request(`/wallet/${encodeURIComponent(walletAccount)}/balance`, {
      label: 'Wallet balance',
    });
  }

  async hold(payload = {}, options = {}) {
    this.assertGateway();

    if (options.confirmed !== true) {
      throw makeWalletError(
        'Wallet hold requires explicit caller confirmation.',
        'confirmation_required',
      );
    }

    const request = normalizeWalletHoldRequest(payload);
    const response = await this.gateway.request('/wallet/hold', {
      method: 'POST',
      body: request,
      label: 'Wallet hold',
      mutation: true,
      headers: {
        'Idempotency-Key': request.idempotency_key,
        'x-ron-wallet-account': request.from,
      },
    });

    return {
      ...response,
      data: response?.data || null,
      walletHold: normalizeWalletHoldResponse(response?.data, request),
      request,
    };
  }

  assertGateway() {
    if (!this.gateway) {
      throw makeWalletError(
        'Wallet request requires the configured gateway client.',
        'missing_gateway_client',
      );
    }

    if (typeof this.gateway.request !== 'function' && typeof this.gateway.getWalletBalance !== 'function') {
      throw makeWalletError(
        'Wallet request requires a gateway client with request/getWalletBalance support.',
        'missing_gateway_method',
      );
    }
  }
}

export function normalizeWalletHoldRequest(payload = {}) {
  const from = stringValue(payload.from, payload.payer, payload.payer_account);
  const to = stringValue(payload.to, payload.escrow, payload.escrow_account);
  const asset = stringValue(payload.asset, DEFAULT_ASSET).toLowerCase();
  const amountMinor = normalizeAmountMinor(payload.amount_minor, payload.amountMinor, payload.amount);
  const nonce = normalizeNonce(payload.nonce);
  const memo = stringValue(payload.memo).slice(0, 240);

  if (!from) {
    throw makeWalletError('Wallet hold requires a payer account.', 'missing_from');
  }

  if (!to) {
    throw makeWalletError('Wallet hold requires an escrow account.', 'missing_to');
  }

  if (asset !== DEFAULT_ASSET) {
    throw makeWalletError('Wallet hold currently supports only the internal roc asset.', 'invalid_asset');
  }

  if (!/^[0-9]+$/.test(amountMinor) || amountMinor === '0') {
    throw makeWalletError('Wallet hold requires a positive integer amount_minor string.', 'invalid_amount_minor');
  }

  if (!Number.isSafeInteger(nonce) || nonce < 1) {
    throw makeWalletError('Wallet hold requires a positive integer nonce.', 'invalid_nonce');
  }

  const rawIdem = stringValue(
    payload.idempotency_key,
    payload.idempotencyKey,
    payload.idem,
    stableIdempotencyKey('wallet-hold', from, to, asset, amountMinor, nonce, memo),
  );

  return {
    from,
    to,
    asset,
    amount_minor: amountMinor,
    nonce,
    memo: memo || `CrabLink wallet hold ${from} -> ${to}`,
    idempotency_key: compactIdempotencyKey(rawIdem, 'wallet-hold'),
  };
}

export function normalizeWalletHoldResponse(data = {}, request = {}) {
  const object = data && typeof data === 'object' ? data : {};
  const txid = stringValue(
    object.txid,
    object.tx_id,
    object.hold_id,
    object.holdId,
    object.wallet_txid,
    object.walletTxid,
    object.wallet_hold?.txid,
    object.wallet_hold?.tx_id,
    object.receipt?.txid,
  );
  const receiptHash = stringValue(
    object.receipt_hash,
    object.receiptHash,
    object.wallet_receipt_hash,
    object.walletReceiptHash,
    object.receipt?.hash,
    object.receipt?.receipt_hash,
  );
  const from = stringValue(object.from, object.payer, object.payer_account, object.wallet_from, request.from);
  const to = stringValue(object.to, object.escrow, object.escrow_account, object.wallet_to, request.to);
  const amountMinor = normalizeAmountMinor(
    object.amount_minor,
    object.amountMinor,
    object.held_minor,
    object.heldMinor,
    request.amount_minor,
  );
  const nonce = normalizeNonce(object.nonce || request.nonce);
  const asset = stringValue(object.asset, request.asset, DEFAULT_ASSET).toLowerCase();
  const op = stringValue(object.op, object.operation, 'hold').toLowerCase();
  const idem = stringValue(object.idem, object.idempotency_key, object.idempotencyKey, request.idempotency_key);

  return Object.freeze({
    txid,
    receipt_hash: receiptHash,
    from,
    to,
    asset,
    amount_minor: amountMinor,
    nonce,
    op,
    idem,
    ledger_seq_start: stringValue(object.ledger_seq_start, object.ledgerSeqStart),
    ledger_seq_end: stringValue(object.ledger_seq_end, object.ledgerSeqEnd),
    ledger_root: stringValue(object.ledger_root, object.ledgerRoot),
    ts: stringValue(object.ts, object.timestamp),
  });
}

export function expectedNonceFromWalletError(errorOrData = {}, message = '') {
  const data = errorOrData?.data && typeof errorOrData.data === 'object' ? errorOrData.data : errorOrData;
  const direct = Number(
    data?.expected_nonce ||
      data?.expectedNonce ||
      data?.next_nonce ||
      data?.nextNonce ||
      data?.details?.expected_nonce ||
      data?.details?.expectedNonce ||
      data?.problem?.expected_nonce ||
      data?.problem?.expectedNonce ||
      0,
  );

  if (Number.isSafeInteger(direct) && direct > 0) {
    return direct;
  }

  const text = [
    message,
    errorOrData?.message,
    data?.message,
    data?.detail,
    data?.reason,
    data?.code,
    safeJson(data),
  ]
    .map((value) => String(value || ''))
    .join(' ');

  const patterns = [
    /expected[_\s-]*nonce["':=\s]+(\d+)/i,
    /next[_\s-]*nonce["':=\s]+(\d+)/i,
    /expected["':=\s]+(\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    const n = Number(match?.[1] || 0);

    if (Number.isSafeInteger(n) && n > 0) {
      return n;
    }
  }

  return 0;
}

export function compactIdempotencyKey(value, prefix = 'cl') {
  const raw = String(value || '').trim();

  if (isSafeIdempotencyKey(raw)) {
    return raw;
  }

  const safePrefix = String(prefix || 'cl')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 18) || 'cl';

  const hash = fnv1aHex(raw || `${safePrefix}:${Date.now()}`);
  const slugBudget = MAX_IDEMPOTENCY_KEY_BYTES - safePrefix.length - hash.length - 2;
  const slug = raw
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9:_./-]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, Math.max(0, slugBudget));

  const compact = slug
    ? `${safePrefix}:${slug}:${hash}`
    : `${safePrefix}:${hash}`;

  return compact.slice(0, MAX_IDEMPOTENCY_KEY_BYTES);
}

export function stableIdempotencyKey(scope, ...parts) {
  const raw = [
    'crablink-react',
    scope,
    ...parts.map((part) => String(part ?? '').trim()).filter(Boolean),
  ].join(':');

  return compactIdempotencyKey(raw, `cl-${scope}`);
}

function isSafeIdempotencyKey(value) {
  if (!value) {
    return false;
  }

  return byteLength(value) >= 1 && byteLength(value) <= MAX_IDEMPOTENCY_KEY_BYTES;
}

function normalizeAmountMinor(...values) {
  for (const value of values) {
    const raw = String(value ?? '').trim();

    if (/^[0-9]+$/.test(raw)) {
      return raw;
    }

    const n = Number(raw);
    if (Number.isSafeInteger(n) && n > 0) {
      return String(n);
    }
  }

  return '';
}

function normalizeNonce(value) {
  const nonce = Number(value);

  if (!Number.isSafeInteger(nonce) || nonce < 1) {
    return 0;
  }

  return nonce;
}

function stringValue(...values) {
  for (const value of values) {
    const safe = String(value ?? '').trim();

    if (safe) {
      return safe;
    }
  }

  return '';
}

function byteLength(value) {
  return new TextEncoder().encode(String(value || '')).length;
}

function fnv1aHex(value) {
  let hash = 0x811c9dc5;
  const text = String(value || '');

  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

function safeJson(value) {
  try {
    return JSON.stringify(value || null);
  } catch (_error) {
    return '';
  }
}

function makeWalletError(message, reason) {
  const error = new Error(message);
  error.name = 'WalletClientError';
  error.reason = reason;
  error.status = 0;
  error.retryable = false;
  return error;
}