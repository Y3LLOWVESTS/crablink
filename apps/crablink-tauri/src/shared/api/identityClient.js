/**
 * RO:WHAT — Identity API helper for the React CrabLink shell.
 * RO:WHY — Keeps passport/profile/bootstrap calls gateway-only and makes backend truth boundaries explicit.
 * RO:INTERACTS — gatewayClient.js, PassportDrawer, PassportSummary, profile pages, future public profile route.
 * RO:INVARIANTS — backend confirms identity truth; starter grants go through gateway/backend/svc-wallet; no fake usernames/passports/balances.
 * RO:METRICS — inherits x-correlation-id behavior from GatewayClient.
 * RO:CONFIG — gateway client settings and configured x-ron-passport/x-ron-wallet-account headers.
 * RO:SECURITY — no private keys, seed phrases, private alt mappings, or spend authority handled here.
 * RO:TEST — identity route smoke; PassportDrawer bootstrap starter ROC smoke; profile claim/read route smoke.
 */

const MAX_IDEMPOTENCY_KEY_BYTES = 64;
const DEFAULT_PASSPORT_SUBJECT = 'passport:main:dev';
const DEFAULT_WALLET_ACCOUNT = 'acct_dev';
const DEFAULT_STARTER_GRANT_MINOR = '1776';

