//! RO:WHAT — Locks the Physical M1 controlled-beta svc-passport trust anchor and fail-closed RegisterRoot challenge verifier.
//! RO:WHY — A physical RecoveryRoot must never sign a server challenge unless native CrabLink authenticates the pinned service key/context and exact client intent.
//! RO:INTERACTS — passport_register_root_trust, ron-auth strict challenge verification, and ron-proto PassportChallengeV1.
//! RO:INVARIANTS — exact beta key/KID/context are locally pinned; wrong purpose, Passport, scopes, operation hash, TTL, KID, or signature rejects before future root signing.
//! RO:METRICS — none.
//! RO:CONFIG — deterministic public challenge fixtures only; no live backend or physical Passport mutation.
//! RO:SECURITY — no RecoveryRoot, PIN, vault, platform unseal, Tauri command, HTTP, capability, username, wallet, or ledger authority.
//! RO:TEST — cargo test --test physical_m1_register_root_trust_anchor.

use std::{fs, path::PathBuf};

use crablink_tauri_lib::passport_register_root_trust::{
    physical_m1_register_root_trust_anchor, verify_physical_m1_register_root_challenge,
    PhysicalM1RegisterRootChallengeVerificationError, PHYSICAL_M1_REGISTER_ROOT_AUDIENCE,
    PHYSICAL_M1_REGISTER_ROOT_CHALLENGE_TTL_MS, PHYSICAL_M1_REGISTER_ROOT_ENVIRONMENT,
    PHYSICAL_M1_REGISTER_ROOT_ISSUING_SERVICE_ID, PHYSICAL_M1_REGISTER_ROOT_MAX_CLOCK_SKEW_MS,
    PHYSICAL_M1_REGISTER_ROOT_NETWORK_ID, PHYSICAL_M1_REGISTER_ROOT_ROOT_KEY_EPOCH,
    PHYSICAL_M1_REGISTER_ROOT_SERVICE_KEY_ID, PHYSICAL_M1_REGISTER_ROOT_TRUST_LABEL,
};
use ron_auth::native_passport::PassportChallengeVerificationError;
use ron_proto::{
    B3DigestHex, ChallengeIdV1, Ed25519SignatureV1, NativePassportContextLabelV1,
    NativePassportScopeV1, PassportChallengePurposeV1, PassportChallengeV1, PassportIdV1,
    ServiceKeyIdV1, PASSPORT_CHALLENGE_V1_VERSION,
};

const PASSPORT_A: &str =
    "passport:v1:main:ed25519:b3:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

const PASSPORT_B: &str =
    "passport:v1:main:ed25519:b3:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

const CHALLENGE_ID: &str =
    "challenge:v1:b3:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";

const OPERATION_HASH_A: &str = "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";

const OPERATION_HASH_B: &str = "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

const NONCE: &str = "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

const ISSUED_AT_MS: u64 = 1_000_000;
const EXPIRES_AT_MS: u64 = ISSUED_AT_MS + PHYSICAL_M1_REGISTER_ROOT_CHALLENGE_TTL_MS;

fn context(value: &str) -> NativePassportContextLabelV1 {
    NativePassportContextLabelV1::parse(value).expect("context")
}

fn scope(value: &str) -> NativePassportScopeV1 {
    NativePassportScopeV1::parse(value).expect("scope")
}

fn passport(value: &str) -> PassportIdV1 {
    PassportIdV1::parse(value).expect("Passport ID")
}

fn operation_hash(value: &str) -> B3DigestHex {
    B3DigestHex::parse("operation_body_hash", value).expect("operation hash")
}

fn expected_scopes() -> Vec<NativePassportScopeV1> {
    vec![scope("identity.read"), scope("profile.read")]
}

