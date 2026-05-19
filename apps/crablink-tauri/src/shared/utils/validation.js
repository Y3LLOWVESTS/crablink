/**
 * RO:WHAT — Shared validation helpers for CrabLink routes, usernames, crab URLs, and local drafts.
 * RO:WHY — CrabLink refactor; keeps validation deterministic and reused instead of page-specific guesswork.
 * RO:INTERACTS — profileDraftModel, creator pages, route parsers, future options/first-run UX.
 * RO:INVARIANTS — validation is local syntax only; it never confirms backend ownership, username reservation, or publication.
 * RO:METRICS — none.
 * RO:CONFIG — none.
 * RO:SECURITY — no secrets, no spend authority, no backend mutation, no fake proof.
 * RO:TEST — npm run build; scripts/check-react-lane.sh; manual profile/editor route smoke.
 */

const USERNAME_MIN = 3;
const USERNAME_MAX = 32;
const USERNAME_PATTERN = /^[a-z][a-z0-9_]*$/;
const SITE_NAME_PATTERN = /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/;
const B3_HEX_PATTERN = /^[0-9a-f]{64}$/;
const CRAB_TYPED_ASSET_PATTERN = /^crab:\/\/([0-9a-f]{64})\.([a-z][a-z0-9_-]{1,31})$/i;
const CRAB_IMAGE_PATTERN = /^crab:\/\/([0-9a-f]{64})\.image$/i;
const CRAB_SITE_PATTERN = /^crab:\/\/([a-z0-9][a-z0-9-]{1,62}[a-z0-9])$/i;

export function initValidation() {
  return {
    ok: true,
    module: 'extensions/chrome/src/shared/utils/validation.js',
    scaffold: false,
    helpers: [
      'normalizeUsername',
      'normalizeUsernameHandle',
      'validateUsername',
      'validateSiteName',
      'validateCrabUrl',
      'isCrabImageUrl',
      'isTypedCrabAssetUrl',
      'isB3Hex',
    ],
  };
}

export function normalizeUsername(value) {
  return String(value || '')
    .trim()
    .replace(/^@+/, '')
    .toLowerCase();
}

export function normalizeUsernameHandle(value) {
  const username = normalizeUsername(value);
  return username ? `@${username}` : '';
}

export function validateUsername(value, { optional = false } = {}) {
  const raw = String(value || '').trim();
  const username = normalizeUsername(raw);
  const display = username ? `@${username}` : '';

  if (!username) {
    return result({
      ok: Boolean(optional),
      value: '',
      normalized: '',
      display: '',
      code: optional ? 'empty_optional' : 'username_required',
      message: optional ? '' : 'Enter a username hint.',
    });
  }

  if (username.length < USERNAME_MIN) {
    return result({
      ok: false,
      value: username,
      normalized: username,
      display,
      code: 'username_too_short',
      message: `Use at least ${USERNAME_MIN} characters after @.`,
    });
  }

  if (username.length > USERNAME_MAX) {
    return result({
      ok: false,
      value: username,
      normalized: username,
      display,
      code: 'username_too_long',
      message: `Use ${USERNAME_MAX} characters or fewer after @.`,
    });
  }

  if (!USERNAME_PATTERN.test(username)) {
    return result({
      ok: false,
      value: username,
      normalized: username,
      display,
      code: 'username_invalid_chars',
      message: 'Use lowercase letters, numbers, and underscores. Start with a letter.',
    });
  }

  if (username.includes('__')) {
    return result({
      ok: false,
      value: username,
      normalized: username,
      display,
      code: 'username_double_underscore',
      message: 'Avoid double underscores in a username hint.',
    });
  }

  return result({
    ok: true,
    value: username,
    normalized: username,
    display,
    code: 'username_syntax_ok',
    message: 'Local syntax looks good. Backend reservation is still not confirmed.',
  });
}

