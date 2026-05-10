/**
 * RO:WHAT — Identity API helper for the React CrabLink shell.
 * RO:WHY — Keeps passport/profile calls gateway-only and makes backend truth boundaries explicit.
 * RO:INTERACTS — gatewayClient.js, PassportDrawer, PassportSummary, profile pages, future public profile route.
 * RO:INVARIANTS — backend confirms identity truth; no fake usernames/passports; no private alt mappings.
 * RO:METRICS — inherits x-correlation-id behavior from GatewayClient.
 * RO:CONFIG — gateway client settings and configured x-ron-passport header.
 * RO:SECURITY — no private keys, seed phrases, private alt mappings, or spend authority handled here.
 * RO:TEST — identity route smoke once backend profile truth is wired.
 */

export function createIdentityClient(gateway) {
  return new IdentityClient(gateway);
}

export class IdentityClient {
  constructor(gateway) {
    this.gateway = gateway || null;
  }

  get ready() {
    return Boolean(this.gateway);
  }

  async getMe() {
    this.assertGateway();

    if (typeof this.gateway.getIdentityMe === 'function') {
      return this.gateway.getIdentityMe();
    }

    return this.gateway.request('/identity/me', {
      label: 'Identity check',
    });
  }

  async resolveCurrentProfile() {
    this.assertGateway();

    return this.gateway.request('/identity/me', {
      label: 'Current profile',
    });
  }

  async bootstrapPassport(payload = {}, options = {}) {
    this.assertGateway();

    if (options.confirmed !== true) {
      throw makeIdentityError(
        'Passport bootstrap requires explicit caller confirmation.',
        'confirmation_required',
      );
    }

    return this.gateway.request('/identity/passport/bootstrap', {
      method: 'POST',
      body: payload,
      label: 'Passport bootstrap',
      mutation: true,
    });
  }

  assertGateway() {
    if (!this.gateway) {
      throw makeIdentityError(
        'Identity refresh requires the configured gateway client.',
        'missing_gateway_client',
      );
    }

    if (typeof this.gateway.request !== 'function' && typeof this.gateway.getIdentityMe !== 'function') {
      throw makeIdentityError(
        'Identity refresh requires a gateway client with request/getIdentityMe support.',
        'missing_gateway_method',
      );
    }
  }
}

function makeIdentityError(message, reason) {
  const error = new Error(message);
  error.name = 'IdentityClientError';
  error.reason = reason;
  error.status = 0;
  error.retryable = false;
  return error;
}