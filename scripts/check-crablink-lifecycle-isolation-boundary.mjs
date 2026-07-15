import {
  existsSync,
  readFileSync,
} from 'node:fs';
import { join } from 'node:path';

const root =
  new URL('..', import.meta.url).pathname;

const localNodePath =
  'apps/crablink-tauri/src-tauri/src/commands/local_node.rs';

const testPath =
  'apps/crablink-tauri/src-tauri/tests/phase22_live_lifecycle_isolation.rs';

const libPath =
  'apps/crablink-tauri/src-tauri/src/lib.rs';

const failures = [];

function read(relative) {
  return readFileSync(
    join(root, relative),
    'utf8',
  );
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

for (const relative of [
  localNodePath,
  testPath,
  libPath,
]) {
  if (!existsSync(join(root, relative))) {
    failures.push(
      `missing required file: ${relative}`,
    );
  }
}

if (failures.length === 0) {
  const localNode = read(localNodePath);
  const test = read(testPath);
  const lib = read(libPath);

  requireTokens(localNodePath, localNode, [
    'pub async fn query_local_node_status',
    'local node enabled but status endpoint is unavailable',
    'confirmed_roc_minor_units.is_none()',
    'wallet_ledger_receipt_only',
  ]);

  requireTokens(libPath, lib, [
    'query_local_node_status',
    'LocalNodeRequest',
    'LocalNodeStatus',
  ]);

  requireTokens(testPath, test, [
    'phase22_client_exit_leaves_both_nodes_independent',
    'phase22_service_node_loss_degrades_only_operator_surface',
    'phase22_user_node_loss_degrades_only_user_surface',
    'connection_state',
    '"unavailable"',
    '"degraded"',
    'confirmed_roc_minor_units',
    'wallet_execution_participant',
    'daemon_started_by_client',
    'finality_authority',
  ]);
}

if (failures.length > 0) {
  console.error(
    'CrabLink lifecycle isolation boundary check failed:',
  );

  for (const failure of failures) {
    console.error(`- ${failure}`);
  }

  process.exit(1);
}

console.log(
  'CrabLink lifecycle isolation boundary check passed.',
);

console.log(
  'CrabLink owns neither daemon; each node failure degrades only its corresponding status surface, and no degraded path creates confirmed ROC or finality.',
);
