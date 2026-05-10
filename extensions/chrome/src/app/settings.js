/**
 * RO:WHAT — React-shell settings bridge for CrabLink's shared extension storage adapter.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; lets Vite/dev mode and Chrome extension mode share one safe settings path.
 * RO:INTERACTS — ../storage.js, App.jsx, GatewayClient, future ThemeProvider/profile routes.
 * RO:INVARIANTS — local settings are not backend truth; no private keys; no spend authority; no fake balances/receipts/CIDs.
 * RO:METRICS — none.
 * RO:CONFIG — gatewayUrl, requestTimeoutMs, passport/wallet display labels, devMode.
 * RO:SECURITY — dev token stays local-only; do not log or render secrets.
 * RO:TEST — npm run build; scripts/check-chrome.sh; Vite route smoke and loaded-extension smoke.
 */

import {
  DEFAULT_SETTINGS,
  getSettings,
  hasChromeLocalStorage,
  resetSettings,
  saveSettings,
  storageBackendName,
} from '../storage.js';

export { DEFAULT_SETTINGS };

export async function loadAppSettings() {
  const settings = await getSettings();

  return {
    settings,
    storage: storageStatus(),
  };
}

export async function saveAppSettings(next) {
  const settings = await saveSettings(next);

  return {
    settings,
    storage: storageStatus(),
  };
}

export async function resetAppSettings() {
  const settings = await resetSettings();

  return {
    settings,
    storage: storageStatus(),
  };
}

export function storageStatus() {
  return {
    backend: storageBackendName(),
    chromeLocal: hasChromeLocalStorage(),
    isExtensionContext: Boolean(globalThis.chrome?.runtime?.id),
    isDevFallback: !hasChromeLocalStorage(),
  };
}

export function watchAppSettings(callback) {
  if (typeof callback !== 'function') {
    return () => {};
  }

  if (globalThis.chrome?.storage?.onChanged?.addListener) {
    const listener = (_changes, areaName) => {
      if (areaName === 'local') {
        void loadAppSettings().then(callback);
      }
    };

    chrome.storage.onChanged.addListener(listener);

    return () => {
      try {
        chrome.storage.onChanged.removeListener(listener);
      } catch (_error) {
        // Chrome may unload extension contexts while a cleanup is in flight.
      }
    };
  }

  const onStorage = (event) => {
    if (!event || event.key === 'crablink.storage.v1') {
      void loadAppSettings().then(callback);
    }
  };

  globalThis.addEventListener?.('storage', onStorage);

  return () => {
    globalThis.removeEventListener?.('storage', onStorage);
  };
}