fn unsigned_matching_challenge() -> PassportChallengeV1 {
    PassportChallengeV1 {
        version: PASSPORT_CHALLENGE_V1_VERSION,
        challenge_id: ChallengeIdV1::parse(CHALLENGE_ID).expect("challenge ID"),
        network_id: context(PHYSICAL_M1_REGISTER_ROOT_NETWORK_ID),
        environment: context(PHYSICAL_M1_REGISTER_ROOT_ENVIRONMENT),
        audience: context(PHYSICAL_M1_REGISTER_ROOT_AUDIENCE),
        issuing_service_id: context(PHYSICAL_M1_REGISTER_ROOT_ISSUING_SERVICE_ID),
        service_key_id: ServiceKeyIdV1::parse(PHYSICAL_M1_REGISTER_ROOT_SERVICE_KEY_ID)
            .expect("service KID"),
        purpose: PassportChallengePurposeV1::RegisterRoot,
        requested_scopes: expected_scopes(),
        passport_id: Some(passport(PASSPORT_A)),
        device_id: None,
        operation_body_hash: Some(operation_hash(OPERATION_HASH_A)),
        nonce: B3DigestHex::parse("challenge_nonce", NONCE).expect("challenge nonce"),
        issued_at_ms: ISSUED_AT_MS,
        expires_at_ms: EXPIRES_AT_MS,
        service_signature: Ed25519SignatureV1::from_bytes([0x44; 64]),
    }
}

#[test]
fn physical_m1_controlled_beta_anchor_is_exact_and_typed() {
    assert_eq!(
        PHYSICAL_M1_REGISTER_ROOT_TRUST_LABEL,
        "PHYSICAL_M1_REGISTER_ROOT_CONTROLLED_BETA_TRUST_V1",
    );

    let trust = physical_m1_register_root_trust_anchor().expect("pinned trust anchor");

    assert_eq!(trust.network_id.as_str(), "rustyonions-devnet",);

    assert_eq!(trust.environment.as_str(), "private-beta",);

    assert_eq!(trust.audience.as_str(), "svc-passport",);

    assert_eq!(trust.issuing_service_id.as_str(), "svc-passport",);

    assert_eq!(
        trust.service_key_id.as_str(),
        "ed25519/crabnode/svc-passport/30d1d523-28c0-4f60-a677-5156959507a8/v1",
    );

    assert_eq!(
        trust.service_public_key.as_str(),
        "cdfa779d2abe1fd568d1c8cf2293f94c3a7b3d87f48321423c18e7f8c74763f7",
    );

    assert_eq!(trust.challenge_ttl_ms, 60_000,);

    assert_eq!(trust.trusted_initial_root_key_epoch, 0,);

    assert_eq!(PHYSICAL_M1_REGISTER_ROOT_MAX_CLOCK_SKEW_MS, 0,);

    assert_eq!(PHYSICAL_M1_REGISTER_ROOT_ROOT_KEY_EPOCH, 0,);
}

#[test]
fn matching_intent_reaches_pinned_crypto_and_invalid_signature_rejects() {
    let challenge = unsigned_matching_challenge();

    let error = verify_physical_m1_register_root_challenge(
        &challenge,
        &passport(PASSPORT_A),
        &expected_scopes(),
        &operation_hash(OPERATION_HASH_A),
        ISSUED_AT_MS + 1,
    )
    .expect_err("fixture signature is intentionally not from the pinned physical service key");

    assert_eq!(
        error,
        PhysicalM1RegisterRootChallengeVerificationError::ChallengeVerification(
            PassportChallengeVerificationError::InvalidServiceSignature,
        ),
    );
}

#[test]
fn wrong_service_kid_is_rejected_by_pinned_strict_context() {
    let mut challenge = unsigned_matching_challenge();

    challenge.service_key_id = ServiceKeyIdV1::parse("ed25519/crabnode/svc-passport/untrusted/v1")
        .expect("alternate service KID");

    let error = verify_physical_m1_register_root_challenge(
        &challenge,
        &passport(PASSPORT_A),
        &expected_scopes(),
        &operation_hash(OPERATION_HASH_A),
        ISSUED_AT_MS + 1,
    )
    .expect_err("wrong KID must reject");

    assert_eq!(
        error,
        PhysicalM1RegisterRootChallengeVerificationError::ChallengeVerification(
            PassportChallengeVerificationError::ServiceKeyIdMismatch,
        ),
    );
}

