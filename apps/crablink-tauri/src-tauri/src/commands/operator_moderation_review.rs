//! RO:WHAT — Tauri bridge for bounded Service Node moderation-review controls.
//! RO:WHY — BUILD_PLAN_Z Phase 21 requires explicit queue review without giving CrabLink policy authority.
//! RO:INTERACTS — CrabLink Operator page and macronode /api/v1/moderation/review/*.
//! RO:INVARIANTS — authenticated reads/actions; exact pending items; approve means escalation metadata only.
//! RO:SECURITY — credentials remain request-local; URLs are posture-validated; responses are bounded and authority-checked.
//! RO:TEST — focused unit tests below plus the moderation-review UI boundary checker.

use reqwest::{Client, Url};
use serde::{Deserialize, Serialize};
use std::{net::IpAddr, time::Duration};

const PENDING_PATH: &str = "/api/v1/moderation/review/pending";
const APPROVE_PATH: &str = "/api/v1/moderation/review/approve";
const REJECT_PATH: &str = "/api/v1/moderation/review/reject";

const DEFAULT_PENDING_LIMIT: usize = 100;
const MAX_PENDING_LIMIT: usize = 256;
const MAX_RESPONSE_BYTES: usize = 256 * 1024;
const MAX_ADMIN_TOKEN_BYTES: usize = 4 * 1024;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ServiceNodeModerationPendingRequest {
    enabled: bool,
    connection_mode: String,
    base_url: String,
    admin_token: String,

    #[serde(default)]
    limit: Option<usize>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ServiceNodeModerationDecisionRequest {
    enabled: bool,
    connection_mode: String,
    base_url: String,
    admin_token: String,
    sequence: u64,
    action: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServiceNodeModerationReviewItem {
    sequence: u64,
    object: String,
    source: String,
    reason: String,
    effective_policy_reason: String,
    currently_permits_serve: bool,
    state: String,
    submitted_at_ms: u64,
    reviewed_at_ms: Option<u64>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServiceNodeModerationPendingResult {
    version: u8,
    limit: usize,
    count: usize,
    maximum_limit: usize,
    items: Vec<ServiceNodeModerationReviewItem>,
    policy_mutation: bool,
    runtime_activation: bool,
    storage_delete: bool,
    provider_withdrawal: bool,
    reward_finality: bool,
    wallet_mutation: bool,
    ledger_mutation: bool,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServiceNodeModerationDecisionResult {
    version: u8,
    action: String,
    changed: bool,
    candidate: ServiceNodeModerationReviewItem,
    policy_mutation: bool,
    runtime_activation: bool,
    storage_delete: bool,
    provider_withdrawal: bool,
    reward_finality: bool,
    wallet_mutation: bool,
    ledger_mutation: bool,
}

#[derive(Debug, Serialize)]
struct ModerationDecisionBody {
    sequence: u64,
}

#[tauri::command]
pub async fn service_node_operator_moderation_pending(
    request: ServiceNodeModerationPendingRequest,
) -> Result<ServiceNodeModerationPendingResult, String> {
    let base_url = validate_common_request(
        request.enabled,
        &request.connection_mode,
        &request.base_url,
        &request.admin_token,
    )?;

    let limit = request.limit.unwrap_or(DEFAULT_PENDING_LIMIT);

    if !(1..=MAX_PENDING_LIMIT).contains(&limit) {
        return Err(format!(
            "moderation-review limit must be within 1..={MAX_PENDING_LIMIT}"
        ));
    }

    let mut endpoint = base_url
        .join(PENDING_PATH)
        .map_err(|error| format!("failed to construct moderation-review queue URL: {error}"))?;

    endpoint
        .query_pairs_mut()
        .append_pair("limit", &limit.to_string());

    let response = build_client()?
        .get(endpoint)
        .bearer_auth(request.admin_token.trim())
        .send()
        .await
        .map_err(|error| format!("Service Node moderation-review queue request failed: {error}"))?;

    let status = response.status();
    let bytes = response
        .bytes()
        .await
        .map_err(|error| format!("failed to read moderation-review queue response: {error}"))?;

    validate_response_size(bytes.len())?;

    if !status.is_success() {
        return Err(rejection_message(status.as_u16(), &bytes));
    }

    let result: ServiceNodeModerationPendingResult =
        serde_json::from_slice(&bytes).map_err(|error| {
            format!("Service Node returned invalid moderation-review queue JSON: {error}")
        })?;

    validate_pending_result(&result, limit)?;

    Ok(result)
}

#[tauri::command]
pub async fn service_node_operator_moderation_decide(
    request: ServiceNodeModerationDecisionRequest,
) -> Result<ServiceNodeModerationDecisionResult, String> {
    let base_url = validate_common_request(
        request.enabled,
        &request.connection_mode,
        &request.base_url,
        &request.admin_token,
    )?;

    if request.sequence == 0 {
        return Err("moderation-review sequence must be greater than zero".to_string());
    }

    let (path, expected_action, expected_state) = match request.action.trim() {
        "approve" => (
            APPROVE_PATH,
            "approve_for_escalation",
            "approved_for_escalation",
        ),
        "reject" => (REJECT_PATH, "reject", "rejected"),
        _ => {
            return Err("moderation-review action must be approve or reject".to_string());
        }
    };

    let endpoint = base_url
        .join(path)
        .map_err(|error| format!("failed to construct moderation-review decision URL: {error}"))?;

    let response = build_client()?
        .post(endpoint)
        .bearer_auth(request.admin_token.trim())
        .json(&ModerationDecisionBody {
            sequence: request.sequence,
        })
        .send()
        .await
        .map_err(|error| format!("Service Node moderation-review decision failed: {error}"))?;

    let status = response.status();
    let bytes = response
        .bytes()
        .await
        .map_err(|error| format!("failed to read moderation-review decision response: {error}"))?;

    validate_response_size(bytes.len())?;

    if !status.is_success() {
        return Err(rejection_message(status.as_u16(), &bytes));
    }

    let result: ServiceNodeModerationDecisionResult =
        serde_json::from_slice(&bytes).map_err(|error| {
            format!("Service Node returned invalid moderation-review decision JSON: {error}")
        })?;

    validate_decision_result(&result, request.sequence, expected_action, expected_state)?;

    Ok(result)
}

fn build_client() -> Result<Client, String> {
    Client::builder()
        .connect_timeout(Duration::from_secs(3))
        .timeout(Duration::from_secs(8))
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .map_err(|error| format!("failed to build Service Node moderation-review client: {error}"))
}

fn validate_common_request(
    enabled: bool,
    connection_mode: &str,
    base_url: &str,
    admin_token: &str,
) -> Result<Url, String> {
    if !enabled {
        return Err("Service Node Operator Mode must be explicitly enabled".to_string());
    }

    let admin_token = admin_token.trim();

    if admin_token.is_empty() {
        return Err("administrator credential is required for moderation review".to_string());
    }

    if admin_token.len() > MAX_ADMIN_TOKEN_BYTES {
        return Err("administrator credential exceeds the bounded size limit".to_string());
    }

    if contains_control_characters(admin_token) {
        return Err("administrator credential contains forbidden control characters".to_string());
    }

    validate_operator_url(connection_mode, base_url)
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

        _ => unreachable!("connection mode validated above"),
    }

    url.set_path("/");
    url.set_query(None);
    url.set_fragment(None);

    Ok(url)
}

fn validate_pending_result(
    result: &ServiceNodeModerationPendingResult,
    requested_limit: usize,
) -> Result<(), String> {
    validate_non_authority(
        result.policy_mutation,
        result.runtime_activation,
        result.storage_delete,
        result.provider_withdrawal,
        result.reward_finality,
        result.wallet_mutation,
        result.ledger_mutation,
    )?;

    if result.count != result.items.len() {
        return Err(
            "Service Node moderation-review count does not match the returned items".to_string(),
        );
    }

    if result.limit != requested_limit
        || result.items.len() > requested_limit
        || result.maximum_limit > MAX_PENDING_LIMIT
    {
        return Err(
            "Service Node moderation-review queue exceeded the requested bounds".to_string(),
        );
    }

    for item in &result.items {
        validate_item(item)?;

        if item.state != "pending_review" {
            return Err(
                "Service Node pending queue returned a non-pending review item".to_string(),
            );
        }
    }

    Ok(())
}

fn validate_decision_result(
    result: &ServiceNodeModerationDecisionResult,
    expected_sequence: u64,
    expected_action: &str,
    expected_state: &str,
) -> Result<(), String> {
    validate_non_authority(
        result.policy_mutation,
        result.runtime_activation,
        result.storage_delete,
        result.provider_withdrawal,
        result.reward_finality,
        result.wallet_mutation,
        result.ledger_mutation,
    )?;

    validate_item(&result.candidate)?;

    if result.action != expected_action {
        return Err("Service Node reported an unexpected moderation-review action".to_string());
    }

    if result.candidate.sequence != expected_sequence || result.candidate.state != expected_state {
        return Err(
            "Service Node moderation-review decision did not match the requested item or state"
                .to_string(),
        );
    }

    Ok(())
}

fn validate_item(item: &ServiceNodeModerationReviewItem) -> Result<(), String> {
    if item.sequence == 0 {
        return Err("Service Node returned a zero moderation-review sequence".to_string());
    }

    if !is_canonical_b3(&item.object) {
        return Err("Service Node returned a malformed moderation-review object".to_string());
    }

    if item.source.trim().is_empty()
        || item.reason.trim().is_empty()
        || item.effective_policy_reason.trim().is_empty()
        || item.state.trim().is_empty()
    {
        return Err("Service Node returned incomplete moderation-review metadata".to_string());
    }

    Ok(())
}

fn validate_non_authority(
    policy_mutation: bool,
    runtime_activation: bool,
    storage_delete: bool,
    provider_withdrawal: bool,
    reward_finality: bool,
    wallet_mutation: bool,
    ledger_mutation: bool,
) -> Result<(), String> {
    if policy_mutation
        || runtime_activation
        || storage_delete
        || provider_withdrawal
        || reward_finality
        || wallet_mutation
        || ledger_mutation
    {
        return Err(
            "Service Node moderation-review response crossed the CrabLink non-authority boundary"
                .to_string(),
        );
    }

    Ok(())
}

fn validate_response_size(size: usize) -> Result<(), String> {
    if size > MAX_RESPONSE_BYTES {
        return Err(
            "Service Node moderation-review response exceeded the bounded size limit".to_string(),
        );
    }

    Ok(())
}

fn is_canonical_b3(value: &str) -> bool {
    let Some(hex) = value.strip_prefix("b3:") else {
        return false;
    };

    hex.len() == 64
        && hex
            .bytes()
            .all(|byte| byte.is_ascii_digit() || matches!(byte, b'a'..=b'f'))
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

    format!("Service Node rejected moderation review with HTTP {status}: {detail}")
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

#[cfg(test)]
mod tests {
    use super::*;

    const OBJECT: &str = "b3:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

    fn item(state: &str) -> ServiceNodeModerationReviewItem {
        ServiceNodeModerationReviewItem {
            sequence: 7,
            object: OBJECT.to_string(),
            source: "operator_report".to_string(),
            reason: "abuse_report".to_string(),
            effective_policy_reason: "no_rule".to_string(),
            currently_permits_serve: true,
            state: state.to_string(),
            submitted_at_ms: 1_000,
            reviewed_at_ms: None,
        }
    }

    fn pending_result() -> ServiceNodeModerationPendingResult {
        ServiceNodeModerationPendingResult {
            version: 1,
            limit: 100,
            count: 1,
            maximum_limit: 256,
            items: vec![item("pending_review")],
            policy_mutation: false,
            runtime_activation: false,
            storage_delete: false,
            provider_withdrawal: false,
            reward_finality: false,
            wallet_mutation: false,
            ledger_mutation: false,
        }
    }

    fn decision_result(action: &str, state: &str) -> ServiceNodeModerationDecisionResult {
        ServiceNodeModerationDecisionResult {
            version: 1,
            action: action.to_string(),
            changed: true,
            candidate: item(state),
            policy_mutation: false,
            runtime_activation: false,
            storage_delete: false,
            provider_withdrawal: false,
            reward_finality: false,
            wallet_mutation: false,
            ledger_mutation: false,
        }
    }

    #[test]
    fn local_and_remote_urls_keep_distinct_postures() {
        assert!(validate_operator_url("local", "http://127.0.0.1:8080",).is_ok());

        assert!(validate_operator_url("local", "https://node.example",).is_err());

        assert!(validate_operator_url("remote", "https://node.example",).is_ok());

        assert!(validate_operator_url("remote", "http://node.example",).is_err());
    }

    #[test]
    fn pending_queue_is_bounded_and_pending_only() {
        assert!(validate_pending_result(&pending_result(), 100,).is_ok());

        let mut non_pending = pending_result();
        non_pending.items[0].state = "rejected".to_string();

        assert!(validate_pending_result(&non_pending, 100,).is_err());

        let mut count_mismatch = pending_result();
        count_mismatch.count = 2;

        assert!(validate_pending_result(&count_mismatch, 100,).is_err());
    }

    #[test]
    fn moderation_responses_cannot_claim_policy_or_economic_authority() {
        let mut result = pending_result();
        result.policy_mutation = true;

        assert!(validate_pending_result(&result, 100).is_err());

        let mut wallet = pending_result();
        wallet.wallet_mutation = true;

        assert!(validate_pending_result(&wallet, 100).is_err());
    }

    #[test]
    fn approve_and_reject_require_exact_result_states() {
        assert!(validate_decision_result(
            &decision_result("approve_for_escalation", "approved_for_escalation",),
            7,
            "approve_for_escalation",
            "approved_for_escalation",
        )
        .is_ok());

        assert!(validate_decision_result(
            &decision_result("reject", "rejected",),
            7,
            "reject",
            "rejected",
        )
        .is_ok());

        assert!(validate_decision_result(
            &decision_result("approve_for_escalation", "rejected",),
            7,
            "approve_for_escalation",
            "approved_for_escalation",
        )
        .is_err());
    }

    #[test]
    fn review_items_require_canonical_b3_objects() {
        assert!(is_canonical_b3(OBJECT));
        assert!(!is_canonical_b3("b3:not-valid"));
        assert!(!is_canonical_b3(
            "B3:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        ));
    }
}
