import {
  invoke,
} from '@tauri-apps/api/core';

import {
  createDiagnosticsPort,
} from '../../../../packages/crablink-platform/src/index.js';

function getDiagnostics() {
  return invoke('app_diagnostics');
}

export const androidDiagnosticsPort =
  createDiagnosticsPort({
    getDiagnostics,
  });

export function createUnavailableAdapterResult(
  surface,
) {
  return Object.freeze({
    schema: 'crablink.android.unavailable.v1',
    surface: String(surface || 'unknown'),
    state: 'unavailable',
    reason: 'not-connected-in-scaffold',
    authoritative: false,
  });
}
