//! RO:WHAT — Local user-node attachment/controller commands for CrabLink Tauri.
//! RO:WHY  — Phase 6C gives CrabLink a safe lifecycle/status boundary for an
//!           optional local micronode without silently spawning services.
//! RO:INVARIANTS —
//!   - Disabled by default.
//!   - Loopback-only local node URL.
//!   - Status can probe an already-running micronode.
//!   - Start/stop/restart are parked until a real sidecar supervisor exists.
//!   - No wallet mutation, ledger mutation, receipt finality, or confirmed ROC claim.
//!
//! RO:SECURITY — No shell execution, arbitrary binary path, direct ledger call, wallet authority, public bind, or deep-link startup.

use crate::state::AppState;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::State;

const DEFAULT_LOCAL_NODE_URL: &str = "http://127.0.0.1:5310";
const MAX_LOCAL_NODE_BODY_BYTES: usize = 128 * 1024;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalNodeRequest {
    pub enabled: Option<bool>,
    pub base_url: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalNodeProbe {
    pub route: String,
    pub ok: bool,
    pub status: u16,
    pub body_preview: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalNodeStatus {
    pub schema: &'static str,
    pub enabled: bool,
    pub configured: bool,
    pub mode: String,
    pub base_url: String,
    pub lifecycle_state: String,
    pub reason: String,
    pub checked_at_ms: u64,

    pub supervisor_enabled: bool,
    pub sidecar_enabled: bool,
    pub start_supported: bool,
    pub stop_supported: bool,
    pub restart_supported: bool,
    pub action: String,
    pub action_accepted: bool,

    pub health: Option<LocalNodeProbe>,
    pub ready: Option<LocalNodeProbe>,
    pub node_status: Option<Value>,

    pub privacy_mode: bool,
    pub public_inbound_enabled: bool,
    pub peer_ip_display: String,
    pub verification_enabled: bool,
    pub economic_replay_enabled: bool,
    pub verification_queue_status: String,
    pub economic_replay_worker_status: String,
    pub pending_evidence_items: u64,

    pub confirmed_roc_minor_units: Option<String>,
    pub confirmed_roc_source: String,
    pub wallet_mutation: bool,
    pub ledger_mutation: bool,
    pub wallet_execution_participant: bool,
    pub ledger_replay_enabled: bool,
    pub content_serving_enabled: bool,
}

#[tauri::command]
pub async fn local_node_status(
    state: State<'_, AppState>,
    request: Option<LocalNodeRequest>,
) -> Result<LocalNodeStatus, String> {
    let timeout_ms = {
        let settings = state
            .settings
            .lock()
            .map_err(|_| "settings lock poisoned".to_string())?;

        settings.request_timeout_ms
    };

    query_local_node_status(state.http.clone(), timeout_ms, request).await
}

/// Execute the production local User Node status boundary without a Tauri
/// runtime.
///
/// Phase 22 uses this helper to prove that CrabLink observes an independently
/// managed micronode. The helper can neither start nor stop the daemon and
/// never reports pending evidence as confirmed ROC.
pub async fn query_local_node_status(
    client: reqwest::Client,
    timeout_ms: u64,
    request: Option<LocalNodeRequest>,
) -> Result<LocalNodeStatus, String> {
    let request = request.unwrap_or(LocalNodeRequest {
        enabled: None,
        base_url: None,
    });

    let enabled = request.enabled.unwrap_or(false);

    let base_url = normalize_local_node_base_url(
        request
            .base_url
            .as_deref()
            .unwrap_or(DEFAULT_LOCAL_NODE_URL),
    )?;

    if !enabled {
        return disabled_status(base_url, "status", "local node disabled by settings");
    }

    let timeout_ms = timeout_ms.clamp(1, 30_000);

    let health = probe_local_node_route(&client, &base_url, "/healthz", timeout_ms).await;

    let ready = probe_local_node_route(&client, &base_url, "/readyz", timeout_ms).await;

    let status_probe =
        probe_local_node_route(&client, &base_url, "/api/v1/status", timeout_ms).await;

    let health_probe = probe_result_to_option(&health);

    let ready_probe = probe_result_to_option(&ready);

    let status_json = match status_probe {
        Ok((_probe, body)) => serde_json::from_str::<Value>(&body).ok(),
        Err(_) => None,
    };

    let mut status = disabled_status(base_url, "status", "local node status checked")?;

    status.enabled = true;
    status.configured = true;
    status.mode = "user_managed_micronode".to_string();

    status.health = health_probe;
    status.ready = ready_probe;
    status.node_status = status_json.clone();

    apply_node_status_truth(&mut status, status_json.as_ref());

    let health_ok = status
        .health
        .as_ref()
        .map(|probe| probe.ok)
        .unwrap_or(false);

    let node_status_ok = status.node_status.is_some();

    let privacy_ok = status.privacy_mode
        && !status.public_inbound_enabled
        && status.peer_ip_display == "forbidden"
        && !status.wallet_mutation
        && !status.ledger_mutation
        && status.confirmed_roc_minor_units.is_none();

    if health_ok && node_status_ok && privacy_ok {
        status.lifecycle_state = "active".to_string();

        status.reason = "local micronode attached and reporting safe user-node posture".to_string();
    } else if node_status_ok {
        status.lifecycle_state = "degraded".to_string();

        status.reason =
            "local node responded but posture is degraded or not fully private".to_string();
    } else {
        status.lifecycle_state = "degraded".to_string();

        status.reason = "local node enabled but status endpoint is unavailable".to_string();
    }

    Ok(status)
}

#[tauri::command]
pub async fn local_node_start(
    state: State<'_, AppState>,
    request: Option<LocalNodeRequest>,
) -> Result<LocalNodeStatus, String> {
    parked_action_status(state, request, "start").await
}

#[tauri::command]
pub async fn local_node_stop(
    state: State<'_, AppState>,
    request: Option<LocalNodeRequest>,
) -> Result<LocalNodeStatus, String> {
    parked_action_status(state, request, "stop").await
}

#[tauri::command]
pub async fn local_node_restart(
    state: State<'_, AppState>,
    request: Option<LocalNodeRequest>,
) -> Result<LocalNodeStatus, String> {
    parked_action_status(state, request, "restart").await
}

async fn parked_action_status(
    _state: State<'_, AppState>,
    request: Option<LocalNodeRequest>,
    action: &'static str,
) -> Result<LocalNodeStatus, String> {
    let request = request.unwrap_or(LocalNodeRequest {
        enabled: None,
        base_url: None,
    });
    let enabled = request.enabled.unwrap_or(false);
    let base_url = normalize_local_node_base_url(
        request
            .base_url
            .as_deref()
            .unwrap_or(DEFAULT_LOCAL_NODE_URL),
    )?;

    let mut status = disabled_status(base_url, action, "local node supervisor is parked")?;
    status.enabled = enabled;
    status.configured = enabled;
    status.mode = if enabled {
        "user_managed_micronode".to_string()
    } else {
        "disabled".to_string()
    };
    status.lifecycle_state = if enabled {
        "blocked".to_string()
    } else {
        "disabled".to_string()
    };
    status.reason = if enabled {
        format!(
            "local node {action} is blocked because CrabLink sidecar supervision is not implemented yet; attach an externally managed loopback micronode for status"
        )
    } else {
        format!("local node {action} ignored because local node mode is disabled")
    };
    status.action_accepted = false;

    Ok(status)
}

async fn probe_local_node_route(
    client: &reqwest::Client,
    base_url: &str,
    route: &str,
    timeout_ms: u64,
) -> Result<(LocalNodeProbe, String), String> {
    let url = format!("{base_url}{route}");
    let response = client
        .get(&url)
        .timeout(Duration::from_millis(timeout_ms))
        .send()
        .await
        .map_err(|err| format!("local node probe failed for {route}: {err}"))?;

    let status = response.status().as_u16();
    let ok = (200..300).contains(&status);
    let body = response.text().await.unwrap_or_default();
    let bounded_body = body
        .chars()
        .take(MAX_LOCAL_NODE_BODY_BYTES)
        .collect::<String>();

    Ok((
        LocalNodeProbe {
            route: route.to_string(),
            ok,
            status,
            body_preview: preview(&bounded_body),
        },
        bounded_body,
    ))
}

fn probe_result_to_option(
    result: &Result<(LocalNodeProbe, String), String>,
) -> Option<LocalNodeProbe> {
    result.as_ref().ok().map(|(probe, _body)| probe.clone())
}

fn disabled_status(
    base_url: String,
    action: &str,
    reason: &str,
) -> Result<LocalNodeStatus, String> {
    Ok(LocalNodeStatus {
        schema: "crablink.local_node.status.v1",
        enabled: false,
        configured: false,
        mode: "disabled".to_string(),
        base_url,
        lifecycle_state: "disabled".to_string(),
        reason: reason.to_string(),
        checked_at_ms: now_millis()?,

        supervisor_enabled: false,
        sidecar_enabled: false,
        start_supported: false,
        stop_supported: false,
        restart_supported: false,
        action: action.to_string(),
        action_accepted: false,

        health: None,
        ready: None,
        node_status: None,

        privacy_mode: true,
        public_inbound_enabled: false,
        peer_ip_display: "forbidden".to_string(),
        verification_enabled: false,
        economic_replay_enabled: false,
        verification_queue_status: "disabled".to_string(),
        economic_replay_worker_status: "disabled".to_string(),
        pending_evidence_items: 0,

        confirmed_roc_minor_units: None,
        confirmed_roc_source: "wallet_ledger_receipt_only".to_string(),
        wallet_mutation: false,
        ledger_mutation: false,
        wallet_execution_participant: false,
        ledger_replay_enabled: false,
        content_serving_enabled: false,
    })
}

fn apply_node_status_truth(status: &mut LocalNodeStatus, node_status: Option<&Value>) {
    let Some(value) = node_status else {
        return;
    };

    status.privacy_mode = json_get_bool(value, &["privacy_mode"]).unwrap_or(false);
    status.public_inbound_enabled =
        json_get_bool(value, &["public_inbound_enabled"]).unwrap_or(true);
    status.peer_ip_display =
        json_get_string(value, &["peer_ip_display"]).unwrap_or_else(|| "unknown".to_string());
    status.verification_enabled = json_get_bool(value, &["verification_enabled"]).unwrap_or(false);
    status.economic_replay_enabled =
        json_get_bool(value, &["economic_replay_enabled"]).unwrap_or(false);
    status.wallet_execution_participant =
        json_get_bool(value, &["wallet_execution_participant"]).unwrap_or(true);
    status.ledger_replay_enabled = json_get_bool(value, &["ledger_replay_enabled"]).unwrap_or(true);
    status.content_serving_enabled =
        json_get_bool(value, &["content_serving_enabled"]).unwrap_or(true);

    status.verification_queue_status =
        json_get_string(value, &["passive_runtime", "verification_queue", "status"])
            .unwrap_or_else(|| "unknown".to_string());

    status.economic_replay_worker_status = json_get_string(
        value,
        &["passive_runtime", "economic_replay_worker", "status"],
    )
    .unwrap_or_else(|| "unknown".to_string());

    status.pending_evidence_items = json_get_u64(
        value,
        &["passive_runtime", "verification_queue", "pending_items"],
    )
    .unwrap_or(0);

    status.confirmed_roc_minor_units =
        json_get_string(value, &["passive_runtime", "confirmed_roc_minor_units"]);
    status.confirmed_roc_source =
        json_get_string(value, &["passive_runtime", "confirmed_roc_source"])
            .unwrap_or_else(|| "wallet_ledger_receipt_only".to_string());

    status.wallet_mutation =
        json_get_bool(value, &["passive_runtime", "wallet_mutation"]).unwrap_or(true);
    status.ledger_mutation =
        json_get_bool(value, &["passive_runtime", "ledger_mutation"]).unwrap_or(true);
}

fn json_get<'a>(value: &'a Value, path: &[&str]) -> Option<&'a Value> {
    let mut cursor = value;
    for key in path {
        cursor = cursor.get(*key)?;
    }
    Some(cursor)
}

