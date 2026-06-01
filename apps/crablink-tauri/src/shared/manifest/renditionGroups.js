/**
 * RO:WHAT — Display-only rendition group cache helpers for image/video asset pages.
 * RO:WHY — Lets freshly minted bundles show sibling links while backend bundle-index contracts mature.
 * RO:INTERACTS — VideoPublishFlow.jsx, AssetHydratedView.jsx, localStorage display cache.
 * RO:INVARIANTS — display-only cache; no fake CIDs; no wallet/receipt/ledger truth; backend b3 URLs stay canonical.
 * RO:METRICS — none.
 * RO:CONFIG — localStorage key crablink.video_rendition_groups.v1.
 * RO:SECURITY — stores public crab URLs/CIDs only; no secrets, local paths, staged handles, or paid bytes.
 * RO:TEST — mint video bundle, open any returned version, confirm sibling rows survive route navigation.
 */

export const VIDEO_RENDITION_GROUP_CACHE_KEY = 'crablink.video_rendition_groups.v1';
export const VIDEO_RENDITION_GROUP_CHANGED_EVENT = 'crablink:video-rendition-groups-changed';

const MAX_GROUPS = 32;
const HEX_64_RE = /^[0-9a-f]{64}$/;

export function writeVideoBundleRenditionGroup(input = {}) {
  const group = normalizeVideoBundleGroup(input);

  if (!group || group.renditions.length === 0) {
    return null;
  }

  const state = readCacheState();
  state.groups[group.group_id] = group;

  for (const key of keysForGroup(group)) {
    state.asset_index[key] = group.group_id;
  }

  pruneState(state);
  writeCacheState(state);
  notifyChanged();

  return group;
}

export function readVideoBundleRenditionGroupForAsset({ cid = '', crabUrl = '', hash = '' } = {}) {
  const state = readCacheState();
  const lookupKeys = keysForAsset({ cid, crabUrl, hash });

  for (const key of lookupKeys) {
    const groupId = state.asset_index[key];
    const group = groupId ? state.groups[groupId] : null;

    if (group) {
      return cloneGroup(group);
    }
  }

  for (const group of Object.values(state.groups)) {
    if (!group || !Array.isArray(group.renditions)) {
      continue;
    }

    const matched = group.renditions.some((item) => {
      const itemKeys = keysForAsset({ cid: item.cid, crabUrl: item.crab_url, hash: item.hash });
      return itemKeys.some((key) => lookupKeys.includes(key));
    });

    if (matched) {
      return cloneGroup(group);
    }
  }

  return null;
}

export function clearVideoBundleRenditionGroups() {
  try {
    globalThis.localStorage?.removeItem?.(VIDEO_RENDITION_GROUP_CACHE_KEY);
    notifyChanged();
  } catch (_error) {
    // Display cache cleanup is best-effort only.
  }
}

export function initRenditionGroups() {
  return {
    ok: true,
    module: 'apps/crablink-tauri/src/shared/manifest/renditionGroups.js',
    cacheKey: VIDEO_RENDITION_GROUP_CACHE_KEY,
    displayOnly: true,
  };
}

