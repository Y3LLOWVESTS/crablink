/**
 * RO:WHAT — Frontend settings adapter placeholder for Tauri.
 * RO:WHY — Gives migrated React a stable settings boundary.
 * RO:INTERACTS — Tauri commands read_settings/write_settings.
 * RO:INVARIANTS — settings are local preferences, not wallet/ledger truth.
 */

import { callTauri } from "../platform/tauriPlatform.js";

export function readSettings() {
  return callTauri("read_settings");
}

export function writeSettings(settings) {
  return callTauri("write_settings", { settings });
}
