//! RO:WHAT — Gateway crab:// resolver command.
//! RO:WHY — Preserves proven route behavior before OAP/native-cache work.
//! RO:INTERACTS — svc-gateway /crab/resolve?url=...
//! RO:INVARIANTS — crab:// input is untrusted; no direct storage/index/omnigate calls.
//! RO:SECURITY — shared ingress validation plus bounded response preview; no route authority.

use crate::state::AppState;
use crablink_native_core::crab_url::normalize_crab_url_for_gateway;
use serde::Serialize;
use std::time::Duration;
use tauri::State;

#[derive(Debug, Serialize)]
pub struct ResolveProbe {
    pub schema: &'static str,
    pub route: &'static str,
    pub crab_url: String,
    pub request_url: String,
    pub ok: bool,
    pub status: u16,
    pub body_preview: String,
}

fn preview(input: &str) -> String {
    input.chars().take(2048).collect()
}

fn normalize_base_url(value: &str) -> String {
    value.trim().trim_end_matches('/').to_string()
}

#[tauri::command]
pub async fn resolve_crab_url_gateway(
    state: State<'_, AppState>,
    crab_url: String,
) -> Result<ResolveProbe, String> {
    let crab_url = normalize_crab_url_for_gateway(&crab_url)?;

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

    let request_url = format!(
        "{base_url}/crab/resolve?url={}",
        urlencoding::encode(&crab_url)
    );

    let client = state.http.clone();

    let response = client
        .get(&request_url)
        .timeout(Duration::from_millis(timeout_ms))
        .send()
        .await
        .map_err(|err| format!("gateway resolve request failed: {}", err))?;

    let status = response.status().as_u16();
    let body = response.text().await.unwrap_or_default();

    Ok(ResolveProbe {
        schema: "crablink.gateway.resolve.v1",
        route: "/crab/resolve",
        crab_url,
        request_url,
        ok: (200..300).contains(&status),
        status,
        body_preview: preview(&body),
    })
}