function normalizeVideoBundleGroup(input = {}) {
  const source = objectValue(input);
  const rawGroup = objectValue(source.renditionGroup || source.rendition_group || source.videoRenditionGroup || source.video_rendition_group || source);
  const sourceResults = Array.isArray(source.results) ? source.results : [];
  const rawRenditions = Array.isArray(rawGroup.renditions) && rawGroup.renditions.length > 0
    ? rawGroup.renditions
    : sourceResults;

  const renditions = rawRenditions
    .map((item) => normalizeRenditionItem(item))
    .filter((item) => item.cid || item.crab_url);

  if (renditions.length === 0) {
    return null;
  }

  const primary = renditions.find((item) => item.role === 'source_clean_master')
    || renditions.find((item) => item.asset_kind === 'video')
    || renditions[0];
  const sourceCid = normalizeCid(rawGroup.source_cid || rawGroup.sourceCid || primary.cid);
  const canonicalCrabUrl = normalizeCrabUrl(rawGroup.canonical_crab_url || rawGroup.canonicalCrabUrl || primary.crab_url);
  const groupId = normalizeGroupId(rawGroup.group_id || rawGroup.groupId || rawGroup.id || sourceCid || canonicalCrabUrl);

  return {
    schema: String(rawGroup.schema || 'crablink.video-rendition-group.v1'),
    group_id: groupId,
    source_cid: sourceCid,
    canonical_crab_url: canonicalCrabUrl,
    title: String(rawGroup.title || source.title || 'Video bundle'),
    generated_at: String(rawGroup.generated_at || rawGroup.generatedAt || source.mintedAt || new Date().toISOString()),
    stored_at: new Date().toISOString(),
    relationship_truth: String(
      rawGroup.relationship_truth
        || rawGroup.relationshipTruth
        || source.relationshipDurability
        || 'display_only_cache_of_backend_returned_video_bundle_urls',
    ),
    display_cache_truth:
      'This local cache only preserves public sibling links returned after upload. It does not prove ownership, entitlement, wallet balance, receipt truth, or backend index truth.',
    source_job_id: String(rawGroup.source_job_id || rawGroup.sourceJobId || source.sourceJobId || ''),
    renditions,
  };
}

function normalizeRenditionItem(input = {}) {
  const raw = objectValue(input);
  const assetKind = normalizeAssetKind(raw.asset_kind || raw.assetKind || raw.kind || 'video');
  const cid = normalizeCid(raw.cid || raw.asset_cid || raw.assetCid || raw.content_id || raw.contentId || raw.predicted_cid || raw.predictedCid);
  const crabUrl = normalizeCrabUrl(raw.crab_url || raw.crabUrl || raw.url || raw.predicted_crab_url || raw.predictedCrabUrl || crabUrlFromCid(cid, assetKind));
  const hash = normalizeHash(raw.hash || cid || crabUrl);

  return {
    role: String(raw.role || raw.rendition_role || raw.renditionRole || 'rendition'),
    label: String(raw.label || raw.rendition_label || raw.renditionLabel || raw.role || 'Rendition'),
    asset_kind: assetKind,
    mime: String(raw.mime || raw.content_type || raw.contentType || ''),
    bytes: positiveNumber(raw.bytes, raw.byte_length, raw.byteLength, raw.size_bytes, raw.sizeBytes),
    width: positiveNumber(raw.width, raw.target_width, raw.targetWidth),
    height: positiveNumber(raw.height, raw.target_height, raw.targetHeight),
    duration_seconds: positiveNumber(raw.duration_seconds, raw.durationSeconds),
    cid,
    crab_url: crabUrl,
    hash,
    predicted_cid: normalizeCid(raw.predicted_cid || raw.predictedCid),
    predicted_crab_url: normalizeCrabUrl(raw.predicted_crab_url || raw.predictedCrabUrl),
    backend_verified: Boolean(raw.backend_verified ?? raw.backendVerified ?? cid ?? crabUrl),
    prediction_matched: Boolean(raw.prediction_matched ?? raw.predictionMatched),
  };
}

function readCacheState() {
  try {
    const parsed = JSON.parse(globalThis.localStorage?.getItem?.(VIDEO_RENDITION_GROUP_CACHE_KEY) || 'null');

    if (parsed && typeof parsed === 'object') {
      return {
        schema: 'crablink.video-rendition-groups-cache.v1',
        groups: objectValue(parsed.groups),
        asset_index: objectValue(parsed.asset_index || parsed.assetIndex),
      };
    }
  } catch (_error) {
    // Corrupt display cache should fail closed to an empty cache.
  }

  return {
    schema: 'crablink.video-rendition-groups-cache.v1',
    groups: {},
    asset_index: {},
  };
}

