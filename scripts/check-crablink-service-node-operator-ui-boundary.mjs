#!/usr/bin/env node
/**
 * RO:WHAT — Phase 21 gate for optional, memory-only, bounded Service Node Operator UI.
 * RO:INVARIANTS — disabled by default; no credential persistence; status-first; signed binding, moderation review, and persistence review are checked by separate gates; canonical receipt evidence required.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_OPERATOR_CONFIG,
  hasConfirmedIssuance,
  normalizeOperatorConfig,
  normalizeOperatorStatus,
} from '../apps/crablink-tauri/src/shared/operator/serviceNodeOperatorModel.js';

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

const read = (relative) =>
  fs.readFileSync(
    path.join(root, relative),
    'utf8',
  );

const page = read(
  'apps/crablink-tauri/src/pages/operator/ServiceNodeOperatorPage.jsx',
);

const model = read(
  'apps/crablink-tauri/src/shared/operator/serviceNodeOperatorModel.js',
);

const routes = read(
  'apps/crablink-tauri/src/app/routeRegistry.js',
);

const home = read(
  'apps/crablink-tauri/src/pages/home/HomeQuickActions.jsx',
);

const pkg = JSON.parse(
  read('apps/crablink-tauri/package.json'),
);

assert.equal(
  DEFAULT_OPERATOR_CONFIG.enabled,
  false,
);

assert.equal(
  DEFAULT_OPERATOR_CONFIG.connectionMode,
  'local',
);

assert.equal(
  DEFAULT_OPERATOR_CONFIG.adminToken,
  '',
);

assert.deepEqual(
  normalizeOperatorConfig({
    enabled: true,
    connectionMode: 'remote',
    baseUrl: 'https://node.example/',
    adminToken: ' token ',
  }),
  {
    enabled: true,
    connectionMode: 'remote',
    baseUrl: 'https://node.example',
    adminToken: 'token',
  },
);

assert.equal(
  hasConfirmedIssuance(
    normalizeOperatorStatus({
      enabled: true,
      connectionState: 'connected',
      summary: {
        pendingRewardPlans: 5,
      },
      confirmedIssuanceEvidence: null,
    }),
  ),
  false,
);

assert.equal(
  hasConfirmedIssuance(
    normalizeOperatorStatus({
      enabled: true,
      connectionState: 'connected',
      confirmedIssuanceEvidence: {
        ledgerReceiptReported: true,
      },
    }),
  ),
  true,
);

for (const source of [page, model]) {
  assert.doesNotMatch(
    source,
    /(?:globalThis|window|document)\.(?:localStorage|sessionStorage)|indexedDB\s*[.(]|\.setItem\s*\(/i,
  );
}

assert.match(
  routes,
  /operator:\s*lazy\(\(\) => import\('\.\.\/pages\/operator\/ServiceNodeOperatorPage\.jsx'\)\)/,
);

assert.match(
  home,
  /crab:\/\/operator/,
);

assert.match(
  page,
  /useState\(DEFAULT_OPERATOR_CONFIG\)/,
);

assert.match(
  page,
  /callTauri\(\s*'service_node_operator_status'/,
);

assert.match(
  page,
  /type="password"/,
);

assert.match(
  page,
  /Check read-only status/,
);

assert.match(
  page,
  /PersistenceReviewCard/,
);

assert.doesNotMatch(
  page,
  /callTauri\(['"][^'"]*(start|stop|restart|policy|receipt|mint|issue|transfer|burn)/i,
);

assert.equal(
  pkg.scripts[
    'check:service-node-operator-ui-boundary'
  ],
  'node ../../scripts/check-crablink-service-node-operator-ui-boundary.mjs',
);

console.log(
  'CrabLink Service Node Operator Mode UI boundary check passed.',
);

console.log(
  'The route is optional, memory-only, status-first, and receipt-truthful; signed binding, moderation review, and persistence review are checked separately.',
);
