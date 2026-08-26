//! RO:WHAT — Runs the Physical M1 native ProveSession challenge → trust verification → DeviceKey signing → proof submission flow through the canonical local CrabNode gateway.
//! RO:WHY — CN-4 must prove real possession of the already-authorized persisted DeviceKey through 8090 without exposing device secrets or moving identity authority into React.
//! RO:INTERACTS — AppState HTTP/settings, public Passport descriptor, authenticated V2 device identity, strictly verified DeviceAuthorization sidecar, pinned svc-passport challenge trust, ron-auth challenge hashing/DeviceSession transcript, and native DeviceKey signing custody.
//! RO:INVARIANTS — local DeviceAuthorization is strictly reverified before network I/O; gateway is exactly loopback 8090; challenge is strictly authenticated before signing; proof time may normalize only within the existing bounded cross-host skew and never outside the authenticated challenge window; only identity.read is requested; no AppState mutex or VMK lock crosses an await; proof result must be exact.
//! RO:METRICS — none; errors remain redacted by stable classes.
//! RO:CONFIG — Physical M1 controlled beta uses http://127.0.0.1:8090, the existing AppSettings request timeout bounded to 30 seconds, and the reviewed 5-second cross-host challenge clock-skew policy.
//! RO:SECURITY — no RecoveryRoot, root PIN, VMK/seed export, generic signer, direct 9090/5307 access, WebView authority, capability issuance, username mutation, wallet mutation, or ledger mutation.
//! RO:TEST — physical_m1_device_session_http_boundary.rs plus subsequent physical managed-CrabNode acceptance.

#![forbid(unsafe_code)]

use std::time::{Duration, SystemTime, UNIX_EPOCH};

use ron_auth::native_passport::{
    passport_challenge_v1_transcript_b3_hex, DeviceSessionProofTranscriptV1,
};
use ron_proto::{
    B3DigestHex, DeviceIdV1 as ProtoDeviceIdV1, Ed25519SignatureV1, NativePassportScopeV1,
    PassportChallengeV1, PassportIdV1 as ProtoPassportIdV1,
};
use serde::{Deserialize, Serialize};
use svc_passport::native::{
    PHASE8A_PROOF_CHALLENGE_CONTRACT_DOMAIN, PHASE8A_PROOF_CHALLENGE_CONTRACT_VERSION,
    PHASE8B_PROOF_CONTRACT_DOMAIN, PHASE8B_PROOF_CONTRACT_VERSION,
};

use crate::{
    passport_device_authorization_runtime_context::{
        PHYSICAL_M1_PRIVATE_BETA_AUTHORIZATION_ENVIRONMENT, PHYSICAL_M1_PRIVATE_BETA_NETWORK_ID,
        PHYSICAL_M1_PRIVATE_BETA_ROOT_KEY_EPOCH,
    },
    passport_device_authorization_store::DesktopDeviceAuthorizationVerificationContextV1,
    passport_device_session_signing_runtime::sign_desktop_native_passport_device_session_proof,
    passport_device_session_trust::verify_physical_m1_device_session_challenge,
    passport_register_root_trust::PHYSICAL_M1_REGISTER_ROOT_MAX_CLOCK_SKEW_MS,
    passport_vault_v2_migration_runtime::read_desktop_native_passport_session_device_public_identity,
    state::AppState,
};

pub const PHYSICAL_M1_DEVICE_SESSION_HTTP_LABEL: &str = "PHYSICAL_M1_NATIVE_DEVICE_SESSION_HTTP_V1";

pub const PHYSICAL_M1_DEVICE_SESSION_GATEWAY_URL: &str = "http://127.0.0.1:8090";

const DEVICE_SESSION_CHALLENGE_PATH: &str = "/identity/passport/challenge";

const DEVICE_SESSION_PROOF_PATH: &str = "/identity/passport/prove";

const DEVICE_SESSION_PROOF_RESULT_SCHEMA: &str =
    "svc-passport.native-device-session-proof-result.v1";

