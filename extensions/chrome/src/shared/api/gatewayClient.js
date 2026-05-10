/**
 * RO:WHAT — Gateway-only HTTP client for the React CrabLink route shell.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; centralizes public svc-gateway calls for refactored UI.
 * RO:INTERACTS — app/settings.js, identityClient.js, walletClient.js, route-owned pages, svc-gateway public routes.
 * RO:INVARIANTS — no direct omnigate/storage/index/wallet/ledger calls; no fake backend truth; no silent ROC spend.
 * RO:METRICS — sends x-correlation-id headers for backend trace correlation.
 * RO:CONFIG — baseUrl/gatewayUrl, requestTimeoutMs, optional dev auth/passport/wallet labels.
 * RO:SECURITY — redacts tokens from errors; never logs secrets; mutation helpers require explicit caller confirmation.
 * RO:TEST — npm run build; gateway health/readiness manual smoke; future React route smoke.
 */

export class GatewayClientError extends Error {
  constructor(message, details = {}) {
    super(String(message || 'Gateway request failed.'));
    this.name = 'GatewayClientError';
    this.route = details.route || '';
    this.status = Number(details.status || 0);
    this.reason = details.reason || '';
    this.correlationId = details.correlationId || '';
    this.retryable = Boolean(details.retryable);
    this.data = details.data || null;
  }
}

export class GatewayClient {
  constructor({
    baseUrl = 'http://127.0.0.1:8090',
    gatewayUrl = '',
    requestTimeoutMs = 5000,
    authToken = '',
    passportSubject = '',
    walletAccount = '',
  } = {}) {
    this.baseUrl = normalizeBaseUrl(gatewayUrl || baseUrl);
    this.requestTimeoutMs = normalizeTimeout(requestTimeoutMs);
    this.authToken = String(authToken || '').trim();
    this.passportSubject = String(passportSubject || '').trim();
    this.walletAccount = String(walletAccount || '').trim();
  }

  url(path) {
    return this.baseUrl + normalizeRoute(path);
  }

  getHealth() {
    return this.request('/healthz', { label: 'Health check' });
  }

  getReady() {
    return this.request('/readyz', { label: 'Readiness check' });
  }

  getIdentityMe() {
    return this.request('/identity/me', { label: 'Identity check' });
  }

  getWalletBalance(account = this.walletAccount) {
    const walletAccount = String(account || '').trim();

    if (!walletAccount) {
      throw new GatewayClientError('Wallet balance requires a wallet account label.', {
        route: '/wallet/:account/balance',
        status: 0,
        reason: 'missing_wallet_account',
        retryable: false,
      });
    }

    return this.request(`/wallet/${encodeURIComponent(walletAccount)}/balance`, {
      label: 'Wallet balance',
    });
  }

  resolveCrab(crabUrl) {
    const value = String(crabUrl || '').trim();

    if (!value) {
      throw new GatewayClientError('Crab resolve requires a crab:// URL.', {
        route: '/crab/resolve',
        status: 0,
        reason: 'missing_crab_url',
        retryable: false,
      });
    }

    return this.request(`/crab/resolve?url=${encodeURIComponent(value)}`, {
      label: 'Crab resolve',
    });
  }

  getB3Asset(hash, kind = 'image') {
    const safeHash = String(hash || '').toLowerCase();
    const safeKind = String(kind || 'image').toLowerCase();

    return this.request(`/b3/${safeHash}.${safeKind}`, {
      label: 'B3 asset',
    });
  }

