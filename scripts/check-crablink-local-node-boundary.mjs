#!/usr/bin/env node
/**
 * RO:WHAT — BUILD_PLAN_Z Phase 6D CrabLink local-node boundary scanner.
 * RO:WHY  — Keep CrabLink's optional micronode attachment honest:
 *           disabled-by-default, loopback-only, parked lifecycle control,
 *           and no wallet/ledger/ROC authority.
 * RO:INVARIANTS —
 *   - Local node integration is optional and explicit.
 *   - Default local node URL is loopback.
 *   - Start/stop/restart commands exist but remain parked until a real
 *     supervisor is intentionally implemented.
 *   - CrabLink may display/probe local-node posture, but must not claim
 *     confirmed ROC, wallet mutation, ledger mutation, receipts, settlement,
 *     validator authority, or bridge authority.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

const files = {
  packageJson: 'apps/crablink-tauri/package.json',
  tauriCommandsMod: 'apps/crablink-tauri/src-tauri/src/commands/mod.rs',
  tauriLib: 'apps/crablink-tauri/src-tauri/src/lib.rs',
  localNodeRust: 'apps/crablink-tauri/src-tauri/src/commands/local_node.rs',
  tauriPlatform: 'apps/crablink-tauri/src/platform/tauriPlatform.js',
  localNodeClient: 'apps/crablink-tauri/src/shared/api/localNodeClient.js',
  storage: 'apps/crablink-tauri/src/storage.js',
  appContext: 'apps/crablink-tauri/src/app/appContext.js',
  topBar: 'apps/crablink-tauri/src/app/shell/TopBar.jsx',
};

for (const [label, file] of Object.entries(files)) {
  if (!exists(file)) failures.push(`${label} missing: ${file}`);
}

const pkg = read(files.packageJson);
const tauriCommandsMod = read(files.tauriCommandsMod);
const tauriLib = read(files.tauriLib);
const localNodeRust = read(files.localNodeRust);
const localNodeRustCode = stripRustComments(localNodeRust);
const tauriPlatform = read(files.tauriPlatform);
const localNodeClient = read(files.localNodeClient);
const localNodeClientCode = stripJsComments(localNodeClient);
const storage = read(files.storage);
const appContext = read(files.appContext);
const topBar = read(files.topBar);

need(files.packageJson, pkg, [
  '"check:local-node-boundary"',
  'check-crablink-local-node-boundary.mjs',
]);

const checkScript = packageScript(pkg, 'check');
if (!checkScript.includes('check:local-node-boundary')) {
  failures.push('apps/crablink-tauri/package.json check script must include check:local-node-boundary');
}

need(files.tauriCommandsMod, tauriCommandsMod, [
  'pub mod local_node;',
]);

need(files.tauriLib, tauriLib, [
  'commands::local_node::local_node_status',
  'commands::local_node::local_node_start',
  'commands::local_node::local_node_stop',
  'commands::local_node::local_node_restart',
]);

need(files.localNodeRust, localNodeRust, [
  'DEFAULT_LOCAL_NODE_URL: &str = "http://127.0.0.1:5310"',
  'local_node_status',
  'local_node_start',
  'local_node_stop',
  'local_node_restart',
  'normalize_local_node_base_url',
  'local node URL must be an explicit loopback http URL',
  'supervisor_enabled: false',
  'sidecar_enabled: false',
  'start_supported: false',
  'stop_supported: false',
  'restart_supported: false',
  'wallet_mutation: false',
  'ledger_mutation: false',
  'wallet_execution_participant: false',
  'ledger_replay_enabled: false',
  'confirmed_roc_minor_units: None',
  'wallet_ledger_receipt_only',
  'local node supervisor is parked',
  'sidecar supervision is not implemented yet',
]);

need(files.tauriPlatform, tauriPlatform, [
  "'local_node_status'",
  "'local_node_start'",
  "'local_node_stop'",
  "'local_node_restart'",
]);

need(files.localNodeClient, localNodeClient, [
  'DEFAULT_LOCAL_NODE_URL',
  "http://127.0.0.1:5310",
  "callTauri('local_node_status'",
  "callTauri('local_node_start'",
  "callTauri('local_node_stop'",
  "callTauri('local_node_restart'",
  'disabledFallback',
  'supervisorEnabled: false',
  'sidecarEnabled: false',
  'startSupported: false',
  'stopSupported: false',
  'restartSupported: false',
  'confirmedRocMinorUnits: null',
  "confirmedRocSource: 'wallet_ledger_receipt_only'",
  'walletMutation: false',
  'ledgerMutation: false',
  'walletExecutionParticipant: false',
  'ledgerReplayEnabled: false',
]);

need(files.storage, storage, [
  'localNodeEnabled: false',
  "localNodeUrl: 'http://127.0.0.1:5310'",
  "localNodeMode: 'disabled'",
]);

need(files.appContext, appContext, [
  'createLocalNodeClient',
  'INITIAL_LOCAL_NODE_STATUS',
  'localNodeStatus',
  'checkLocalNode',
  'startLocalNode',
  'stopLocalNode',
  'restartLocalNode',
  'normalizeLocalNodeStatus',
  'no ROC claim',
]);

need(files.topBar, topBar, [
  'localNodeState',
  'localNodeLabel',
  'context.checkLocalNode',
  'Node off',
  'Local node boundary',
]);

// Positive privacy/economic posture checks.
// Keep these as direct phrase checks instead of brittle formatting regexes.
// Rust code may use `if !enabled { ... }` and multiline `||` URL guards.
for (const loopbackPhrase of [
  'clean.starts_with("http://127.0.0.1:")',
  'clean.starts_with("http://localhost:")',
  'clean.starts_with("http://[::1]:")',
]) {
  if (!localNodeRust.includes(loopbackPhrase)) {
    failures.push(`local_node.rs must allow explicit loopback URL form: ${loopbackPhrase}`);
  }
}

for (const disabledPhrase of [
  'if !enabled',
  'local node disabled by settings',
]) {
  if (!localNodeRust.includes(disabledPhrase)) {
    failures.push(`local_node_status must preserve disabled-by-default guard: ${disabledPhrase}`);
  }
}

if (!/action_accepted\s*=\s*false/.test(localNodeRust) && !/action_accepted:\s*false/.test(localNodeRust)) {
  failures.push('local_node start/stop/restart must not accept lifecycle actions yet');
}

if (!/state\s*===\s*'online'[\s\S]*state\s*===\s*'disabled'/.test(appContext)) {
  failures.push('appContext must normalize local-node lifecycle states for display');
}

// Negative authority creep checks. Strip comments first so safety prose does not false-positive.
reject(files.localNodeRust, localNodeRustCode, [
  /\bCommand::new\b/,
  /\bstd::process::Command\b/,
  /\bspawn\s*\(/,
  /\bkill\s*\(/,
  /\bledger_mutation\s*:\s*true\b/,
  /\bwallet_mutation\s*:\s*true\b/,
  /\bwallet_execution_participant\s*:\s*true\b/,
  /\bledger_replay_enabled\s*:\s*true\b/,
  /\bconfirmed_roc_minor_units\s*:\s*Some\b/,
  /\bstart_supported\s*:\s*true\b/,
  /\bstop_supported\s*:\s*true\b/,
  /\brestart_supported\s*:\s*true\b/,
  /\baction_accepted\s*:\s*true\b/,
  /\bsolana[_A-Za-z0-9]*\s*[:=]\s*true\b/i,
  /\brox[_A-Za-z0-9]*\s*[:=]\s*true\b/i,
  /\bbridge[_A-Za-z0-9]*\s*[:=]\s*true\b/i,
  /\bsettlement[_A-Za-z0-9]*\s*[:=]\s*true\b/i,
  /\bvalidator[_A-Za-z0-9]*\s*[:=]\s*true\b/i,
]);

reject(files.localNodeClient, localNodeClientCode, [
  /\bconfirmedRocMinorUnits\s*:\s*['"`]\d+/,
  /\bwalletMutation\s*:\s*true\b/,
  /\bledgerMutation\s*:\s*true\b/,
  /\bwalletExecutionParticipant\s*:\s*true\b/,
  /\bledgerReplayEnabled\s*:\s*true\b/,
  /\bstartSupported\s*:\s*true\b/,
  /\bstopSupported\s*:\s*true\b/,
  /\brestartSupported\s*:\s*true\b/,
  /\bactionAccepted\s*:\s*true\b/,
  /\bsolana[A-Za-z0-9_]*\s*[:=]\s*true\b/i,
  /\brox[A-Za-z0-9_]*\s*[:=]\s*true\b/i,
  /\bbridge[A-Za-z0-9_]*\s*[:=]\s*true\b/i,
  /\bsettlement[A-Za-z0-9_]*\s*[:=]\s*true\b/i,
  /\bvalidator[A-Za-z0-9_]*\s*[:=]\s*true\b/i,
]);

finish('CrabLink local-node boundary check passed.');

function exists(file) {
  return fs.existsSync(path.join(ROOT, file));
}

function read(file) {
  const full = path.join(ROOT, file);
  return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : '';
}

function need(file, text, phrases) {
  for (const phrase of phrases) {
    if (!text.includes(phrase)) failures.push(`${file} must include: ${phrase}`);
  }
}

function reject(file, text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) failures.push(`${file} must not match authority pattern: ${pattern}`);
  }
}

function packageScript(pkgText, scriptName) {
  try {
    const parsed = JSON.parse(pkgText);
    return String(parsed?.scripts?.[scriptName] || '');
  } catch {
    failures.push('apps/crablink-tauri/package.json must be valid JSON');
    return '';
  }
}

function stripRustComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/^\s*\/\/!.*$/gm, '');
}

function stripJsComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

function finish(ok) {
  if (failures.length) {
    console.error('CrabLink local-node boundary check failed:');
    for (const failure of failures) console.error(` - ${failure}`);
    process.exit(1);
  }

  console.log(ok);
}
