//! RO:WHAT — Locks CrabLink's CN-4 fixed IssueCapability trust, native HTTP ordering, and non-WebView authority boundary.
//! RO:WHY — The real username capability must use gateway 8090, authenticate svc-passport before DeviceKey signing, validate the returned capability, and retain it only in native memory.
//! RO:INTERACTS — capability trust/runtime/session, actual managed-CrabNode challenge evidence, persisted DeviceAuthorization, existing purpose-specific DeviceKey signer, ron-policy version, and canonical protocol DTOs.
//! RO:INVARIANTS — exact IssueCapability bindings/scopes; operation hash required; authorization before network; trust before signing; signing before proof; capability verification before memory storage; no direct 9090/5307 or React authority.
//! RO:METRICS — none.
//! RO:CONFIG — deterministic signed challenge evidence observed through real port 8090.
//! RO:SECURITY — no VMK/seed/PIN/RecoveryRoot/generic signer/raw capability/WebView/username/wallet/ledger mutation.
//! RO:TEST — `cargo test --test physical_m1_capability_http_boundary`.

use std::{fs, path::PathBuf};

use crablink_tauri_lib::passport_capability_trust::{
    verify_physical_m1_capability_challenge, PhysicalM1CapabilityChallengeVerificationError,
    PHYSICAL_M1_CAPABILITY_TRUST_LABEL,
};

use ron_proto::{
    DeviceIdV1, NativePassportScopeV1, PassportChallengePurposeV1, PassportChallengeV1,
    PassportIdV1,
};

const REAL_PASSPORT_ID: &str =
    "passport:v1:main:ed25519:b3:2c51898d0ee5161bead99d6a9f2a6afa4c0d3abdd4e539f4ce3f5fdee597a2dd";

const REAL_DEVICE_ID: &str =
    "device:v1:ed25519:b3:54d9fb339c125915b48f68a3da5c9a4a6493d7813e52aafc3fc645d4e817ee44";

const REAL_SERVICE_CHALLENGE_JSON: &str = r#"{
  "audience": "svc-passport",
  "challenge_id": "challenge:v1:b3:672d42f91e8ca60791b1a0b347db51c1f37bb45bfc209b83c155350474656e77",
  "device_id": "device:v1:ed25519:b3:54d9fb339c125915b48f68a3da5c9a4a6493d7813e52aafc3fc645d4e817ee44",
  "environment": "private-beta",
  "expires_at_ms": 1787600836706,
  "issued_at_ms": 1787600776706,
  "issuing_service_id": "svc-passport",
  "network_id": "rustyonions-devnet",
  "nonce": "6cdf67523a665b29b3ef2bb63fac144237c205dea0726502ccd8240e69a071c0",
  "operation_body_hash": "74d50ae8d501e481fb09fab2638f46448221b97db74351e8174ca40f92196028",
  "passport_id": "passport:v1:main:ed25519:b3:2c51898d0ee5161bead99d6a9f2a6afa4c0d3abdd4e539f4ce3f5fdee597a2dd",
  "purpose": "issue_capability",
  "requested_scopes": [
    "identity.read",
    "identity.username.claim"
  ],
  "service_key_id": "ed25519/crabnode/svc-passport/30d1d523-28c0-4f60-a677-5156959507a8/v1",
  "service_signature": "WTmp9IFg4tB-wcpySzSmlomW7ogV-kbzQH1M77Xi_9WgjFsbCAbrHePlFFk_b8hOzELW42Ca20TjhN07CVfHCg",
  "version": 1
}"#;

fn repo_file(relative: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join(relative)
}

fn real_challenge() -> PassportChallengeV1 {
    serde_json::from_str(REAL_SERVICE_CHALLENGE_JSON).expect("real IssueCapability challenge")
}

fn expected_passport() -> PassportIdV1 {
    PassportIdV1::parse(REAL_PASSPORT_ID).expect("real Passport")
}

fn expected_device() -> DeviceIdV1 {
    DeviceIdV1::parse(REAL_DEVICE_ID).expect("real Device")
}

fn expected_scopes() -> Vec<NativePassportScopeV1> {
    vec![
        NativePassportScopeV1::parse("identity.read").expect("identity.read"),
        NativePassportScopeV1::parse("identity.username.claim").expect("identity.username.claim"),
    ]
}

#[test]
fn real_managed_crabnode_issuecapability_challenge_verifies_against_pinned_anchor() {
    assert_eq!(
        PHYSICAL_M1_CAPABILITY_TRUST_LABEL,
        "PHYSICAL_M1_ISSUECAPABILITY_CONTROLLED_BETA_TRUST_V1",
    );

    verify_physical_m1_capability_challenge(
        &real_challenge(),
        &expected_passport(),
        &expected_device(),
        &expected_scopes(),
        1_787_600_777_706,
    )
    .expect("real managed-CrabNode IssueCapability challenge");
}

