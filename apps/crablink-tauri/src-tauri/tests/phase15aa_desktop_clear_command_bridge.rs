use std::sync::{
    atomic::{AtomicBool, AtomicUsize, Ordering},
    Mutex,
};

use crablink_tauri_lib::{
    passport_clear_command_runtime::{
        clear_desktop_native_passport, desktop_native_passport_clear_command_posture,
        DesktopNativePassportClearCommandState, NATIVE_PASSPORT_PHASE15AA_LABEL,
    },
    passport_operational_unlock_runtime::{
        unlock_desktop_native_passport_operational, DesktopOperationalVaultSessionState,
        DesktopOperationalVaultSessionStore,
    },
    passport_status_runtime::{inspect_stored_passport_status, StoredPassportStatus},
    passport_vault_create_runtime::create_desktop_native_passport_vault,
};
use svc_passport::native::{
    NativeEncryptedVaultV1, NativePlatformFamily, NativePlatformSealer, NativePlatformStorageError,
    NativePlatformStorageOperation, NativeSealedMaterialV1, NativeSecretBytes,
    NativeSecureCompartment, NativeVaultRecoveryOutcome, NativeVaultRemovalOutcome,
    NativeVaultStore,
};

const TEST_PIN: &[u8] = b"phase15aa-clear-pin";
const EXISTING_VAULT_BYTES: &[u8] = b"phase15aa-existing-vault";

#[derive(Default)]
struct MemoryVaultStore {
    vault: Mutex<Option<NativeEncryptedVaultV1>>,
    load_calls: AtomicUsize,
    write_calls: AtomicUsize,
    remove_calls: AtomicUsize,
    fail_remove: AtomicBool,
}

impl MemoryVaultStore {
    fn enable_remove_failure(&self) {
        self.fail_remove.store(true, Ordering::SeqCst);
    }

    fn load_calls(&self) -> usize {
        self.load_calls.load(Ordering::SeqCst)
    }

    fn write_calls(&self) -> usize {
        self.write_calls.load(Ordering::SeqCst)
    }

    fn remove_calls(&self) -> usize {
        self.remove_calls.load(Ordering::SeqCst)
    }

    fn has_vault(&self) -> bool {
        self.vault.lock().expect("memory vault lock").is_some()
    }
}

impl NativeVaultStore for MemoryVaultStore {
    fn load_encrypted_vault(
        &self,
    ) -> Result<Option<NativeEncryptedVaultV1>, NativePlatformStorageError> {
        self.load_calls.fetch_add(1, Ordering::SeqCst);

        Ok(self.vault.lock().expect("memory vault lock").clone())
    }

    fn write_encrypted_vault_atomic(
        &self,
        vault: &NativeEncryptedVaultV1,
    ) -> Result<(), NativePlatformStorageError> {
        self.write_calls.fetch_add(1, Ordering::SeqCst);

        *self.vault.lock().expect("memory vault lock") = Some(vault.clone());

        Ok(())
    }

    fn recover_interrupted_write(
        &self,
    ) -> Result<NativeVaultRecoveryOutcome, NativePlatformStorageError> {
        Ok(NativeVaultRecoveryOutcome::NoRecoveryNeeded)
    }

    fn remove_encrypted_vault(
        &self,
    ) -> Result<NativeVaultRemovalOutcome, NativePlatformStorageError> {
        self.remove_calls.fetch_add(1, Ordering::SeqCst);

        if self.fail_remove.load(Ordering::SeqCst) {
            return Err(NativePlatformStorageError::BackendFailure {
                operation: NativePlatformStorageOperation::RemoveEncryptedVault,
            });
        }

        let removed = self
            .vault
            .lock()
            .expect("memory vault lock")
            .take()
            .is_some();

        Ok(if removed {
            NativeVaultRemovalOutcome::Removed
        } else {
            NativeVaultRemovalOutcome::NotFound
        })
    }
}

#[derive(Default)]
struct MemoryPlatformSealer {
    sealed: Mutex<Vec<(NativeSecureCompartment, NativeSecretBytes)>>,
    unseal_calls: AtomicUsize,
}

impl MemoryPlatformSealer {
    fn unseal_calls(&self) -> usize {
        self.unseal_calls.load(Ordering::SeqCst)
    }
}

impl NativePlatformSealer for MemoryPlatformSealer {
    fn platform_family(&self) -> NativePlatformFamily {
        NativePlatformFamily::MacosKeychain
    }

