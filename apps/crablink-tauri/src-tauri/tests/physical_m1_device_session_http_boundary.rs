//! RO:WHAT — Locks CrabLink's CN-4 native ProveSession service-trust and HTTP-orchestration boundary.
//! RO:WHY — Physical DeviceKey possession must use the public 8090 gateway, authenticate the pinned svc-passport challenge before signing, and never expose secret or caller-controlled authority.
//! RO:INTERACTS — device-session trust/runtime, actual public managed-CrabNode challenge evidence, local DeviceAuthorization verification, native signing custody, and canonical protocol constants.
//! RO:INVARIANTS — exact ProveSession bindings; local authorization before network; trust before sign; sign before proof submit; no direct 9090/5307 access or root-secret path.
//! RO:METRICS — none.
//! RO:CONFIG — deterministic public challenge evidence from the controlled-beta node.
//! RO:SECURITY — no VMK/seed/PIN/RecoveryRoot/WebView/capability/username/wallet/ledger authority.
//! RO:TEST — cargo test --test physical_m1_device_session_http_boundary.

use std::{fs, path::PathBuf};

use crablink_tauri_lib::passport_device_session_trust::{
    verify_physical_m1_device_session_challenge, PhysicalM1DeviceSessionChallengeVerificationError,
    PHYSICAL_M1_DEVICE_SESSION_TRUST_LABEL,
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
  "version": 1,
  "challenge_id": "challenge:v1:b3:afb48b2c34fb747160589be6b38079d815edac252078a9890f417247ffb46439",
  "network_id": "rustyonions-devnet",
  "environment": "private-beta",
  "audience": "svc-passport",
  "issuing_service_id": "svc-passport",
  "service_key_id": "ed25519/crabnode/svc-passport/30d1d523-28c0-4f60-a677-5156959507a8/v1",
  "purpose": "prove_session",
  "requested_scopes": ["identity.read"],
  "passport_id": "passport:v1:main:ed25519:b3:2c51898d0ee5161bead99d6a9f2a6afa4c0d3abdd4e539f4ce3f5fdee597a2dd",
  "device_id": "device:v1:ed25519:b3:54d9fb339c125915b48f68a3da5c9a4a6493d7813e52aafc3fc645d4e817ee44",
  "nonce": "5573b291e2368a229fe7a14c2625881434a7aa123540c74066e0e26073bf6134",
  "issued_at_ms": 1787545600330,
  "expires_at_ms": 1787545660330,
  "service_signature": "EJ1D6WBfyyuekAg8eQMJcu_Q7WtViXMLPzUXZWNCYGltMk3nhADX_Hhmt-p0Yzhvi9AHUOx1fQYvGx1USjRDBQ"
}"#;

fn repo_file(relative: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join(relative)
}

fn real_challenge() -> PassportChallengeV1 {
    serde_json::from_str(REAL_SERVICE_CHALLENGE_JSON).expect("real public ProveSession challenge")
}

fn expected_passport() -> PassportIdV1 {
    PassportIdV1::parse(REAL_PASSPORT_ID).expect("real Passport")
}

fn expected_device() -> DeviceIdV1 {
    DeviceIdV1::parse(REAL_DEVICE_ID).expect("real Device")
}

fn expected_scopes() -> Vec<NativePassportScopeV1> {
    vec![NativePassportScopeV1::parse("identity.read").expect("identity.read")]
}

#[test]
fn real_managed_crabnode_provesession_challenge_verifies_against_pinned_anchor() {
    assert_eq!(
        PHYSICAL_M1_DEVICE_SESSION_TRUST_LABEL,
        "PHYSICAL_M1_DEVICE_SESSION_CONTROLLED_BETA_TRUST_V1",
    );

    verify_physical_m1_device_session_challenge(
        &real_challenge(),
        &expected_passport(),
        &expected_device(),
        &expected_scopes(),
        1_787_545_601_000,
    )
    .expect("real managed-CrabNode service challenge");
}

#[test]
fn wrong_purpose_and_device_binding_fail_before_device_signing() {
    let mut wrong_purpose = real_challenge();
    wrong_purpose.purpose = PassportChallengePurposeV1::RefreshCapability;

    assert_eq!(
        verify_physical_m1_device_session_challenge(
            &wrong_purpose,
            &expected_passport(),
            &expected_device(),
            &expected_scopes(),
            1_787_545_601_000,
        ),
        Err(PhysicalM1DeviceSessionChallengeVerificationError::PurposeMismatch,),
    );

    let other_device = DeviceIdV1::parse(
        "device:v1:ed25519:b3:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    )
    .expect("other device");

    assert_eq!(
        verify_physical_m1_device_session_challenge(
            &real_challenge(),
            &expected_passport(),
            &other_device,
            &expected_scopes(),
            1_787_545_601_000,
        ),
        Err(PhysicalM1DeviceSessionChallengeVerificationError::DeviceBindingMismatch,),
    );
}

#[test]
fn native_http_runtime_preserves_authority_and_transport_ordering() {
    let source = fs::read_to_string(repo_file("src/passport_device_session_http_runtime.rs"))
        .expect("device-session HTTP source");

    for required in [
        "http://127.0.0.1:8090",
        "/identity/passport/challenge",
        "/identity/passport/prove",
        "load_verified(",
        "verify_physical_m1_device_session_challenge",
        "passport_challenge_v1_transcript_b3_hex",
        "sign_desktop_native_passport_device_session_proof",
        "PHASE8A_PROOF_CHALLENGE_CONTRACT_DOMAIN",
        "PHASE8B_PROOF_CONTRACT_DOMAIN",
        "svc-passport.native-device-session-proof-result.v1",
        "\"proven\"",
    ] {
        assert!(
            source.contains(required),
            "missing required possession marker {required}",
        );
    }

    let authorization = source
        .find("load_verified(")
        .expect("local authorization verification");

    let challenge_post = authorization
        + source[authorization..]
            .find("DEVICE_SESSION_CHALLENGE_PATH")
            .expect("challenge route used after local authorization verification");

    let trust = source
        .find("verify_physical_m1_device_session_challenge(")
        .expect("challenge trust");

    let signing = source
        .find("sign_desktop_native_passport_device_session_proof(")
        .expect("DeviceKey signing");

    let proof_post = source
        .rfind("DEVICE_SESSION_PROOF_PATH")
        .expect("proof route");

    assert!(
        authorization < challenge_post,
        "local signed DeviceAuthorization must be verified before network challenge issuance",
    );

    assert!(
        trust < signing,
        "service challenge trust must be established before DeviceKey signing",
    );

    assert!(
        signing < proof_post,
        "DeviceKey signature must be produced before proof submission",
    );

    for forbidden in [
        "127.0.0.1:9090",
        "127.0.0.1:5307",
        "#[tauri::command]",
        "request_root_pin",
        "request_operational_pin",
        "NativeSecureCompartment::RecoveryRoot",
        "unseal_native_secret(",
        "sign_native_recovery",
        "device_signing_seed().to_vec()",
        "device_signing_seed().clone()",
        "issue_capability(",
        "claim_username(",
        "wallet.spend(",
        "ledger.write(",
    ] {
        assert!(
            !source.contains(forbidden),
            "native possession runtime gained forbidden marker {forbidden}",
        );
    }
}
