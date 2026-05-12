/**
 * RO:WHAT — Wallet display and explicit hold API helper for the React CrabLink shell.
 * RO:WHY — Keeps balance and wallet hold flows gateway-routed, explicit, compact, and backend-contract-safe.
 * RO:INTERACTS — gatewayClient.js, BalanceChip, PassportDrawer, ImagePublishFlow, SiteLaunchFlow.
 * RO:INVARIANTS — no fake balances; no silent spend; no local nonce truth; wallet/ledger truth stays backend-owned.
 * RO:METRICS — inherits x-correlation-id behavior from GatewayClient.
 * RO:CONFIG — gateway client wallet account label; browser-local nonce hint is only a UX hint, never backend truth.
 * RO:SECURITY — no spend authority, private keys, seed phrases, or local ledger truth.
 * RO:TEST — wallet display smoke; React crab://image prepare → hold; React crab://site prepare → hold.
 */

const MAX_IDEMPOTENCY_KEY_BYTES = 64;
const DEFAULT_ASSET = 'roc';
const NONCE_HINT_PREFIX = 'crablink.wallet.nextNonce.';

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

    const firstRequest = normalizeWalletHoldRequest(payload);

    try {
      return await this.sendHoldRequest(firstRequest, {
        nonceRecovery: null,
      });
    } catch (error) {
      const expectedNonce = expectedNonceFromWalletError(error);

      if (!expectedNonce || expectedNonce === firstRequest.nonce) {
        throw error;
      }

      persistNextNonceHint(firstRequest.from, expectedNonce);

      const retryRequest = {
        ...firstRequest,
        nonce: expectedNonce,
        idempotency_key: compactIdempotencyKey(
          stableIdempotencyKey(
            'wallet-hold-retry',
            firstRequest.from,
            firstRequest.to,
            firstRequest.asset,
            firstRequest.amount_minor,
            expectedNonce,
            firstRequest.idempotency_key,
          ),
          'wallet-hold',
        ),
      };

      try {
        return await this.sendHoldRequest(retryRequest, {
          nonceRecovery: {
            recovered: true,
            first_nonce: firstRequest.nonce,
            retried_nonce: expectedNonce,
            first_error: summarizeWalletError(error),
          },
        });
      } catch (retryError) {
        retryError.nonceRecovery = {
          recovered: false,
          first_nonce: firstRequest.nonce,
          retried_nonce: expectedNonce,
          first_error: summarizeWalletError(error),
          retry_error: summarizeWalletError(retryError),
        };
        throw retryError;
      }
    }
  }

  async sendHoldRequest(request, { nonceRecovery = null } = {}) {
    const response = await this.gateway.request('/wallet/hold', {
      method: 'POST',
      body: request,
      label: 'Wallet hold',
      mutation: true,
      headers: {
        'Idempotency-Key': request.idempotency_key,
        'x-ron-wallet-account': request.from,
      },
      idempotencyKey: request.idempotency_key,
    });

    const walletHold = normalizeWalletHoldResponse(response?.data || response || {}, request);
    const nextNonce = Number(walletHold.nonce || request.nonce || 0) + 1;

    if (Number.isSafeInteger(nextNonce) && nextNonce > 1) {
      persistNextNonceHint(request.from, nextNonce);
    }

    return {
      ...response,
      data: response?.data || null,
      walletHold,
      request,
      nonceRecovery,
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
  const candidates = nestedHoldObjects(object);

  const txid = firstNestedValue(candidates, [
    'txid',
    'tx_id',
    'id',
    'hold_id',
    'holdId',
    'wallet_txid',
    'walletTxid',
    'wallet_hold_txid',
    'walletHoldTxid',
  ]);

  const receiptHash = firstNestedValue(candidates, [
    'receipt_hash',
    'receiptHash',
    'wallet_receipt_hash',
    'walletReceiptHash',
    'hash',
  ]);

  const from = stringValue(
    firstNestedValue(candidates, ['from', 'payer', 'payer_account', 'payerAccount', 'wallet_from', 'walletFrom']),
    request.from,
  );

  const to = stringValue(
    firstNestedValue(candidates, ['to', 'escrow', 'escrow_account', 'escrowAccount', 'wallet_to', 'walletTo']),
    request.to,
  );

  const amountMinor = normalizeAmountMinor(
    firstNestedValue(candidates, [
      'amount_minor',
      'amountMinor',
      'held_minor',
      'heldMinor',
      'amount',
      'estimate_minor',
      'estimateMinor',
    ]),
    request.amount_minor,
  );

  const nonce = normalizeNonce(firstNestedValue(candidates, ['nonce']) || request.nonce);
  const asset = stringValue(firstNestedValue(candidates, ['asset']), request.asset, DEFAULT_ASSET).toLowerCase();
  const op = stringValue(firstNestedValue(candidates, ['op', 'operation']), 'hold').toLowerCase();

  const idem = stringValue(
    firstNestedValue(candidates, ['idem', 'idempotency_key', 'idempotencyKey']),
    request.idempotency_key,
  );

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
    ledger_seq_start: stringValue(firstNestedValue(candidates, ['ledger_seq_start', 'ledgerSeqStart'])),
    ledger_seq_end: stringValue(firstNestedValue(candidates, ['ledger_seq_end', 'ledgerSeqEnd'])),
    ledger_root: stringValue(firstNestedValue(candidates, ['ledger_root', 'ledgerRoot'])),
    ts: stringValue(firstNestedValue(candidates, ['ts', 'timestamp'])),
  });
}

