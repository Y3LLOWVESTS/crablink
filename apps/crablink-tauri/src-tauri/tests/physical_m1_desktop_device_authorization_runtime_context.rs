//! RO:WHAT — Locks Physical M1 CrabLink-native DeviceAuthorization runtime facts and authority boundaries.
//!
//! RO:WHY — The first physical root signature must use reviewed private-beta network/environment/epoch plus native nonce/time instead of WebView or fixture authority.
//!
//! RO:INTERACTS — CrabLink gateway profile, desktop authorization runtime context, `svc-passport` public identity derivation/builder, and canonical `ron-proto` payload fields.
//!
//! RO:INVARIANTS — development-LAN only; network `rustyonions-devnet`; environment `private-beta`; root epoch zero; durable authorization; class/scopes remain downstream policy-owned.
//!
//! RO:METRICS — none.
//!
//! RO:CONFIG — deterministic injected random/clock fixtures; no physical Passport mutation.
//!
//! RO:SECURITY — no RecoveryRoot, PIN, vault write, root signature, HTTP, capability, username, wallet, or ledger mutation.
//!
//! RO:TEST — focused Cargo test target of this file.

use std::{fs, path::PathBuf};

use crablink_native_core::gateway_profile::GatewayEnvironmentProfile;
use crablink_tauri_lib::passport_device_authorization_runtime_context::{
    build_physical_m1_private_beta_root_admin_desktop_authorization_payload_with_sources,
    DesktopDeviceAuthorizationClock, DesktopDeviceAuthorizationNonceRandomSource,
    DesktopDeviceAuthorizationRuntimeContextError,
    PHYSICAL_M1_DESKTOP_DEVICE_AUTHORIZATION_RUNTIME_CONTEXT_LABEL,
    PHYSICAL_M1_PRIVATE_BETA_AUTHORIZATION_ENVIRONMENT,
    PHYSICAL_M1_PRIVATE_BETA_DEVICE_AUTHORIZATION_EXPIRES_AT_MS,
    PHYSICAL_M1_PRIVATE_BETA_NETWORK_ID, PHYSICAL_M1_PRIVATE_BETA_ROOT_KEY_EPOCH,
};
use ron_proto::DeviceClassV1;
use svc_passport::native::{
    derive_native_device_id_v1, derive_native_passport_id_v1, Ed25519PublicKeyHex,
    NativeDevicePublicIdentityV1, RootPassportDescriptorV1,
};

const ROOT_PUBLIC_KEY: &str = "3d7f7a7cf1ca3e1af8e812d2ac349b13770d152c3f26b72560ee6870b9dec909";

const DEVICE_PUBLIC_KEY: &str = "2dfbfd60452275c726f8beb1a3d6ff9e91abbe670977716225807e4645044b17";

const FIXED_NOW_MS: u64 = 1_800_000_000_000;

#[derive(Debug, Clone, Copy)]
struct FixedNonceSource;

impl DesktopDeviceAuthorizationNonceRandomSource for FixedNonceSource {
    fn fill_authorization_nonce(
        &self,
        output: &mut [u8; 16],
    ) -> Result<(), DesktopDeviceAuthorizationRuntimeContextError> {
        *output = [
            0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d,
            0x0e, 0x0f,
        ];

        Ok(())
    }
}

#[derive(Debug, Clone, Copy)]
struct FailingNonceSource;

impl DesktopDeviceAuthorizationNonceRandomSource for FailingNonceSource {
    fn fill_authorization_nonce(
        &self,
        _output: &mut [u8; 16],
    ) -> Result<(), DesktopDeviceAuthorizationRuntimeContextError> {
        Err(DesktopDeviceAuthorizationRuntimeContextError::RandomnessUnavailable)
    }
}

#[derive(Debug, Clone, Copy)]
struct FixedClock;

impl DesktopDeviceAuthorizationClock for FixedClock {
    fn now_ms(&self) -> Result<u64, DesktopDeviceAuthorizationRuntimeContextError> {
        Ok(FIXED_NOW_MS)
    }
}

fn root_identity() -> RootPassportDescriptorV1 {
    let root_public_key = Ed25519PublicKeyHex::parse(ROOT_PUBLIC_KEY).expect("root public key");

    let passport_id = derive_native_passport_id_v1(&root_public_key).expect("Passport ID");

    RootPassportDescriptorV1 {
        passport_id,
        root_public_key,
        optional_handle: None,
    }
}

fn device_identity() -> NativeDevicePublicIdentityV1 {
    let device_public_key =
        Ed25519PublicKeyHex::parse(DEVICE_PUBLIC_KEY).expect("device public key");

    let device_id = derive_native_device_id_v1(&device_public_key).expect("Device ID");

    NativeDevicePublicIdentityV1 {
        device_id,
        device_public_key,
    }
}

