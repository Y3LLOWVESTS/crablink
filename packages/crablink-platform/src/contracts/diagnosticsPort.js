/**
 * RO:WHAT — Diagnostics adapter contract.
 * RO:WHY — Shared UI can display runtime status without leaking secrets.
 * RO:INTERACTS — Tauri diagnostics command, Chrome health proof.
 * RO:INVARIANTS — redacted display-only diagnostics.
 */

export function createDiagnosticsPort(methods) {
  const required = ["getDiagnostics"];

  for (const name of required) {
    if (typeof methods?.[name] !== "function") {
      throw new TypeError(`diagnostics port missing ${name}`);
    }
  }

  return Object.freeze({ ...methods });
}
