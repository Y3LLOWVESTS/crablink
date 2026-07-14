/**
 * RO:WHAT — Pure in-memory model for optional CrabLink Service Node Operator Mode.
 * RO:WHY — BUILD_PLAN_Z Phase 21; keeps UI configuration separate from daemon and economic truth.
 * RO:INTERACTS — ServiceNodeOperatorPage.jsx and Tauri service_node_operator_status.
 * RO:INVARIANTS — disabled by default; credentials never persist; only canonical receipt evidence is confirmed ROC.
 * RO:SECURITY — no storage APIs, token rendering, mutation commands, or client-side wallet/ledger truth.
 * RO:TEST — check-crablink-service-node-operator-ui-boundary.mjs.
 */

export const DEFAULT_OPERATOR_CONFIG = Object.freeze({
  enabled: false,
  connectionMode: 'local',
  baseUrl: 'http://127.0.0.1:8080',
  adminToken: '',
});

export const INITIAL_OPERATOR_STATUS = Object.freeze({
  state: 'disabled',
  label: 'Service Node Operator Mode disabled',
  checkedAt: '',
  summary: null,
  confirmedIssuance: null,
  error: null,
});

export function normalizeOperatorConfig(value = {}) {
  const connectionMode = value.connectionMode === 'remote' ? 'remote' : 'local';
  const fallback = connectionMode === 'remote'
    ? 'https://service-node.example'
    : DEFAULT_OPERATOR_CONFIG.baseUrl;

  return {
    enabled: value.enabled === true,
    connectionMode,
    baseUrl: String(value.baseUrl || fallback).trim().replace(/\/+$/, ''),
    adminToken: String(value.adminToken || '').replace(/[\r\n\t\0]/g, '').trim(),
  };
}

export function normalizeOperatorStatus(data) {
  const raw = isObject(data) ? data : {};
  const enabled = read(raw, 'enabled') === true;
  const connectionState = String(
    read(raw, 'connectionState', 'connection_state') || '',
  ).trim();

  const summary = objectValue(
    read(
      raw,
      'summary',
      'canonicalSummary',
      'canonical_summary',
      'serviceNodeSummary',
      'service_node_summary',
    ),
  );

  const confirmedIssuance = objectValue(
    read(
      raw,
      'confirmedIssuanceEvidence',
      'confirmed_issuance_evidence',
      'confirmedIssuance',
      'confirmed_issuance',
    ),
  );

  const checkedAtMs = numberValue(
    read(raw, 'checkedAtMs', 'checked_at_ms'),
  );

  const state = !enabled || connectionState === 'disabled'
    ? 'disabled'
    : connectionState === 'connected'
      ? 'online'
      : connectionState === 'unavailable'
        ? 'offline'
        : 'degraded';

  const reason = String(
    read(raw, 'reason') || defaultReason(state),
  ).trim();

  return {
    state,
    label: `${titleFor(state)} · ${reason}`,
    checkedAt:
      checkedAtMs == null
        ? new Date().toISOString()
        : new Date(checkedAtMs).toISOString(),
    summary,
    confirmedIssuance,
    error: null,
  };
}

export function summaryValue(summary, ...keys) {
  return read(summary, ...keys);
}

export function hasConfirmedIssuance(status) {
  return isObject(status?.confirmedIssuance);
}

function read(source, ...keys) {
  if (!isObject(source)) {
    return null;
  }

  for (const key of keys.flat()) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      return source[key];
    }
  }

  return null;
}

function isObject(value) {
  return Boolean(
    value &&
      typeof value === 'object' &&
      !Array.isArray(value),
  );
}

function objectValue(value) {
  return isObject(value) ? value : null;
}

function numberValue(value) {
  if (value == null || value === '') {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function titleFor(state) {
  if (state === 'online') {
    return 'Service Node connected';
  }

  if (state === 'offline') {
    return 'Service Node unavailable';
  }

  if (state === 'disabled') {
    return 'Operator Mode disabled';
  }

  return 'Service Node status degraded';
}

function defaultReason(state) {
  if (state === 'disabled') {
    return 'normal CrabLink use remains independent';
  }

  if (state === 'offline') {
    return 'operator connection failure affects this page only';
  }

  return 'canonical backend status is incomplete';
}
