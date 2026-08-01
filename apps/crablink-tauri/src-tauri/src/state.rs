//! RO:WHAT — In-memory Tauri app state for the first CrabLink native client lane.
//! RO:WHY — Proves command boundaries before durable settings/vault/cache work.
//! RO:INTERACTS — command handlers, svc-gateway HTTP client, local app settings, stream session, video jobs/sources.
//! RO:INVARIANTS — no lock across await; settings/session/jobs/sources are preferences/display, not backend truth.
//! RO:SECURITY — no private keys, seeds, raw capabilities, ingest secrets, receipts, media bytes, or spend authority.

use crate::media::{
    new_make_export_store, new_video_job_store, new_video_source_store, MakeExportStore,
    VideoJobStore, VideoSourceStore,
};
#[cfg(desktop)]
use crate::passport_operational_command_runtime::{
    new_desktop_native_secret_surface, SharedDesktopNativeSecretSurface,
};
#[cfg(desktop)]
use crate::passport_operational_unlock_runtime::DesktopOperationalVaultSessionStore;
#[cfg(desktop)]
use crate::passport_pending_operational_runtime::DesktopPendingOperationalSessionStore;
#[cfg(desktop)]
use crate::passport_pending_recovery_runtime::DesktopPendingRecoverySessionStore;
#[cfg(desktop)]
use crate::passport_platform_material_clear_runtime::SharedDesktopPlatformMaterialClearer;
#[cfg(desktop)]
use crate::passport_platform_runtime::SharedNativePlatformSealer;
#[cfg(desktop)]
use crate::passport_recovery_acknowledgement_store::DesktopRecoveryAcknowledgementStore;
#[cfg(desktop)]
use crate::passport_vault_store::DesktopAtomicVaultStore;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub gateway_url: String,
    pub request_timeout_ms: u64,
    pub run_mode: String,
    pub passport_label: String,
    pub wallet_account: String,
    pub theme: String,
    pub developer_diagnostics: bool,
    pub last_crab_url: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            gateway_url: "http://127.0.0.1:8090".to_string(),
            request_timeout_ms: 5000,
            run_mode: "gateway".to_string(),
            passport_label: String::new(),
            wallet_account: String::new(),
            theme: "dark".to_string(),
            developer_diagnostics: false,
            last_crab_url: "crab://home".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalStreamSession {
    pub schema: String,
    pub session_id: String,
    pub status: String,
    pub title: String,
    pub channel_display: String,
    pub price_roc: String,
    pub interval_seconds: u64,
    pub pricing_summary: String,
    pub recipient_account: String,
    pub preview_source: String,
    pub preview_label: String,
    pub started_at_ms: u64,
    pub backend_live: bool,
    pub backend_stream_id: Option<String>,
    pub crab_url: Option<String>,
    pub viewer_count_backend_confirmed: bool,
    pub receipt_backend_confirmed: bool,
    pub wallet_mutation: bool,
}

pub struct AppState {
    pub settings: Mutex<AppSettings>,
    pub http: reqwest::Client,
    pub local_stream_session: Mutex<Option<LocalStreamSession>>,
    pub video_jobs: VideoJobStore,
    pub video_sources: VideoSourceStore,
    pub make_exports: MakeExportStore,
    #[cfg(desktop)]
    pub passport_vault_store: DesktopAtomicVaultStore,
    #[cfg(desktop)]
    pub passport_recovery_acknowledgement_store: DesktopRecoveryAcknowledgementStore,
    #[cfg(desktop)]
    pub passport_platform_sealer: SharedNativePlatformSealer,
    #[cfg(desktop)]
    pub passport_platform_material_clearer: SharedDesktopPlatformMaterialClearer,
    #[cfg(desktop)]
    pub passport_operational_session: DesktopOperationalVaultSessionStore,
    #[cfg(desktop)]
    pub passport_pending_recovery_session: DesktopPendingRecoverySessionStore,
    #[cfg(desktop)]
    pub passport_pending_operational_session: DesktopPendingOperationalSessionStore,
    #[cfg(desktop)]
    pub passport_secret_surface: SharedDesktopNativeSecretSurface,
}

impl AppState {
    #[cfg(desktop)]
    pub fn with_native_passport_runtime(
        passport_vault_store: DesktopAtomicVaultStore,
        passport_platform_sealer: SharedNativePlatformSealer,
        passport_platform_material_clearer: SharedDesktopPlatformMaterialClearer,
    ) -> Self {
        Self::with_native_passport_runtime_and_secret_surface(
            passport_vault_store,
            passport_platform_sealer,
            passport_platform_material_clearer,
            new_desktop_native_secret_surface(),
        )
    }

    #[cfg(desktop)]
    pub fn with_native_passport_runtime_and_secret_surface(
        passport_vault_store: DesktopAtomicVaultStore,
        passport_platform_sealer: SharedNativePlatformSealer,
        passport_platform_material_clearer: SharedDesktopPlatformMaterialClearer,
        passport_secret_surface: SharedDesktopNativeSecretSurface,
    ) -> Self {
        let passport_recovery_acknowledgement_store =
            DesktopRecoveryAcknowledgementStore::new(passport_vault_store.root_directory());

        Self {
            settings: Mutex::new(AppSettings::default()),
            http: reqwest::Client::new(),
            local_stream_session: Mutex::new(None),
            video_jobs: new_video_job_store(),
            video_sources: new_video_source_store(),
            make_exports: new_make_export_store(),
            passport_vault_store,
            passport_platform_sealer,
            passport_platform_material_clearer,
            passport_operational_session: DesktopOperationalVaultSessionStore::default(),
            passport_pending_recovery_session: DesktopPendingRecoverySessionStore::default(),
            passport_pending_operational_session: DesktopPendingOperationalSessionStore::default(),
            passport_secret_surface,
            passport_recovery_acknowledgement_store,
        }
    }
}

#[cfg(mobile)]
impl Default for AppState {
    fn default() -> Self {
        Self {
            settings: Mutex::new(AppSettings::default()),
            http: reqwest::Client::new(),
            local_stream_session: Mutex::new(None),
            video_jobs: new_video_job_store(),
            video_sources: new_video_source_store(),
            make_exports: new_make_export_store(),
        }
    }
}
