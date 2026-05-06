/**
 * RO:WHAT — Gateway-only HTTP client for CrabLink browser calls.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; centralize headers, errors, timeouts, idempotency.
 * RO:INTERACTS — svc-gateway public routes, popup.js, page.js, options.js.
 * RO:INVARIANTS — gateway routes start with /; no direct internal services; no private keys; no fake ledger truth.
 * RO:METRICS — emits x-correlation-id for backend logs/metrics correlation.
 * RO:CONFIG — gatewayUrl, requestTimeoutMs, authToken, passportSubject, walletAccount.
 * RO:SECURITY — bearer token is local-dev only; wallet spend remains backend-gated.
 * RO:TEST — scripts/check-chrome.sh plus manual gateway/identity/resolver/prepare/upload checks.
 */

const MAX_IDEMPOTENCY_KEY_BYTES = 64;

export class RonClientError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'RonClientError';
    this.route = details.route || '';
    this.status = details.status || 0;
    this.reason = details.reason || '';
    this.correlationId = details.correlationId || '';
    this.retryable = Boolean(details.retryable);
    this.data = details.data || null;
  }
}

export class RonClient {
  constructor(settings) {
    this.settings = settings || {};
    this.gatewayUrl = normalizeBaseUrl(this.settings.gatewayUrl);
    this.requestTimeoutMs = normalizeTimeout(this.settings.requestTimeoutMs);
  }

  async getHealth() {
    return this.request('/healthz', {
      label: 'Health check'
    });
  }

  async getReady() {
    return this.request('/readyz', {
      label: 'Readiness check'
    });
  }

  async getIdentity() {
    return this.request('/identity/me', {
      label: 'Identity check'
    });
  }

  async bootstrapPassport(body = {}) {
    const walletAccount = String(
      body.wallet_account || body.walletAccount || this.settings.walletAccount || 'acct_dev'
    ).trim();

    const passportSubject = String(
      body.passport_subject || body.passportSubject || this.settings.passportSubject || 'passport:main:dev'
    ).trim();

    const requested = normalizeRequestedUsername(
      body.requested_username ||
        body.requestedUsername ||
        body.requested_handle ||
        body.requestedHandle ||
        this.settings.requestedUsername ||
        this.settings.requestedHandle ||
        ''
    );

    const usernameFields = requested
      ? {
          requested_username: requested.username,
          requested_handle: requested.handle
        }
      : {};

    return this.request('/identity/passport/bootstrap', {
      method: 'POST',
      body: {
        kind: 'main',
        label: 'CrabLink main passport',
        client: 'crablink-chrome',
        request_starter_grant: true,
        create_wallet: true,
        desired_starting_balance_minor_units: '1776',
        ...body,
        ...usernameFields
      },
      label: 'Passport bootstrap',
      mutation: true,
      idempotencyKey: stableIdempotencyKey(
        'passport-bootstrap',
        passportSubject,
        walletAccount,
        requested?.username || ''
      )
    });
  }

  async getWalletBalance(account) {
    const walletAccount = String(account || this.settings.walletAccount || '').trim();

    if (!walletAccount) {
      throw new RonClientError('Wallet account is not loaded.', {
        route: '/wallet/:account/balance'
      });
    }

    return this.request(`/wallet/${encodeURIComponent(walletAccount)}/balance`, {
      label: 'Wallet balance'
    });
  }

  async resolveCrab(url) {
    const crabUrl = String(url || '').trim();

    if (!crabUrl) {
      throw new RonClientError('Crab URL is required.', {
        route: '/crab/resolve'
      });
    }

    return this.request(`/crab/resolve?url=${encodeURIComponent(crabUrl)}`, {
      label: 'Crab resolver'
    });
  }

