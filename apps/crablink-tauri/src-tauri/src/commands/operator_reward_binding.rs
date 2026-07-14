//! RO:WHAT — Tauri bridge for explicit signed Service Node reward-recipient binding.
//! RO:WHY — BUILD_PLAN_Z Phase 21 requires CrabLink to submit verified operator intent without gaining economic authority.
//! RO:INTERACTS — CrabLink Operator page and macronode POST /api/v1/rewards/bind.
//! RO:INVARIANTS — credential remains request-local; accepted binding is not registry finality, payout, receipt, or confirmed ROC.
//! RO:SECURITY — validates connection posture, address, credential, timestamp, bounded response, and non-authority fields.
//! RO:TEST — focused unit tests below plus the signed-binding UI boundary checker.

use reqwest::{Client, Url};
use serde::{Deserialize, Serialize};
use std::{
    net::IpAddr,
    sync::atomic::{AtomicU64, Ordering},
    time::{Duration, SystemTime, UNIX_EPOCH},
};

const SIGNED_INTENT_VERSION: u8 = 1;
const SIGNER_KIND: &str = "admin_bearer_blake3_keyed_v1";
const BIND_PATH: &str = "/api/v1/rewards/bind";
const MAX_RESPONSE_BYTES: usize = 64 * 1024;
const MAX_ADMIN_TOKEN_BYTES: usize = 4 * 1024;

