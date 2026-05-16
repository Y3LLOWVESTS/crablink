/**
 * RO:WHAT — Local display-only CrabLink catalog collector.
 * RO:WHY — Powers My Sites / My Assets / Profiles in the passport drawer from local browser evidence.
 * RO:INTERACTS — PassportDrawer, LocalCatalogPanel, recentReceipts, publicProfileCache, SiteResolvedProof, browser storage.
 * RO:INVARIANTS — local-only display cache; no backend catalogue claim; no fake CID; no wallet mutation.
 * RO:METRICS — none.
 * RO:CONFIG — scans localStorage/sessionStorage and known CrabLink display caches.
 * RO:SECURITY — public URLs/receipt metadata only; no secrets, tokens, private alt mappings, or spend authority.
 * RO:TEST — visit crab://ron7, claim/read @username, open drawer, confirm local catalog shows site/profile.
 */

import { readPublicProfileCache, subscribePublicProfileCache } from '../profile/publicProfileCache.js';
import { readRecentReceipts, subscribeRecentReceipts } from '../receipts/recentReceipts.js';

export const LOCAL_CATALOG_CHANGED_EVENT = 'crablink:local-catalog-changed';
export const LOCAL_CATALOG_KEY = 'crablink.local_catalog.v1';

const CRAB_URL_RE = /crab:\/\/(@?[a-z0-9][a-z0-9_.-]*|[a-f0-9]{64}\.[a-z][a-z0-9_-]{1,31})/gi;
const MAX_STORAGE_VALUES = 160;
const MAX_VALUE_CHARS = 80_000;
const MAX_PERSISTED_ENTRIES = 80;

export function readLocalCatalog() {
  const entries = [];
  const seen = new Set();

  for (const item of readPersistentCatalogEntries()) {
    pushEntry(entries, seen, item);
  }

  for (const item of profileEntries()) {
    pushEntry(entries, seen, item);
  }

  for (const item of receiptEntries()) {
    pushEntry(entries, seen, item);
  }

  for (const item of scanStorageEntries('sessionStorage')) {
    pushEntry(entries, seen, item);
  }

  for (const item of scanStorageEntries('localStorage')) {
    pushEntry(entries, seen, item);
  }

  const sorted = entries.sort((a, b) => timestampForSort(b) - timestampForSort(a));

  return {
    schema: 'crablink.local-catalog.v1',
    generatedAt: new Date().toISOString(),
    profiles: sorted.filter((item) => item.kind === 'profile'),
    sites: sorted.filter((item) => item.kind === 'site'),
    assets: sorted.filter((item) => item.kind !== 'site' && item.kind !== 'profile'),
    all: sorted,
    truthBoundary:
      'This catalog is local browser memory only. It is not a backend public catalogue, ownership index, or proof of publication.',
  };
}

export function writeLocalCatalogEntry(entry = {}) {
  const normalized = normalizeEntry({
    ...entry,
    createdAt: entry.createdAt || entry.created_at || new Date().toISOString(),
  });

  if (!normalized.crabUrl) {
    return null;
  }

  const merged = [];
  const seen = new Set();

  pushEntry(merged, seen, normalized);

  for (const item of readPersistentCatalogEntries()) {
    pushEntry(merged, seen, item);
  }

  const trimmed = merged
    .sort((a, b) => timestampForSort(b) - timestampForSort(a))
    .slice(0, MAX_PERSISTED_ENTRIES);

  writePersistentCatalogEntries(trimmed);
  dispatchLocalCatalogChanged();

  return normalized;
}

export function writeLocalCatalogEntries(entries = []) {
  const safeEntries = Array.isArray(entries) ? entries : [];
  const merged = [];
  const seen = new Set();

  for (const item of safeEntries) {
    pushEntry(merged, seen, {
      ...item,
      createdAt: item.createdAt || item.created_at || new Date().toISOString(),
    });
  }

  for (const item of readPersistentCatalogEntries()) {
    pushEntry(merged, seen, item);
  }

  const trimmed = merged
    .sort((a, b) => timestampForSort(b) - timestampForSort(a))
    .slice(0, MAX_PERSISTED_ENTRIES);

  writePersistentCatalogEntries(trimmed);
  dispatchLocalCatalogChanged();

  return trimmed;
}

export function clearLocalCatalogCache() {
  try {
    localStorage.removeItem(LOCAL_CATALOG_KEY);
  } catch (_error) {
    // Local catalog cache is optional.
  }

  dispatchLocalCatalogChanged();
}

