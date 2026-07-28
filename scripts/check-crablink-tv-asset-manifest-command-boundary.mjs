#!/usr/bin/env node
/**
 * RO:WHAT — Validates the CrabLink TV Phase 9D asset-manifest native command.
 * RO:WHY — The TV command must only delegate local integrity review to crablink-native-core.
 * RO:INTERACTS — TV Tauri registry, command boundary, native-core asset manifest, and package scripts.
 * RO:INVARIANTS — one fixed command; request object only; no provider URL/path/command input; result returns facts, not bytes.
 * RO:SECURITY — no network, storage, cache, wallet, ledger, entitlement, receipt, reward, ROC, or finality authority.
 * RO:TEST — node scripts/check-crablink-tv-asset-manifest-command-boundary.mjs.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root =
  path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
  );

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing Phase 9D source: ${relativePath}`);
  }

  return fs.readFileSync(absolutePath, 'utf8');
}

function requireFragments(label, source, fragments) {
  for (const fragment of fragments) {
    if (!source.includes(fragment)) {
      throw new Error(`${label} missing: ${fragment}`);
    }
  }
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/^\s*\/\/[!/]?.*$/gmu, '');
}

function extractStructBody(source, structName) {
  const marker = `pub struct ${structName} {`;
  const start = source.indexOf(marker);

  if (start === -1) {
    throw new Error(`Missing struct: ${structName}`);
  }

  const bodyStart = source.indexOf('{', start) + 1;
  const bodyEnd = source.indexOf('\n}', bodyStart);

  if (bodyStart < 1 || bodyEnd === -1) {
    throw new Error(`Could not parse struct body: ${structName}`);
  }

  return source.slice(bodyStart, bodyEnd);
}

const command =
  read('apps/crablink-tv/src-tauri/src/commands/asset_manifest.rs');

const productionCommand =
  stripComments(command.split('#[cfg(test)]')[0]);

const resultBody =
  extractStructBody(productionCommand, 'TvAssetManifestCheckResult');

const coreManifest =
  read('crates/crablink-native-core/src/asset_manifest.rs');

const coreLib =
  read('crates/crablink-native-core/src/lib.rs');

const commands =
  read('apps/crablink-tv/src-tauri/src/commands/mod.rs');

const lib =
  read('apps/crablink-tv/src-tauri/src/lib.rs');

const commandBoundary =
  read('scripts/check-crablink-tv-command-boundary.mjs');

const phase9cBoundary =
  read('scripts/check-crablink-tv-verified-asset-manifest-boundary.mjs');

const testHelper =
  read('scripts/test-crablink-tv-asset-manifest-command.sh');

const tvPackage =
  JSON.parse(read('apps/crablink-tv/package.json'));

const rootPackage =
  JSON.parse(read('package.json'));

const makeCodebundle =
  read('scripts/make_codebundle.sh');

const codebundleBoundary =
  read('scripts/check-crablink-tv-codebundle-boundary.mjs');

requireFragments(
  'native-core content-CID helper',
  coreManifest + '\n' + coreLib,
  [
    'pub fn compute_tv_asset_content_cid',
    'format!("b3:{}"',
    'compute_tv_asset_content_cid',
  ],
);

requireFragments(
  'asset manifest command',
  command,
  [
    'CHECK_REQUEST_SCHEMA',
    'CHECK_RESULT_SCHEMA',
    'CHECK_ERROR_SCHEMA',
    'pub struct TvAssetManifestCheckRequest',
    'deny_unknown_fields',
    'Deserialize, Serialize',
    'pub struct TvAssetManifestCheckResult',
    'pub struct TvAssetManifestCheckError',
    'pub(crate) fn perform_asset_manifest_check',
    'pub fn tv_asset_manifest_check',
    'review_tv_asset_manifest',
    'verify_tv_asset_bytes',
    'MAX_TV_ASSET_BYTES',
    'asset_bytes',
    'result_for_manifest',
  ],
);

requireFragments(
  'asset manifest command tests',
  command,
  [
    'accepts_verified_image_and_article_manifest_checks',
    'rejects_corrupt_bytes_without_returning_payload',
    'rejects_route_kind_and_content_type_mismatches',
    'rejects_empty_or_bad_request_schema',
    'request_contract_denies_unknown_authority_fields',
  ],
);

requireFragments(
  'command module registry',
  commands,
  ['pub(crate) mod asset_manifest;'],
);

requireFragments(
  'Tauri command registry',
  lib,
  ['commands::asset_manifest::tv_asset_manifest_check'],
);

requireFragments(
  'TV command boundary update',
  commandBoundary,
  [
    'exactly eight narrow client commands',
    "'tv_asset_manifest_check'",
    "'asset_manifest'",
    'Registered commands: tv_asset_manifest_check, tv_catalog_read',
  ],
);

requireFragments(
  'Phase 9C successor marker',
  phase9cBoundary,
  [
    'PHASE9C_VERIFIED_ASSET_MANIFEST_FOUNDATION=GREEN',
    'NEXT_PATCH=PHASE9K_LIBRARY_VERIFIED_RENDER_DISPLAY',
  ],
);

for (const [label, pattern] of [
  ['network client', /\breqwest\b/u],
  ['async runtime', /\btokio\b/u],
  ['filesystem access', /std::fs/u],
  ['socket behavior', /\b(?:TcpStream|TcpListener|UdpSocket|ToSocketAddrs)\b/u],
  ['URL parsing', /\burl::Url\b|\bUrl::parse\b/u],
  ['HTTP GET', /\.get\s*\(/u],
  ['HTTP POST', /\.post\s*\(/u],
  ['generic command dispatch', /\binvoke\s*\(/u],
  ['unsafe block', /unsafe\s*\{/u],
]) {
  if (pattern.test(productionCommand)) {
    throw new Error(`asset manifest command contains forbidden ${label}`);
  }
}

for (const [label, pattern] of [
  ['provider URL', /\b(?:fetch_url|gateway_url|provider_url)\b/iu],
  ['external origin', /\borigin\b/iu],
  ['path authority', /\b(?:file_path|asset_path|provider_path|endpoint)\b/iu],
  ['storage', /\b(?:localStorage|sessionStorage|cache|storage)\b/iu],
  ['wallet authority', /\bwallet\b/iu],
  ['ledger authority', /\bledger\b/iu],
  ['receipt authority', /\breceipt\b/iu],
  ['reward authority', /\breward\b/iu],
  ['ROC authority', /\broc\b/iu],
  ['entitlement authority', /\bentitlement\b/iu],
  ['finality authority', /\bfinality\b/iu],
]) {
  if (pattern.test(productionCommand)) {
    throw new Error(`asset manifest command contains forbidden ${label}`);
  }
}

if (/^\s*pub\s+(?:raw_)?bytes\s*:/mu.test(resultBody)) {
  throw new Error('asset manifest command result must not return raw bytes');
}

requireFragments(
  'temporary dist test helper',
  testHelper,
  [
    'CRABLINK_TV_ASSET_MANIFEST_COMMAND_TEST=STARTED',
    'apps/crablink-tv/dist',
    'cargo test',
    'commands::asset_manifest::tests',
    'CRABLINK_TV_ASSET_MANIFEST_COMMAND_TEST=GREEN',
  ],
);

const tvScripts = tvPackage.scripts ?? {};
const rootScripts = rootPackage.scripts ?? {};

if (
  tvScripts['test:asset-manifest-command'] !==
  '../../scripts/test-crablink-tv-asset-manifest-command.sh'
) {
  throw new Error(
    'TV asset-manifest command test script is missing or incorrect.',
  );
}

if (
  tvScripts['check:asset-manifest-command'] !==
  'node ../../scripts/check-crablink-tv-asset-manifest-command-boundary.mjs'
) {
  throw new Error(
    'TV asset-manifest command boundary script is missing or incorrect.',
  );
}

for (const step of [
  'npm run test:asset-manifest-command',
  'npm run check:asset-manifest-command',
]) {
  if (!String(tvScripts.check ?? '').includes(step)) {
    throw new Error(`TV check chain does not include ${step}.`);
  }
}

if (
  rootScripts['tv:asset-manifest-command:test'] !==
  'scripts/test-crablink-tv-asset-manifest-command.sh'
) {
  throw new Error(
    'Root asset-manifest command test script is missing or incorrect.',
  );
}

if (
  rootScripts['tv:asset-manifest-command:check'] !==
  'node scripts/check-crablink-tv-asset-manifest-command-boundary.mjs'
) {
  throw new Error(
    'Root asset-manifest command boundary script is missing or incorrect.',
  );
}

for (const requiredPath of [
  'apps/crablink-tv/src-tauri/src/commands/asset_manifest.rs',
  'scripts/check-crablink-tv-asset-manifest-command-boundary.mjs',
  'scripts/test-crablink-tv-asset-manifest-command.sh',
]) {
  if (
    !makeCodebundle.includes(requiredPath) &&
    !codebundleBoundary.includes(requiredPath)
  ) {
    throw new Error(`Future codebundle coverage missing: ${requiredPath}`);
  }
}

console.log('CrabLink TV asset-manifest command boundary passed.');
console.log(
  'Command: tv_asset_manifest_check delegates manifest and byte review to crablink-native-core.',
);
console.log(
  'Input: request object only; no provider URL, origin, path, wallet, ledger, receipt, reward, ROC, entitlement, or finality authority.',
);
console.log('Output: reviewed render facts only; raw bytes are not returned.');
console.log('Transport: no gateway fetch was added; frontend adapter wiring is owned by Phase 9E.');
console.log('PHASE9D_TV_ASSET_MANIFEST_COMMAND=GREEN');
console.log('NEXT_PATCH=PHASE9K_LIBRARY_VERIFIED_RENDER_DISPLAY');
