#!/usr/bin/env node
/**
 * RO:WHAT — Validates the CrabLink TV Phase 9C verified asset-manifest foundation.
 * RO:WHY — Image/article bytes must bind to reviewed route truth and pass full BLAKE3 verification before transport or rendering.
 * RO:INTERACTS — crablink-native-core, TV/desktop path dependencies, package scripts, and codebundle coverage.
 * RO:INVARIANTS — strict image/article manifest; bounded bytes; exact route/CID/kind/type binding; no native command yet.
 * RO:SECURITY — no network, storage, cache, wallet, ledger, entitlement, receipt, reward, ROC, or finality authority.
 * RO:TEST — node scripts/check-crablink-tv-verified-asset-manifest-boundary.mjs.
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
  const absolutePath =
    path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(
      `Missing Phase 9C source: ${relativePath}`,
    );
  }

  return fs.readFileSync(absolutePath, 'utf8');
}

function requireFragments(label, source, fragments) {
  for (const fragment of fragments) {
    if (!source.includes(fragment)) {
      throw new Error(
        `${label} missing: ${fragment}`,
      );
    }
  }
}

function stripRustComments(source) {
  return source
    .replace(/^\s*\/\/[!/].*$/gmu, '')
    .replace(/\/\*[\s\S]*?\*\//gu, '');
}

const manifest =
  read(
    'crates/crablink-native-core/src/asset_manifest.rs',
  );

const productionManifest =
  stripRustComments(
    manifest.split('#[cfg(test)]')[0],
  );

const cargo =
  read('crates/crablink-native-core/Cargo.toml');

const lib =
  read('crates/crablink-native-core/src/lib.rs');

const nativeBoundary =
  read('scripts/check-crablink-native-core-boundary.mjs');

const tvTauriCargo =
  read('apps/crablink-tv/src-tauri/Cargo.toml');

const desktopTauriCargo =
  read('apps/crablink-tauri/src-tauri/Cargo.toml');

const tvCommands =
  read('apps/crablink-tv/src-tauri/src/commands/mod.rs');

const tvLib =
  read('apps/crablink-tv/src-tauri/src/lib.rs');

const phase9bBoundary =
  read(
    'scripts/' +
      'check-crablink-tv-library-asset-detail-acceptance-boundary.mjs',
  );

const tvPackage =
  JSON.parse(read('apps/crablink-tv/package.json'));

const rootPackage =
  JSON.parse(read('package.json'));

const makeCodebundle =
  read('scripts/make_codebundle.sh');

const codebundleBoundary =
  read(
    'scripts/check-crablink-tv-codebundle-boundary.mjs',
  );

requireFragments(
  'verified asset manifest core',
  manifest,
  [
    'TV_ASSET_MANIFEST_SCHEMA',
    'TV_ASSET_MANIFEST_VERSION',
    'MAX_TV_ASSET_BYTES',
    'MAX_TV_ASSET_CONTENT_TYPE_BYTES',
    'pub enum TvAssetKind',
    'pub struct TvAssetManifestV1',
    'deny_unknown_fields',
    'pub struct ReviewedTvAssetManifest',
    'pub enum TvAssetIntegrityError',
    'pub struct VerifiedTvAssetBytes',
    'pub fn review_tv_asset_manifest',
    'pub fn verify_tv_asset_bytes',
    'validate_canonical_b3',
    'normalize_crab_url_for_gateway',
    'blake3::hash(bytes)',
    'computed_cid != manifest.content_cid',
  ],
);

requireFragments(
  'verified asset tests',
  manifest,
  [
    'image_and_article_manifests_bind_to_reviewed_route_truth',
    'strict_manifest_rejects_unknown_schema_version_and_fields',
    'route_cid_kind_and_content_type_mismatches_fail_closed',
    'complete_bytes_return_only_after_full_blake3_verification',
    'corrupt_mismatched_and_oversized_bytes_are_rejected',
  ],
);

requireFragments(
  'native-core dependency',
  cargo,
  [
    'blake3 = "1"',
  ],
);

requireFragments(
  'native-core exports',
  lib,
  [
    'pub mod asset_manifest;',
    'review_tv_asset_manifest',
    'verify_tv_asset_bytes',
    'ReviewedTvAssetManifest',
    'TvAssetIntegrityError',
    'TvAssetKind',
    'TvAssetManifestV1',
    'VerifiedTvAssetBytes',
    'MAX_TV_ASSET_BYTES',
    'TV_ASSET_MANIFEST_SCHEMA',
  ],
);

requireFragments(
  'shared native-core boundary coverage',
  nativeBoundary,
  [
    "'crates/crablink-native-core/src/asset_manifest.rs'",
    'const assetManifest =',
    "'blake3 = \"1\"'",
    "'pub mod asset_manifest;'",
    'verified asset-manifest validator',
    'assetManifest,',
  ],
);

requireFragments(
  'TV and desktop path dependencies',
  tvTauriCargo + '\n' + desktopTauriCargo,
  [
    'crablink-native-core',
  ],
);

for (const [label, pattern] of [
  ['Tauri coupling', /\btauri\b/u],
  ['network client', /\breqwest\b/u],
  ['async runtime', /\btokio\b/u],
  ['filesystem access', /std::fs/u],
  [
    'socket behavior',
    /\b(?:TcpStream|TcpListener|UdpSocket|ToSocketAddrs)\b/u,
  ],
  ['URL transport parsing', /\burl::Url\b|\bUrl::parse\b/u],
  ['unsafe block', /unsafe\s*\{/u],
]) {
  if (pattern.test(productionManifest)) {
    throw new Error(
      `Verified asset core contains forbidden ${label}.`,
    );
  }
}

for (const fragment of [
  'asset_manifest_read',
  'verified_asset',
]) {
  if (
    tvCommands.includes(fragment) ||
    tvLib.includes(fragment)
  ) {
    throw new Error(
      'Unexpected asset transport command before Phase 9E: ' +
        fragment,
    );
  }
}

requireFragments(
  'Phase 9B next marker',
  phase9bBoundary,
  [
    'PHASE9B_LIBRARY_ASSET_DETAIL_ACCEPTANCE=GREEN',
    'NEXT_PATCH=PHASE9K_LIBRARY_VERIFIED_RENDER_DISPLAY',
  ],
);

const tvScripts = tvPackage.scripts ?? {};
const rootScripts = rootPackage.scripts ?? {};

if (
  tvScripts['test:verified-asset-manifest'] !==
  (
    'cargo test --manifest-path ' +
    '../../crates/crablink-native-core/Cargo.toml ' +
    '--offline asset_manifest::tests'
  )
) {
  throw new Error(
    'TV verified-asset-manifest test script is missing or incorrect.',
  );
}

if (
  tvScripts['check:verified-asset-manifest'] !==
  (
    'node ../../scripts/' +
    'check-crablink-tv-verified-asset-manifest-boundary.mjs'
  )
) {
  throw new Error(
    'TV verified-asset-manifest boundary script is missing or incorrect.',
  );
}

for (const scriptName of [
  'test:verified-asset-manifest',
  'check:verified-asset-manifest',
]) {
  if (
    !String(tvScripts.check ?? '').includes(
      `npm run ${scriptName}`,
    )
  ) {
    throw new Error(
      'TV check chain does not include ' + scriptName,
    );
  }
}

if (
  rootScripts['tv:verified-asset-manifest:test'] !==
  (
    'cargo test --manifest-path ' +
    'crates/crablink-native-core/Cargo.toml ' +
    '--offline asset_manifest::tests'
  )
) {
  throw new Error(
    'Root verified-asset-manifest test script is missing or incorrect.',
  );
}

if (
  rootScripts['tv:verified-asset-manifest:check'] !==
  (
    'node scripts/' +
    'check-crablink-tv-verified-asset-manifest-boundary.mjs'
  )
) {
  throw new Error(
    'Root verified-asset-manifest boundary script is missing or incorrect.',
  );
}

for (const requiredPath of [
  'crates/crablink-native-core/src/asset_manifest.rs',
  'scripts/check-crablink-tv-verified-asset-manifest-boundary.mjs',
]) {
  if (
    !makeCodebundle.includes(requiredPath) &&
    !codebundleBoundary.includes(requiredPath)
  ) {
    throw new Error(
      `Future codebundle coverage missing: ${requiredPath}`,
    );
  }
}

console.log(
  'CrabLink TV verified asset-manifest boundary passed.',
);

console.log(
  'Manifest: strict image/article DTO bound to reviewed crab URL, B3 CID, asset kind, content type, and byte length.',
);

console.log(
  'Integrity: bounded bytes return only after full BLAKE3 digest equality.',
);

console.log(
  'Rejection: unknown fields, mismatches, empty content, oversize, length drift, and corruption fail closed.',
);

console.log(
  'Authority: deterministic shared Rust foundation remains; no gateway fetch, storage, cache, wallet, ledger, entitlement, receipt, reward, ROC, or finality behavior.',
);

console.log(
  'PHASE9C_VERIFIED_ASSET_MANIFEST_FOUNDATION=GREEN',
);

console.log(
  'NEXT_PATCH=PHASE9K_LIBRARY_VERIFIED_RENDER_DISPLAY',
);
