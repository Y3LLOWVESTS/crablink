//! RO:WHAT — Guards CrabLink's CN-4 DeviceSession signing custody boundary.
//! RO:WHY — The operational VMK and DeviceKey seed must remain native-only while CrabLink gains exactly one purpose-specific proof-signing path.
//! RO:INTERACTS — operational session custody, V2 device-session signing runtime, and svc-passport purpose-specific signer.
//! RO:INVARIANTS — VMK borrow is crate-private/synchronous; V2 payload is authenticated before signing; no generic signer or secret-return API is introduced.
//! RO:METRICS — none.
//! RO:CONFIG — source-boundary acceptance only.
//! RO:SECURITY — rejects WebView/Tauri secret surfaces, PIN/RecoveryRoot access, secret cloning/export, capability, username, wallet, and ledger authority.
//! RO:TEST — cargo test --test physical_m1_device_session_signing_boundary.

use std::{fs, path::PathBuf};

fn repo_file(relative: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join(relative)
}

#[test]
fn device_session_vmk_borrow_is_crate_private_synchronous_and_non_exporting() {
    let source = fs::read_to_string(repo_file("src/passport_operational_unlock_runtime.rs"))
        .expect("operational session source");

    assert!(source.contains("pub(crate) fn with_operational_vmk_for_device_session_signing"));

    assert!(!source.contains("pub fn with_operational_vmk_for_device_session_signing"));

    let start = source
        .find("pub(crate) fn with_operational_vmk_for_device_session_signing")
        .expect("device-session borrow start");

    let end = source[start..]
        .find("    pub fn lock(")
        .map(|offset| start + offset)
        .expect("device-session borrow end");

    let bridge = &source[start..end];

    for forbidden in [
        ".to_vec()",
        ".clone()",
        "async ",
        ".await",
        "serde",
        "tauri",
        "println!",
        "eprintln!",
        "tracing::",
    ] {
        assert!(
            !bridge.contains(forbidden),
            "device-session VMK borrow gained forbidden marker {forbidden}",
        );
    }
}

#[test]
fn device_session_runtime_uses_authenticated_v2_and_purpose_specific_signer_only() {
    let source = fs::read_to_string(repo_file("src/passport_device_session_signing_runtime.rs"))
        .expect("device-session signing source");

    for required in [
        "with_operational_vmk_for_device_session_signing",
        "decode_native_platform_bound_vault_versioned",
        "NativePlatformBoundVaultVersioned::V2",
        "decrypt_native_operational_device_payload_v1",
        "operational_payload.device_signing_seed()",
        "sign_native_device_session_proof_v1",
        "DeviceSessionProofTranscriptV1",
    ] {
        assert!(
            source.contains(required),
            "device-session runtime missing required marker {required}",
        );
    }

    for forbidden in [
        "#[tauri::command]",
        "request_operational_pin",
        "request_root_pin",
        "NativeSecureCompartment::RecoveryRoot",
        "unseal_native_secret(",
        "sign_native_recovery",
        "device_signing_seed().to_vec()",
        "device_signing_seed().clone()",
        "issue_capability(",
        "username_store",
        "wallet.spend(",
        "ledger.write(",
    ] {
        assert!(
            !source.contains(forbidden),
            "device-session runtime gained forbidden authority marker {forbidden}",
        );
    }
}

#[test]
fn device_session_runtime_exposes_signature_not_secret_material() {
    let source = fs::read_to_string(repo_file("src/passport_device_session_signing_runtime.rs"))
        .expect("device-session signing source");

    assert!(source.contains("Result<Ed25519SignatureV1, DesktopDeviceSessionSigningError>"));

    for forbidden_return in [
        "Result<NativeSecretBytes",
        "Result<Vec<u8>",
        "device_signing_seed: NativeSecretBytes",
        "operational_vmk: NativeSecretBytes",
    ] {
        assert!(
            !source.contains(forbidden_return),
            "secret-return surface detected: {forbidden_return}",
        );
    }
}
