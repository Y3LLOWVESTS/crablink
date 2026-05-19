import { invoke } from '@tauri-apps/api/core';

/**
 * RO:WHAT — Gateway-only client for the React CrabLink route shell inside Tauri.
 * RO:WHY — App Integration; centralizes public svc-gateway calls while routing gateway/product reads and JSON/text mutations through typed Tauri commands.
 * RO:INTERACTS — app/settings.js, identityClient.js, walletClient.js, route-owned pages, public gateway routes, Tauri Rust commands.
 * RO:INVARIANTS — no direct internal-service calls; no fake backend truth; no silent ROC spend.
 * RO:METRICS — sends x-correlation-id headers for backend trace correlation; command calls return response metadata.
 * RO:CONFIG — baseUrl/gatewayUrl, requestTimeoutMs, optional dev auth/passport/wallet labels.
 * RO:SECURITY — redacts tokens from errors; sanitizes header values before fetch; Tauri bridge is Rust-side allowlisted.
 * RO:TEST — npm run build; gateway health/readiness manual smoke; Tauri wallet/site prepare smoke.
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

  async getHealth() {
    if (canUseTauriInvoke()) {
      try {
        const data = await invoke('health_check_gateway');

        return wrapCommandResponse({
          route: '/healthz',
          data,
        });
      } catch (error) {
        throw new GatewayClientError(
          `Health check failed through Tauri gateway command: ${cleanError(error)}`,
          {
            route: '/healthz',
            status: 0,
            reason: 'tauri_health_gateway_failed',
            retryable: true,
          },
        );
      }
    }

    return this.request('/healthz', { label: 'Health check' });
  }

  async getReady() {
    if (canUseTauriInvoke()) {
      try {
        const data = await invoke('ready_check_gateway');

        return wrapCommandResponse({
          route: '/readyz',
          data,
        });
      } catch (error) {
        throw new GatewayClientError(
          `Readiness check failed through Tauri gateway command: ${cleanError(error)}`,
          {
            route: '/readyz',
            status: 0,
            reason: 'tauri_ready_gateway_failed',
            retryable: true,
          },
        );
      }
    }

    return this.request('/readyz', { label: 'Readiness check' });
  }

  async getIdentityMe() {
    if (canUseTauriInvoke()) {
      try {
        const data = await invoke('identity_me_gateway', {
          passportSubject: this.passportSubject,
          walletAccount: this.walletAccount,
        });

        return wrapCommandResponse({
          route: '/identity/me',
          data,
        });
      } catch (error) {
        throw new GatewayClientError(
          `Identity check failed through Tauri gateway command: ${cleanError(error)}`,
          {
            route: '/identity/me',
            status: 0,
            reason: 'tauri_identity_gateway_failed',
            retryable: true,
          },
        );
      }
    }

    return this.request('/identity/me', { label: 'Identity check' });
  }

  async getWalletBalance(account = this.walletAccount) {
    const walletAccount = String(account || '').trim();

    if (!walletAccount) {
      throw new GatewayClientError('Wallet balance requires a wallet account label.', {
        route: '/wallet/:account/balance',
        status: 0,
        reason: 'missing_wallet_account',
        retryable: false,
      });
    }

    if (canUseTauriInvoke()) {
      try {
        const data = await invoke('wallet_balance_gateway', {
          account: walletAccount,
        });

        return wrapCommandResponse({
          route: `/wallet/${encodeURIComponent(walletAccount)}/balance`,
          data,
        });
      } catch (error) {
        throw new GatewayClientError(
          `Wallet balance failed through Tauri gateway command: ${cleanError(error)}`,
          {
            route: '/wallet/:account/balance',
            status: 0,
            reason: 'tauri_wallet_gateway_failed',
            retryable: true,
          },
        );
      }
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

    const headers = buildHeaders({
      authToken: this.authToken,
      passportSubject: this.passportSubject,
      walletAccount: this.walletAccount,
      correlationId,
      headers: options.headers,
      body: options.body,
    });

    if (canUseTauriInvoke() && canUseGatewayCommand(options)) {
      return this.requestViaTauriGatewayCommand(route, {
        ...options,
        method,
        headers,
        correlationId,
      });
    }

    const controller = new AbortController();
    const timeout = globalThis.setTimeout(() => controller.abort(), this.requestTimeoutMs);

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
      const invalidHeader = String(error?.message || '').includes('Invalid value');

      throw new GatewayClientError(
        `${options.label || 'Gateway request'} failed: ${
          aborted ? 'request timed out' : error?.message || String(error)
        }`,
        {
          route,
          status: 0,
          reason: aborted ? 'timeout' : invalidHeader ? 'invalid_request_header_value' : 'network_error',
          correlationId,
          retryable: !invalidHeader,
        },
      );
    } finally {
      globalThis.clearTimeout(timeout);
    }
  }

  async requestViaTauriGatewayCommand(route, options = {}) {
    const commandBody = toGatewayCommandBody(options.body);

    try {
      const response = await invoke('gateway_request', {
        request: {
          method: options.method || 'GET',
          path: route,
          headers: options.headers || {},
          body: commandBody.body,
          bodyText: commandBody.bodyText,
        },
      });

      const status = Number(response?.status || 0);
      const data = response?.data ?? null;
      const returnedCorrelationId =
        response?.correlation_id || response?.correlationId || options.correlationId || '';

      if (!response?.ok || status < 200 || status >= 300) {
        throw new GatewayClientError(errorMessage(options.label, { status }, data), {
          route,
          status,
          reason: reasonFromBody(data) || 'gateway_command_http_error',
          correlationId: returnedCorrelationId,
          retryable: isRetryableStatus(status),
          data,
        });
      }

      return {
        ok: true,
        status,
        route: response.route || route,
        correlationId: returnedCorrelationId,
        data,
      };
    } catch (error) {
      if (error instanceof GatewayClientError) {
        throw error;
      }

      throw new GatewayClientError(
        `${options.label || 'Gateway request'} failed through Tauri gateway command: ${cleanError(error)}`,
        {
          route,
          status: 0,
          reason: 'tauri_gateway_command_failed',
          correlationId: options.correlationId || '',
          retryable: true,
        },
      );
    }
  }
}

export function createGatewayClient(settings = {}) {
  return new GatewayClient(settings);
}

function wrapCommandResponse({ route, data }) {
  return {
    ok: true,
    status: 200,
    route,
    correlationId: '',
    data,
  };
}

function canUseTauriInvoke() {
  return typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__);
}

function canUseGatewayCommand(options = {}) {
  if (String(options.parseAs || 'auto') === 'blob') {
    return false;
  }

  const body = options.body;

  if (body === undefined || body === null) {
    return true;
  }

  return !isBlob(body) && !isFormData(body) && !isArrayBufferLike(body);
}

function toGatewayCommandBody(body) {
  if (body === undefined || body === null) {
    return {
      body: null,
      bodyText: null,
    };
  }

  if (typeof body === 'string') {
    return {
      body: null,
      bodyText: body,
    };
  }

  return {
    body,
    bodyText: null,
  };
}

function cleanError(error) {
  return String(error?.message || error || 'unknown error')
    .replace(/Bearer\s+[^\s]+/gi, 'Bearer [redacted]')
    .replace(/Authorization:\s*[^\s]+/gi, 'Authorization: [redacted]')
    .slice(0, 300);
}

function buildHeaders({ authToken, passportSubject, walletAccount, correlationId, headers = {}, body }) {
  const next = {
    Accept: 'application/json',
    'x-correlation-id': correlationId,
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

  for (const [name, value] of Object.entries(normalizeInputHeaders(headers))) {
    next[name] = value;
  }

  if (body !== undefined && shouldSetJsonContentType(body, next)) {
    next['Content-Type'] = 'application/json';
  }

  return sanitizeHeaders(next);
}

function normalizeInputHeaders(headers) {
  if (!headers) {
    return {};
  }

  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }

  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }

  if (headers instanceof Map) {
    return Object.fromEntries(headers.entries());
  }

  if (typeof headers === 'object') {
    return { ...headers };
  }

  return {};
}

function sanitizeHeaders(headers) {
  const safe = {};

  for (const [rawName, rawValue] of Object.entries(headers || {})) {
    const name = sanitizeHeaderName(rawName);

    if (!name || rawValue === undefined || rawValue === null) {
      continue;
    }

    const value = sanitizeHeaderValue(rawValue);

    if (!value) {
      continue;
    }

    safe[name] = value;
  }

  return safe;
}

function sanitizeHeaderName(value) {
  const name = String(value || '').trim();

  if (!/^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/.test(name)) {
    return '';
  }

  return name;
}

function sanitizeHeaderValue(value) {
  const raw = String(value ?? '');

  const withoutForbiddenControls = raw
    .replace(/\r\n|\r|\n/g, ' ')
    .replace(/[\u0000-\u0008\u000A-\u001F\u007F]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!withoutForbiddenControls) {
    return '';
  }

  return Array.from(withoutForbiddenControls)
    .map((char) => {
      const code = char.codePointAt(0) || 0;

      if (code >= 0x20 && code <= 0x7e) {
        return char;
      }

      if (code >= 0xa0 && code <= 0xff) {
        return char;
      }

      return '-';
    })
    .join('')
    .slice(0, 2048)
    .trim();
}

function shouldSetJsonContentType(body, headers) {
  if (headers['Content-Type'] || headers['content-type']) {
    return false;
  }

  return !isBlob(body) && !isFormData(body) && !isArrayBufferLike(body);
}

function serializeBody(body) {
  if (typeof body === 'string' || isBlob(body) || isFormData(body) || isArrayBufferLike(body)) {
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

function isBlob(value) {
  return typeof Blob !== 'undefined' && value instanceof Blob;
}

function isFormData(value) {
  return typeof FormData !== 'undefined' && value instanceof FormData;
}

function isArrayBufferLike(value) {
  return (
    (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) ||
    (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView?.(value))
  );
}