#[test]
fn wrong_purpose_or_missing_operation_hash_fails_before_signing() {
    let mut wrong_purpose = real_challenge();

    wrong_purpose.purpose = PassportChallengePurposeV1::ProveSession;

    assert_eq!(
        verify_physical_m1_capability_challenge(
            &wrong_purpose,
            &expected_passport(),
            &expected_device(),
            &expected_scopes(),
            1_787_600_777_706,
        ),
        Err(PhysicalM1CapabilityChallengeVerificationError::PurposeMismatch,),
    );

    let mut missing_operation = real_challenge();

    missing_operation.operation_body_hash = None;

    assert_eq!(
        verify_physical_m1_capability_challenge(
            &missing_operation,
            &expected_passport(),
            &expected_device(),
            &expected_scopes(),
            1_787_600_777_706,
        ),
        Err(PhysicalM1CapabilityChallengeVerificationError::OperationBodyHashMissing,),
    );
}

#[test]
fn native_capability_runtime_preserves_authority_and_transport_ordering() {
    let source = fs::read_to_string(repo_file("src/passport_capability_http_runtime.rs"))
        .expect("capability HTTP source");

    for required in [
        "http://127.0.0.1:8090",
        "/identity/passport/capability/challenge",
        "/identity/passport/capability/prove",
        "identity.read",
        "identity.username.claim",
        "load_verified(",
        "verify_physical_m1_capability_challenge",
        "passport_challenge_v1_transcript_b3_hex",
        "sign_desktop_native_passport_device_session_proof",
        "NATIVE_PASSPORT_PRIVATE_BETA_DEVICE_POLICY_VERSION",
        "svc-passport.native-capability-result.v1",
        "validate_issued_capability(",
        "passport_capability_session",
    ] {
        assert!(
            source.contains(required),
            "missing capability marker {required}",
        );
    }

    let authorization = source
        .find("load_verified(")
        .expect("local authorization verification");

    let challenge_post = authorization
        + source[authorization..]
            .find("CAPABILITY_CHALLENGE_PATH")
            .expect("challenge after authorization");

    let trust = source
        .find("verify_physical_m1_capability_challenge(")
        .expect("service challenge trust");

    let signing = source
        .find("sign_desktop_native_passport_device_session_proof(")
        .expect("DeviceKey proof signing");

    let proof_post = source
        .rfind("CAPABILITY_PROOF_PATH")
        .expect("proof submission");

    let capability_validation = source
        .find("validate_issued_capability(")
        .expect("capability validation");

    let capability_validator_definition = source
        .rfind("fn validate_issued_capability(")
        .expect("capability validator definition");

    let capability_validator_body = &source[capability_validator_definition..];

    assert!(
        capability_validator_body.contains(".validate()"),
        "issued capability must receive canonical structural validation",
    );

    let session_store = source
        .rfind(".passport_capability_session")
        .expect("native capability storage");

    assert!(authorization < challenge_post);
    assert!(trust < signing);
    assert!(signing < proof_post);
    assert!(proof_post < capability_validation);
    assert!(capability_validation < session_store);

    for forbidden in [
        "127.0.0.1:9090",
        "127.0.0.1:5307",
        "#[tauri::command]",
        "request_root_pin",
        "request_operational_pin",
        "NativeSecureCompartment::RecoveryRoot",
        "sign_native_recovery",
        "device_signing_seed().to_vec()",
        "device_signing_seed().clone()",
        "claim_username(",
        "wallet.spend(",
        "ledger.write(",
        "localStorage",
        "sessionStorage",
    ] {
        assert!(
            !source.contains(forbidden),
            "capability runtime gained forbidden marker {forbidden}",
        );
    }
}

#[test]
fn capability_proof_time_reuses_shared_bounded_normalization() {
    let runtime = std::fs::read_to_string(
        std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("src/passport_capability_http_runtime.rs"),
    )
    .expect("read capability HTTP runtime");

    assert!(
        runtime.contains("normalize_device_session_proof_created_at_ms("),
        "capability issuance must reuse the reviewed bounded proof-time normalization",
    );

    assert!(
        !runtime.contains("proof_created_at_ms < challenge.issued_at_ms"),
        "capability issuance must not restore the raw zero-skew lower-bound check",
    );

    assert!(
        !runtime.contains("proof_created_at_ms > challenge.expires_at_ms"),
        "capability issuance must not restore the raw zero-skew upper-bound check",
    );
}
