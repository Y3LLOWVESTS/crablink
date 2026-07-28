/**
 * RO:WHAT — Desktop gateway adapter implementing the shared gateway request port.
 * RO:WHY — Desktop React needs reviewed gateway operations without raw command naming.
 * RO:INTERACTS — @crablink/platform and fixed desktop Tauri gateway commands.
 * RO:INVARIANTS — health, ready, and crab resolution only; no direct service or arbitrary URL calls.
 * RO:SECURITY — no wallet, ledger, receipt, entitlement, or finality authority.
 * RO:TEST — check-crablink-platform-contracts-boundary.mjs.
 */

import {
  createGatewayPort,
} from '../../../../packages/crablink-platform/src/index.js';

import {
  callTauri,
} from '../platform/tauriPlatform.js';

export function healthCheckGateway() {
  return callTauri(
    'health_check_gateway',
  );
}

export function readyCheckGateway() {
  return callTauri(
    'ready_check_gateway',
  );
}

export function resolveCrabUrlGateway(
  crabUrl,
) {
  return callTauri(
    'resolve_crab_url_gateway',
    {
      crabUrl,
    },
  );
}

export const gatewayPort =
  createGatewayPort({
    health: healthCheckGateway,
    ready: readyCheckGateway,
    resolveCrabUrl:
      resolveCrabUrlGateway,
  });