#[test]
fn register_root_intent_binding_fails_closed_before_future_signing() {
    let mut challenge = unsigned_matching_challenge();

    challenge.purpose = PassportChallengePurposeV1::AuthorizeDevice;

    assert_eq!(
        verify_physical_m1_register_root_challenge(
            &challenge,
            &passport(PASSPORT_A),
            &expected_scopes(),
            &operation_hash(OPERATION_HASH_A),
            ISSUED_AT_MS + 1,
        ),
        Err(PhysicalM1RegisterRootChallengeVerificationError::PurposeMismatch,),
    );

    let challenge = unsigned_matching_challenge();

    assert_eq!(
        verify_physical_m1_register_root_challenge(
            &challenge,
            &passport(PASSPORT_B),
            &expected_scopes(),
            &operation_hash(OPERATION_HASH_A),
            ISSUED_AT_MS + 1,
        ),
        Err(PhysicalM1RegisterRootChallengeVerificationError::PassportBindingMismatch,),
    );

    assert_eq!(
        verify_physical_m1_register_root_challenge(
            &challenge,
            &passport(PASSPORT_A),
            &[scope("identity.read")],
            &operation_hash(OPERATION_HASH_A),
            ISSUED_AT_MS + 1,
        ),
        Err(PhysicalM1RegisterRootChallengeVerificationError::RequestedScopesMismatch,),
    );

    assert_eq!(
        verify_physical_m1_register_root_challenge(
            &challenge,
            &passport(PASSPORT_A),
            &expected_scopes(),
            &operation_hash(OPERATION_HASH_B),
            ISSUED_AT_MS + 1,
        ),
        Err(PhysicalM1RegisterRootChallengeVerificationError::OperationBindingMismatch,),
    );

    let mut wrong_ttl = unsigned_matching_challenge();

    wrong_ttl.expires_at_ms = wrong_ttl.expires_at_ms.saturating_add(1);

    assert_eq!(
        verify_physical_m1_register_root_challenge(
            &wrong_ttl,
            &passport(PASSPORT_A),
            &expected_scopes(),
            &operation_hash(OPERATION_HASH_A),
            ISSUED_AT_MS + 1,
        ),
        Err(PhysicalM1RegisterRootChallengeVerificationError::ChallengeTtlMismatch,),
    );
}

#[test]
fn trust_module_has_no_network_secret_or_signing_authority() {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));

    let source = fs::read_to_string(root.join("src/passport_register_root_trust.rs"))
        .expect("trust module source");

    for required in [
        "verify_passport_challenge_v1_strict",
        "PassportChallengeVerificationContextV1",
        "PassportChallengePurposeV1::RegisterRoot",
        "PHYSICAL_M1_REGISTER_ROOT_SERVICE_KEY_ID",
        "PHYSICAL_M1_REGISTER_ROOT_SERVICE_PUBLIC_KEY",
        "expected_passport_id",
        "expected_requested_scopes",
        "expected_operation_body_hash",
    ] {
        assert!(
            source.contains(required),
            "trust module missing required boundary {required}",
        );
    }

    for forbidden in [
        "reqwest::",
        "#[tauri::command]",
        "tauri::command",
        "passport_vault_store",
        "passport_secret_surface",
        "request_root_confirmation_pin",
        "NativeSecureCompartment",
        "unseal_native_secret",
        "sign_native_recovery_root_registration_proof_v1",
        "write_native_encrypted_vault_atomic",
        "std::fs::write",
        "tokio::fs",
        "issue_capability(",
        "username.claim(",
        "wallet.spend(",
        "ledger.write(",
    ] {
        assert!(
            !source.contains(forbidden),
            "trust module gained forbidden authority {forbidden}",
        );
    }
}
