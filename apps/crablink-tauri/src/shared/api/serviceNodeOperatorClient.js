/**
 * RO:WHAT — Frontend client for optional CrabLink Service Node Operator Mode.
 * RO:WHY — BUILD_PLAN_Z Phase 21 needs explicit local/remote status attachment without giving React daemon, policy, wallet, ledger, registry, quorum, or finality authority.
 * RO:INTERACTS — Tauri `service_node_operator_status`; canonical macronode status projection.
 * RO:INVARIANTS — disabled by default; connection mode is explicit; remote credentials are caller-supplied and ephemeral; status observation is read-only.
 * RO:SECURITY — no localStorage/settings persistence for admin credentials; no mutation commands; no raw endpoint fetch from React.
 * RO:TEST — scripts/check-crablink-service-node-operator-boundary.mjs.
 */

import { callTauri } from '../../platform/tauriPlatform.js';

const DEFAULT_SERVICE_NODE_URL = 'http://127.0.0.1:8080';

export function createServiceNodeOperatorClient(options = {}) {
  const connectionMode = normalizeConnectionMode(options.connectionMode);
  const baseUrl = normalizeServiceNodeUrl(options.baseUrl || DEFAULT_SERVICE_NODE_URL);
  const enabled = options.enabled === true;
  const adminToken = cleanEphemeralCredential(options.adminToken);

  function request() {
    return {
      enabled,
      connectionMode,
      baseUrl,
      adminToken: adminToken || null,
    };
  }

  return Object.freeze({
    async getStatus() {
      if (!canUseTauriInvoke()) {
        return disabledFallback(
          connectionMode,
          baseUrl,
          'Service Node Operator Mode is unavailable outside the Tauri runtime',
        );
      }

      return callTauri('service_node_operator_status', { request: request() });
    },
  });
}

function disabledFallback(connectionMode, baseUrl, reason) {
  return {
    schema: 'crablink.service_node.operator_status.v1',
    enabled: false,
    configured: false,
    connectionMode,
    baseUrl,
    connectionState: 'disabled',
    reason,
    checkedAtMs: Date.now(),

    credentialSupplied: false,
    credentialPersisted: false,
    authorizationMode: 'disabled',

    health: disabledProbe('/healthz'),
    ready: disabledProbe('/readyz'),
    status: disabledProbe('/api/v1/status'),
    serviceNode: null,

    readOnly: true,
    mutationRoutesExposed: false,
    clientRequiredByDaemon: false,
    daemonStartedByClient: false,
    policyMutation: false,
    lifecycleMutation: false,
    walletMutation: false,
    ledgerMutation: false,
    registryMutation: false,
    quorumMutation: false,
    finalityAuthority: false,
  };
}

function disabledProbe(route) {
  return {
    route,
    ok: false,
    status: null,
    errorCode: 'operator_mode_disabled',
  };
}

function normalizeConnectionMode(value) {
  return String(value || 'local').trim().toLowerCase() === 'remote'
    ? 'remote'
    : 'local';
}

function normalizeServiceNodeUrl(value) {
  return String(value || DEFAULT_SERVICE_NODE_URL).trim().replace(/\/+$/, '');
}

function cleanEphemeralCredential(value) {
  const clean = String(value || '').trim();

  if (!clean) {
    return '';
  }

  if (/[\u0000-\u001f\u007f]/.test(clean)) {
    throw new Error('Service Node admin credential contains control characters.');
  }

  if (clean.length > 4096) {
    throw new Error('Service Node admin credential is too long.');
  }

  return clean;
}

function canUseTauriInvoke() {
  return Boolean(
    globalThis.__TAURI__ ||
      globalThis.__TAURI_INTERNALS__ ||
      globalThis.window?.__TAURI__ ||
      globalThis.window?.__TAURI_INTERNALS__,
  );
}
