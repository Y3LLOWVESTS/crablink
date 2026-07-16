#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(
  fileURLToPath(import.meta.url),
);

const root = path.resolve(scriptDir, '..');

const paths = {
  model:
    'apps/crablink-tv/src/pairing/tvPairingViewModel.js',
  tests:
    'apps/crablink-tv/src/pairing/tvPairingViewModel.test.mjs',
  panel:
    'apps/crablink-tv/src/pairing/TvPairingPanel.jsx',
  app:
    'apps/crablink-tv/src/app/TvApp.jsx',
  gateway:
    'apps/crablink-tv/src-tauri/src/commands/gateway.rs',
  pairing:
    'apps/crablink-tv/src-tauri/src/commands/pairing.rs',
  commands:
    'apps/crablink-tv/src-tauri/src/commands/mod.rs',
  lib:
    'apps/crablink-tv/src-tauri/src/lib.rs',
  cargo:
    'apps/crablink-tv/src-tauri/Cargo.toml',
  tvPackage:
    'apps/crablink-tv/package.json',
  rootPackage:
    'package.json',
};

function read(relativePath) {
  const absolutePath =
    path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(
      `Missing TV pairing source: ${relativePath}`,
    );
  }

  return fs.readFileSync(
    absolutePath,
    'utf8',
  );
}

const model = read(paths.model);
const tests = read(paths.tests);
const panel = read(paths.panel);
const app = read(paths.app);
const gateway = read(paths.gateway);
const pairing = read(paths.pairing);
const commands = read(paths.commands);
const lib = read(paths.lib);
const cargo = read(paths.cargo);

const tvPackage = JSON.parse(
  read(paths.tvPackage),
);

const rootPackage = JSON.parse(
  read(paths.rootPackage),
);

for (const fragment of [
  'export function normalizeTvGatewayProfile',
  'export function normalizeTvPairingStatus',
  'export function projectTvPairingView',
  "'blocked_unconfigured'",
  "'ready_to_begin'",
  "'waiting'",
  "'paired'",
  '/^[A-Z2-9]{6}$/',
  'if (!pairing.sessionPresent)',
  'A paired label without native device-bound session truth is not accepted.',
]) {
  if (!model.includes(fragment)) {
    throw new Error(
      `TV pairing projection is missing: ${fragment}`,
    );
  }
}

for (const fragment of [
  'unconfigured gateway cannot invent a pairing code',
  'reviewed gateway can become ready without claiming pairing',
  'waiting state requires a strict code and expiry',
  'paired label without native session truth fails closed',
  'normalizers discard credentials and unknown secret fields',
]) {
  if (!tests.includes(fragment)) {
    throw new Error(
      `TV pairing tests are missing: ${fragment}`,
    );
  }
}

for (const fragment of [
  "invoke('tv_gateway_profile')",
  "invoke('tv_pairing_status')",
  'No short code or QR challenge has been issued.',
  'Review pairing security',
  'No pairing state was created.',
  'companion',
]) {
  if (!panel.includes(fragment)) {
    throw new Error(
      `TV pairing panel is missing: ${fragment}`,
    );
  }
}

for (const fragment of [
  "id: 'pair'",
  "activeSectionId === 'pair'",
  '<TvPairingPanel',
  'No challenge, approval, or session',
]) {
  if (!app.includes(fragment)) {
    throw new Error(
      `TV shell pairing integration is missing: ${fragment}`,
    );
  }
}

for (const fragment of [
  'pub fn tv_gateway_profile()',
  '"release-https"',
  '"development-lan"',
  '"release_https_required"',
  '"development_lan_host_required"',
  'gateway_credentials_forbidden',
  'parsed.origin().ascii_serialization()',
  '.clamp(MIN_TIMEOUT_MS, MAX_TIMEOUT_MS)',
]) {
  if (!gateway.includes(fragment)) {
    throw new Error(
      `Native gateway review is missing: ${fragment}`,
    );
  }
}

for (const fragment of [
  'pub fn tv_pairing_status()',
  '"blocked_unconfigured"',
  '"blocked_invalid_gateway"',
  '"ready_to_begin"',
  'pairing_code: None',
  'session_present: false',
  '"companion-crablink-required"',
]) {
  if (!pairing.includes(fragment)) {
    throw new Error(
      `Native pairing readiness is missing: ${fragment}`,
    );
  }
}

for (const fragment of [
  'pub(crate) mod gateway;',
  'pub(crate) mod pairing;',
]) {
  if (!commands.includes(fragment)) {
    throw new Error(
      `TV command registry is missing: ${fragment}`,
    );
  }
}

for (const fragment of [
  'commands::gateway::tv_gateway_profile',
  'commands::pairing::tv_pairing_status',
]) {
  if (!lib.includes(fragment)) {
    throw new Error(
      `TV invoke handler is missing: ${fragment}`,
    );
  }
}

if (!cargo.includes('url = "2"')) {
  throw new Error(
    'TV Rust host is missing direct URL validation support.',
  );
}

const combined = [
  model,
  panel,
  gateway,
  pairing,
  app,
].join('\n');

for (const forbidden of [
  'Math.random(',
  'crypto.randomUUID(',
  'localStorage.setItem("pairing',
  'sessionStorage.setItem("pairing',
  "fetch(",
  "invoke('tv_pairing_begin')",
  "invoke('wallet",
  "invoke('ledger",
  "invoke('reward",
  'seedPhrase',
  'privateKey',
  'walletPrivateKey',
]) {
  if (combined.includes(forbidden)) {
    throw new Error(
      `Forbidden TV pairing behavior found: ${forbidden}`,
    );
  }
}

const tvScripts =
  tvPackage.scripts ?? {};

const rootScripts =
  rootPackage.scripts ?? {};

if (
  tvScripts['test:pairing'] !==
  'node --test src/pairing/tvPairingViewModel.test.mjs'
) {
  throw new Error(
    'TV package test:pairing command is missing or incorrect.',
  );
}

if (
  tvScripts['check:pairing'] !==
  'node ../../scripts/check-crablink-tv-pairing-boundary.mjs'
) {
  throw new Error(
    'TV package check:pairing command is missing or incorrect.',
  );
}

if (
  rootScripts['tv:pairing:test'] !==
  'npm --prefix apps/crablink-tv run test:pairing'
) {
  throw new Error(
    'Root tv:pairing:test command is missing or incorrect.',
  );
}

if (
  rootScripts['tv:pairing:check'] !==
  'node scripts/check-crablink-tv-pairing-boundary.mjs'
) {
  throw new Error(
    'Root tv:pairing:check command is missing or incorrect.',
  );
}

console.log(
  'CrabLink TV pairing boundary passed.',
);

console.log(
  'Gateway profiles: release HTTPS or explicit private development LAN.',
);

console.log(
  'Pairing state: read-only readiness; no locally generated challenge.',
);

console.log(
  'Approval authority: trusted desktop or mobile CrabLink companion.',
);

console.log(
  'Session, wallet, reward, ROC, and ledger authority: absent.',
);
