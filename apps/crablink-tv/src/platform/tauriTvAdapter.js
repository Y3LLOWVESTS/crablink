/**
 * RO:WHAT — Fixed-command Tauri adapter ports for CrabLink TV read-only host facts.
 * RO:WHY — TV React must consume narrow shared contracts rather than call invoke directly.
 * RO:INTERACTS — @crablink/platform, tv_asset_manifest_check, tv_catalog_read, tv_diagnostics, tv_gateway_profile, tv_settings_read.
 * RO:INVARIANTS — fixed commands only; no arbitrary URL, session, node, wallet, ledger, reward, or catalog-success authority.
 * RO:SECURITY — no generic invoke export and no caller-controlled command name.
 * RO:TEST — check-crablink-platform-contracts-boundary.mjs and TV full acceptance.
 */

import {
  invoke,
} from '@tauri-apps/api/core';

import {
  createCatalogPort,
  createDiagnosticsPort,
  createGatewayHealthPort,
  createGatewayProfilePort,
  createReadonlySettingsPort,
} from '../../../../packages/crablink-platform/src/index.js';

function getDiagnostics() {
  return invoke(
    'tv_diagnostics',
  );
}

function checkGatewayHealth() {
  return invoke(
    'tv_gateway_health',
  );
}

function readCatalog() {
  return invoke(
    'tv_catalog_read',
  );
}

function checkAssetManifest(request) {
  return invoke(
    'tv_asset_manifest_check',
    { request },
  );
}

function readGatewayProfile() {
  return invoke(
    'tv_gateway_profile',
  );
}

function readSettings() {
  return invoke(
    'tv_settings_read',
  );
}

export const tvDiagnosticsPort =
  createDiagnosticsPort({
    getDiagnostics,
  });

export const tvGatewayHealthPort =
  createGatewayHealthPort({
    checkGatewayHealth,
  });

export const tvCatalogPort =
  createCatalogPort({
    readCatalog,
  });

export const tvGatewayProfilePort =
  createGatewayProfilePort({
    readGatewayProfile,
  });

export const tvSettingsPort =
  createReadonlySettingsPort({
    readSettings,
  });

export const tvAssetManifestAdapter =
  Object.freeze({
    checkAssetManifest,
  });
