use crablink_tauri_lib::local_following_feed_cache_store::{
    LocalFollowingFeedCacheStore,
    LocalFollowingFeedCacheStoreError,
    LOCAL_FOLLOWING_FEED_CACHE_DIR,
    LOCAL_FOLLOWING_FEED_CACHE_FILE,
    LOCAL_FOLLOWING_FEED_CACHE_MAX_BYTES,
    LOCAL_FOLLOWING_FEED_CACHE_TEMP_FILE,
};

use std::{
    fs,
    io,
    path::PathBuf,
    time::{SystemTime, UNIX_EPOCH},
};

type TestResult =
    Result<
        (),
        Box<dyn std::error::Error>,
    >;

fn test_error(
    message: &str,
) -> Box<dyn std::error::Error> {
    Box::new(
        io::Error::new(
            io::ErrorKind::Other,
            message.to_string(),
        ),
    )
}

fn require(
    condition: bool,
    message: &str,
) -> TestResult {
    if condition {
        Ok(())
    } else {
        Err(
            test_error(
                message,
            ),
        )
    }
}

fn unique_root(
    label: &str,
) -> Result<PathBuf, Box<dyn std::error::Error>> {
    let nanos =
        SystemTime::now()
            .duration_since(
                UNIX_EPOCH,
            )?
            .as_nanos();

    let mut root =
        std::env::temp_dir();

    root.push(
        "crablink-phase9a7",
    );

    root.push(
        std::process::id()
            .to_string(),
    );

    root.push(
        label,
    );

    root.push(
        nanos.to_string(),
    );

    fs::create_dir_all(
        &root,
    )?;

    Ok(root)
}

fn cleanup(
    root: &PathBuf,
) {
    let _ =
        fs::remove_dir_all(
            root,
        );
}

fn error_kind(
    error: &LocalFollowingFeedCacheStoreError,
) -> &'static str {
    match error {
        LocalFollowingFeedCacheStoreError::InvalidAppDataRoot =>
            "invalid_root",
        LocalFollowingFeedCacheStoreError::UnsafeSymlinkPath =>
            "unsafe_symlink",
        LocalFollowingFeedCacheStoreError::CacheTooLarge =>
            "too_large",
        LocalFollowingFeedCacheStoreError::InvalidJsonObject =>
            "invalid_json",
        LocalFollowingFeedCacheStoreError::InvalidUtf8 =>
            "invalid_utf8",
        LocalFollowingFeedCacheStoreError::Io(_) =>
            "io",
    }
}

#[test]
fn phase9a7_fixed_app_data_paths_are_locked() -> TestResult {
    let root =
        unique_root(
            "paths",
        )?;

    let store =
        LocalFollowingFeedCacheStore::from_app_data_root(
            root.clone(),
        )?;

    require(
        store.cache_dir() ==
            root.join(
                LOCAL_FOLLOWING_FEED_CACHE_DIR,
            ),
        "cache directory path mismatch",
    )?;

    require(
        store.cache_path() ==
            root.join(
                LOCAL_FOLLOWING_FEED_CACHE_DIR,
            )
            .join(
                LOCAL_FOLLOWING_FEED_CACHE_FILE,
            ),
        "cache file path mismatch",
    )?;

    require(
        store.temp_path() ==
            root.join(
                LOCAL_FOLLOWING_FEED_CACHE_DIR,
            )
            .join(
                LOCAL_FOLLOWING_FEED_CACHE_TEMP_FILE,
            ),
        "cache temporary file path mismatch",
    )?;

    cleanup(
        &root,
    );

    Ok(())
}

#[test]
fn phase9a7_rejects_relative_app_data_root() -> TestResult {
    let error =
        LocalFollowingFeedCacheStore::from_app_data_root(
            PathBuf::from(
                "relative-app-data",
            ),
        )
        .err()
        .ok_or_else(
            || {
                test_error(
                    "relative app-data root was accepted",
                )
            },
        )?;

    require(
        error_kind(
            &error,
        ) ==
            "invalid_root",
        "wrong relative-root error",
    )
}

#[test]
fn phase9a7_empty_cache_object_round_trips_atomically() -> TestResult {
    let root =
        unique_root(
            "empty",
        )?;

    let store =
        LocalFollowingFeedCacheStore::from_app_data_root(
            root.clone(),
        )?;

    let json =
        r#"{"schema":"crablink.local-following-feed-cache.v1","items":[],"cachedAt":"2026-08-09T21:00:00.000Z"}"#;

    store.write_cache_json(
        json,
    )?;

    let read =
        store.read_cache_json()?
            .ok_or_else(
                || {
                    test_error(
                        "cache record missing after write",
                    )
                },
            )?;

    require(
        read == json,
        "cache round trip changed bytes",
    )?;

    require(
        store.temp_path().exists() == false,
        "temporary file remained after atomic write",
    )?;

    cleanup(
        &root,
    );

    Ok(())
}

