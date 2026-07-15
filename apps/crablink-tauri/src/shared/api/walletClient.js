/**
 * RO:WHAT — Wallet display and explicit hold API helper for the React CrabLink shell.
 * RO:WHY — Keeps balance and wallet hold flows gateway-routed, explicit, nonce-aware, and strict-DTO-safe.
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
      const response = await this.gateway.getWalletBalance(walletAccount);
      return normalizeGatewayWalletBalanceResponse(response, walletAccount);
    }

    const response = await this.gateway.request(`/wallet/${encodeURIComponent(walletAccount)}/balance`, {
      label: 'Wallet balance',
    });

    return normalizeGatewayWalletBalanceResponse(response, walletAccount);
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

      if (!expectedNonce || String(expectedNonce) === String(firstRequest.nonce)) {
        throw decorateWalletError(error, {
          request: firstRequest,
          apiRequest: toWalletHoldApiBody(firstRequest),
          nonceRecovery: null,
        });
      }

      persistNextNonceHint(firstRequest.from, expectedNonce);

      const retryRequest = normalizeWalletHoldRequest({
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
      });

      try {
        return await this.sendHoldRequest(retryRequest, {
          nonceRecovery: {
            recovered: true,
            first_nonce: firstRequest.nonce,
            retried_nonce: retryRequest.nonce,
            first_error: summarizeWalletError(error),
          },
        });
      } catch (retryError) {
        throw decorateWalletError(retryError, {
          request: retryRequest,
          apiRequest: toWalletHoldApiBody(retryRequest),
          nonceRecovery: {
            recovered: false,
            first_nonce: firstRequest.nonce,
            retried_nonce: retryRequest.nonce,
            first_error: summarizeWalletError(error),
            retry_error: summarizeWalletError(retryError),
          },
        });
      }
    }
  }

  async createWalletHold(payload = {}, options = {}) {
    return this.hold(payload, {
      ...options,
      confirmed: options.confirmed === true,
    });
  }

  async sendHoldRequest(request, { nonceRecovery = null } = {}) {
    const apiRequest = toWalletHoldApiBody(request);

    const response = await this.gateway.request('/wallet/hold', {
      method: 'POST',
      body: apiRequest,
      label: 'Wallet hold',
      mutation: true,
      headers: {
        'Idempotency-Key': apiRequest.idempotency_key,
        'x-ron-wallet-account': apiRequest.from,
      },
      idempotencyKey: apiRequest.idempotency_key,
    });

    const walletHold = normalizeWalletHoldResponse(response?.data || response || {}, apiRequest);
    const nextNonce = Number(walletHold.nonce || apiRequest.nonce || 0) + 1;

    if (Number.isSafeInteger(nextNonce) && nextNonce > 1) {
      persistNextNonceHint(apiRequest.from, nextNonce);
    }

    return {
      ...response,
      data: response?.data || null,
      walletHold,
      request,
      apiRequest,
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
  const from = stringValue(payload.from, payload.payer, payload.payer_account, payload.payerAccount);
  const to = stringValue(payload.to, payload.escrow, payload.escrow_account, payload.escrowAccount);
  const asset = stringValue(payload.asset, DEFAULT_ASSET).toLowerCase();
  const amountMinor = normalizeAmountMinor(payload.amount_minor, payload.amountMinor, payload.amount);
  const nonce = normalizeNonce(payload.nonce);
  const memo = stringValue(payload.memo).slice(0, 240);
  const idempotencyKey = compactIdempotencyKey(
    payload.idempotency_key ||
      payload.idempotencyKey ||
      payload.idem ||
      stableIdempotencyKey('wallet-hold', from, to, asset, amountMinor, nonce, memo),
    'wallet-hold',
  );

  if (!from) {
    throw makeWalletError('Wallet hold requires a payer account.', 'missing_from');
  }

  if (!to) {
    throw makeWalletError('Wallet hold requires an escrow/payee account.', 'missing_to');
  }

  if (asset !== DEFAULT_ASSET) {
    throw makeWalletError('Wallet hold currently supports only the internal roc asset.', 'invalid_asset');
  }

  if (!amountMinor) {
    throw makeWalletError('Wallet hold requires a positive integer amount_minor.', 'missing_amount_minor');
  }

  if (!nonce) {
    throw makeWalletError('Wallet hold requires a positive integer nonce.', 'missing_nonce');
  }

  return Object.freeze({
    from,
    to,
    asset,
    amount_minor: amountMinor,
    nonce,
    memo: memo || `CrabLink wallet hold ${from} -> ${to}`,
    idempotency_key: idempotencyKey,
  });
}

export function toWalletHoldApiBody(payload = {}) {
  const request = normalizeWalletHoldRequest(payload);

  return {
    from: request.from,
    to: request.to,
    asset: request.asset,
    amount_minor: request.amount_minor,
    nonce: request.nonce,
    memo: request.memo,
    idempotency_key: request.idempotency_key,
  };
}

export function normalizeWalletHoldResponse(data = {}, request = {}) {
  const source = data && typeof data === 'object' ? data : {};
  const candidates = nestedHoldObjects(source);

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
    firstNestedValue(candidates, ['to', 'escrow', 'escrow_account', 'escrowAccount', 'payee', 'wallet_to', 'walletTo']),
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

  const nonce = normalizeNonce(firstNestedValue(candidates, ['nonce', 'seq', 'sequence']) || request.nonce);
  const asset = stringValue(firstNestedValue(candidates, ['asset']), request.asset, DEFAULT_ASSET).toLowerCase();
  const op = stringValue(firstNestedValue(candidates, ['op', 'operation']), 'hold').toLowerCase();
  const idem = stringValue(
    firstNestedValue(candidates, ['idem', 'idempotency_key', 'idempotencyKey']),
    request.idempotency_key,
  );

  return Object.freeze(stripEmpty({
    txid,
    receipt_hash: receiptHash,
    from,
    to,
    asset,
    amount_minor: amountMinor,
    nonce,
    op,
    idem,
    status: stringValue(firstNestedValue(candidates, ['status']), txid ? 'held' : ''),
    ledger_seq_start: stringValue(firstNestedValue(candidates, ['ledger_seq_start', 'ledgerSeqStart'])),
    ledger_seq_end: stringValue(firstNestedValue(candidates, ['ledger_seq_end', 'ledgerSeqEnd'])),
    ledger_root: stringValue(firstNestedValue(candidates, ['ledger_root', 'ledgerRoot'])),
    ts: stringValue(firstNestedValue(candidates, ['ts', 'timestamp'])),
    raw: source,
  }));
}

export function expectedNonceFromWalletError(error) {
  const roots = [
    error,
    error?.data,
    error?.response,
    error?.response?.data,
    error?.data?.data,
    error?.data?.error,
    error?.data?.problem,
    error?.problem,
    error?.details,
  ].filter(Boolean);

  for (const root of roots) {
    const direct = normalizeNonce(
      root.expected_nonce,
      root.expectedNonce,
      root.next_nonce,
      root.nextNonce,
      root.required_nonce,
      root.requiredNonce,
      root.current_nonce,
      root.currentNonce,
      root.details?.expected_nonce,
      root.details?.expectedNonce,
      root.problem?.expected_nonce,
      root.problem?.expectedNonce,
    );

    if (direct) {
      return direct;
    }

    const text = [
      root.message,
      root.detail,
      root.error,
      root.reason,
      root.code,
      typeof root === 'string' ? root : '',
    ]
      .filter(Boolean)
      .join(' ');

    const fromText = expectedNonceFromText(text);

    if (fromText) {
      return fromText;
    }
  }

  const fallbackText = [
    error?.message,
    typeof error === 'string' ? error : '',
    safeStringify(error?.data),
  ]
    .filter(Boolean)
    .join(' ');

  return expectedNonceFromText(fallbackText);
}

export function expectedNonceFromText(text) {
  const source = String(text || '');

  const patterns = [
    /expected(?:\s+nonce)?\s*(?:is|=|:)?\s*([0-9]+)/i,
    /next(?:\s+nonce)?\s*(?:is|=|:)?\s*([0-9]+)/i,
    /required(?:\s+nonce)?\s*(?:is|=|:)?\s*([0-9]+)/i,
    /nonce\s*(?:is|=|:)?\s*expected\s*([0-9]+)/i,
    /expecting\s*([0-9]+)/i,
    /expected\s+([0-9]+)/i,
  ];

  for (const pattern of patterns) {
    const match = source.match(pattern);

    if (match?.[1]) {
      return normalizeNonce(match[1]);
    }
  }

  return 0;
}

export function normalizeGatewayWalletBalanceResponse(response = {}, account = '') {
  const walletBalance = normalizeWalletBalance(response?.data || response || {}, account);

  return Object.freeze({
    ...(response && typeof response === 'object' ? response : {}),
    data: walletBalance,
    walletBalance,
  });
}

export function normalizeWalletBalance(data = {}, account = '') {
  const source = chooseWalletBalanceObject(data);
  const availableMinor = normalizeAmountMinor(source.available_minor, source.availableMinor, source.available_minor_units, source.availableMinorUnits, source.available, source.balance_minor, source.balanceMinor, source.balance_minor_units, source.balanceMinorUnits, source.balance, source.amount_minor, source.amountMinor);
  const ledgerBacked = Boolean(source.ledger_backed || source.ledgerBacked || source.source === 'ledger');
  const refreshedAt = stringValue(source.refreshed_at, source.refreshedAt, source.checked_at, source.checkedAt, source.ts, source.timestamp, new Date().toISOString());
  const display = displayRoc(availableMinor) || stringValue(source.display, source.balance_display, source.balanceDisplay);

  return Object.freeze(stripEmpty({
    account: stringValue(source.account, source.wallet_account, source.walletAccount, account),
    asset: stringValue(source.asset, DEFAULT_ASSET).toLowerCase(),
    available_minor: availableMinor,
    availableMinor,
    available_display: display,
    display,
    balance_display: display,
    balanceDisplay: display,
    ledger_backed: ledgerBacked,
    ledgerBacked,
    backendDerived: true,
    backend_derived: true,
    stale: false,
    displayOnly: true,
    source: stringValue(source.source, ledgerBacked ? 'ledger' : 'gateway wallet response'),
    sourceLabel: ledgerBacked ? 'ledger-backed backend balance' : 'backend-derived balance',
    refreshedAt,
    refreshed_at: refreshedAt,
    truthBoundary: 'Backend wallet balance response. CrabLink display only; ron-ledger remains durable balance truth.',
    raw: data,
  }));
}

export function markWalletBalanceStale(balance = null, error = null, account = '') {
  const previous = balance && typeof balance === 'object' && !Array.isArray(balance) ? balance : null;
  const safeError = normalizeWalletBalanceError(error);

  if (!previous) {
    return null;
  }

  return Object.freeze(stripEmpty({
    ...previous,
    account: previous.account || account,
    backendDerived: false,
    backend_derived: false,
    stale: true,
    staleDisplay: true,
    displayOnly: true,
    sourceLabel: 'stale backend display',
    staleReason: safeError.reason || 'wallet_balance_refresh_failed',
    staleMessage: safeError.message,
    truthBoundary: 'Stale wallet balance display. Backend refresh failed; this is not balance truth.',
  }));
}

export function normalizeWalletBalanceError(error = null) {
  return Object.freeze(stripEmpty({
    name: stringValue(error?.name, 'WalletBalanceRefreshError'),
    message: redactWalletError(error?.message || error || 'Wallet balance refresh failed.'),
    reason: stringValue(error?.reason, error?.code, 'wallet_balance_refresh_failed'),
    status: Number(error?.status || 0) || undefined,
    correlationId: stringValue(error?.correlationId, error?.correlation_id),
    retryable: error?.retryable !== false,
    sourceLabel: 'backend wallet balance refresh',
    displayOnly: true,
  }));
}

export function displayRoc(minor) {
  const raw = normalizeAmountMinor(minor);

  if (!raw) {
    return '';
  }

  return `${raw} ROC`;
}

export function loadNextNonceHint(account) {
  if (!canUseLocalStorage()) {
    return 0;
  }

  try {
    return normalizeNonce(window.localStorage.getItem(nonceHintKey(account)));
  } catch (_error) {
    return 0;
  }
}

export function persistNextNonceHint(account, nonce) {
  const normalized = normalizeNonce(nonce);

  if (!normalized || !canUseLocalStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(nonceHintKey(account), String(normalized));
  } catch (_error) {
    // Local nonce hint storage is best-effort UX only. It is never backend truth.
  }
}

export function clearNextNonceHint(account) {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    window.localStorage.removeItem(nonceHintKey(account));
  } catch (_error) {
    // Local nonce hint storage is best-effort UX only.
  }
}

export function stableIdempotencyKey(...parts) {
  const raw = parts
    .flat()
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(':');

  return raw || `crablink:${Date.now()}:${Math.random().toString(16).slice(2)}`;
}

export function compactIdempotencyKey(value, prefix = 'crablink') {
  const raw = String(value || '').trim();
  const normalized = raw
    .toLowerCase()
    .replace(/[^a-z0-9_.:-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (normalized.length > 0 && byteLength(normalized) <= MAX_IDEMPOTENCY_KEY_BYTES) {
    return normalized;
  }

  const hash = fnv1aHex(normalized || `${Date.now()}:${Math.random()}`);
  const cleanPrefix = String(prefix || 'crablink')
    .toLowerCase()
    .replace(/[^a-z0-9_.:-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 20) || 'crablink';
  const budget = MAX_IDEMPOTENCY_KEY_BYTES - cleanPrefix.length - hash.length - 2;
  const suffix = normalized.slice(0, Math.max(0, budget));

  return suffix ? `${cleanPrefix}:${hash}:${suffix}` : `${cleanPrefix}:${hash}`;
}

export function summarizeWalletError(error) {
  return stripEmpty({
    name: stringValue(error?.name),
    message: stringValue(error?.message, error),
    reason: stringValue(error?.reason, error?.code, error?.problemCode),
    status: Number(error?.status || 0) || undefined,
    correlation_id: stringValue(error?.correlationId, error?.correlation_id),
    expected_nonce: expectedNonceFromWalletError(error),
    data: error?.data || null,
    api_request: error?.apiRequest || null,
  });
}

function chooseWalletBalanceObject(data = {}) {
  const root = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  for (const candidate of [root.balance, root.wallet, root.walletBalance, root.wallet_balance, root.data]) {
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
      return candidate;
    }
  }
  return root;
}

function redactWalletError(value) {
  return stringValue(value, 'Wallet balance refresh failed.')
    .replace(/bearer\s+[^\s,;}]+/gi, 'Bearer [redacted]')
    .replace(/(authorization\s*[:=]\s*)[^\s,;}]+/gi, '$1[redacted]')
    .replace(/(token\s*[:=]\s*)[^\s,;}]+/gi, '$1[redacted]')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 240);
}

function nestedHoldObjects(object) {
  const source = object && typeof object === 'object' && !Array.isArray(object) ? object : {};

  return [
    source,
    source.data,
    source.hold,
    source.wallet_hold,
    source.walletHold,
    source.receipt,
    source.result,
  ].filter((value) => value && typeof value === 'object' && !Array.isArray(value));
}

function firstNestedValue(candidates, keys) {
  for (const candidate of candidates || []) {
    for (const key of keys) {
      const value = candidate?.[key];

      if (value !== undefined && value !== null && String(value).trim() !== '') {
        return value;
      }
    }
  }

  return '';
}

function decorateWalletError(error, extra = {}) {
  const out = error instanceof Error ? error : makeWalletError(String(error || 'Wallet request failed.'));
  Object.assign(out, stripEmpty(extra));
  return out;
}

function makeWalletError(message, reason = 'wallet_error') {
  const error = new Error(message);
  error.name = 'WalletClientError';
  error.reason = reason;
  error.status = 0;
  error.retryable = false;
  return error;
}

function normalizeAmountMinor(...values) {
  for (const value of values) {
    const raw = String(value ?? '').trim();

    if (/^[0-9]+$/.test(raw) && raw !== '0') {
      return raw;
    }

    const n = Number(raw);

    if (Number.isSafeInteger(n) && n > 0) {
      return String(n);
    }
  }

  return '';
}

function normalizeNonce(...values) {
  for (const value of values) {
    const raw = String(value ?? '').trim();

    if (/^[0-9]+$/.test(raw) && raw !== '0') {
      return Number(raw);
    }

    const n = Number(raw);

    if (Number.isSafeInteger(n) && n > 0) {
      return n;
    }
  }

  return 0;
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

function stripEmpty(value) {
  return Object.fromEntries(
    Object.entries(value || {}).filter(([, child]) => {
      if (child === undefined || child === null) return false;
      if (typeof child === 'string' && !child.trim()) return false;
      return true;
    }),
  );
}

function safeStringify(value) {
  try {
    return JSON.stringify(value);
  } catch (_error) {
    return '';
  }
}

function nonceHintKey(account) {
  return `${NONCE_HINT_PREFIX}${String(account || 'default').trim() || 'default'}`;
}

function canUseLocalStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
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

export { normalizeConfirmedRocProjection } from '../wallet/confirmedRocProjection.js';
