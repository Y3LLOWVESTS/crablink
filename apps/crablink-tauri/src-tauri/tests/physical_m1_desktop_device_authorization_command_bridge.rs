//! RO:WHAT — Focused boundary tests for the Physical M1 DeviceAuthorization native-state Tauri command bridge.
//!
//! RO:WHY — Proves the public command accepts only AppState, native Rust loads Passport/device identity itself, and the signed authorization/signature never cross into the WebView.
//!
//! RO:INTERACTS — durable public descriptor store, authenticated V2 device reader, root-confirmed authorization runtime, commands/passport.rs, and Tauri handler registration.
//!
//! RO:INVARIANTS — no Passport/device/PIN authority arguments; DevelopmentLan fixed natively; redacted metadata only; no authorization persistence or server mutation.
//!
//! RO:METRICS — none.
//!
//! RO:CONFIG — source/wiring assertions only; no physical Passport ceremony.
//!
//! RO:SECURITY — no secret fixture, root unseal, signing, filesystem mutation, network, capability, username, wallet, or ledger mutation.
//!
//! RO:TEST — focused Cargo test target of this file.

use std::{fs, path::PathBuf};

use crablink_tauri_lib::{
    passport_device_authorization_command_bridge::{
        DesktopDeviceAuthorizationCommandBridgeError,
        PHYSICAL_M1_DEVICE_AUTHORIZATION_COMMAND_BRIDGE_LABEL,
    },
    passport_device_authorization_command_runtime::DesktopDeviceAuthorizationCommandRuntimeError,
};

#[test]
fn physical_m1_bridge_state_projection_is_safe_and_explicit() {
    assert_eq!(
        PHYSICAL_M1_DEVICE_AUTHORIZATION_COMMAND_BRIDGE_LABEL,
        "PHYSICAL_M1_DEVICE_AUTHORIZATION_COMMAND_BRIDGE_V1",
    );

    assert_eq!(
        DesktopDeviceAuthorizationCommandBridgeError::PublicDescriptorMissing.state_label(),
        "public_identity_missing",
    );

    assert_eq!(
        DesktopDeviceAuthorizationCommandBridgeError::OperationalUnlockRequired.state_label(),
        "operational_unlock_required",
    );

    let cancelled = DesktopDeviceAuthorizationCommandBridgeError::Authorization(
        DesktopDeviceAuthorizationCommandRuntimeError::RootConfirmationCancelled,
    );

    assert_eq!(cancelled.state_label(), "cancelled");
    assert!(cancelled.native_secure_input_requested());

    let locked = DesktopDeviceAuthorizationCommandBridgeError::OperationalUnlockRequired;

    assert!(!locked.native_secure_input_requested());
}

#[test]
fn physical_m1_bridge_loads_descriptor_and_authenticated_v2_identity_natively() {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));

    let source =
        fs::read_to_string(root.join("src/passport_device_authorization_command_bridge.rs"))
            .expect("bridge source");

    for required in [
        "public_store",
        ".load()",
        "read_desktop_native_passport_session_device_public_identity",
        "GatewayEnvironmentProfile::DevelopmentLan",
        "authorize_physical_m1_private_beta_root_admin_desktop",
    ] {
        assert!(
            source.contains(required),
            "bridge missing native authority source {required}",
        );
    }

    for forbidden in [
        "#[tauri::command]",
        "tauri::command",
        "reqwest::",
        "write_native_encrypted_vault_atomic",
        "persist_once(",
        "issue_capability(",
        "username.claim(",
        "wallet.spend(",
        "ledger.write(",
    ] {
        assert!(
            !source.contains(forbidden),
            "bridge contains forbidden authority expansion {forbidden}",
        );
    }
}

#[test]
fn physical_m1_public_command_accepts_only_app_state_and_returns_redacted_metadata() {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));

    let commands = fs::read_to_string(root.join("src/commands/passport.rs"))
        .expect("passport commands source");

    let signature = commands
        .split("pub async fn passport_authorize_device")
        .nth(1)
        .expect("passport_authorize_device command")
        .split("->")
        .next()
        .expect("command signature");

    assert!(signature.contains("state: State<'_, AppState>"));

    for forbidden in [
        "passport_id:",
        "device_id:",
        "public_key:",
        "pin:",
        "String",
        "Vec<u8>",
        "Deserialize",
    ] {
        assert!(
            !signature.contains(forbidden),
            "public command signature contains forbidden input {forbidden}",
        );
    }

    let body = commands
        .split("pub async fn passport_authorize_device")
        .nth(1)
        .expect("command body");

    for required in [
        "authorize_or_reuse_persisted_physical_m1_device_authorization",
        "authorization_returned_to_webview: false",
        "signature_returned_to_webview: false",
        "authorization_persisted:",
        "register_physical_m1_device_authorization",
        "server_registry_mutated:",
        "server_outcome.newly_registered",
        "capability_issued: false",
        "username_mutated: false",
        "state.inner()",
        "native_secure_input_requested: outcome.native_secure_input_requested",
    ] {
        assert!(
            body.contains(required),
            "public command missing redacted boundary {required}",
        );
    }

    for forbidden in [
        "authorization.signature",
        "signature_hex",
        "recovery_root_unsealed: true",
        "secret_material_returned: true",
        "pin_received_from_webview: true",
    ] {
        assert!(
            !body.contains(forbidden),
            "public command leaks forbidden surface {forbidden}",
        );
    }
}

#[test]
fn physical_m1_authorize_device_command_is_registered_once() {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));

    let lib = fs::read_to_string(root.join("src/lib.rs")).expect("lib source");

    let marker = "commands::passport::passport_authorize_device,";

    assert_eq!(
        lib.matches(marker).count(),
        1,
        "DeviceAuthorization Tauri command must be registered exactly once",
    );
}
