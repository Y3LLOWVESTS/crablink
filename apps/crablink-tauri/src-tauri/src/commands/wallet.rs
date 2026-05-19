//! RO:WHAT — Gateway-backed wallet display commands for CrabLink Tauri.
//! RO:WHY — Lets Tauri Rust mediate wallet display requests instead of browser/WebView fetch.
//! RO:INTERACTS — svc-gateway /wallet/:account/balance, React wallet client.
//! RO:INVARIANTS — display-only; no fake balances; no direct ledger mutation; no silent spend.
//! RO:SECURITY — validates account input, redacts transport errors, and returns backend DTOs only.

use crate::state::AppState;
use serde_json::Value;
use std::time::Duration;
use tauri::State;

fn normalize_base_url(value: &str) -> String {
    value.trim().trim_end_matches('/').to_string()
}

fn validate_account(value: &str) -> Result<String, String> {
    let clean = value.trim();

    if clean.is_empty() {
        return Err("wallet account is required".to_string());
    }

    if clean.len() > 128 {
        return Err("wallet account is too long".to_string());
    }

    if clean.contains('\n') || clean.contains('\r') {
        return Err("wallet account must not contain newlines".to_string());
    }

    Ok(clean.to_string())
}

#[tauri::command]
pub async fn wallet_balance_gateway(
    state: State<'_, AppState>,
    account: String,
) -> Result<Value, String> {
    let account = validate_account(&account)?;

    let (base_url, timeout_ms, passport_label) = {
        let settings = state
            .settings
            .lock()
            .map_err(|_| "settings lock poisoned".to_string())?;

        (
            normalize_base_url(&settings.gateway_url),
            settings.request_timeout_ms.min(30_000),
            settings.passport_label.clone(),
        )
    };

    let url = format!("{base_url}/wallet/{}/balance", urlencoding::encode(&account));

    let mut request = state
        .http
        .get(url)
        .timeout(Duration::from_millis(timeout_ms))
        .header("x-ron-wallet-account", account.clone());

    if !passport_label.trim().is_empty() {
        request = request.header("x-ron-passport", passport_label.trim());
    }

    let response = request
        .send()
        .await
        .map_err(|err| format!("wallet balance gateway request failed: {}", err))?;

    let status = response.status();
    let body = response
        .text()
        .await
        .map_err(|err| format!("wallet balance response read failed: {}", err))?;

    let parsed: Value = serde_json::from_str(&body).unwrap_or_else(|_| {
        serde_json::json!({
            "schema": "crablink.gateway.text_response.v1",
            "body": body
        })
    });

    if !status.is_success() {
        let message = parsed
            .get("message")
            .or_else(|| parsed.get("error"))
            .or_else(|| parsed.get("reason"))
            .and_then(|value| value.as_str())
            .unwrap_or("wallet balance gateway request failed");

        return Err(format!("{}: HTTP {}", message, status.as_u16()));
    }

    Ok(parsed)
}