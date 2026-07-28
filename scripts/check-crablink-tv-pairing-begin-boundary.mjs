import {
  readFileSync,
} from 'node:fs';

function read(path) {
  return readFileSync(
    new URL(
      `../${path}`,
      import.meta.url,
    ),
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

function rustProductionSource(source) {
  const testModuleMarkers = [
    '\n#[cfg(test)]\nmod tests',
    '\r\n#[cfg(test)]\r\nmod tests',
  ];

  const indexes = testModuleMarkers
    .map(
      (marker) =>
        source.indexOf(marker),
    )
    .filter(
      (index) => index >= 0,
    );

  if (indexes.length === 0) {
    return source;
  }

  return source.slice(
    0,
    Math.min(...indexes),
  );
}

const sharedPairingDto = read(
  'crates/crablink-native-core/src/pairing_dto.rs',
);

const tvPairing = read(
  'apps/crablink-tv/src-tauri/src/commands/pairing.rs',
);

const tvPairingBegin = read(
  'apps/crablink-tv/src-tauri/src/commands/pairing_begin.rs',
);

const tvGateway = read(
  'apps/crablink-tv/src-tauri/src/commands/gateway.rs',
);

const tvPanel = read(
  'apps/crablink-tv/src/pairing/TvPairingPanel.jsx',
);

const tvInteraction = read(
  'apps/crablink-tv/src/pairing/tvPairingBeginInteraction.js',
);

const tvViewModel = read(
  'apps/crablink-tv/src/pairing/tvPairingViewModel.js',
);

const tvLib = read(
  'apps/crablink-tv/src-tauri/src/lib.rs',
);

const pairingProduction =
  rustProductionSource(tvPairing);

const transportProduction =
  rustProductionSource(tvPairingBegin);

requireFragments(
  'Shared pairing DTO contract',
  sharedPairingDto,
  [
    'pub const PAIRING_BEGIN_REQUEST_SCHEMA',
    'pub const PAIRING_BEGIN_RESPONSE_SCHEMA',
    'pub const PAIRING_CONTRACT_ERROR_SCHEMA',
    'pub const MAX_PAIRING_BEGIN_RESPONSE_BYTES',
    'pub const MAX_DEVICE_NAME_BYTES',
    'pub const APPROVAL_AUTHORITY',
    'pub const INITIAL_TV_SESSION_SCOPES',
    'pub struct TvPairingBeginRequest',
    'pub struct TvPairingBeginResponse',
    'pub struct TvPairingContractError',
    'deny_unknown_fields',
    'pub fn build_pairing_begin_request',
    'pub fn review_pairing_begin_response',
    '"identity.read"',
    '"catalog.read"',
    '"content.read"',
    '"entitlement.read"',
    '"receipts.read"',
    '"confirmed_roc.read"',
    '"session.revoke_self"',
    '"companion-crablink-required"',
    'session_present: false',
  ],
);

rejectFragments(
  'Shared pairing DTO contract',
  sharedPairingDto,
  [
    'tauri::',
    'reqwest::',
    'SystemTime::now',
    'TcpListener',
    'TcpStream',
    '.post(',
    '.send()',
    'create_session',
    'issue_session',
    'session_token',
    'wallet_key',
    'seed_phrase',
    'private_key',
  ],
);

requireFragments(
  'TV pairing thin adapter',
  pairingProduction,
  [
    'pub use crablink_native_core::pairing_dto',
    'build_pairing_begin_request',
    'pairing_begin_request_for_gateway',
    'pairing_status_for_gateway',
    'pub fn tv_pairing_status',
    'session_present: false',
  ],
);

rejectFragments(
  'TV pairing thin adapter',
  pairingProduction,
  [
    'struct TvPairingBeginWireResponse',
    'fn is_valid_device_name',
    'fn is_valid_challenge_handle',
    'fn is_valid_pairing_code',
    'fn is_valid_utc_timestamp',
    'serde_json::from_slice(body)',
    'create_session',
    'issue_session',
    'session_token',
  ],
);

requireFragments(
  'TV fixed-path pairing transport',
  transportProduction,
  [
    'const PAIRING_PATH: &str = "/v1/tv/pairing"',
    'SystemTime::now()',
    'pairing_begin_request_for_gateway',
    'perform_pairing_begin',
    'reqwest::Client::builder()',
    '.connect_timeout(timeout)',
    '.timeout(timeout)',
    '.redirect(reqwest::redirect::Policy::none())',
    '.no_proxy()',
    '.post(url)',
    '.json(&request)',
    'response.chunk().await',
    'MAX_PAIRING_BEGIN_RESPONSE_BYTES',
    'review_pairing_begin_response',
    'pub async fn tv_pairing_begin',
    'device_name: String',
  ],
);

rejectFragments(
  'TV fixed-path pairing transport',
  transportProduction,
  [
    'reqwest::redirect::Policy::limited',
    'reqwest::redirect::Policy::default',
    '.proxy(',
    'Proxy::',
    'session_token',
    'create_session',
    'issue_session',
    'wallet_key',
    'seed_phrase',
    'private_key',
  ],
);

requireFragments(
  'Reviewed gateway pairing profile',
  tvGateway,
  [
    'const PAIRING_PATH: &str = "/v1/tv/pairing"',
    'pairing_path: PAIRING_PATH',
    'request_timeout_ms',
    'release-https',
    'development-lan',
  ],
);

requireFragments(
  'Frontend pairing input projection',
  tvInteraction,
  [
    'const MAX_DEVICE_NAME_BYTES = 64',
    'normalizeTvDeviceName',
    'normalizeTvPairingBeginFailure',
    'projectTvPairingBeginSuccess',
    'sessionPresent: false',
  ],
);

requireFragments(
  'Frontend pairing action',
  tvPanel,
  [
    'beginInFlightRef',
    'normalizeTvDeviceName',
    "'tv_pairing_begin'",
    'deviceName:',
    'normalizedDeviceName',
    "phase: 'submitting'",
    "phase: 'waiting'",
    'No session has been created.',
  ],
);

requireFragments(
  'Frontend pairing response projection',
  tvViewModel,
  [
    'normalizeTvPairingBeginResponse',
    'safeChallengeHandle',
    'safeFuturePairingExpiry',
    '/^[A-Z2-9]{6}$/',
    "'companion-crablink-required'",
    'sessionPresent: false',
  ],
);

requireFragments(
  'TV native command registration',
  tvLib,
  [
    'commands::pairing_begin::tv_pairing_begin',
    'commands::pairing::tv_pairing_status',
  ],
);

const productionAuthorityScan = [
  pairingProduction,
  transportProduction,
  tvPanel,
  tvInteraction,
].join('\n');

rejectFragments(
  'Production pairing surface',
  productionAuthorityScan,
  [
    'sessionToken:',
    'session_token:',
    'walletPrivateKey',
    'wallet_private_key',
    'seedPhrase',
    'seed_phrase',
    'ledgerMutation',
    'mintRoc',
    'issueRoc',
    'approvePairingLocally',
  ],
);

console.log(
  'CrabLink TV pairing-begin boundary passed.',
);

console.log(
  'PAIRING_DTO_OWNER=crablink-native-core',
);

console.log(
  'Operation: fixed reviewed-origin POST /v1/tv/pairing.',
);

console.log(
  'Input: validated device name plus seven fixed read-only scopes.',
);

console.log(
  'Bounds: native clock, 1–30 second timeout, 8 KiB streamed response.',
);

console.log(
  'Frontend: validated device name, one in-flight request, and fail-closed response projection.',
);

console.log(
  'Challenge authority: backend only; approval authority: trusted companion only.',
);

console.log(
  'Production scan excludes Rust test-only transport fixtures.',
);

console.log(
  'Session creation, arbitrary URLs, redirects, ambient proxies, credentials, wallet, ledger, and ROC authority: absent.',
);
