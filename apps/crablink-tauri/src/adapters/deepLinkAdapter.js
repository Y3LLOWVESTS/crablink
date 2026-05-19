/**
 * RO:WHAT — Deep-link adapter placeholder for future crab:// handling.
 * RO:WHY — Deep links are untrusted input and need a narrow validation boundary.
 * RO:INTERACTS — future Tauri deep-link commands.
 * RO:INVARIANTS — navigation input is not authority; validate before render.
 */

export function normalizeIncomingDeepLink(value) {
  return String(value || "").trim();
}