#[test]
fn phase9a7_real_feed_cache_object_round_trips_without_following_model_fields() -> TestResult {
    let root =
        unique_root(
            "real-cache",
        )?;

    let store =
        LocalFollowingFeedCacheStore::from_app_data_root(
            root.clone(),
        )?;

    let json =
        r#"{"schema":"crablink.local-following-feed-cache.v1","items":[{"schema":"crablink.publication-summary.v1","publicationId":"post-001","creator":{"username":"alice"},"displayOnly":true}],"cachedAt":"2026-08-09T21:00:00.000Z"}"#;

    store.write_cache_json(
        json,
    )?;

    let read =
        store.read_cache_json()?
            .ok_or_else(
                || {
                    test_error(
                        "real cache object missing",
                    )
                },
            )?;

    require(
        read == json,
        "real cache object changed during persistence",
    )?;

    require(
        read.contains(
            "\"entries\"",
        ) ==
            false,
        "native cache invented following entries",
    )?;

    require(
        read.contains(
            "lastTimelineCursor",
        ) ==
            false,
        "native cache invented following cursor metadata",
    )?;

    cleanup(
        &root,
    );

    Ok(())
}

#[test]
fn phase9a7_existing_cache_is_replaced_by_newer_caller_bytes() -> TestResult {
    let root =
        unique_root(
            "replace",
        )?;

    let store =
        LocalFollowingFeedCacheStore::from_app_data_root(
            root.clone(),
        )?;

    store.write_cache_json(
        r#"{"version":1}"#,
    )?;

    store.write_cache_json(
        r#"{"version":2}"#,
    )?;

    let read =
        store.read_cache_json()?
            .ok_or_else(
                || {
                    test_error(
                        "replacement cache missing",
                    )
                },
            )?;

    require(
        read ==
            r#"{"version":2}"#,
        "replacement cache did not win",
    )?;

    cleanup(
        &root,
    );

    Ok(())
}

#[test]
fn phase9a7_native_store_is_content_agnostic_and_adds_no_cache_schema_authority() -> TestResult {
    let root =
        unique_root(
            "content-agnostic",
        )?;

    let store =
        LocalFollowingFeedCacheStore::from_app_data_root(
            root.clone(),
        )?;

    let json =
        r#"{"unknownDisplayField":"preserved","number":7}"#;

    store.write_cache_json(
        json,
    )?;

    let read =
        store.read_cache_json()?
            .ok_or_else(
                || {
                    test_error(
                        "content-agnostic object missing",
                    )
                },
            )?;

    require(
        read == json,
        "native store interpreted caller-owned cache fields",
    )?;

    cleanup(
        &root,
    );

    Ok(())
}

#[test]
fn phase9a7_oversized_write_is_rejected_before_disk_mutation() -> TestResult {
    let root =
        unique_root(
            "oversized-write",
        )?;

    let store =
        LocalFollowingFeedCacheStore::from_app_data_root(
            root.clone(),
        )?;

    let mut json =
        String::from(
            "{\"data\":\"",
        );

    json.push_str(
        &"x".repeat(
            LOCAL_FOLLOWING_FEED_CACHE_MAX_BYTES,
        ),
    );

    json.push_str(
        "\"}",
    );

    let error =
        store.write_cache_json(
            &json,
        )
        .err()
        .ok_or_else(
            || {
                test_error(
                    "oversized cache write was accepted",
                )
            },
        )?;

    require(
        error_kind(
            &error,
        ) ==
            "too_large",
        "wrong oversized-write error",
    )?;

    require(
        store.cache_path().exists() == false,
        "oversized write mutated cache file",
    )?;

    cleanup(
        &root,
    );

    Ok(())
}

#[test]
fn phase9a7_oversized_disk_record_is_rejected_before_json_decode() -> TestResult {
    let root =
        unique_root(
            "oversized-disk",
        )?;

    let store =
        LocalFollowingFeedCacheStore::from_app_data_root(
            root.clone(),
        )?;

    fs::create_dir_all(
        store.cache_dir(),
    )?;

    fs::write(
        store.cache_path(),
        "x".repeat(
            LOCAL_FOLLOWING_FEED_CACHE_MAX_BYTES + 1,
        ),
    )?;

    let error =
        store.read_cache_json()
            .err()
            .ok_or_else(
                || {
                    test_error(
                        "oversized disk cache was accepted",
                    )
                },
            )?;

    require(
        error_kind(
            &error,
        ) ==
            "too_large",
        "wrong oversized-disk error",
    )?;

    cleanup(
        &root,
    );

    Ok(())
}

