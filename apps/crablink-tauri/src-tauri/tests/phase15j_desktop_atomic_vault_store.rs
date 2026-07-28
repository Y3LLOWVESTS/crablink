use std::{
    fs,
    path::{Path, PathBuf},
    sync::atomic::{AtomicU64, Ordering},
    time::{SystemTime, UNIX_EPOCH},
};

#[cfg(unix)]
use std::os::unix::fs::{symlink, PermissionsExt};

use crablink_tauri_lib::passport_vault_store::{
    desktop_atomic_vault_store_posture, DesktopAtomicVaultStore, NATIVE_PASSPORT_PHASE15J_LABEL,
    PHASE15J_TEMPORARY_FILE_NAME, PHASE15J_VAULT_DIRECTORY_NAME, PHASE15J_VAULT_FILE_NAME,
};
use svc_passport::native::{
    load_native_encrypted_vault, recover_native_interrupted_vault_write,
    remove_native_encrypted_vault, write_native_encrypted_vault_atomic, NativeEncryptedVaultV1,
    NativePlatformStorageError, NativePlatformStorageOperation, NativeVaultRecoveryOutcome,
    NativeVaultRemovalOutcome,
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
            "crablink-phase15j-{label}-{}-{timestamp}-{counter}",
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

fn encrypted_vault(value: &[u8]) -> NativeEncryptedVaultV1 {
    NativeEncryptedVaultV1::new(value.to_vec()).expect("encrypted vault fixture")
}

#[test]
fn phase15j_posture_and_fixed_paths_are_locked() {
    let posture = desktop_atomic_vault_store_posture();

    assert_eq!(posture.phase_label, NATIVE_PASSPORT_PHASE15J_LABEL);
    assert!(posture.encrypted_vault_only);
    assert!(posture.fixed_paths);
    assert!(posture.bounded_reads);
    assert!(posture.temporary_file_create_new);
    assert!(posture.temporary_file_sync);
    assert!(posture.interrupted_write_recovery);
    assert!(posture.stale_temporary_file_cleanup);
    assert!(posture.symlink_targets_rejected);

    assert_eq!(PHASE15J_VAULT_DIRECTORY_NAME, "native-passport");
    assert_eq!(PHASE15J_VAULT_FILE_NAME, "passport.vault.bin");
    assert_eq!(PHASE15J_TEMPORARY_FILE_NAME, "passport.vault.bin.tmp");

    assert!(!posture.app_runtime_state_wired);
    assert!(!posture.passport_commands_wired);
    assert!(!posture.decryption_runtime_added);
    assert!(!posture.platform_sealer_added);
    assert!(!posture.frontend_secret_custody_added);
    assert!(!posture.wallet_or_ledger_mutation_added);

    #[cfg(unix)]
    {
        assert!(posture.parent_directory_sync);
        assert!(posture.atomic_rename);
        assert!(posture.unix_private_permissions);
    }

    assert!(!posture.windows_existing_destination_replace_added);
}

#[test]
fn phase15j_writes_loads_and_removes_encrypted_vault() {
    let root = TestDirectory::new("roundtrip");
    let store = DesktopAtomicVaultStore::new(root.path()).expect("desktop vault store");

    assert_eq!(
        load_native_encrypted_vault(&store).expect("initial load"),
        None
    );

    let first = encrypted_vault(b"encrypted-phase15j-vault-one");

    write_native_encrypted_vault_atomic(&store, &first).expect("first atomic write");

    assert!(store.vault_path().is_file());
    assert!(!store.temporary_path().exists());

    let loaded = load_native_encrypted_vault(&store)
        .expect("load written vault")
        .expect("written vault present");

    assert_eq!(loaded.as_slice(), first.as_slice());

    #[cfg(unix)]
    {
        let second = encrypted_vault(b"encrypted-phase15j-vault-two");

        write_native_encrypted_vault_atomic(&store, &second).expect("atomic replacement");

        let replaced = load_native_encrypted_vault(&store)
            .expect("load replacement")
            .expect("replacement present");

        assert_eq!(replaced.as_slice(), second.as_slice());

        let directory_mode = fs::metadata(store.root_directory())
            .expect("vault directory metadata")
            .permissions()
            .mode()
            & 0o777;

        let vault_mode = fs::metadata(store.vault_path())
            .expect("vault metadata")
            .permissions()
            .mode()
            & 0o777;

        assert_eq!(directory_mode, 0o700);
        assert_eq!(vault_mode, 0o600);
    }

    assert_eq!(
        remove_native_encrypted_vault(&store).expect("remove vault"),
        NativeVaultRemovalOutcome::Removed
    );

    assert_eq!(
        remove_native_encrypted_vault(&store).expect("second remove"),
        NativeVaultRemovalOutcome::NotFound
    );
}

#[test]
fn phase15j_promotes_valid_interrupted_temporary_write() {
    let root = TestDirectory::new("promote");
    let store = DesktopAtomicVaultStore::new(root.path()).expect("desktop vault store");

    fs::create_dir_all(store.root_directory()).expect("create test vault directory");

    fs::write(store.temporary_path(), b"encrypted-interrupted-vault")
        .expect("write interrupted temporary file");

    assert_eq!(
        recover_native_interrupted_vault_write(&store).expect("recover temporary file"),
        NativeVaultRecoveryOutcome::ValidTemporaryFilePromoted
    );

    assert!(store.vault_path().is_file());
    assert!(!store.temporary_path().exists());

    let loaded = load_native_encrypted_vault(&store)
        .expect("load recovered vault")
        .expect("recovered vault present");

    assert_eq!(loaded.as_slice(), b"encrypted-interrupted-vault");
}

#[test]
fn phase15j_discards_stale_or_invalid_temporary_files() {
    let stale_root = TestDirectory::new("stale");
    let stale_store = DesktopAtomicVaultStore::new(stale_root.path()).expect("desktop vault store");

    let committed = encrypted_vault(b"encrypted-committed-vault");

    write_native_encrypted_vault_atomic(&stale_store, &committed).expect("write committed vault");

    fs::write(
        stale_store.temporary_path(),
        b"encrypted-stale-temporary-vault",
    )
    .expect("write stale temporary file");

    assert_eq!(
        recover_native_interrupted_vault_write(&stale_store,)
            .expect("discard stale temporary file"),
        NativeVaultRecoveryOutcome::StaleTemporaryFileRemoved
    );

    let loaded = load_native_encrypted_vault(&stale_store)
        .expect("load committed vault")
        .expect("committed vault present");

    assert_eq!(loaded.as_slice(), committed.as_slice());
    assert!(!stale_store.temporary_path().exists());

    let invalid_root = TestDirectory::new("invalid");
    let invalid_store =
        DesktopAtomicVaultStore::new(invalid_root.path()).expect("desktop vault store");

    fs::create_dir_all(invalid_store.root_directory()).expect("create invalid test directory");

    fs::write(invalid_store.temporary_path(), []).expect("write empty temporary file");

    assert_eq!(
        recover_native_interrupted_vault_write(&invalid_store,)
            .expect("discard invalid temporary file"),
        NativeVaultRecoveryOutcome::StaleTemporaryFileRemoved
    );

    assert!(!invalid_store.temporary_path().exists());
    assert!(!invalid_store.vault_path().exists());
}

#[test]
fn phase15j_rejects_relative_roots_and_symlink_targets() {
    assert_eq!(
        DesktopAtomicVaultStore::new(PathBuf::from("relative/native-passport"),),
        Err(NativePlatformStorageError::BackendFailure {
            operation: NativePlatformStorageOperation::LoadEncryptedVault,
        })
    );

    #[cfg(unix)]
    {
        let root = TestDirectory::new("symlink");
        let external = TestDirectory::new("external");

        fs::create_dir_all(root.path()).expect("create vault directory");

        fs::create_dir_all(external.path()).expect("create external directory");

        let external_file = external.path().join("external-vault.bin");

        fs::write(&external_file, b"encrypted-external-vault").expect("write external vault");

        let store = DesktopAtomicVaultStore::new(root.path()).expect("desktop vault store");

        symlink(&external_file, store.vault_path()).expect("create vault symlink");

        assert_eq!(
            load_native_encrypted_vault(&store),
            Err(NativePlatformStorageError::BackendFailure {
                operation: NativePlatformStorageOperation::LoadEncryptedVault,
            })
        );
    }
}

#[test]
fn phase15j_source_has_no_command_unlock_or_secret_export_surface() {
    let source_path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("src/passport_vault_store.rs");

    let source = fs::read_to_string(source_path).expect("Phase 15J adapter source");

    for required in [
        "impl NativeVaultStore for DesktopAtomicVaultStore",
        "create_new(true)",
        "write_all(vault.as_slice())",
        "sync_all()",
        "fs::rename(",
        "recover_interrupted_write",
        "StaleTemporaryFileRemoved",
        "ValidTemporaryFilePromoted",
        "symlink_metadata",
    ] {
        assert!(
            source.contains(required),
            "Phase 15J adapter missing {required}"
        );
    }

    for forbidden in [
        "#[tauri::command]",
        "serde::Serialize",
        "println!",
        "eprintln!",
        "tracing::",
        "unlock_vault(",
        "platform_unseal(",
        "decrypt(",
        "seed_phrase",
        "private_key",
        "capability_token",
        "wallet.spend(",
        "ledger.write(",
    ] {
        assert!(
            !source.contains(forbidden),
            "Phase 15J adapter contains forbidden surface {forbidden}"
        );
    }
}
