/**
 * RO:WHAT — Desktop settings adapter implementing the shared settings port.
 * RO:WHY — Desktop React needs a stable preference boundary around native settings.
 * RO:INTERACTS — @crablink/platform and read_settings/write_settings.
 * RO:INVARIANTS — settings are local preferences, not wallet, ledger, receipt, or entitlement truth.
 * RO:SECURITY — fixed commands only; no dynamic authority or secret storage is added here.
 * RO:TEST — check-crablink-platform-contracts-boundary.mjs.
 */

import {
  createSettingsPort,
} from '../../../../packages/crablink-platform/src/index.js';

import {
  callTauri,
} from '../platform/tauriPlatform.js';

export function readSettings() {
  return callTauri(
    'read_settings',
  );
}

export function writeSettings(
  settings,
) {
  return callTauri(
    'write_settings',
    {
      settings,
    },
  );
}

export const settingsPort =
  createSettingsPort({
    readSettings,
    writeSettings,
  });
