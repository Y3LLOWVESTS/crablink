/**
 * RO:WHAT — Frontend client for the optional local user-node boundary.
 * RO:WHY  — Lets CrabLink display/probe a loopback micronode without making
 *           React own services or backend truth.
 * RO:INVARIANTS — disabled by default; no fake ROC; no wallet/ledger mutation;
 *                 start/stop/restart are parked until Rust-side supervision exists.
 * RO:SECURITY — Tauri command allowlist mediates all native/local-node access.
 */

import { callTauri } from '../../platform/tauriPlatform.js';

const DEFAULT_LOCAL_NODE_URL = 'http://127.0.0.1:5310';

export function createLocalNodeClient(settings = {}) {
  const request = () => ({
    enabled: Boolean(settings.localNodeEnabled),
    baseUrl: normalizeLocalNodeUrl(settings.localNodeUrl || DEFAULT_LOCAL_NODE_URL),
  });

  return {
    async getStatus() {
      if (!canUseTauriInvoke()) {
        return disabledFallback('local node unavailable outside Tauri runtime');
      }

      return callTauri('local_node_status', { request: request() });
    },

    async start() {
      if (!canUseTauriInvoke()) {
        return disabledFallback('local node start unavailable outside Tauri runtime', 'start');
      }

      return callTauri('local_node_start', { request: request() });
    },

    async stop() {
      if (!canUseTauriInvoke()) {
        return disabledFallback('local node stop unavailable outside Tauri runtime', 'stop');
      }

      return callTauri('local_node_stop', { request: request() });
    },

    async restart() {
      if (!canUseTauriInvoke()) {
        return disabledFallback('local node restart unavailable outside Tauri runtime', 'restart');
      }

      return callTauri('local_node_restart', { request: request() });
    },
  };
}

function disabledFallback(reason, action = 'status') {
  return {
    schema: 'crablink.local_node.status.v1',
    enabled: false,
    configured: false,
    mode: 'disabled',
    baseUrl: DEFAULT_LOCAL_NODE_URL,
    lifecycleState: 'disabled',
    reason,
    checkedAtMs: Date.now(),
    supervisorEnabled: false,
    sidecarEnabled: false,
    startSupported: false,
    stopSupported: false,
    restartSupported: false,
    action,
    actionAccepted: false,
    privacyMode: true,
    publicInboundEnabled: false,
    peerIpDisplay: 'forbidden',
    verificationEnabled: false,
    economicReplayEnabled: false,
    verificationQueueStatus: 'disabled',
    economicReplayWorkerStatus: 'disabled',
    pendingEvidenceItems: 0,
    confirmedRocMinorUnits: null,
    confirmedRocSource: 'wallet_ledger_receipt_only',
    walletMutation: false,
    ledgerMutation: false,
    walletExecutionParticipant: false,
    ledgerReplayEnabled: false,
    contentServingEnabled: false,
  };
}

function normalizeLocalNodeUrl(value) {
  return String(value || DEFAULT_LOCAL_NODE_URL).trim().replace(/\/+$/, '');
}

function canUseTauriInvoke() {
  return Boolean(
    globalThis.__TAURI__ ||
      globalThis.__TAURI_INTERNALS__ ||
      globalThis.window?.__TAURI__ ||
      globalThis.window?.__TAURI_INTERNALS__,
  );
}
