#!/usr/bin/env node
/**
 * RO:WHAT — Validates the fixed gateway-health port and pure TV readiness projection.
 * RO:WHY — Phase 6 needs fail-closed readiness behavior before React adds the visible retry surface.
 * RO:INTERACTS — gateway-health contract, TV adapter, Rust health/settings DTOs, readiness model/tests.
 * RO:INVARIANTS — one fixed health command; redacted origin; visible development profile; no fake healthy state.
 * RO:SECURITY — no arbitrary invoke, fetch, polling, storage, session, wallet, ledger, receipt, reward, or ROC authority.
 * RO:TEST — npm --prefix apps/crablink-tv run check:network-readiness.
 */

import fs from 'node:fs';
import path from 'node:path';

import {
  fileURLToPath,
} from 'node:url';

const root =
  path.resolve(
    path.dirname(
      fileURLToPath(
        import.meta.url,
      ),
    ),
    '..',
  );

function read(relativePath) {
  const absolutePath =
    path.join(
      root,
      relativePath,
    );

  if (
    !fs.existsSync(
      absolutePath,
    )
  ) {
    throw new Error(
      `Missing TV network-readiness source: ${relativePath}`,
    );
  }

  return fs.readFileSync(
    absolutePath,
    'utf8',
  );
}

function requireFragments(
  label,
  source,
  fragments,
) {
  for (
    const fragment
    of fragments
  ) {
    if (
      !source.includes(
        fragment,
      )
    ) {
      throw new Error(
        `${label} is missing: ${fragment}`,
      );
    }
  }
}

function rejectFragments(
  label,
  source,
  fragments,
) {
  for (
    const fragment
    of fragments
  ) {
    if (
      source.includes(
        fragment,
      )
    ) {
      throw new Error(
        `${label} contains forbidden behavior: ${fragment}`,
      );
    }
  }
}

const gatewayContract =
  read(
    'packages/crablink-platform/src/contracts/gatewayPort.js',
  );

const platformIndex =
  read(
    'packages/crablink-platform/src/index.js',
  );

const platformTests =
  read(
    'packages/crablink-platform/src/contracts/adapterContracts.test.mjs',
  );

const adapter =
  read(
    'apps/crablink-tv/src/platform/tauriTvAdapter.js',
  );

const nativeHealth =
  read(
    'apps/crablink-tv/src-tauri/src/commands/gateway_health.rs',
  );

const nativeSettings =
  read(
    'apps/crablink-tv/src-tauri/src/commands/settings.rs',
  );

const model =
  read(
    'apps/crablink-tv/src/network/tvNetworkReadiness.js',
  );

const tests =
  read(
    'apps/crablink-tv/src/network/tvNetworkReadiness.test.mjs',
  );

const interaction =
  read(
    'apps/crablink-tv/src/network/tvNetworkReadinessInteraction.js',
  );

const interactionTests =
  read(
    'apps/crablink-tv/src/network/tvNetworkReadinessInteraction.test.mjs',
  );

const hook =
  read(
    'apps/crablink-tv/src/network/useTvNetworkReadiness.js',
  );

const panel =
  read(
    'apps/crablink-tv/src/network/TvNetworkReadinessPanel.jsx',
  );

const settingsPanel =
  read(
    'apps/crablink-tv/src/settings/TvSettingsPanel.jsx',
  );

const app =
  read(
    'apps/crablink-tv/src/app/TvApp.jsx',
  );

const css =
  read(
    'apps/crablink-tv/src/styles/tv.css',
  );

const tvPackage =
  JSON.parse(
    read(
      'apps/crablink-tv/package.json',
    ),
  );

const rootPackage =
  JSON.parse(
    read(
      'package.json',
    ),
  );

requireFragments(
  'shared gateway-health port',
  gatewayContract,
  [
    'createGatewayHealthPort',
    "'checkGatewayHealth'",
    "'gateway health port'",
  ],
);

requireFragments(
  'platform gateway-health export',
  platformIndex,
  [
    'createGatewayHealthPort',
  ],
);

