/**
 * RO:WHAT — React-shell settings bridge for CrabLink's shared extension storage adapter.
 * RO:WHY — App Integration; Concerns: DX/SEC/RES; lets Vite/dev mode and Chrome extension mode share one safe settings path.
 * RO:INTERACTS — ../storage.js, App.jsx, GatewayClient, devPassportSessions.js, future ThemeProvider/profile routes.
 * RO:INVARIANTS — local settings are not backend truth; no private keys; no spend authority; no fake balances/receipts/CIDs.
 * RO:METRICS — none.
 * RO:CONFIG — gatewayUrl, requestTimeoutMs, passport/wallet display labels, devMode, optional per-window dev session URL.
 * RO:SECURITY — dev token stays local-only; do not log or render secrets; URL sessions are labels only.
 * RO:TEST — npm run build; scripts/check-chrome.sh; Vite route smoke and loaded-extension multi-passport smoke.
 */

import {
  DEFAULT_SETTINGS,
  getSettings,
  hasChromeLocalStorage,
  resetSettings,
  saveSettings,
  storageBackendName,
} from '../storage.js';
import {
  applyDevPassportSessionToSettings,
  getDevPassportSessionFromLocation,
} from '../shared/utils/devPassportSessions.js';

export { DEFAULT_SETTINGS };

export async function loadAppSettings() {
  const loaded = await getSettings();
  const sessionResult = applyDevPassportSessionToSettings(loaded);

  return {
    settings: sessionResult.settings,
    storage: storageStatus(sessionResult.session),
  };
}

export async function saveAppSettings(next) {
  const saved = await saveSettings(next);
  const sessionResult = applyDevPassportSessionToSettings(saved);

  return {
    settings: sessionResult.settings,
    storage: storageStatus(sessionResult.session),
  };
}

export async function resetAppSettings() {
  const reset = await resetSettings();
  const sessionResult = applyDevPassportSessionToSettings(reset);

  return {
    settings: sessionResult.settings,
    storage: storageStatus(sessionResult.session),
  };
}

export function storageStatus(activeSession = getDevPassportSessionFromLocation()) {
  return {
    backend: storageBackendName(),
    chromeLocal: hasChromeLocalStorage(),
    isExtensionContext: Boolean(globalThis.chrome?.runtime?.id),
    isDevFallback: !hasChromeLocalStorage(),
    devPassportSession: activeSession,
    hasDevPassportSession: Boolean(activeSession),
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