export function subscribeLocalCatalog(listener) {
  if (typeof listener !== 'function') {
    return () => {};
  }

  const notify = () => listener(readLocalCatalog());

  const unsubscribeProfile = subscribePublicProfileCache(notify);
  const unsubscribeReceipts = subscribeRecentReceipts(notify);

  const onCustom = () => notify();
  const onStorage = (event) => {
    if (!event || event.key === LOCAL_CATALOG_KEY) {
      notify();
      return;
    }

    if (String(event.key || '').startsWith('crablink.')) {
      notify();
    }
  };

  try {
    window.addEventListener(LOCAL_CATALOG_CHANGED_EVENT, onCustom);
    window.addEventListener('storage', onStorage);
  } catch (_error) {
    return () => {
      unsubscribeProfile?.();
      unsubscribeReceipts?.();
    };
  }

  notify();

  return () => {
    unsubscribeProfile?.();
    unsubscribeReceipts?.();

    try {
      window.removeEventListener(LOCAL_CATALOG_CHANGED_EVENT, onCustom);
      window.removeEventListener('storage', onStorage);
    } catch (_error) {
      // Ignore cleanup errors.
    }
  };
}

export function dispatchLocalCatalogChanged() {
  try {
    window.dispatchEvent(new CustomEvent(LOCAL_CATALOG_CHANGED_EVENT));
  } catch (_error) {
    // Event bridge is best-effort.
  }
}

function readPersistentCatalogEntries() {
  try {
    const raw = localStorage.getItem(LOCAL_CATALOG_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.entries) ? parsed.entries : [];

    return list
      .map((item) => normalizeEntry(item))
      .filter((item) => item.crabUrl);
  } catch (_error) {
    return [];
  }
}

function writePersistentCatalogEntries(entries = []) {
  try {
    localStorage.setItem(
      LOCAL_CATALOG_KEY,
      JSON.stringify({
        schema: 'crablink.local-catalog-cache.v1',
        updatedAt: new Date().toISOString(),
        entries,
      }),
    );
  } catch (_error) {
    // Local catalog cache is display-only. Backend remains source of truth.
  }
}

function profileEntries() {
  const envelope = readPublicProfileCache();
  const profile = envelope?.profile || null;

  if (!profile?.handle) {
    return [];
  }

  return [
    normalizeEntry({
      kind: 'profile',
      crabUrl: profile.profileCrabUrl || `crab://${profile.handle}`,
      title: profile.displayName || profile.handle,
      status: profile.backendConfirmed ? 'backend-confirmed display cache' : 'local display cache',
      detail: profile.passportSubject || 'passport subject not returned',
      source: envelope.meta?.source || 'public_profile_cache',
      createdAt: envelope.meta?.cachedAt,
      cid: profile.publicProfileCid || '',
      raw: envelope,
    }),
  ];
}

function receiptEntries() {
  const receipts = readRecentReceipts();
  const entries = [];

  for (const receipt of receipts) {
    if (receipt.crabUrl) {
      entries.push(
        normalizeEntry({
          kind: inferKindFromCrabUrl(receipt.crabUrl),
          crabUrl: receipt.crabUrl,
          title: receipt.title || receipt.crabUrl,
          status: receipt.receiptHash ? 'receipt-backed local memory' : 'local receipt memory',
          detail: receipt.amountMinor ? `${receipt.amountMinor} ${String(receipt.asset || 'roc').toUpperCase()}` : '',
          source: receipt.source || 'recent_receipts',
          createdAt: receipt.createdAt,
          cid: receipt.manifestCid || receipt.rootDocumentCid || '',
          raw: receipt,
        }),
      );
    }

    if (receipt.manifestCid) {
      entries.push(
        normalizeEntry({
          kind: 'manifest',
          crabUrl: receipt.manifestCid,
          title: `Manifest for ${receipt.crabUrl || receipt.title || receipt.action || 'receipt'}`,
          status: 'receipt-referenced manifest',
          detail: receipt.receiptHash || receipt.txid || '',
          source: receipt.source || 'recent_receipts',
          createdAt: receipt.createdAt,
          cid: receipt.manifestCid,
          raw: receipt,
        }),
      );
    }

    if (receipt.rootDocumentCid) {
      entries.push(
        normalizeEntry({
          kind: 'root',
          crabUrl: receipt.rootDocumentCid,
          title: `Root document for ${receipt.crabUrl || receipt.title || 'site'}`,
          status: 'receipt-referenced root',
          detail: receipt.receiptHash || receipt.txid || '',
          source: receipt.source || 'recent_receipts',
          createdAt: receipt.createdAt,
          cid: receipt.rootDocumentCid,
          raw: receipt,
        }),
      );
    }
  }

  return entries;
}

