use crablink_tauri_lib::{
    local_following_feed_cache_store::LocalFollowingFeedCacheStore,
    phase9a8_test_support::{
        read_local_following_feed_cache_from_store, write_local_following_feed_cache_to_store,
        FINAL_BETA_PHASE9A8_LABEL, LOCAL_FOLLOWING_FEED_CACHE_READ_COMMAND,
        LOCAL_FOLLOWING_FEED_CACHE_READ_FAILED_MESSAGE,
        LOCAL_FOLLOWING_FEED_CACHE_UNAVAILABLE_MESSAGE, LOCAL_FOLLOWING_FEED_CACHE_WRITE_COMMAND,
        LOCAL_FOLLOWING_FEED_CACHE_WRITE_FAILED_MESSAGE,
    },
};

use serde_json::json;

use std::{
    fs, io,
    path::PathBuf,
    time::{SystemTime, UNIX_EPOCH},
};

type TestResult = Result<(), Box<dyn std::error::Error>>;

fn test_error(message: &str) -> Box<dyn std::error::Error> {
    Box::new(io::Error::other(message.to_string()))
}

fn require(condition: bool, message: &str) -> TestResult {
    if condition {
        Ok(())
    } else {
        Err(test_error(message))
    }
}

fn unique_root(label: &str) -> Result<PathBuf, Box<dyn std::error::Error>> {
    let nanos = SystemTime::now().duration_since(UNIX_EPOCH)?.as_nanos();

    let mut root = std::env::temp_dir();

    root.push("crablink-phase9a8");

    root.push(std::process::id().to_string());

    root.push(label);

    root.push(nanos.to_string());

    fs::create_dir_all(&root)?;

    Ok(root)
}

fn cleanup(root: &PathBuf) {
    let _ = fs::remove_dir_all(root);
}

#[test]
fn phase9a8_command_names_and_label_are_locked() -> TestResult {
    require(
        FINAL_BETA_PHASE9A8_LABEL
            == "FINAL_BETA_PHASE9A8_DESKTOP_OFFLINE_FEED_CACHE_COMMAND_BRIDGE",
        "Phase 9A8 label changed",
    )?;

    require(
        LOCAL_FOLLOWING_FEED_CACHE_READ_COMMAND == "local_following_feed_cache_read",
        "cache read command changed",
    )?;

    require(
        LOCAL_FOLLOWING_FEED_CACHE_WRITE_COMMAND == "local_following_feed_cache_write",
        "cache write command changed",
    )
}

#[test]
fn phase9a8_absent_cache_reads_as_none() -> TestResult {
    let root = unique_root("absent")?;

    let store = LocalFollowingFeedCacheStore::from_app_data_root(root.clone())?;

    let result = read_local_following_feed_cache_from_store(&store)?;

    require(result.is_none(), "absent cache did not return None")?;

    cleanup(&root);

    Ok(())
}

#[test]
fn phase9a8_cache_value_round_trips_through_reviewed_store() -> TestResult {
    let root = unique_root("round-trip")?;

    let store = LocalFollowingFeedCacheStore::from_app_data_root(root.clone())?;

    let value = json!({
        "schema": "crablink.local-following-feed-cache.v1",
        "items": [],
        "cachedAt": "2026-08-09T21:00:00.000Z"
    });

    let persisted = write_local_following_feed_cache_to_store(&store, &value)?;

    require(persisted == value, "persisted cache value changed")?;

    let read = read_local_following_feed_cache_from_store(&store)?
        .ok_or_else(|| test_error("cache missing after write"))?;

    require(read == value, "read cache value changed")?;

    cleanup(&root);

    Ok(())
}

#[test]
fn phase9a8_non_object_value_fails_with_generic_write_error() -> TestResult {
    let root = unique_root("non-object")?;

    let store = LocalFollowingFeedCacheStore::from_app_data_root(root.clone())?;

    let error = write_local_following_feed_cache_to_store(&store, &json!(["not", "an", "object"]))
        .err()
        .ok_or_else(|| test_error("non-object cache value was accepted"))?;

    require(
        error == LOCAL_FOLLOWING_FEED_CACHE_WRITE_FAILED_MESSAGE,
        "write error was not generic",
    )?;

    cleanup(&root);

    Ok(())
}

#[test]
fn phase9a8_corrupt_disk_cache_returns_generic_read_error() -> TestResult {
    let root = unique_root("corrupt")?;

    let store = LocalFollowingFeedCacheStore::from_app_data_root(root.clone())?;

    fs::create_dir_all(store.cache_dir())?;

    fs::write(store.cache_path(), "{broken-json")?;

    let error = read_local_following_feed_cache_from_store(&store)
        .err()
        .ok_or_else(|| test_error("corrupt cache was accepted"))?;

    require(
        error == LOCAL_FOLLOWING_FEED_CACHE_READ_FAILED_MESSAGE,
        "read error was not generic",
    )?;

    require(
        error.contains(root.to_string_lossy().as_ref()) == false,
        "raw filesystem path crossed helper boundary",
    )?;

    cleanup(&root);

    Ok(())
}

#[test]
fn phase9a8_unavailable_error_is_generic_and_non_authoritative() -> TestResult {
    require(
        LOCAL_FOLLOWING_FEED_CACHE_UNAVAILABLE_MESSAGE
            == "local following feed cache persistence unavailable",
        "unavailable error changed",
    )?;

    for forbidden in [
        "wallet",
        "ledger",
        "receipt",
        "quickchain",
        "solana",
        "entitled",
        "confirmed",
    ] {
        require(
            LOCAL_FOLLOWING_FEED_CACHE_UNAVAILABLE_MESSAGE
                .to_ascii_lowercase()
                .contains(forbidden)
                == false,
            "unavailable error gained unrelated authority language",
        )?;
    }

    Ok(())
}

#[test]
fn phase9a8_source_registers_exact_cache_state_and_two_commands() -> TestResult {
    let manifest = PathBuf::from(env!("CARGO_MANIFEST_DIR"));

    let lib = fs::read_to_string(manifest.join("src/lib.rs"))?;

    let state = fs::read_to_string(manifest.join("src/state.rs"))?;

    require(
        state.contains(
            "local_following_feed_cache_store: Option<Mutex<LocalFollowingFeedCacheStore>>",
        ),
        "cache store field missing from AppState",
    )?;

    require(
        lib.matches("commands::local_following_feed_cache::local_following_feed_cache_read")
            .count()
            == 1,
        "cache read command registration count changed",
    )?;

    require(
        lib.matches("commands::local_following_feed_cache::local_following_feed_cache_write")
            .count()
            == 1,
        "cache write command registration count changed",
    )?;

    Ok(())
}

#[test]
fn phase9a8_command_source_adds_no_network_graph_or_economic_authority() -> TestResult {
    let manifest = PathBuf::from(env!("CARGO_MANIFEST_DIR"));

    let source = fs::read_to_string(manifest.join("src/commands/local_following_feed_cache.rs"))?;

    for forbidden in [
        "reqwest",
        "gateway_request",
        "follow_local",
        "unfollow",
        "follower_count",
        "following_count",
        "wallet_",
        "ledger_",
        "receipt_",
        "quickchain_",
        "rox_",
        "solana_",
        "network_confirmed",
        "paid_unlocked",
    ] {
        require(
            source.contains(forbidden) == false,
            "cache command source gained forbidden authority token",
        )?;
    }

    require(
        source.contains("LocalFollowingFeedCacheStore"),
        "reviewed cache store is not used",
    )
}
