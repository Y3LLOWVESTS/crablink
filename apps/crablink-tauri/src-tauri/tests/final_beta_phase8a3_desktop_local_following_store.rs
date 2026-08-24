//! FINAL_BETA Phase 8A3 focused tests for native local-following persistence.

use crablink_tauri_lib::local_following_store::{
    initialize_desktop_local_following_store, validate_local_following_record,
    DesktopLocalFollowingStore, LocalFollowingEntryV1, LocalFollowingRecordV1,
    LocalFollowingRecoveryOutcome, LocalFollowingStoreError, FINAL_BETA_PHASE8A3_LABEL,
    LOCAL_FOLLOWING_DIRECTORY_NAME, LOCAL_FOLLOWING_FILE_NAME, LOCAL_FOLLOWING_MAX_ENTRIES,
    LOCAL_FOLLOWING_MAX_FILE_BYTES, LOCAL_FOLLOWING_SCHEMA, LOCAL_FOLLOWING_TEMPORARY_FILE_NAME,
};

use std::{
    fs::{self, File},
    path::{Path, PathBuf},
    sync::atomic::{AtomicU64, Ordering},
    time::{SystemTime, UNIX_EPOCH},
};

#[cfg(unix)]
use std::os::unix::fs::symlink;

static TEST_DIRECTORY_COUNTER: AtomicU64 = AtomicU64::new(0);

struct TestDirectory {
    path: PathBuf,
}

impl TestDirectory {
    fn new(label: &str) -> Self {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("test clock after Unix epoch")
            .as_nanos();

        let counter = TEST_DIRECTORY_COUNTER.fetch_add(1, Ordering::Relaxed);

        let path = std::env::temp_dir().join(format!(
            "crablink-phase8a3-{label}-{}-{timestamp}-{counter}",
            std::process::id(),
        ));

        Self { path }
    }

    fn path(&self) -> &Path {
        &self.path
    }
}

impl Drop for TestDirectory {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.path);
    }
}

fn entry(username: &str) -> LocalFollowingEntryV1 {
    LocalFollowingEntryV1 {
        profile_ref: ["crab://@", username].concat(),
        username: username.to_string(),
        followed_at: "2026-08-09T18:00:00.000Z".to_string(),
        last_timeline_cursor: None,
        last_refresh_at: None,
    }
}

fn record(entries: Vec<LocalFollowingEntryV1>) -> LocalFollowingRecordV1 {
    LocalFollowingRecordV1 {
        schema: LOCAL_FOLLOWING_SCHEMA.to_string(),
        entries,
        updated_at: "2026-08-09T18:05:00.000Z".to_string(),
    }
}

#[test]
fn phase8a3_fixed_app_data_paths_are_locked() {
    let directory = TestDirectory::new("paths");

    let store =
        DesktopLocalFollowingStore::new(directory.path()).expect("create local following store");

    assert_eq!(
        FINAL_BETA_PHASE8A3_LABEL,
        "FINAL_BETA_PHASE8A3_DESKTOP_LOCAL_FOLLOWING_STORE",
    );

    assert_eq!(
        store.root_directory(),
        directory.path().join(LOCAL_FOLLOWING_DIRECTORY_NAME,),
    );

    assert_eq!(
        store.record_path(),
        store.root_directory().join(LOCAL_FOLLOWING_FILE_NAME,),
    );

    assert_eq!(
        store.temporary_path(),
        store
            .root_directory()
            .join(LOCAL_FOLLOWING_TEMPORARY_FILE_NAME,),
    );

    assert!(store.root_directory().is_absolute(),);
}

#[test]
fn phase8a3_rejects_relative_app_data_root() {
    assert_eq!(
        DesktopLocalFollowingStore::new(Path::new("relative/crablink-data",),)
            .expect_err("relative root must fail",),
        LocalFollowingStoreError::InvalidRoot,
    );
}

#[test]
fn phase8a3_empty_record_round_trips_atomically() {
    let directory = TestDirectory::new("empty-round-trip");

    let store =
        DesktopLocalFollowingStore::new(directory.path()).expect("create local following store");

    let expected = record(Vec::new());

    store
        .write_atomic(&expected)
        .expect("write empty local following record");

    assert_eq!(
        store.load().expect("load local following record",),
        Some(expected),
    );

    assert!(store.temporary_path().exists() == false,);
}

#[test]
fn phase8a3_following_entry_round_trip_and_replacement_are_green() {
    let directory = TestDirectory::new("replacement");

    let store =
        DesktopLocalFollowingStore::new(directory.path()).expect("create local following store");

    let first = record(vec![entry("rustycreator")]);

    store.write_atomic(&first).expect("write first record");

    let second = record(vec![entry("secondcreator")]);

    store.write_atomic(&second).expect("replace record");

    assert_eq!(store.load().expect("load replaced record",), Some(second),);
}

#[test]
fn phase8a3_strict_record_validation_rejects_schema_duplicates_and_profile_mismatch() {
    let mut bad_schema = record(Vec::new());

    bad_schema.schema = "crablink.local-following.v2".to_string();

    assert_eq!(
        validate_local_following_record(&bad_schema,),
        Err(LocalFollowingStoreError::InvalidRecord,),
    );

    let duplicate = record(vec![entry("rustycreator"), entry("rustycreator")]);

    assert_eq!(
        validate_local_following_record(&duplicate,),
        Err(LocalFollowingStoreError::InvalidRecord,),
    );

    let mut mismatch_entry = entry("rustycreator");

    mismatch_entry.profile_ref = "crab://@differentcreator".to_string();

    assert_eq!(
        validate_local_following_record(&record(vec![mismatch_entry,],),),
        Err(LocalFollowingStoreError::InvalidRecord,),
    );
}

