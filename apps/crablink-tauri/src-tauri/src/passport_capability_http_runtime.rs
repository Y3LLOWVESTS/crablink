//! RO:WHAT — Executes CrabLink's native fixed IssueCapability challenge → service verification → DeviceKey proof → capability validation → memory-only session flow through gateway port 8090.
//! RO:WHY — CN-4 must obtain real bounded username-claim authority without exposing DeviceKey material, capability material, or authority inputs to React.
//! RO:INTERACTS — AppState HTTP/settings, public Passport descriptor, authenticated V2 device identity, persisted DeviceAuthorization, pinned capability challenge trust, canonical DeviceSession proof transcript, native DeviceKey signer, ron-policy version, and memory-only capability session.
//! RO:INVARIANTS — exact canonical scopes are identity.read + identity.username.claim; local DeviceAuthorization is verified before network I/O; gateway exactly 8090; challenge trust before signing; proof and returned server capability timestamps use the reviewed bounded cross-host clock-skew policy; response capability must match the signed challenge and current authorization; no lock crosses await; capability is stored only after every check passes.
//! RO:METRICS — none; errors remain stable/redacted classes.
//! RO:CONFIG — controlled beta gateway http://127.0.0.1:8090, request timeout at most 30 seconds, server challenge TTL 60 seconds, reviewed 5-second cross-host challenge clock-skew policy, accepted capability lifetime at most one hour.
//! RO:SECURITY — no RecoveryRoot, root PIN, VMK/seed export, generic signing command, direct 9090/5307 access, WebView authority fields, durable capability persistence, username mutation, wallet mutation, or ledger mutation.
//! RO:TEST — `physical_m1_capability_http_boundary.rs`, session-store unit tests, then physical signed-app acceptance.

#![forbid(unsafe_code)]

use std::time::{Duration, SystemTime, UNIX_EPOCH};

use ron_auth::native_passport::{
    passport_challenge_v1_transcript_b3_hex, DeviceSessionProofTranscriptV1,
};

use ron_policy::NATIVE_PASSPORT_PRIVATE_BETA_DEVICE_POLICY_VERSION;

use ron_proto::{
    B3DigestHex, DeviceIdV1 as ProtoDeviceIdV1, Ed25519SignatureV1,
    NativePassportDeviceBoundCapabilityV1, NativePassportScopeV1, PassportChallengeV1,
    PassportIdV1 as ProtoPassportIdV1,
};

use serde::{Deserialize, Serialize};

use svc_passport::native::{
    PHASE8A_PROOF_CHALLENGE_CONTRACT_DOMAIN, PHASE8A_PROOF_CHALLENGE_CONTRACT_VERSION,
    PHASE8B_PROOF_CONTRACT_DOMAIN, PHASE8B_PROOF_CONTRACT_VERSION,
};

use crate::{
    passport_capability_session::DesktopCapabilitySessionError,
    passport_capability_trust::verify_physical_m1_capability_challenge,
    passport_device_authorization_runtime_context::{
        PHYSICAL_M1_PRIVATE_BETA_AUTHORIZATION_ENVIRONMENT, PHYSICAL_M1_PRIVATE_BETA_NETWORK_ID,
        PHYSICAL_M1_PRIVATE_BETA_ROOT_KEY_EPOCH,
    },
    passport_device_authorization_store::DesktopDeviceAuthorizationVerificationContextV1,
    passport_device_session_http_runtime::normalize_device_session_proof_created_at_ms,
    passport_device_session_signing_runtime::sign_desktop_native_passport_device_session_proof,
    passport_register_root_trust::PHYSICAL_M1_REGISTER_ROOT_MAX_CLOCK_SKEW_MS,
    passport_vault_v2_migration_runtime::read_desktop_native_passport_session_device_public_identity,
    state::AppState,
};

pub const PHYSICAL_M1_CAPABILITY_HTTP_LABEL: &str = "PHYSICAL_M1_NATIVE_ISSUECAPABILITY_HTTP_V1";

pub const PHYSICAL_M1_CAPABILITY_GATEWAY_URL: &str = "http://127.0.0.1:8090";

const CAPABILITY_CHALLENGE_PATH: &str = "/identity/passport/capability/challenge";

