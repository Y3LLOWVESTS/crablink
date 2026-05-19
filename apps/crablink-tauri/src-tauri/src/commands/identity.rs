//! RO:WHAT — Gateway-backed identity display commands for CrabLink Tauri.
//! RO:WHY — Lets Tauri Rust attach configured passport/wallet headers without browser-origin limits.
//! RO:INTERACTS — svc-gateway /identity/me, React identity client.
//! RO:INVARIANTS — identity is backend/header-derived; no fake passport truth; no local custody here.
//! RO:SECURITY — validates labels, redacts transport errors, and returns backend DTOs only.

use crate::state::AppState;
use serde_json::Value;
use std::time::Duration;
use tauri::State;

fn normalize_base_url(value: &str) -> String {
    value.trim().trim_end_matches('/').to_string()
}

fn validate_optional_label(label: &str, field: &str) -> Result<String, String> {
    let clean = label.trim();

    if clean.len() > 256 {
        return Err(format!("{field} is too long"));
    }

    if clean.contains('\n') || clean.contains('\r') {
        return Err(format!("{field} must not contain newlines"));
    }

    Ok(clean.to_string())
}

#[tauri::command]
pub async fn identity_me_gateway(
    state: State<'_, AppState>,
    passport_subject: Option<String>,
    wallet_account: Option<String>,
) -> Result<Value, String> {
    let (base_url, timeout_ms, default_passport, default_wallet) = {
        let settings = state
            .settings
            .lock()
            .map_err(|_| "settings lock poisoned".to_string())?;

        (
            normalize_base_url(&settings.gateway_url),
            settings.request_timeout_ms.min(30_000),
            settings.passport_label.clone(),
            settings.wallet_account.clone(),
        )
    };

    let passport = validate_optional_label(
        passport_subject.as_deref().unwrap_or(default_passport.as_str()),
        "passport_subject",
    )?;
    let wallet = validate_optional_label(
        wallet_account.as_deref().unwrap_or(default_wallet.as_str()),
        "wallet_account",
    )?;

    let url = format!("{base_url}/identity/me");

    let mut request = state
        .http
        .get(url)
        .timeout(Duration::from_millis(timeout_ms));

    if !passport.is_empty() {
        request = request.header("x-ron-passport", passport);
    }

    if !wallet.is_empty() {
        request = request.header("x-ron-wallet-account", wallet);
    }

    let response = request
        .send()
        .await
        .map_err(|err| format!("identity gateway request failed: {}", err))?;

    let status = response.status();
    let body = response
        .text()
        .await
        .map_err(|err| format!("identity response read failed: {}", err))?;

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
            .unwrap_or("identity gateway request failed");

        return Err(format!("{}: HTTP {}", message, status.as_u16()));
    }

    Ok(parsed)
}