/**
 * RO:WHAT — Public entry for deterministic CrabLink memory adapters.
 * RO:WHY — Tests and static previews need one explicit test-only adapter surface.
 * RO:INTERACTS — memory adapter factories and immutable snapshot helpers.
 * RO:INVARIANTS — no production app imports and no platform API dependencies.
 * RO:SECURITY — defaults fail closed and cannot invent backend authority.
 * RO:TEST — memoryAdapters.test.mjs and the platform memory boundary.
 */

export {
  createMemoryDiagnosticsAdapter,
  createMemoryGatewayProfileAdapter,
  createMemoryReceiptDisplayAdapter,
  createMemorySettingsAdapter,
} from './memoryAdapters.js';

export {
  cloneMemoryValue,
  freezeMemorySnapshot,
} from './memorySnapshot.js';

export {
  createMemoryPublicationAdapter,
} from './publicationMemoryAdapter.js';