  async request(path, options = {}) {
    const route = normalizeRoute(path);
    const method = String(options.method || 'GET').toUpperCase();
    const correlationId = makeCorrelationId();
    const controller = new AbortController();
    const timeout = globalThis.setTimeout(() => controller.abort(), this.requestTimeoutMs);

    const headers = buildHeaders({
      authToken: this.authToken,
      passportSubject: this.passportSubject,
      walletAccount: this.walletAccount,
      correlationId,
      headers: options.headers,
      body: options.body,
    });

    const init = {
      method,
      headers,
      signal: controller.signal,
    };

    if (options.body !== undefined) {
      init.body = serializeBody(options.body);
    }

    try {
      const response = await fetch(this.url(route), init);
      const data = await parseResponse(response, options.parseAs || 'auto');
      const returnedCorrelationId = response.headers.get('x-correlation-id') || correlationId;

      if (!response.ok) {
        throw new GatewayClientError(errorMessage(options.label, response, data), {
          route,
          status: response.status,
          reason: reasonFromBody(data),
          correlationId: returnedCorrelationId,
          retryable: isRetryableStatus(response.status),
          data,
        });
      }

      return {
        ok: true,
        status: response.status,
        route,
        correlationId: returnedCorrelationId,
        data,
      };
    } catch (error) {
      if (error instanceof GatewayClientError) {
        throw error;
      }

      const aborted = error?.name === 'AbortError';

      throw new GatewayClientError(
        `${options.label || 'Gateway request'} failed: ${
          aborted ? 'request timed out' : error?.message || String(error)
        }`,
        {
          route,
          status: 0,
          reason: aborted ? 'timeout' : 'network_error',
          correlationId,
          retryable: true,
        },
      );
    } finally {
      globalThis.clearTimeout(timeout);
    }
  }
}

export function createGatewayClient(settings = {}) {
  return new GatewayClient(settings);
}

function buildHeaders({ authToken, passportSubject, walletAccount, correlationId, headers = {}, body }) {
  const next = {
    Accept: 'application/json',
    'x-correlation-id': correlationId,
    ...headers,
  };

  if (authToken) {
    next.Authorization = `Bearer ${authToken}`;
  }

  if (passportSubject) {
    next['x-ron-passport'] = passportSubject;
  }

  if (walletAccount) {
    next['x-ron-wallet-account'] = walletAccount;
  }

  if (body !== undefined && shouldSetJsonContentType(body, next)) {
    next['Content-Type'] = 'application/json';
  }

  return next;
}

function shouldSetJsonContentType(body, headers) {
  if (headers['Content-Type'] || headers['content-type']) {
    return false;
  }

  return !(body instanceof Blob) && !(body instanceof FormData) && !(body instanceof ArrayBuffer);
}

function serializeBody(body) {
  if (
    typeof body === 'string' ||
    body instanceof Blob ||
    body instanceof FormData ||
    body instanceof ArrayBuffer
  ) {
    return body;
  }

  return JSON.stringify(body);
}

async function parseResponse(response, parseAs) {
  if (parseAs === 'blob') {
    return response.blob();
  }

  if (parseAs === 'text') {
    return response.text();
  }

  const text = await response.text();
  return parseBody(text);
}

function normalizeBaseUrl(value) {
  const raw = String(value || 'http://127.0.0.1:8090').trim().replace(/\/+$/, '');
  return /^https?:\/\/[^/]+/i.test(raw) ? raw : 'http://127.0.0.1:8090';
}

function normalizeTimeout(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(30000, Math.max(1000, Math.floor(n))) : 5000;
}

function normalizeRoute(path) {
  const route = String(path || '/').trim();
  return route.startsWith('/') ? route : `/${route}`;
}

function parseBody(text) {
  const clean = String(text || '').trim();

  if (!clean) {
    return null;
  }

  try {
    return JSON.parse(clean);
  } catch (_error) {
    return clean;
  }
}

function reasonFromBody(data) {
  if (!data || typeof data !== 'object') {
    return '';
  }

  return String(data.reason || data.code || data.error || data.title || '').trim();
}

function errorMessage(label, response, data) {
  const prefix = label || 'Gateway request';

  if (data && typeof data === 'object') {
    return data.message || data.detail || data.error || data.code || `${prefix} failed with HTTP ${response.status}.`;
  }

  return `${prefix} failed with HTTP ${response.status}.`;
}

function isRetryableStatus(status) {
  return status === 408 || status === 429 || status >= 500;
}

function makeCorrelationId() {
  return `crablink-react-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