function writeCacheState(state) {
  try {
    globalThis.localStorage?.setItem?.(VIDEO_RENDITION_GROUP_CACHE_KEY, JSON.stringify(state));
  } catch (_error) {
    // Local display cache is best-effort; backend truth remains authoritative.
  }
}

function pruneState(state) {
  const groups = Object.values(state.groups || {})
    .filter(Boolean)
    .sort((a, b) => Date.parse(b.stored_at || b.generated_at || 0) - Date.parse(a.stored_at || a.generated_at || 0));
  const keep = new Set(groups.slice(0, MAX_GROUPS).map((group) => group.group_id));

  for (const groupId of Object.keys(state.groups || {})) {
    if (!keep.has(groupId)) {
      delete state.groups[groupId];
    }
  }

  for (const [key, groupId] of Object.entries(state.asset_index || {})) {
    if (!keep.has(groupId)) {
      delete state.asset_index[key];
    }
  }
}

function keysForGroup(group) {
  const keys = [
    ...keysForAsset({ cid: group.source_cid, crabUrl: group.canonical_crab_url }),
  ];

  for (const item of group.renditions || []) {
    keys.push(...keysForAsset({ cid: item.cid, crabUrl: item.crab_url, hash: item.hash }));
    keys.push(...keysForAsset({ cid: item.predicted_cid, crabUrl: item.predicted_crab_url }));
  }

  return Array.from(new Set(keys.filter(Boolean)));
}

function keysForAsset({ cid = '', crabUrl = '', hash = '' } = {}) {
  const keys = [];
  const normalizedCid = normalizeCid(cid || hash);
  const normalizedHash = normalizeHash(hash || cid || crabUrl);
  const normalizedUrl = normalizeCrabUrl(crabUrl);

  if (normalizedCid) keys.push(`cid:${normalizedCid}`);
  if (normalizedHash) keys.push(`hash:${normalizedHash}`);
  if (normalizedUrl) keys.push(`url:${normalizedUrl.toLowerCase()}`);

  return Array.from(new Set(keys));
}

function cloneGroup(group) {
  try {
    return JSON.parse(JSON.stringify(group));
  } catch (_error) {
    return group;
  }
}

function normalizeGroupId(value) {
  const cid = normalizeCid(value);
  if (cid) return cid;

  const text = String(value || '').trim();
  return text || `video-bundle:${Date.now()}`;
}

function normalizeAssetKind(value) {
  const clean = String(value || '').trim().toLowerCase();
  return clean === 'image' ? 'image' : 'video';
}

function normalizeCid(value) {
  const hash = normalizeHash(value);
  return hash ? `b3:${hash}` : '';
}

function normalizeHash(value) {
  const raw = String(value || '')
    .trim()
    .replace(/^crab:\/\//i, '')
    .replace(/\.(image|video)$/i, '')
    .replace(/^b3:/i, '')
    .toLowerCase();

  return HEX_64_RE.test(raw) ? raw : '';
}

function normalizeCrabUrl(value) {
  const text = String(value || '').trim();
  const match = text.match(/^crab:\/\/([0-9a-f]{64})\.(image|video)$/i);

  if (!match) {
    return '';
  }

  return `crab://${match[1].toLowerCase()}.${match[2].toLowerCase()}`;
}

function crabUrlFromCid(cid, assetKind) {
  const hash = normalizeHash(cid);
  return hash ? `crab://${hash}.${normalizeAssetKind(assetKind)}` : '';
}

function positiveNumber(...values) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number) && number > 0) {
      return number;
    }
  }
  return null;
}

function objectValue(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function notifyChanged() {
  try {
    globalThis.window?.dispatchEvent?.(new CustomEvent(VIDEO_RENDITION_GROUP_CHANGED_EVENT));
  } catch (_error) {
    // Non-browser tests do not need events.
  }
}
