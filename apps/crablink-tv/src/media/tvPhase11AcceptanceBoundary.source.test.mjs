import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here =
  path.dirname(fileURLToPath(import.meta.url));

const root =
  path.resolve(here, '../../../..');

const boundaryPath =
  path.join(root, 'scripts/check-crablink-tv-phase11-acceptance-boundary.mjs');

const boundary =
  fs.readFileSync(boundaryPath, 'utf8');

test('phase 11 acceptance boundary enumerates the full phase chain', () => {
  for (const marker of [
    'PHASE11A_CONTINUE_WATCHING_RESOURCE_FOUNDATION=GREEN',
    'PHASE11B_CONTINUE_WATCHING_STORE_ADAPTER=GREEN',
    'PHASE11C_RESOURCE_RELEASE_LIFECYCLE_ADAPTER=GREEN',
    'PHASE11D_RELEASE_EXECUTOR_BOUNDARY=GREEN',
    'PHASE11E_PHASE11_ACCEPTANCE_BOUNDARY=GREEN',
    'PHASE11_TRACK=COMPLETE',
  ]) {
    assert.equal(
      boundary.includes(marker),
      true,
      `acceptance boundary missing marker: ${marker}`,
    );
  }
});

test('phase 11 acceptance boundary accepts resource and release surfaces', () => {
  for (const marker of [
    'CONTINUE_WATCHING_TRUTH=ACCEPTED',
    'CONTINUE_WATCHING_STORE_ADAPTER=ACCEPTED',
    'RESOURCE_RELEASE_LIFECYCLE=ACCEPTED',
    'RESOURCE_RELEASE_EXECUTOR_BOUNDARY=ACCEPTED',
    'DIRECT_RELEASE_EXECUTION=NOT_ADDED',
    'STORAGE_MUTATION_SIDE_EFFECT=NOT_ADDED',
    'PLAYER_MUTATION_SIDE_EFFECT=NOT_ADDED',
    'HANDLE_RELEASE_SIDE_EFFECT=NOT_ADDED',
  ]) {
    assert.equal(
      boundary.includes(marker),
      true,
      `acceptance boundary missing acceptance marker: ${marker}`,
    );
  }
});

test('phase 11 acceptance boundary keeps side effects and authority outside acceptance', () => {
  for (const fragment of [
    'fetch(',
    'invoke(',
    'new Blob',
    'createObjectURL',
    'revokeObjectURL',
    'localStorage',
    'sessionStorage',
    'indexedDB',
    'wallet',
    'ledger',
    'entitlement',
    'finality',
    'providerFallback',
    'directProvider',
  ]) {
    assert.equal(
      boundary.includes(`'${fragment}'`) ||
        boundary.includes(`"${fragment}"`),
      true,
      `acceptance boundary does not reject: ${fragment}`,
    );
  }
});
