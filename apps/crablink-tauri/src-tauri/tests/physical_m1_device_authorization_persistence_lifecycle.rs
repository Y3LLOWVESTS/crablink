//! RO:WHAT — Proves live composition of restart-stable Physical M1 DeviceAuthorization persistence, reuse, and local-clear ordering.
//!
//! RO:WHY — The app must not request repeat root signatures after restart, persist unverified authority, or leave local device authority behind after Passport clear.
//!
//! RO:INTERACTS — persistence runtime, AppState, Passport Tauri commands, immutable DeviceAuthorization store, server-registration handoff, and the existing canonical custody-clear wrapper.
//!
//! RO:INVARIANTS — verified-load precedes signing; signing precedes persistence; local authorization completes before server registration; AppState uses the Passport root; clear removes authorization metadata before descriptor/custody cleanup; WebView remains redacted.
//!
//! RO:CONFIG — source/composition regression for the Physical M1 private-beta desktop profile.
//!
//! RO:SECURITY — source/composition regression only; no physical Passport, PIN, RecoveryRoot, device seed, live server registry, capability, username, wallet, or ledger mutation is executed.
//!
//! RO:TEST — cargo test --test physical_m1_device_authorization_persistence_lifecycle.

const RUNTIME: &str = include_str!("../src/passport_device_authorization_persistence_runtime.rs");
const STATE: &str = include_str!("../src/state.rs");
const COMMANDS: &str = include_str!("../src/commands/passport.rs");

#[test]
fn physical_m1_valid_existing_authorization_is_reverified_before_any_root_signing() {
    let function = RUNTIME
        .split("pub fn authorize_or_reuse_persisted_physical_m1_device_authorization")
        .nth(1)
        .expect("persistence runtime function");

    let load = function
        .find(".load_verified(")
        .expect("verified authorization load");

    let sign = function
        .find("let authorization = authorize_physical_m1_device_from_native_state(")
        .expect("root-confirmed signing bridge");

    let persist = function
        .find(".persist_verified_once(")
        .expect("verified persistence");

    assert!(load < sign, "stored verification must precede root signing");
    assert!(sign < persist, "root signing must precede persistence");

    assert!(function.contains("if let Some(authorization) = existing"));
    assert!(function.contains("native_secure_input_requested: false"));
    assert!(function.contains("authorization_persisted: true"));
    assert!(function.contains("StoredAuthorizationRejected"));
}

#[test]
fn physical_m1_appstate_owns_authorization_store_on_the_canonical_passport_root() {
    for required in [
        "pub passport_device_authorization_store:",
        "DesktopDeviceAuthorizationStore",
        "DesktopDeviceAuthorizationStore::new(",
        "passport_vault_store.root_directory().to_path_buf()",
        "passport_device_authorization_store,",
    ] {
        assert!(
            STATE.contains(required),
            "AppState persistence wiring missing {required}",
        );
    }
}

#[test]
fn physical_m1_public_authorize_command_reports_persistence_without_exposing_authority() {
    let function = COMMANDS
        .split("pub async fn passport_authorize_device")
        .nth(1)
        .expect("async authorize command")
        .split("/// Public redacted DeviceKey-possession command schema.")
        .next()
        .expect("bounded authorize command");

    let local_authorization = function
        .find("authorize_or_reuse_persisted_physical_m1_device_authorization")
        .expect("local authorization persistence");

    let server_registration = function
        .find("register_physical_m1_device_authorization")
        .expect("server authorization registration");

    assert!(
        local_authorization < server_registration,
        "local authorization must complete before server registration",
    );

    for required in [
        "state.inner()",
        "authorization_persisted",
        "outcome.authorization_persisted",
        "native_secure_input_requested",
        "outcome.native_secure_input_requested",
        "authorization_returned_to_webview: false",
        "signature_returned_to_webview: false",
        "server_outcome.newly_registered",
        "capability_issued: false",
        "username_mutated: false",
    ] {
        assert!(
            function.contains(required),
            "authorize command missing {required}",
        );
    }

    let signature = function
        .split("->")
        .next()
        .expect("authorize command signature");

    for forbidden in [
        "passport_id:",
        "device_id:",
        "public_key:",
        "pin:",
        "authorization:",
    ] {
        assert!(
            !signature.contains(forbidden),
            "WebView command gained forbidden authority input {forbidden}",
        );
    }
}

#[test]
fn physical_m1_passport_clear_removes_local_authorization_before_existing_custody_chain() {
    let function = COMMANDS
        .split("pub fn passport_clear")
        .nth(1)
        .expect("clear command");

    let authorization_clear = function
        .find("passport_device_authorization_store.clear()")
        .expect("authorization sidecar clear");

    let custody_clear = function
        .find(
            "clear_desktop_native_passport_with_public_identity_platform_material_and_recovery_acknowledgement("
        )
        .expect("existing descriptor/custody clear wrapper");

    assert!(
        authorization_clear < custody_clear,
        "authorization metadata must clear before descriptor/custody cleanup",
    );

    for required in [
        "state: \"unavailable\"",
        "session_changed: false",
        "encrypted_vault_mutated: false",
        "platform_material_mutated: false",
        "recovery_root_unsealed: false",
        "wallet_or_ledger_mutated: false",
    ] {
        assert!(
            function.contains(required),
            "fail-closed authorization cleanup missing {required}",
        );
    }
}

#[test]
fn physical_m1_persistence_runtime_does_not_add_server_or_economic_authority() {
    for forbidden in [
        "server_registry_mutated: true",
        "capability_issued: true",
        "username_mutated: true",
        "wallet_or_ledger_mutated: true",
        "ledger_mutate",
        "wallet_mutate",
        "username_claim",
        "capability_issue",
    ] {
        assert!(
            !RUNTIME.contains(forbidden),
            "persistence runtime contains forbidden authority marker {forbidden}",
        );
    }

    assert!(
        !RUNTIME.contains("reqwest"),
        "local persistence runtime must not add network authority",
    );
}
