//! RO:WHAT — Verifies controlled-beta svc-passport ProveSession challenges against CrabLink's existing pinned service trust anchor and exact native device intent.
//! RO:WHY — The operational DeviceKey must never sign a possession proof until native CrabLink authenticates the issuing service and every authority-relevant challenge binding.
//! RO:INTERACTS — existing RegisterRoot controlled-beta trust anchor, ron-auth strict PassportChallenge verifier, and ron-proto Passport/Device/scope challenge DTOs.
//! RO:INVARIANTS — purpose is exactly ProveSession; Passport and Device bindings exactly match native state; operation body hash is absent; requested scopes and 60-second TTL match native intent; service KID/key/context come only from the local pinned anchor.
//! RO:METRICS — none; pure verification.
//! RO:CONFIG — reuses the controlled-beta svc-passport trust anchor already provisioned for Physical M1.
//! RO:SECURITY — public verification material only; no HTTP, vault, VMK, DeviceKey, RecoveryRoot, PIN, signing, Tauri command, capability, username, wallet, or ledger authority.
//! RO:TEST — physical_m1_device_session_http_boundary.rs includes the actual public service-signed challenge observed through the managed CrabNode.

#![forbid(unsafe_code)]

use ron_auth::native_passport::{
    verify_passport_challenge_v1_strict, PassportChallengeVerificationContextV1,
};
use ron_proto::{
    DeviceIdV1, NativePassportScopeV1, PassportChallengePurposeV1, PassportChallengeV1,
    PassportIdV1,
};

use crate::passport_register_root_trust::{
    physical_m1_register_root_trust_anchor, PHYSICAL_M1_REGISTER_ROOT_MAX_CLOCK_SKEW_MS,
};

pub const PHYSICAL_M1_DEVICE_SESSION_TRUST_LABEL: &str =
    "PHYSICAL_M1_DEVICE_SESSION_CONTROLLED_BETA_TRUST_V1";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[non_exhaustive]
pub enum PhysicalM1DeviceSessionChallengeVerificationError {
    InvalidPinnedTrustAnchor,
    PurposeMismatch,
    PassportBindingMissing,
    PassportBindingMismatch,
    DeviceBindingMissing,
    DeviceBindingMismatch,
    UnexpectedOperationBodyHash,
    RequestedScopesMismatch,
    ChallengeTtlMismatch,
    ChallengeVerificationFailed,
}

/// Verify one service-signed Physical M1 ProveSession challenge before the
/// operational DeviceKey is allowed to sign.
///
/// # Errors
///
/// Fails closed on any purpose, Passport, Device, scope, operation-body, TTL,
/// service-key, service-context, signature, or time mismatch.
pub fn verify_physical_m1_device_session_challenge(
    challenge: &PassportChallengeV1,
    expected_passport_id: &PassportIdV1,
    expected_device_id: &DeviceIdV1,
    expected_requested_scopes: &[NativePassportScopeV1],
    now_ms: u64,
) -> Result<(), PhysicalM1DeviceSessionChallengeVerificationError> {
    let trust = physical_m1_register_root_trust_anchor()
        .map_err(|_| PhysicalM1DeviceSessionChallengeVerificationError::InvalidPinnedTrustAnchor)?;

    if challenge.purpose != PassportChallengePurposeV1::ProveSession {
        return Err(PhysicalM1DeviceSessionChallengeVerificationError::PurposeMismatch);
    }

    let passport_id = challenge
        .passport_id
        .as_ref()
        .ok_or(PhysicalM1DeviceSessionChallengeVerificationError::PassportBindingMissing)?;

    if passport_id != expected_passport_id {
        return Err(PhysicalM1DeviceSessionChallengeVerificationError::PassportBindingMismatch);
    }

    let device_id = challenge
        .device_id
        .as_ref()
        .ok_or(PhysicalM1DeviceSessionChallengeVerificationError::DeviceBindingMissing)?;

    if device_id != expected_device_id {
        return Err(PhysicalM1DeviceSessionChallengeVerificationError::DeviceBindingMismatch);
    }

    if challenge.operation_body_hash.is_some() {
        return Err(PhysicalM1DeviceSessionChallengeVerificationError::UnexpectedOperationBodyHash);
    }

    if challenge.requested_scopes.as_slice() != expected_requested_scopes {
        return Err(PhysicalM1DeviceSessionChallengeVerificationError::RequestedScopesMismatch);
    }

    if challenge.expires_at_ms.checked_sub(challenge.issued_at_ms) != Some(trust.challenge_ttl_ms) {
        return Err(PhysicalM1DeviceSessionChallengeVerificationError::ChallengeTtlMismatch);
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
    .map_err(|_| PhysicalM1DeviceSessionChallengeVerificationError::ChallengeVerificationFailed)
}
