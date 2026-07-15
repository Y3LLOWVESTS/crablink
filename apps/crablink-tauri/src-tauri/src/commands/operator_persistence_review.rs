//! RO:WHAT — Tauri bridge for bounded Service Node persistence review.
//! RO:WHY — BUILD_PLAN_Z Phase 21 requires explicit persistence decisions without fake durable-byte claims.
//! RO:INTERACTS — CrabLink Operator page and macronode /api/v1/persistence/*.
//! RO:INVARIANTS — exact B3 objects; bounded queue; exact lifecycle transitions; eligibility is not byte durability.
//! RO:SECURITY — credentials remain request-local; URLs are posture-validated; authority-poisoned responses reject.
//! RO:TEST — focused unit tests below plus the persistence-review boundary checker.

use reqwest::{Client, Url};
use serde::{Deserialize, Serialize};
use std::{net::IpAddr, time::Duration};

const PENDING_PATH: &str = "/api/v1/persistence/pending";
const SUBMIT_PATH: &str = "/api/v1/persistence/submit";
const APPROVE_PATH: &str = "/api/v1/persistence/approve";
const REJECT_PATH: &str = "/api/v1/persistence/reject";

const DEFAULT_PENDING_LIMIT: usize = 100;
const CLIENT_MAX_PENDING_LIMIT: usize = 256;
const BACKEND_MAX_PENDING_LIMIT: usize = 1_024;
const MAX_RESPONSE_BYTES: usize = 512 * 1_024;
const MAX_ADMIN_TOKEN_BYTES: usize = 4 * 1_024;

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ServiceNodePersistencePendingRequest {
    pub enabled: bool,
    pub connection_mode: String,
    pub base_url: String,
    pub admin_token: String,

    #[serde(default)]
    pub limit: Option<usize>,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ServiceNodePersistenceDecisionRequest {
    pub enabled: bool,
    pub connection_mode: String,
    pub base_url: String,
    pub admin_token: String,
    pub object: String,
    pub action: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ServiceNodePersistenceCandidate {
    object: String,
    asset_kind: String,
    state: String,
    durable_storage_eligible: bool,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ServiceNodePersistencePendingResult {
    version: u8,
    limit: usize,
    count: usize,
    maximum_limit: usize,
    items: Vec<ServiceNodePersistenceCandidate>,
    durable_bytes_written: bool,
    wallet_mutation: bool,
    ledger_mutation: bool,

    #[serde(default)]
    policy_mutation: bool,

    #[serde(default)]
    runtime_activation: bool,

    #[serde(default)]
    storage_delete: bool,

    #[serde(default)]
    provider_withdrawal: bool,

    #[serde(default)]
    reward_finality: bool,

    #[serde(default)]
    external_finality: bool,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ServiceNodePersistenceDecisionResult {
    version: u8,
    action: String,
    changed: bool,
    candidate: ServiceNodePersistenceCandidate,
    durable_bytes_written: bool,
    wallet_mutation: bool,
    ledger_mutation: bool,

    #[serde(default)]
    policy_mutation: bool,

    #[serde(default)]
    runtime_activation: bool,

    #[serde(default)]
    storage_delete: bool,

    #[serde(default)]
    provider_withdrawal: bool,

    #[serde(default)]
    reward_finality: bool,

    #[serde(default)]
    external_finality: bool,
}

#[derive(Debug, Serialize)]
struct PersistenceObjectBody<'a> {
    object: &'a str,
}

#[tauri::command]
pub async fn service_node_operator_persistence_pending(
    request: ServiceNodePersistencePendingRequest,
) -> Result<ServiceNodePersistencePendingResult, String> {
    let base_url = validate_common_request(
        request.enabled,
        &request.connection_mode,
        &request.base_url,
        &request.admin_token,
    )?;

    let limit = request.limit.unwrap_or(DEFAULT_PENDING_LIMIT);

    if !(1..=CLIENT_MAX_PENDING_LIMIT).contains(&limit) {
        return Err(format!(
            "persistence-review limit must be within 1..={CLIENT_MAX_PENDING_LIMIT}"
        ));
    }

    let mut endpoint = base_url
        .join(PENDING_PATH)
        .map_err(|error| format!("failed to construct persistence-review queue URL: {error}"))?;

    endpoint
        .query_pairs_mut()
        .append_pair("limit", &limit.to_string());

    let response = build_client()?
        .get(endpoint)
        .bearer_auth(request.admin_token.trim())
        .send()
        .await
        .map_err(|error| {
            format!("Service Node persistence-review queue request failed: {error}")
        })?;

    let status = response.status();

    let bytes = response
        .bytes()
        .await
        .map_err(|error| format!("failed to read persistence-review queue response: {error}"))?;

    validate_response_size(bytes.len())?;

    if !status.is_success() {
        return Err(rejection_message(status.as_u16(), &bytes));
    }

    let result: ServiceNodePersistencePendingResult =
        serde_json::from_slice(&bytes).map_err(|error| {
            format!("Service Node returned invalid persistence-review queue JSON: {error}")
        })?;

    validate_pending_result(&result, limit)?;

    Ok(result)
}

#[tauri::command]
pub async fn service_node_operator_persistence_decide(
    request: ServiceNodePersistenceDecisionRequest,
) -> Result<ServiceNodePersistenceDecisionResult, String> {
    let base_url = validate_common_request(
        request.enabled,
        &request.connection_mode,
        &request.base_url,
        &request.admin_token,
    )?;

    let object = request.object.trim();

    if !is_canonical_b3(object) {
        return Err(
            "persistence-review object must be a canonical lowercase b3:<64 hex> identifier"
                .to_string(),
        );
    }

    let (path, expected_action, expected_state, expected_eligibility) = match request.action.trim()
    {
        "submit" => (SUBMIT_PATH, "submit_for_review", "pending_review", false),

        "approve" => (APPROVE_PATH, "approve", "verified_persistent", true),

        "reject" => (REJECT_PATH, "reject", "operator_blocked", false),

        _ => {
            return Err("persistence-review action must be submit, approve, or reject".to_string());
        }
    };

    let endpoint = base_url
        .join(path)
        .map_err(|error| format!("failed to construct persistence-review decision URL: {error}"))?;

    let response = build_client()?
        .post(endpoint)
        .bearer_auth(request.admin_token.trim())
        .json(&PersistenceObjectBody { object })
        .send()
        .await
        .map_err(|error| format!("Service Node persistence-review decision failed: {error}"))?;

    let status = response.status();

    let bytes = response
        .bytes()
        .await
        .map_err(|error| format!("failed to read persistence-review decision response: {error}"))?;

    validate_response_size(bytes.len())?;

    if !status.is_success() {
        return Err(rejection_message(status.as_u16(), &bytes));
    }

    let result: ServiceNodePersistenceDecisionResult =
        serde_json::from_slice(&bytes).map_err(|error| {
            format!("Service Node returned invalid persistence-review decision JSON: {error}")
        })?;

    validate_decision_result(
        &result,
        object,
        expected_action,
        expected_state,
        expected_eligibility,
    )?;

    Ok(result)
}

fn build_client() -> Result<Client, String> {
    Client::builder()
        .connect_timeout(Duration::from_secs(3))
        .timeout(Duration::from_secs(8))
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .map_err(|error| format!("failed to build Service Node persistence-review client: {error}"))
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
        return Err("administrator credential is required for persistence review".to_string());
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
    result: &ServiceNodePersistencePendingResult,
    requested_limit: usize,
) -> Result<(), String> {
    validate_non_authority(
        result.durable_bytes_written,
        result.wallet_mutation,
        result.ledger_mutation,
        result.policy_mutation,
        result.runtime_activation,
        result.storage_delete,
        result.provider_withdrawal,
        result.reward_finality,
        result.external_finality,
    )?;

    if result.version != 1 {
        return Err("Service Node returned an unsupported persistence-review version".to_string());
    }

    if result.count != result.items.len() {
        return Err(
            "Service Node persistence-review count does not match the returned items".to_string(),
        );
    }

    if result.limit != requested_limit
        || result.items.len() > requested_limit
        || result.maximum_limit < requested_limit
        || result.maximum_limit > BACKEND_MAX_PENDING_LIMIT
    {
        return Err(
            "Service Node persistence-review queue exceeded the requested bounds".to_string(),
        );
    }

    for item in &result.items {
        validate_candidate(item)?;

        if item.state != "ephemeral_unvetted" && item.state != "pending_review" {
            return Err(
                "Service Node pending persistence queue returned a decided candidate".to_string(),
            );
        }

        if item.durable_storage_eligible {
            return Err(
                "Service Node pending persistence queue claimed durable eligibility".to_string(),
            );
        }
    }

    Ok(())
}

fn validate_decision_result(
    result: &ServiceNodePersistenceDecisionResult,
    expected_object: &str,
    expected_action: &str,
    expected_state: &str,
    expected_eligibility: bool,
) -> Result<(), String> {
    validate_non_authority(
        result.durable_bytes_written,
        result.wallet_mutation,
        result.ledger_mutation,
        result.policy_mutation,
        result.runtime_activation,
        result.storage_delete,
        result.provider_withdrawal,
        result.reward_finality,
        result.external_finality,
    )?;

    if result.version != 1 {
        return Err("Service Node returned an unsupported persistence-review version".to_string());
    }

    validate_candidate(&result.candidate)?;

    if result.action != expected_action {
        return Err("Service Node reported an unexpected persistence-review action".to_string());
    }

    if result.candidate.object != expected_object
        || result.candidate.state != expected_state
        || result.candidate.durable_storage_eligible != expected_eligibility
    {
        return Err(
            "Service Node persistence-review decision did not match the requested object, state, or eligibility"
                .to_string(),
        );
    }

    Ok(())
}

fn validate_candidate(candidate: &ServiceNodePersistenceCandidate) -> Result<(), String> {
    if !is_canonical_b3(&candidate.object) {
        return Err("Service Node returned a malformed persistence-review object".to_string());
    }

    if candidate.asset_kind.trim().is_empty() || candidate.state.trim().is_empty() {
        return Err("Service Node returned incomplete persistence-review metadata".to_string());
    }

    Ok(())
}

#[allow(clippy::too_many_arguments)]
fn validate_non_authority(
    durable_bytes_written: bool,
    wallet_mutation: bool,
    ledger_mutation: bool,
    policy_mutation: bool,
    runtime_activation: bool,
    storage_delete: bool,
    provider_withdrawal: bool,
    reward_finality: bool,
    external_finality: bool,
) -> Result<(), String> {
    if durable_bytes_written
        || wallet_mutation
        || ledger_mutation
        || policy_mutation
        || runtime_activation
        || storage_delete
        || provider_withdrawal
        || reward_finality
        || external_finality
    {
        return Err(
            "Service Node persistence-review response crossed the CrabLink non-authority boundary"
                .to_string(),
        );
    }

    Ok(())
}

fn validate_response_size(size: usize) -> Result<(), String> {
    if size > MAX_RESPONSE_BYTES {
        return Err(
            "Service Node persistence-review response exceeded the bounded size limit".to_string(),
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

    format!("Service Node rejected persistence review with HTTP {status}: {detail}")
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

    fn candidate(state: &str, eligible: bool) -> ServiceNodePersistenceCandidate {
        ServiceNodePersistenceCandidate {
            object: OBJECT.to_string(),
            asset_kind: "image".to_string(),
            state: state.to_string(),
            durable_storage_eligible: eligible,
        }
    }

    fn pending_result() -> ServiceNodePersistencePendingResult {
        ServiceNodePersistencePendingResult {
            version: 1,
            limit: 100,
            count: 2,
            maximum_limit: 1_024,
            items: vec![
                candidate("ephemeral_unvetted", false),
                candidate("pending_review", false),
            ],
            durable_bytes_written: false,
            wallet_mutation: false,
            ledger_mutation: false,
            policy_mutation: false,
            runtime_activation: false,
            storage_delete: false,
            provider_withdrawal: false,
            reward_finality: false,
            external_finality: false,
        }
    }

    fn decision_result(
        action: &str,
        state: &str,
        eligible: bool,
    ) -> ServiceNodePersistenceDecisionResult {
        ServiceNodePersistenceDecisionResult {
            version: 1,
            action: action.to_string(),
            changed: true,
            candidate: candidate(state, eligible),
            durable_bytes_written: false,
            wallet_mutation: false,
            ledger_mutation: false,
            policy_mutation: false,
            runtime_activation: false,
            storage_delete: false,
            provider_withdrawal: false,
            reward_finality: false,
            external_finality: false,
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
    fn pending_queue_is_bounded_undecided_and_ineligible() {
        assert!(validate_pending_result(&pending_result(), 100,).is_ok());

        let mut decided = pending_result();

        decided.items[0].state = "verified_persistent".to_string();

        assert!(validate_pending_result(&decided, 100,).is_err());

        let mut eligible = pending_result();

        eligible.items[0].durable_storage_eligible = true;

        assert!(validate_pending_result(&eligible, 100,).is_err());
    }

    #[test]
    fn submit_approve_and_reject_require_exact_results() {
        assert!(validate_decision_result(
            &decision_result("submit_for_review", "pending_review", false,),
            OBJECT,
            "submit_for_review",
            "pending_review",
            false,
        )
        .is_ok());

        assert!(validate_decision_result(
            &decision_result("approve", "verified_persistent", true,),
            OBJECT,
            "approve",
            "verified_persistent",
            true,
        )
        .is_ok());

        assert!(validate_decision_result(
            &decision_result("reject", "operator_blocked", false,),
            OBJECT,
            "reject",
            "operator_blocked",
            false,
        )
        .is_ok());
    }

    #[test]
    fn persistence_responses_cannot_claim_durability_or_authority() {
        let mut durable = pending_result();
        durable.durable_bytes_written = true;

        assert!(validate_pending_result(&durable, 100,).is_err());

        let mut policy = pending_result();
        policy.policy_mutation = true;

        assert!(validate_pending_result(&policy, 100,).is_err());

        let mut wallet = pending_result();
        wallet.wallet_mutation = true;

        assert!(validate_pending_result(&wallet, 100,).is_err());
    }

    #[test]
    fn candidates_require_canonical_b3_objects() {
        assert!(is_canonical_b3(OBJECT));
        assert!(!is_canonical_b3("b3:not-valid"));
        assert!(!is_canonical_b3(
            "B3:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        ));
    }
}
