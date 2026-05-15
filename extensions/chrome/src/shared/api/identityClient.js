/**
 * RO:WHAT — Identity API helper for the React CrabLink shell.
 * RO:WHY — Keeps passport/profile/bootstrap calls gateway-only and makes backend truth boundaries explicit.
 * RO:INTERACTS — gatewayClient.js, PassportDrawer, PassportSummary, profile pages, future public profile route.
 * RO:INVARIANTS — backend confirms identity truth; starter grants go through gateway/backend/svc-wallet; no fake usernames/passports/balances.
 * RO:METRICS — inherits x-correlation-id behavior from GatewayClient.
 * RO:CONFIG — gateway client settings and configured x-ron-passport/x-ron-wallet-account headers.
 * RO:SECURITY — no private keys, seed phrases, private alt mappings, or spend authority handled here.
 * RO:TEST — identity route smoke; PassportDrawer bootstrap starter ROC smoke.
 */

const MAX_IDEMPOTENCY_KEY_BYTES = 64;

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

    const request = normalizePassportBootstrapRequest(payload, this.gateway);
    const idempotencyKey = compactIdempotencyKey(
      options.idempotencyKey ||
        payload.idempotency_key ||
        payload.idempotencyKey ||
        stableIdempotencyKey(
          'passport-bootstrap',
          request.passport_subject,
          request.wallet_account,
          request.desired_starting_balance_minor_units,
        ),
      'passport-bootstrap',
    );

    return this.gateway.request('/identity/passport/bootstrap', {
      method: 'POST',
      body: request,
      label: 'Passport bootstrap',
      mutation: true,
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
        'x-ron-passport': request.passport_subject,
        'x-ron-wallet-account': request.wallet_account,
      },
      idempotencyKey,
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

export function normalizePassportBootstrapRequest(payload = {}, gateway = {}) {
  const passportSubject = stringValue(
    payload.passport_subject,
    payload.passportSubject,
    gateway.passportSubject,
    'passport:main:dev',
  );
  const walletAccount = stringValue(
    payload.wallet_account,
    payload.walletAccount,
    gateway.walletAccount,
    'acct_dev',
  );
  const displayName = stringValue(
    payload.display_name,
    payload.displayName,
    payload.label,
    labelFromPassport(passportSubject),
  );
  const desiredAmount = normalizeAmountMinor(
    payload.desired_starting_balance_minor_units,
    payload.desiredStartingBalanceMinorUnits,
    payload.amount_minor,
    payload.amountMinor,
    '1776',
  );
  const requestedUsername = normalizeUsername(
    payload.requested_username ||
      payload.requestedUsername ||
      payload.username ||
      payload.handle ||
      '',
  );

  if (!passportSubject) {
    throw makeIdentityError('Passport bootstrap requires a passport subject.', 'missing_passport_subject');
  }

  if (!walletAccount) {
    throw makeIdentityError('Passport bootstrap requires a wallet account.', 'missing_wallet_account');
  }

  if (!desiredAmount) {
    throw makeIdentityError('Passport bootstrap requires a positive starter grant amount.', 'missing_starter_amount');
  }

  const request = {
    kind: stringValue(payload.kind, 'main'),
    display_name: displayName,
    label: stringValue(payload.label, displayName),
    client: stringValue(payload.client, 'crablink-react'),
    create_wallet: payload.create_wallet !== false && payload.createWallet !== false,
    starter_grant: payload.starter_grant !== false && payload.starterGrant !== false,
    passport_subject: passportSubject,
    wallet_account: walletAccount,
    desired_starting_balance_minor_units: desiredAmount,
  };

  if (requestedUsername) {
    request.requested_username = requestedUsername;
  }

  return request;
}

export function stableIdempotencyKey(...parts) {
  const joined = parts
    .map((part) => String(part ?? '').trim().toLowerCase())
    .filter(Boolean)
    .join(':');

  return `crablink:${fnv1aHex(joined)}:${joined}`;
}

export function compactIdempotencyKey(value, prefix = 'crablink') {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.:-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (normalized.length > 0 && normalized.length <= MAX_IDEMPOTENCY_KEY_BYTES) {
    return normalized;
  }

  const hash = fnv1aHex(normalized || `${Date.now()}:${Math.random()}`);
  const safePrefix = String(prefix || 'crablink').replace(/[^a-z0-9_.:-]+/gi, '-').slice(0, 24);
  const budget = MAX_IDEMPOTENCY_KEY_BYTES - safePrefix.length - hash.length - 2;
  const suffix = normalized.slice(0, Math.max(0, budget));

  return suffix ? `${safePrefix}:${hash}:${suffix}` : `${safePrefix}:${hash}`;
}

function normalizeUsername(value) {
  const raw = String(value || '').trim().toLowerCase().replace(/^@+/, '');

  if (!raw) {
    return '';
  }

  return raw.replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32);
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

function labelFromPassport(passportSubject) {
  const raw = String(passportSubject || '').trim();

  if (raw.includes('visitor')) {
    return 'CrabLink Visitor Passport';
  }

  if (raw.includes('creator')) {
    return 'CrabLink Creator Passport';
  }

  return 'CrabLink main passport';
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

function fnv1aHex(value) {
  let hash = 0x811c9dc5;
  const text = String(value || '');

  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

function makeIdentityError(message, reason) {
  const error = new Error(message);
  error.name = 'IdentityClientError';
  error.reason = reason;
  error.status = 0;
  error.retryable = false;
  return error;
}