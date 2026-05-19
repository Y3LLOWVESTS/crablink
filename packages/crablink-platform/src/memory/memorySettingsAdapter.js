/**
 * RO:WHAT — In-memory settings adapter for tests and static previews.
 * RO:WHY — Lets shared React run without Chrome or Tauri.
 * RO:INTERACTS — settingsPort contract.
 * RO:INVARIANTS — test/display state only.
 */

export function createMemorySettingsAdapter(initialSettings = {}) {
  let settings = { ...initialSettings };

  return {
    async readSettings() {
      return { ...settings };
    },
    async writeSettings(nextSettings) {
      settings = { ...nextSettings };
      return { ...settings };
    }
  };
}
