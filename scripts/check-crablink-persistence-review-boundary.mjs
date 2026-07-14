#!/usr/bin/env node
/**
 * RO:WHAT — Phase 21 gate for CrabLink Service Node persistence review.
 * RO:INVARIANTS — authenticated bounded queue; explicit decisions; eligibility never becomes fake durable bytes or economic truth.
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
  'apps/crablink-tauri/src-tauri/src/commands/operator_persistence_review.rs',
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

const card = read(
  'apps/crablink-tauri/src/pages/operator/PersistenceReviewCard.jsx',
);

const pkg = JSON.parse(
  read('apps/crablink-tauri/package.json'),
);

for (const endpoint of [
  '/api/v1/persistence/pending',
  '/api/v1/persistence/submit',
  '/api/v1/persistence/approve',
  '/api/v1/persistence/reject',
]) {
  assert.match(
    rust,
    new RegExp(
      endpoint.replaceAll('/', '\\/'),
    ),
  );
}

assert.match(
  rust,
  /\.bearer_auth\(request\.admin_token\.trim\(\)\)/,
);

for (const boundary of [
  'durable_bytes_written',
  'wallet_mutation',
  'ledger_mutation',
  'policy_mutation',
  'runtime_activation',
  'storage_delete',
  'provider_withdrawal',
  'reward_finality',
  'external_finality',
]) {
  assert.match(
    rust,
    new RegExp(boundary),
  );
}

assert.match(
  rust,
  /verified_persistent/,
);

assert.match(
  rust,
  /operator_blocked/,
);

assert.match(
  commands,
  /pub mod operator_persistence_review;/,
);

assert.match(
  lib,
  /service_node_operator_persistence_pending/,
);

assert.match(
  lib,
  /service_node_operator_persistence_decide/,
);

assert.match(
  page,
  /PersistenceReviewCard/,
);

assert.match(
  card,
  /service_node_operator_persistence_pending/,
);

assert.match(
  card,
  /service_node_operator_persistence_decide/,
);

assert.match(
  card,
  /Approve persistence eligibility/,
);

assert.match(
  card,
  /Reject persistence/,
);

assert.match(
  card,
  /I understand approval changes eligibility metadata only/,
);

assert.match(
  card,
  /No durable bytes were written/,
);

assert.doesNotMatch(
  card,
  /(?:globalThis|window|document)\.(?:localStorage|sessionStorage)|indexedDB\s*[.(]|\.setItem\s*\(/i,
);

assert.doesNotMatch(
  rust,
  /write_durable_bytes|delete_object|withdraw_provider|mint|burn|append_ledger|create_receipt/i,
);

assert.equal(
  pkg.scripts[
    'check:persistence-review-boundary'
  ],
  'node ../../scripts/check-crablink-persistence-review-boundary.mjs',
);

console.log(
  'CrabLink Service Node persistence-review boundary check passed.',
);

console.log(
  'Queue reads are bounded, decisions are explicit, and eligibility never becomes fake durability or economic truth.',
);
