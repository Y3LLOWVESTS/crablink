//! RO:WHAT — Wires the narrow CrabLink TV Tauri command bridge.
//! RO:WHY — TV React owns display and intent; Rust owns limited native operations.
//! RO:INTERACTS — commands::asset_manifest, commands::catalog_read, commands::diagnostics, commands::settings, Tauri runtime.
//! RO:INVARIANTS — client-only; no node/operator/publish/wallet/ledger authority.
//! RO:SECURITY — only explicitly registered, typed, redacted commands are exposed.
//! RO:TEST — command unit tests and check-crablink-tv-command-boundary.mjs.

mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::asset_manifest::tv_asset_manifest_check,
            commands::catalog_read::tv_catalog_read,
            commands::diagnostics::tv_diagnostics,
            commands::gateway::tv_gateway_profile,
            commands::gateway_health::tv_gateway_health,
            commands::pairing_begin::tv_pairing_begin,
            commands::pairing::tv_pairing_status,
            commands::settings::tv_settings_read,
        ])
        .run(tauri::generate_context!())
        .expect("error while running CrabLink TV");
}