requireFragments(
  'platform gateway-health tests',
  platformTests,
  [
    'gateway health port exposes one immutable manual check',
    'createGatewayHealthPort',
    '/requires checkGatewayHealth/',
  ],
);

requireFragments(
  'TV fixed-command adapter',
  adapter,
  [
    'createGatewayHealthPort',
    'function checkGatewayHealth()',
    "'tv_gateway_health'",
    'export const tvGatewayHealthPort',
  ],
);

requireFragments(
  'native gateway-health result',
  nativeHealth,
  [
    'crablink.tv.gateway-health-result.v1',
    'pub struct TvGatewayHealthResult',
    'pub healthy: bool',
    'pub status: u16',
    'pub response_bytes: usize',
    'pub retryable: bool',
    'pub error_code:',
    'tv_gateway_health',
  ],
);

requireFragments(
  'native settings snapshot',
  nativeSettings,
  [
    'crablink.tv.settings-snapshot.v3',
    'gateway_display_label',
    'gateway_connection_allowed',
    'gateway_development_profile',
    'gateway_origin_disclosure',
    'request_timeout_ms',
    'release_https_required',
    'local-ui-preferences-only',
  ],
);

requireFragments(
  'TV network readiness model',
  model,
  [
    'export function projectTvNetworkReadiness',
    "'crablink.tv.settings-snapshot.v3'",
    "'crablink.tv.gateway-health-result.v1'",
    "'redacted'",
    "'development-lan'",
    "'ready_to_check'",
    "'healthy'",
    "'unavailable'",
    "'rejected'",
    'No automatic polling was started.',
    'gateway_health_result_invalid',
  ],
);

requireFragments(
  'TV network readiness tests',
  tests,
  [
    'managed profile is redacted and ready for manual check',
    'development LAN profile remains visibly marked',
    'unconfigured and invalid profiles never become healthy',
    'healthy and retryable unavailable results remain distinct',
    'malformed health result fails closed without fake readiness',
  ],
);

requireFragments(
  'TV network readiness interaction',
  interaction,
  [
    'export function createTvNetworkReadinessInteraction',
    'INITIAL_TV_NETWORK_READINESS_STATE',
    'await readSettingsOperation()',
    'await checkGatewayHealthOperation()',
    'if (checkInFlight)',
    'return checkInFlight;',
    "profileState.view.status !==",
    "'ready_to_check'",
    "phase = 'host_unavailable'",
  ],
);

requireFragments(
  'TV network readiness interaction tests',
  interactionTests,
  [
    'profile load reads settings without running health transport',
    'manual check reads settings then invokes one fixed health operation',
    'duplicate manual checks share one in-flight operation',
    'settings failure blocks health execution and fails closed',
    'health failure preserves only the redacted settings snapshot',
    'manual check supersedes a slower mount profile read',
  ],
);

requireFragments(
  'TV network readiness hook',
  hook,
  [
    'export function useTvNetworkReadiness',
    'tvSettingsPort',
    'tvGatewayHealthPort',
    'void interaction.loadProfile()',
    'interaction.checkConnection',
  ],
);

requireFragments(
  'TV network readiness panel',
  panel,
  [
    'Gateway readiness',
    'Controlled network profile',
    'Managed HTTPS',
    'Development LAN',
    'Hidden by native host',
    'Manual retry is recommended',
    'Check connection',
    'Check again',
    'aria-live="polite"',
    'data-tv-focus-key="settings-network-check"',
    'manualCheckAttempted',
  ],
);

requireFragments(
  'TV settings network integration',
  settingsPanel,
  [
    'TvNetworkReadinessPanel',
    '<TvNetworkReadinessPanel',
    'onActivity={onActivity}',
  ],
);

requireFragments(
  'TV shell network-readiness integration',
  app,
  [
    "activeSectionId === 'settings'",
    '<TvSettingsPanel',
    'onActivity={setActivityMessage}',
  ],
);

requireFragments(
  'TV network readiness styling',
  css,
  [
    '.tv-network-readiness',
    '.tv-network-grid',
    '.tv-network-profile-badge--development',
    '.tv-network-status--healthy',
    '.tv-network-actions .tv-action:disabled',
  ],
);

