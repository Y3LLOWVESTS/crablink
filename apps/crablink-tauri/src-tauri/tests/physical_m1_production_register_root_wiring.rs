//! RO:WHAT — Verifies the production desktop RegisterRoot runtime preserves the reviewed challenge-before-root, native-custody, and public-8090 authority boundaries.
//! RO:WHY — Windows CN-4 needs a real product path for its independently created Passport root before its locally signed DeviceAuthorization can be admitted by the shared CrabNode.
//! RO:INTERACTS — passport_register_root_http_runtime, Passport Tauri command, RegisterRoot intent/trust modules, native secret surface, RecoveryRoot signer, and AppState.
//! RO:INVARIANTS — zero caller authority; service challenge verifies before root confirmation; RecoveryRoot material is dropped before proof network I/O; only public 8090 is used; existing local root-confirmation command remains separate.
//! RO:SECURITY — no PIN, RecoveryRoot, VMK, proof signature, raw proof payload, capability, username authority, wallet authority, or ledger authority crosses the WebView boundary.
//! RO:TEST — cargo test --test physical_m1_production_register_root_wiring.

use std::{fs, path::PathBuf};

fn source(relative: &str) -> String {
    fs::read_to_string(
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join(relative),
    )
    .unwrap_or_else(|error| {
        panic!("failed to read {relative}: {error}")
    })
    .replace("\r\n", "\n")
}

#[test]
fn cn4_register_root_runtime_uses_only_public_8090_and_exact_routes() {
    let runtime =
        source("src/passport_register_root_http_runtime.rs");

    assert!(runtime.contains(
        r#"pub const PHYSICAL_M1_REGISTER_ROOT_GATEWAY_URL: &str =
    "http://127.0.0.1:8090";"#,
    ));

    assert!(runtime.contains(
        r#""/identity/passport/register/challenge""#,
    ));

    assert!(runtime.contains(
        r#""/identity/passport/register/proof""#,
    ));

    assert!(!runtime.contains("http://127.0.0.1:9090"));
    assert!(!runtime.contains("http://127.0.0.1:5307"));

    assert!(runtime.contains(
        "REGISTER_ROOT_MAX_RESPONSE_BODY_BYTES: usize = 16 * 1024",
    ));

    assert!(runtime.contains(
        "REGISTER_ROOT_MAX_REQUEST_TIMEOUT_MS: u64 = 30_000",
    ));
}

#[test]
fn cn4_register_root_verifies_service_before_recovery_root_access() {
    let runtime =
        source("src/passport_register_root_http_runtime.rs");

    let start = runtime
        .find("pub async fn register_physical_m1_root")
        .expect("RegisterRoot production function");

    let end = runtime[start..]
        .find("\nasync fn read_bounded_response_body")
        .map(|offset| start + offset)
        .expect("RegisterRoot function end");

    let function = &runtime[start..end];

    let verify = function
        .find("verify_physical_m1_register_root_challenge(")
        .expect("strict service challenge verification");

    let root_prompt = function
        .find("request_root_confirmation_pin()")
        .expect("native root-confirmation prompt");

    let root_unseal = function
        .find("NativeSecureCompartment::RecoveryRoot")
        .expect("RecoveryRoot unseal");

    let root_sign = function
        .find("sign_native_recovery_root_registration_proof_v1(")
        .expect("canonical RecoveryRoot signer");

    let drop_pin = function
        .find("drop(root_pin);")
        .expect("root PIN drop");

    let drop_recovery = function
        .find("drop(recovery_factor);")
        .expect("RecoveryRoot factor drop");

    let proof_network = function
        .find(".post(format!(\"{gateway_url}{REGISTER_ROOT_PROOF_PATH}\"))")
        .expect("proof submission");

    assert!(verify < root_prompt);
    assert!(root_prompt < root_unseal);
    assert!(root_unseal < root_sign);
    assert!(drop_pin < proof_network);
    assert!(drop_recovery < proof_network);
}

#[test]
fn cn4_register_root_command_is_zero_user_argument_and_redacted() {
    let commands = source("src/commands/passport.rs");

    let start = commands
        .find("pub async fn passport_register_root")
        .expect("RegisterRoot Tauri command");

    let end = commands[start..]
        .find(
            "\n/// Begin the native-only Passport recovery ceremony.",
        )
        .map(|offset| start + offset)
        .expect("RegisterRoot command end");

    let command = &commands[start..end];

    assert!(command.contains("state: State<'_, AppState>"));
    assert!(command.contains(
        "register_physical_m1_root(state.inner()).await",
    ));

    for forbidden in [
        "intent:",
        "passport_id:",
        "root_public_key:",
        "root_pin:",
        "pin:",
        "signature:",
        "proof_signed_payload_hex:",
        "capability:",
        "username:",
    ] {
        assert!(
            !command.contains(forbidden),
            "RegisterRoot command gained caller authority marker {forbidden}",
        );
    }

    assert!(command.contains("redacted: true"));
    assert!(command.contains("pin_received_from_webview: false"));
    assert!(command.contains("secret_material_returned: false"));
    assert!(command.contains("wallet_or_ledger_mutated: false"));
}

#[test]
fn cn4_server_register_root_remains_separate_from_local_root_finalization() {
    let commands = source("src/commands/passport.rs");

    assert!(commands.contains(
        "pub fn passport_unlock_root(",
    ));

    assert!(commands.contains(
        "pub async fn passport_register_root(",
    ));

    let runtime =
        source("src/passport_register_root_http_runtime.rs");

    assert!(!runtime.contains(
        "passport_device_authorization_store",
    ));

    assert!(!runtime.contains(
        "issue_physical_m1_username_capability",
    ));

    assert!(!runtime.contains(
        "claim_physical_m1_protected_username",
    ));
}
