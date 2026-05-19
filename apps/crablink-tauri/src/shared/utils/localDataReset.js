/**
 * RO:WHAT — Safe local display-state reset helpers for CrabLink Tauri.
 * RO:WHY — Storage and Settings IDB; stale WebView/localStorage hints can hide paid-flow bugs during Tauri parity testing.
 * RO:INTERACTS — TopBar settings modal, localCatalog, recentReceipts, publicProfileCache, wallet nonce hints, route state.
 * RO:INVARIANTS — clears display-only local caches; never deletes backend truth; never unlocks paid content; never mutates wallet/ledger.
 * RO:METRICS — none.
 * RO:CONFIG — browser/WebView localStorage and sessionStorage only.
 * RO:SECURITY — no secrets are read or rendered; dev token settings are not touched unless settings reset is handled elsewhere.
 * RO:TEST — manual Settings → Local data controls; scripts/check-tauri.sh build gate.
 */

import {
  clearLocalCatalogCache,
  dispatchLocalCatalogChanged,
} from '../catalog/localCatalog.js';
import {
  clearRecentReceiptCache,
  dispatchReceiptsChanged,
} from '../receipts/recentReceipts.js';
import { clearPublicProfileCache } from '../profile/publicProfileCache.js';

const NONCE_HINT_PREFIXES = Object.freeze([
  'crablink.react.walletHold.lastNonce.',
  'crablink.wallet.nextNonce.',
]);

const ROUTE_HINT_SETTINGS_PATCH = Object.freeze({
  lastCrabUrl: '',
  lastProductActionAt: '',
  lastProductSchema: '',
  lastProductCrabUrl: '',
  lastProductB3Cid: '',
  lastProductSiteName: '',
  lastProductSummary: '',
});

export function clearLocalReceiptDisplayCache() {
  clearRecentReceiptCache();

  return {
    ok: true,
    message: 'Receipt display cache cleared. Backend wallet and ledger truth were not changed.',
  };
}

export function clearLocalCatalogDisplayCache() {
  clearLocalCatalogCache();

  return {
    ok: true,
    message: 'Local catalog display cache cleared. Published b3 objects and index truth were not changed.',
  };
}

export function clearLocalProfileDisplayCache() {
  clearPublicProfileCache();

  return {
    ok: true,
    message: 'Public profile display cache cleared. Backend passport/profile truth was not changed.',
  };
}

export function clearDevNonceHints() {
  const removed = removeStorageKeysByPrefix(['localStorage', 'sessionStorage'], NONCE_HINT_PREFIXES);

  return {
    ok: true,
    removed,
    message:
      removed > 0
        ? `Cleared ${removed} local nonce hint${removed === 1 ? '' : 's'}. Backend wallet nonce truth was not changed.`
        : 'No local nonce hints were found. Backend wallet nonce truth was not changed.',
  };
}

export async function clearRouteDisplayHints({
  updateSettings = null,
  navigation = null,
} = {}) {
  let settingsUpdated = false;
  let routeReset = false;

  if (typeof updateSettings === 'function') {
    await updateSettings(ROUTE_HINT_SETTINGS_PATCH);
    settingsUpdated = true;
  }

  if (typeof navigation?.goHome === 'function') {
    navigation.goHome();
    routeReset = true;
  }

  return {
    ok: true,
    settingsUpdated,
    routeReset,
    message:
      settingsUpdated || routeReset
        ? 'Route display hints reset to crab://home. Browser history and backend route truth were not rewritten.'
        : 'No route display hints were available to reset.',
  };
}

export async function clearLocalDevState({
  updateSettings = null,
  navigation = null,
  resetZoom = null,
} = {}) {
  const receipts = clearLocalReceiptDisplayCache();
  const catalog = clearLocalCatalogDisplayCache();
  const profile = clearLocalProfileDisplayCache();
  const nonces = clearDevNonceHints();
  const route = await clearRouteDisplayHints({
    updateSettings,
    navigation,
  });

  let zoomReset = false;

  if (typeof resetZoom === 'function') {
    resetZoom();
    zoomReset = true;
  }

  dispatchLocalCatalogChanged();
  dispatchReceiptsChanged();

  return {
    ok: true,
    receipts,
    catalog,
    profile,
    nonces,
    route,
    zoomReset,
    message:
      'Local dev display state cleared. Backend receipts, balances, ledger entries, b3 content, and gateway records were not changed.',
  };
}

function removeStorageKeysByPrefix(storageNames, prefixes) {
  let removed = 0;

  for (const storageName of storageNames) {
    const storage = getStorage(storageName);

    if (!storage) {
      continue;
    }

    const keys = [];

    try {
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);

        if (matchesPrefix(key, prefixes)) {
          keys.push(key);
        }
      }

      for (const key of keys) {
        storage.removeItem(key);
        removed += 1;
      }
    } catch (_error) {
      // WebView/browser storage can be unavailable. Reset helpers are best-effort only.
    }
  }

  return removed;
}

function getStorage(storageName) {
  try {
    if (storageName === 'localStorage') {
      return globalThis.localStorage || null;
    }

    if (storageName === 'sessionStorage') {
      return globalThis.sessionStorage || null;
    }
  } catch (_error) {
    return null;
  }

  return null;
}

function matchesPrefix(key, prefixes) {
  if (typeof key !== 'string') {
    return false;
  }

  return prefixes.some((prefix) => key.startsWith(prefix));
}