static NONCE_COUNTER: AtomicU64 = AtomicU64::new(1);

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ServiceNodeRewardBindingRequest {
    enabled: bool,
    connection_mode: String,
    base_url: String,
    admin_token: String,
    reward_recipient_display_address: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServiceNodeRewardBindingResult {
    status: String,
    state: String,
    reward_recipient_display_address: Option<String>,
    pending_rotation_display_address: Option<String>,
    signed_intent_verified: bool,
    intent_signer_kind: Option<String>,
    registry_finality: bool,
    wallet_mutation: bool,
    ledger_mutation: bool,
    confirmed_roc: Option<u64>,
    note: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct BindRequestBody {
    reward_recipient_display_address: String,
    note: &'static str,
    signed_intent: SignedIntent,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SignedIntent {
    version: u8,
    signer_kind: &'static str,
    created_at_ms: u64,
    nonce: String,
    signature: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BindResponseBody {
    status: String,
    state: String,
    reward_recipient_display_address: Option<String>,
    pending_rotation_display_address: Option<String>,
    signed_intent_verified: bool,
    intent_signer_kind: Option<String>,
    registry_finality: bool,
    wallet_mutation: bool,
    ledger_mutation: bool,
    confirmed_roc: Option<u64>,
    note: String,
}

#[tauri::command]
pub async fn service_node_operator_bind_reward_recipient(
    request: ServiceNodeRewardBindingRequest,
) -> Result<ServiceNodeRewardBindingResult, String> {
    validate_request(&request)?;

    let base_url = validate_operator_url(&request.connection_mode, &request.base_url)?;

    let address = request.reward_recipient_display_address.trim().to_string();

    let admin_token = request.admin_token.trim();

    let created_at_ms = now_ms()?;
    let nonce = create_nonce(admin_token, &address, created_at_ms);

    let signature = sign_intent(admin_token, &address, created_at_ms, &nonce);

    let body = BindRequestBody {
        reward_recipient_display_address: address,
        note:
            "CrabLink signed operator binding request only; no registry finality, wallet mutation, ledger mutation, receipt, or confirmed ROC",
        signed_intent: SignedIntent {
            version: SIGNED_INTENT_VERSION,
            signer_kind: SIGNER_KIND,
            created_at_ms,
            nonce,
            signature,
        },
    };

    let endpoint = base_url
        .join(BIND_PATH)
        .map_err(|error| format!("failed to construct Service Node reward-binding URL: {error}"))?;

    let client = Client::builder()
        .connect_timeout(Duration::from_secs(3))
        .timeout(Duration::from_secs(8))
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .map_err(|error| format!("failed to build Service Node operator client: {error}"))?;

    let response = client
        .post(endpoint)
        .bearer_auth(admin_token)
        .json(&body)
        .send()
        .await
        .map_err(|error| format!("Service Node reward-binding request failed: {error}"))?;

    let status = response.status();

    let bytes = response
        .bytes()
        .await
        .map_err(|error| format!("failed to read Service Node reward-binding response: {error}"))?;

    if bytes.len() > MAX_RESPONSE_BYTES {
        return Err(
            "Service Node reward-binding response exceeded the bounded size limit".to_string(),
        );
    }

    if !status.is_success() {
        return Err(rejection_message(status.as_u16(), &bytes));
    }

    let accepted: BindResponseBody = serde_json::from_slice(&bytes)
        .map_err(|error| format!("Service Node returned invalid reward-binding JSON: {error}"))?;

    validate_accepted_response(&accepted)?;

    Ok(ServiceNodeRewardBindingResult {
        status: accepted.status,
        state: accepted.state,
        reward_recipient_display_address: accepted.reward_recipient_display_address,
        pending_rotation_display_address: accepted.pending_rotation_display_address,
        signed_intent_verified: accepted.signed_intent_verified,
        intent_signer_kind: accepted.intent_signer_kind,
        registry_finality: accepted.registry_finality,
        wallet_mutation: accepted.wallet_mutation,
        ledger_mutation: accepted.ledger_mutation,
        confirmed_roc: accepted.confirmed_roc,
        note: accepted.note,
    })
}

fn validate_request(request: &ServiceNodeRewardBindingRequest) -> Result<(), String> {
    if !request.enabled {
        return Err("Service Node Operator Mode must be explicitly enabled".to_string());
    }

    let admin_token = request.admin_token.trim();

    if admin_token.is_empty() {
        return Err("administrator credential is required for signed reward binding".to_string());
    }

    if admin_token.len() > MAX_ADMIN_TOKEN_BYTES {
        return Err("administrator credential exceeds the bounded size limit".to_string());
    }

    if contains_control_characters(admin_token) {
        return Err("administrator credential contains forbidden control characters".to_string());
    }

    validate_crablink_address(request.reward_recipient_display_address.trim())
}

fn validate_operator_url(connection_mode: &str, raw_base_url: &str) -> Result<Url, String> {
    let mode = connection_mode.trim();

    if mode != "local" && mode != "remote" {
        return Err("connection mode must be local or remote".to_string());
    }

    if contains_control_characters(raw_base_url) {
        return Err("Service Node URL contains forbidden control characters".to_string());
    }

    let mut url = Url::parse(raw_base_url.trim())
        .map_err(|error| format!("invalid Service Node URL: {error}"))?;

    if url.username() != ""
        || url.password().is_some()
        || url.query().is_some()
        || url.fragment().is_some()
    {
        return Err(
            "Service Node URL must not contain credentials, query parameters, or fragments"
                .to_string(),
        );
    }

    let host = url
        .host_str()
        .ok_or_else(|| "Service Node URL is missing a host".to_string())?;

    let loopback = is_loopback_host(host);

    match mode {
        "local" => {
            if !loopback {
                return Err("local Service Node mode requires a loopback host".to_string());
            }

            if url.scheme() != "http" && url.scheme() != "https" {
                return Err("local Service Node mode requires HTTP or HTTPS".to_string());
            }
        }

        "remote" => {
            if loopback {
                return Err("remote Service Node mode requires a non-loopback host".to_string());
            }

            if url.scheme() != "https" {
                return Err("remote Service Node mode requires HTTPS".to_string());
            }
        }

        _ => unreachable!("mode validated above"),
    }

    url.set_path("/");
    url.set_query(None);
    url.set_fragment(None);

    Ok(url)
}

fn validate_crablink_address(address: &str) -> Result<(), String> {
    let Some(username) = address.strip_prefix('@') else {
        return Err("reward recipient must be a CrabLink/RON @ address like @operator".to_string());
    };

    let bytes = username.as_bytes();

    if !(3..=32).contains(&bytes.len()) {
        return Err("reward recipient username must be 3..=32 characters after @".to_string());
    }

    if !bytes[0].is_ascii_alphanumeric() {
        return Err(
            "reward recipient username must start with an ASCII letter or digit".to_string(),
        );
    }

    if matches!(bytes[bytes.len() - 1], b'.' | b'-' | b'_') {
        return Err("reward recipient username must not end with '.', '-', or '_'".to_string());
    }

    let mut previous_dot = false;

    for byte in bytes {
        let valid = byte.is_ascii_lowercase()
            || byte.is_ascii_digit()
            || matches!(*byte, b'_' | b'-' | b'.');

        if !valid {
            return Err(
                "reward recipient username must use lowercase ASCII letters, digits, '.', '-', or '_'"
                    .to_string(),
            );
        }

        if previous_dot && *byte == b'.' {
            return Err("reward recipient username must not contain consecutive dots".to_string());
        }

        previous_dot = *byte == b'.';
    }

    Ok(())
}

fn create_nonce(admin_token: &str, address: &str, created_at_ms: u64) -> String {
    let counter = NONCE_COUNTER.fetch_add(1, Ordering::Relaxed);

    let mut hasher = blake3::Hasher::new();

    hasher.update(b"crablink.reward_binding.nonce.v1");
    hasher.update(&created_at_ms.to_le_bytes());
    hasher.update(&counter.to_le_bytes());
    hasher.update(&std::process::id().to_le_bytes());
    hasher.update(address.as_bytes());
    hasher.update(admin_token.as_bytes());

    hasher.finalize().to_hex().to_string()
}

fn sign_intent(admin_token: &str, address: &str, created_at_ms: u64, nonce: &str) -> String {
    let key = blake3::hash(admin_token.as_bytes());

    let payload = canonical_intent(address, created_at_ms, nonce);

    blake3::keyed_hash(key.as_bytes(), payload.as_bytes())
        .to_hex()
        .to_string()
}

fn canonical_intent(address: &str, created_at_ms: u64, nonce: &str) -> String {
    format!(
        "crablink.reward_binding.intent.v1\n\
         {address}\n\
         {created_at_ms}\n\
         {nonce}"
    )
}

fn validate_accepted_response(response: &BindResponseBody) -> Result<(), String> {
    if !response.signed_intent_verified {
        return Err(
            "Service Node accepted the request without proving signed-intent verification"
                .to_string(),
        );
    }

    if response.intent_signer_kind.as_deref() != Some(SIGNER_KIND) {
        return Err("Service Node reported an unexpected reward-binding signer kind".to_string());
    }

    if response.registry_finality
        || response.wallet_mutation
        || response.ledger_mutation
        || response.confirmed_roc.is_some()
    {
        return Err(
            "Service Node reward-binding response crossed the client non-authority boundary"
                .to_string(),
        );
    }

    Ok(())
}

fn rejection_message(status: u16, body: &[u8]) -> String {
    let parsed = serde_json::from_slice::<serde_json::Value>(body).ok();

    let detail = parsed
        .as_ref()
        .and_then(|value| value.get("error").or_else(|| value.get("status")))
        .and_then(serde_json::Value::as_str)
        .unwrap_or("request rejected")
        .chars()
        .take(256)
        .collect::<String>();

    format!("Service Node rejected reward binding with HTTP {status}: {detail}")
}

fn is_loopback_host(host: &str) -> bool {
    if host.eq_ignore_ascii_case("localhost") {
        return true;
    }

    host.parse::<IpAddr>()
        .map(|address| address.is_loopback())
        .unwrap_or(false)
}

fn contains_control_characters(value: &str) -> bool {
    value.chars().any(char::is_control)
}

fn now_ms() -> Result<u64, String> {
    let duration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| format!("system clock is before Unix epoch: {error}"))?;

    Ok(duration.as_millis().min(u64::MAX as u128) as u64)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn request() -> ServiceNodeRewardBindingRequest {
        ServiceNodeRewardBindingRequest {
            enabled: true,
            connection_mode: "local".to_string(),
            base_url: "http://127.0.0.1:8080".to_string(),
            admin_token: "secret".to_string(),
            reward_recipient_display_address: "@operator".to_string(),
        }
    }

    fn accepted_response() -> BindResponseBody {
        BindResponseBody {
            status: "binding request recorded".to_string(),
            state: "bound".to_string(),
            reward_recipient_display_address: Some("@operator".to_string()),
            pending_rotation_display_address: None,
            signed_intent_verified: true,
            intent_signer_kind: Some(SIGNER_KIND.to_string()),
            registry_finality: false,
            wallet_mutation: false,
            ledger_mutation: false,
            confirmed_roc: None,
            note: "runtime-local request only".to_string(),
        }
    }

    #[test]
    fn canonical_intent_matches_macronode_contract() {
        assert_eq!(
            canonical_intent("@operator", 12_345, "abc123",),
            "crablink.reward_binding.intent.v1\n@operator\n12345\nabc123",
        );
    }

    #[test]
    fn signature_is_bound_to_token_address_timestamp_and_nonce() {
        let first = sign_intent("secret", "@operator", 12_345, "abc123");

        assert_eq!(first.len(), 64);

        assert_ne!(
            first,
            sign_intent("other-secret", "@operator", 12_345, "abc123",),
        );

        assert_ne!(first, sign_intent("secret", "@other", 12_345, "abc123",),);

        assert_ne!(first, sign_intent("secret", "@operator", 12_346, "abc123",),);

        assert_ne!(first, sign_intent("secret", "@operator", 12_345, "xyz789",),);
    }

    #[test]
    fn request_requires_explicit_mode_address_and_safe_credential() {
        assert!(validate_request(&request()).is_ok());

        let mut disabled = request();
        disabled.enabled = false;
        assert!(validate_request(&disabled).is_err());

        let mut malformed = request();
        malformed.reward_recipient_display_address = "operator".to_string();
        assert!(validate_request(&malformed).is_err());

        let mut control = request();
        control.admin_token = "secret\nheader".to_string();
        assert!(validate_request(&control).is_err());
    }

    #[test]
    fn local_and_remote_connection_postures_remain_distinct() {
        assert!(validate_operator_url("local", "http://127.0.0.1:8080",).is_ok());

        assert!(validate_operator_url("local", "https://node.example",).is_err());

        assert!(validate_operator_url("remote", "https://node.example",).is_ok());

        assert!(validate_operator_url("remote", "http://node.example",).is_err());
    }

    #[test]
    fn accepted_response_must_remain_non_authoritative() {
        assert!(validate_accepted_response(&accepted_response(),).is_ok());

        let mut unsigned = accepted_response();
        unsigned.signed_intent_verified = false;

        assert!(validate_accepted_response(&unsigned).is_err());

        let mut wallet = accepted_response();
        wallet.wallet_mutation = true;

        assert!(validate_accepted_response(&wallet).is_err());

        let mut confirmed = accepted_response();
        confirmed.confirmed_roc = Some(1);

        assert!(validate_accepted_response(&confirmed).is_err());
    }
}