export function expectedNonceFromWalletError(error) {
  const data = error?.data && typeof error.data === 'object' ? error.data : {};

  const direct = Number(
    data.expected_nonce ||
      data.expectedNonce ||
      data.next_nonce ||
      data.nextNonce ||
      data.details?.expected_nonce ||
      data.details?.expectedNonce ||
      data.problem?.expected_nonce ||
      data.problem?.expectedNonce ||
      0,
  );

  if (Number.isSafeInteger(direct) && direct > 0) {
    return direct;
  }

  const nested = findNestedNonce(data);
  if (nested) {
    return nested;
  }

  const text = [
    error?.message,
    data.message,
    data.detail,
    data.reason,
    data.error,
    safeJson(data),
  ].join(' ');

  const patterns = [
    /expected[_\s-]*nonce["':=\s]+(\d+)/i,
    /next[_\s-]*nonce["':=\s]+(\d+)/i,
    /expected\s+(\d+)\s+(?:got|but got|received)/i,
    /expecting\s+(\d+)/i,
    /nonce[^0-9]+expected[^0-9]+(\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    const value = Number(match?.[1] || 0);

    if (Number.isSafeInteger(value) && value > 0) {
      return value;
    }
  }

  return 0;
}

export function loadNextNonceHint(account, fallback = 1) {
  const safeFallback = normalizeNonce(fallback) || 1;
  const key = nonceHintKey(account);

  if (!key || typeof globalThis?.localStorage === 'undefined') {
    return String(safeFallback);
  }

  try {
    const stored = Number(globalThis.localStorage.getItem(key) || '');
    return Number.isSafeInteger(stored) && stored > 0 ? String(stored) : String(safeFallback);
  } catch (_error) {
    return String(safeFallback);
  }
}

export function persistNextNonceHint(account, nonce) {
  const nextNonce = normalizeNonce(nonce);
  const key = nonceHintKey(account);

  if (!key || !nextNonce || typeof globalThis?.localStorage === 'undefined') {
    return;
  }

  try {
    globalThis.localStorage.setItem(key, String(nextNonce));
  } catch (_error) {
    // Local nonce hints are UX-only. Failing to persist one must never block wallet flow.
  }
}

export function stableIdempotencyKey(...parts) {
  const normalized = normalizeIdempotencyText(parts.join(':'));

  if (!normalized) {
    return compactIdempotencyKey(`crablink-idem:${Date.now()}:${Math.random().toString(16).slice(2)}`);
  }

  return compactIdempotencyKey(`crablink-idem:${normalized}`);
}

export function compactIdempotencyKey(value, prefix = 'crablink-idem') {
  const normalized = normalizeIdempotencyText(value);

  if (!normalized) {
    return '';
  }

  if (normalized.length <= MAX_IDEMPOTENCY_KEY_BYTES) {
    return normalized;
  }

  const hash = fnv1a64Hex(normalized);
  const safePrefix = normalizeIdempotencyText(prefix) || 'crablink-idem';
  const suffixBudget = MAX_IDEMPOTENCY_KEY_BYTES - safePrefix.length - hash.length - 2;
  const suffix = normalized
    .replace(/[:]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, Math.max(0, suffixBudget));

  if (!suffix) {
    return `${safePrefix}:${hash}`;
  }

  return `${safePrefix}:${hash}:${suffix}`;
}

function nestedHoldObjects(root) {
  const out = [];
  const seen = new Set();

  function push(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value) || seen.has(value)) {
      return;
    }

    seen.add(value);
    out.push(value);

    const nestedKeys = [
      'walletHold',
      'wallet_hold',
      'hold',
      'receipt',
      'result',
      'data',
      'response',
      'paid_proof',
      'paidProof',
    ];

    for (const key of nestedKeys) {
      push(value[key]);
    }
  }

  push(root);

  return out;
}

function firstNestedValue(objects, keys) {
  for (const object of objects) {
    for (const key of keys) {
      const value = object?.[key];
      const clean = stringValue(value);

      if (clean) {
        return clean;
      }
    }
  }

  return '';
}

function findNestedNonce(value, seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) {
    return 0;
  }

  seen.add(value);

  const direct = Number(
    value.expected_nonce ||
      value.expectedNonce ||
      value.next_nonce ||
      value.nextNonce ||
      0,
  );

  if (Number.isSafeInteger(direct) && direct > 0) {
    return direct;
  }

  for (const child of Object.values(value)) {
    const nested = findNestedNonce(child, seen);
    if (nested) {
      return nested;
    }
  }

  return 0;
}

