//! FINAL_BETA Phase 8A4 focused tests for the desktop local-following command bridge.

use crablink_tauri_lib::{
    local_following_store::{
        DesktopLocalFollowingStore, LocalFollowingEntryV1, LocalFollowingRecordV1,
        LOCAL_FOLLOWING_SCHEMA,
    },
    phase8a4_test_support::{
        read_local_following_from_store, write_local_following_to_store, FINAL_BETA_PHASE8A4_LABEL,
        LOCAL_FOLLOWING_READ_COMMAND, LOCAL_FOLLOWING_READ_FAILED_MESSAGE,
        LOCAL_FOLLOWING_WRITE_COMMAND, LOCAL_FOLLOWING_WRITE_FAILED_MESSAGE,
    },
};

use std::{
    fs,
    path::{Path, PathBuf},
    sync::atomic::{AtomicU64, Ordering},
    time::{SystemTime, UNIX_EPOCH},
};

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
            "crablink-phase8a4-{label}-{}-{timestamp}-{counter}",
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
fn phase8a4_command_names_and_label_are_locked() {
    assert_eq!(
        FINAL_BETA_PHASE8A4_LABEL,
        "FINAL_BETA_PHASE8A4_DESKTOP_LOCAL_FOLLOWING_COMMAND_BRIDGE",
    );

    assert_eq!(LOCAL_FOLLOWING_READ_COMMAND, "local_following_read",);

    assert_eq!(LOCAL_FOLLOWING_WRITE_COMMAND, "local_following_write",);
}

#[test]
fn phase8a4_read_preserves_absent_local_state() {
    let directory = TestDirectory::new("read-empty");

    let store = DesktopLocalFollowingStore::new(directory.path()).expect("create following store");

    assert_eq!(
        read_local_following_from_store(&store,).expect("read empty following state",),
        None,
    );
}

#[test]
fn phase8a4_write_and_read_round_trip_the_versioned_record() {
    let directory = TestDirectory::new("round-trip");

    let store = DesktopLocalFollowingStore::new(directory.path()).expect("create following store");

    let expected = record(vec![entry("rustycreator")]);

    let written = write_local_following_to_store(&store, &expected).expect("write following state");

    assert_eq!(written, expected,);

    assert_eq!(
        read_local_following_from_store(&store,).expect("read following state",),
        Some(expected),
    );
}

#[test]
fn phase8a4_invalid_record_returns_generic_write_failure() {
    let directory = TestDirectory::new("generic-write-error");

    let store = DesktopLocalFollowingStore::new(directory.path()).expect("create following store");

    let invalid = LocalFollowingRecordV1 {
        schema: "crablink.local-following.v2".to_string(),
        entries: Vec::new(),
        updated_at: "2026-08-09T18:05:00.000Z".to_string(),
    };

    assert_eq!(
        write_local_following_to_store(&store, &invalid,),
        Err(LOCAL_FOLLOWING_WRITE_FAILED_MESSAGE.to_string(),),
    );
}

#[test]
fn phase8a4_corrupt_disk_state_returns_generic_read_failure() {
    let directory = TestDirectory::new("generic-read-error");

    let store = DesktopLocalFollowingStore::new(directory.path()).expect("create following store");

    fs::write(store.record_path(), b"corrupt local following bytes")
        .expect("write corrupt fixture");

    assert_eq!(
        read_local_following_from_store(&store,),
        Err(LOCAL_FOLLOWING_READ_FAILED_MESSAGE.to_string(),),
    );
}

#[test]
fn phase8a4_app_state_and_desktop_setup_wire_one_serialized_store() {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR",));

    let state = fs::read_to_string(root.join("src/state.rs")).expect("read AppState source");

    let lib = fs::read_to_string(root.join("src/lib.rs")).expect("read Tauri lib source");

    assert!(state.contains("Option<Mutex<DesktopLocalFollowingStore>>",),);

    assert!(state.contains("with_native_passport_runtime_and_local_following",),);

    assert!(lib.contains("initialize_desktop_local_following_store(&app_data_directory)",),);

    assert!(lib.contains("AppState::with_native_passport_runtime_and_local_following",),);
}

#[test]
fn phase8a4_handler_registers_exactly_the_reviewed_read_write_commands() {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR",));

    let lib = fs::read_to_string(root.join("src/lib.rs")).expect("read Tauri lib source");

    assert_eq!(
        lib.matches("commands::local_following::local_following_read",)
            .count(),
        1,
    );

    assert_eq!(
        lib.matches("commands::local_following::local_following_write",)
            .count(),
        1,
    );
}

#[test]
fn phase8a4_command_bridge_adds_no_social_graph_or_economic_authority() {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR",));

    let source = fs::read_to_string(root.join("src/commands/local_following.rs"))
        .expect("read local following command source");

    let executable_source = source
        .lines()
        .filter(|line| {
            let trimmed = line.trim_start();

            trimmed.starts_with("//") == false
        })
        .collect::<Vec<_>>()
        .join("\n")
        .to_lowercase();

    for forbidden in [
        "reqwest::",
        ".get(",
        ".post(",
        "follow_profile",
        "unfollow_profile",
        "follower_count",
        "following_count",
        "upload_following",
        "wallet",
        "ledger",
        "receipt",
        "quickchain",
        "solana",
    ] {
        assert!(
            executable_source.contains(
                forbidden,
            ) == false,
            "local following command bridge contains forbidden executable authority marker {forbidden}",
        );
    }
}
