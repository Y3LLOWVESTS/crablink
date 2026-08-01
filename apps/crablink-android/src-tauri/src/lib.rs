//! Wires the narrow CrabLink Android Tauri scaffold.
//! React owns presentation and explicit intent; Rust exposes one redacted command.

mod android_deep_link;
mod android_lifecycle;
mod android_share;
mod commands;
mod passport_android_keystore;
mod passport_android_native_surface;
mod passport_android_vault;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::diagnostics::app_diagnostics,
        ])
        .run(tauri::generate_context!())
        .expect("error while running CrabLink Android");
}
