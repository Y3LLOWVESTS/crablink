use std::{
    fs,
    path::{Path, PathBuf},
    sync::atomic::{AtomicU64, Ordering},
    time::{SystemTime, UNIX_EPOCH},
};

use crablink_tauri_lib::{
    passport_vault_runtime::{
        desktop_passport_vault_root, desktop_passport_vault_runtime_posture,
        initialize_desktop_passport_vault_store, NATIVE_PASSPORT_PHASE15K_LABEL,
    },
    passport_vault_store::{
        PHASE15J_TEMPORARY_FILE_NAME, PHASE15J_VAULT_DIRECTORY_NAME, PHASE15J_VAULT_FILE_NAME,
    },
};
use svc_passport::native::{
    load_native_encrypted_vault, NativePlatformStorageError, NativePlatformStorageOperation,
    NativeVaultRecoveryOutcome,
};

static TEST_DIRECTORY_COUNTER: AtomicU64 = AtomicU64::new(0);

struct TestDirectory {
    path: PathBuf,
}

impl TestDirectory {
    fn new(label: &str) -> Self {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("clock after Unix epoch")
            .as_nanos();

        let counter = TEST_DIRECTORY_COUNTER.fetch_add(1, Ordering::Relaxed);

        let path = std::env::temp_dir().join(format!(
            "crablink-phase15k-{label}-{}-{timestamp}-{counter}",
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

#[test]
fn phase15k_posture_locks_windows_and_app_data_wiring() {
    let posture = desktop_passport_vault_runtime_posture();

    assert_eq!(posture.phase_label, NATIVE_PASSPORT_PHASE15K_LABEL);

    assert!(posture.windows_replace_existing_added);
    assert!(posture.windows_write_through_added);
    assert!(posture.tauri_app_data_root_used);
    assert!(posture.fixed_native_passport_child_directory);
    assert!(posture.startup_interrupted_write_recovery_added);
    assert!(posture.app_state_store_wiring_added);
    assert!(posture.encrypted_vault_only);

    assert!(!posture.platform_sealer_added);
    assert!(!posture.decryption_runtime_added);
    assert!(!posture.pin_unlock_added);
    assert!(!posture.command_storage_mutation_added);
    assert!(!posture.frontend_secret_custody_added);
    assert!(!posture.wallet_or_ledger_mutation_added);
}

#[test]
fn phase15k_resolves_fixed_vault_root_under_app_data() {
    let app_data = TestDirectory::new("root");

    let root = desktop_passport_vault_root(app_data.path()).expect("desktop Passport vault root");

    assert_eq!(root, app_data.path().join(PHASE15J_VAULT_DIRECTORY_NAME));

    assert_eq!(
        root.join(PHASE15J_VAULT_FILE_NAME)
            .file_name()
            .and_then(|name| name.to_str()),
        Some(PHASE15J_VAULT_FILE_NAME)
    );

    assert_eq!(
        root.join(PHASE15J_TEMPORARY_FILE_NAME)
            .file_name()
            .and_then(|name| name.to_str()),
        Some(PHASE15J_TEMPORARY_FILE_NAME)
    );
}

#[test]
fn phase15k_startup_promotes_valid_interrupted_write() {
    let app_data = TestDirectory::new("recovery");

    let vault_root = app_data.path().join(PHASE15J_VAULT_DIRECTORY_NAME);

    fs::create_dir_all(&vault_root).expect("create native Passport directory");

    fs::write(
        vault_root.join(PHASE15J_TEMPORARY_FILE_NAME),
        b"encrypted-phase15k-interrupted-vault",
    )
    .expect("write interrupted encrypted vault");

    let initialized = initialize_desktop_passport_vault_store(app_data.path())
        .expect("initialize desktop Passport VaultStore");

    assert_eq!(
        initialized.recovery_outcome,
        NativeVaultRecoveryOutcome::ValidTemporaryFilePromoted
    );

    assert_eq!(initialized.store.root_directory(), vault_root);

    let loaded = load_native_encrypted_vault(&initialized.store)
        .expect("load recovered vault")
        .expect("recovered vault present");

    assert_eq!(loaded.as_slice(), b"encrypted-phase15k-interrupted-vault");

    assert!(!initialized.store.temporary_path().exists());
}

#[test]
fn phase15k_rejects_relative_app_data_root() {
    assert_eq!(
        desktop_passport_vault_root(Path::new("relative/crablink-data",)),
        Err(NativePlatformStorageError::BackendFailure {
            operation: NativePlatformStorageOperation::LoadEncryptedVault,
        })
    );
}

#[test]
fn phase15k_windows_replace_source_and_dependency_are_locked() {
    let manifest_root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));

    let cargo = fs::read_to_string(manifest_root.join("Cargo.toml")).expect("Tauri Cargo.toml");

    let store_source = fs::read_to_string(manifest_root.join("src/passport_vault_store.rs"))
        .expect("desktop VaultStore source");

    assert!(cargo.contains("[target.'cfg(windows)'.dependencies]"));
    assert!(cargo.contains("windows-sys = { version = \"0.61\""));
    assert!(cargo.contains("\"Win32_Storage_FileSystem\""));

    for required in [
        "#[cfg(windows)]",
        "MoveFileExW",
        "MOVEFILE_REPLACE_EXISTING",
        "MOVEFILE_WRITE_THROUGH",
        "encode_wide()",
        "destination_exists",
    ] {
        assert!(
            store_source.contains(required),
            "Windows atomic replacement missing {required}"
        );
    }
}

#[test]
fn phase15k_tauri_setup_and_app_state_store_wiring_are_locked() {
    let manifest_root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));

    let lib_source =
        fs::read_to_string(manifest_root.join("src/lib.rs")).expect("Tauri lib source");

    let state_source =
        fs::read_to_string(manifest_root.join("src/state.rs")).expect("Tauri state source");

    let runtime_source = fs::read_to_string(manifest_root.join("src/passport_vault_runtime.rs"))
        .expect("Passport vault runtime source");

    for required in [
        "pub mod passport_vault_runtime;",
        "app.path().app_data_dir()",
        "initialize_desktop_passport_vault_store",
        "AppState::with_native_passport_runtime",
        "app.manage(state)",
    ] {
        assert!(
            lib_source.contains(required),
            "Tauri startup wiring missing {required}"
        );
    }

    for required in [
        "pub passport_vault_store: DesktopAtomicVaultStore",
        "pub fn with_native_passport_runtime",
    ] {
        assert!(
            state_source.contains(required),
            "AppState wiring missing {required}"
        );
    }

    for forbidden in [
        "#[tauri::command]",
        "decrypt(",
        "platform_unseal(",
        "unlock_vault(",
        "seed_phrase",
        "private_key",
        "capability_token",
        "wallet.spend(",
        "ledger.write(",
    ] {
        assert!(
            !runtime_source.contains(forbidden),
            "Phase 15K runtime contains forbidden surface {forbidden}"
        );
    }
}