const DEVICE_SESSION_MAX_RESPONSE_BODY_BYTES: usize = 16 * 1024;
const DEVICE_SESSION_MAX_REQUEST_TIMEOUT_MS: u64 = 30_000;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DesktopDeviceSessionProofOutcomeV1 {
    pub local_device_authorization_verified: bool,
    pub service_challenge_verified: bool,
    pub possession_proven: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[non_exhaustive]
pub enum DesktopDeviceSessionHttpError {
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
}

#[derive(Debug, Serialize)]
#[serde(deny_unknown_fields)]
struct DeviceSessionChallengeRequestV1 {
    passport_id: ProtoPassportIdV1,
    device_id: ProtoDeviceIdV1,
    requested_scopes: Vec<NativePassportScopeV1>,
}

#[derive(Debug, Serialize)]
#[serde(deny_unknown_fields)]
struct DeviceSessionProofRequestV1 {
    challenge: PassportChallengeV1,
    proof_created_at_ms: u64,
    proof_signature: Ed25519SignatureV1,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct DeviceSessionProofResultV1 {
    schema: String,
    status: String,
}

/// Execute one real Physical M1 possession proof through the public local
/// CrabNode gateway.
///
/// No caller-controlled identity, device, scope, gateway, purpose, public key,
/// signature, PIN, or secret material is accepted.
///
/// # Errors
///
/// Fails closed unless local Passport/device/authorization state is valid, the
/// configured gateway is exactly the reviewed local 8090 endpoint, the service
/// challenge authenticates against the pinned anchor, native DeviceKey signing
/// succeeds, and svc-passport returns the exact proven result.
pub async fn prove_physical_m1_device_session(
    state: &AppState,
) -> Result<DesktopDeviceSessionProofOutcomeV1, DesktopDeviceSessionHttpError> {
    let public_identity = state
        .passport_public_identity_store
        .load()
        .map_err(|_| DesktopDeviceSessionHttpError::PublicDescriptorLoadFailed)?
        .ok_or(DesktopDeviceSessionHttpError::PublicDescriptorMissing)?;

    let device_identity = read_desktop_native_passport_session_device_public_identity(
        &state.passport_vault_store,
        &state.passport_operational_session,
    )
    .map_err(|_| DesktopDeviceSessionHttpError::DeviceIdentityUnavailable)?;

    let passport_id = ProtoPassportIdV1::parse(public_identity.passport_id.as_str())
        .map_err(|_| DesktopDeviceSessionHttpError::ProtocolIdentityConversionFailed)?;

    let device_id = ProtoDeviceIdV1::parse(device_identity.device_id.as_str())
        .map_err(|_| DesktopDeviceSessionHttpError::ProtocolIdentityConversionFailed)?;

    let requested_scope = NativePassportScopeV1::parse("identity.read")
        .map_err(|_| DesktopDeviceSessionHttpError::ProtocolIdentityConversionFailed)?;

    let requested_scopes = vec![requested_scope.clone()];

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
        .map_err(|_| DesktopDeviceSessionHttpError::StoredDeviceAuthorizationRejected)?
        .ok_or(DesktopDeviceSessionHttpError::StoredDeviceAuthorizationMissing)?;

    if authorization.passport_id != passport_id || authorization.device_id != device_id {
        return Err(DesktopDeviceSessionHttpError::StoredDeviceAuthorizationRejected);
    }

    if authorization
        .authorized_scope_ceiling
        .as_slice()
        .iter()
        .all(|scope| scope != &requested_scope)
    {
        return Err(DesktopDeviceSessionHttpError::StoredDeviceAuthorizationScopeRejected);
    }

    let (gateway_url, timeout_ms) = {
        let settings = state
            .settings
            .lock()
            .map_err(|_| DesktopDeviceSessionHttpError::GatewaySettingsUnavailable)?;

        (
            settings.gateway_url.trim_end_matches('/').to_owned(),
            settings
                .request_timeout_ms
                .min(DEVICE_SESSION_MAX_REQUEST_TIMEOUT_MS),
        )
    };

    if gateway_url != PHYSICAL_M1_DEVICE_SESSION_GATEWAY_URL {
        return Err(DesktopDeviceSessionHttpError::GatewayConfigurationRejected);
    }

    if timeout_ms == 0 {
        return Err(DesktopDeviceSessionHttpError::InvalidRequestTimeout);
    }

    let timeout = Duration::from_millis(timeout_ms);
    let client = state.http.clone();

    let challenge_request = DeviceSessionChallengeRequestV1 {
        passport_id: passport_id.clone(),
        device_id: device_id.clone(),
        requested_scopes: requested_scopes.clone(),
    };

    let challenge_response = client
        .post(format!("{gateway_url}{DEVICE_SESSION_CHALLENGE_PATH}"))
        .timeout(timeout)
        .json(&challenge_request)
        .send()
        .await
        .map_err(|_| DesktopDeviceSessionHttpError::ChallengeRequestFailed)?;

    if !challenge_response.status().is_success() {
        return Err(DesktopDeviceSessionHttpError::ChallengeResponseRejected);
    }

    let challenge_bytes = read_bounded_response_body(
        challenge_response,
        DesktopDeviceSessionHttpError::ChallengeResponseReadFailed,
        DesktopDeviceSessionHttpError::ChallengeResponseTooLarge,
    )
    .await?;

    let challenge: PassportChallengeV1 = serde_json::from_slice(&challenge_bytes)
        .map_err(|_| DesktopDeviceSessionHttpError::ChallengeDecodeFailed)?;

    let challenge_verify_now_ms = current_unix_time_ms()?;

    verify_physical_m1_device_session_challenge(
        &challenge,
        &passport_id,
        &device_id,
        &requested_scopes,
        challenge_verify_now_ms,
    )
    .map_err(|_| DesktopDeviceSessionHttpError::ChallengeTrustRejected)?;

    let challenge_hash_text = passport_challenge_v1_transcript_b3_hex(&challenge.signing_payload())
        .map_err(|_| DesktopDeviceSessionHttpError::ChallengeHashFailed)?;

    let challenge_transcript_hash =
        B3DigestHex::parse("challenge_transcript_hash", challenge_hash_text)
            .map_err(|_| DesktopDeviceSessionHttpError::ChallengeHashFailed)?;

    let proof_created_at_ms = normalize_device_session_proof_created_at_ms(
        challenge.issued_at_ms,
        challenge.expires_at_ms,
        current_unix_time_ms()?,
    )?;

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
        .map_err(|_| DesktopDeviceSessionHttpError::DeviceSigningFailed)?
    };

    let proof_request = DeviceSessionProofRequestV1 {
        challenge,
        proof_created_at_ms,
        proof_signature,
    };

    let proof_response = client
        .post(format!("{gateway_url}{DEVICE_SESSION_PROOF_PATH}"))
        .timeout(timeout)
        .json(&proof_request)
        .send()
        .await
        .map_err(|_| DesktopDeviceSessionHttpError::ProofRequestFailed)?;

    if !proof_response.status().is_success() {
        return Err(DesktopDeviceSessionHttpError::ProofResponseRejected);
    }

    let proof_bytes = read_bounded_response_body(
        proof_response,
        DesktopDeviceSessionHttpError::ProofResponseReadFailed,
        DesktopDeviceSessionHttpError::ProofResponseTooLarge,
    )
    .await?;

    let result: DeviceSessionProofResultV1 = serde_json::from_slice(&proof_bytes)
        .map_err(|_| DesktopDeviceSessionHttpError::ProofDecodeFailed)?;

    if result.schema != DEVICE_SESSION_PROOF_RESULT_SCHEMA || result.status != "proven" {
        return Err(DesktopDeviceSessionHttpError::ProofResultRejected);
    }

    Ok(DesktopDeviceSessionProofOutcomeV1 {
        local_device_authorization_verified: true,
        service_challenge_verified: true,
        possession_proven: true,
    })
}

async fn read_bounded_response_body(
    mut response: reqwest::Response,
    read_error: DesktopDeviceSessionHttpError,
    size_error: DesktopDeviceSessionHttpError,
) -> Result<Vec<u8>, DesktopDeviceSessionHttpError> {
    let mut output = Vec::new();

    while let Some(chunk) = response.chunk().await.map_err(|_| read_error)? {
        let next_len = output.len().checked_add(chunk.len()).ok_or(size_error)?;

        if next_len > DEVICE_SESSION_MAX_RESPONSE_BODY_BYTES {
            return Err(size_error);
        }

        output.extend_from_slice(&chunk);
    }

    Ok(output)
}

/// Normalize local proof creation time into one already-authenticated service
/// challenge window while preserving the reviewed cross-host skew ceiling.
///
/// The signed challenge has already passed strict service-key/context/time
/// verification before this function is called. A client clock slightly
/// behind or ahead may therefore use the nearest signed challenge boundary,
/// but only while that local clock remains inside the same bounded skew policy.
/// Larger disagreement fails closed rather than fabricating a proof time.
pub(crate) fn normalize_device_session_proof_created_at_ms(
    challenge_issued_at_ms: u64,
    challenge_expires_at_ms: u64,
    local_now_ms: u64,
) -> Result<u64, DesktopDeviceSessionHttpError> {
    if challenge_issued_at_ms == 0 || challenge_expires_at_ms <= challenge_issued_at_ms {
        return Err(DesktopDeviceSessionHttpError::ProofTimeOutsideChallenge);
    }

    let earliest_acceptable_local_ms =
        challenge_issued_at_ms.saturating_sub(PHYSICAL_M1_REGISTER_ROOT_MAX_CLOCK_SKEW_MS);

    let latest_acceptable_local_ms =
        challenge_expires_at_ms.saturating_add(PHYSICAL_M1_REGISTER_ROOT_MAX_CLOCK_SKEW_MS);

    if local_now_ms < earliest_acceptable_local_ms || local_now_ms > latest_acceptable_local_ms {
        return Err(DesktopDeviceSessionHttpError::ProofTimeOutsideChallenge);
    }

    Ok(local_now_ms.clamp(challenge_issued_at_ms, challenge_expires_at_ms))
}

#[cfg(test)]
mod proof_time_tests {
    use super::{normalize_device_session_proof_created_at_ms, DesktopDeviceSessionHttpError};

    const ISSUED_AT_MS: u64 = 1_000_000;
    const EXPIRES_AT_MS: u64 = 1_060_000;

    #[test]
    fn local_time_inside_challenge_is_preserved() {
        assert_eq!(
            normalize_device_session_proof_created_at_ms(
                ISSUED_AT_MS,
                EXPIRES_AT_MS,
                ISSUED_AT_MS + 10_000,
            ),
            Ok(ISSUED_AT_MS + 10_000),
        );
    }

    #[test]
    fn bounded_behind_clock_normalizes_to_signed_issue_time() {
        assert_eq!(
            normalize_device_session_proof_created_at_ms(
                ISSUED_AT_MS,
                EXPIRES_AT_MS,
                ISSUED_AT_MS - 4_999,
            ),
            Ok(ISSUED_AT_MS),
        );

        assert_eq!(
            normalize_device_session_proof_created_at_ms(
                ISSUED_AT_MS,
                EXPIRES_AT_MS,
                ISSUED_AT_MS - 5_000,
            ),
            Ok(ISSUED_AT_MS),
        );
    }

    #[test]
    fn behind_clock_beyond_reviewed_skew_fails_closed() {
        assert_eq!(
            normalize_device_session_proof_created_at_ms(
                ISSUED_AT_MS,
                EXPIRES_AT_MS,
                ISSUED_AT_MS - 5_001,
            ),
            Err(DesktopDeviceSessionHttpError::ProofTimeOutsideChallenge),
        );
    }

    #[test]
    fn bounded_ahead_clock_normalizes_to_signed_expiry_time() {
        assert_eq!(
            normalize_device_session_proof_created_at_ms(
                ISSUED_AT_MS,
                EXPIRES_AT_MS,
                EXPIRES_AT_MS + 4_999,
            ),
            Ok(EXPIRES_AT_MS),
        );

        assert_eq!(
            normalize_device_session_proof_created_at_ms(
                ISSUED_AT_MS,
                EXPIRES_AT_MS,
                EXPIRES_AT_MS + 5_000,
            ),
            Ok(EXPIRES_AT_MS),
        );
    }

    #[test]
    fn ahead_clock_beyond_reviewed_skew_fails_closed() {
        assert_eq!(
            normalize_device_session_proof_created_at_ms(
                ISSUED_AT_MS,
                EXPIRES_AT_MS,
                EXPIRES_AT_MS + 5_001,
            ),
            Err(DesktopDeviceSessionHttpError::ProofTimeOutsideChallenge),
        );
    }

    #[test]
    fn invalid_challenge_window_fails_closed() {
        assert_eq!(
            normalize_device_session_proof_created_at_ms(ISSUED_AT_MS, ISSUED_AT_MS, ISSUED_AT_MS,),
            Err(DesktopDeviceSessionHttpError::ProofTimeOutsideChallenge),
        );
    }
}

fn current_unix_time_ms() -> Result<u64, DesktopDeviceSessionHttpError> {
    let elapsed = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|_| DesktopDeviceSessionHttpError::ClockUnavailable)?;

    let millis = u64::try_from(elapsed.as_millis())
        .map_err(|_| DesktopDeviceSessionHttpError::ClockUnavailable)?;

    if millis == 0 {
        return Err(DesktopDeviceSessionHttpError::ClockUnavailable);
    }

    Ok(millis)
}
