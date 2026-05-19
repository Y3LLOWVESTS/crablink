/**
 * RO:WHAT — Settings adapter contract.
 * RO:WHY — Shared React needs settings without knowing Chrome or Tauri storage.
 * RO:INTERACTS — chromeSettingsAdapter, tauriSettingsAdapter, memorySettingsAdapter.
 * RO:INVARIANTS — settings are preferences, not backend truth.
 */

export function createSettingsPort({ readSettings, writeSettings }) {
  if (typeof readSettings !== "function" || typeof writeSettings !== "function") {
    throw new TypeError("settings port requires readSettings and writeSettings");
  }

  return Object.freeze({ readSettings, writeSettings });
}
