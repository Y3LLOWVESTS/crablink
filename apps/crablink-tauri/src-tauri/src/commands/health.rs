//! RO:WHAT — Gateway health/readiness probe commands.
//! RO:WHY — Verifies gateway-first runtime from the native app without WebView/CORS limitations.
//! RO:INTERACTS — svc-gateway /healthz and /readyz.
//! RO:INVARIANTS — no lock across await; no direct internal service calls.
//! RO:SECURITY — body is truncated for display; command returns typed, redacted probe data.

use crate::state::AppState;
use serde::Serialize;
use std::time::Duration;
use tauri::State;

#[derive(Debug, Serialize)]
pub struct GatewayProbe {
    pub schema: &'static str,
    pub route: &'static str,
    pub url: String,
    pub ok: bool,
    pub status: u16,
    pub body_preview: String,
}

fn preview(input: &str) -> String {
    input.chars().take(512).collect()
}

fn normalize_base_url(value: &str) -> String {
    value.trim().trim_end_matches('/').to_string()
}

async fn probe_gateway_route(
    state: State<'_, AppState>,
    route: &'static str,
) -> Result<GatewayProbe, String> {
    let (base_url, timeout_ms) = {
        let settings = state
            .settings
            .lock()
            .map_err(|_| "settings lock poisoned".to_string())?;

        (
            normalize_base_url(&settings.gateway_url),
            settings.request_timeout_ms.min(30_000),
        )
    };

    let url = format!("{base_url}{route}");
    let client = state.http.clone();

    let response = client
        .get(&url)
        .timeout(Duration::from_millis(timeout_ms))
        .send()
        .await
        .map_err(|err| format!("gateway probe request failed for {route}: {}", err))?;

    let status = response.status().as_u16();
    let body = response.text().await.unwrap_or_default();

    Ok(GatewayProbe {
        schema: "crablink.gateway.probe.v1",
        route,
        url,
        ok: (200..300).contains(&status),
        status,
        body_preview: preview(&body),
    })
}

#[tauri::command]
pub async fn health_check_gateway(state: State<'_, AppState>) -> Result<GatewayProbe, String> {
    probe_gateway_route(state, "/healthz").await
}

#[tauri::command]
pub async fn ready_check_gateway(state: State<'_, AppState>) -> Result<GatewayProbe, String> {
    probe_gateway_route(state, "/readyz").await
}
