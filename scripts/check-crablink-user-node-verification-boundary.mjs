import {
  existsSync,
  readFileSync,
} from 'node:fs';
import { join } from 'node:path';

const root =
  new URL('..', import.meta.url).pathname;

const commandPath =
  'apps/crablink-tauri/src-tauri/src/commands/user_node_verification.rs';

const libPath =
  'apps/crablink-tauri/src-tauri/src/lib.rs';

const modPath =
  'apps/crablink-tauri/src-tauri/src/commands/mod.rs';

const failures = [];

function read(relative) {
  return readFileSync(
    join(root, relative),
    'utf8',
  );
}

for (const relative of [
  commandPath,
  libPath,
  modPath,
]) {
  if (!existsSync(join(root, relative))) {
    failures.push(
      `missing required file: ${relative}`,
    );
  }
}

function requireTokens(
  relative,
  source,
  tokens,
) {
  for (const token of tokens) {
    if (!source.includes(token)) {
      failures.push(
        `${relative} is missing ${JSON.stringify(token)}`,
      );
    }
  }
}

if (failures.length === 0) {
  const command = read(commandPath);
  const lib = read(libPath);
  const mod = read(modPath);

  requireTokens(commandPath, command, [
    'fetch_service_node_oap_object',
    '/api/v1/verification/object',
    'full_digest_verified',
    'user_node_evidence_pending: true',
    'accounting_accepted: false',
    'reward_eligible: false',
    'reward_truth: false',
    'payout_authority: false',
    'wallet_mutation: false',
    'ledger_mutation: false',
    'receipt: None',
    'confirmed_roc_minor_units: None',
    'must remain loopback-only',
    'privacyRouteId must be an opaque route identifier',
  ]);

  requireTokens(modPath, mod, [
    'pub mod user_node_verification;',
  ]);

  requireTokens(libPath, lib, [
    'commands::user_node_verification::user_node_verify_service_object',
  ]);
}

if (failures.length > 0) {
  console.error(
    'CrabLink User Node verification boundary check failed:',
  );

  for (const failure of failures) {
    console.error(`- ${failure}`);
  }

  process.exit(1);
}

console.log(
  'CrabLink User Node verification boundary check passed.',
);

console.log(
  'Only full-BLAKE3-authenticated OAP bytes may enter the real pending-evidence path; accounting, rewards, wallets, ledgers, receipts, and confirmed ROC remain false.',
);
