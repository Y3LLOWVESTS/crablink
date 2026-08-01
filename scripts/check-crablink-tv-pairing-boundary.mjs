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
  interaction:
    'apps/crablink-tv/src/pairing/tvPairingBeginInteraction.js',
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
  pairingBegin:
    'apps/crablink-tv/src-tauri/src/commands/pairing_begin.rs',
  nativePairingDto:
    'crates/crablink-native-core/src/pairing_dto.rs',
  nativeSettingsProfile:
    'crates/crablink-native-core/src/settings_profile.rs',
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
const interaction = read(paths.interaction);
const tests = read(paths.tests);
const panel = read(paths.panel);
const app = read(paths.app);
const gateway = read(paths.gateway);
const pairing = read(paths.pairing);
const pairingBegin = read(paths.pairingBegin);
const nativePairingDto = read(paths.nativePairingDto);
const nativeSettingsProfile =
  read(paths.nativeSettingsProfile);
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
  'export function normalizeTvPairingBeginResponse',
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
  'export function normalizeTvDeviceName',
  'export function normalizeTvPairingBeginFailure',
  'export function projectTvPairingBeginSuccess',
  'MAX_DEVICE_NAME_BYTES = 64',
  'new TextEncoder()',
  'normalizeTvPairingBeginResponse',
  'sessionPresent: false',
]) {
  if (!interaction.includes(fragment)) {
    throw new Error(
      `TV pairing interaction is missing: ${fragment}`,
    );
  }
}

for (const fragment of [
  'unconfigured gateway cannot invent a pairing code',
  'reviewed gateway can become ready without claiming pairing',
  'waiting state requires a strict code and expiry',
  'pairing begin response accepts bounded waiting truth only',
  'malformed pairing begin response fails closed',
  'pairing device name is trimmed and byte bounded',
  'pairing begin success projects waiting without session',
  'pairing begin failure discards unknown fields',
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
  "'tv_pairing_begin'",
  'deviceName:',
  'beginInFlightRef.current',
  'disabled={!canBegin}',
  'Request pairing code',
  "beginState.phase === 'waiting'",
  'No short code or QR challenge has been issued.',
  'Review pairing security',
  'No pairing state was created.',
  'Passport TV authorization',
  'root-admin device',
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
  'normalize_request_timeout_ms',
  'pub struct TvGatewayHealthRequest',
  'gateway_health_request_for_profile',
  'review_gateway_health_response',
  'MAX_HEALTH_RESPONSE_BYTES',
]) {
  if (!gateway.includes(fragment)) {
    throw new Error(
      `Native gateway review is missing: ${fragment}`,
    );
  }
}

for (const fragment of [
  'pub const DEFAULT_REQUEST_TIMEOUT_MS',
  'pub const MIN_REQUEST_TIMEOUT_MS',
  'pub const MAX_REQUEST_TIMEOUT_MS',
  'pub fn normalize_request_timeout_ms',
  '.clamp(MIN_REQUEST_TIMEOUT_MS, MAX_REQUEST_TIMEOUT_MS)',
  'request_timeout_defaults_and_clamps',
]) {
  if (!nativeSettingsProfile.includes(fragment)) {
    throw new Error(
      `Shared timeout validation is missing: ${fragment}`,
    );
  }
}

for (const forbidden of [
  'fn normalize_timeout',
  'const DEFAULT_TIMEOUT_MS',
  'const MIN_TIMEOUT_MS',
  'const MAX_TIMEOUT_MS',
  '.clamp(MIN_TIMEOUT_MS, MAX_TIMEOUT_MS)',
]) {
  if (gateway.includes(forbidden)) {
    throw new Error(
      `TV gateway still owns timeout validation: ${forbidden}`,
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
  '"root-admin-device-required"',
  'pub struct TvPairingBeginRequest',
  'pub struct TvPairingBeginResponse',
  'review_pairing_begin_response',
  'deny_unknown_fields',
  'MAX_PAIRING_BEGIN_RESPONSE_BYTES',
  'INITIAL_TV_SESSION_SCOPES',
]) {
  if (!pairing.includes(fragment)) {
    throw new Error(
      `Native pairing readiness is missing: ${fragment}`,
    );
  }
}

for (const fragment of [
  'pub async fn tv_pairing_begin',
  'perform_pairing_begin',
  'pairing_begin_request_for_gateway',
  'review_pairing_begin_response',
  'MAX_PAIRING_BEGIN_RESPONSE_BYTES',
  'SystemTime::now()',
  '.post(url)',
  '.json(&request)',
  'reqwest::redirect::Policy::none()',
  '.no_proxy()',
  'response.chunk()',
  'local_pairing_begin_posts_native_request_and_accepts_matching_challenge',
  'declared_oversize_pairing_response_is_rejected',
  'transient_pairing_status_is_retryable',
]) {
  if (!pairingBegin.includes(fragment)) {
    throw new Error(
      `Native pairing-begin operation is missing: ${fragment}`,
    );
  }
}

for (const fragment of [
  'pub struct TvPairingBeginRequest',
  'pub struct TvPairingBeginResponse',
  'pub struct TvPairingContractError',
  'deny_unknown_fields',
  'pub fn build_pairing_begin_request',
  'pub fn review_pairing_begin_response',
  'INITIAL_TV_SESSION_SCOPES',
  'MAX_PAIRING_BEGIN_RESPONSE_BYTES',
]) {
  if (!nativePairingDto.includes(fragment)) {
    throw new Error(
      `Shared native pairing DTO is missing: ${fragment}`,
    );
  }
}

for (const fragment of [
  'pub(crate) mod gateway;',
  'pub(crate) mod pairing;',
  'pub(crate) mod pairing_begin;',
]) {
  if (!commands.includes(fragment)) {
    throw new Error(
      `TV command registry is missing: ${fragment}`,
    );
  }
}

for (const fragment of [
  'commands::gateway::tv_gateway_profile',
  'commands::pairing_begin::tv_pairing_begin',
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

if (!cargo.includes('serde_json = "1"')) {
  throw new Error(
    'TV Rust host is missing strict pairing DTO JSON support.',
  );
}

const combined = [
  model,
  interaction,
  panel,
  gateway,
  pairing,
  pairingBegin,
  app,
].join('\n');

for (const forbidden of [
  'Math.random(',
  'crypto.randomUUID(',
  'localStorage.setItem("pairing',
  'sessionStorage.setItem("pairing',
  "fetch(",
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
  'Request-timeout validation owner: crablink-native-core.',
);

console.log(
  'Gateway profiles: release HTTPS or explicit private development LAN.',
);

console.log(
  'Pairing UI: validated device name, duplicate-request lock, and backend-issued challenge projection.',
);

console.log(
  'Gateway health: fixed-path bounded GET; pairing begin: fixed-path bounded POST.',
);

console.log(
  'Approval authority: root-admin desktop or mobile CrabLink device.',
);

console.log(
  'Native DTO owner: crablink-native-core; TV pairing commands remain thin adapters.',
);

console.log(
  'Session, wallet, reward, ROC, and ledger authority: absent.',
);
