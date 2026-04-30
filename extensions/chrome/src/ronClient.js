export class RonClient {
  constructor(settings) {
    this.settings = settings;
    this.gatewayUrl = settings.gatewayUrl.replace(/\/$/, '');
  }

  async getHealth() {
    return this.request('/healthz');
  }

  async getReady() {
    return this.request('/readyz');
  }

  async resolveCrab(url) {
    return this.request(`/crab/resolve?url=${encodeURIComponent(url)}`);
  }

  async getB3Asset(hash, kind) {
    return this.request(`/b3/${hash}.${kind}`);
  }

  async resolveSite(name) {
    return this.request(`/sites/${encodeURIComponent(name)}`);
  }

  async request(path, options = {}) {
    const method = options.method || 'GET';
    const correlationId = makeCorrelationId();

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

    let body;

    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      headers['Idempotency-Key'] = makeIdempotencyKey();
      body = JSON.stringify(options.body);
    }

    const controller = new AbortController();
    const timeoutMs = this.settings.requestTimeoutMs || 5000;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${this.gatewayUrl}${path}`, {
        method,
        headers,
        body,
        signal: controller.signal
      });

      const parsed = await parseResponse(response);

      if (!response.ok) {
        throw new Error(formatProblem(response.status, parsed, correlationId));
      }

      return parsed;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`Request timed out after ${timeoutMs}ms. Correlation ID: ${correlationId}`);
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

async function parseResponse(response) {
  const text = await response.text();

  if (!text) {
    return { ok: response.ok, status: response.status };
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      ok: response.ok,
      status: response.status,
      body: text
    };
  }
}

function formatProblem(status, parsed, correlationId) {
  const reason =
    parsed?.error ||
    parsed?.reason ||
    parsed?.message ||
    parsed?.title ||
    parsed?.body ||
    'Backend request failed';

  return `${reason} (HTTP ${status}, correlation ${correlationId})`;
}

function makeCorrelationId() {
  return `crablink-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function makeIdempotencyKey() {
  return `crablink-idem-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