#[test]
fn phase8a3_validation_rejects_invalid_username_timestamp_and_cursor() {
    let mut invalid_username = entry("rustycreator");

    invalid_username.username = "RustyCreator".to_string();

    invalid_username.profile_ref = "crab://@RustyCreator".to_string();

    assert_eq!(
        validate_local_following_record(&record(vec![invalid_username,],),),
        Err(LocalFollowingStoreError::InvalidRecord,),
    );

    let mut invalid_timestamp = entry("rustycreator");

    invalid_timestamp.followed_at = "yesterday".to_string();

    assert_eq!(
        validate_local_following_record(&record(vec![invalid_timestamp,],),),
        Err(LocalFollowingStoreError::InvalidRecord,),
    );

    let mut invalid_cursor = entry("rustycreator");

    invalid_cursor.last_timeline_cursor = Some("x".repeat(513));

    assert_eq!(
        validate_local_following_record(&record(vec![invalid_cursor,],),),
        Err(LocalFollowingStoreError::InvalidRecord,),
    );
}

#[test]
fn phase8a3_entry_count_is_bounded() {
    let mut entries = Vec::with_capacity(LOCAL_FOLLOWING_MAX_ENTRIES + 1);

    for index in 0..=LOCAL_FOLLOWING_MAX_ENTRIES {
        let username = format!("u{index:05}",);

        entries.push(entry(&username));
    }

    assert_eq!(
        validate_local_following_record(&record(entries,),),
        Err(LocalFollowingStoreError::TooLarge,),
    );
}

#[test]
fn phase8a3_corrupt_and_unknown_field_json_fail_closed() {
    let directory = TestDirectory::new("corrupt");

    let store =
        DesktopLocalFollowingStore::new(directory.path()).expect("create local following store");

    fs::write(
        store.record_path(),
        br#"{
          "schema":"crablink.local-following.v1",
          "entries":[],
          "updatedAt":"2026-08-09T18:05:00.000Z",
          "serverFollowerCount":10
        }"#,
    )
    .expect("write invalid JSON record");

    assert_eq!(store.load(), Err(LocalFollowingStoreError::Json,),);
}

#[test]
fn phase8a3_oversized_disk_record_is_rejected_before_decode() {
    let directory = TestDirectory::new("oversized");

    let store =
        DesktopLocalFollowingStore::new(directory.path()).expect("create local following store");

    let file = File::create(store.record_path()).expect("create oversized fixture");

    file.set_len(LOCAL_FOLLOWING_MAX_FILE_BYTES + 1)
        .expect("set oversized fixture length");

    assert_eq!(store.load(), Err(LocalFollowingStoreError::TooLarge,),);
}

#[test]
fn phase8a3_valid_interrupted_write_is_promoted() {
    let directory = TestDirectory::new("recover-valid");

    let store =
        DesktopLocalFollowingStore::new(directory.path()).expect("create local following store");

    let expected = record(vec![entry("rustycreator")]);

    fs::write(
        store.temporary_path(),
        serde_json::to_vec_pretty(&expected).expect("encode recovery fixture"),
    )
    .expect("write recovery fixture");

    let initialized = initialize_desktop_local_following_store(directory.path())
        .expect("recover interrupted write");

    assert_eq!(
        initialized.recovery_outcome,
        LocalFollowingRecoveryOutcome::ValidTemporaryFilePromoted,
    );

    assert_eq!(
        initialized.store.load().expect("load recovered record",),
        Some(expected),
    );

    assert!(initialized.store.temporary_path().exists() == false,);
}

#[test]
fn phase8a3_existing_record_wins_over_stale_temporary_file() {
    let directory = TestDirectory::new("recover-stale");

    let store =
        DesktopLocalFollowingStore::new(directory.path()).expect("create local following store");

    let expected = record(vec![entry("rustycreator")]);

    store
        .write_atomic(&expected)
        .expect("write canonical record");

    fs::write(store.temporary_path(), b"stale temporary bytes")
        .expect("write stale temporary fixture");

    assert_eq!(
        store
            .recover_interrupted_write()
            .expect("remove stale temporary file",),
        LocalFollowingRecoveryOutcome::StaleTemporaryFileRemoved,
    );

    assert_eq!(
        store.load().expect("load canonical record",),
        Some(expected),
    );

    assert!(store.temporary_path().exists() == false,);
}

#[cfg(unix)]
#[test]
fn phase8a3_symlinked_record_path_is_rejected() {
    let directory = TestDirectory::new("symlink");

    let store =
        DesktopLocalFollowingStore::new(directory.path()).expect("create local following store");

    let outside = directory.path().join("outside.json");

    fs::write(&outside, b"outside").expect("write symlink target");

    symlink(&outside, store.record_path()).expect("create record symlink");

    assert_eq!(store.load(), Err(LocalFollowingStoreError::Io,),);

    assert_eq!(
        store.write_atomic(&record(Vec::new(),),),
        Err(LocalFollowingStoreError::Io,),
    );
}

#[test]
fn phase8a3_native_store_adds_no_network_or_economic_authority() {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR",));

    let source = fs::read_to_string(root.join("src/local_following_store.rs"))
        .expect("read local following store source");

    for forbidden in [
        "#[tauri::command]",
        "reqwest::",
        "tauri::State",
        "wallet.spend(",
        "ledger.write(",
        "follow_profile_network",
        "unfollow_profile_network",
        "follower_count",
        "following_count",
    ] {
        assert!(
            source.contains(forbidden,) == false,
            "native local following store contains forbidden authority marker {forbidden}",
        );
    }
}
