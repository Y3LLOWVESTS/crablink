/**
 * RO:WHAT — Shared crab://, b3 CID, typed asset, and site-name parsing helpers.
 * RO:WHY — CrabLink refactor; keeps route/client parsing deterministic and out of page components.
 * RO:INTERACTS — router.js, siteClient.js, assetClient.js, route-owned pages, gateway-facing clients.
 * RO:INVARIANTS — public assets use crab://<64hex>.<kind>; internal CIDs use b3:<64hex>; names are pointers only.
 * RO:METRICS — none.
 * RO:CONFIG — built-in route list can be supplied by callers when needed.
 * RO:SECURITY — parse/normalize only; no backend calls, capabilities, keys, wallet state, or receipts.
 * RO:TEST — npm run build; scripts/check-react-lane.sh; route smoke for named sites and typed assets.
 */

const CRAB_PREFIX = 'crab://';
const B3_PREFIX = 'b3:';
const HEX_64_RE = /^[0-9a-f]{64}$/;
const CID_RE = /^b3:([0-9a-f]{64})$/;
const RAW_HASH_RE = /^[0-9a-f]{64}$/i;
const TYPED_ASSET_RE = /^([0-9a-f]{64})\.([a-z][a-z0-9_-]{0,31})$/i;
const SAFE_SITE_RE = /^[a-z0-9][a-z0-9_.-]{0,79}$/;
const ASSET_KIND_RE = /^[a-z][a-z0-9_-]{0,31}$/i;

export function initCrabUrl() {
  return {
    ok: true,
    module: 'extensions/chrome/src/shared/utils/crabUrl.js',
    scaffold: false,
  };
}

export function stripCrabPrefix(value) {
  const raw = String(value || '').trim();
  return raw.toLowerCase().startsWith(CRAB_PREFIX) ? raw.slice(CRAB_PREFIX.length) : raw;
}

export function stripQueryAndHash(value) {
  return String(value || '').split(/[?#]/)[0].trim();
}

export function normalizeHash(value) {
  const raw = String(value || '').trim().toLowerCase();
  const hash = raw.startsWith(B3_PREFIX) ? raw.slice(B3_PREFIX.length) : raw;
  return HEX_64_RE.test(hash) ? hash : '';
}

export function isRawHash(value) {
  return RAW_HASH_RE.test(String(value || '').trim());
}

export function isB3Cid(value) {
  return CID_RE.test(String(value || '').trim().toLowerCase());
}

export function normalizeB3Cid(value) {
  const hash = normalizeHash(value);
  return hash ? `${B3_PREFIX}${hash}` : '';
}

export function normalizeAssetKind(value, fallback = 'image') {
  const kind = String(value || fallback || 'image').trim().toLowerCase();
  return ASSET_KIND_RE.test(kind) ? kind : String(fallback || 'image').trim().toLowerCase();
}

export function parseTypedAssetBody(value) {
  const body = stripQueryAndHash(stripCrabPrefix(value)).replace(/^\/+/, '').trim();
  const match = body.match(TYPED_ASSET_RE);

  if (!match) {
    return null;
  }

  const hash = match[1].toLowerCase();
  const kind = match[2].toLowerCase();

  return Object.freeze({
    hash,
    kind,
    cid: `${B3_PREFIX}${hash}`,
    crabUrl: `${CRAB_PREFIX}${hash}.${kind}`,
  });
}

export function isTypedAssetUrl(value) {
  return Boolean(parseTypedAssetBody(value));
}

export function normalizeTypedAssetUrl({ hash = '', kind = 'image', cid = '' } = {}) {
  const safeHash = normalizeHash(hash || cid);
  const safeKind = normalizeAssetKind(kind, 'image');
  return safeHash ? `${CRAB_PREFIX}${safeHash}.${safeKind}` : '';
}

export function parseCrabInput(value, { builtIns = [] } = {}) {
  const raw = String(value || '').trim();

  if (!raw) {
    return Object.freeze({ kind: 'empty', raw, normalized: '' });
  }

  if (isRawHash(raw) || isB3Cid(raw)) {
    const hash = normalizeHash(raw);
    return Object.freeze({
      kind: 'asset',
      raw,
      normalized: `${CRAB_PREFIX}${hash}.image`,
      hash,
      assetKind: 'image',
      cid: `${B3_PREFIX}${hash}`,
    });
  }

  const body = stripQueryAndHash(stripCrabPrefix(raw)).replace(/^\/+/, '').trim();
  const typed = parseTypedAssetBody(body);

  if (typed) {
    return Object.freeze({
      kind: 'asset',
      raw,
      normalized: typed.crabUrl,
      hash: typed.hash,
      assetKind: typed.kind,
      cid: typed.cid,
    });
  }

  const lowerBody = body.toLowerCase();
  if (builtIns.includes(lowerBody)) {
    return Object.freeze({
      kind: 'builtin',
      raw,
      normalized: `${CRAB_PREFIX}${lowerBody}`,
      routeKind: lowerBody,
    });
  }

  const siteName = normalizeSiteName(body);
  return Object.freeze({
    kind: siteName ? 'site' : 'invalid',
    raw,
    normalized: siteName ? `${CRAB_PREFIX}${siteName}` : raw,
    siteName,
  });
}

export function normalizeSiteName(value) {
  const raw = stripQueryAndHash(stripCrabPrefix(value))
    .replace(/^\/+/, '')
    .trim()
    .toLowerCase();

  const clean = raw
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_.-]+/g, '-')
    .replace(/[-.]{2,}/g, (match) => match[0])
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  if (!clean || HEX_64_RE.test(clean)) {
    return '';
  }

  return SAFE_SITE_RE.test(clean) ? clean : '';
}

export function makeCrabSiteUrl(siteName) {
  const safe = normalizeSiteName(siteName);
  return safe ? `${CRAB_PREFIX}${safe}` : '';
}

export function makeCrabAssetUrl(hashOrCid, kind = 'image') {
  const hash = normalizeHash(hashOrCid);
  const safeKind = normalizeAssetKind(kind, 'image');
  return hash ? `${CRAB_PREFIX}${hash}.${safeKind}` : '';
}

export function crabImageUrlToCid(value) {
  const typed = parseTypedAssetBody(value);
  return typed && typed.kind === 'image' ? typed.cid : '';
}