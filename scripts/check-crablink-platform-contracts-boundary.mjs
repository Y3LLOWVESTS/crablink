#!/usr/bin/env node
/**
 * RO:WHAT — Validates shared gateway, settings, diagnostics, and catalog adapter contracts.
 * RO:WHY — Phase 4 requires portable ports before memory adapters and broader UI sharing.
 * RO:INTERACTS — @crablink/platform, desktop adapters, TV Tauri adapter, TvApp.
 * RO:INVARIANTS — exact immutable methods; no ambient platform APIs in shared contracts; fixed native commands in adapters.
 * RO:SECURITY — no arbitrary invoke, network, storage, wallet, ledger, receipt, ROC, node, or finality authority.
 * RO:TEST — npm --prefix packages/crablink-platform run check.
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  fileURLToPath,
} from 'node:url';

const root = path.resolve(
  path.dirname(
    fileURLToPath(import.meta.url),
  ),
  '..',
);

const files = {
  platformPackage:
    'packages/crablink-platform/package.json',
  index:
    'packages/crablink-platform/src/index.js',
  helper:
    'packages/crablink-platform/src/contracts/portContract.js',
  diagnostics:
    'packages/crablink-platform/src/contracts/diagnosticsPort.js',
  gateway:
    'packages/crablink-platform/src/contracts/gatewayPort.js',
  settings:
    'packages/crablink-platform/src/contracts/settingsPort.js',
  catalog:
    'packages/crablink-platform/src/contracts/catalogPort.js',
  tests:
    'packages/crablink-platform/src/contracts/adapterContracts.test.mjs',
  desktopDiagnostics:
    'apps/crablink-tauri/src/adapters/diagnosticsAdapter.js',
  desktopGateway:
    'apps/crablink-tauri/src/adapters/gatewayAdapter.js',
  desktopSettings:
    'apps/crablink-tauri/src/adapters/settingsAdapter.js',
  tvAdapter:
    'apps/crablink-tv/src/platform/tauriTvAdapter.js',
  tvApp:
    'apps/crablink-tv/src/app/TvApp.jsx',
  desktopPackage:
    'apps/crablink-tauri/package.json',
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
      `Missing platform contract source: ${relativePath}`,
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
  for (const fragment of fragments) {
    if (!source.includes(fragment)) {
      throw new Error(
        `${label} is missing: ${fragment}`,
      );
    }
  }
}

const platformPackage =
  JSON.parse(
    read(files.platformPackage),
  );

const desktopPackage =
  JSON.parse(
    read(files.desktopPackage),
  );

const tvPackage =
  JSON.parse(
    read(files.tvPackage),
  );

const rootPackage =
  JSON.parse(
    read(files.rootPackage),
  );

const index = read(files.index);
const helper = read(files.helper);
const diagnostics = read(files.diagnostics);
const gateway = read(files.gateway);
const settings = read(files.settings);
const catalog = read(files.catalog);
const tests = read(files.tests);

const desktopDiagnostics =
  read(files.desktopDiagnostics);

const desktopGateway =
  read(files.desktopGateway);

const desktopSettings =
  read(files.desktopSettings);

const tvAdapter =
  read(files.tvAdapter);

const tvApp =
  read(files.tvApp);

requireFragments(
  'platform helper',
  helper,
  [
    'export function createMethodPort',
    'typeof method !==',
    'Object.freeze(port)',
    'port[methodName] = method',
  ],
);

requireFragments(
  'diagnostics contract',
  diagnostics,
  [
    'createMethodPort',
    'createDiagnosticsPort',
    "'getDiagnostics'",
  ],
);

requireFragments(
  'gateway contract',
  gateway,
  [
    'createGatewayHealthPort',
    'createGatewayPort',
    'createGatewayProfilePort',
    "'health'",
    "'ready'",
    "'resolveCrabUrl'",
    "'readGatewayProfile'",
  ],
);

requireFragments(
  'settings contract',
  settings,
  [
    'createSettingsPort',
    'createReadonlySettingsPort',
    "'readSettings'",
    "'writeSettings'",
  ],
);

requireFragments(
  'catalog contract',
  catalog,
  [
    'createMethodPort',
    'createCatalogPort',
    "'readCatalog'",
  ],
);

requireFragments(
  'platform exports',
  index,
  [
    'createDiagnosticsPort',
    'createGatewayHealthPort',
    'createGatewayPort',
    'createGatewayProfilePort',
    'createReadonlySettingsPort',
    'createSettingsPort',
    'createCatalogPort',
  ],
);

for (const fragment of [
  'diagnostics port exposes exactly one immutable method',
  'gateway request port exposes only health ready and resolve',
  'gateway health port exposes one immutable manual check',
  'gateway profile port remains separate and read only',
  'settings port exposes exact read and write methods',
  'readonly settings port cannot acquire write authority',
  'ports fail closed when required methods are absent',
  'port construction performs no calls and does not mutate input',
  'ports preserve adapter results and errors without inventing success',
]) {
  if (!tests.includes(fragment)) {
    throw new Error(
      `Platform contract test is missing: ${fragment}`,
    );
  }
}

const sharedSources = [
  index,
  helper,
  diagnostics,
  gateway,
  settings,
  catalog,
].join('\n');

for (
  const [
    label,
    pattern,
  ] of [
    [
      'Tauri API',
      /@tauri-apps\/api/,
    ],
    [
      'Chrome API',
      /\bchrome\./,
    ],
    [
      'native invoke',
      /\binvoke\s*\(/,
    ],
    [
      'network fetch',
      /\bfetch\s*\(/,
    ],
    [
      'local storage',
      /\blocalStorage\b/,
    ],
    [
      'session storage',
      /\bsessionStorage\b/,
    ],
    [
      'DOM window',
      /\bwindow\b/,
    ],
    [
      'DOM document',
      /\bdocument\b/,
    ],
  ]
) {
  if (pattern.test(sharedSources)) {
    throw new Error(
      `Shared platform contracts contain forbidden ${label}.`,
    );
  }
}

requireFragments(
  'desktop diagnostics adapter',
  desktopDiagnostics,
  [
    'createDiagnosticsPort',
    "'app_diagnostics'",
    'export const diagnosticsPort',
  ],
);

requireFragments(
  'desktop gateway adapter',
  desktopGateway,
  [
    'createGatewayPort',
    "'health_check_gateway'",
    "'ready_check_gateway'",
    "'resolve_crab_url_gateway'",
    'export const gatewayPort',
  ],
);

requireFragments(
  'desktop settings adapter',
  desktopSettings,
  [
    'createSettingsPort',
    "'read_settings'",
    "'write_settings'",
    'export const settingsPort',
  ],
);

requireFragments(
  'TV adapter',
  tvAdapter,
  [
    'createDiagnosticsPort',
    'createGatewayHealthPort',
    'createGatewayProfilePort',
    'createReadonlySettingsPort',
    "'tv_diagnostics'",
    "'tv_gateway_health'",
    "'tv_gateway_profile'",
    "'tv_settings_read'",
    "'tv_catalog_read'",
    'export const tvDiagnosticsPort',
    'export const tvGatewayHealthPort',
    'export const tvGatewayProfilePort',
    'export const tvSettingsPort',
    'export const tvCatalogPort',
  ],
);

for (const fragment of [
  'export function callTauri',
  'export function invoke',
  'invoke(command',
  'invoke(normalized',
]) {
  if (tvAdapter.includes(fragment)) {
    throw new Error(
      `TV adapter exposes dynamic command authority: ${fragment}`,
    );
  }
}

requireFragments(
  'TV application',
  tvApp,
  [
    'tvDiagnosticsPort',
    'tvGatewayProfilePort',
    'tvSettingsPort',
    'Promise.all',
    'diagnostics.clientOnly !== true',
    "settingsSnapshot.settingsAuthority !==",
  ],
);

if (
  tvApp.includes(
    "invoke('tv_diagnostics')",
  ) ||
  tvApp.includes(
    '@tauri-apps/api/core',
  )
) {
  throw new Error(
    'TvApp still calls the native diagnostic command directly.',
  );
}

const platformScripts =
  platformPackage.scripts ?? {};

if (
  platformScripts.test !==
  'node --test src/contracts/adapterContracts.test.mjs'
) {
  throw new Error(
    'Platform package test command is missing or incorrect.',
  );
}

if (
  platformScripts['test:catalog'] !==
  'node --test src/contracts/catalogPort.test.mjs'
) {
  throw new Error(
    'Platform catalog test command is missing or incorrect.',
  );
}

if (
  platformScripts['check:boundary'] !==
  'node ../../scripts/check-crablink-platform-contracts-boundary.mjs'
) {
  throw new Error(
    'Platform package boundary command is missing or incorrect.',
  );
}

if (
  platformScripts['check:catalog-boundary'] !==
  'node ../../scripts/check-crablink-platform-catalog-boundary.mjs'
) {
  throw new Error(
    'Platform catalog boundary command is missing or incorrect.',
  );
}

if (
  platformScripts.check !==
  'npm run test && npm run test:catalog && npm run check:boundary && npm run check:catalog-boundary && npm run check:memory'
) {
  throw new Error(
    'Platform package acceptance command is missing or incorrect.',
  );
}

if (
  desktopPackage.scripts?.[
    'check:platform-contracts'
  ] !==
  'npm --prefix ../../packages/crablink-platform run check'
) {
  throw new Error(
    'Desktop platform-contract command is missing or incorrect.',
  );
}

if (
  tvPackage.scripts?.[
    'check:platform-contracts'
  ] !==
  'npm --prefix ../../packages/crablink-platform run check'
) {
  throw new Error(
    'TV platform-contract command is missing or incorrect.',
  );
}

if (
  rootPackage.scripts?.[
    'platform:check'
  ] !==
  'npm --prefix packages/crablink-platform run check'
) {
  throw new Error(
    'Root platform acceptance command is missing or incorrect.',
  );
}

console.log(
  'CrabLink platform adapter-contract boundary passed.',
);

console.log(
  'Contracts: exact immutable gateway, gateway-health, gateway-profile, settings, readonly-settings, diagnostics, and catalog-read ports.',
);

console.log(
  'Desktop: fixed existing command wrappers projected through shared contracts.',
);

console.log(
  'TV: diagnostics, gateway health, gateway profile, settings reads, and catalog reads use fixed-command contract ports.',
);

console.log(
  'Memory adapters are deterministic test-only fixtures validated by the family-5 boundary.',
);

console.log(
  'Wallet, ledger, receipt, ROC, entitlement, node, session, and finality authority remain absent.',
);
