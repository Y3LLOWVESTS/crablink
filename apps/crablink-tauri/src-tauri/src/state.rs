//! RO:WHAT — In-memory Tauri app state for the first CrabLink native client lane.
//! RO:WHY — Proves command boundaries before durable settings/vault/cache work.
//! RO:INTERACTS — command handlers, svc-gateway HTTP client, local app settings, local stream session state.
//! RO:INVARIANTS — no lock across await; settings/session state are preferences/display, not backend truth.
//! RO:SECURITY — no private keys, seeds, raw capabilities, ingest secrets, receipts, or spend authority.

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
            passport_label: "passport:main:dev".to_string(),
            wallet_account: "acct_dev".to_string(),
            theme: "dark".to_string(),
            developer_diagnostics: true,
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
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            settings: Mutex::new(AppSettings::default()),
            http: reqwest::Client::new(),
            local_stream_session: Mutex::new(None),
        }
    }
}