export function validateSiteName(value, { optional = false } = {}) {
  const name = String(value || '')
    .trim()
    .replace(/^crab:\/\//i, '')
    .toLowerCase();

  if (!name) {
    return result({
      ok: Boolean(optional),
      value: '',
      normalized: '',
      display: '',
      code: optional ? 'empty_optional' : 'site_name_required',
      message: optional ? '' : 'Enter a site name.',
    });
  }

  if (!SITE_NAME_PATTERN.test(name)) {
    return result({
      ok: false,
      value: name,
      normalized: name,
      display: `crab://${name}`,
      code: 'site_name_invalid',
      message: 'Use 3–64 lowercase letters, numbers, or hyphens. Start and end with a letter or number.',
    });
  }

  return result({
    ok: true,
    value: name,
    normalized: name,
    display: `crab://${name}`,
    code: 'site_name_syntax_ok',
    message: 'Local syntax looks good. Gateway/index ownership is not confirmed by syntax.',
  });
}

export function validateCrabUrl(value, { optional = false, kind = '' } = {}) {
  const raw = String(value || '').trim();

  if (!raw) {
    return result({
      ok: Boolean(optional),
      value: '',
      normalized: '',
      display: '',
      code: optional ? 'empty_optional' : 'crab_url_required',
      message: optional ? '' : 'Enter a crab:// URL.',
    });
  }

  const typed = parseTypedCrabAssetUrl(raw);

  if (typed) {
    if (kind && typed.kind !== String(kind).toLowerCase()) {
      return result({
        ok: false,
        value: raw,
        normalized: typed.url,
        display: typed.url,
        code: 'crab_url_wrong_kind',
        message: `Expected a .${kind} asset URL.`,
      });
    }

    return result({
      ok: true,
      value: raw,
      normalized: typed.url,
      display: typed.url,
      code: 'typed_asset_url_syntax_ok',
      message: 'Typed asset URL syntax is valid. Backend content is not confirmed by syntax.',
      meta: typed,
    });
  }

  const site = parseNamedSiteUrl(raw);

  if (site && !kind) {
    return result({
      ok: true,
      value: raw,
      normalized: site.url,
      display: site.url,
      code: 'site_url_syntax_ok',
      message: 'Named site URL syntax is valid. Gateway/index ownership is not confirmed by syntax.',
      meta: site,
    });
  }

  return result({
    ok: false,
    value: raw,
    normalized: raw,
    display: raw,
    code: 'crab_url_invalid',
    message: kind
      ? `Use crab://<64 lowercase hex>.${kind}.`
      : 'Use crab://<64 lowercase hex>.<kind> or crab://<site-name>.',
  });
}

export function parseTypedCrabAssetUrl(value) {
  const match = String(value || '').trim().match(CRAB_TYPED_ASSET_PATTERN);

  if (!match) {
    return null;
  }

  const hash = match[1].toLowerCase();
  const kind = match[2].toLowerCase();

  return {
    hash,
    cid: `b3:${hash}`,
    kind,
    url: `crab://${hash}.${kind}`,
  };
}

export function parseNamedSiteUrl(value) {
  const match = String(value || '').trim().match(CRAB_SITE_PATTERN);

  if (!match) {
    return null;
  }

  const siteName = match[1].toLowerCase();

  return {
    siteName,
    url: `crab://${siteName}`,
  };
}

export function isTypedCrabAssetUrl(value, kind = '') {
  const parsed = parseTypedCrabAssetUrl(value);

  if (!parsed) {
    return false;
  }

  return kind ? parsed.kind === String(kind).toLowerCase() : true;
}

export function isCrabImageUrl(value) {
  return CRAB_IMAGE_PATTERN.test(String(value || '').trim());
}

export function imageHashFromCrabUrl(value) {
  const match = String(value || '').trim().match(CRAB_IMAGE_PATTERN);
  return match ? match[1].toLowerCase() : '';
}

export function isB3Hex(value) {
  return B3_HEX_PATTERN.test(String(value || '').trim().toLowerCase());
}

export function result({ ok, value, normalized, display, code, message, meta = null }) {
  return {
    ok: Boolean(ok),
    value: value || '',
    normalized: normalized || '',
    display: display || '',
    code: code || (ok ? 'ok' : 'invalid'),
    message: message || '',
    meta,
  };
}