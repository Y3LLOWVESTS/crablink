#!/usr/bin/env node
/**
 * RO:WHAT — Validates the first CrabLink shared native-core extraction.
 * RO:WHY — Confirmed-ROC validation must have one pure Rust owner used by desktop and compiled by TV.
 * RO:INTERACTS — crablink-native-core, both Tauri Cargo manifests, desktop Phase 22 support, codebundle tooling.
 * RO:INVARIANTS — desktop compatibility imports stay stable; TV gains no new command.
 * RO:SECURITY — shared core has no Tauri, Android, transport, storage, wallet, ledger, or finality authority.
 * RO:TEST — node scripts/check-crablink-native-core-boundary.mjs.
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
    path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(
      `Missing native-core source: ${relativePath}`,
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

const crateCargo =
  read(
    'crates/crablink-native-core/Cargo.toml',
  );

const crateLib =
  read(
    'crates/crablink-native-core/src/lib.rs',
  );

const assetManifest =
  read(
    'crates/crablink-native-core/src/asset_manifest.rs',
  );

const b3 =
  read(
    'crates/crablink-native-core/src/b3.rs',
  );

const crabUrl =
  read(
    'crates/crablink-native-core/src/crab_url.rs',
  );

const gatewayProfile =
  read(
    'crates/crablink-native-core/src/gateway_profile.rs',
  );

const pairingDto =
  read(
    'crates/crablink-native-core/src/pairing_dto.rs',
  );

const settingsProfile =
  read(
    'crates/crablink-native-core/src/settings_profile.rs',
  );

const confirmedRoc =
  read(
    'crates/crablink-native-core/src/confirmed_roc.rs',
  );

const desktopCompatibility =
  read(
    'apps/crablink-tauri/src-tauri/src/confirmed_roc.rs',
  );

const desktopResolver =
  read(
    'apps/crablink-tauri/src-tauri/src/commands/resolve.rs',
  );

const tvGateway =
  read(
    'apps/crablink-tv/src-tauri/src/commands/gateway.rs',
  );

const tvPairing =
  read(
    'apps/crablink-tv/src-tauri/src/commands/pairing.rs',
  );

const tvPairingBegin =
  read(
    'apps/crablink-tv/src-tauri/src/commands/pairing_begin.rs',
  );

const javascriptCrabParser =
  read(
    'packages/crablink-core/src/crabUrl.js',
  );

const desktopCargo =
  read(
    'apps/crablink-tauri/src-tauri/Cargo.toml',
  );

const tvCargo =
  read(
    'apps/crablink-tv/src-tauri/Cargo.toml',
  );

const desktopLib =
  read(
    'apps/crablink-tauri/src-tauri/src/lib.rs',
  );

const tvLib =
  read(
    'apps/crablink-tv/src-tauri/src/lib.rs',
  );

const phase22Test =
  read(
    'apps/crablink-tauri/src-tauri/tests/' +
      'phase22_confirmed_roc_projection.rs',
  );

const oapObject =
  read(
    'apps/crablink-tauri/src-tauri/src/commands/' +
      'oap_object.rs',
  );

const userNodeVerification =
  read(
    'apps/crablink-tauri/src-tauri/src/commands/' +
      'user_node_verification.rs',
  );

const moderationReview =
  read(
    'apps/crablink-tauri/src-tauri/src/commands/' +
      'operator_moderation_review.rs',
  );

const persistenceReview =
  read(
    'apps/crablink-tauri/src-tauri/src/commands/' +
      'operator_persistence_review.rs',
  );

const assetCommands =
  read(
    'apps/crablink-tauri/src-tauri/src/commands/' +
      'assets.rs',
  );

const makeCodebundle =
  read(
    'scripts/make_codebundle.sh',
  );

const codebundleBoundary =
  read(
    'scripts/check-crablink-tv-codebundle-boundary.mjs',
  );


requireFragments(
  'native crate package',
  crateCargo,
  [
    'name = "crablink-native-core"',
    'rust-version = "1.80"',
    'serde = { version = "1", features = ["derive"] }',
    'serde_json = "1"',
    'blake3 = "1"',
  ],
);

requireFragments(
  'native crate entry',
  crateLib,
  [
    '#![forbid(unsafe_code)]',
    'pub mod asset_manifest;',
    'pub mod b3;',
    'pub mod crab_url;',
    'pub mod gateway_profile;',
    'pub mod pairing_dto;',
    'pub mod settings_profile;',
    'pub mod confirmed_roc;',
    'validate_canonical_b3',
    'normalize_canonical_b3',
    'is_canonical_b3',
    'normalize_crab_url_for_gateway',
    'CRAB_URL_SCHEME',
    'MAX_CRAB_URL_BYTES',
    'GatewayEnvironmentProfile',
    'is_private_lan_host',
    'is_loopback_or_unspecified_host',
    'is_ipv6_unicast_link_local',
    'build_pairing_begin_request',
    'review_pairing_begin_response',
    'TvPairingBeginRequest',
    'TvPairingBeginResponse',
    'TvPairingContractError',
    'NativeNetworkSettingsProfile',
    'normalize_request_timeout_ms',
    'review_native_network_settings_profile',
    'parse_confirmed_roc_projection',
    'ConfirmedRocProjectionV1',
    'review_tv_asset_manifest',
    'verify_tv_asset_bytes',
    'TvAssetManifestV1',
    'TvAssetIntegrityError',
  ],
);

requireFragments(
  'verified asset-manifest validator',
  assetManifest,
  [
    'pub struct TvAssetManifestV1',
    'deny_unknown_fields',
    'pub enum TvAssetKind',
    'pub enum TvAssetIntegrityError',
    'pub fn review_tv_asset_manifest',
    'pub fn verify_tv_asset_bytes',
    'validate_canonical_b3',
    'normalize_crab_url_for_gateway',
    'blake3::hash(bytes)',
    'image_and_article_manifests_bind_to_reviewed_route_truth',
    'complete_bytes_return_only_after_full_blake3_verification',
    'corrupt_mismatched_and_oversized_bytes_are_rejected',
  ],
);

requireFragments(
  'shared canonical B3 validator',
  b3,
  [
    'pub const B3_PREFIX',
    'pub const B3_DIGEST_HEX_LENGTH',
    'pub fn is_canonical_b3',
    'pub fn validate_canonical_b3',
    'pub fn normalize_canonical_b3',
    'canonical_lowercase_b3_is_accepted',
    'raw_uppercase_short_and_spaced_values_reject',
    'normalization_trims_only_outer_whitespace',
  ],
);

requireFragments(
  'shared crab URL ingress validator',
  crabUrl,
  [
    'pub const CRAB_URL_SCHEME',
    'pub const MAX_CRAB_URL_BYTES',
    'pub fn normalize_crab_url_for_gateway',
    'trimmed.len() > MAX_CRAB_URL_BYTES',
    "trimmed.contains('\\n')",
    "trimmed.contains('\\r')",
    'trimmed.starts_with(CRAB_URL_SCHEME)',
    'valid_crab_inputs_are_trimmed_without_route_reclassification',
    'wrong_scheme_newlines_and_oversize_values_reject',
    'byte_limit_and_ingress_only_posture_are_preserved',
  ],
);

requireFragments(
  'desktop shared crab URL ingress migration',
  desktopResolver,
  [
    (
      'use crablink_native_core::crab_url::' +
      'normalize_crab_url_for_gateway;'
    ),
    'normalize_crab_url_for_gateway(',
  ],
);

for (const forbidden of [
  'fn validate_crab_url',
  '.starts_with("crab://")',
  'trimmed.len() > 2048',
]) {
  if (desktopResolver.includes(forbidden)) {
    throw new Error(
      'Desktop resolver still owns duplicate crab URL ' +
        `validation: ${forbidden}`,
    );
  }
}

requireFragments(
  'JavaScript route-classification owner',
  javascriptCrabParser,
  [
    'parseCrabInput',
    'parseTypedAssetBody',
    'normalizeTypedAssetUrl',
    'normalizeSiteName',
  ],
);

for (const forbidden of [
  'parseTypedAssetBody',
  'normalizeTypedAssetUrl',
  'normalizeSiteName',
  'BUILTIN',
  'assetKind',
]) {
  if (crabUrl.includes(forbidden)) {
    throw new Error(
      'Native crab URL ingress validator acquired ' +
        `route-classification behavior: ${forbidden}`,
    );
  }
}

requireFragments(
  'shared gateway profile and host validation',
  gatewayProfile,
  [
    'pub enum GatewayEnvironmentProfile',
    'pub fn from_label',
    'pub const fn as_str',
    'pub fn is_private_lan_host',
    'pub fn is_loopback_or_unspecified_host',
    'pub fn is_ipv6_unicast_link_local',
    'gateway_profile_labels_are_exact',
    'private_ipv4_and_mdns_hosts_are_accepted',
    'loopback_unspecified_and_public_hosts_reject',
    'ipv6_unique_local_and_link_local_hosts_are_accepted',
    'ipv6_link_local_prefix_boundary_is_exact',
  ],
);

requireFragments(
  'TV shared gateway profile migration',
  tvGateway,
  [
    'use crablink_native_core::gateway_profile::',
    'GatewayEnvironmentProfile::from_label',
    'is_loopback_or_unspecified_host',
    'is_private_lan_host',
    'parsed.origin().ascii_serialization()',
  ],
);

for (const forbidden of [
  'fn is_loopback_or_unspecified(',
  'fn is_ipv6_unicast_link_local(',
  'fn is_private_lan_host(',
  'address.is_private()',
  'first_segment & 0xfe00',
]) {
  if (tvGateway.includes(forbidden)) {
    throw new Error(
      'TV gateway still owns duplicated host posture: ' +
        forbidden,
    );
  }
}

requireFragments(
  'shared pairing DTO validator',
  pairingDto,
  [
    'pub struct TvPairingBeginRequest',
    'pub struct TvPairingBeginResponse',
    'pub struct TvPairingContractError',
    'deny_unknown_fields',
    'pub fn build_pairing_begin_request',
    'pub fn review_pairing_begin_response',
    'INITIAL_TV_SESSION_SCOPES',
    'MAX_PAIRING_BEGIN_RESPONSE_BYTES',
    'request_normalizes_name_and_uses_fixed_read_only_scopes',
    'waiting_response_is_strict_and_sessionless',
    'oversize_unknown_fields_and_wrong_authority_reject',
    'bad_code_expiry_and_status_retryability_reject',
  ],
);

requireFragments(
  'TV thin pairing DTO adapter',
  tvPairing,
  [
    'pub use crablink_native_core::pairing_dto',
    'build_pairing_begin_request',
    'pairing_begin_request_for_gateway',
    'pairing_status_for_gateway',
    'session_present: false',
  ],
);

requireFragments(
  'TV pairing transport remains local',
  tvPairingBegin,
  [
    'perform_pairing_begin',
    '.post(url)',
    '.json(&request)',
    'response.chunk()',
    'review_pairing_begin_response',
  ],
);

for (const forbidden of [
  'struct TvPairingBeginWireResponse',
  'fn is_valid_device_name',
  'fn is_valid_challenge_handle',
  'fn is_valid_pairing_code',
  'fn is_valid_utc_timestamp',
  'serde_json::from_slice(body)',
]) {
  if (tvPairing.includes(forbidden)) {
    throw new Error(
      'TV pairing still owns duplicate DTO validation: ' +
        forbidden,
    );
  }
}

requireFragments(
  'shared native network settings profile',
  settingsProfile,
  [
    'pub struct NativeNetworkSettingsProfile',
    'pub fn normalize_request_timeout_ms',
    'pub fn review_native_network_settings_profile',
    'NETWORK_SETTINGS_PROFILE_SCHEMA',
    'DEFAULT_REQUEST_TIMEOUT_MS',
    'MIN_REQUEST_TIMEOUT_MS',
    'MAX_REQUEST_TIMEOUT_MS',
    'gateway_origin_disclosure',
    '"redacted"',
    'request_timeout_defaults_and_clamps',
    'managed_release_profile_is_ready_and_redacted',
    'development_lan_profile_is_visibly_marked',
    'unconfigured_and_mismatched_profiles_fail_closed',
  ],
);

requireFragments(
  'shared confirmed ROC validator',
  confirmedRoc,
  [
    'pub struct ConfirmedRocProjectionV1',
    'pub fn parse_confirmed_roc_projection',
    'wallet_ledger_receipt_only',
    'receipt_backed_projection_validates',
    'pending_or_client_authority_projection_rejects',
  ],
);

requireFragments(
  'confirmed ROC B3 migration',
  confirmedRoc,
  [
    'use crate::b3::validate_canonical_b3;',
    'validate_canonical_b3(value)',
  ],
);

requireFragments(
  'OAP B3 migration',
  oapObject,
  [
    (
      'use crablink_native_core::b3::' +
      'normalize_canonical_b3;'
    ),
    'normalize_canonical_b3(raw)',
  ],
);

requireFragments(
  'User Node B3 migration',
  userNodeVerification,
  [
    (
      'use crablink_native_core::b3::' +
      'validate_canonical_b3;'
    ),
    'validate_canonical_b3(object)',
  ],
);

for (
  const [
    label,
    source,
  ] of [
    [
      'moderation review',
      moderationReview,
    ],
    [
      'persistence review',
      persistenceReview,
    ],
  ]
) {
  requireFragments(
    `${label} B3 migration`,
    source,
    [
      (
        'use crablink_native_core::b3::' +
        'is_canonical_b3;'
      ),
      'is_canonical_b3(',
    ],
  );

  if (
    source.includes(
      'fn is_canonical_b3',
    )
  ) {
    throw new Error(
      `${label} still owns duplicate B3 rules.`,
    );
  }
}

for (
  const [
    label,
    source,
  ] of [
    [
      'confirmed ROC',
      confirmedRoc,
    ],
    [
      'OAP object',
      oapObject,
    ],
    [
      'User Node verification',
      userNodeVerification,
    ],
    [
      'moderation review',
      moderationReview,
    ],
    [
      'persistence review',
      persistenceReview,
    ],
  ]
) {
  if (
    source.includes(
      '.strip_prefix("b3:")',
    )
  ) {
    throw new Error(
      `${label} still owns strict B3 parsing.`,
    );
  }
}

requireFragments(
  'asset-route compatibility policy',
  assetCommands,
  [
    'normalize_asset_bytes_route',
    'to_ascii_lowercase',
    'is_ascii_hexdigit',
    'strip_prefix("/o/b3:")',
    'strip_prefix("/o/")',
  ],
);

requireFragments(
  'desktop compatibility module',
  desktopCompatibility,
  [
    'pub use crablink_native_core::confirmed_roc',
    'parse_confirmed_roc_projection',
    'ConfirmedRocProjectionV1',
  ],
);

for (const forbidden of [
  'pub struct ConfirmedRocProjectionV1',
  'fn validate_b3',
  'fn validate_token',
  'serde_json::from_slice',
]) {
  if (
    desktopCompatibility.includes(forbidden)
  ) {
    throw new Error(
      'Desktop still owns duplicate confirmed-ROC ' +
        `behavior: ${forbidden}`,
    );
  }
}

const dependencyLine =
  'crablink-native-core = { ' +
  'path = "../../../crates/crablink-native-core" }';

if (!desktopCargo.includes(dependencyLine)) {
  throw new Error(
    'Desktop shared native-core dependency is missing.',
  );
}

if (!tvCargo.includes(dependencyLine)) {
  throw new Error(
    'TV shared native-core dependency is missing.',
  );
}

requireFragments(
  'desktop Phase 22 support',
  desktopLib,
  [
    'mod confirmed_roc;',
    'pub mod phase22_test_support',
    (
      'parse_confirmed_roc_projection, ' +
      'ConfirmedRocProjectionV1'
    ),
  ],
);

requireFragments(
  'Phase 22 integration test',
  phase22Test,
  [
    (
      'phase22_receipt_projection_' +
      'is_the_only_confirmed_roc_source'
    ),
    'parse_confirmed_roc_projection',
    'pending.pending_evidence_only = true',
    (
      'fake_source.source = ' +
      '"micronode_pending_evidence"'
    ),
    'missing_receipt.receipt_count = 0',
  ],
);

requireFragments(
  'TV command bridge',
  tvLib,
  [
    'commands::diagnostics::tv_diagnostics',
    'commands::gateway::tv_gateway_profile',
    'commands::pairing::tv_pairing_status',
    'commands::settings::tv_settings_read',
  ],
);

if (
  /confirmed_roc|confirmedRoc|wallet_ledger_receipt_only/u
    .test(tvLib)
) {
  throw new Error(
    'TV command bridge gained confirmed-ROC authority ' +
      'during crate extraction.',
  );
}

const sharedSources = [
  crateCargo,
  crateLib,
  assetManifest,
  b3,
  crabUrl,
  gatewayProfile,
  pairingDto,
  settingsProfile,
  confirmedRoc,
].join('\n');

for (
  const [
    label,
    pattern,
  ] of [
    [
      'Tauri dependency',
      /\btauri\b/u,
    ],
    [
      'Android Cargo dependency',
      /^\s*(?:android[-_][A-Za-z0-9_-]*|ndk|jni)\s*=/mu,
    ],
    [
      'Android API coupling',
      /\b(?:android_activity|android_logger|ndk|jni)::|target_os\s*=\s*"android"|\b(?:android|androidx)\.[A-Za-z_]/u,
    ],
    [
      'network client',
      /\breqwest\b/u,
    ],
    [
      'async runtime',
      /\btokio\b/u,
    ],
    [
      'filesystem access',
      /std::fs/u,
    ],
    [
      'network socket behavior',
      /\b(?:TcpStream|TcpListener|UdpSocket|ToSocketAddrs)\b/u,
    ],
    [
      'unsafe block',
      /unsafe\s*\{/u,
    ],
  ]
) {
  if (pattern.test(sharedSources)) {
    throw new Error(
      `Shared native core contains forbidden ${label}.`,
    );
  }
}

for (const requiredPath of [
  'crates/crablink-native-core/',
  'crates/crablink-native-core/src/asset_manifest.rs',
  'crates/crablink-native-core/src/b3.rs',
  'crates/crablink-native-core/src/crab_url.rs',
  'crates/crablink-native-core/src/gateway_profile.rs',
  'crates/crablink-native-core/src/pairing_dto.rs',
  'crates/crablink-native-core/src/settings_profile.rs',
  'scripts/check-crablink-native-core-boundary.mjs',
]) {
  if (
    !makeCodebundle.includes(requiredPath) &&
    !codebundleBoundary.includes(requiredPath)
  ) {
    throw new Error(
      `Future codebundle coverage is missing: ${requiredPath}`,
    );
  }
}

console.log(
  'CrabLink shared native-core boundary passed.',
);

console.log(
  'Owners: crablink-native-core owns canonical B3, crab URL ingress, gateway host posture, pairing DTO validation, redacted network settings, and confirmed-ROC validation.',
);

console.log(
  'Crab URL ingress: exact crab:// scheme, 2048-byte cap, interior CR/LF rejection, and outer trim.',
);

console.log(
  'Route classification: @crablink/core remains the typed-asset, built-in, profile, and site parser.',
);

console.log(
  'Gateway host posture: exact labels, private IPv4, mDNS, IPv6 ULA/link-local, and loopback rejection.',
);

console.log(
  'Transport execution and URL-origin parsing remain in the TV adapter.',
);

console.log(
  'Pairing DTOs: fixed read-only scopes, strict JSON, backend challenge authority, and sessionless begin responses.',
);

console.log(
  'Pairing transport: fixed-path HTTP execution and native clock remain in the TV adapter.',
);

console.log(
  'Network settings: bounded timeout, managed/development labels, fail-closed state review, and origin redaction.',
);

console.log(
  'B3 consumers: confirmed ROC, OAP, User Node, moderation, and persistence use one strict rule.',
);

console.log(
  'Verified assets: strict image/article manifests and full bounded BLAKE3 byte review live in shared native core.',
);

console.log(
  'Asset-byte route compatibility normalization remains local and unchanged.',
);

console.log(
  'Desktop: Phase 22 compatibility imports and integration behavior remain intact.',
);

console.log(
  'TV: path dependency compiles the same pure crate without adding a native command.',
);

console.log(
  'Shared crate: no Tauri, Android, network transport, storage, wallet, ledger, signing, or finality authority.',
);
