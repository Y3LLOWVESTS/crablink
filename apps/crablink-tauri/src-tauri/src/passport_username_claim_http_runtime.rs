//! RO:WHAT — Executes CrabLink's native exact-byte DeviceKey-protected username/profile claim through the controlled-beta gateway.
//! RO:WHY — CN-4 requires a real @username mutation whose Passport authority comes only from the active device-bound capability and DeviceKey request proof.
//! RO:INTERACTS — AppState HTTP/settings, memory-only capability session, svc-passport username normalization, BLAKE3 exact-body/query binding, OS CSPRNG nonce, native request-proof signing custody, and svc-gateway port 8090.
//! RO:INVARIANTS — caller supplies public profile intent only; body bytes are serialized exactly once then both hashed and sent unchanged; proof purpose/path/query are fixed; active capability must contain identity.username.claim; no lock crosses await.
//! RO:METRICS — none; errors remain bounded/redacted classes.
//! RO:CONFIG — controlled beta accepts exactly http://127.0.0.1:8090 with request timeout capped at 30 seconds; request/response bodies are capped at 16 KiB.
//! RO:SECURITY — no Passport subject, capability ID, Device ID, nonce, proof, signature, VMK, DeviceKey, PIN, RecoveryRoot, direct 9090/5307 access, wallet, or ledger authority is accepted from or returned to React.
//! RO:TEST — unit tests lock exact intent bytes/nonce binding; physical_m1_protected_username_http_boundary.rs locks native authority/network boundaries.

#![forbid(unsafe_code)]

use std::time::{Duration, SystemTime, UNIX_EPOCH};

use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use ron_proto::{
    B3DigestHex, Ed25519SignatureV1, NativePassportScopeV1, PassportRequestProofV1,
    PASSPORT_REQUEST_PROOF_V1_VERSION,
};
use serde::{Deserialize, Serialize};
use svc_passport::{
    http::handlers::native_username_claim::NATIVE_USERNAME_REQUEST_PROOF_HEADER,
    native::{NATIVE_USERNAME_CLAIM_CANONICAL_PATH_V1, NATIVE_USERNAME_CLAIM_REQUEST_METHOD_V1},
    profile::{normalize_username, PassportKind, UsernameClaimStatus, PUBLIC_PROFILE_SCHEMA},
};

use crate::{
    passport_request_proof_signing_runtime::sign_desktop_native_passport_username_request_proof,
    state::AppState,
};

pub const PHYSICAL_M1_PROTECTED_USERNAME_GATEWAY_URL: &str = "http://127.0.0.1:8090";

pub const PHYSICAL_M1_PROTECTED_USERNAME_HTTP_LABEL: &str =
    "CN4_PHYSICAL_M1_PROTECTED_USERNAME_HTTP_V1";

pub const PHYSICAL_M1_PROTECTED_USERNAME_RESULT_SCHEMA: &str =
    "crablink.native-protected-username-claim.v1";

const USERNAME_CLAIM_REQUIRED_SCOPE: &str = "identity.username.claim";

const USERNAME_CLAIM_MAX_BODY_BYTES: usize = 16 * 1024;

const USERNAME_CLAIM_MAX_RESPONSE_BODY_BYTES: usize = 16 * 1024;

const USERNAME_CLAIM_MAX_REQUEST_TIMEOUT_MS: u64 = 30_000;

