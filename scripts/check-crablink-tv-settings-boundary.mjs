#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(
  fileURLToPath(import.meta.url),
);

const root = path.resolve(scriptDir, '..');

const paths = {
  model:
    'apps/crablink-tv/src/settings/tvPreferences.js',
  tests:
    'apps/crablink-tv/src/settings/tvPreferences.test.mjs',
  hook:
    'apps/crablink-tv/src/settings/useTvPreferences.js',
  panel:
    'apps/crablink-tv/src/settings/TvSettingsPanel.jsx',
  app:
    'apps/crablink-tv/src/app/TvApp.jsx',
  rust:
    'apps/crablink-tv/src-tauri/src/commands/settings.rs',
  tvPackage:
    'apps/crablink-tv/package.json',
  rootPackage:
    'package.json',
};

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(
      `Missing TV settings source: ${relativePath}`,
    );
  }

  return fs.readFileSync(absolutePath, 'utf8');
}

const model = read(paths.model);
const tests = read(paths.tests);
const hook = read(paths.hook);
const panel = read(paths.panel);
const app = read(paths.app);
const rust = read(paths.rust);

const tvPackage = JSON.parse(
  read(paths.tvPackage),
);

const rootPackage = JSON.parse(
  read(paths.rootPackage),
);

for (const fragment of [
  "'crablink.theme.mode'",
  "'crablink.tv.resourceMode'",
  "'crablink.tv.verificationEnabled'",
  "'dark'",
  "'light'",
  "'system'",
  "'low'",
  "'balanced'",
  "'plugged-in'",
  'export function readTvPreferences',
  'export function writeTvThemeMode',
  'export function writeTvResourceMode',
  'export function writeVerificationEnabled',
  'return true;',
]) {
  if (!model.includes(fragment)) {
    throw new Error(
      `TV preference model is missing: ${fragment}`,
    );
  }
}

for (const fragment of [
  'first run defaults to dark balanced participation',
  'invalid stored values fail closed to safe defaults',
  'theme resolution follows system only in system mode',
  'writes and rereads supported preferences',
  'resource descriptions remain bounded and truthful',
]) {
  if (!tests.includes(fragment)) {
    throw new Error(
      `TV preference tests are missing: ${fragment}`,
    );
  }
}

for (const fragment of [
  'export function useTvPreferences',
  'document.documentElement.dataset.themeMode',
  'document.documentElement.dataset.theme',
  'document.documentElement.style.colorScheme',
  "mediaQuery.addEventListener(",
  'setResourceMode',
  'setVerificationEnabled',
]) {
  if (!hook.includes(fragment)) {
    throw new Error(
      `TV preference hook is missing: ${fragment}`,
    );
  }
}

for (const fragment of [
  'Local device preferences',
  'data-tv-focusable="true"',
  'aria-pressed=',
  'Verification resources',
  'Participation preference',
  'Micronode attachment: not active in this build',
  'No verification work was started.',
  'No evidence or ROC was created.',
]) {
  if (!panel.includes(fragment)) {
    throw new Error(
      `TV settings panel is missing: ${fragment}`,
    );
  }
}

for (const fragment of [
  'useTvPreferences();',
  "activeSectionId === 'settings'",
  '<TvSettingsPanel',
  'onThemeMode={setThemeMode}',
  'onResourceMode={setResourceMode}',
  'setVerificationEnabled',
]) {
  if (!app.includes(fragment)) {
    throw new Error(
      `TV shell settings integration is missing: ${fragment}`,
    );
  }
}

for (const fragment of [
  '"crablink.tv.settings-snapshot.v2"',
  '"android-tv-client"',
  'android_initialized: true',
  'micronode_attached: false',
  '"local-ui-preferences-only"',
  '["dark", "light", "system"]',
  '["low", "balanced", "plugged-in"]',
  'android_tv_settings_are_truthful_and_non_authoritative',
]) {
  if (!rust.includes(fragment)) {
    throw new Error(
      `Native TV settings snapshot is missing: ${fragment}`,
    );
  }
}

const combined = [
  model,
  hook,
  panel,
  app,
  rust,
].join('\n');

for (const forbidden of [
  "invoke('start_micronode",
  "invoke('claim_reward",
  "invoke('wallet",
  "invoke('ledger",
  'confirmedRocBalance',
  'privateKey',
  'seedPhrase',
  'gatewayUrl:',
  'unlimited verification',
]) {
  if (combined.includes(forbidden)) {
    throw new Error(
      `Forbidden TV settings authority found: ${forbidden}`,
    );
  }
}

const tvScripts = tvPackage.scripts ?? {};
const rootScripts = rootPackage.scripts ?? {};

if (
  tvScripts['test:settings'] !==
  'node --test src/settings/tvPreferences.test.mjs'
) {
  throw new Error(
    'TV package test:settings command is missing or incorrect.',
  );
}

if (
  tvScripts['check:settings'] !==
  'node ../../scripts/check-crablink-tv-settings-boundary.mjs'
) {
  throw new Error(
    'TV package check:settings command is missing or incorrect.',
  );
}

if (
  rootScripts['tv:settings:test'] !==
  'npm --prefix apps/crablink-tv run test:settings'
) {
  throw new Error(
    'Root tv:settings:test command is missing or incorrect.',
  );
}

if (
  rootScripts['tv:settings:check'] !==
  'node scripts/check-crablink-tv-settings-boundary.mjs'
) {
  throw new Error(
    'Root tv:settings:check command is missing or incorrect.',
  );
}

console.log(
  'CrabLink TV settings boundary passed.',
);

console.log(
  'Theme modes: dark, light, system.',
);

console.log(
  'Resource modes: low, balanced, plugged-in.',
);

console.log(
  'Participation default: enabled as local scheduling intent.',
);

console.log(
  'Micronode attachment: truthfully false.',
);

console.log(
  'Reward, ROC, wallet, receipt, and ledger mutation authority: absent.',
);