  async getB3Asset(hash, kind = 'image') {
    const cleanHash = String(hash || '').trim().toLowerCase();
    const cleanKind = String(kind || 'image').trim().toLowerCase();

    if (!/^[0-9a-f]{64}$/.test(cleanHash)) {
      throw new RonClientError('B3 hash must be 64 lowercase hex characters.', {
        route: '/b3/:hash.:kind'
      });
    }

    if (!/^[a-z][a-z0-9_-]{0,31}$/.test(cleanKind)) {
      throw new RonClientError('Asset kind is invalid.', {
        route: '/b3/:hash.:kind'
      });
    }

    return this.request(`/b3/${cleanHash}.${cleanKind}`, {
      label: 'B3 asset page'
    });
  }

  async resolveSite(name) {
    const siteName = String(name || '').trim();

    if (!siteName) {
      throw new RonClientError('Site name is required.', {
        route: '/sites/:name'
      });
    }

    return this.request(`/sites/${encodeURIComponent(siteName)}`, {
      label: 'Site resolver'
    });
  }

  async prepareImageAsset(body = {}, options = {}) {
    return this.request('/assets/image/prepare', {
      method: 'POST',
      body,
      label: 'Image asset prepare',
      idempotencyKey:
        options.idempotencyKey ||
        body.client_idempotency_key ||
        stableIdempotencyKey('image-prepare', body.title || body.content_type || body.bytes || 'draft')
    });
  }

  async prepareSite(body = {}, options = {}) {
    return this.request('/sites/prepare', {
      method: 'POST',
      body,
      label: 'Site prepare',
      idempotencyKey:
        options.idempotencyKey ||
        body.client_idempotency_key ||
        stableIdempotencyKey('site-prepare', body.site_name || body.total_bytes || 'draft')
    });
  }

  async createSite(body = {}, options = {}) {
    const paidProof = options.paidProof ? normalizePaidProof(options.paidProof) : null;
    const headers = {};

    if (paidProof) {
      headers['x-ron-wallet-txid'] = paidProof.txid;
      headers['x-ron-wallet-receipt-hash'] = paidProof.receiptHash;
      headers['x-ron-wallet-from'] = paidProof.from;
      headers['x-ron-wallet-to'] = paidProof.to;
      headers['x-ron-paid-op'] = paidProof.op || 'hold';
      headers['x-ron-paid-asset'] = paidProof.asset || 'roc';
      headers['x-ron-paid-estimate-minor'] = paidProof.amountMinor;
    }

    return this.request('/sites', {
      method: 'POST',
      body,
      label: 'Site create',
      mutation: true,
      headers,
      idempotencyKey:
        options.idempotencyKey ||
        body.client_idempotency_key ||
        stableIdempotencyKey('site-create', body.site_name, body.root_document_cid, paidProof?.txid || '')
    });
  }

  async createWalletHold(body = {}, options = {}) {
    const idem = stableIdempotencyKey(
      options.idempotencyKey ||
        body.idempotency_key ||
        'wallet-hold',
      body.from,
      body.to,
      body.amount_minor,
      body.nonce
    );

    const safeBody = {
      ...body,
      idempotency_key: idem
    };

    return this.request('/wallet/hold', {
      method: 'POST',
      body: safeBody,
      label: 'Wallet hold',
      mutation: true,
      idempotencyKey: idem
    });
  }

  async uploadImageAsset({ file, title, description, tags, paidProof, idempotencyKey } = {}) {
    if (!(file instanceof Blob)) {
      throw new RonClientError('Image upload requires a selected File or Blob.', {
        route: '/assets/image'
      });
    }

    const proof = normalizePaidProof(paidProof);
    const headers = {
      'Content-Type': file.type || 'image/png',
      'x-ron-paid-op': proof.op || 'hold',
      'x-ron-paid-asset': proof.asset || 'roc',
      'x-ron-paid-estimate-minor': proof.amountMinor,
      'x-ron-wallet-txid': proof.txid,
      'x-ron-wallet-receipt-hash': proof.receiptHash,
      'x-ron-wallet-from': proof.from,
      'x-ron-wallet-to': proof.to
    };

    const cleanTitle = String(title || '').trim();
    if (cleanTitle) headers['x-ron-asset-title'] = cleanTitle;

    const cleanDescription = String(description || '').trim();
    if (cleanDescription) headers['x-ron-asset-description'] = cleanDescription;

    const cleanTags = normalizeTags(tags).join(',');
    if (cleanTags) headers['x-ron-asset-tags'] = cleanTags;

    return this.requestRaw('/assets/image', {
      method: 'POST',
      body: file,
      label: 'Image asset upload',
      mutation: true,
      headers,
      idempotencyKey: idempotencyKey || stableIdempotencyKey('image-upload', proof.txid, file.size)
    });
  }

