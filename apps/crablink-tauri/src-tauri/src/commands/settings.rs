//! RO:WHAT — Read/write local scaffold settings.
//! RO:WHY — Establishes a settings command boundary before durable storage.
//! RO:INTERACTS — AppState, React settings adapter.
//! RO:INVARIANTS — settings are local preferences; no wallet/ledger/receipt truth.
//! RO:SECURITY — rejects suspicious gateway URLs and newline-bearing fields.

use crate::state::{AppSettings, AppState};
use tauri::State;

fn validate_settings(settings: &AppSettings) -> Result<(), String> {
    let gateway = settings.gateway_url.trim();

    if !(gateway.starts_with("http://") || gateway.starts_with("https://")) {
        return Err("gateway_url must start with http:// or https://".to_string());
    }

    if gateway.contains('\n') || gateway.contains('\r') {
        return Err("gateway_url must not contain newlines".to_string());
    }

    if settings.request_timeout_ms == 0 || settings.request_timeout_ms > 30_000 {
        return Err("request_timeout_ms must be between 1 and 30000".to_string());
    }

    Ok(())
}

#[tauri::command]
pub async fn read_settings(state: State<'_, AppState>) -> Result<AppSettings, String> {
    let settings = state
        .settings
        .lock()
        .map_err(|_| "settings lock poisoned".to_string())?
        .clone();

    Ok(settings)
}

#[tauri::command]
pub async fn write_settings(
    state: State<'_, AppState>,
    settings: AppSettings,
) -> Result<AppSettings, String> {
    validate_settings(&settings)?;

    let mut guard = state
        .settings
        .lock()
        .map_err(|_| "settings lock poisoned".to_string())?;

    *guard = settings.clone();

    Ok(settings)
}
