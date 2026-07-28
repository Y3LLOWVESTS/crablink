#!/usr/bin/env node
/**
 * RO:WHAT — Validates the fixed-path bounded CrabLink TV gateway-health operation.
 * RO:WHY — Prevents gateway readiness from becoming arbitrary native URL-fetch authority.
 * RO:INTERACTS — TV Rust gateway DTOs, health command, registry, Cargo dependency, package check.
 * RO:INVARIANTS — GET /healthz only; no caller URL; redirects/proxies off; bounded timeout/body.
 * RO:SECURITY — no body, credentials, raw errors, secrets, wallet, ledger, or session data escapes.
 * RO:TEST — npm run tv:gateway-health:check.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(
  path.dirname(
    fileURLToPath(import.meta.url),
  ),
  '..',
);

function read(relativePath) {
  const absolutePath =
    path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(
      `Missing required file: ${relativePath}`,
    );
  }

  return fs.readFileSync(
    absolutePath,
    'utf8',
  );
}

const cargo = read(
  'apps/crablink-tv/src-tauri/Cargo.toml',
);

const gateway = read(
  'apps/crablink-tv/src-tauri/src/commands/gateway.rs',
);

const health = read(
  'apps/crablink-tv/src-tauri/src/commands/gateway_health.rs',
);

const commands = read(
  'apps/crablink-tv/src-tauri/src/commands/mod.rs',
);

const lib = read(
  'apps/crablink-tv/src-tauri/src/lib.rs',
);

const appPackage = JSON.parse(
  read('apps/crablink-tv/package.json'),
);

for (const marker of [
  'pub struct TvGatewayHealthRequest',
  'gateway_health_request_for_profile',
  'review_gateway_health_response',
  'MAX_HEALTH_RESPONSE_BYTES',
  'const HEALTH_PATH: &str = "/healthz"',
]) {
  if (!gateway.includes(marker)) {
    throw new Error(
      `Gateway contract is missing: ${marker}`,
    );
  }
}

for (const marker of [
  'pub async fn tv_gateway_health()',
  'gateway_health_request_for_profile',
  'reqwest::redirect::Policy::none()',
  '.no_proxy()',
  '.connect_timeout(timeout)',
  '.timeout(timeout)',
  '.content_length()',
  'response.chunk().await',
  'request.max_response_bytes',
  'GET /healthz HTTP/1.1',
  'unconfigured_profile_blocks_before_network',
  'local_fixed_path_health_response_is_accepted',
  'declared_oversize_health_response_is_rejected',
]) {
  if (!health.includes(marker)) {
    throw new Error(
      `Gateway-health operation is missing: ${marker}`,
    );
  }
}

if (
  !cargo.includes(
    'reqwest = { version = "0.12", default-features = false, features = ["json", "rustls-tls", "stream"] }',
  )
) {
  throw new Error(
    'Gateway health requires reviewed rustls-only reqwest configuration.',
  );
}

if (
  !commands.includes(
    'pub(crate) mod gateway_health;',
  )
) {
  throw new Error(
    'Gateway-health module is not registered.',
  );
}

if (
  !lib.includes(
    'commands::gateway_health::tv_gateway_health',
  )
) {
  throw new Error(
    'Gateway-health command is not registered.',
  );
}

if (
  /pub\s+async\s+fn\s+tv_gateway_health\s*\([^)]*[A-Za-z_][^)]*\)/s.test(
    health,
  )
) {
  throw new Error(
    'tv_gateway_health must not accept caller-controlled URL input.',
  );
}

// Security comments intentionally name authority this operation
// does not possess. Scan executable Rust rather than full-line
// documentation and comments.
const executableHealth = health
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

for (const forbidden of [
  /\bbearer_auth\s*\(/i,
  /\bauthorization(?:\b|_|::)/i,
  /\bcookie(?:\b|_|::)/i,
  /response\.text\s*\(/i,
  /response\.json\s*\(/i,
  /\bwallet(?:\b|_|::)/i,
  /\bledger(?:\b|_|::)/i,
  /\bmint(?:\b|_|::|\s*\()/i,
  /\bburn(?:\b|_|::|\s*\()/i,
  /\bpairing_begin(?:\b|_|::|\s*\()/i,
  /\bsession_create(?:\b|_|::|\s*\()/i,
]) {
  const match =
    executableHealth.match(forbidden);

  if (match) {
    throw new Error(
      `Forbidden executable gateway-health authority matched: ${forbidden}; token=${match[0]}`,
    );
  }
}

if (
  appPackage.scripts[
    'check:gateway-health'
  ] !==
  'node ../../scripts/check-crablink-tv-gateway-health-boundary.mjs'
) {
  throw new Error(
    'TV package is missing check:gateway-health.',
  );
}

if (
  !appPackage.scripts.check.includes(
    'npm run check:gateway-health',
  )
) {
  throw new Error(
    'Full TV acceptance does not run gateway-health boundary.',
  );
}

console.log(
  'CrabLink TV gateway-health boundary passed.',
);

console.log(
  'Operation: fixed reviewed-origin GET /healthz.',
);

console.log(
  'Bounds: 1–30 second timeout and 16 KiB streamed response maximum.',
);

console.log(
  'Redirects, ambient proxies, arbitrary URLs, credentials, and response-body exposure: absent.',
);

console.log(
  'Pairing, session, wallet, ledger, reward, ROC, and node authority: absent.',
);
