//! RO:WHAT — Pure Rust validation rules shared by CrabLink native applications.
//! RO:WHY — Desktop and TV must validate the same backend-derived facts without duplicating rules.
//! RO:INTERACTS — B3, crab URL ingress, and confirmed-ROC validation now; receipt and pairing DTO families later.
//! RO:INVARIANTS — deterministic data validation only; no platform runtime or transport.
//! RO:SECURITY — no Tauri, Android, network, storage, wallet, ledger, signing, or finality authority.
//! RO:TEST — cargo test --manifest-path crates/crablink-native-core/Cargo.toml.

#![forbid(unsafe_code)]

pub mod asset_manifest;
pub mod b3;
pub mod confirmed_roc;
pub mod crab_url;
pub mod gateway_profile;
pub mod pairing_dto;
pub mod settings_profile;
pub mod tv_passport_authorization;
pub mod tv_passport_pairing;

pub use asset_manifest::{
    compute_tv_asset_content_cid, review_tv_asset_manifest, verify_tv_asset_bytes,
    ReviewedTvAssetManifest, TvAssetIntegrityError, TvAssetKind, TvAssetManifestV1,
    VerifiedTvAssetBytes, MAX_TV_ASSET_BYTES, MAX_TV_ASSET_CONTENT_TYPE_BYTES,
    TV_ASSET_MANIFEST_SCHEMA, TV_ASSET_MANIFEST_VERSION,
};

pub use b3::{
    is_canonical_b3, normalize_canonical_b3, validate_canonical_b3, B3_DIGEST_HEX_LENGTH, B3_PREFIX,
};

pub use crab_url::{normalize_crab_url_for_gateway, CRAB_URL_SCHEME, MAX_CRAB_URL_BYTES};

pub use gateway_profile::{
    is_ipv6_unicast_link_local, is_loopback_or_unspecified_host, is_private_lan_host,
    GatewayEnvironmentProfile,
};

pub use pairing_dto::{
    build_pairing_begin_request, pairing_contract_error, review_pairing_begin_response,
    TvPairingBeginRequest, TvPairingBeginResponse, TvPairingContractError, APPROVAL_AUTHORITY,
    INITIAL_TV_SESSION_SCOPES, MAX_DEVICE_NAME_BYTES, MAX_PAIRING_BEGIN_RESPONSE_BYTES,
    PAIRING_BEGIN_REQUEST_SCHEMA, PAIRING_BEGIN_RESPONSE_SCHEMA, PAIRING_CONTRACT_ERROR_SCHEMA,
};

pub use settings_profile::{
    normalize_request_timeout_ms, review_native_network_settings_profile,
    NativeNetworkSettingsProfile, DEFAULT_REQUEST_TIMEOUT_MS, MAX_REQUEST_TIMEOUT_MS,
    MIN_REQUEST_TIMEOUT_MS, NETWORK_SETTINGS_PROFILE_SCHEMA,
};

pub use confirmed_roc::{
    parse_confirmed_roc_projection, ConfirmedRocProjectionV1, CONFIRMED_ROC_PROJECTION_SCHEMA,
    CONFIRMED_ROC_PROJECTION_VERSION,
};
