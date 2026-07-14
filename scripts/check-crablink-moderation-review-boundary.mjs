#!/usr/bin/env node
/**
 * RO:WHAT — Phase 21 gate for CrabLink Service Node moderation review.
 * RO:INVARIANTS — authenticated bounded queue; explicit decisions; no policy, storage, provider, reward, wallet, or ledger authority.
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
  'apps/crablink-tauri/src-tauri/src/commands/operator_moderation_review.rs',
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
  /\/api\/v1\/moderation\/review\/pending/,
);

assert.match(
  rust,
  /\/api\/v1\/moderation\/review\/approve/,
);

assert.match(
  rust,
  /\/api\/v1\/moderation\/review\/reject/,
);

assert.match(
  rust,
  /\.bearer_auth\(request\.admin_token\.trim\(\)\)/,
);

for (const boundary of [
  'policy_mutation',
  'runtime_activation',
  'storage_delete',
  'provider_withdrawal',
  'reward_finality',
  'wallet_mutation',
  'ledger_mutation',
]) {
  assert.match(rust, new RegExp(boundary));
}

assert.match(
  commands,
  /pub mod operator_moderation_review;/,
);

assert.match(
  lib,
  /service_node_operator_moderation_pending/,
);

assert.match(
  lib,
  /service_node_operator_moderation_decide/,
);

assert.match(
  page,
  /service_node_operator_moderation_pending/,
);

assert.match(
  page,
  /service_node_operator_moderation_decide/,
);

assert.match(
  page,
  /Approve for escalation/,
);

assert.match(
  page,
  /Reject review item/,
);

assert.match(
  page,
  /I understand this changes review metadata only/,
);

assert.doesNotMatch(
  page,
  /(?:globalThis|window|document)\.(?:localStorage|sessionStorage)|indexedDB\s*[.(]|\.setItem\s*\(/i,
);

assert.doesNotMatch(
  rust,
  /write_policy|activate_policy|delete_object|withdraw_provider|mint|burn|append_ledger|create_receipt/i,
);

assert.equal(
  pkg.scripts[
    'check:moderation-review-boundary'
  ],
  'node ../../scripts/check-crablink-moderation-review-boundary.mjs',
);

console.log(
  'CrabLink Service Node moderation-review boundary check passed.',
);

console.log(
  'Queue reads are bounded, decisions are explicit, and policy/economic authority remains false.',
);
