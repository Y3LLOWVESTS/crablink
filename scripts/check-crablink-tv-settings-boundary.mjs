#!/usr/bin/env node
/**
 * RO:WHAT — Validates CrabLink TV local preferences and the typed redacted native network snapshot.
 * RO:WHY — Settings must expose useful connection posture without leaking origins or gaining backend authority.
 * RO:INTERACTS — TV preference model/hook/panel, TV settings command, shared native settings profile.
 * RO:INVARIANTS — dark default; bounded resource choices; development visibly marked; origins redacted.
 * RO:SECURITY — no node start, reward evidence, ROC, wallet, ledger, receipt, session, or endpoint authority.
 * RO:TEST — node scripts/check-crablink-tv-settings-boundary.mjs.
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

function read(relativePath) {
  const absolutePath =
    path.join(
      root,
      relativePath,
    );

  if (!fs.existsSync(absolutePath)) {
    throw new Error(
      `Missing TV settings source: ${relativePath}`,
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

function rejectFragments(
  label,
  source,
  fragments,
) {
  for (const fragment of fragments) {
    if (source.includes(fragment)) {
      throw new Error(
        `${label} contains forbidden behavior: ${fragment}`,
      );
    }
  }
}

const model = read(
  'apps/crablink-tv/src/settings/tvPreferences.js',
);

const tests = read(
  'apps/crablink-tv/src/settings/tvPreferences.test.mjs',
);

const hook = read(
  'apps/crablink-tv/src/settings/useTvPreferences.js',
);

const panel = read(
  'apps/crablink-tv/src/settings/TvSettingsPanel.jsx',
);

const app = read(
  'apps/crablink-tv/src/app/TvApp.jsx',
);

const rust = read(
  'apps/crablink-tv/src-tauri/src/commands/settings.rs',
);

const gateway = read(
  'apps/crablink-tv/src-tauri/src/commands/gateway.rs',
);

const sharedSettings = read(
  'crates/crablink-native-core/src/settings_profile.rs',
);

const tvPackage = JSON.parse(
  read(
    'apps/crablink-tv/package.json',
  ),
);

const rootPackage = JSON.parse(
  read(
    'package.json',
  ),
);

requireFragments(
  'TV preference model',
  model,
  [
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
  ],
);

requireFragments(
  'TV preference tests',
  tests,
  [
    'first run defaults to dark balanced participation',
    'invalid stored values fail closed to safe defaults',
    'theme resolution follows system only in system mode',
    'writes and rereads supported preferences',
    'resource descriptions remain bounded and truthful',
  ],
);

requireFragments(
  'TV preference hook',
  hook,
  [
    'export function useTvPreferences',
    'document.documentElement.dataset.themeMode',
    'document.documentElement.dataset.theme',
    'document.documentElement.style.colorScheme',
    'mediaQuery.addEventListener(',
    'setResourceMode',
    'setVerificationEnabled',
  ],
);

requireFragments(
  'TV settings panel',
  panel,
  [
    'Local device preferences',
    'data-tv-focusable="true"',
    'aria-pressed=',
    'Verification resources',
    'Participation preference',
    'Micronode attachment: not active in this build',
    'No verification work was started.',
    'No evidence or ROC was created.',
    'TvNetworkReadinessPanel',
    '<TvNetworkReadinessPanel',
    'onActivity={onActivity}',
  ],
);

requireFragments(
  'TV shell settings integration',
  app,
  [
    'useTvPreferences();',
    "activeSectionId === 'settings'",
    '<TvSettingsPanel',
    'onThemeMode={setThemeMode}',
    'onResourceMode={setResourceMode}',
    'setVerificationEnabled',
    'onActivity={setActivityMessage}',
  ],
);

requireFragments(
  'Shared native network settings profile',
  sharedSettings,
  [
    'pub struct NativeNetworkSettingsProfile',
    'pub fn normalize_request_timeout_ms',
    'pub fn review_native_network_settings_profile',
    'NETWORK_SETTINGS_PROFILE_SCHEMA',
    'DEFAULT_REQUEST_TIMEOUT_MS',
    'MIN_REQUEST_TIMEOUT_MS',
    'MAX_REQUEST_TIMEOUT_MS',
    '"Managed HTTPS gateway"',
    '"Private development LAN"',
    'gateway_origin_disclosure:',
    '"redacted"',
    'request_timeout_defaults_and_clamps',
    'managed_release_profile_is_ready_and_redacted',
    'development_lan_profile_is_visibly_marked',
    'unconfigured_and_mismatched_profiles_fail_closed',
  ],
);

requireFragments(
  'TV native settings snapshot',
  rust,
  [
    'pub struct TvSettingsSnapshot',
    '"crablink.tv.settings-snapshot.v3"',
    '"android-tv-client"',
    'review_native_network_settings_profile',
    'settings_snapshot_for_gateway',
    'gateway_display_label',
    'gateway_connection_allowed',
    'gateway_development_profile',
    'gateway_origin_disclosure',
    'request_timeout_ms',
    'release_https_required',
    'gateway_error_code',
    'android_initialized: true',
    'privacy_mode: true',
    'micronode_attached: false',
    '"local-ui-preferences-only"',
    'unconfigured_settings_are_truthful_and_non_authoritative',
    'managed_release_settings_are_ready_without_origin_disclosure',
    'development_lan_settings_are_visibly_marked_and_redacted',
    'invalid_gateway_settings_fail_closed_and_remain_redacted',
  ],
);

requireFragments(
  'TV gateway shared timeout adapter',
  gateway,
  [
    'normalize_request_timeout_ms',
    'let timeout =',
    'GatewayEnvironmentProfile',
    'pairing_path: PAIRING_PATH',
  ],
);

if (
  gateway.includes(
    'fn normalize_timeout',
  )
) {
  throw new Error(
    'TV gateway still owns duplicate request-timeout validation.',
  );
}

const publicSettingsFields = [
  ...rust.matchAll(
    /pub\s+([A-Za-z0-9_]+)\s*:/gu,
  ),
].map(
  (match) => match[1],
);

const exposedEndpointFields =
  publicSettingsFields.filter(
    (field) =>
      field === 'origin' ||
      field === 'url' ||
      field.endsWith('_origin') ||
      field.endsWith('_url'),
  );

if (exposedEndpointFields.length > 0) {
  throw new Error(
    'TV settings snapshot exposes endpoint fields: ' +
      exposedEndpointFields.join(', '),
  );
}

rejectFragments(
  'Shared native network settings profile',
  sharedSettings,
  [
    'tauri::',
    'reqwest::',
    'std::fs',
    'TcpStream',
    'TcpListener',
    'UdpSocket',
    'localStorage',
    'sessionStorage',
    'session_token',
    'wallet_mutation',
    'ledger_mutation',
    'append_ledger',
    'create_receipt',
    'mint_roc',
    'burn_roc',
    'private_key',
    'seed_phrase',
  ],
);

rejectFragments(
  'TV native settings snapshot',
  rust,
  [
    'gateway.origin',
    'origin.clone',
    'reqwest::',
    'create_session',
    'issue_session',
    'start_micronode',
    'append_ledger',
    'create_receipt',
    'mint_roc',
    'burn_roc',
    'wallet_mutation: true',
    'ledger_mutation: true',
  ],
);

const tvScripts =
  tvPackage.scripts ?? {};

const rootScripts =
  rootPackage.scripts ?? {};

if (
  tvScripts['test:settings'] !==
  'node --test src/settings/tvPreferences.test.mjs'
) {
  throw new Error(
    'TV package test:settings command is missing or incorrect.',
  );
}

if (
  !String(
    tvScripts['check:settings'] ?? '',
  ).endsWith(
    'check-crablink-tv-settings-boundary.mjs',
  )
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
  'Native settings profile: typed, timeout-bounded, origin-redacted, and fail-closed.',
);

console.log(
  'Gateway labels: managed HTTPS or visibly marked private development LAN.',
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
  'Network execution is explicit and fixed-command only; polling, session, reward, ROC, wallet, receipt, and ledger authority: absent.',
);
