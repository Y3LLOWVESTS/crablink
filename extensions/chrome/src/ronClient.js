// CrabLink gateway client.
// All backend HTTP calls must flow through this file and target svc-gateway only.

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
    this.settings = settings;
    this.gatewayUrl = normalizeBaseUrl(settings.gatewayUrl);
    this.requestTimeoutMs = normalizeTimeout(settings.requestTimeoutMs);
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

  async resolveCrab(url) {
    return this.request(`/crab/resolve?url=${encodeURIComponent(url)}`, {
      label: 'Crab resolve'
    });
  }

  async getB3Asset(hash, kind) {
    return this.request(`/b3/${encodeURIComponent(hash)}.${encodeURIComponent(kind)}`, {
      label: 'b3 asset page'
    });
  }

  async resolveSite(name) {
    return this.request(`/sites/${encodeURIComponent(name)}`, {
      label: 'Site resolve'
    });
  }

  async preparePaidObject(body) {
    return this.request('/paid/o/prepare', {
      method: 'POST',
      body,
      label: 'Paid object prepare',
      mutation: true
    });
  }

  async prepareImageAsset(body) {
    return this.request('/assets/image/prepare', {
      method: 'POST',
      body,
      label: 'Image asset prepare',
      mutation: true
    });
  }

  async createImageAsset(body) {
    return this.request('/assets/image', {
      method: 'POST',
      body,
      label: 'Image asset create',
      mutation: true
    });
  }

  async prepareSite(body) {
    return this.request('/sites/prepare', {
      method: 'POST',
      body,
      label: 'Site prepare',
      mutation: true
    });
  }

  async createSite(body) {
    return this.request('/sites', {
      method: 'POST',
      body,
      label: 'Site create',
      mutation: true
    });
  }

  async request(path, options = {}) {
    const method = options.method || 'GET';
    const route = String(path || '');
    const correlationId = makeCorrelationId();

    if (!route.startsWith('/')) {
      throw new RonClientError('Internal CrabLink error: gateway route must start with /.', {
        route,
        correlationId
      });
    }

    const headers = this.makeHeaders({
      correlationId,
      mutation: Boolean(options.mutation || options.body !== undefined)
    });

    let body;

    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(options.body);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    try {
      const response = await fetch(`${this.gatewayUrl}${route}`, {
        method,
        headers,
        body,
        signal: controller.signal,
        cache: 'no-store'
      });

      const parsed = await parseResponseBody(response);

      if (!response.ok) {
        throw problemToError({
          label: options.label || method,
          route,
          response,
          parsed,
          correlationId
        });
      }

      return {
        ok: true,
        status: response.status,
        route,
        correlationId,
        data: parsed
      };
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new RonClientError(`Request timed out after ${this.requestTimeoutMs}ms.`, {
          route,
          correlationId,
          retryable: true
        });
      }

      if (error instanceof RonClientError) {
        throw error;
      }

      throw new RonClientError(error.message || 'Gateway request failed.', {
        route,
        correlationId,
        retryable: true
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  makeHeaders({ correlationId, mutation }) {
    const headers = {
      Accept: 'application/json',
      'x-correlation-id': correlationId
    };

    if (this.settings.authToken) {
      headers.Authorization = `Bearer ${this.settings.authToken}`;
    }

    if (this.settings.passportSubject) {
      headers['x-ron-passport'] = this.settings.passportSubject;
    }

    if (this.settings.walletAccount) {
      headers['x-ron-wallet-account'] = this.settings.walletAccount;
    }

    if (mutation) {
      headers['Idempotency-Key'] = makeIdempotencyKey();
    }

    return headers;
  }
}

export function normalizeBaseUrl(value) {
  const raw = String(value || '').trim();

  if (!raw) {
    throw new Error('Gateway URL is empty.');
  }

  const url = new URL(raw);

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Gateway URL must use http:// or https://.');
  }

  url.hash = '';
  url.search = '';

  return url.toString().replace(/\/$/, '');
}

export function makeCorrelationId() {
  return `crablink-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function makeIdempotencyKey() {
  return `crablink-idem-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeTimeout(value) {
  const n = Number(value);

  if (!Number.isFinite(n)) {
    return 5000;
  }

  return Math.min(Math.max(Math.round(n), 1000), 30000);
}

async function parseResponseBody(response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json') || looksLikeJson(text)) {
    try {
      return JSON.parse(text);
    } catch {
      return {
        raw: text
      };
    }
  }

  return {
    raw: text
  };
}

function looksLikeJson(text) {
  const value = String(text || '').trim();
  return value.startsWith('{') || value.startsWith('[');
}

function problemToError({ label, route, response, parsed, correlationId }) {
  const reason =
    parsed?.reason ||
    parsed?.error ||
    parsed?.title ||
    parsed?.message ||
    parsed?.detail ||
    parsed?.raw ||
    `${label} failed`;

  return new RonClientError(`${reason}`, {
    route,
    status: response.status,
    reason: String(reason),
    correlationId,
    retryable: response.status === 408 || response.status === 429 || response.status >= 500,
    data: parsed
  });
}