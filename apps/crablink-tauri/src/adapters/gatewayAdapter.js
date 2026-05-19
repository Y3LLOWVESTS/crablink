/**
 * RO:WHAT — Frontend gateway adapter placeholder for Tauri.
 * RO:WHY — Keeps route calls gateway-first during migration.
 * RO:INTERACTS — Tauri commands health_check_gateway and resolve_crab_url_gateway.
 * RO:INVARIANTS — no direct wallet, ledger, storage, index, or omnigate calls from React.
 */

import { callTauri } from "../platform/tauriPlatform.js";

export function healthCheckGateway() {
  return callTauri("health_check_gateway");
}

export function resolveCrabUrlGateway(crabUrl) {
  return callTauri("resolve_crab_url_gateway", { crabUrl });
}
