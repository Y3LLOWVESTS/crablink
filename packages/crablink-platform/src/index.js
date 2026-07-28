/**
 * RO:WHAT — Public entry for CrabLink platform adapter contracts.
 * RO:WHY — Desktop, TV, future mobile, and tests need one portable port vocabulary.
 * RO:INTERACTS — diagnostics, gateway, settings, catalog, receipts, and explicit memory subpath adapters.
 * RO:INVARIANTS — contracts only; no Chrome, Tauri, DOM, network, storage, or backend authority.
 * RO:SECURITY — no fake balance, receipt, entitlement, ROC, wallet, ledger, or finality behavior.
 * RO:TEST — adapterContracts.test.mjs and platform boundary checkers.
 */

export const CRABLINK_PLATFORM_PACKAGE =
  '@crablink/platform';

export {
  createDiagnosticsPort,
} from './contracts/diagnosticsPort.js';

export {
  createGatewayHealthPort,
  createGatewayPort,
  createGatewayProfilePort,
} from './contracts/gatewayPort.js';

export {
  createReadonlySettingsPort,
  createSettingsPort,
} from './contracts/settingsPort.js';

export {
  createCatalogPort,
} from './contracts/catalogPort.js';

export {
  createReceiptsPort,
} from './contracts/receiptsPort.js';
