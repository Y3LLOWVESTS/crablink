//! RO:WHAT — Pins and verifies the controlled-beta CrabNode svc-passport RegisterRoot service-challenge trust anchor.
//! RO:WHY — Physical RecoveryRoot signing must never occur until CrabLink native code authenticates the service challenge and confirms the exact RegisterRoot intent bindings.
//! RO:INTERACTS — ron-auth strict PassportChallengeV1 verifier, ron-proto typed challenge fields, and the later native RegisterRoot network/signing orchestrator.
//! RO:INVARIANTS — trust comes only from this locally provisioned beta anchor; challenge purpose, Passport ID, scopes, operation hash, device absence, and TTL must exactly match native intent before signing is permitted.
//! RO:METRICS — none; this pure verifier emits no logging.
//! RO:CONFIG — controlled beta pins one durable CrabNode svc-passport KID/public key plus rustyonions-devnet/private-beta/svc-passport context; key rotation requires explicit reprovisioning.
//! RO:SECURITY — public verification material only; no HTTP, Tauri command, vault access, RecoveryRoot unseal, PIN handling, signing, capability issuance, username mutation, wallet mutation, or ledger mutation.
//! RO:TEST — tests/physical_m1_register_root_trust_anchor.rs.

#![forbid(unsafe_code)]

use ron_auth::native_passport::{
    verify_passport_challenge_v1_strict, PassportChallengeVerificationContextV1,
    PassportChallengeVerificationError,
};
use ron_proto::{
    B3DigestHex, Ed25519PublicKeyHex, NativePassportContextLabelV1, NativePassportScopeV1,
    PassportChallengePurposeV1, PassportChallengeV1, PassportIdV1, ServiceKeyIdV1,
};

pub const PHYSICAL_M1_REGISTER_ROOT_TRUST_LABEL: &str =
    "PHYSICAL_M1_REGISTER_ROOT_CONTROLLED_BETA_TRUST_V1";

pub const PHYSICAL_M1_REGISTER_ROOT_NETWORK_ID: &str = "rustyonions-devnet";

pub const PHYSICAL_M1_REGISTER_ROOT_ENVIRONMENT: &str = "private-beta";

pub const PHYSICAL_M1_REGISTER_ROOT_AUDIENCE: &str = "svc-passport";

pub const PHYSICAL_M1_REGISTER_ROOT_ISSUING_SERVICE_ID: &str = "svc-passport";

pub const PHYSICAL_M1_REGISTER_ROOT_SERVICE_KEY_ID: &str =
    "ed25519/crabnode/svc-passport/30d1d523-28c0-4f60-a677-5156959507a8/v1";

pub const PHYSICAL_M1_REGISTER_ROOT_SERVICE_PUBLIC_KEY: &str =
    "cdfa779d2abe1fd568d1c8cf2293f94c3a7b3d87f48321423c18e7f8c74763f7";

pub const PHYSICAL_M1_REGISTER_ROOT_CHALLENGE_TTL_MS: u64 = 60_000;

pub const PHYSICAL_M1_REGISTER_ROOT_ROOT_KEY_EPOCH: u64 = 0;

