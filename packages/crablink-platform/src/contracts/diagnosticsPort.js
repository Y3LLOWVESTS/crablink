/**
 * RO:WHAT — Platform-neutral diagnostics adapter contract.
 * RO:WHY — Shared UI needs redacted host facts without importing platform APIs.
 * RO:INTERACTS — desktop diagnostics adapter, TV diagnostics adapter, memory adapter later.
 * RO:INVARIANTS — exactly getDiagnostics; construction performs no call or fallback.
 * RO:SECURITY — diagnostics are display facts, not node, wallet, ledger, or finality authority.
 * RO:TEST — adapterContracts.test.mjs.
 */

import {
  createMethodPort,
} from './portContract.js';

const METHODS = Object.freeze([
  'getDiagnostics',
]);

export function createDiagnosticsPort(
  methods,
) {
  return createMethodPort(
    'diagnostics port',
    methods,
    METHODS,
  );
}
