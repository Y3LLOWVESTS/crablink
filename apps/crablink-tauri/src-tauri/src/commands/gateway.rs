//! RO:WHAT — Allowlisted svc-gateway request bridge for CrabLink Tauri.
//! RO:WHY — Lets copied React product clients call public gateway routes without WebView/CORS limitations.
//! RO:INTERACTS — GatewayClient.request(), svc-gateway public product routes.
//! RO:INVARIANTS — gateway-first; no direct internal services; no fake balances/receipts; no silent spend.
//! RO:SECURITY — allowlisted public routes only; bounded body/response; redacted errors; no arbitrary URL fetch.

use crate::state::AppState;
use reqwest::header::{HeaderName, HeaderValue};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::time::Duration;
use tauri::State;

const MAX_ROUTE_BYTES: usize = 4096;
const MAX_BODY_TEXT_BYTES: usize = 2 * 1024 * 1024;
const MAX_RESPONSE_TEXT_BYTES: usize = 4 * 1024 * 1024;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GatewayRequest {
    pub method: String,
    pub path: String,
    pub headers: Option<HashMap<String, String>>,
    pub body: Option<Value>,
    pub body_text: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct GatewayResponse {
    pub schema: &'static str,
    pub method: String,
    pub route: String,
    pub status: u16,
    pub ok: bool,
    pub correlation_id: String,
    pub content_type: String,
    pub data: Value,
}

fn normalize_base_url(value: &str) -> String {
    value.trim().trim_end_matches('/').to_string()
}

fn normalize_method(value: &str) -> Result<String, String> {
    let method = value.trim().to_uppercase();

    match method.as_str() {
        "GET" | "POST" | "PUT" => Ok(method),
        _ => Err("gateway command only allows GET, POST, or PUT".to_string()),
    }
}

fn normalize_route(value: &str) -> Result<String, String> {
    let route = value.trim();

    if route.is_empty() {
        return Err("gateway route is required".to_string());
    }

    if route.len() > MAX_ROUTE_BYTES {
        return Err("gateway route is too long".to_string());
    }

    if !route.starts_with('/') {
        return Err("gateway route must start with /".to_string());
    }

    if route.contains('\n') || route.contains('\r') {
        return Err("gateway route must not contain newlines".to_string());
    }

    if route.contains("://") {
        return Err("gateway route must be relative, not an absolute URL".to_string());
    }

    Ok(route.to_string())
}

fn path_only(route: &str) -> &str {
    route.split('?').next().unwrap_or(route)
}

fn is_allowed_gateway_route(method: &str, route: &str) -> bool {
    let path = path_only(route);

    match method {
        "GET" => {
            path == "/healthz"
                || path == "/readyz"
                || path == "/version"
                || path == "/identity/me"
                || path.starts_with("/identity/passport/profile/")
                || path == "/crab/resolve"
                || path.starts_with("/b3/")
                || path.starts_with("/o/")
                || path.starts_with("/sites/")
                || path.starts_with("/assets/")
                || path.starts_with("/content/")
                || path.starts_with("/streams/")
                || path == "/chat/resolve"
                || path.starts_with("/chat/")
                || is_wallet_balance_path(path)
        }
        "POST" => {
            path == "/wallet/hold"
                || path == "/sites"
                || path == "/sites/prepare"
                || path == "/paid/o"
                || path == "/o"
                || path.starts_with("/assets/")
                || path.starts_with("/content/")
                || path.starts_with("/streams/")
                || path.starts_with("/identity/passport/")
                || path.starts_with("/sites/")
                || path == "/chat"
                || path == "/chat/prepare"
                || path.starts_with("/chat/")
        }
        "PUT" => path == "/o" || path.starts_with("/o/") || path == "/paid/o",
        _ => false,
    }
}

fn is_wallet_balance_path(path: &str) -> bool {
    path.starts_with("/wallet/") && path.ends_with("/balance")
}

fn sanitize_header_name(value: &str) -> Option<HeaderName> {
    let clean = value.trim();

    if clean.is_empty() {
        return None;
    }

    let lower = clean.to_ascii_lowercase();

    if matches!(
        lower.as_str(),
        "host"
            | "connection"
            | "content-length"
            | "transfer-encoding"
            | "upgrade"
            | "proxy-authorization"
            | "proxy-authenticate"
    ) {
        return None;
    }

    HeaderName::from_bytes(clean.as_bytes()).ok()
}

fn sanitize_header_value(value: &str) -> Option<HeaderValue> {
    let clean = value
        .replace("\r\n", " ")
        .replace('\r', " ")
        .replace('\n', " ")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ");

    if clean.is_empty() {
        return None;
    }

    HeaderValue::from_str(&clean).ok()
}

fn normalize_correlation_id(headers: &HashMap<String, String>) -> String {
    header_value(headers, "x-correlation-id")
        .unwrap_or_else(|| "crablink-tauri-gateway-command".to_string())
}

fn header_value(headers: &HashMap<String, String>, name: &str) -> Option<String> {
    headers
        .iter()
        .find(|(key, _)| key.eq_ignore_ascii_case(name))
        .map(|(_, value)| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

fn effective_default_header<'a>(
    request_headers: &'a HashMap<String, String>,
    name: &str,
    default_value: &'a str,
) -> Option<String> {
    header_value(request_headers, name).or_else(|| {
        let clean = default_value.trim();

        if clean.is_empty() {
            None
        } else {
            Some(clean.to_string())
        }
    })
}

fn parse_response_body(text: &str) -> Value {
    let clean = text.trim();

    if clean.is_empty() {
        return Value::Null;
    }

    serde_json::from_str(clean).unwrap_or_else(|_| Value::String(clean.to_string()))
}

fn response_text_with_limit(text: String) -> Result<String, String> {
    if text.len() > MAX_RESPONSE_TEXT_BYTES {
        return Err("gateway response was too large for command bridge".to_string());
    }

    Ok(text)
}

#[tauri::command]
pub async fn gateway_request(
    state: State<'_, AppState>,
    request: GatewayRequest,
) -> Result<GatewayResponse, String> {
    let method = normalize_method(&request.method)?;
    let route = normalize_route(&request.path)?;

    if !is_allowed_gateway_route(&method, &route) {
        return Err(format!(
            "gateway route is not allowlisted for {method}: {}",
            path_only(&route)
        ));
    }

    if let Some(body_text) = request.body_text.as_ref() {
        if body_text.len() > MAX_BODY_TEXT_BYTES {
            return Err("gateway request body is too large for command bridge".to_string());
        }
    }

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

    let url = format!("{base_url}{route}");
    let request_headers = request.headers.unwrap_or_default();
    let correlation_id = normalize_correlation_id(&request_headers);
    let effective_passport =
        effective_default_header(&request_headers, "x-ron-passport", &default_passport);
    let effective_wallet =
        effective_default_header(&request_headers, "x-ron-wallet-account", &default_wallet);

    let mut builder = match method.as_str() {
        "GET" => state.http.get(&url),
        "POST" => state.http.post(&url),
        "PUT" => state.http.put(&url),
        _ => return Err("gateway command method became invalid".to_string()),
    }
    .timeout(Duration::from_millis(timeout_ms))
    .header("x-correlation-id", correlation_id.clone());

    if let Some(passport) = effective_passport {
        builder = builder.header("x-ron-passport", passport);
    }

    if let Some(wallet) = effective_wallet {
        builder = builder.header("x-ron-wallet-account", wallet);
    }

    for (raw_name, raw_value) in request_headers {
        if raw_name.eq_ignore_ascii_case("x-correlation-id")
            || raw_name.eq_ignore_ascii_case("x-ron-passport")
            || raw_name.eq_ignore_ascii_case("x-ron-wallet-account")
        {
            continue;
        }

        if let (Some(name), Some(value)) = (
            sanitize_header_name(&raw_name),
            sanitize_header_value(&raw_value),
        ) {
            builder = builder.header(name, value);
        }
    }

    if let Some(body_text) = request.body_text {
        builder = builder.body(body_text);
    } else if let Some(body) = request.body {
        builder = builder.json(&body);
    }

    let response = builder
        .send()
        .await
        .map_err(|err| format!("gateway command request failed: {}", err))?;

    let status = response.status().as_u16();
    let content_type = response
        .headers()
        .get("content-type")
        .and_then(|value| value.to_str().ok())
        .unwrap_or("")
        .to_string();

    let returned_correlation_id = response
        .headers()
        .get("x-correlation-id")
        .and_then(|value| value.to_str().ok())
        .unwrap_or(correlation_id.as_str())
        .to_string();

    let body_text = response
        .text()
        .await
        .map_err(|err| format!("gateway command response read failed: {}", err))
        .and_then(response_text_with_limit)?;

    Ok(GatewayResponse {
        schema: "crablink.tauri.gateway-response.v1",
        method,
        route,
        status,
        ok: (200..300).contains(&status),
        correlation_id: returned_correlation_id,
        content_type,
        data: parse_response_body(&body_text),
    })
}