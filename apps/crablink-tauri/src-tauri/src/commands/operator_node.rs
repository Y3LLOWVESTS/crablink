//! RO:WHAT — Optional CrabLink Service Node operator-status connection boundary.
//! RO:WHY — BUILD_PLAN_Z Phase 21 needs explicit local/remote attachment without making CrabLink daemon, policy, wallet, ledger, registry, quorum, or finality authority.
//! RO:INTERACTS — macronode `/healthz`, `/readyz`, `/api/v1/status`; Tauri command allowlist; serviceNodeOperatorClient.js.
//! RO:INVARIANTS — disabled by default; local/remote mode is explicit; remote requires HTTPS plus an ephemeral bearer credential; GET-only canonical observation; connection failure degrades this view only.
//! RO:SECURITY — credentials are never returned or logged; URLs cannot contain userinfo/query/fragment; no mutation routes, wallet/ledger authority, policy authority, lifecycle authority, or external-finality claim.
//! RO:TEST — module unit tests plus scripts/check-crablink-service-node-operator-boundary.mjs.

use crate::state::AppState;
use reqwest::Url;
use serde::{Deserialize, Serialize};
use std::{
    net::IpAddr,
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tauri::State;

const DEFAULT_SERVICE_NODE_URL: &str = "http://127.0.0.1:8080";
const MAX_OPERATOR_BODY_BYTES: usize = 512 * 1024;
const MAX_SERVICE_NODE_URL_BYTES: usize = 2048;
const MAX_ADMIN_TOKEN_BYTES: usize = 4096;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ServiceNodeOperatorRequest {
    pub enabled: Option<bool>,
    pub connection_mode: Option<String>,
    pub base_url: Option<String>,
    pub admin_token: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OperatorProbe {
    pub route: &'static str,
    pub ok: bool,
    pub status: Option<u16>,
    pub error_code: Option<&'static str>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ConfirmedIssuanceEvidence {
    pub receipt_count: u64,
    pub total_issued_minor: String,
    pub ledger_root: String,
    pub settlement_status: String,
    pub finality_status: String,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CanonicalServiceNodeSummary {
    pub profile: String,
    pub node_role: String,
    pub ready: bool,
    pub headless_mode: bool,
    pub admin_ui_enabled: bool,
    pub admin_ui_runtime_required: bool,
    pub public_inbound_enabled: bool,
    pub user_ip_publication: String,

    pub policy_state: String,
    pub moderation_state: String,
    pub persistence_pending_review: u64,

    pub reward_binding_state: String,
    pub reward_recipient_display_address: Option<String>,
    pub pending_rotation_display_address: Option<String>,

    pub lifecycle_state: String,
    pub quorum_status: String,
    pub counts_toward_quorum: bool,

    pub ledger_receipt_reported: bool,
    pub confirmed_roc_reported: bool,
    pub confirmed_issuance_evidence: Option<ConfirmedIssuanceEvidence>,
    pub external_finality_reported: bool,

    pub operator_projection_authorizes_state_change: bool,
    pub operator_projection_authorizes_economic_mutation: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServiceNodeOperatorStatus {
    pub schema: &'static str,
    pub enabled: bool,
    pub configured: bool,
    pub connection_mode: String,
    pub base_url: String,
    pub connection_state: String,
    pub reason: String,
    pub checked_at_ms: u64,

    pub credential_supplied: bool,
    pub credential_persisted: bool,
    pub authorization_mode: String,

    pub health: OperatorProbe,
    pub ready: OperatorProbe,
    pub status: OperatorProbe,
    pub service_node: Option<CanonicalServiceNodeSummary>,

    pub read_only: bool,
    pub mutation_routes_exposed: bool,
    pub client_required_by_daemon: bool,
    pub daemon_started_by_client: bool,
    pub policy_mutation: bool,
    pub lifecycle_mutation: bool,
    pub wallet_mutation: bool,
    pub ledger_mutation: bool,
    pub registry_mutation: bool,
    pub quorum_mutation: bool,
    pub finality_authority: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ConnectionMode {
    Local,
    Remote,
}

impl ConnectionMode {
    fn parse(value: Option<&str>) -> Result<Self, String> {
        match value.unwrap_or("local").trim() {
            "local" => Ok(Self::Local),
            "remote" => Ok(Self::Remote),
            _ => Err("connectionMode must be either 'local' or 'remote'".to_string()),
        }
    }

    fn as_str(self) -> &'static str {
        match self {
            Self::Local => "local",
            Self::Remote => "remote",
        }
    }
}

#[derive(Debug, Default, Deserialize)]
#[serde(default)]
struct NodeStatusDocument {
    profile: String,
    #[serde(alias = "nodeRole")]
    node_role: String,
    ready: bool,
    #[serde(alias = "headlessMode")]
    headless_mode: bool,
    #[serde(alias = "adminUiEnabled")]
    admin_ui_enabled: bool,
    #[serde(alias = "adminUiRuntimeRequired")]
    admin_ui_runtime_required: bool,
    #[serde(alias = "publicInboundEnabled")]
    public_inbound_enabled: bool,
    #[serde(alias = "userIpPublication")]
    user_ip_publication: String,
    policy: PolicyDocument,
    #[serde(alias = "persistenceReview")]
    persistence_review: PersistenceReviewDocument,
    #[serde(alias = "rewardBinding")]
    reward_binding: RewardBindingDocument,
    #[serde(alias = "serviceNodeLifecycle")]
    service_node_lifecycle: Option<LifecycleDocument>,
    #[serde(alias = "economicPipeline")]
    economic_pipeline: Option<EconomicPipelineDocument>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(default)]
struct PolicyDocument {
    state: String,
    #[serde(alias = "moderationState")]
    moderation_state: String,
}

#[derive(Debug, Default, Deserialize)]
#[serde(default)]
struct PersistenceReviewDocument {
    #[serde(alias = "pendingReview")]
    pending_review: u64,
}

#[derive(Debug, Default, Deserialize)]
#[serde(default)]
struct RewardBindingDocument {
    state: String,
    #[serde(alias = "rewardRecipientDisplayAddress")]
    reward_recipient_display_address: Option<String>,
    #[serde(alias = "pendingRotationDisplayAddress")]
    pending_rotation_display_address: Option<String>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(default)]
struct LifecycleDocument {
    #[serde(alias = "lifecycleState")]
    lifecycle_state: String,
    #[serde(alias = "quorumStatus")]
    quorum_status: String,
    #[serde(alias = "countsTowardQuorum")]
    counts_toward_quorum: bool,
    #[serde(alias = "operatorProjectionAuthorizesStateChange")]
    operator_projection_authorizes_state_change: Option<bool>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(default)]
struct EconomicPipelineDocument {
    #[serde(alias = "ledgerReceiptReported")]
    ledger_receipt_reported: bool,
    #[serde(alias = "confirmedRocReported")]
    confirmed_roc_reported: bool,
    #[serde(alias = "finalityReported")]
    finality_reported: bool,
    #[serde(alias = "operatorProjectionAuthorizesEconomicMutation")]
    operator_projection_authorizes_economic_mutation: Option<bool>,
    #[serde(alias = "epochPayoutReceipts")]
    epoch_payout_receipts: Option<EpochPayoutReceiptsDocument>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(default)]
struct EpochPayoutReceiptsDocument {
    #[serde(alias = "receiptCount")]
    receipt_count: u64,
    #[serde(alias = "totalIssuedMinor")]
    total_issued_minor: String,
    #[serde(alias = "ledgerRoot")]
    ledger_root: String,
    #[serde(alias = "settlementStatus")]
    settlement_status: String,
    #[serde(alias = "finalityStatus")]
    finality_status: String,
}

#[tauri::command]
pub async fn service_node_operator_status(
    state: State<'_, AppState>,
    request: Option<ServiceNodeOperatorRequest>,
) -> Result<ServiceNodeOperatorStatus, String> {
    let timeout_ms = {
        let settings = state
            .settings
            .lock()
            .map_err(|_| "settings lock poisoned".to_string())?;

        settings.request_timeout_ms
    };

    query_service_node_operator_status(state.http.clone(), timeout_ms, request).await
}

/// Execute the same typed Operator status boundary without a Tauri runtime.
///
/// Phase 22 uses this entrypoint to attach the production native command logic
/// to a real independently running Service Node. It cannot start or manage the
/// daemon and preserves the command's bounded read-only projection.
pub async fn query_service_node_operator_status(
    client: reqwest::Client,
    timeout_ms: u64,
    request: Option<ServiceNodeOperatorRequest>,
) -> Result<ServiceNodeOperatorStatus, String> {
    let request = request.unwrap_or(ServiceNodeOperatorRequest {
        enabled: None,
        connection_mode: None,
        base_url: None,
        admin_token: None,
    });

    let enabled = request.enabled.unwrap_or(false);
    let mode = ConnectionMode::parse(request.connection_mode.as_deref())?;
    let base_url = normalize_service_node_base_url(
        mode,
        request
            .base_url
            .as_deref()
            .unwrap_or(DEFAULT_SERVICE_NODE_URL),
    )?;
    let admin_token = normalize_admin_token(request.admin_token.as_deref())?;

    if !enabled {
        return disabled_status(mode, base_url);
    }

    if mode == ConnectionMode::Remote && admin_token.is_none() {
        return Err(
            "remote Service Node operator connections require an explicit bearer credential"
                .to_string(),
        );
    }

    let timeout_ms = timeout_ms.clamp(1, 30_000);
    let health = probe_route(
        &client,
        &base_url,
        "/healthz",
        timeout_ms,
        admin_token.as_deref(),
    )
    .await;
    let ready = probe_route(
        &client,
        &base_url,
        "/readyz",
        timeout_ms,
        admin_token.as_deref(),
    )
    .await;
    let status = probe_route(
        &client,
        &base_url,
        "/api/v1/status",
        timeout_ms,
        admin_token.as_deref(),
    )
    .await;

    let service_node = status
        .body
        .as_deref()
        .and_then(|body| serde_json::from_slice::<NodeStatusDocument>(body).ok())
        .map(project_service_node_status);

    let role_verified = service_node
        .as_ref()
        .map(|summary| summary.node_role == "service_node")
        .unwrap_or(false);
    let headless_boundary_safe = service_node
        .as_ref()
        .map(|summary| summary.headless_mode && !summary.admin_ui_runtime_required)
        .unwrap_or(false);

    let (connection_state, reason) = if status.probe.ok && role_verified && headless_boundary_safe {
        (
            "connected".to_string(),
            "canonical Service Node status attached through a read-only operator boundary"
                .to_string(),
        )
    } else if status.probe.ok {
        (
                "degraded".to_string(),
                "status responded, but Service Node role or headless-runtime boundaries were not fully verified"
                    .to_string(),
            )
    } else {
        (
                "unavailable".to_string(),
                "Service Node operator endpoint is unavailable; normal CrabLink use remains independent"
                    .to_string(),
            )
    };

    Ok(ServiceNodeOperatorStatus {
        schema: "crablink.service_node.operator_status.v1",
        enabled: true,
        configured: true,
        connection_mode: mode.as_str().to_string(),
        base_url,
        connection_state,
        reason,
        checked_at_ms: now_millis()?,

        credential_supplied: admin_token.is_some(),
        credential_persisted: false,
        authorization_mode: if admin_token.is_some() {
            "ephemeral_bearer_supplied".to_string()
        } else {
            "loopback_read_only".to_string()
        },

        health: health.probe,
        ready: ready.probe,
        status: status.probe,
        service_node,

        read_only: true,
        mutation_routes_exposed: false,
        client_required_by_daemon: false,
        daemon_started_by_client: false,
        policy_mutation: false,
        lifecycle_mutation: false,
        wallet_mutation: false,
        ledger_mutation: false,
        registry_mutation: false,
        quorum_mutation: false,
        finality_authority: false,
    })
}

struct RouteProbeResult {
    probe: OperatorProbe,
    body: Option<Vec<u8>>,
}

async fn probe_route(
    client: &reqwest::Client,
    base_url: &str,
    route: &'static str,
    timeout_ms: u64,
    admin_token: Option<&str>,
) -> RouteProbeResult {
    let url = format!("{base_url}{route}");
    let mut builder = client
        .get(url)
        .timeout(Duration::from_millis(timeout_ms))
        .header("accept", "application/json");

    if let Some(token) = admin_token {
        builder = builder.bearer_auth(token);
    }

    let response = match builder.send().await {
        Ok(response) => response,
        Err(_) => return failed_probe(route, "request_failed"),
    };

    let status = response.status().as_u16();
    let ok = (200..300).contains(&status);

    if response
        .content_length()
        .map(|length| length > MAX_OPERATOR_BODY_BYTES as u64)
        .unwrap_or(false)
    {
        return RouteProbeResult {
            probe: failed_http_probe(route, status, "response_too_large"),
            body: None,
        };
    }

    let mut response = response;
    let mut body = Vec::new();

    loop {
        let chunk = match response.chunk().await {
            Ok(chunk) => chunk,
            Err(_) => {
                return RouteProbeResult {
                    probe: failed_http_probe(route, status, "response_read_failed"),
                    body: None,
                };
            }
        };

        let Some(chunk) = chunk else {
            break;
        };

        if body.len().saturating_add(chunk.len()) > MAX_OPERATOR_BODY_BYTES {
            return RouteProbeResult {
                probe: failed_http_probe(route, status, "response_too_large"),
                body: None,
            };
        }

        body.extend_from_slice(&chunk);
    }

    RouteProbeResult {
        probe: OperatorProbe {
            route,
            ok,
            status: Some(status),
            error_code: if ok { None } else { Some("http_error") },
        },
        body: Some(body),
    }
}

fn failed_probe(route: &'static str, error_code: &'static str) -> RouteProbeResult {
    RouteProbeResult {
        probe: OperatorProbe {
            route,
            ok: false,
            status: None,
            error_code: Some(error_code),
        },
        body: None,
    }
}

fn failed_http_probe(route: &'static str, status: u16, error_code: &'static str) -> OperatorProbe {
    OperatorProbe {
        route,
        ok: false,
        status: Some(status),
        error_code: Some(error_code),
    }
}

fn disabled_status(
    mode: ConnectionMode,
    base_url: String,
) -> Result<ServiceNodeOperatorStatus, String> {
    Ok(ServiceNodeOperatorStatus {
        schema: "crablink.service_node.operator_status.v1",
        enabled: false,
        configured: false,
        connection_mode: mode.as_str().to_string(),
        base_url,
        connection_state: "disabled".to_string(),
        reason: "Service Node Operator Mode is disabled by default".to_string(),
        checked_at_ms: now_millis()?,

        credential_supplied: false,
        credential_persisted: false,
        authorization_mode: "disabled".to_string(),

        health: disabled_probe("/healthz"),
        ready: disabled_probe("/readyz"),
        status: disabled_probe("/api/v1/status"),
        service_node: None,

        read_only: true,
        mutation_routes_exposed: false,
        client_required_by_daemon: false,
        daemon_started_by_client: false,
        policy_mutation: false,
        lifecycle_mutation: false,
        wallet_mutation: false,
        ledger_mutation: false,
        registry_mutation: false,
        quorum_mutation: false,
        finality_authority: false,
    })
}

fn disabled_probe(route: &'static str) -> OperatorProbe {
    OperatorProbe {
        route,
        ok: false,
        status: None,
        error_code: Some("operator_mode_disabled"),
    }
}

fn normalize_service_node_base_url(mode: ConnectionMode, value: &str) -> Result<String, String> {
    let clean = value.trim().trim_end_matches('/');

    if clean.is_empty() {
        return Err("Service Node base URL is required".to_string());
    }

    if clean.len() > MAX_SERVICE_NODE_URL_BYTES {
        return Err("Service Node base URL is too long".to_string());
    }

    if clean.chars().any(char::is_control) {
        return Err("Service Node base URL must not contain control characters".to_string());
    }

    let parsed =
        Url::parse(clean).map_err(|_| "Service Node base URL must be a valid URL".to_string())?;

    if !parsed.username().is_empty() || parsed.password().is_some() {
        return Err("Service Node base URL must not contain credentials".to_string());
    }

    if parsed.query().is_some() || parsed.fragment().is_some() {
        return Err("Service Node base URL must not contain query or fragment".to_string());
    }

    if parsed.path() != "/" && !parsed.path().is_empty() {
        return Err("Service Node base URL must not contain a path".to_string());
    }

    let host = parsed
        .host_str()
        .ok_or_else(|| "Service Node base URL must include a host".to_string())?;
    let loopback = is_loopback_host(host);

    match mode {
        ConnectionMode::Local => {
            if !matches!(parsed.scheme(), "http" | "https") || !loopback {
                return Err(
                    "local Service Node connections require an explicit loopback HTTP or HTTPS URL"
                        .to_string(),
                );
            }
        }
        ConnectionMode::Remote => {
            if parsed.scheme() != "https" || loopback {
                return Err(
                    "remote Service Node connections require a non-loopback HTTPS URL".to_string(),
                );
            }
        }
    }

    Ok(clean.to_string())
}

fn is_loopback_host(host: &str) -> bool {
    host.eq_ignore_ascii_case("localhost")
        || host
            .parse::<IpAddr>()
            .map(|address| address.is_loopback())
            .unwrap_or(false)
}

fn normalize_admin_token(value: Option<&str>) -> Result<Option<String>, String> {
    let Some(raw) = value else {
        return Ok(None);
    };

    let clean = raw.trim();

    if clean.is_empty() {
        return Ok(None);
    }

    if clean.len() > MAX_ADMIN_TOKEN_BYTES {
        return Err("Service Node admin credential is too long".to_string());
    }

    if clean.chars().any(char::is_control) {
        return Err(
            "Service Node admin credential must not contain control characters".to_string(),
        );
    }

    Ok(Some(clean.to_string()))
}

fn project_service_node_status(document: NodeStatusDocument) -> CanonicalServiceNodeSummary {
    let confirmed_issuance_evidence = document
        .economic_pipeline
        .as_ref()
        .and_then(project_confirmed_issuance_evidence);

    let lifecycle_authority = match document.service_node_lifecycle.as_ref() {
        Some(lifecycle) => lifecycle
            .operator_projection_authorizes_state_change
            .unwrap_or(true),
        None => false,
    };
    let economic_authority = match document.economic_pipeline.as_ref() {
        Some(pipeline) => pipeline
            .operator_projection_authorizes_economic_mutation
            .unwrap_or(true),
        None => false,
    };

    CanonicalServiceNodeSummary {
        profile: nonempty_or_unknown(document.profile),
        node_role: nonempty_or_unknown(document.node_role),
        ready: document.ready,
        headless_mode: document.headless_mode,
        admin_ui_enabled: document.admin_ui_enabled,
        admin_ui_runtime_required: document.admin_ui_runtime_required,
        public_inbound_enabled: document.public_inbound_enabled,
        user_ip_publication: nonempty_or_unknown(document.user_ip_publication),

        policy_state: nonempty_or_unknown(document.policy.state),
        moderation_state: nonempty_or_unknown(document.policy.moderation_state),
        persistence_pending_review: document.persistence_review.pending_review,

        reward_binding_state: nonempty_or_unknown(document.reward_binding.state),
        reward_recipient_display_address: document.reward_binding.reward_recipient_display_address,
        pending_rotation_display_address: document.reward_binding.pending_rotation_display_address,

        lifecycle_state: document
            .service_node_lifecycle
            .as_ref()
            .map(|lifecycle| nonempty_or_unknown(lifecycle.lifecycle_state.clone()))
            .unwrap_or_else(|| "unknown".to_string()),
        quorum_status: document
            .service_node_lifecycle
            .as_ref()
            .map(|lifecycle| nonempty_or_unknown(lifecycle.quorum_status.clone()))
            .unwrap_or_else(|| "unknown".to_string()),
        counts_toward_quorum: document
            .service_node_lifecycle
            .as_ref()
            .map(|lifecycle| lifecycle.counts_toward_quorum)
            .unwrap_or(false),

        ledger_receipt_reported: document
            .economic_pipeline
            .as_ref()
            .map(|pipeline| pipeline.ledger_receipt_reported)
            .unwrap_or(false),
        confirmed_roc_reported: document
            .economic_pipeline
            .as_ref()
            .map(|pipeline| pipeline.confirmed_roc_reported)
            .unwrap_or(false),
        confirmed_issuance_evidence,
        external_finality_reported: document
            .economic_pipeline
            .as_ref()
            .map(|pipeline| pipeline.finality_reported)
            .unwrap_or(false),

        operator_projection_authorizes_state_change: lifecycle_authority,
        operator_projection_authorizes_economic_mutation: economic_authority,
    }
}

fn project_confirmed_issuance_evidence(
    pipeline: &EconomicPipelineDocument,
) -> Option<ConfirmedIssuanceEvidence> {
    if !pipeline.ledger_receipt_reported || !pipeline.confirmed_roc_reported {
        return None;
    }

    let receipts = pipeline.epoch_payout_receipts.as_ref()?;

    if receipts.settlement_status != "accepted" {
        return None;
    }

    if receipts.receipt_count == 0
        || receipts.total_issued_minor.is_empty()
        || receipts.ledger_root.is_empty()
    {
        return None;
    }

    Some(ConfirmedIssuanceEvidence {
        receipt_count: receipts.receipt_count,
        total_issued_minor: receipts.total_issued_minor.clone(),
        ledger_root: receipts.ledger_root.clone(),
        settlement_status: receipts.settlement_status.clone(),
        finality_status: if receipts.finality_status.is_empty() {
            "not_reported".to_string()
        } else {
            receipts.finality_status.clone()
        },
    })
}

fn nonempty_or_unknown(value: String) -> String {
    if value.trim().is_empty() {
        "unknown".to_string()
    } else {
        value
    }
}

fn now_millis() -> Result<u64, String> {
    let duration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|_| "system clock is before UNIX_EPOCH".to_string())?;

    Ok(duration.as_millis().min(u128::from(u64::MAX)) as u64)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn local_and_remote_urls_have_distinct_security_postures() {
        assert!(
            normalize_service_node_base_url(ConnectionMode::Local, "http://127.0.0.1:8080").is_ok()
        );
        assert!(
            normalize_service_node_base_url(ConnectionMode::Local, "https://localhost:8443/")
                .is_ok()
        );
        assert!(normalize_service_node_base_url(
            ConnectionMode::Remote,
            "https://node.example.test"
        )
        .is_ok());

        assert!(
            normalize_service_node_base_url(ConnectionMode::Local, "http://0.0.0.0:8080").is_err()
        );
        assert!(normalize_service_node_base_url(
            ConnectionMode::Remote,
            "http://node.example.test"
        )
        .is_err());
        assert!(
            normalize_service_node_base_url(ConnectionMode::Remote, "https://127.0.0.1:8443")
                .is_err()
        );
        assert!(normalize_service_node_base_url(
            ConnectionMode::Remote,
            "https://operator:secret@node.example.test"
        )
        .is_err());
        assert!(normalize_service_node_base_url(
            ConnectionMode::Remote,
            "https://node.example.test/admin"
        )
        .is_err());
    }

    #[test]
    fn admin_credentials_are_ephemeral_and_control_characters_are_rejected() {
        assert_eq!(
            normalize_admin_token(Some("  token-value  ")).expect("valid token"),
            Some("token-value".to_string())
        );
        assert_eq!(
            normalize_admin_token(Some("   ")).expect("blank token"),
            None
        );
        assert!(normalize_admin_token(Some("token\nvalue")).is_err());
    }

    #[test]
    fn disabled_operator_mode_has_no_daemon_or_economic_authority() {
        let status = disabled_status(ConnectionMode::Local, "http://127.0.0.1:8080".to_string())
            .expect("disabled status");

        assert!(!status.enabled);
        assert_eq!(status.connection_state, "disabled");
        assert!(status.read_only);
        assert!(!status.mutation_routes_exposed);
        assert!(!status.client_required_by_daemon);
        assert!(!status.daemon_started_by_client);
        assert!(!status.policy_mutation);
        assert!(!status.lifecycle_mutation);
        assert!(!status.wallet_mutation);
        assert!(!status.ledger_mutation);
        assert!(!status.registry_mutation);
        assert!(!status.quorum_mutation);
        assert!(!status.finality_authority);
        assert!(status.service_node.is_none());
    }

    #[test]
    fn pending_reward_material_never_becomes_confirmed_issuance_evidence() {
        let document: NodeStatusDocument = serde_json::from_value(json!({
            "profile": "macronode",
            "node_role": "service_node",
            "ready": true,
            "headless_mode": true,
            "admin_ui_runtime_required": false,
            "economic_pipeline": {
                "ledger_receipt_reported": false,
                "confirmed_roc_reported": false,
                "finality_reported": false,
                "epoch_payout_receipts": {
                    "receipt_count": 2,
                    "total_issued_minor": "100",
                    "ledger_root": "b3:pending",
                    "settlement_status": "accepted",
                    "finality_status": "not_reported"
                },
                "operator_projection_authorizes_economic_mutation": false
            },
            "service_node_lifecycle": {
                "operator_projection_authorizes_state_change": false
            }
        }))
        .expect("status fixture");

        let summary = project_service_node_status(document);

        assert!(!summary.ledger_receipt_reported);
        assert!(!summary.confirmed_roc_reported);
        assert!(summary.confirmed_issuance_evidence.is_none());
        assert!(!summary.external_finality_reported);
    }

    #[test]
    fn accepted_wallet_ledger_receipts_are_projected_without_external_finality() {
        let document: NodeStatusDocument = serde_json::from_value(json!({
            "profile": "macronode",
            "nodeRole": "service_node",
            "ready": true,
            "headlessMode": true,
            "adminUiRuntimeRequired": false,
            "economicPipeline": {
                "ledgerReceiptReported": true,
                "confirmedRocReported": true,
                "finalityReported": false,
                "epochPayoutReceipts": {
                    "receiptCount": 3,
                    "totalIssuedMinor": "250",
                    "ledgerRoot": "b3:ledger-root",
                    "settlementStatus": "accepted",
                    "finalityStatus": "not_reported"
                },
                "operatorProjectionAuthorizesEconomicMutation": false
            },
            "serviceNodeLifecycle": {
                "operatorProjectionAuthorizesStateChange": false
            }
        }))
        .expect("status fixture");

        let summary = project_service_node_status(document);

        assert!(summary.ledger_receipt_reported);
        assert!(summary.confirmed_roc_reported);
        assert_eq!(
            summary.confirmed_issuance_evidence,
            Some(ConfirmedIssuanceEvidence {
                receipt_count: 3,
                total_issued_minor: "250".to_string(),
                ledger_root: "b3:ledger-root".to_string(),
                settlement_status: "accepted".to_string(),
                finality_status: "not_reported".to_string(),
            })
        );
        assert!(!summary.external_finality_reported);
        assert!(!summary.operator_projection_authorizes_state_change);
        assert!(!summary.operator_projection_authorizes_economic_mutation);
    }

    #[test]
    fn absent_projections_do_not_create_authority() {
        let document: NodeStatusDocument = serde_json::from_value(json!({
            "profile": "macronode",
            "node_role": "service_node"
        }))
        .expect("status fixture");

        let summary = project_service_node_status(document);

        assert!(!summary.operator_projection_authorizes_state_change);
        assert!(!summary.operator_projection_authorizes_economic_mutation);
        assert!(summary.confirmed_issuance_evidence.is_none());
    }
}
