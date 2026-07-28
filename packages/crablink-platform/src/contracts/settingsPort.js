/**
 * RO:WHAT — Platform-neutral read/write and read-only settings contracts.
 * RO:WHY — Shared UI needs local preferences without knowing Chrome, Tauri, or test storage.
 * RO:INTERACTS — desktop settings adapter, TV settings adapter, memory adapter later.
 * RO:INVARIANTS — settings are preferences only; read-only consumers cannot acquire write access.
 * RO:SECURITY — no wallet, ledger, receipt, key, capability, session, or entitlement truth.
 * RO:TEST — adapterContracts.test.mjs.
 */

import {
  createMethodPort,
} from './portContract.js';

const SETTINGS_METHODS =
  Object.freeze([
    'readSettings',
    'writeSettings',
  ]);

const READONLY_SETTINGS_METHODS =
  Object.freeze([
    'readSettings',
  ]);

export function createSettingsPort(
  methods,
) {
  return createMethodPort(
    'settings port',
    methods,
    SETTINGS_METHODS,
  );
}

export function createReadonlySettingsPort(
  methods,
) {
  return createMethodPort(
    'readonly settings port',
    methods,
    READONLY_SETTINGS_METHODS,
  );
}