fn json_get_bool(value: &Value, path: &[&str]) -> Option<bool> {
    json_get(value, path)?.as_bool()
}

fn json_get_u64(value: &Value, path: &[&str]) -> Option<u64> {
    json_get(value, path)?.as_u64()
}

fn json_get_string(value: &Value, path: &[&str]) -> Option<String> {
    json_get(value, path)?.as_str().map(ToString::to_string)
}

fn normalize_local_node_base_url(value: &str) -> Result<String, String> {
    let clean = value.trim().trim_end_matches('/').to_string();

    if clean.is_empty() {
        return Err("local node URL is required".to_string());
    }

    if clean.contains('\n') || clean.contains('\r') || clean.contains('\t') {
        return Err("local node URL must not contain control characters".to_string());
    }

    if !(clean.starts_with("http://127.0.0.1:")
        || clean.starts_with("http://localhost:")
        || clean.starts_with("http://[::1]:"))
    {
        return Err("local node URL must be an explicit loopback http URL".to_string());
    }

    if clean.contains('@') || clean.contains('?') || clean.contains('#') {
        return Err("local node URL must not contain credentials, query, or fragment".to_string());
    }

    Ok(clean)
}

fn preview(input: &str) -> String {
    input.chars().take(512).collect()
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

    #[test]
    fn local_node_url_must_be_loopback_http() {
        assert!(normalize_local_node_base_url("http://127.0.0.1:5310").is_ok());
        assert!(normalize_local_node_base_url("http://localhost:5310").is_ok());
        assert!(normalize_local_node_base_url("http://[::1]:5310").is_ok());

        assert!(normalize_local_node_base_url("http://0.0.0.0:5310").is_err());
        assert!(normalize_local_node_base_url("https://127.0.0.1:5310").is_err());
        assert!(normalize_local_node_base_url("http://example.com:5310").is_err());
        assert!(normalize_local_node_base_url("http://127.0.0.1:5310?token=secret").is_err());
    }

    #[test]
    fn disabled_status_never_claims_wallet_or_ledger_truth() {
        let status = disabled_status(
            "http://127.0.0.1:5310".to_string(),
            "status",
            "disabled for test",
        )
        .expect("disabled status");

        assert!(!status.enabled);
        assert!(!status.supervisor_enabled);
        assert!(!status.sidecar_enabled);
        assert!(!status.wallet_mutation);
        assert!(!status.ledger_mutation);
        assert!(!status.wallet_execution_participant);
        assert!(!status.ledger_replay_enabled);
        assert!(status.confirmed_roc_minor_units.is_none());
        assert_eq!(status.confirmed_roc_source, "wallet_ledger_receipt_only");
        assert_eq!(status.peer_ip_display, "forbidden");
        assert!(!status.public_inbound_enabled);
    }
}