  async request(path, options = {}) {
    const cleanPath = String(path || '').trim();

    if (!cleanPath.startsWith('/')) {
      throw new RonClientError('Gateway path must start with /.', {
        route: cleanPath
      });
    }

    const method = String(options.method || 'GET').toUpperCase();
    const route = cleanPath;
    const correlationId = makeCorrelationId();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    try {
      const response = await fetch(`${this.gatewayUrl}${cleanPath}`, {
        method,
        headers: this.makeHeaders({
          body: options.body,
          correlationId,
          idempotencyKey: options.idempotencyKey,
          mutation: options.mutation,
          extraHeaders: options.headers
        }),
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: controller.signal
      });

      const text = await response.text();
      const parsed = parseResponseBody(text);

      if (!response.ok) {
        throw new RonClientError(errorMessage(options.label, response, parsed), {
          route,
          status: response.status,
          reason: parsed?.reason || parsed?.code || parsed?.error || '',
          correlationId: response.headers.get('x-correlation-id') || correlationId,
          retryable: isRetryableStatus(response.status),
          data: parsed
        });
      }

      return {
        ok: true,
        status: response.status,
        route,
        correlationId: response.headers.get('x-correlation-id') || correlationId,
        data: parsed ?? text
      };
    } catch (error) {
      if (error instanceof RonClientError) {
        throw error;
      }

      if (error?.name === 'AbortError') {
        throw new RonClientError(`${options.label || 'Gateway request'} timed out.`, {
          route,
          status: 0,
          correlationId,
          retryable: true
        });
      }

      throw new RonClientError(`${options.label || 'Gateway request'} failed to fetch.`, {
        route,
        status: 0,
        correlationId,
        retryable: true,
        data: {
          message: error?.message || String(error)
        }
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  async requestRaw(path, options = {}) {
    const cleanPath = String(path || '').trim();

    if (!cleanPath.startsWith('/')) {
      throw new RonClientError('Gateway path must start with /.', {
        route: cleanPath
      });
    }

    const method = String(options.method || 'POST').toUpperCase();
    const route = cleanPath;
    const correlationId = makeCorrelationId();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    try {
      const response = await fetch(`${this.gatewayUrl}${cleanPath}`, {
        method,
        headers: this.makeHeaders({
          body: undefined,
          correlationId,
          idempotencyKey: options.idempotencyKey,
          mutation: options.mutation,
          extraHeaders: options.headers
        }),
        body: options.body,
        signal: controller.signal
      });

      const text = await response.text();
      const parsed = parseResponseBody(text);

      if (!response.ok) {
        throw new RonClientError(errorMessage(options.label, response, parsed), {
          route,
          status: response.status,
          reason: parsed?.reason || parsed?.code || parsed?.error || '',
          correlationId: response.headers.get('x-correlation-id') || correlationId,
          retryable: isRetryableStatus(response.status),
          data: parsed
        });
      }

      return {
        ok: true,
        status: response.status,
        route,
        correlationId: response.headers.get('x-correlation-id') || correlationId,
        data: parsed ?? text
      };
    } catch (error) {
      if (error instanceof RonClientError) {
        throw error;
      }

      if (error?.name === 'AbortError') {
        throw new RonClientError(`${options.label || 'Gateway request'} timed out.`, {
          route,
          status: 0,
          correlationId,
          retryable: true
        });
      }

      throw new RonClientError(`${options.label || 'Gateway request'} failed to fetch.`, {
        route,
        status: 0,
        correlationId,
        retryable: true,
        data: {
          message: error?.message || String(error)
        }
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  makeHeaders({ body, correlationId, idempotencyKey, mutation, extraHeaders } = {}) {
    const headers = new Headers();

    headers.set('Accept', 'application/json');
    headers.set('x-correlation-id', correlationId || makeCorrelationId());

    if (body !== undefined) {
      headers.set('Content-Type', 'application/json');
    }

    const token = String(this.settings.authToken || '').trim();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const passport = String(this.settings.passportSubject || '').trim();
    if (passport) {
      headers.set('x-ron-passport', passport);
    }

    const wallet = String(this.settings.walletAccount || '').trim();
    if (wallet) {
      headers.set('x-ron-wallet-account', wallet);
    }

    const idem = compactIdempotencyKey(idempotencyKey);
    if (idem) {
      headers.set('Idempotency-Key', idem);
    } else if (mutation) {
      headers.set('Idempotency-Key', stableIdempotencyKey('mutation', Date.now()));
    }

    if (extraHeaders && typeof extraHeaders === 'object') {
      for (const [key, value] of Object.entries(extraHeaders)) {
        const cleanKey = String(key || '').trim();
        const cleanValue = value === undefined || value === null ? '' : String(value).trim();

        if (!cleanKey || !cleanValue) {
          continue;
        }

        if (cleanKey.toLowerCase() === 'idempotency-key') {
          headers.set('Idempotency-Key', compactIdempotencyKey(cleanValue));
        } else {
          headers.set(cleanKey, cleanValue);
        }
      }
    }

    return headers;
  }
}

function normalizeRequestedUsername(value) {
  const raw = String(value || '').trim().toLowerCase().replace(/^@+/, '');

  if (!raw) {
    return null;
  }

  if (raw.length < 3 || raw.length > 32) {
    throw new RonClientError('@username must be between 3 and 32 characters.', {
      route: '/identity/passport/bootstrap'
    });
  }

  if (!/^[a-z0-9][a-z0-9_.-]*$/.test(raw)) {
    throw new RonClientError('@username may only use lowercase letters, numbers, underscore, hyphen, and dot, and must start with a letter or number.', {
      route: '/identity/passport/bootstrap'
    });
  }

  if (raw.includes('..') || raw.endsWith('.') || raw.endsWith('-') || raw.endsWith('_')) {
    throw new RonClientError('@username has invalid punctuation placement.', {
      route: '/identity/passport/bootstrap'
    });
  }

  if (RESERVED_USERNAMES.has(raw)) {
    throw new RonClientError(`@${raw} is reserved.`, {
      route: '/identity/passport/bootstrap'
    });
  }

  return {
    username: raw,
    handle: `@${raw}`
  };
}

const RESERVED_USERNAMES = new Set([
  'admin',
  'api',
  'app',
  'article',
  'asset',
  'assets',
  'b3',
  'comment',
  'crab',
  'gateway',
  'image',
  'mail',
  'manifest',
  'mod',
  'moderator',
  'music',
  'passport',
  'post',
  'profile',
  'profiles',
  'root',
  'site',
  'sites',
  'support',
  'sys',
  'system',
  'wallet'
]);

function normalizePaidProof(proof = {}) {
  const txid = String(
    proof.txid ||
      proof.tx_id ||
      proof.wallet_txid ||
      proof.walletTxid ||
      proof.hold_txid ||
      proof.holdTxid ||
      ''
  ).trim();

  const receiptHash = String(
    proof.receipt_hash ||
      proof.receiptHash ||
      proof.wallet_receipt_hash ||
      proof.walletReceiptHash ||
      ''
  ).trim();

  const from = String(
    proof.from ||
      proof.payer_account ||
      proof.payerAccount ||
      proof.wallet_from ||
      proof.walletFrom ||
      ''
  ).trim();

  const to = String(
    proof.to ||
      proof.escrow_account ||
      proof.escrowAccount ||
      proof.wallet_to ||
      proof.walletTo ||
      'escrow_paid_write'
  ).trim();

  const amountMinor = String(
    proof.amount_minor ||
      proof.amountMinor ||
      proof.amount_minor_units ||
      proof.amountMinorUnits ||
      proof.estimate_minor ||
      proof.estimateMinor ||
      ''
  ).trim();

  const asset = String(proof.asset || 'roc').trim().toLowerCase();
  const op = String(proof.op || 'hold').trim().toLowerCase();

  if (!txid) {
    throw new RonClientError('Paid proof is missing txid.', { route: 'paid-proof' });
  }

  if (!receiptHash) {
    throw new RonClientError('Paid proof is missing receipt_hash.', { route: 'paid-proof' });
  }

  if (!from) {
    throw new RonClientError('Paid proof is missing payer/from account.', { route: 'paid-proof' });
  }

  if (!to) {
    throw new RonClientError('Paid proof is missing escrow/to account.', { route: 'paid-proof' });
  }

  if (!amountMinor || !/^\d+$/.test(amountMinor) || amountMinor === '0') {
    throw new RonClientError('Paid proof amount_minor must be a positive integer string.', {
      route: 'paid-proof'
    });
  }

  return { txid, receiptHash, from, to, amountMinor, asset, op };
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) {
    return tags.map((tag) => String(tag || '').trim()).filter(Boolean);
  }

  return String(tags || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function normalizeBaseUrl(value) {
  const raw = String(value || 'http://127.0.0.1:8090').trim().replace(/\/+$/, '');

  if (!/^https?:\/\//i.test(raw)) {
    throw new RonClientError('Gateway URL must start with http:// or https://.', {
      route: 'settings.gatewayUrl'
    });
  }

  return raw;
}

export function normalizeTimeout(value) {
  const n = Number(value);

  if (!Number.isFinite(n)) {
    return 7000;
  }

  return Math.min(30000, Math.max(1000, Math.floor(n)));
}

export function stableIdempotencyKey(...parts) {
  const normalized = normalizeIdempotencyText(parts.join(':'));

  if (!normalized) {
    return compactIdempotencyKey(`crablink-idem:${Date.now()}:${Math.random().toString(16).slice(2)}`);
  }

  return compactIdempotencyKey(`crablink-idem:${normalized}`);
}

function compactIdempotencyKey(value) {
  const normalized = normalizeIdempotencyText(value);

  if (!normalized) {
    return '';
  }

  if (normalized.length <= MAX_IDEMPOTENCY_KEY_BYTES) {
    return normalized;
  }

  const hash = fnv1a64Hex(normalized);
  const prefix = 'crablink-idem';
  const suffixBudget = MAX_IDEMPOTENCY_KEY_BYTES - prefix.length - hash.length - 2;
  const suffix = normalized
    .replace(/[:]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, Math.max(0, suffixBudget));

  if (!suffix) {
    return `${prefix}:${hash}`;
  }

  return `${prefix}:${hash}:${suffix}`;
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

function makeCorrelationId() {
  return `crablink-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseResponseBody(text) {
  const clean = String(text || '').trim();

  if (!clean) {
    return null;
  }

  try {
    return JSON.parse(clean);
  } catch {
    return clean;
  }
}

function errorMessage(label, response, parsed) {
  const prefix = label || 'Gateway request';

  if (parsed && typeof parsed === 'object') {
    return parsed.message || parsed.error || parsed.code || `${prefix} failed.`;
  }

  return `${prefix} failed with HTTP ${response.status}.`;
}

function isRetryableStatus(status) {
  return status === 408 || status === 429 || status >= 500;
}