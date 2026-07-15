//! RO:WHAT — Native CrabLink bridge from verified Service Node OAP bytes to User Node verification evidence.
//! RO:WHY — Phase 22E2 proves the real Service Node → CrabLink → micronode pending-evidence path.
//! RO:INTERACTS — commands::oap_object, micronode `/api/v1/verification/object`, AppState HTTP client.
//! RO:INVARIANTS — loopback-only; OAP full digest first; strict evidence checks; pending evidence is not ROC truth.
//! RO:SECURITY — opaque privacy-route IDs only; no IP fields, accounting acceptance, reward, payout, wallet, or ledger authority.
//! RO:TEST — unit tests below and `tests/phase22_live_user_node_verification.rs`.

#![forbid(unsafe_code)]

use crate::{
    commands::oap_object::{
        fetch_service_node_oap_object, ServiceNodeOapObjectFetchRequest,
        ServiceNodeOapObjectFetchResult,
    },
    state::AppState,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{net::IpAddr, time::Duration};
use tauri::State;

const VERIFICATION_REQUEST_SCHEMA: &str = "micronode.object_verification_request.v1";

const VERIFICATION_REQUEST_VERSION: u16 = 1;

const MAX_VERIFICATION_BYTES: usize = 4 * 1024 * 1024;

const MAX_ERROR_BODY_BYTES: usize = 64 * 1024;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct UserNodeVerificationRequest {
    pub enabled: bool,
    pub connection_mode: String,

    pub storage_base_url: String,
    pub user_node_base_url: String,

    pub object: String,

    #[serde(default)]
    pub max_bytes: Option<usize>,

    pub observed_at_ms: u64,
    pub nonce: String,
    pub idempotency_key: String,
    pub privacy_route_id: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserNodeVerificationResult {
    pub schema: &'static str,

    pub object: String,
    pub bytes: usize,

    pub oap: ServiceNodeOapObjectFetchResult,
    pub verification: Value,

    pub service_node_bytes_verified: bool,
    pub user_node_evidence_pending: bool,

    pub accounting_accepted: bool,
    pub reward_eligible: bool,
    pub reward_truth: bool,
    pub payout_authority: bool,
    pub wallet_mutation: bool,
    pub ledger_mutation: bool,

    pub receipt: Option<Value>,
    pub confirmed_roc_minor_units: Option<String>,
}

#[derive(Debug, Clone)]
pub struct UserNodeVerificationSubmission {
    pub user_node_base_url: String,
    pub object: String,
    pub bytes: Vec<u8>,
    pub observed_at_ms: u64,
    pub nonce: String,
    pub idempotency_key: String,
    pub privacy_route_id: String,
}

#[tauri::command]
pub async fn user_node_verify_service_object(
    state: State<'_, AppState>,
    request: UserNodeVerificationRequest,
) -> Result<UserNodeVerificationResult, String> {
    let timeout_ms = {
        let settings = state
            .settings
            .lock()
            .map_err(|_| "settings lock poisoned".to_string())?;

        settings.request_timeout_ms
    };

    verify_service_object_with_user_node(state.http.clone(), timeout_ms, request).await
}

/// Fetch one Service Node object through CrabLink's native OAP verifier and
/// submit the exact authenticated bytes to the real User Node verifier.
pub async fn verify_service_object_with_user_node(
    client: reqwest::Client,
    timeout_ms: u64,
    request: UserNodeVerificationRequest,
) -> Result<UserNodeVerificationResult, String> {
    if !request.enabled {
        return Err("User Node verification requires explicit enablement".to_string());
    }

    if request.connection_mode.trim() != "local" {
        return Err("User Node verification currently requires connectionMode=local".to_string());
    }

    let user_node_base_url =
        normalize_loopback_base_url(&request.user_node_base_url, "userNodeBaseUrl")?;

    let oap = fetch_service_node_oap_object(
        client.clone(),
        timeout_ms,
        ServiceNodeOapObjectFetchRequest {
            enabled: true,
            connection_mode: "local".to_string(),
            storage_base_url: request.storage_base_url,
            object: request.object,
            max_bytes: request.max_bytes,
        },
    )
    .await?;

    if !oap.full_digest_verified {
        return Err(
            "CrabLink refused to forward OAP bytes without full digest verification".to_string(),
        );
    }

    let verification = submit_user_node_object_verification(
        client,
        timeout_ms,
        UserNodeVerificationSubmission {
            user_node_base_url,
            object: oap.object.clone(),
            bytes: oap.body_bytes.clone(),
            observed_at_ms: request.observed_at_ms,
            nonce: request.nonce,
            idempotency_key: request.idempotency_key,
            privacy_route_id: request.privacy_route_id,
        },
    )
    .await?;

    validate_pending_evidence(&verification, true)?;

    Ok(UserNodeVerificationResult {
        schema: "crablink.tauri.user-node-verification.v1",

        object: oap.object.clone(),
        bytes: oap.body_bytes.len(),

        oap,
        verification,

        service_node_bytes_verified: true,
        user_node_evidence_pending: true,

        accounting_accepted: false,
        reward_eligible: false,
        reward_truth: false,
        payout_authority: false,
        wallet_mutation: false,
        ledger_mutation: false,

        receipt: None,
        confirmed_roc_minor_units: None,
    })
}

/// Submit caller-supplied bytes to the production micronode verification
/// endpoint. Tests use this real helper to prove mismatch and replay behavior.
pub async fn submit_user_node_object_verification(
    client: reqwest::Client,
    timeout_ms: u64,
    submission: UserNodeVerificationSubmission,
) -> Result<Value, String> {
    let user_node_base_url =
        normalize_loopback_base_url(&submission.user_node_base_url, "userNodeBaseUrl")?;

    validate_b3(&submission.object)?;

    if submission.bytes.is_empty() {
        return Err("User Node verification bytes must not be empty".to_string());
    }

    if submission.bytes.len() > MAX_VERIFICATION_BYTES {
        return Err(format!(
            "User Node verification bytes exceed {MAX_VERIFICATION_BYTES}",
        ));
    }

    if submission.observed_at_ms == 0 {
        return Err("observedAtMs must be greater than zero".to_string());
    }

    validate_identifier("nonce", &submission.nonce)?;

    validate_identifier("idempotencyKey", &submission.idempotency_key)?;

    validate_privacy_route_id(&submission.privacy_route_id)?;

    let response = client
        .post(format!("{user_node_base_url}/api/v1/verification/object"))
        .timeout(Duration::from_millis(timeout_ms.clamp(1, 30_000)))
        .json(&json!({
            "schema":
                VERIFICATION_REQUEST_SCHEMA,

            "version":
                VERIFICATION_REQUEST_VERSION,

            "object":
                submission.object,

            "bytes":
                submission.bytes,

            "observedAtMs":
                submission.observed_at_ms,

            "nonce":
                submission.nonce,

            "idempotencyKey":
                submission.idempotency_key,

            "privacyRouteId":
                submission.privacy_route_id,
        }))
        .send()
        .await
        .map_err(|error| format!("User Node verification request failed: {error}"))?;

    let status = response.status();

    let bytes = read_bounded_response(response, MAX_ERROR_BODY_BYTES).await?;

    if !status.is_success() {
        return Err(format!(
            "User Node verification returned HTTP {}: {}",
            status.as_u16(),
            String::from_utf8_lossy(&bytes),
        ));
    }

    let value: Value = serde_json::from_slice(&bytes)
        .map_err(|error| format!("User Node verification returned invalid JSON: {error}"))?;

    validate_pending_evidence(&value, false)?;

    Ok(value)
}

fn validate_pending_evidence(value: &Value, require_verified_valid: bool) -> Result<(), String> {
    require_equal(value, "queueState", &json!("pending"))?;

    require_equal(value, "pendingEvidence", &json!(true))?;

    require_equal(value, "privacySafe", &json!(true))?;

    require_equal(value, "rawPeerIpRecorded", &json!(false))?;

    for field in [
        "accountingAccepted",
        "rewardEligible",
        "rewardTruth",
        "payoutAuthority",
        "walletMutation",
        "ledgerMutation",
    ] {
        require_equal(value, field, &json!(false))?;
    }

    require_equal(value, "confirmedRocMinorUnits", &Value::Null)?;

    let evidence = value
        .get("evidence")
        .and_then(Value::as_object)
        .ok_or_else(|| "User Node verification response is missing evidence".to_string())?;

    for field in [
        "accounting_accepted",
        "reward_eligible",
        "reward_truth",
        "payout_authority",
        "wallet_mutation",
        "ledger_mutation",
    ] {
        if evidence.get(field) != Some(&json!(false)) {
            return Err(format!(
                "User Node evidence field {field} must remain false",
            ));
        }
    }

    if evidence.get("evidence_only") != Some(&json!(true)) {
        return Err("User Node evidence must remain evidence-only".to_string());
    }

    if require_verified_valid {
        require_equal(value, "fullDigestVerified", &json!(true))?;

        require_equal(value, "challengeRaised", &json!(false))?;

        if evidence.get("result") != Some(&json!("verified_valid")) {
            return Err(
                "authenticated Service Node bytes did not produce verified_valid evidence"
                    .to_string(),
            );
        }
    }

    Ok(())
}

fn require_equal(value: &Value, field: &str, expected: &Value) -> Result<(), String> {
    if value.get(field) != Some(expected) {
        return Err(format!(
            "User Node verification field {field} did not match the required value",
        ));
    }

    Ok(())
}

async fn read_bounded_response(
    mut response: reqwest::Response,
    max_bytes: usize,
) -> Result<Vec<u8>, String> {
    let mut bytes = Vec::new();

    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|error| format!("User Node response read failed: {error}"))?
    {
        let next_len = bytes
            .len()
            .checked_add(chunk.len())
            .ok_or_else(|| "User Node response length overflow".to_string())?;

        if next_len > max_bytes {
            return Err(format!(
                "User Node response exceeded bounded limit: {next_len} > {max_bytes}",
            ));
        }

        bytes.extend_from_slice(&chunk);
    }

    Ok(bytes)
}

fn normalize_loopback_base_url(raw: &str, field: &str) -> Result<String, String> {
    let clean = raw.trim().trim_end_matches('/');

    let parsed = reqwest::Url::parse(clean).map_err(|_| format!("{field} must be a valid URL"))?;

    if parsed.scheme() != "http" {
        return Err(format!("{field} must use http:// in local mode"));
    }

    if !parsed.username().is_empty()
        || parsed.password().is_some()
        || parsed.query().is_some()
        || parsed.fragment().is_some()
    {
        return Err(format!(
            "{field} must not contain credentials, query, or fragment data"
        ));
    }

    if parsed.path() != "/" && !parsed.path().is_empty() {
        return Err(format!("{field} must not contain a route path"));
    }

    let host = parsed
        .host_str()
        .ok_or_else(|| format!("{field} is missing a host"))?;

    let loopback = host.eq_ignore_ascii_case("localhost")
        || host
            .parse::<IpAddr>()
            .map(|address| address.is_loopback())
            .unwrap_or(false);

    if !loopback {
        return Err(format!("{field} must remain loopback-only"));
    }

    if parsed.port().is_none() {
        return Err(format!("{field} must include an explicit port"));
    }

    Ok(clean.to_string())
}

fn validate_b3(object: &str) -> Result<(), String> {
    let digest = object
        .strip_prefix("b3:")
        .ok_or_else(|| "object must use canonical b3 form".to_string())?;

    if digest.len() != 64
        || !digest
            .bytes()
            .all(|byte| byte.is_ascii_digit() || matches!(byte, b'a'..=b'f'))
    {
        return Err("object must use canonical b3:<64 lowercase hex>".to_string());
    }

    Ok(())
}

fn validate_identifier(field: &str, value: &str) -> Result<(), String> {
    let valid = !value.is_empty()
        && value.len() <= 512
        && value.bytes().all(|byte| {
            byte.is_ascii_lowercase()
                || byte.is_ascii_digit()
                || matches!(byte, b'_' | b'-' | b':' | b'.' | b'/')
        });

    if !valid {
        return Err(format!(
            "{field} must be a bounded lowercase identifier token"
        ));
    }

    Ok(())
}

fn validate_privacy_route_id(value: &str) -> Result<(), String> {
    let colon_count = value.bytes().filter(|byte| *byte == b':').count();

    let valid = !value.is_empty()
        && value.len() <= 512
        && colon_count <= 1
        && !value.starts_with(':')
        && !value.ends_with(':')
        && value.bytes().all(|byte| {
            byte.is_ascii_lowercase() || byte.is_ascii_digit() || matches!(byte, b'_' | b'-' | b':')
        });

    if !valid {
        return Err("privacyRouteId must be an opaque route identifier".to_string());
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn user_node_target_and_privacy_route_are_fail_closed() {
        assert!(normalize_loopback_base_url("http://127.0.0.1:8080", "userNodeBaseUrl",).is_ok());

        assert!(normalize_loopback_base_url("http://192.0.2.4:8080", "userNodeBaseUrl",).is_err());

        assert!(validate_privacy_route_id("relay:phase22e2",).is_ok());

        assert!(validate_privacy_route_id("http://127.0.0.1:8080",).is_err());
    }

    #[test]
    fn authority_fields_are_required_false() {
        let value = json!({
            "queueState": "pending",
            "pendingEvidence": true,
            "privacySafe": true,
            "rawPeerIpRecorded": false,
            "accountingAccepted": false,
            "rewardEligible": false,
            "rewardTruth": false,
            "payoutAuthority": false,
            "walletMutation": false,
            "ledgerMutation": false,
            "confirmedRocMinorUnits": null,
            "fullDigestVerified": true,
            "challengeRaised": false,
            "evidence": {
                "result": "verified_valid",
                "evidence_only": true,
                "accounting_accepted": false,
                "reward_eligible": false,
                "reward_truth": false,
                "payout_authority": false,
                "wallet_mutation": false,
                "ledger_mutation": false
            }
        });

        validate_pending_evidence(&value, true).expect("valid evidence-only response");

        let mut poisoned = value;
        poisoned["walletMutation"] = json!(true);

        assert!(validate_pending_evidence(&poisoned, true,).is_err());
    }
}
