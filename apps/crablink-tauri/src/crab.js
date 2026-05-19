// CrabLink crab:// and b3 input helpers.
// This is lightweight browser-side normalization only; backend validation remains canonical.

const HASH_RE = /^[0-9a-fA-F]{64}$/;
const B3_RE = /^b3:([0-9a-fA-F]{64})$/;
const ASSET_KIND_RE = /^[a-z][a-z0-9_-]{0,31}$/;
const USERNAME_RE = /^[a-z0-9][a-z0-9_.-]{2,31}$/;
const CRAB_URL_PREFIX = 'crab://';
const MAX_SITE_NAME_LEN = 128;

const KNOWN_ASSET_KINDS = new Set([
  'image',
  'video',
  'stream',
  'podcast',
  'audio',
  'music',
  'song',
  'article',
  'post',
  'comment',
  'page',
  'site',
  'app',
  'file',
  'manifest'
]);

const RESERVED_PROFILE_NAMES = new Set([
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

export function normalizeCrabInput(input, options = {}) {
  const defaultKind = normalizeAssetKind(options.defaultKind || 'image');
  const value = String(input || '').trim();

  if (!value) {
    throw new Error('Enter a crab:// URL, b3 CID, or raw 64-character hash.');
  }

  const b3Match = value.match(B3_RE);
  if (b3Match) {
    return makeAssetResult(b3Match[1], defaultKind, 'b3');
  }

  if (HASH_RE.test(value)) {
    return makeAssetResult(value, defaultKind, 'raw-hash');
  }

  if (value.startsWith(CRAB_URL_PREFIX)) {
    return parseCrabUrl(value, defaultKind);
  }

  throw new Error('Invalid CrabLink input. Expected crab:// URL, b3:<hash>, or raw 64-character hash.');
}

export function parseCrabUrl(value, defaultKind = 'image') {
  const raw = String(value || '').trim();

  if (!raw.startsWith(CRAB_URL_PREFIX)) {
    throw new Error('Crab URL must start with crab://.');
  }

  const body = raw.slice(CRAB_URL_PREFIX.length);

  if (!body) {
    throw new Error('Crab URL is missing a target.');
  }

  const asset = parseAssetBody(body);
  if (asset) {
    return makeAssetResult(asset.hash, asset.kind, 'crab-asset');
  }

  const profile = parseProfileBody(body);
  if (profile) {
    return makeProfileResult(profile.username, profile.inputKind, raw);
  }

  const siteName = normalizeSiteName(body);
  if (siteName) {
    return {
      type: 'site',
      inputKind: 'crab-site',
      name: siteName,
      url: `crab://${siteName}`,
      display: `crab://${siteName}`
    };
  }

  return {
    type: 'crab',
    inputKind: 'generic-crab',
    url: raw,
    display: raw,
    defaultKind: normalizeAssetKind(defaultKind)
  };
}

export function formatB3(hash) {
  return `b3:${normalizeHash(hash)}`;
}

export function formatCrabAsset(hash, kind = 'image') {
  return `crab://${normalizeHash(hash)}.${normalizeAssetKind(kind)}`;
}

export function formatProfileCrabUrl(usernameOrHandle) {
  const profile = normalizeProfileUsername(usernameOrHandle);
  if (!profile.ok) {
    throw new Error(profile.error || '@username is invalid.');
  }

  return `crab://${profile.handle}`;
}

export function normalizeHash(hash) {
  const value = String(hash || '').trim();

  const b3Match = value.match(B3_RE);
  const candidate = b3Match ? b3Match[1] : value;

  if (!HASH_RE.test(candidate)) {
    throw new Error('Expected a 64-character BLAKE3 hash.');
  }

  return candidate.toLowerCase();
}

export function normalizeAssetKind(kind) {
  const value = String(kind || '').trim().toLowerCase();

  if (!ASSET_KIND_RE.test(value)) {
    throw new Error('Invalid asset kind.');
  }

  return value;
}

export function normalizeProfileUsername(value) {
  const username = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^crab:\/\//, '')
    .replace(/^profile\//, '')
    .replace(/\.profile$/, '')
    .replace(/^@+/, '')
    .replace(/\/+$/, '');

  if (!username) {
    return {
      ok: false,
      username: '',
      handle: '',
      url: '',
      profilePageUrl: '',
      error: ''
    };
  }

  if (!USERNAME_RE.test(username)) {
    return {
      ok: false,
      username: '',
      handle: '',
      url: '',
      profilePageUrl: '',
      error: '@username must be 3–32 lowercase characters and may use letters, numbers, underscore, hyphen, and dot.'
    };
  }

  if (username.includes('..')) {
    return {
      ok: false,
      username: '',
      handle: '',
      url: '',
      profilePageUrl: '',
      error: '@username cannot contain consecutive dots.'
    };
  }

  if (username.endsWith('.') || username.endsWith('-') || username.endsWith('_')) {
    return {
      ok: false,
      username: '',
      handle: '',
      url: '',
      profilePageUrl: '',
      error: '@username cannot end with dot, hyphen, or underscore.'
    };
  }

  if (RESERVED_PROFILE_NAMES.has(username)) {
    return {
      ok: false,
      username: '',
      handle: '',
      url: '',
      profilePageUrl: '',
      error: `@${username} is reserved.`
    };
  }

  return {
    ok: true,
    username,
    handle: `@${username}`,
    url: `crab://@${username}`,
    profilePageUrl: `crab://${username}.profile`,
    error: ''
  };
}

export function isKnownAssetKind(kind) {
  return KNOWN_ASSET_KINDS.has(String(kind || '').trim().toLowerCase());
}

export function normalizeSiteName(name) {
  const value = String(name || '').trim();

  if (!value || value.length > MAX_SITE_NAME_LEN) {
    return null;
  }

  if (value.includes('/') || value.includes('\\') || value.includes(' ') || value.includes(':')) {
    return null;
  }

  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(value)) {
    return null;
  }

  if (value.startsWith('.') || value.endsWith('.')) {
    return null;
  }

  return value;
}

function parseAssetBody(body) {
  const lastDot = body.lastIndexOf('.');

  if (lastDot < 0) {
    return null;
  }

  const hash = body.slice(0, lastDot);
  const kind = body.slice(lastDot + 1);

  if (!HASH_RE.test(hash)) {
    return null;
  }

  if (!ASSET_KIND_RE.test(kind)) {
    throw new Error('Invalid asset kind in crab asset URL.');
  }

  return {
    hash: hash.toLowerCase(),
    kind: kind.toLowerCase()
  };
}

function parseProfileBody(body) {
  const clean = String(body || '')
    .trim()
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');

  if (!clean) {
    return null;
  }

  const lower = clean.toLowerCase();

  if (lower.startsWith('@')) {
    const parsed = normalizeProfileUsername(lower);
    if (!parsed.ok) {
      throw new Error(parsed.error || 'Invalid @username profile URL.');
    }

    return {
      username: parsed.username,
      inputKind: 'crab-profile-handle'
    };
  }

  if (lower.startsWith('profile/')) {
    const parsed = normalizeProfileUsername(lower.slice('profile/'.length));
    if (!parsed.ok) {
      throw new Error(parsed.error || 'Invalid profile username URL.');
    }

    return {
      username: parsed.username,
      inputKind: 'crab-profile-path'
    };
  }

  if (lower.endsWith('.profile')) {
    const parsed = normalizeProfileUsername(lower.slice(0, -'.profile'.length));
    if (!parsed.ok) {
      throw new Error(parsed.error || 'Invalid .profile URL.');
    }

    return {
      username: parsed.username,
      inputKind: 'crab-profile-page'
    };
  }

  return null;
}

function makeAssetResult(hash, kind, inputKind) {
  const normalizedHash = normalizeHash(hash);
  const normalizedKind = normalizeAssetKind(kind);

  return {
    type: 'asset',
    inputKind,
    hash: normalizedHash,
    kind: normalizedKind,
    contentId: formatB3(normalizedHash),
    url: formatCrabAsset(normalizedHash, normalizedKind),
    display: formatCrabAsset(normalizedHash, normalizedKind)
  };
}

function makeProfileResult(username, inputKind, rawUrl) {
  const profile = normalizeProfileUsername(username);

  if (!profile.ok) {
    throw new Error(profile.error || 'Invalid @username profile URL.');
  }

  return {
    type: 'profile',
    inputKind,
    username: profile.username,
    handle: profile.handle,
    name: profile.username,
    url: profile.url,
    profilePageUrl: profile.profilePageUrl,
    requestedUrl: rawUrl,
    display: profile.url
  };
}