rejectFragments(
  'TV network readiness model',
  model,
  [
    '@tauri-apps/api',
    'invoke(',
    'fetch(',
    'localStorage',
    'sessionStorage',
    'setInterval(',
    'setTimeout(',
    'window.',
    'document.',
    'settingsSnapshot.origin',
    'settingsSnapshot.url',
    'settingsSnapshot.gatewayUrl',
  ],
);

for (
  const [
    label,
    source,
  ] of [
    ['interaction', interaction],
    ['hook', hook],
    ['panel', panel],
  ]
) {
  rejectFragments(
    `TV network readiness ${label}`,
    source,
    [
      'fetch(',
      'setInterval(',
      'setTimeout(',
      'localStorage',
      'sessionStorage',
      'gatewayUrl',
      'settingsSnapshot.origin',
      'error.message',
      'String(error)',
      'wallet_mutate',
      'ledger_mutate',
      'mint_roc',
      'claim_reward',
    ],
  );
}

for (
  const fragment
  of [
    'export function callTauri',
    'export function invoke',
    'invoke(command',
    'invoke(normalized',
  ]
) {
  if (
    adapter.includes(
      fragment,
    )
  ) {
    throw new Error(
      `TV adapter exposes dynamic command authority: ${fragment}`,
    );
  }
}

const tvScripts =
  tvPackage.scripts ?? {};

const rootScripts =
  rootPackage.scripts ?? {};

if (
  tvScripts[
    'test:network-readiness'
  ] !==
  'node --test src/network/tvNetworkReadiness.test.mjs'
) {
  throw new Error(
    'TV network-readiness test command is missing or incorrect.',
  );
}

if (
  tvScripts[
    'test:network-readiness-interaction'
  ] !==
  'node --test src/network/tvNetworkReadinessInteraction.test.mjs'
) {
  throw new Error(
    'TV network-readiness interaction test command is missing or incorrect.',
  );
}

if (
  tvScripts[
    'check:network-readiness'
  ] !==
  'node ../../scripts/check-crablink-tv-network-readiness-boundary.mjs'
) {
  throw new Error(
    'TV network-readiness boundary command is missing or incorrect.',
  );
}

if (
  !String(
    tvScripts.check ?? '',
  ).includes(
    'npm run test:network-readiness && npm run test:network-readiness-interaction && npm run check:network-readiness',
  )
) {
  throw new Error(
    'TV full acceptance does not run network-readiness validation.',
  );
}

if (
  rootScripts[
    'tv:network-readiness:test'
  ] !==
  'npm --prefix apps/crablink-tv run test:network-readiness'
) {
  throw new Error(
    'Root TV network-readiness test command is missing.',
  );
}

if (
  rootScripts[
    'tv:network-readiness:interaction:test'
  ] !==
  'npm --prefix apps/crablink-tv run test:network-readiness-interaction'
) {
  throw new Error(
    'Root TV network-readiness interaction test command is missing.',
  );
}

if (
  rootScripts[
    'tv:network-readiness:check'
  ] !==
  'node scripts/check-crablink-tv-network-readiness-boundary.mjs'
) {
  throw new Error(
    'Root TV network-readiness check command is missing.',
  );
}

console.log(
  'CrabLink TV network-readiness model boundary passed.',
);

console.log(
  'Port: one immutable fixed tv_gateway_health operation.',
);

console.log(
  'Projection: managed HTTPS or visible development LAN with redacted origin posture.',
);

console.log(
  'Retryable failures remain unavailable; malformed results never become fake healthy state.',
);

console.log(
  'React integration: visible redacted profile, explicit manual check, shared in-flight duplicate suppression, and remote focus.',
);

console.log(
  'Automatic polling, arbitrary URLs, raw errors, credentials, sessions, wallet, ledger, receipts, rewards, and ROC authority: absent.',
);

console.log('PHASE6=COMPLETE');
console.log(
  'NEXT_PHASE=PHASE7_ROUTE_ERROR_AND_OVERLAY_FOUNDATION',
);
