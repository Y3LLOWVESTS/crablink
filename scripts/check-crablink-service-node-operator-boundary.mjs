#!/usr/bin/env node
/**
 * RO:WHAT — Static Phase 21 boundary gate for CrabLink Service Node Operator Mode connection/status plumbing.
 * RO:WHY — Proves the first operator slice is optional, explicit, read-only, credential-redacted, backend-derived, and independent from daemon runtime.
 * RO:INTERACTS — Tauri operator command, command registry, invoke allowlist, frontend operator client, package scripts.
 * RO:INVARIANTS — no mutation routes; no credential persistence; remote requires HTTPS plus explicit bearer input; confirmed issuance evidence requires canonical ledger receipt flags.
 * RO:SECURITY — rejects shell/raw fetch, localStorage credential storage, policy/wallet/ledger mutation, and external-finality authority.
 * RO:TEST — node scripts/check-crablink-service-node-operator-boundary.mjs.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const files = Object.freeze({
  rust: 'apps/crablink-tauri/src-tauri/src/commands/operator_node.rs',
  rustRegistry: 'apps/crablink-tauri/src-tauri/src/commands/mod.rs',
  rustInvoke: 'apps/crablink-tauri/src-tauri/src/lib.rs',
  platform: 'apps/crablink-tauri/src/platform/tauriPlatform.js',
  client: 'apps/crablink-tauri/src/shared/api/serviceNodeOperatorClient.js',
  package: 'apps/crablink-tauri/package.json',
});

const failures = [];
const text = {};

for (const [key, rel] of Object.entries(files)) {
  const abs = path.join(ROOT, rel);

  if (!fs.existsSync(abs)) {
    failures.push(`missing Phase 21 operator boundary file: ${rel}`);
    text[key] = '';
    continue;
  }

  text[key] = fs.readFileSync(abs, 'utf8');
}

need(files.rust, text.rust, [
  'pub async fn service_node_operator_status',
  'Service Node Operator Mode is disabled by default',
  'remote Service Node operator connections require an explicit bearer credential',
  'remote Service Node connections require a non-loopback HTTPS URL',
  '.get(url)',
  'credential_persisted: false',
  'mutation_routes_exposed: false',
  'client_required_by_daemon: false',
  'daemon_started_by_client: false',
  'policy_mutation: false',
  'wallet_mutation: false',
  'ledger_mutation: false',
  'finality_authority: false',
  'if !pipeline.ledger_receipt_reported || !pipeline.confirmed_roc_reported',
  'receipts.settlement_status != "accepted"',
  'finality_status',
]);

need(files.rustRegistry, text.rustRegistry, ['pub mod operator_node;']);
need(files.rustInvoke, text.rustInvoke, [
  'commands::operator_node::service_node_operator_status',
]);
need(files.platform, text.platform, ["'service_node_operator_status'"]);
need(files.client, text.client, [
  "callTauri('service_node_operator_status'",
  'enabled: false',
  'credentialPersisted: false',
  'mutationRoutesExposed: false',
  'clientRequiredByDaemon: false',
  'daemonStartedByClient: false',
  'policyMutation: false',
  'walletMutation: false',
  'ledgerMutation: false',
  'finalityAuthority: false',
]);
need(files.package, text.package, [
  '"check:service-node-operator-boundary"',
  'check-crablink-service-node-operator-boundary.mjs',
]);

forbid(files.rust, text.rust, [
  '.post(',
  '.put(',
  '.patch(',
  '.delete(',
  'Command::new(',
  'std::process',
  '/api/v1/rewards/bind',
  '/api/v1/rewards/rotate',
  '/api/v1/persistence/approve',
  '/api/v1/persistence/reject',
  '/api/v1/moderation/prune',
  '/api/v1/reload',
  '/api/v1/shutdown',
]);

forbid(files.client, text.client, [
  'globalThis.localStorage',
  'globalThis.sessionStorage',
  '.setItem(',
  'saveSettings(',
  'writeSettings(',
  'fetch(',
  'gateway_request',
]);

const compactClient = text.client.toLowerCase().replace(/[^a-z0-9_]+/g, '');
for (const marker of [
  'walletmutationtrue',
  'ledgermutationtrue',
  'policymutationtrue',
  'finalityauthoritytrue',
  'mutationroutesexposedtrue',
  'clientrequiredbydaemontrue',
]) {
  if (compactClient.includes(marker)) {
    failures.push(`${files.client} contains forbidden authority marker: ${marker}`);
  }
}

function need(rel, body, snippets) {
  for (const snippet of snippets) {
    if (!body.includes(snippet)) {
      failures.push(`${rel} must include: ${snippet}`);
    }
  }
}

function forbid(rel, body, snippets) {
  for (const snippet of snippets) {
    if (body.includes(snippet)) {
      failures.push(`${rel} must not include: ${snippet}`);
    }
  }
}

if (failures.length) {
  console.error('CrabLink Service Node Operator Mode boundary check failed:');
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log('CrabLink Service Node Operator Mode boundary check passed.');
console.log('Optional local/remote GET-only status attachment, ephemeral credentials, daemon independence, and ledger-receipt-only confirmed issuance projection are wired.');
