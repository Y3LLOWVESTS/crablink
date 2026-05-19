/**
 * RO:WHAT — Test-only memory platform placeholder.
 * RO:WHY — Lets shared React code run without Chrome or Tauri during migration tests.
 * RO:INTERACTS — future platform contract tests.
 * RO:INVARIANTS — display/test state only; no backend truth.
 */

export function createMemoryPlatform() {
  return {
    kind: "memory",
    readSettings: async () => ({}),
    writeSettings: async () => undefined
  };
}
