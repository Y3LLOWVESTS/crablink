//! RO:WHAT — Wires the CrabLink Tauri command bridge.
//! RO:WHY — Rust mediates native privilege; React owns display/user intent only.
//! RO:INTERACTS — commands, AppState, svc-gateway HTTP routes.
//! RO:INVARIANTS — gateway-first; no fake balances/receipts; no silent spend; no arbitrary execution.
//! RO:SECURITY — command outputs must be typed and redacted.

mod commands;
mod state;

use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            commands::diagnostics::app_diagnostics,
            commands::settings::read_settings,
            commands::settings::write_settings,
            commands::health::health_check_gateway,
            commands::health::ready_check_gateway,
            commands::resolve::resolve_crab_url_gateway,
            commands::identity::identity_me_gateway,
            commands::wallet::wallet_balance_gateway,
            commands::gateway::gateway_request,
            commands::assets::upload_image_asset_gateway,
            commands::assets::upload_video_asset_gateway,
            commands::assets::upload_music_asset_gateway,
            commands::assets::fetch_asset_bytes_gateway,
            commands::assets::upload_podcast_asset_gateway,
            commands::media::media_status,
            commands::stream::start_local_stream_session,
            commands::stream::get_local_stream_session,
            commands::stream::stop_local_stream_session,
        ])
        .run(tauri::generate_context!())
        .expect("error while running CrabLink Tauri");
}