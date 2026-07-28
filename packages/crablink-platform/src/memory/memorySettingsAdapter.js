/**
 * RO:WHAT — Compatibility export for the deterministic memory settings adapter.
 * RO:WHY — Existing imports retain their reviewed path while family 5 centralizes behavior.
 * RO:INTERACTS — memoryAdapters.js and the shared settings port.
 * RO:INVARIANTS — no duplicate settings rules or ambient storage.
 * RO:SECURITY — test preferences only; no wallet, ledger, receipt, session, or ROC authority.
 * RO:TEST — memoryAdapters.test.mjs.
 */

export {
  createMemorySettingsAdapter,
} from './memoryAdapters.js';