function normalizeAmountMinor(...values) {
  for (const value of values) {
    const raw = String(value ?? '').trim();

    if (/^[0-9]+$/.test(raw)) {
      return raw;
    }

    const n = Number(raw);
    if (Number.isSafeInteger(n) && n >= 0) {
      return String(n);
    }
  }

  return '';
}

function normalizeNonce(value) {
  const raw = String(value ?? '').trim();
  const n = Number(raw);

  return Number.isSafeInteger(n) && n > 0 ? n : 0;
}

function nonceHintKey(account) {
  const clean = normalizeIdempotencyText(account);

  if (!clean) {
    return '';
  }

  return `${NONCE_HINT_PREFIX}${clean}`;
}

function summarizeWalletError(error) {
  return {
    name: error?.name || 'Error',
    message: error?.message || String(error || ''),
    reason: error?.reason || '',
    status: Number(error?.status || 0),
    correlation_id: String(error?.correlationId || ''),
    expected_nonce: expectedNonceFromWalletError(error) || null,
    data: error?.data || null,
  };
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

function normalizeIdempotencyText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.:-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function fnv1a64Hex(value) {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;

  for (let i = 0; i < value.length; i += 1) {
    hash ^= BigInt(value.charCodeAt(i) & 0xff);
    hash = (hash * prime) & mask;
  }

  return hash.toString(16).padStart(16, '0');
}

function safeJson(value) {
  try {
    return JSON.stringify(value || null);
  } catch (_error) {
    return '';
  }
}

function makeWalletError(message, reason, details = {}) {
  const error = new Error(String(message || 'Wallet request failed.'));
  error.name = 'WalletClientError';
  error.reason = reason || 'wallet_request_failed';
  error.status = Number(details.status || 0);
  error.retryable = Boolean(details.retryable);
  error.data = details.data || null;
  error.correlationId = String(details.correlationId || '');
  return error;
}