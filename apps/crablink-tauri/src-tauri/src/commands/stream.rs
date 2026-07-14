//! RO:WHAT — Local stream-room session commands for CrabLink Tauri.
//! RO:WHY — Gives the UI a real launch/stop control surface before backend stream routes exist.
//! RO:INTERACTS — AppState, StreamSessionPanel.jsx, StreamLocalPreview.jsx.
//! RO:INVARIANTS — local display state only; no b3 mint; no backend live claim; no receipt; no wallet mutation.
//! RO:METRICS — none; future backend stream routes must expose gateway/wallet/session metrics.
//! RO:CONFIG — reads no durable config beyond in-memory app state.
//! RO:SECURITY — no stream keys, ingest tokens, private URLs, capabilities, or spend authority are accepted.
//! RO:TEST — cargo check plus manual crab://stream launch/stop smoke.

use crate::state::{AppState, LocalStreamSession};
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::State;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartLocalStreamSessionRequest {
    pub title: Option<String>,
    pub channel_display: Option<String>,
    pub price_roc: Option<String>,
    pub interval_seconds: Option<u64>,
    pub recipient_account: Option<String>,
    pub preview_source: Option<String>,
    pub preview_label: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StopLocalStreamSessionResult {
    pub schema: String,
    pub stopped: bool,
    pub reason: String,
    pub stopped_at_ms: u64,
    pub previous: Option<LocalStreamSession>,
}

#[tauri::command]
pub fn start_local_stream_session(
    state: State<'_, AppState>,
    request: StartLocalStreamSessionRequest,
) -> Result<LocalStreamSession, String> {
    let now = now_millis()?;
    let title = clean_label(
        request.title.as_deref().unwrap_or("Untitled stream"),
        "title",
        180,
    )?;
    let channel_display = clean_label(
        request
            .channel_display
            .as_deref()
            .unwrap_or("Local stream room"),
        "channel_display",
        120,
    )?;
    let price_roc = clean_price_roc(request.price_roc.as_deref().unwrap_or("5"))?;
    let interval_seconds = request.interval_seconds.unwrap_or(300).clamp(60, 86_400);
    let recipient_account = clean_label(
        request.recipient_account.as_deref().unwrap_or(""),
        "recipient_account",
        256,
    )?;
    let preview_source = clean_label(
        request.preview_source.as_deref().unwrap_or("none"),
        "preview_source",
        80,
    )?;
    let preview_label = clean_label(
        request
            .preview_label
            .as_deref()
            .unwrap_or("No local preview"),
        "preview_label",
        160,
    )?;

    let session = LocalStreamSession {
        schema: "crablink.local-stream-session.v1".to_string(),
        session_id: format!("stream_local_{now}"),
        status: "local_room_active_not_backend_live".to_string(),
        title,
        channel_display,
        price_roc: price_roc.clone(),
        interval_seconds,
        pricing_summary: format!("{} ROC / {} min", price_roc, interval_seconds / 60),
        recipient_account,
        preview_source,
        preview_label,
        started_at_ms: now,
        backend_live: false,
        backend_stream_id: None,
        crab_url: None,
        viewer_count_backend_confirmed: false,
        receipt_backend_confirmed: false,
        wallet_mutation: false,
    };

    let mut guard = state
        .local_stream_session
        .lock()
        .map_err(|_| "local stream session lock poisoned".to_string())?;

    *guard = Some(session.clone());

    Ok(session)
}

#[tauri::command]
pub fn get_local_stream_session(
    state: State<'_, AppState>,
) -> Result<Option<LocalStreamSession>, String> {
    let guard = state
        .local_stream_session
        .lock()
        .map_err(|_| "local stream session lock poisoned".to_string())?;

    Ok(guard.clone())
}

#[tauri::command]
pub fn stop_local_stream_session(
    state: State<'_, AppState>,
    reason: Option<String>,
) -> Result<StopLocalStreamSessionResult, String> {
    let stopped_at_ms = now_millis()?;
    let clean_reason = clean_label(
        reason.as_deref().unwrap_or("Stopped by creator"),
        "reason",
        180,
    )?;

    let mut guard = state
        .local_stream_session
        .lock()
        .map_err(|_| "local stream session lock poisoned".to_string())?;

    let previous = guard.take();

    Ok(StopLocalStreamSessionResult {
        schema: "crablink.local-stream-session-stop.v1".to_string(),
        stopped: previous.is_some(),
        reason: clean_reason,
        stopped_at_ms,
        previous,
    })
}

fn now_millis() -> Result<u64, String> {
    let duration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|_| "system clock is before UNIX_EPOCH".to_string())?;

    Ok(duration.as_millis().min(u64::MAX as u128) as u64)
}

fn clean_label(value: &str, field: &str, max_len: usize) -> Result<String, String> {
    let clean = value.trim();

    if clean.len() > max_len {
        return Err(format!("{field} is too long"));
    }

    if clean.contains('\n') || clean.contains('\r') {
        return Err(format!("{field} must not contain newlines"));
    }

    Ok(clean.to_string())
}

fn clean_price_roc(value: &str) -> Result<String, String> {
    let clean = value.trim();

    if clean.is_empty() {
        return Err("price_roc is required".to_string());
    }

    if !clean.chars().all(|char| char.is_ascii_digit()) {
        return Err("price_roc must be an integer ROC value".to_string());
    }

    let parsed = clean
        .parse::<u64>()
        .map_err(|_| "price_roc must be a valid integer".to_string())?;

    if parsed == 0 {
        return Err("price_roc must be greater than zero".to_string());
    }

    if parsed > 1_000_000 {
        return Err("price_roc is too large for local stream draft".to_string());
    }

    Ok(parsed.to_string())
}