const USERNAME_STATUS_LABELS = Object.freeze({
  local_draft: 'Local draft',
  requested: 'Requested',
  confirmed: 'Confirmed',
  rejected: 'Rejected',
  unavailable: 'Unavailable',
  backend_unknown: 'Backend unknown',
});

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

  async claimPassportProfile(payload = {}, options = {}) {
    this.assertGateway();

    if (options.confirmed !== true) {
      throw makeIdentityError(
        'Public profile claim requires explicit caller confirmation.',
        'confirmation_required',
      );
    }

    const request = normalizeProfileClaimRequest(payload, this.gateway);
    const idempotencyKey = compactIdempotencyKey(
      options.idempotencyKey ||
        payload.idempotency_key ||
        payload.idempotencyKey ||
        stableIdempotencyKey(
          'profile-claim',
          request.passport_subject,
          request.requested_username,
          request.display_name,
        ),
      'profile-claim',
    );

    return this.gateway.request('/identity/passport/profile/claim', {
      method: 'POST',
      body: request,
      label: 'Public profile claim',
      mutation: true,
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
        'x-ron-passport': request.passport_subject,
        'x-ron-wallet-account': normalizeWalletAccount(payload, this.gateway),
      },
      idempotencyKey,
    });
  }

  async getPassportProfile(usernameOrHandle, options = {}) {
    this.assertGateway();

    const username = normalizeProfileUsername(usernameOrHandle);

    if (!username) {
      throw makeIdentityError(
        'Profile lookup requires a username or @handle.',
        'missing_username',
      );
    }

    return this.gateway.request(`/identity/passport/profile/${encodeURIComponent(username)}`, {
      method: 'GET',
      label: options.label || `Public profile ${username}`,
      headers: {
        Accept: 'application/json',
        'x-ron-passport': stringValue(options.passportSubject, this.gateway.passportSubject),
        'x-ron-wallet-account': stringValue(options.walletAccount, this.gateway.walletAccount),
      },
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
    gateway.passport_subject,
    DEFAULT_PASSPORT_SUBJECT,
  );
  const walletAccount = stringValue(
    payload.wallet_account,
    payload.walletAccount,
    gateway.walletAccount,
    gateway.wallet_account,
    DEFAULT_WALLET_ACCOUNT,
  );
  const desiredGrant = stringValue(
    payload.desired_starting_balance_minor_units,
    payload.desiredStartingBalanceMinorUnits,
    payload.starting_balance_minor_units,
    payload.startingBalanceMinorUnits,
    DEFAULT_STARTER_GRANT_MINOR,
  );

  return {
    kind: stringValue(payload.kind, 'main'),
    display_name: stringValue(payload.display_name, payload.displayName, payload.label, 'Local Dev Passport'),
    label: stringValue(payload.label, payload.display_name, payload.displayName, 'Local Dev Passport'),
    client: stringValue(payload.client, 'crablink-react'),
    create_wallet: booleanValue(payload.create_wallet, payload.createWallet, true),
    starter_grant: booleanValue(payload.starter_grant, payload.starterGrant, payload.request_starter_grant, true),
    request_starter_grant: booleanValue(payload.request_starter_grant, payload.requestStarterGrant, payload.starter_grant, true),
    passport_subject: passportSubject,
    wallet_account: walletAccount,
    desired_starting_balance_minor_units: desiredGrant,
  };
}

export function normalizeProfileClaimRequest(payload = {}, gateway = {}) {
  const passportSubject = stringValue(
    payload.passport_subject,
    payload.passportSubject,
    gateway.passportSubject,
    gateway.passport_subject,
    DEFAULT_PASSPORT_SUBJECT,
  );
  const requestedUsername = normalizeHandle(
    stringValue(
      payload.requested_username,
      payload.requestedUsername,
      payload.handle,
      payload.username,
    ),
  );

  if (!requestedUsername) {
    throw makeIdentityError(
      'Profile claim requires a requested @username.',
      'missing_requested_username',
    );
  }

  const request = {
    passport_subject: passportSubject,
    requested_username: requestedUsername,
  };

  const displayName = stringValue(payload.display_name, payload.displayName, payload.name);
  const bio = stringValue(payload.bio, payload.description);
  const avatarImage = stringValue(payload.avatar_image, payload.avatarImage, payload.avatar_url, payload.avatarUrl);

  if (displayName) {
    request.display_name = displayName;
  }

  if (bio) {
    request.bio = bio;
  }

  if (avatarImage) {
    request.avatar_image = avatarImage;
  }

  return request;
}

export function normalizePublicProfileResponse(value = {}) {
  const profile = objectValue(value);
  const username = normalizeProfileUsername(profile.username || profile.handle);
  const handle = normalizeHandle(profile.handle || username);
  const usernameStatus = normalizeUsernameStatus(profile.username_status || profile.usernameStatus);

  return {
    schema: stringValue(profile.schema, 'svc-passport.public-profile.v1'),
    passportSubject: stringValue(profile.passport_subject, profile.passportSubject),
    passportKind: stringValue(profile.passport_kind, profile.passportKind),
    username,
    handle,
    usernameStatus,
    usernameStatusLabel: USERNAME_STATUS_LABELS[usernameStatus] || USERNAME_STATUS_LABELS.backend_unknown,
    displayName: nullableString(profile.display_name, profile.displayName),
    bio: nullableString(profile.bio),
    avatarImage: nullableString(profile.avatar_image, profile.avatarImage),
    profileCrabUrl: stringValue(profile.profile_crab_url, profile.profileCrabUrl, handle ? `crab://${handle}` : ''),
    publicProfileCid: nullableString(profile.public_profile_cid, profile.publicProfileCid),
    reputationScore: nullableNumber(profile.reputation_score, profile.reputationScore),
    moderatorScore: nullableNumber(profile.moderator_score, profile.moderatorScore),
    warnings: arrayStrings(profile.warnings),
    backendConfirmed: usernameStatus === 'confirmed',
    raw: profile,
  };
}

export function normalizeUsernameStatus(value) {
  const status = String(value || '').trim().toLowerCase();

  if (USERNAME_STATUS_LABELS[status]) {
    return status;
  }

  return 'backend_unknown';
}

export function normalizeProfileUsername(value) {
  return String(value || '')
    .trim()
    .replace(/^crab:\/\/@?/i, '')
    .replace(/^profile\/@?/i, '')
    .replace(/^@/, '')
    .trim()
    .toLowerCase();
}

export function normalizeHandle(value) {
  const username = normalizeProfileUsername(value);

  return username ? `@${username}` : '';
}

export function unwrapIdentityResponse(response) {
  if (!response) {
    return null;
  }

  return response.data || response.body || response;
}

export function unwrapPublicProfileResponse(response) {
  return normalizePublicProfileResponse(unwrapIdentityResponse(response));
}

export function makeIdentityError(message, reason = 'identity_error', extra = {}) {
  const error = new Error(message);
  error.reason = reason;
  error.code = reason;
  error.retryable = Boolean(extra.retryable);
  error.status = Number(extra.status || 0);
  error.details = extra;
  return error;
}

function normalizeWalletAccount(payload = {}, gateway = {}) {
  return stringValue(
    payload.wallet_account,
    payload.walletAccount,
    gateway.walletAccount,
    gateway.wallet_account,
    DEFAULT_WALLET_ACCOUNT,
  );
}

function stableIdempotencyKey(scope, ...parts) {
  const cleanScope = String(scope || 'identity').trim() || 'identity';
  const cleanParts = parts
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join(':');

  const seed = cleanParts || `${Date.now()}:${Math.random().toString(16).slice(2)}`;
  const hash = smallStableHash(`${cleanScope}:${seed}`);

  return compactIdempotencyKey(`${cleanScope}:${hash}`, cleanScope);
}

function compactIdempotencyKey(value, fallbackPrefix = 'identity') {
  const clean = String(value || '').trim().replace(/\s+/g, '-');

  if (!clean) {
    return `${fallbackPrefix}:${Date.now().toString(36)}`;
  }

  if (byteLength(clean) <= MAX_IDEMPOTENCY_KEY_BYTES) {
    return clean;
  }

  const prefix = String(fallbackPrefix || 'identity').trim() || 'identity';
  return `${prefix}:${smallStableHash(clean)}`.slice(0, MAX_IDEMPOTENCY_KEY_BYTES);
}

function smallStableHash(value) {
  let hash = 2166136261;

  for (const ch of String(value || '')) {
    hash ^= ch.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

function booleanValue(...values) {
  for (const value of values) {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const clean = value.trim().toLowerCase();

      if (clean === 'true' || clean === '1' || clean === 'yes') {
        return true;
      }

      if (clean === 'false' || clean === '0' || clean === 'no') {
        return false;
      }
    }
  }

  return false;
}

function stringValue(...values) {
  for (const value of values) {
    const clean = String(value ?? '').trim();

    if (clean) {
      return clean;
    }
  }

  return '';
}

function nullableString(...values) {
  const clean = stringValue(...values);
  return clean || null;
}

function nullableNumber(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === '') {
      continue;
    }

    const n = Number(value);

    if (Number.isFinite(n)) {
      return n;
    }
  }

  return null;
}

function objectValue(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function arrayStrings(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => String(item || '').trim()).filter(Boolean);
}

function byteLength(value) {
  try {
    return new TextEncoder().encode(String(value || '')).length;
  } catch (_error) {
    return String(value || '').length;
  }
}