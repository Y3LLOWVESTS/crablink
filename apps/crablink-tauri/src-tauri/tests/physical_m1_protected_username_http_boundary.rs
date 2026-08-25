//! RO:WHAT — Source-boundary acceptance for CrabLink's CN-4 protected username exact-byte native HTTP runtime and narrow Tauri command exposure.
//! RO:WHY — The first real username mutation must stay gateway-only, capability-bound, DeviceKey-signed, exact-byte bound, while React supplies public profile intent only.
//! RO:INTERACTS — protected username HTTP runtime, request-proof signing custody, operational VMK session, Passport command bridge, handler registry, and Cargo dependencies.
//! RO:INVARIANTS — 8090 only; body hashed then sent unchanged; fresh OS nonce; native-only capability/DeviceKey authority; exactly one narrow command; no caller-owned Passport authority.
//! RO:METRICS — none.
//! RO:CONFIG — source-boundary test only.
//! RO:SECURITY — forbids direct 9090/5307, generic signing, secret export, caller-supplied capability/proof/Passport authority, wallet, and ledger mutation.
//! RO:TEST — cargo test --test physical_m1_protected_username_http_boundary.

use std::{fs, path::PathBuf};

fn repo_file(relative: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join(relative)
}

/// Return exactly one Rust method beginning at `signature`.
///
/// These boundary tests inspect small, known synchronous methods. Brace
/// matching prevents unrelated later methods/comments from entering the
/// security scan when another helper is inserted into the same impl block.
fn exact_method_source<'a>(source: &'a str, signature: &str) -> &'a str {
    let start = source.find(signature).expect("method signature");

    let opening_offset = source[start..].find('{').expect("method opening brace");

    let opening = start + opening_offset;
    let mut depth = 0_usize;

    for (offset, character) in source[opening..].char_indices() {
        match character {
            '{' => depth += 1,

            '}' => {
                depth = depth.checked_sub(1).expect("balanced method braces");

                if depth == 0 {
                    let end = opening + offset + character.len_utf8();

                    return &source[start..end];
                }
            }

            _ => {}
        }
    }

    panic!("method closing brace");
}

#[test]
fn protected_username_http_runtime_is_exact_byte_gateway_only_and_native_authorized() {
    let source = fs::read_to_string(repo_file("src/passport_username_claim_http_runtime.rs"))
        .expect("protected username HTTP runtime");

    for required in [
        "PHYSICAL_M1_PROTECTED_USERNAME_GATEWAY_URL",
        "\"http://127.0.0.1:8090\"",
        "passport_capability_session",
        ".load_active(now_ms)",
        "identity.username.claim",
        "serde_json::to_vec(&canonical_intent)",
        "digest_b3(\"body_hash\", &body)",
        "digest_b3(\"canonical_query_hash\", b\"\")",
        "getrandom::fill(&mut bytes)",
        "PassportRequestProofV1",
        "PASSPORT_REQUEST_PROOF_V1_VERSION",
        "NATIVE_USERNAME_CLAIM_REQUEST_METHOD_V1",
        "NATIVE_USERNAME_CLAIM_CANONICAL_PATH_V1",
        "sign_desktop_native_passport_username_request_proof",
        "URL_SAFE_NO_PAD.encode(proof_json)",
        "NATIVE_USERNAME_REQUEST_PROOF_HEADER",
        ".body(body)",
        "StatusCode::CREATED",
        "UsernameClaimStatus::Confirmed",
        "PassportKind::Main",
    ] {
        assert!(
            source.contains(required),
            "protected username runtime missing required marker {required}",
        );
    }

    for forbidden in [
        "#[tauri::command]",
        "http://127.0.0.1:9090",
        "http://127.0.0.1:5307",
        ".json(&canonical_intent)",
        "passport_subject: intent",
        "capability_id: intent",
        "device_id: intent",
        "request_nonce: intent",
        "device_signature: intent",
        "wallet.spend(",
        "ledger.write(",
    ] {
        assert!(
            !source.contains(forbidden),
            "protected username runtime gained forbidden marker {forbidden}",
        );
    }
}

#[test]
fn request_proof_signing_runtime_reuses_authenticated_v2_devicekey_custody() {
    let source = fs::read_to_string(repo_file("src/passport_request_proof_signing_runtime.rs"))
        .expect("request-proof signing runtime");

    for required in [
        "with_operational_vmk_for_request_proof_signing",
        "decode_native_platform_bound_vault_versioned",
        "NativePlatformBoundVaultVersioned::V2",
        "decrypt_native_operational_device_payload_v1",
        "operational_payload.device_signing_seed()",
        "sign_native_username_claim_request_proof_v1",
        "PassportRequestProofV1",
    ] {
        assert!(
            source.contains(required),
            "request-proof signing runtime missing {required}",
        );
    }

    for forbidden in [
        "#[tauri::command]",
        "device_signing_seed().to_vec()",
        "device_signing_seed().clone()",
        "request_root_pin",
        "NativeSecureCompartment::RecoveryRoot",
        "SigningKey::from_bytes",
        "wallet.spend(",
        "ledger.write(",
    ] {
        assert!(
            !source.contains(forbidden),
            "request-proof signing runtime gained forbidden marker {forbidden}",
        );
    }
}

#[test]
fn request_proof_vmk_bridge_is_private_synchronous_and_non_exporting() {
    let source = fs::read_to_string(repo_file("src/passport_operational_unlock_runtime.rs"))
        .expect("operational session runtime");

    assert!(source.contains("pub(crate) fn with_operational_vmk_for_request_proof_signing"));

    assert!(!source.contains("pub fn with_operational_vmk_for_request_proof_signing"));

    let bridge = exact_method_source(
        &source,
        "pub(crate) fn with_operational_vmk_for_request_proof_signing",
    );

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
            "request-proof VMK bridge gained forbidden marker {forbidden}",
        );
    }
}

#[test]
fn native_runtime_is_registered_and_narrow_tauri_command_is_exposed_once() {
    let lib = fs::read_to_string(repo_file("src/lib.rs")).expect("Tauri lib source");

    let cargo = fs::read_to_string(repo_file("Cargo.toml")).expect("Tauri Cargo source");

    assert!(lib.contains("pub mod passport_request_proof_signing_runtime;"));

    assert!(lib.contains("pub mod passport_username_claim_http_runtime;"));

    assert!(cargo.contains("base64 = \"0.22\""));

    assert_eq!(
        lib.matches("commands::passport::passport_claim_username")
            .count(),
        1,
        "protected username Tauri command must be registered exactly once",
    );
}
