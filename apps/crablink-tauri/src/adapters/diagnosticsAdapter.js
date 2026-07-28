/**
 * RO:WHAT — Desktop diagnostics adapter implementing the shared diagnostics port.
 * RO:WHY — Desktop React should consume a narrow contract instead of raw command names.
 * RO:INTERACTS — @crablink/platform diagnostics contract and app_diagnostics.
 * RO:INVARIANTS — fixed command only; display diagnostics do not create backend truth.
 * RO:SECURITY — no dynamic command selection, secrets, wallet, ledger, or finality authority.
 * RO:TEST — check-crablink-platform-contracts-boundary.mjs.
 */

import {
  createDiagnosticsPort,
} from '../../../../packages/crablink-platform/src/index.js';

import {
  callTauri,
} from '../platform/tauriPlatform.js';

export function getDiagnostics() {
  return callTauri(
    'app_diagnostics',
  );
}

export const diagnosticsPort =
  createDiagnosticsPort({
    getDiagnostics,
  });
