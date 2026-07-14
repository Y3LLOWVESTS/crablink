#!/usr/bin/env node
/**
 * RO:WHAT — Phase 21 gate for CrabLink signed Service Node reward binding.
 * RO:INVARIANTS — explicit intent, memory-only credential, exact signer contract, backend verification, no economic truth.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

const read = (relative) =>
  fs.readFileSync(
    path.join(root, relative),
    'utf8',
  );

const rust = read(
  'apps/crablink-tauri/src-tauri/src/commands/operator_reward_binding.rs',
);

const commands = read(
  'apps/crablink-tauri/src-tauri/src/commands/mod.rs',
);

const lib = read(
  'apps/crablink-tauri/src-tauri/src/lib.rs',
);

const page = read(
  'apps/crablink-tauri/src/pages/operator/ServiceNodeOperatorPage.jsx',
);

const pkg = JSON.parse(
  read('apps/crablink-tauri/package.json'),
);

assert.match(
  rust,
  /crablink\.reward_binding\.intent\.v1/,
);

assert.match(
  rust,
  /admin_bearer_blake3_keyed_v1/,
);

assert.match(
  rust,
  /blake3::keyed_hash/,
);

assert.match(
  rust,
  /\.bearer_auth\(admin_token\)/,
);

assert.match(
  rust,
  /\/api\/v1\/rewards\/bind/,
);

assert.match(
  rust,
  /signed_intent_verified/,
);

assert.match(
  rust,
  /registry_finality/,
);

assert.match(
  rust,
  /wallet_mutation/,
);

assert.match(
  rust,
  /ledger_mutation/,
);

assert.match(
  rust,
  /confirmed_roc/,
);

assert.match(
  commands,
  /pub mod operator_reward_binding;/,
);

assert.match(
  lib,
  /service_node_operator_bind_reward_recipient/,
);

assert.match(
  page,
  /service_node_operator_bind_reward_recipient/,
);

assert.match(
  page,
  /I understand this records a binding request only/,
);

assert.match(
  page,
  /Clear credential/,
);

assert.doesNotMatch(
  page,
  /(?:globalThis|window|document)\.(?:localStorage|sessionStorage)|indexedDB\s*[.(]|\.setItem\s*\(/i,
);

assert.doesNotMatch(
  rust,
  /mint|burn|transfer_roc|issue_roc|append_ledger|create_receipt/i,
);

assert.equal(
  pkg.scripts[
    'check:signed-reward-binding-boundary'
  ],
  'node ../../scripts/check-crablink-signed-reward-binding-boundary.mjs',
);

console.log(
  'CrabLink signed Service Node reward-binding boundary check passed.',
);

console.log(
  'Intent is explicit, authenticated, replay-bounded by macronode, and remains non-authoritative.',
);