    fn seal(
        &self,
        compartment: NativeSecureCompartment,
        material: &NativeSecretBytes,
    ) -> Result<NativeSealedMaterialV1, NativePlatformStorageError> {
        let material_copy = NativeSecretBytes::new(material.as_slice().to_vec()).map_err(|_| {
            NativePlatformStorageError::BackendFailure {
                operation: NativePlatformStorageOperation::Seal,
            }
        })?;

        self.sealed
            .lock()
            .map_err(|_| NativePlatformStorageError::BackendFailure {
                operation: NativePlatformStorageOperation::Seal,
            })?
            .push((compartment, material_copy));

        NativeSealedMaterialV1::new(
            NativePlatformFamily::MacosKeychain,
            compartment,
            format!("memory://phase15aa/{compartment:?}").into_bytes(),
        )
    }

    fn unseal(
        &self,
        sealed: &NativeSealedMaterialV1,
    ) -> Result<NativeSecretBytes, NativePlatformStorageError> {
        self.unseal_calls.fetch_add(1, Ordering::SeqCst);

        let materials =
            self.sealed
                .lock()
                .map_err(|_| NativePlatformStorageError::BackendFailure {
                    operation: NativePlatformStorageOperation::Unseal,
                })?;

        let (_, material) = materials
            .iter()
            .rev()
            .find(|(compartment, _)| *compartment == sealed.compartment)
            .ok_or(NativePlatformStorageError::BackendFailure {
                operation: NativePlatformStorageOperation::Unseal,
            })?;

        NativeSecretBytes::new(material.as_slice().to_vec()).map_err(|_| {
            NativePlatformStorageError::BackendFailure {
                operation: NativePlatformStorageOperation::Unseal,
            }
        })
    }
}

fn create_vault_and_unlock_session() -> (
    MemoryVaultStore,
    DesktopOperationalVaultSessionStore,
    MemoryPlatformSealer,
) {
    let store = MemoryVaultStore::default();
    let sealer = MemoryPlatformSealer::default();
    let session = DesktopOperationalVaultSessionStore::default();

    create_desktop_native_passport_vault(&store, &sealer, TEST_PIN)
        .expect("create platform-bound test vault");

    unlock_desktop_native_passport_operational(&store, &sealer, &session, TEST_PIN)
        .expect("unlock operational test session");

    assert_eq!(
        session.state().expect("precondition session state"),
        DesktopOperationalVaultSessionState::OperationalUnlocked,
    );

    assert!(session
        .operational_vmk_len()
        .expect("precondition VMK length")
        .is_some());

    (store, session, sealer)
}

#[test]
fn phase15aa_clear_removes_vault_drops_session_and_status_returns_no_passport() {
    let (store, session, sealer) = create_vault_and_unlock_session();

    let outcome = clear_desktop_native_passport(&store, &session);

    assert_eq!(
        outcome.state,
        DesktopNativePassportClearCommandState::Cleared
    );
    assert!(outcome.session_dropped);
    assert!(outcome.encrypted_vault_removed);

    assert_eq!(store.remove_calls(), 1);
    assert_eq!(store.write_calls(), 1);
    assert!(!store.has_vault());

    assert_eq!(
        session.state().expect("post-clear session state"),
        DesktopOperationalVaultSessionState::Locked,
    );

    assert_eq!(
        session
            .operational_vmk_len()
            .expect("post-clear operational VMK length"),
        None,
    );

    assert_eq!(
        inspect_stored_passport_status(&store).expect("post-clear stored status"),
        StoredPassportStatus::NoPassport,
    );

    assert_eq!(store.load_calls(), 3);
    assert_eq!(sealer.unseal_calls(), 1);
}

#[test]
fn phase15aa_clear_absent_vault_is_idempotent_and_keeps_session_locked() {
    let store = MemoryVaultStore::default();
    let session = DesktopOperationalVaultSessionStore::default();

    let outcome = clear_desktop_native_passport(&store, &session);

    assert_eq!(
        outcome.state,
        DesktopNativePassportClearCommandState::NoPassport,
    );
    assert!(!outcome.session_dropped);
    assert!(!outcome.encrypted_vault_removed);

    assert_eq!(store.remove_calls(), 1);
    assert_eq!(store.write_calls(), 0);
    assert!(!store.has_vault());

    assert_eq!(
        session.state().expect("absent-clear session state"),
        DesktopOperationalVaultSessionState::Locked,
    );
}

#[test]
fn phase15aa_clear_storage_failure_drops_session_but_reports_redacted_unavailable() {
    let (store, session, _sealer) = create_vault_and_unlock_session();

    store.enable_remove_failure();

    let outcome = clear_desktop_native_passport(&store, &session);

    assert_eq!(
        outcome.state,
        DesktopNativePassportClearCommandState::Unavailable,
    );
    assert!(outcome.session_dropped);
    assert!(!outcome.encrypted_vault_removed);

    assert_eq!(store.remove_calls(), 1);
    assert_eq!(store.write_calls(), 1);
    assert!(store.has_vault());

    assert_eq!(
        session.state().expect("failed-clear session state"),
        DesktopOperationalVaultSessionState::Locked,
    );
}