const REQUEST_NONCE_BYTES: usize = 32;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DesktopProtectedUsernameClaimIntentV1 {
    pub requested_username: String,

    #[serde(default)]
    pub display_name: Option<String>,

    #[serde(default)]
    pub bio: Option<String>,

    #[serde(default)]
    pub avatar_image: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopProtectedUsernameClaimOutcomeV1 {
    pub schema: &'static str,
    pub status: &'static str,
    pub username: String,
    pub handle: String,
    pub profile_crab_url: String,
    pub backend_confirmed: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[non_exhaustive]
pub enum DesktopProtectedUsernameClaimHttpError {
    InvalidUsername,
    IntentEncodeFailed,
    IntentTooLarge,
    ClockUnavailable,
    CapabilitySessionUnavailable,
    CapabilityUnavailable,
    CapabilityInvalid,
    CapabilityScopeRejected,
    GatewaySettingsUnavailable,
    GatewayConfigurationRejected,
    InvalidRequestTimeout,
    RequestBindingFailed,
    RequestNonceGenerationFailed,
    RequestProofSigningFailed,
    RequestProofEncodeFailed,
    RequestFailed,
    ResponseReadFailed,
    ResponseTooLarge,
    UsernameUnavailable,
    ClaimConflict,
    RequestReplayRejected,
    ClaimRejected,
    ServiceUnavailable,
    ResponseDecodeFailed,
    ResponseBindingRejected,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct ProtectedUsernameProfileResponseV1 {
    schema: String,
    passport_subject: String,
    passport_kind: PassportKind,
    username: String,
    handle: String,
    username_status: UsernameClaimStatus,
    display_name: Option<String>,
    bio: Option<String>,
    avatar_image: Option<String>,
    profile_crab_url: String,
    public_profile_cid: Option<String>,
    reputation_score: Option<u32>,
    moderator_score: Option<u32>,
    warnings: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct ProtectedUsernameProblemV1 {
    schema: String,
    code: String,
    message: String,
    retryable: bool,
}

/// Execute one real protected username/profile claim.
///
/// The caller controls public profile intent only. Passport ownership,
/// capability authority, Device ID, timestamp, request nonce, and proof
/// signature all come from native/runtime state.
pub async fn claim_physical_m1_protected_username(
    state: &AppState,
    intent: DesktopProtectedUsernameClaimIntentV1,
) -> Result<DesktopProtectedUsernameClaimOutcomeV1, DesktopProtectedUsernameClaimHttpError> {
    let requested_username = normalize_username(&intent.requested_username)
        .map_err(|_| DesktopProtectedUsernameClaimHttpError::InvalidUsername)?;

    let canonical_intent = DesktopProtectedUsernameClaimIntentV1 {
        requested_username: requested_username.clone(),
        display_name: intent.display_name,
        bio: intent.bio,
        avatar_image: intent.avatar_image,
    };

    /*
     * Serialize once. These exact bytes are both BLAKE3-bound into the proof
     * and later passed directly to reqwest::RequestBuilder::body.
     */
    let body = serde_json::to_vec(&canonical_intent)
        .map_err(|_| DesktopProtectedUsernameClaimHttpError::IntentEncodeFailed)?;

    if body.len() > USERNAME_CLAIM_MAX_BODY_BYTES {
        return Err(DesktopProtectedUsernameClaimHttpError::IntentTooLarge);
    }

    let now_ms = current_unix_time_ms()?;

    let capability = state
        .passport_capability_session
        .load_active(now_ms)
        .map_err(|_| DesktopProtectedUsernameClaimHttpError::CapabilitySessionUnavailable)?
        .ok_or(DesktopProtectedUsernameClaimHttpError::CapabilityUnavailable)?;

    capability
        .validate()
        .map_err(|_| DesktopProtectedUsernameClaimHttpError::CapabilityInvalid)?;

    let required_scope = NativePassportScopeV1::parse(USERNAME_CLAIM_REQUIRED_SCOPE)
        .map_err(|_| DesktopProtectedUsernameClaimHttpError::RequestBindingFailed)?;

    if capability
        .scopes
        .iter()
        .all(|scope| scope != &required_scope)
    {
        return Err(DesktopProtectedUsernameClaimHttpError::CapabilityScopeRejected);
    }

    let (gateway_url, timeout_ms) = {
        let settings = state
            .settings
            .lock()
            .map_err(|_| DesktopProtectedUsernameClaimHttpError::GatewaySettingsUnavailable)?;

        (
            settings.gateway_url.trim_end_matches('/').to_owned(),
            settings
                .request_timeout_ms
                .min(USERNAME_CLAIM_MAX_REQUEST_TIMEOUT_MS),
        )
    };

    if gateway_url != PHYSICAL_M1_PROTECTED_USERNAME_GATEWAY_URL {
        return Err(DesktopProtectedUsernameClaimHttpError::GatewayConfigurationRejected);
    }

    if timeout_ms == 0 {
        return Err(DesktopProtectedUsernameClaimHttpError::InvalidRequestTimeout);
    }

    let body_hash = digest_b3("body_hash", &body)?;

    let canonical_query_hash = digest_b3("canonical_query_hash", b"")?;

    let request_nonce = new_request_nonce()?;

    let mut proof = PassportRequestProofV1 {
        version: PASSPORT_REQUEST_PROOF_V1_VERSION,
        capability_id: capability.capability_id.clone(),
        request_method: NATIVE_USERNAME_CLAIM_REQUEST_METHOD_V1.to_owned(),
        canonical_path: NATIVE_USERNAME_CLAIM_CANONICAL_PATH_V1.to_owned(),
        canonical_query_hash,
        body_hash,
        timestamp_ms: now_ms,
        request_nonce,
        device_id: capability.device_id.clone(),
        device_signature: Ed25519SignatureV1::from_bytes([0_u8; 64]),
    };

    proof.device_signature = sign_desktop_native_passport_username_request_proof(
        &state.passport_vault_store,
        &state.passport_operational_session,
        &proof,
    )
    .map_err(|_| DesktopProtectedUsernameClaimHttpError::RequestProofSigningFailed)?;

    let proof_json = serde_json::to_vec(&proof)
        .map_err(|_| DesktopProtectedUsernameClaimHttpError::RequestProofEncodeFailed)?;

    let proof_header = URL_SAFE_NO_PAD.encode(proof_json);

    let timeout = Duration::from_millis(timeout_ms);

    let client = state.http.clone();

    let response = client
        .post(format!(
            "{gateway_url}{NATIVE_USERNAME_CLAIM_CANONICAL_PATH_V1}"
        ))
        .timeout(timeout)
        .header("accept", "application/json")
        .header("content-type", "application/json")
        .header(NATIVE_USERNAME_REQUEST_PROOF_HEADER, proof_header)
        .body(body)
        .send()
        .await
        .map_err(|_| DesktopProtectedUsernameClaimHttpError::RequestFailed)?;

    let status = response.status();

    let response_bytes = read_bounded_response_body(response).await?;

    if status != reqwest::StatusCode::CREATED {
        return Err(map_rejected_response(status, &response_bytes));
    }

    let profile: ProtectedUsernameProfileResponseV1 = serde_json::from_slice(&response_bytes)
        .map_err(|_| DesktopProtectedUsernameClaimHttpError::ResponseDecodeFailed)?;

    validate_claim_response(&profile, &capability.passport_id, &requested_username)?;

    Ok(DesktopProtectedUsernameClaimOutcomeV1 {
        schema: PHYSICAL_M1_PROTECTED_USERNAME_RESULT_SCHEMA,
        status: "username_claimed",
        username: profile.username,
        handle: profile.handle,
        profile_crab_url: profile.profile_crab_url,
        backend_confirmed: true,
    })
}

fn validate_claim_response(
    profile: &ProtectedUsernameProfileResponseV1,
    expected_passport_id: &ron_proto::PassportIdV1,
    expected_username: &str,
) -> Result<(), DesktopProtectedUsernameClaimHttpError> {
    let expected_handle = format!("@{expected_username}");

    let expected_profile_crab_url = format!("crab://{expected_handle}");

    if profile.schema != PUBLIC_PROFILE_SCHEMA
        || profile.passport_subject != expected_passport_id.as_str()
        || profile.passport_kind != PassportKind::Main
        || profile.username != expected_username
        || profile.handle != expected_handle
        || profile.username_status != UsernameClaimStatus::Confirmed
        || profile.profile_crab_url != expected_profile_crab_url
    {
        return Err(DesktopProtectedUsernameClaimHttpError::ResponseBindingRejected);
    }

    /*
     * The remaining public fields are intentionally parsed strictly even
     * though this redacted outcome does not export them yet.
     */
    let _ = (
        &profile.display_name,
        &profile.bio,
        &profile.avatar_image,
        &profile.public_profile_cid,
        &profile.reputation_score,
        &profile.moderator_score,
        &profile.warnings,
    );

    Ok(())
}

fn digest_b3(
    field: &'static str,
    bytes: &[u8],
) -> Result<B3DigestHex, DesktopProtectedUsernameClaimHttpError> {
    B3DigestHex::parse(field, blake3::hash(bytes).to_hex().to_string())
        .map_err(|_| DesktopProtectedUsernameClaimHttpError::RequestBindingFailed)
}

fn new_request_nonce() -> Result<B3DigestHex, DesktopProtectedUsernameClaimHttpError> {
    let mut bytes = [0_u8; REQUEST_NONCE_BYTES];

    getrandom::fill(&mut bytes)
        .map_err(|_| DesktopProtectedUsernameClaimHttpError::RequestNonceGenerationFailed)?;

    request_nonce_from_bytes(bytes)
}

fn request_nonce_from_bytes(
    bytes: [u8; REQUEST_NONCE_BYTES],
) -> Result<B3DigestHex, DesktopProtectedUsernameClaimHttpError> {
    B3DigestHex::parse("request_nonce", lower_hex_32(bytes))
        .map_err(|_| DesktopProtectedUsernameClaimHttpError::RequestBindingFailed)
}

fn lower_hex_32(bytes: [u8; 32]) -> String {
    const HEX: &[u8; 16] = b"0123456789abcdef";

    let mut output = String::with_capacity(64);

    for byte in bytes {
        output.push(char::from(HEX[usize::from(byte >> 4)]));
        output.push(char::from(HEX[usize::from(byte & 0x0f)]));
    }

    output
}

async fn read_bounded_response_body(
    mut response: reqwest::Response,
) -> Result<Vec<u8>, DesktopProtectedUsernameClaimHttpError> {
    let mut output = Vec::new();

    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|_| DesktopProtectedUsernameClaimHttpError::ResponseReadFailed)?
    {
        let next_len = output
            .len()
            .checked_add(chunk.len())
            .ok_or(DesktopProtectedUsernameClaimHttpError::ResponseTooLarge)?;

        if next_len > USERNAME_CLAIM_MAX_RESPONSE_BODY_BYTES {
            return Err(DesktopProtectedUsernameClaimHttpError::ResponseTooLarge);
        }

        output.extend_from_slice(&chunk);
    }

    Ok(output)
}

fn map_rejected_response(
    status: reqwest::StatusCode,
    body: &[u8],
) -> DesktopProtectedUsernameClaimHttpError {
    let problem = serde_json::from_slice::<ProtectedUsernameProblemV1>(body).ok();

    if let Some(problem) = problem.as_ref() {
        let _ = (&problem.schema, &problem.message, problem.retryable);

        if problem.code == "username_unavailable" {
            return DesktopProtectedUsernameClaimHttpError::UsernameUnavailable;
        }

        if problem.code == "request_replay" {
            return DesktopProtectedUsernameClaimHttpError::RequestReplayRejected;
        }

        if matches!(
            problem.code.as_str(),
            "passport_already_has_username" | "authority_changed"
        ) {
            return DesktopProtectedUsernameClaimHttpError::ClaimConflict;
        }

        if matches!(
            problem.code.as_str(),
            "username_claim_service_unavailable"
                | "request_binding_unavailable"
                | "trusted_time_unavailable"
        ) {
            return DesktopProtectedUsernameClaimHttpError::ServiceUnavailable;
        }
    }

    if status == reqwest::StatusCode::SERVICE_UNAVAILABLE {
        return DesktopProtectedUsernameClaimHttpError::ServiceUnavailable;
    }

    DesktopProtectedUsernameClaimHttpError::ClaimRejected
}

fn current_unix_time_ms() -> Result<u64, DesktopProtectedUsernameClaimHttpError> {
    let elapsed = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|_| DesktopProtectedUsernameClaimHttpError::ClockUnavailable)?;

    let now_ms = u64::try_from(elapsed.as_millis())
        .map_err(|_| DesktopProtectedUsernameClaimHttpError::ClockUnavailable)?;

    if now_ms == 0 {
        return Err(DesktopProtectedUsernameClaimHttpError::ClockUnavailable);
    }

    Ok(now_ms)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn exact_intent_body_contains_public_profile_intent_only() {
        let intent = DesktopProtectedUsernameClaimIntentV1 {
            requested_username: "testmac".to_owned(),
            display_name: None,
            bio: None,
            avatar_image: None,
        };

        let body = serde_json::to_vec(&intent).expect("intent JSON");

        assert_eq!(
            body,
            br#"{"requested_username":"testmac","display_name":null,"bio":null,"avatar_image":null}"#,
        );

        let text = std::str::from_utf8(&body).expect("UTF-8 intent");

        for forbidden in [
            "passport_subject",
            "capability_id",
            "device_id",
            "request_nonce",
            "device_signature",
            "root_key_epoch",
            "wallet",
            "ledger",
        ] {
            assert!(
                !text.contains(forbidden),
                "intent body gained forbidden authority field {forbidden}",
            );
        }
    }

    #[test]
    fn request_nonce_is_exact_32_byte_lower_hex_binding() {
        let nonce = request_nonce_from_bytes([0xab; 32]).expect("deterministic test nonce");

        assert_eq!(
            nonce.as_str(),
            "abababababababababababababababababababababababababababababababab",
        );
    }

    #[test]
    fn empty_query_and_body_hashes_are_exact_b3_bytes() {
        let body =
            br#"{"requested_username":"testmac","display_name":null,"bio":null,"avatar_image":null}"#;

        let body_hash = digest_b3("body_hash", body).expect("body hash");

        let query_hash = digest_b3("canonical_query_hash", b"").expect("query hash");

        assert_eq!(body_hash.as_str(), blake3::hash(body).to_hex().as_str(),);

        assert_eq!(query_hash.as_str(), blake3::hash(b"").to_hex().as_str(),);
    }
}
