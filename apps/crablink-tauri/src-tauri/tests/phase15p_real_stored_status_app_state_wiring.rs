use std::{
    fs,
    path::{Path, PathBuf},
    sync::atomic::{AtomicU64, Ordering},
    time::{SystemTime, UNIX_EPOCH},
};

use crablink_tauri_lib::{
    passport_status_runtime::{
        inspect_stored_passport_status, stored_passport_status_runtime_posture,
        StoredPassportStatus, NATIVE_PASSPORT_PHASE15P_LABEL,
    },
    passport_vault_store::DesktopAtomicVaultStore,
};
use svc_passport::native::{write_native_encrypted_vault_atomic, NativeEncryptedVaultV1};

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
            "crablink-phase15p-{label}-{}-{timestamp}-{counter}",
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

fn extract_function<'a>(source: &'a str, function_name: &str) -> &'a str {
    let signature = format!("pub fn {function_name}");

    let start = source
        .find(&signature)
        .unwrap_or_else(|| panic!("function missing: {function_name}"));

    let relative_open = source[start..].find('{').expect("function opening brace");

    let open = start + relative_open;
    let bytes = source.as_bytes();
    let mut depth = 0usize;

    for index in open..bytes.len() {
        match bytes[index] {
            b'{' => depth += 1,
            b'}' => {
                depth -= 1;

                if depth == 0 {
                    return &source[start..=index];
                }
            }
            _ => {}
        }
    }

    panic!("function closing brace missing: {function_name}");
}

#[test]
fn phase15p_posture_is_read_only_and_truthful() {
    let posture = stored_passport_status_runtime_posture();

    assert_eq!(posture.phase_label, NATIVE_PASSPORT_PHASE15P_LABEL);

    assert!(posture.managed_vault_store_read);
    assert!(posture.absent_vault_maps_to_no_passport);
    assert!(posture.encrypted_vault_maps_to_locked);
    assert!(posture.bounded_encrypted_load_reused);
    assert!(posture.storage_errors_fail_closed);

    assert!(!posture.platform_sealer_accessed);
    assert!(!posture.vault_decryption_added);
    assert!(!posture.vault_identity_parsing_added);
    assert!(!posture.unlock_added);
    assert!(!posture.root_confirmation_added);
    assert!(!posture.storage_mutation_added);
    assert!(!posture.frontend_secret_custody_added);
    assert!(!posture.capability_issuance_added);
    assert!(!posture.wallet_or_ledger_mutation_added);
}

#[test]
fn phase15p_absent_vault_reports_no_passport() {
    let directory = TestDirectory::new("absent");

    let store =
        DesktopAtomicVaultStore::new(directory.path().to_path_buf()).expect("desktop VaultStore");

    assert_eq!(
        inspect_stored_passport_status(&store).expect("stored status"),
        StoredPassportStatus::NoPassport
    );
}

#[test]
fn phase15p_valid_encrypted_vault_reports_locked() {
    let directory = TestDirectory::new("locked");

    let store =
        DesktopAtomicVaultStore::new(directory.path().to_path_buf()).expect("desktop VaultStore");

    let encrypted_vault = NativeEncryptedVaultV1::new(b"phase15p-bounded-encrypted-vault".to_vec())
        .expect("bounded encrypted vault");

    write_native_encrypted_vault_atomic(&store, &encrypted_vault).expect("write encrypted vault");

    assert_eq!(
        inspect_stored_passport_status(&store).expect("stored status"),
        StoredPassportStatus::Locked
    );
}

#[test]
fn phase15p_invalid_encrypted_vault_fails_closed() {
    let directory = TestDirectory::new("invalid");

    let store =
        DesktopAtomicVaultStore::new(directory.path().to_path_buf()).expect("desktop VaultStore");

    fs::create_dir_all(store.root_directory()).expect("create VaultStore directory");

    fs::write(store.vault_path(), []).expect("write invalid empty vault");

    assert!(inspect_stored_passport_status(&store).is_err());
}

#[test]
fn phase15p_command_reads_only_managed_vault_store() {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));

    let command_source =
        fs::read_to_string(root.join("src/commands/passport.rs")).expect("Passport command source");

    let runtime_source = fs::read_to_string(root.join("src/passport_status_runtime.rs"))
        .expect("status runtime source");

    let lib_source = fs::read_to_string(root.join("src/lib.rs")).expect("Tauri library source");

    let command = extract_function(&command_source, "passport_status");

    for required in [
        "State<'_, AppState>",
        "inspect_stored_passport_status",
        "state.passport_vault_store",
        "StoredPassportStatus::NoPassport",
        "StoredPassportStatus::Locked",
        "unavailable_problem()",
        "build_passport_status",
    ] {
        assert!(
            command.contains(required),
            "Phase 15P command missing {required}"
        );
    }

    for forbidden in [
        "passport_platform_sealer",
        ".seal(",
        ".unseal(",
        "seal_native_secret",
        "unseal_native_secret",
        "decrypt(",
        "unlock_vault(",
        "write_native_encrypted_vault_atomic",
        "remove_native_encrypted_vault",
        "capability_token",
        "wallet.spend(",
        "ledger.write(",
    ] {
        assert!(
            !command.contains(forbidden),
            "Phase 15P command contains forbidden surface {forbidden}"
        );
    }

    for required in [
        "load_native_encrypted_vault",
        "StoredPassportStatus::Locked",
        "StoredPassportStatus::NoPassport",
    ] {
        assert!(
            runtime_source.contains(required),
            "Phase 15P runtime missing {required}"
        );
    }

    for forbidden in [
        ".seal(",
        ".unseal(",
        "decrypt(",
        "unlock_vault(",
        "write_native_encrypted_vault_atomic",
        "remove_native_encrypted_vault",
        "#[tauri::command]",
        "serde::Serialize",
        "println!",
        "eprintln!",
        "tracing::",
    ] {
        assert!(
            !runtime_source.contains(forbidden),
            "Phase 15P runtime contains forbidden surface {forbidden}"
        );
    }

    assert!(lib_source.contains("pub mod passport_status_runtime;"));

    assert_eq!(
        lib_source
            .matches("commands::passport::passport_status")
            .count(),
        1
    );
}