pub const PHYSICAL_M1_REGISTER_ROOT_MAX_CLOCK_SKEW_MS: u64 = 0;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PhysicalM1RegisterRootTrustAnchorV1 {
    pub network_id: NativePassportContextLabelV1,
    pub environment: NativePassportContextLabelV1,
    pub audience: NativePassportContextLabelV1,
    pub issuing_service_id: NativePassportContextLabelV1,
    pub service_key_id: ServiceKeyIdV1,
    pub service_public_key: Ed25519PublicKeyHex,
    pub challenge_ttl_ms: u64,
    pub trusted_initial_root_key_epoch: u64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
#[non_exhaustive]
pub enum PhysicalM1RegisterRootChallengeVerificationError {
    InvalidPinnedTrustAnchor,
    PurposeMismatch,
    PassportBindingMissing,
    PassportBindingMismatch,
    UnexpectedDeviceBinding,
    OperationBindingMissing,
    OperationBindingMismatch,
    RequestedScopesMismatch,
    ChallengeTtlMismatch,
    ChallengeVerification(PassportChallengeVerificationError),
}

pub fn physical_m1_register_root_trust_anchor(
) -> Result<PhysicalM1RegisterRootTrustAnchorV1, PhysicalM1RegisterRootChallengeVerificationError> {
    let network_id = NativePassportContextLabelV1::parse(PHYSICAL_M1_REGISTER_ROOT_NETWORK_ID)
        .map_err(|_| PhysicalM1RegisterRootChallengeVerificationError::InvalidPinnedTrustAnchor)?;

    let environment = NativePassportContextLabelV1::parse(PHYSICAL_M1_REGISTER_ROOT_ENVIRONMENT)
        .map_err(|_| PhysicalM1RegisterRootChallengeVerificationError::InvalidPinnedTrustAnchor)?;

    let audience = NativePassportContextLabelV1::parse(PHYSICAL_M1_REGISTER_ROOT_AUDIENCE)
        .map_err(|_| PhysicalM1RegisterRootChallengeVerificationError::InvalidPinnedTrustAnchor)?;

    let issuing_service_id = NativePassportContextLabelV1::parse(
        PHYSICAL_M1_REGISTER_ROOT_ISSUING_SERVICE_ID,
    )
    .map_err(|_| PhysicalM1RegisterRootChallengeVerificationError::InvalidPinnedTrustAnchor)?;

    let service_key_id = ServiceKeyIdV1::parse(PHYSICAL_M1_REGISTER_ROOT_SERVICE_KEY_ID)
        .map_err(|_| PhysicalM1RegisterRootChallengeVerificationError::InvalidPinnedTrustAnchor)?;

    let service_public_key =
        Ed25519PublicKeyHex::parse(PHYSICAL_M1_REGISTER_ROOT_SERVICE_PUBLIC_KEY).map_err(|_| {
            PhysicalM1RegisterRootChallengeVerificationError::InvalidPinnedTrustAnchor
        })?;

    Ok(PhysicalM1RegisterRootTrustAnchorV1 {
        network_id,
        environment,
        audience,
        issuing_service_id,
        service_key_id,
        service_public_key,
        challenge_ttl_ms: PHYSICAL_M1_REGISTER_ROOT_CHALLENGE_TTL_MS,
        trusted_initial_root_key_epoch: PHYSICAL_M1_REGISTER_ROOT_ROOT_KEY_EPOCH,
    })
}

pub fn verify_physical_m1_register_root_challenge(
    challenge: &PassportChallengeV1,
    expected_passport_id: &PassportIdV1,
    expected_requested_scopes: &[NativePassportScopeV1],
    expected_operation_body_hash: &B3DigestHex,
    now_ms: u64,
) -> Result<(), PhysicalM1RegisterRootChallengeVerificationError> {
    let trust = physical_m1_register_root_trust_anchor()?;

    if challenge.purpose != PassportChallengePurposeV1::RegisterRoot {
        return Err(PhysicalM1RegisterRootChallengeVerificationError::PurposeMismatch);
    }

    let passport_id = challenge
        .passport_id
        .as_ref()
        .ok_or(PhysicalM1RegisterRootChallengeVerificationError::PassportBindingMissing)?;

    if passport_id != expected_passport_id {
        return Err(PhysicalM1RegisterRootChallengeVerificationError::PassportBindingMismatch);
    }

    if challenge.device_id.is_some() {
        return Err(PhysicalM1RegisterRootChallengeVerificationError::UnexpectedDeviceBinding);
    }

    let operation_body_hash = challenge
        .operation_body_hash
        .as_ref()
        .ok_or(PhysicalM1RegisterRootChallengeVerificationError::OperationBindingMissing)?;

    if operation_body_hash != expected_operation_body_hash {
        return Err(PhysicalM1RegisterRootChallengeVerificationError::OperationBindingMismatch);
    }

    if challenge.requested_scopes.as_slice() != expected_requested_scopes {
        return Err(PhysicalM1RegisterRootChallengeVerificationError::RequestedScopesMismatch);
    }

    if challenge.expires_at_ms.checked_sub(challenge.issued_at_ms) != Some(trust.challenge_ttl_ms) {
        return Err(PhysicalM1RegisterRootChallengeVerificationError::ChallengeTtlMismatch);
    }

    verify_passport_challenge_v1_strict(
        challenge,
        PassportChallengeVerificationContextV1 {
            trusted_service_public_key: &trust.service_public_key,
            expected_network_id: &trust.network_id,
            expected_environment: &trust.environment,
            expected_audience: &trust.audience,
            expected_issuing_service_id: &trust.issuing_service_id,
            expected_service_key_id: &trust.service_key_id,
            now_ms,
            max_clock_skew_ms: PHYSICAL_M1_REGISTER_ROOT_MAX_CLOCK_SKEW_MS,
        },
    )
    .map_err(PhysicalM1RegisterRootChallengeVerificationError::ChallengeVerification)
}
