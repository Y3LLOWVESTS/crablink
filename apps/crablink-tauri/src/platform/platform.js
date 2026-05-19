/**
 * RO:WHAT — Names the frontend platform boundary for CrabLink Tauri.
 * RO:WHY — Keeps React portable across Tauri, Chrome, and test memory adapters.
 * RO:INTERACTS — tauriPlatform.js, future packages/crablink-platform.
 * RO:INVARIANTS — React calls adapters, not raw authority surfaces.
 * RO:SECURITY — no secrets or spend authority are stored here.
 */

export const PLATFORM_KIND = "tauri";
