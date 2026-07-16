#!/usr/bin/env node
/**
 * RO:WHAT — Validates the narrow CrabLink TV native-command boundary.
 * RO:WHY — Prevents desktop node/operator/creator/economic authority from entering TV.
 * RO:INTERACTS — TV Tauri registry, command modules, capability, package, and config.
 * RO:INVARIANTS — exactly four read-only foundation commands; core-only permission; separate identifier.
 * RO:SECURITY — rejects dangerous command names, plugins, and broad permissions.
 * RO:TEST — node scripts/check-crablink-tv-command-boundary.mjs.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(
  fileURLToPath(import.meta.url),
);

const root = path.resolve(scriptDir, '..');

const files = {
  package: 'apps/crablink-tv/package.json',
  config:
    'apps/crablink-tv/src-tauri/tauri.conf.json',
  capability:
    'apps/crablink-tv/src-tauri/capabilities/tv.json',
  lib:
    'apps/crablink-tv/src-tauri/src/lib.rs',
  commands:
    'apps/crablink-tv/src-tauri/src/commands/mod.rs',
  diagnostics:
    'apps/crablink-tv/src-tauri/src/commands/diagnostics.rs',
  gateway:
    'apps/crablink-tv/src-tauri/src/commands/gateway.rs',
  pairing:
    'apps/crablink-tv/src-tauri/src/commands/pairing.rs',
  settings:
    'apps/crablink-tv/src-tauri/src/commands/settings.rs',
};

const failures = [];

function read(relativePath) {
  const absolutePath =
    path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    failures.push(
      `missing required file: ${relativePath}`,
    );
    return '';
  }

  return fs.readFileSync(
    absolutePath,
    'utf8',
  );
}

function parseJson(
  relativePath,
  source,
) {
  try {
    return JSON.parse(source);
  } catch (error) {
    failures.push(
      `${relativePath} is not valid JSON: ${error.message}`,
    );
    return {};
  }
}

const packageSource = read(files.package);
const configSource = read(files.config);
const capabilitySource = read(files.capability);
const libSource = read(files.lib);
const commandsSource = read(files.commands);

const commandSources = [
  read(files.diagnostics),
  read(files.gateway),
  read(files.pairing),
  read(files.settings),
].join('\n');

const packageData = parseJson(
  files.package,
  packageSource,
);

const configData = parseJson(
  files.config,
  configSource,
);

const capabilityData = parseJson(
  files.capability,
  capabilitySource,
);

const expectedCommands = [
  'tv_diagnostics',
  'tv_gateway_profile',
  'tv_pairing_status',
  'tv_settings_read',
].sort();

const registeredCommands = [
  ...libSource.matchAll(
    /commands::[a-z0-9_]+::([a-z0-9_]+)/g,
  ),
]
  .map((match) => match[1])
  .sort();

const declaredCommands = [
  ...commandSources.matchAll(
    /#\[tauri::command\]\s*pub fn\s+([a-z0-9_]+)/g,
  ),
]
  .map((match) => match[1])
  .sort();

if (
  JSON.stringify(registeredCommands) !==
  JSON.stringify(expectedCommands)
) {
  failures.push(
    `registered commands must be exactly: ${expectedCommands.join(', ')}`,
  );
}

if (
  JSON.stringify(declaredCommands) !==
  JSON.stringify(expectedCommands)
) {
  failures.push(
    `declared commands must be exactly: ${expectedCommands.join(', ')}`,
  );
}

const expectedModules = [
  'diagnostics',
  'gateway',
  'pairing',
  'settings',
].sort();

const declaredModules = [
  ...commandsSource.matchAll(
    /pub\(crate\) mod ([a-z0-9_]+);/g,
  ),
]
  .map((match) => match[1])
  .sort();

if (
  JSON.stringify(declaredModules) !==
  JSON.stringify(expectedModules)
) {
  failures.push(
    `TV command modules must be exactly: ${expectedModules.join(', ')}`,
  );
}

const forbiddenCommandName =
  /(?:local_node|user_node|service_node|operator|wallet|ledger|reward|payout|mint|burn|transfer|publish|upload|shell|process|execute|eval|quickchain|bridge|solana|rox|staking|liquidity)/i;

for (const command of registeredCommands) {
  if (forbiddenCommandName.test(command)) {
    failures.push(
      `forbidden TV command authority name: ${command}`,
    );
  }
}

if (
  configData.identifier !==
  'com.rustyonions.crablink.tv'
) {
  failures.push(
    'TV application identifier must be com.rustyonions.crablink.tv.',
  );
}

if (
  packageData.name !==
  '@crablink/crablink-tv'
) {
  failures.push(
    'TV package name must be @crablink/crablink-tv.',
  );
}

const permissions =
  capabilityData.permissions ?? [];

if (
  JSON.stringify(permissions) !==
  JSON.stringify(['core:default'])
) {
  failures.push(
    'TV capability must contain only core:default.',
  );
}

const dangerousPermission =
  /(?:shell|process|fs|dialog|http|opener|global-shortcut)/i;

for (const permission of permissions) {
  if (dangerousPermission.test(permission)) {
    failures.push(
      `forbidden broad TV permission: ${permission}`,
    );
  }
}

const allDependencies = {
  ...(packageData.dependencies ?? {}),
  ...(packageData.devDependencies ?? {}),
};

for (
  const dependency of
  Object.keys(allDependencies)
) {
  if (
    dependency.startsWith(
      '@tauri-apps/plugin-',
    )
  ) {
    failures.push(
      `TV foundation must not add Tauri plugins: ${dependency}`,
    );
  }
}

if (failures.length > 0) {
  console.error(
    'CrabLink TV command-boundary check failed:',
  );

  for (const failure of failures) {
    console.error(` - ${failure}`);
  }

  process.exit(1);
}

console.log(
  'CrabLink TV command-boundary check passed.',
);

console.log(
  'Registered commands: tv_diagnostics, tv_gateway_profile, tv_pairing_status, tv_settings_read.',
);

console.log(
  'Capability permissions: core:default.',
);

console.log(
  'Gateway and pairing commands are read-only foundation snapshots.',
);

console.log(
  'No node, operator, creator, wallet, reward, or ledger command authority exists.',
);
