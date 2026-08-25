//! RO:WHAT — Authenticates controlled-beta svc-passport IssueCapability challenges before CrabLink permits DeviceKey signing.
//! RO:WHY — Capability issuance carries broader identity authority than possession-only ProveSession and therefore must bind the exact purpose, Passport, Device, scopes, operation hash, TTL, service KID/key/context, signature, and time.
//! RO:INTERACTS — pinned Physical M1 RegisterRoot trust anchor, `ron-auth` strict challenge verification, and canonical Passport/Device/scope challenge DTOs.
//! RO:INVARIANTS — purpose exactly IssueCapability; Passport/Device/scopes exactly native intent; operation-body hash must exist; 60-second challenge TTL; service trust comes only from the pinned local provisioning anchor.
//! RO:METRICS — none.
//! RO:CONFIG — controlled-beta svc-passport trust anchor already provisioned for Physical M1.
//! RO:SECURITY — public verification material only; no HTTP, vault, VMK, DeviceKey, RecoveryRoot, PIN, capability storage, username mutation, wallet, or ledger authority.
//! RO:TEST — `physical_m1_capability_http_boundary.rs` verifies the actual managed-CrabNode challenge observed through port 8090.

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

pub const PHYSICAL_M1_CAPABILITY_TRUST_LABEL: &str =
    "PHYSICAL_M1_ISSUECAPABILITY_CONTROLLED_BETA_TRUST_V1";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[non_exhaustive]
pub enum PhysicalM1CapabilityChallengeVerificationError {
    InvalidPinnedTrustAnchor,
    PurposeMismatch,
    PassportBindingMissing,
    PassportBindingMismatch,
    DeviceBindingMissing,
    DeviceBindingMismatch,
    OperationBodyHashMissing,
    RequestedScopesMismatch,
    ChallengeTtlMismatch,
    ChallengeVerificationFailed,
}

/// Verify one service-signed IssueCapability challenge before the operational
/// DeviceKey may sign its proof transcript.
///
/// # Errors
///
/// Fails closed on any authority-relevant purpose, identity, device, scope,
/// operation-body, TTL, service-key, context, signature, or time mismatch.
pub fn verify_physical_m1_capability_challenge(
    challenge: &PassportChallengeV1,
    expected_passport_id: &PassportIdV1,
    expected_device_id: &DeviceIdV1,
    expected_requested_scopes: &[NativePassportScopeV1],
    now_ms: u64,
) -> Result<(), PhysicalM1CapabilityChallengeVerificationError> {
    let trust = physical_m1_register_root_trust_anchor()
        .map_err(|_| PhysicalM1CapabilityChallengeVerificationError::InvalidPinnedTrustAnchor)?;

    if challenge.purpose != PassportChallengePurposeV1::IssueCapability {
        return Err(PhysicalM1CapabilityChallengeVerificationError::PurposeMismatch);
    }

    let passport_id = challenge
        .passport_id
        .as_ref()
        .ok_or(PhysicalM1CapabilityChallengeVerificationError::PassportBindingMissing)?;

    if passport_id != expected_passport_id {
        return Err(PhysicalM1CapabilityChallengeVerificationError::PassportBindingMismatch);
    }

    let device_id = challenge
        .device_id
        .as_ref()
        .ok_or(PhysicalM1CapabilityChallengeVerificationError::DeviceBindingMissing)?;

    if device_id != expected_device_id {
        return Err(PhysicalM1CapabilityChallengeVerificationError::DeviceBindingMismatch);
    }

    if challenge.operation_body_hash.is_none() {
        return Err(PhysicalM1CapabilityChallengeVerificationError::OperationBodyHashMissing);
    }

    if challenge.requested_scopes.as_slice() != expected_requested_scopes {
        return Err(PhysicalM1CapabilityChallengeVerificationError::RequestedScopesMismatch);
    }

    if challenge.expires_at_ms.checked_sub(challenge.issued_at_ms) != Some(trust.challenge_ttl_ms) {
        return Err(PhysicalM1CapabilityChallengeVerificationError::ChallengeTtlMismatch);
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
    .map_err(|_| PhysicalM1CapabilityChallengeVerificationError::ChallengeVerificationFailed)
}
