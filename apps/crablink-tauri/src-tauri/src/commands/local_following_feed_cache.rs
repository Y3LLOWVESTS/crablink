//! RO:WHAT — Narrow Tauri bridge for bounded offline Home feed-cache persistence.
//! RO:WHY — FINAL_BETA Phase 9 exposes reviewed local display-cache storage without creating cache schema authority in Rust.
//! RO:INTERACTS — AppState and LocalFollowingFeedCacheStore.
//! RO:INVARIANTS — exactly read/write JSON-object persistence; shared-core JS remains cache-schema authority.
//! RO:SECURITY — generic IPC errors only; no filesystem paths, raw IO errors, follows, ranking, entitlement, wallet, ledger, QuickChain, ROX, Solana, or finality truth cross IPC.
//! RO:TEST — tests/final_beta_phase9a8_desktop_offline_feed_cache_command_bridge.rs.

// FINAL_BETA_PHASE9A8_DESKTOP_OFFLINE_FEED_CACHE_COMMAND_BRIDGE_V1

use crate::{local_following_feed_cache_store::LocalFollowingFeedCacheStore, state::AppState};

use serde_json::Value;
use tauri::State;

pub const FINAL_BETA_PHASE9A8_LABEL: &str =
    "FINAL_BETA_PHASE9A8_DESKTOP_OFFLINE_FEED_CACHE_COMMAND_BRIDGE";

pub const LOCAL_FOLLOWING_FEED_CACHE_READ_COMMAND: &str = "local_following_feed_cache_read";

pub const LOCAL_FOLLOWING_FEED_CACHE_WRITE_COMMAND: &str = "local_following_feed_cache_write";

pub const LOCAL_FOLLOWING_FEED_CACHE_UNAVAILABLE_MESSAGE: &str =
    "local following feed cache persistence unavailable";

pub const LOCAL_FOLLOWING_FEED_CACHE_READ_FAILED_MESSAGE: &str =
    "local following feed cache read failed";

pub const LOCAL_FOLLOWING_FEED_CACHE_WRITE_FAILED_MESSAGE: &str =
    "local following feed cache write failed";

pub fn read_local_following_feed_cache_from_store(
    store: &LocalFollowingFeedCacheStore,
) -> Result<Option<Value>, String> {
    let json = store
        .read_cache_json()
        .map_err(|_| LOCAL_FOLLOWING_FEED_CACHE_READ_FAILED_MESSAGE.to_string())?;

    match json {
        None => Ok(None),
        Some(json) => serde_json::from_str(&json)
            .map(Some)
            .map_err(|_| LOCAL_FOLLOWING_FEED_CACHE_READ_FAILED_MESSAGE.to_string()),
    }
}

pub fn write_local_following_feed_cache_to_store(
    store: &LocalFollowingFeedCacheStore,
    value: &Value,
) -> Result<Value, String> {
    let json = serde_json::to_string(value)
        .map_err(|_| LOCAL_FOLLOWING_FEED_CACHE_WRITE_FAILED_MESSAGE.to_string())?;

    store
        .write_cache_json(&json)
        .map_err(|_| LOCAL_FOLLOWING_FEED_CACHE_WRITE_FAILED_MESSAGE.to_string())?;

    let persisted = store
        .read_cache_json()
        .map_err(|_| LOCAL_FOLLOWING_FEED_CACHE_WRITE_FAILED_MESSAGE.to_string())?
        .ok_or_else(|| LOCAL_FOLLOWING_FEED_CACHE_WRITE_FAILED_MESSAGE.to_string())?;

    serde_json::from_str(&persisted)
        .map_err(|_| LOCAL_FOLLOWING_FEED_CACHE_WRITE_FAILED_MESSAGE.to_string())
}

#[tauri::command]
pub fn local_following_feed_cache_read(
    state: State<'_, AppState>,
) -> Result<Option<Value>, String> {
    let store = state
        .local_following_feed_cache_store
        .as_ref()
        .ok_or_else(|| LOCAL_FOLLOWING_FEED_CACHE_UNAVAILABLE_MESSAGE.to_string())?;

    let guard = store
        .lock()
        .map_err(|_| LOCAL_FOLLOWING_FEED_CACHE_READ_FAILED_MESSAGE.to_string())?;

    read_local_following_feed_cache_from_store(&guard)
}

#[tauri::command]
pub fn local_following_feed_cache_write(
    state: State<'_, AppState>,
    value: Value,
) -> Result<Value, String> {
    let store = state
        .local_following_feed_cache_store
        .as_ref()
        .ok_or_else(|| LOCAL_FOLLOWING_FEED_CACHE_UNAVAILABLE_MESSAGE.to_string())?;

    let guard = store
        .lock()
        .map_err(|_| LOCAL_FOLLOWING_FEED_CACHE_WRITE_FAILED_MESSAGE.to_string())?;

    write_local_following_feed_cache_to_store(&guard, &value)
}