#[test]
fn physical_m1_private_beta_runtime_facts_are_exact_and_policy_owned() {
    assert_eq!(
        PHYSICAL_M1_DESKTOP_DEVICE_AUTHORIZATION_RUNTIME_CONTEXT_LABEL,
        "PHYSICAL_M1_DESKTOP_DEVICE_AUTHORIZATION_RUNTIME_CONTEXT_V1",
    );

    assert_eq!(PHYSICAL_M1_PRIVATE_BETA_NETWORK_ID, "rustyonions-devnet",);

    assert_eq!(
        PHYSICAL_M1_PRIVATE_BETA_AUTHORIZATION_ENVIRONMENT,
        "private-beta",
    );

    assert_eq!(PHYSICAL_M1_PRIVATE_BETA_ROOT_KEY_EPOCH, 0);

    assert_eq!(
        PHYSICAL_M1_PRIVATE_BETA_DEVICE_AUTHORIZATION_EXPIRES_AT_MS,
        None,
    );

    let payload =
        build_physical_m1_private_beta_root_admin_desktop_authorization_payload_with_sources(
            &root_identity(),
            &device_identity(),
            GatewayEnvironmentProfile::DevelopmentLan,
            &FixedNonceSource,
            &FixedClock,
        )
        .expect("trusted private-beta runtime payload");

    assert_eq!(payload.network_id.as_str(), "rustyonions-devnet");
    assert_eq!(payload.environment.as_str(), "private-beta");
    assert_eq!(payload.root_key_epoch, 0);
    assert_eq!(payload.device_class, DeviceClassV1::RootAdminDesktop);
    assert_eq!(payload.issued_at_ms, FIXED_NOW_MS);
    assert_eq!(payload.expires_at_ms, None);

    assert_eq!(
        payload.authorization_nonce.as_bytes(),
        &[
            0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d,
            0x0e, 0x0f,
        ],
    );

    let scopes = payload
        .authorized_scope_ceiling
        .as_slice()
        .iter()
        .map(ron_proto::NativePassportScopeV1::as_str)
        .collect::<Vec<_>>();

    assert!(scopes.contains(&"identity.username.claim"));
    assert!(scopes.contains(&"identity.device.authorize"));
    assert!(scopes.contains(&"identity.profile.update"));
    assert_eq!(scopes.contains(&"wallet.spend"), false);
    assert_eq!(scopes.contains(&"ledger.write"), false);
}

#[test]
fn physical_m1_release_gateway_cannot_create_private_beta_authorization_context() {
    let error =
        build_physical_m1_private_beta_root_admin_desktop_authorization_payload_with_sources(
            &root_identity(),
            &device_identity(),
            GatewayEnvironmentProfile::ReleaseHttps,
            &FixedNonceSource,
            &FixedClock,
        )
        .expect_err("release gateway profile must require separate reviewed policy");

    assert_eq!(
        error,
        DesktopDeviceAuthorizationRuntimeContextError::UnsupportedGatewayProfile,
    );
}

#[test]
fn physical_m1_nonce_generation_failure_fails_closed_before_payload_creation() {
    let error =
        build_physical_m1_private_beta_root_admin_desktop_authorization_payload_with_sources(
            &root_identity(),
            &device_identity(),
            GatewayEnvironmentProfile::DevelopmentLan,
            &FailingNonceSource,
            &FixedClock,
        )
        .expect_err("nonce generation failure must reject");

    assert_eq!(
        error,
        DesktopDeviceAuthorizationRuntimeContextError::RandomnessUnavailable,
    );
}

#[test]
fn physical_m1_runtime_context_source_reuses_native_rng_and_has_no_root_or_network_authority() {
    let source = fs::read_to_string(
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("src/passport_device_authorization_runtime_context.rs"),
    )
    .expect("desktop authorization runtime source");

    for required in [
        "OsDesktopNativeDeviceKeyRandomSource",
        "NativeDeviceKeyRandomSource::fill",
        "SystemTime::now()",
        "UNIX_EPOCH",
        "GatewayEnvironmentProfile::DevelopmentLan",
        "rustyonions-devnet",
        "private-beta",
        "PHYSICAL_M1_PRIVATE_BETA_ROOT_KEY_EPOCH",
        "PHYSICAL_M1_PRIVATE_BETA_DEVICE_AUTHORIZATION_EXPIRES_AT_MS",
        "NativeRootAdminDesktopAuthorizationContextV1::new",
        "build_root_admin_desktop_device_authorization_payload_v1",
    ] {
        assert!(
            source.contains(required),
            "runtime source missing required trusted boundary {required}",
        );
    }

    for forbidden in [
        "#[tauri::command]",
        "tauri::command",
        "sign_native_device_authorization_v1",
        "sign_native_recovery_device_authorization_v1",
        "unseal_native_secret(",
        "verify_native_recovery_root_pin(",
        "NativeSecretBytes",
        "reqwest::",
        "std::fs::write",
        "tokio::fs",
        "issue_capability(",
        "username.claim(",
        "wallet.spend(",
        "ledger.write(",
    ] {
        assert!(
            source.contains(forbidden) == false,
            "runtime source gained forbidden authority marker {forbidden}",
        );
    }
}