const CAPABILITY_PROOF_PATH: &str = "/identity/passport/capability/prove";

const CAPABILITY_RESULT_SCHEMA: &str = "svc-passport.native-capability-result.v1";

const CAPABILITY_MAX_RESPONSE_BODY_BYTES: usize = 16 * 1024;

const CAPABILITY_MAX_REQUEST_TIMEOUT_MS: u64 = 30_000;

const PHYSICAL_M1_CAPABILITY_MAX_TTL_MS: u64 = 3_600_000;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DesktopCapabilityIssueOutcomeV1 {
    pub local_device_authorization_verified: bool,
    pub service_challenge_verified: bool,
    pub capability_issued: bool,
    pub capability_stored_native_only: bool,
    pub capability_expires_at_ms: u64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[non_exhaustive]
pub enum DesktopCapabilityHttpError {
    PublicDescriptorLoadFailed,
    PublicDescriptorMissing,
    DeviceIdentityUnavailable,
    ClockUnavailable,
    StoredDeviceAuthorizationRejected,
    StoredDeviceAuthorizationMissing,
    StoredDeviceAuthorizationScopeRejected,
    ProtocolIdentityConversionFailed,
    GatewaySettingsUnavailable,
    GatewayConfigurationRejected,
    InvalidRequestTimeout,
    ChallengeRequestFailed,
    ChallengeResponseRejected,
    ChallengeResponseTooLarge,
    ChallengeResponseReadFailed,
    ChallengeDecodeFailed,
    ChallengeTrustRejected,
    ChallengeHashFailed,
    ProofTimeOutsideChallenge,
    DeviceSigningFailed,
    ProofRequestFailed,
    ProofResponseRejected,
    ProofResponseTooLarge,
    ProofResponseReadFailed,
    ProofDecodeFailed,
    ProofResultRejected,
    CapabilityBindingRejected,
    CapabilitySessionRejected,
}

impl From<DesktopCapabilitySessionError> for DesktopCapabilityHttpError {
    fn from(_: DesktopCapabilitySessionError) -> Self {
        Self::CapabilitySessionRejected
    }
}

#[derive(Debug, Serialize)]
#[serde(deny_unknown_fields)]
struct CapabilityChallengeRequestV1 {
    passport_id: ProtoPassportIdV1,
    device_id: ProtoDeviceIdV1,
    requested_scopes: Vec<NativePassportScopeV1>,
}

#[derive(Debug, Serialize)]
#[serde(deny_unknown_fields)]
struct CapabilityProofRequestV1 {
    challenge: PassportChallengeV1,
    proof_created_at_ms: u64,
    proof_signature: Ed25519SignatureV1,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct CapabilityProofResultV1 {
    schema: String,
    status: String,
    capability: NativePassportDeviceBoundCapabilityV1,
    durable_generation: u64,
}

/// Obtain and retain one fixed short-lived capability for the Physical M1
/// root-admin desktop device.
///
/// No caller-controlled Passport ID, Device ID, scopes, gateway, purpose,
/// service trust, policy version, signature, PIN, or secret material is
/// accepted.
///
/// # Errors
///
/// Fails closed unless local durable identity/authorization state is valid,
/// the service challenge authenticates against pinned trust, DeviceKey proof
/// succeeds, and the resulting capability exactly matches native intent.
pub async fn issue_physical_m1_username_capability(
    state: &AppState,
) -> Result<DesktopCapabilityIssueOutcomeV1, DesktopCapabilityHttpError> {
    let public_identity = state
        .passport_public_identity_store
        .load()
        .map_err(|_| DesktopCapabilityHttpError::PublicDescriptorLoadFailed)?
        .ok_or(DesktopCapabilityHttpError::PublicDescriptorMissing)?;

    let device_identity = read_desktop_native_passport_session_device_public_identity(
        &state.passport_vault_store,
        &state.passport_operational_session,
    )
    .map_err(|_| DesktopCapabilityHttpError::DeviceIdentityUnavailable)?;

    let passport_id = ProtoPassportIdV1::parse(public_identity.passport_id.as_str())
        .map_err(|_| DesktopCapabilityHttpError::ProtocolIdentityConversionFailed)?;

    let device_id = ProtoDeviceIdV1::parse(device_identity.device_id.as_str())
        .map_err(|_| DesktopCapabilityHttpError::ProtocolIdentityConversionFailed)?;

    let requested_scopes = vec![
        NativePassportScopeV1::parse("identity.read")
            .map_err(|_| DesktopCapabilityHttpError::ProtocolIdentityConversionFailed)?,
        NativePassportScopeV1::parse("identity.username.claim")
            .map_err(|_| DesktopCapabilityHttpError::ProtocolIdentityConversionFailed)?,
    ];

    let authorization_now_ms = current_unix_time_ms()?;

    let authorization = state
        .passport_device_authorization_store
        .load_verified(DesktopDeviceAuthorizationVerificationContextV1 {
            trusted_root: &public_identity,
            expected_device: &device_identity,
            expected_network_id: PHYSICAL_M1_PRIVATE_BETA_NETWORK_ID,
            expected_environment: PHYSICAL_M1_PRIVATE_BETA_AUTHORIZATION_ENVIRONMENT,
            trusted_root_key_epoch: PHYSICAL_M1_PRIVATE_BETA_ROOT_KEY_EPOCH,
            now_ms: authorization_now_ms,
            max_clock_skew_ms: 0,
        })
        .map_err(|_| DesktopCapabilityHttpError::StoredDeviceAuthorizationRejected)?
        .ok_or(DesktopCapabilityHttpError::StoredDeviceAuthorizationMissing)?;

    if authorization.passport_id != passport_id || authorization.device_id != device_id {
        return Err(DesktopCapabilityHttpError::StoredDeviceAuthorizationRejected);
    }

    for requested_scope in &requested_scopes {
        if authorization
            .authorized_scope_ceiling
            .as_slice()
            .iter()
            .all(|allowed| allowed != requested_scope)
        {
            return Err(DesktopCapabilityHttpError::StoredDeviceAuthorizationScopeRejected);
        }
    }

    let (gateway_url, timeout_ms) = {
        let settings = state
            .settings
            .lock()
            .map_err(|_| DesktopCapabilityHttpError::GatewaySettingsUnavailable)?;

        (
            settings.gateway_url.trim_end_matches('/').to_owned(),
            settings
                .request_timeout_ms
                .min(CAPABILITY_MAX_REQUEST_TIMEOUT_MS),
        )
    };

    if gateway_url != PHYSICAL_M1_CAPABILITY_GATEWAY_URL {
        return Err(DesktopCapabilityHttpError::GatewayConfigurationRejected);
    }

    if timeout_ms == 0 {
        return Err(DesktopCapabilityHttpError::InvalidRequestTimeout);
    }

    let timeout = Duration::from_millis(timeout_ms);

    let client = state.http.clone();

    let challenge_request = CapabilityChallengeRequestV1 {
        passport_id: passport_id.clone(),
        device_id: device_id.clone(),
        requested_scopes: requested_scopes.clone(),
    };

    let challenge_response = client
        .post(format!("{gateway_url}{CAPABILITY_CHALLENGE_PATH}"))
        .timeout(timeout)
        .json(&challenge_request)
        .send()
        .await
        .map_err(|_| DesktopCapabilityHttpError::ChallengeRequestFailed)?;

    if !challenge_response.status().is_success() {
        return Err(DesktopCapabilityHttpError::ChallengeResponseRejected);
    }

    let challenge_bytes = read_bounded_response_body(
        challenge_response,
        DesktopCapabilityHttpError::ChallengeResponseReadFailed,
        DesktopCapabilityHttpError::ChallengeResponseTooLarge,
    )
    .await?;

    let challenge: PassportChallengeV1 = serde_json::from_slice(&challenge_bytes)
        .map_err(|_| DesktopCapabilityHttpError::ChallengeDecodeFailed)?;

    let challenge_verify_now_ms = current_unix_time_ms()?;

    verify_physical_m1_capability_challenge(
        &challenge,
        &passport_id,
        &device_id,
        &requested_scopes,
        challenge_verify_now_ms,
    )
    .map_err(|_| DesktopCapabilityHttpError::ChallengeTrustRejected)?;

    let challenge_hash_text = passport_challenge_v1_transcript_b3_hex(&challenge.signing_payload())
        .map_err(|_| DesktopCapabilityHttpError::ChallengeHashFailed)?;

    let challenge_transcript_hash =
        B3DigestHex::parse("challenge_transcript_hash", challenge_hash_text)
            .map_err(|_| DesktopCapabilityHttpError::ChallengeHashFailed)?;

    let proof_created_at_ms = normalize_device_session_proof_created_at_ms(
        challenge.issued_at_ms,
        challenge.expires_at_ms,
        current_unix_time_ms()?,
    )
    .map_err(|_| DesktopCapabilityHttpError::ProofTimeOutsideChallenge)?;

    let proof_signature = {
        let transcript = DeviceSessionProofTranscriptV1 {
            challenge_contract_domain: PHASE8A_PROOF_CHALLENGE_CONTRACT_DOMAIN,
            challenge_contract_version: PHASE8A_PROOF_CHALLENGE_CONTRACT_VERSION,
            proof_contract_domain: PHASE8B_PROOF_CONTRACT_DOMAIN,
            proof_contract_version: PHASE8B_PROOF_CONTRACT_VERSION,
            challenge_id: &challenge.challenge_id,
            network_id: &challenge.network_id,
            environment: &challenge.environment,
            audience: &challenge.audience,
            passport_id: &passport_id,
            device_id: &device_id,
            device_public_key: &authorization.device_public_key,
            challenge_transcript_hash: &challenge_transcript_hash,
            requested_scopes: &challenge.requested_scopes,
            challenge_issued_at_ms: challenge.issued_at_ms,
            challenge_expires_at_ms: challenge.expires_at_ms,
            proof_created_at_ms,
        };

        sign_desktop_native_passport_device_session_proof(
            &state.passport_vault_store,
            &state.passport_operational_session,
            &transcript,
        )
        .map_err(|_| DesktopCapabilityHttpError::DeviceSigningFailed)?
    };

    let proof_request = CapabilityProofRequestV1 {
        challenge: challenge.clone(),
        proof_created_at_ms,
        proof_signature,
    };

    let proof_response = client
        .post(format!("{gateway_url}{CAPABILITY_PROOF_PATH}"))
        .timeout(timeout)
        .json(&proof_request)
        .send()
        .await
        .map_err(|_| DesktopCapabilityHttpError::ProofRequestFailed)?;

    if !proof_response.status().is_success() {
        return Err(DesktopCapabilityHttpError::ProofResponseRejected);
    }

    let proof_bytes = read_bounded_response_body(
        proof_response,
        DesktopCapabilityHttpError::ProofResponseReadFailed,
        DesktopCapabilityHttpError::ProofResponseTooLarge,
    )
    .await?;

    let result: CapabilityProofResultV1 = serde_json::from_slice(&proof_bytes)
        .map_err(|_| DesktopCapabilityHttpError::ProofDecodeFailed)?;

    if result.schema != CAPABILITY_RESULT_SCHEMA
        || !matches!(result.status.as_str(), "issued" | "already_issued")
        || result.durable_generation == 0
    {
        return Err(DesktopCapabilityHttpError::ProofResultRejected);
    }

    let result_now_ms = current_unix_time_ms()?;

    validate_issued_capability(
        &result.capability,
        &challenge,
        &authorization,
        proof_created_at_ms,
        result_now_ms,
    )?;

    let capability_expires_at_ms = result.capability.expires_at_ms;

    state
        .passport_capability_session
        .replace(result.capability, result_now_ms)?;

    Ok(DesktopCapabilityIssueOutcomeV1 {
        local_device_authorization_verified: true,
        service_challenge_verified: true,
        capability_issued: true,
        capability_stored_native_only: true,
        capability_expires_at_ms,
    })
}

fn capability_issue_precedes_proof_beyond_clock_skew(
    capability_issued_at_ms: u64,
    proof_created_at_ms: u64,
) -> bool {
    capability_issued_at_ms.saturating_add(PHYSICAL_M1_REGISTER_ROOT_MAX_CLOCK_SKEW_MS)
        < proof_created_at_ms
}

fn validate_issued_capability(
    capability: &NativePassportDeviceBoundCapabilityV1,
    challenge: &PassportChallengeV1,
    authorization: &ron_proto::DeviceAuthorizationV1,
    proof_created_at_ms: u64,
    now_ms: u64,
) -> Result<(), DesktopCapabilityHttpError> {
    capability
        .validate()
        .map_err(|_| DesktopCapabilityHttpError::CapabilityBindingRejected)?;

    let passport_id = challenge
        .passport_id
        .as_ref()
        .ok_or(DesktopCapabilityHttpError::CapabilityBindingRejected)?;

    let device_id = challenge
        .device_id
        .as_ref()
        .ok_or(DesktopCapabilityHttpError::CapabilityBindingRejected)?;

    if &capability.passport_id != passport_id
        || &capability.device_id != device_id
        || capability.audience != challenge.audience
        || capability.environment != challenge.environment
        || capability.scopes != challenge.requested_scopes
        || capability.policy_version != NATIVE_PASSPORT_PRIVATE_BETA_DEVICE_POLICY_VERSION
        || capability.root_key_epoch != Some(authorization.root_key_epoch)
        || capability_issue_precedes_proof_beyond_clock_skew(
            capability.issued_at_ms,
            proof_created_at_ms,
        )
        || capability.expires_at_ms <= now_ms
    {
        return Err(DesktopCapabilityHttpError::CapabilityBindingRejected);
    }

    let ttl_ms = capability
        .expires_at_ms
        .checked_sub(capability.issued_at_ms)
        .ok_or(DesktopCapabilityHttpError::CapabilityBindingRejected)?;

    if ttl_ms == 0 || ttl_ms > PHYSICAL_M1_CAPABILITY_MAX_TTL_MS {
        return Err(DesktopCapabilityHttpError::CapabilityBindingRejected);
    }

    Ok(())
}

async fn read_bounded_response_body(
    mut response: reqwest::Response,
    read_error: DesktopCapabilityHttpError,
    size_error: DesktopCapabilityHttpError,
) -> Result<Vec<u8>, DesktopCapabilityHttpError> {
    let mut output = Vec::new();

    while let Some(chunk) = response.chunk().await.map_err(|_| read_error)? {
        let next_len = output.len().checked_add(chunk.len()).ok_or(size_error)?;

        if next_len > CAPABILITY_MAX_RESPONSE_BODY_BYTES {
            return Err(size_error);
        }

        output.extend_from_slice(&chunk);
    }

    Ok(output)
}

fn current_unix_time_ms() -> Result<u64, DesktopCapabilityHttpError> {
    let elapsed = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|_| DesktopCapabilityHttpError::ClockUnavailable)?;

    let millis = u64::try_from(elapsed.as_millis())
        .map_err(|_| DesktopCapabilityHttpError::ClockUnavailable)?;

    if millis == 0 {
        return Err(DesktopCapabilityHttpError::ClockUnavailable);
    }

    Ok(millis)
}

#[cfg(test)]
mod capability_response_time_tests {
    use super::capability_issue_precedes_proof_beyond_clock_skew;

    const SERVER_ISSUED_AT_MS: u64 = 1_000_000;

    #[test]
    fn server_issue_time_after_client_proof_is_accepted() {
        assert!(!capability_issue_precedes_proof_beyond_clock_skew(
            SERVER_ISSUED_AT_MS,
            SERVER_ISSUED_AT_MS - 1_000,
        ));
    }

    #[test]
    fn bounded_cross_host_capability_issue_time_is_accepted() {
        assert!(!capability_issue_precedes_proof_beyond_clock_skew(
            SERVER_ISSUED_AT_MS,
            SERVER_ISSUED_AT_MS + 4_999,
        ));

        assert!(!capability_issue_precedes_proof_beyond_clock_skew(
            SERVER_ISSUED_AT_MS,
            SERVER_ISSUED_AT_MS + 5_000,
        ));
    }

    #[test]
    fn capability_issue_time_beyond_clock_skew_fails_closed() {
        assert!(capability_issue_precedes_proof_beyond_clock_skew(
            SERVER_ISSUED_AT_MS,
            SERVER_ISSUED_AT_MS + 5_001,
        ));
    }
}