function scanStorageEntries(kind) {
  const store = storageFor(kind);

  if (!store) {
    return [];
  }

  const entries = [];
  const max = Math.min(store.length, MAX_STORAGE_VALUES);

  try {
    for (let i = 0; i < max; i += 1) {
      const key = store.key(i);
      const raw = store.getItem(key);

      if (!raw) {
        continue;
      }

      const text = String(raw).slice(0, MAX_VALUE_CHARS);
      const matches = findCrabUrls(text);

      for (const crabUrl of matches) {
        entries.push(
          normalizeEntry({
            kind: inferKindFromCrabUrl(crabUrl),
            crabUrl,
            title: titleFromCrabUrl(crabUrl),
            status: 'local storage reference',
            detail: key || kind,
            source: `${kind}:${key || 'unknown'}`,
            createdAt: '',
            cid: cidFromCrabUrl(crabUrl),
            raw: {
              storage: kind,
              key,
            },
          }),
        );
      }
    }
  } catch (_error) {
    return entries;
  }

  return entries;
}

function findCrabUrls(value) {
  const text = String(value || '');
  const out = new Set();

  CRAB_URL_RE.lastIndex = 0;

  let match = CRAB_URL_RE.exec(text);

  while (match) {
    out.add(normalizeCrabUrl(match[0]));
    match = CRAB_URL_RE.exec(text);
  }

  return Array.from(out);
}

function pushEntry(entries, seen, value) {
  const item = normalizeEntry(value);

  if (!item.crabUrl) {
    return;
  }

  const key = `${item.kind}:${item.crabUrl}`.toLowerCase();

  if (seen.has(key)) {
    return;
  }

  seen.add(key);
  entries.push(item);
}

function normalizeEntry(value = {}) {
  const crabUrl = normalizeCrabUrl(value.crabUrl || value.url || value.cid);
  const kind = stringValue(value.kind, inferKindFromCrabUrl(crabUrl), 'asset');

  return {
    schema: 'crablink.local-catalog-entry.v1',
    kind,
    crabUrl,
    title: stringValue(value.title, titleFromCrabUrl(crabUrl), crabUrl),
    status: stringValue(value.status, 'local display memory'),
    detail: stringValue(value.detail),
    source: stringValue(value.source, 'local_catalog'),
    createdAt: stringValue(value.createdAt, value.created_at),
    cid: stringValue(value.cid, cidFromCrabUrl(crabUrl)),
    raw: value.raw || value,
  };
}

function inferKindFromCrabUrl(value) {
  const url = normalizeCrabUrl(value);

  if (!url) {
    return 'asset';
  }

  if (/^crab:\/\/@/i.test(url) || /\.profile$/i.test(url)) {
    return 'profile';
  }

  const typed = url.match(/^crab:\/\/[a-f0-9]{64}\.([a-z][a-z0-9_-]{1,31})$/i);

  if (typed) {
    return typed[1].toLowerCase();
  }

  if (/^b3:[a-f0-9]{64}$/i.test(url)) {
    return 'b3';
  }

  return 'site';
}

function titleFromCrabUrl(value) {
  const url = normalizeCrabUrl(value);

  if (!url) {
    return '';
  }

  if (url.startsWith('crab://@')) {
    return url.replace(/^crab:\/\//i, '');
  }

  const typed = url.match(/^crab:\/\/([a-f0-9]{64})\.([a-z][a-z0-9_-]{1,31})$/i);

  if (typed) {
    return `${typed[2]} ${typed[1].slice(0, 10)}…`;
  }

  if (/^b3:[a-f0-9]{64}$/i.test(url)) {
    return `b3 ${url.slice(3, 13)}…`;
  }

  return url.replace(/^crab:\/\//i, '');
}

function cidFromCrabUrl(value) {
  const url = normalizeCrabUrl(value);
  const typed = url.match(/^crab:\/\/([a-f0-9]{64})\.[a-z][a-z0-9_-]{1,31}$/i);

  if (typed) {
    return `b3:${typed[1].toLowerCase()}`;
  }

  if (/^b3:[a-f0-9]{64}$/i.test(url)) {
    return url.toLowerCase();
  }

  return '';
}

function normalizeCrabUrl(value) {
  const clean = String(value || '').trim();

  if (!clean) {
    return '';
  }

  if (/^b3:[a-f0-9]{64}$/i.test(clean)) {
    return clean.toLowerCase();
  }

  if (!/^crab:\/\//i.test(clean)) {
    return '';
  }

  const body = clean
    .replace(/^crab:\/\//i, '')
    .split(/[\s"'<>()[\]{}]/)[0]
    .replace(/[.,;!?]+$/g, '');

  if (!body) {
    return '';
  }

  return `crab://${body}`;
}

function timestampForSort(entry) {
  const raw = String(entry?.createdAt || '').trim();

  if (/^[0-9]+$/.test(raw)) {
    return Number(raw);
  }

  const parsed = Date.parse(raw);

  if (Number.isFinite(parsed)) {
    return parsed;
  }

  return 0;
}

function storageFor(kind) {
  try {
    if (kind === 'sessionStorage') {
      return sessionStorage;
    }

    if (kind === 'localStorage') {
      return localStorage;
    }
  } catch (_error) {
    return null;
  }

  return null;
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