#[test]
fn phase9a7_corrupt_json_fails_closed() -> TestResult {
    let root =
        unique_root(
            "corrupt",
        )?;

    let store =
        LocalFollowingFeedCacheStore::from_app_data_root(
            root.clone(),
        )?;

    fs::create_dir_all(
        store.cache_dir(),
    )?;

    fs::write(
        store.cache_path(),
        "{broken-json",
    )?;

    let error =
        store.read_cache_json()
            .err()
            .ok_or_else(
                || {
                    test_error(
                        "corrupt cache was accepted",
                    )
                },
            )?;

    require(
        error_kind(
            &error,
        ) ==
            "invalid_json",
        "wrong corrupt-cache error",
    )?;

    cleanup(
        &root,
    );

    Ok(())
}

#[cfg(unix)]
#[test]
fn phase9a7_symlinked_cache_record_path_is_rejected() -> TestResult {
    use std::os::unix::fs::symlink;

    let root =
        unique_root(
            "symlink",
        )?;

    let store =
        LocalFollowingFeedCacheStore::from_app_data_root(
            root.clone(),
        )?;

    fs::create_dir_all(
        store.cache_dir(),
    )?;

    let outside =
        root.join(
            "outside.json",
        );

    fs::write(
        &outside,
        "{}",
    )?;

    symlink(
        &outside,
        store.cache_path(),
    )?;

    let error =
        store.read_cache_json()
            .err()
            .ok_or_else(
                || {
                    test_error(
                        "symlinked cache record was accepted",
                    )
                },
            )?;

    require(
        error_kind(
            &error,
        ) ==
            "unsafe_symlink",
        "wrong symlink error",
    )?;

    cleanup(
        &root,
    );

    Ok(())
}

#[cfg(not(unix))]
#[test]
fn phase9a7_symlinked_cache_record_path_is_rejected() -> TestResult {
    Ok(())
}

#[test]
fn phase9a7_existing_record_wins_over_stale_temporary_file() -> TestResult {
    let root =
        unique_root(
            "stale-temp",
        )?;

    let store =
        LocalFollowingFeedCacheStore::from_app_data_root(
            root.clone(),
        )?;

    store.write_cache_json(
        r#"{"winner":"record"}"#,
    )?;

    fs::write(
        store.temp_path(),
        r#"{"winner":"temporary"}"#,
    )?;

    let read =
        store.read_cache_json()?
            .ok_or_else(
                || {
                    test_error(
                        "record missing while stale temp existed",
                    )
                },
            )?;

    require(
        read ==
            r#"{"winner":"record"}"#,
        "stale temporary file replaced valid record",
    )?;

    require(
        store.temp_path().exists() == false,
        "stale temporary file was not removed",
    )?;

    cleanup(
        &root,
    );

    Ok(())
}

#[test]
fn phase9a7_valid_interrupted_write_is_promoted() -> TestResult {
    let root =
        unique_root(
            "promote-temp",
        )?;

    let store =
        LocalFollowingFeedCacheStore::from_app_data_root(
            root.clone(),
        )?;

    fs::create_dir_all(
        store.cache_dir(),
    )?;

    fs::write(
        store.temp_path(),
        r#"{"recovered":true}"#,
    )?;

    let read =
        store.read_cache_json()?
            .ok_or_else(
                || {
                    test_error(
                        "valid interrupted write was not recovered",
                    )
                },
            )?;

    require(
        read ==
            r#"{"recovered":true}"#,
        "recovered cache bytes changed",
    )?;

    require(
        store.cache_path().exists(),
        "recovered record was not promoted",
    )?;

    require(
        store.temp_path().exists() == false,
        "temporary file remained after promotion",
    )?;

    cleanup(
        &root,
    );

    Ok(())
}

#[test]
fn phase9a7_invalid_interrupted_write_fails_closed_without_promotion() -> TestResult {
    let root =
        unique_root(
            "invalid-temp",
        )?;

    let store =
        LocalFollowingFeedCacheStore::from_app_data_root(
            root.clone(),
        )?;

    fs::create_dir_all(
        store.cache_dir(),
    )?;

    fs::write(
        store.temp_path(),
        "not-json",
    )?;

    let error =
        store.read_cache_json()
            .err()
            .ok_or_else(
                || {
                    test_error(
                        "invalid interrupted write was accepted",
                    )
                },
            )?;

    require(
        error_kind(
            &error,
        ) ==
            "invalid_json",
        "wrong invalid-temp error",
    )?;

    require(
        store.cache_path().exists() == false,
        "invalid temporary file was promoted",
    )?;

    cleanup(
        &root,
    );

    Ok(())
}
