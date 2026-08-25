//! RO:WHAT — In-memory Tauri app state for CrabLink native client state, including the short-lived Native Passport capability session.
//! RO:WHY — Native privilege and temporary device-bound authority must remain outside React while durable network truth stays in RustyOnions.
//! RO:INTERACTS — command handlers, svc-gateway HTTP client, local settings/media state, Passport vault/session stores, and the memory-only capability session.
//! RO:INVARIANTS — no lock across await; the capability session is native-memory-only and never becomes durable local truth; backend services remain capability authority.
//! RO:SECURITY — private keys, seeds, VMKs, PINs, capability material, receipts, media bytes, and spend authority never serialize from AppState to React.

use crate::local_following_feed_cache_store::LocalFollowingFeedCacheStore;
use crate::local_following_store::DesktopLocalFollowingStore;
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
    pub local_following_store: Option<Mutex<DesktopLocalFollowingStore>>,
    pub local_following_feed_cache_store: Option<Mutex<LocalFollowingFeedCacheStore>>,
    #[cfg(desktop)]
    pub passport_vault_store: DesktopAtomicVaultStore,
    #[cfg(desktop)]
    pub passport_public_identity_store:
        crate::passport_public_identity_store::DesktopPublicPassportDescriptorStore,
    #[cfg(desktop)]
    pub passport_device_authorization_store:
        crate::passport_device_authorization_store::DesktopDeviceAuthorizationStore,
    #[cfg(desktop)]
    pub passport_capability_session:
        crate::passport_capability_session::DesktopCapabilitySessionStore,
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
    pub fn with_native_passport_runtime_and_local_following(
        passport_vault_store: DesktopAtomicVaultStore,
        passport_platform_sealer: SharedNativePlatformSealer,
        passport_platform_material_clearer: SharedDesktopPlatformMaterialClearer,
        local_following_store: DesktopLocalFollowingStore,
    ) -> Self {
        let mut state = Self::with_native_passport_runtime(
            passport_vault_store,
            passport_platform_sealer,
            passport_platform_material_clearer,
        );

        state.local_following_store = Some(Mutex::new(local_following_store));

        state
    }

    #[cfg(desktop)]
    pub fn with_native_passport_runtime_and_local_following_and_feed_cache(
        passport_vault_store: DesktopAtomicVaultStore,
        passport_platform_sealer: SharedNativePlatformSealer,
        passport_platform_material_clearer: SharedDesktopPlatformMaterialClearer,
        local_following_store: DesktopLocalFollowingStore,
        local_following_feed_cache_store: LocalFollowingFeedCacheStore,
    ) -> Self {
        let mut state = Self::with_native_passport_runtime_and_local_following(
            passport_vault_store,
            passport_platform_sealer,
            passport_platform_material_clearer,
            local_following_store,
        );

        state.local_following_feed_cache_store = Some(Mutex::new(local_following_feed_cache_store));

        state
    }

    #[cfg(desktop)]
    pub fn with_native_passport_runtime_and_secret_surface(
        passport_vault_store: DesktopAtomicVaultStore,
        passport_platform_sealer: SharedNativePlatformSealer,
        passport_platform_material_clearer: SharedDesktopPlatformMaterialClearer,
        passport_secret_surface: SharedDesktopNativeSecretSurface,
    ) -> Self {
        let passport_public_identity_store =
            crate::passport_public_identity_store::DesktopPublicPassportDescriptorStore::new(
                passport_vault_store.root_directory().to_path_buf(),
            )
            .expect("DesktopAtomicVaultStore owns a validated absolute Native Passport root");

        let passport_device_authorization_store =
            crate::passport_device_authorization_store::DesktopDeviceAuthorizationStore::new(
                passport_vault_store.root_directory().to_path_buf(),
            )
            .expect("DesktopAtomicVaultStore owns a validated absolute Native Passport root");

        let passport_recovery_acknowledgement_store =
            DesktopRecoveryAcknowledgementStore::new(passport_vault_store.root_directory());

        Self {
            settings: Mutex::new(AppSettings::default()),
            http: reqwest::Client::new(),
            local_stream_session: Mutex::new(None),
            video_jobs: new_video_job_store(),
            video_sources: new_video_source_store(),
            make_exports: new_make_export_store(),
            local_following_store: None,
            local_following_feed_cache_store: None,
            passport_vault_store,
            passport_public_identity_store,
            passport_device_authorization_store,
            passport_capability_session:
                crate::passport_capability_session::DesktopCapabilitySessionStore::default(),
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
            local_following_store: None,
            local_following_feed_cache_store: None,
        }
    }
}