#[test]
fn phase15aa_posture_and_live_command_surface_are_redacted() {
    let posture = desktop_native_passport_clear_command_posture();

    assert_eq!(posture.phase_label, NATIVE_PASSPORT_PHASE15AA_LABEL);
    assert!(posture.public_clear_command_added);
    assert!(posture.operational_session_dropped_first);
    assert!(posture.encrypted_vault_remove_contract_reused);
    assert!(posture.not_found_maps_to_no_passport);
    assert!(posture.status_after_clear_is_no_passport);
    assert!(!posture.native_secure_input_requested);
    assert!(!posture.pin_received_from_webview);
    assert!(!posture.secret_material_returned);
    assert!(!posture.platform_sealer_accessed);
    assert!(!posture.recovery_root_unsealed);
    assert!(!posture.root_vmk_unlocked);
    assert!(!posture.capability_issuance_added);
    assert!(!posture.username_mutation_added);
    assert!(!posture.wallet_or_ledger_mutation_added);

    let root = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let runtime = std::fs::read_to_string(root.join("src/passport_clear_command_runtime.rs"))
        .expect("clear command runtime source");
    let commands =
        std::fs::read_to_string(root.join("src/commands/passport.rs")).expect("commands source");
    let lib = std::fs::read_to_string(root.join("src/lib.rs")).expect("lib source");

    for required in [
        "remove_native_encrypted_vault",
        "session_store.lock()",
        "NativeVaultRemovalOutcome::Removed",
        "NativeVaultRemovalOutcome::NotFound",
        "DesktopNativePassportClearCommandState::Cleared",
        "DesktopNativePassportClearCommandState::NoPassport",
        "DesktopNativePassportClearCommandState::Unavailable",
    ] {
        assert!(
            runtime.contains(required),
            "clear runtime missing {required}",
        );
    }

    let signature = commands
        .split("pub fn passport_clear")
        .nth(1)
        .expect("passport_clear command")
        .split("->")
        .next()
        .expect("passport_clear signature");

    assert!(signature.contains("state: State<'_, AppState>"));

    for forbidden in ["pin:", "String", "Vec<u8>", "Deserialize"] {
        assert!(
            !signature.contains(forbidden),
            "passport_clear signature must not contain {forbidden}",
        );
    }

    let clear_function = commands
        .split("pub fn passport_clear")
        .nth(1)
        .expect("passport_clear function")
        .split("/// Confirm a root-sensitive desktop Native Passport action")
        .next()
        .expect("bounded passport_clear function");

    for required in [
        "clear_desktop_native_passport_with_public_identity_platform_material_and_recovery_acknowledgement",
        "&state.passport_vault_store",
        "&state.passport_operational_session",
        "&state.passport_pending_recovery_session",
        "&state.passport_pending_operational_session",
        "passport_platform_material_clearer",
        "passport_recovery_acknowledgement_store",
        "passport_public_identity_store",
        "schema: PASSPORT_CLEAR_DTO_SCHEMA_V1",
        "command_name: PASSPORT_CLEAR_COMMAND",
        "ONBOARDING_PHASE11C2B_PLATFORM_SECRET_CLEAR_LABEL",
        "redacted: true",
        "native_secure_input_requested: false",
        "pin_received_from_webview: false",
        "secret_material_returned: false",
        "encrypted_vault_mutated: outcome.encrypted_vault_removed",
        "outcome.platform_material_mutated",
        "recovery_root_unsealed: false",
        "wallet_or_ledger_mutated: false",
    ] {
        assert!(
            clear_function.contains(required),
            "passport_clear command missing {required}",
        );
    }

    let handler_block = lib
        .split("generate_handler![")
        .nth(1)
        .and_then(|tail| tail.split(']').next())
        .expect("Tauri generate_handler block");

    assert!(handler_block.contains("commands::passport::passport_clear,"));

    for forbidden_literal in [
        "secret_material_returned: true",
        "pin_received_from_webview: true",
        "recovery_root_unsealed: true",
        "wallet_or_ledger_mutated: true",
        "root_material_returned: true",
        "root_vmk_unlocked: true",
        "root_factor_unsealed: true",
        "passport_platform_sealer",
        "request_create_pin",
        "request_operational_pin",
        "request_root_confirmation_pin",
    ] {
        assert!(
            !clear_function.contains(forbidden_literal),
            "passport_clear command contains forbidden literal {forbidden_literal}",
        );
    }

    let _ = EXISTING_VAULT_BYTES;
}
