//! RO:WHAT — Redacted app diagnostics command.
//! RO:WHY — Lets React display local app status without leaking secrets.
//! RO:INTERACTS — Tauri frontend diagnostics panel.
//! RO:INVARIANTS — display-only; no stack traces or raw secret-bearing state.

use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct AppDiagnostics {
    pub schema: &'static str,
    pub app: &'static str,
    pub role: &'static str,
    pub primary_mode: &'static str,
    pub chrome_role: &'static str,
    pub oap_enabled: bool,
    pub sidecar_enabled: bool,
    pub vault_enabled: bool,
    pub offline_cache_enabled: bool,
    pub facet_execution_enabled: bool,
}

#[tauri::command]
pub async fn app_diagnostics() -> AppDiagnostics {
    AppDiagnostics {
        schema: "crablink.tauri.diagnostics.v1",
        app: "CrabLink Tauri",
        role: "primary native Rust-backed RON client",
        primary_mode: "gateway-first",
        chrome_role: "proof client / browser companion / gateway smoke surface",
        oap_enabled: false,
        sidecar_enabled: false,
        vault_enabled: false,
        offline_cache_enabled: false,
        facet_execution_enabled: false,
    }
}
