//! RO:WHAT — Narrow Tauri bridge for private local-following persistence.
//! RO:WHY — FINAL_BETA Phase 8 exposes durable local preference state without creating a server social graph.
//! RO:INTERACTS — AppState and DesktopLocalFollowingStore.
//! RO:INVARIANTS — exactly read/write persistence; no follow/unfollow network semantics; generic errors only.
//! RO:SECURITY — no filesystem paths, raw IO errors, Passport secrets, follower counts, wallet, ledger, ROC, or finality truth cross IPC.
//! RO:TEST — tests/final_beta_phase8a4_desktop_local_following_command_bridge.rs.

// FINAL_BETA_PHASE8A4_DESKTOP_LOCAL_FOLLOWING_COMMAND_BRIDGE_V1

use crate::{
    local_following_store::{
        DesktopLocalFollowingStore,
        LocalFollowingRecordV1,
    },
    state::AppState,
};

use tauri::State;

pub const FINAL_BETA_PHASE8A4_LABEL: &str =
    "FINAL_BETA_PHASE8A4_DESKTOP_LOCAL_FOLLOWING_COMMAND_BRIDGE";

pub const LOCAL_FOLLOWING_READ_COMMAND: &str =
    "local_following_read";

pub const LOCAL_FOLLOWING_WRITE_COMMAND: &str =
    "local_following_write";

pub const LOCAL_FOLLOWING_UNAVAILABLE_MESSAGE: &str =
    "local following persistence unavailable";

pub const LOCAL_FOLLOWING_READ_FAILED_MESSAGE: &str =
    "local following read failed";

pub const LOCAL_FOLLOWING_WRITE_FAILED_MESSAGE: &str =
    "local following write failed";

pub fn read_local_following_from_store(
    store: &DesktopLocalFollowingStore,
) -> Result<
    Option<LocalFollowingRecordV1>,
    String,
> {
    store
        .load()
        .map_err(
            |_| {
                LOCAL_FOLLOWING_READ_FAILED_MESSAGE
                    .to_string()
            },
        )
}

pub fn write_local_following_to_store(
    store: &DesktopLocalFollowingStore,
    record: &LocalFollowingRecordV1,
) -> Result<
    LocalFollowingRecordV1,
    String,
> {
    store
        .write_atomic(
            record,
        )
        .map_err(
            |_| {
                LOCAL_FOLLOWING_WRITE_FAILED_MESSAGE
                    .to_string()
            },
        )?;

    store
        .load()
        .map_err(
            |_| {
                LOCAL_FOLLOWING_WRITE_FAILED_MESSAGE
                    .to_string()
            },
        )?
        .ok_or_else(
            || {
                LOCAL_FOLLOWING_WRITE_FAILED_MESSAGE
                    .to_string()
            },
        )
}

#[tauri::command]
pub fn local_following_read(
    state: State<'_, AppState>,
) -> Result<
    Option<LocalFollowingRecordV1>,
    String,
> {
    let store =
        state
            .local_following_store
            .as_ref()
            .ok_or_else(
                || {
                    LOCAL_FOLLOWING_UNAVAILABLE_MESSAGE
                        .to_string()
                },
            )?;

    let guard =
        store
            .lock()
            .map_err(
                |_| {
                    LOCAL_FOLLOWING_READ_FAILED_MESSAGE
                        .to_string()
                },
            )?;

    read_local_following_from_store(
        &guard,
    )
}

#[tauri::command]
pub fn local_following_write(
    state: State<'_, AppState>,
    record: LocalFollowingRecordV1,
) -> Result<
    LocalFollowingRecordV1,
    String,
> {
    let store =
        state
            .local_following_store
            .as_ref()
            .ok_or_else(
                || {
                    LOCAL_FOLLOWING_UNAVAILABLE_MESSAGE
                        .to_string()
                },
            )?;

    let guard =
        store
            .lock()
            .map_err(
                |_| {
                    LOCAL_FOLLOWING_WRITE_FAILED_MESSAGE
                        .to_string()
                },
            )?;

    write_local_following_to_store(
        &guard,
        &record,
    )
}
