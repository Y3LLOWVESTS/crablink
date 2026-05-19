/**
 * RO:WHAT — Thin Tauri invoke adapter for the scaffold app.
 * RO:WHY — Keeps direct invoke usage centralized until package adapters are migrated.
 * RO:INTERACTS — @tauri-apps/api/core, Tauri Rust commands.
 * RO:INVARIANTS — typed command names only; no raw shell/eval/native execution.
 * RO:SECURITY — command results must be redacted before display.
 */

import { invoke } from "@tauri-apps/api/core";

export function callTauri(command, args = {}) {
  return invoke(command, args);
}
