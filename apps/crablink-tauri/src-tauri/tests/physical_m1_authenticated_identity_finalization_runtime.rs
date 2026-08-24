//! RO:WHAT — Focused Physical M1 tests for PIN-authenticated public Passport identity finalization and descriptor-clear recovery.
//! RO:WHY — Proves wrong PINs cannot create identity and a descriptor-first partial clear can deterministically recover from the preserved Passport before retry.
//! RO:INTERACTS — deterministic platform-bound vault creation, RecoveryRoot unseal, root-PIN authentication, public descriptor persistence, and the complete local Passport clear wrapper.
//! RO:INVARIANTS — first finalization unseals RecoveryRoot exactly once; wrong PIN writes no descriptor; existing descriptors avoid root access; failed custody clear preserves the vault so the exact descriptor can be regenerated.
//! RO:SECURITY — deterministic test material only; no live Keychain, Tauri command, React, username, wallet, ledger, capability, or network mutation.
//! RO:TEST — cargo test --test physical_m1_authenticated_identity_finalization_runtime.

use std::{
    fs,
    path::PathBuf,
    sync::{
        atomic::{AtomicU64, AtomicU8, Ordering},
        Mutex,
    },
    time::{SystemTime, UNIX_EPOCH},
};

use crablink_tauri_lib::{
    passport_identity_finalization_runtime::{
        finalize_stored_desktop_passport_identity_with_root_pin,
        DesktopPassportIdentityFinalizationError, DesktopPassportIdentityFinalizationState,
    },
    passport_public_identity_store::DesktopPublicPassportDescriptorStore,
    passport_vault_create_runtime::{
        create_desktop_native_passport_vault_with_random, NativeVaultRandomSource,
    },
};

use svc_passport::native::{
    NativeEncryptedVaultV1, NativePlatformFamily, NativePlatformSealer, NativePlatformStorageError,
    NativePlatformStorageOperation, NativeSealedMaterialV1, NativeSecretBytes,
    NativeSecureCompartment, NativeVaultRecoveryOutcome, NativeVaultRemovalOutcome,
    NativeVaultStore,
};

const CORRECT_PIN: &[u8] = b"physical-m1-auth-finalize";

const WRONG_PIN: &[u8] = b"physical-m1-wrong-finalize";

static DIRECTORY_COUNTER: AtomicU64 = AtomicU64::new(0);

struct TestDirectory {
    path: PathBuf,
}

impl TestDirectory {
    fn new(label: &str) -> Self {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("clock")
            .as_nanos();

        let counter = DIRECTORY_COUNTER.fetch_add(1, Ordering::SeqCst);

        let path = std::env::temp_dir().join(format!(
            "crablink-{label}-{}-{timestamp}-{counter}",
            std::process::id(),
        ));

        fs::create_dir_all(&path).expect("create test directory");

        Self { path }
    }
}

impl Drop for TestDirectory {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.path);
    }
}

#[derive(Default)]
struct MemoryVaultStore {
    vault: Mutex<Option<NativeEncryptedVaultV1>>,
}

impl NativeVaultStore for MemoryVaultStore {
    fn load_encrypted_vault(
        &self,
    ) -> Result<Option<NativeEncryptedVaultV1>, NativePlatformStorageError> {
        Ok(self.vault.lock().expect("vault lock").clone())
    }

    fn write_encrypted_vault_atomic(
        &self,
        vault: &NativeEncryptedVaultV1,
    ) -> Result<(), NativePlatformStorageError> {
        *self.vault.lock().expect("vault lock") = Some(vault.clone());

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
        let removed = self.vault.lock().expect("vault lock").take().is_some();

        Ok(if removed {
            NativeVaultRemovalOutcome::Removed
        } else {
            NativeVaultRemovalOutcome::NotFound
        })
    }
}

struct SequencedRandom {
    next: AtomicU8,
}

impl SequencedRandom {
    fn new() -> Self {
        Self {
            next: AtomicU8::new(1),
        }
    }
}

impl NativeVaultRandomSource for SequencedRandom {
    fn fill(&self, output: &mut [u8]) -> Result<(), ()> {
        let value = self.next.fetch_add(1, Ordering::SeqCst);

        output.fill(value);

        Ok(())
    }
}

#[derive(Default)]
struct RecordingPlatformSealer {
    sealed: Mutex<Vec<(NativeSecureCompartment, NativeSecretBytes)>>,
    unsealed: Mutex<Vec<NativeSecureCompartment>>,
}

impl RecordingPlatformSealer {
    fn reset_unsealed(&self) {
        self.unsealed.lock().expect("unsealed lock").clear();
    }

    fn unsealed(&self) -> Vec<NativeSecureCompartment> {
        self.unsealed.lock().expect("unsealed lock").clone()
    }
}

impl NativePlatformSealer for RecordingPlatformSealer {
    fn platform_family(&self) -> NativePlatformFamily {
        NativePlatformFamily::MacosKeychain
    }

    fn seal(
        &self,
        compartment: NativeSecureCompartment,
        material: &NativeSecretBytes,
    ) -> Result<NativeSealedMaterialV1, NativePlatformStorageError> {
        let copy = NativeSecretBytes::new(material.as_slice().to_vec()).map_err(|_| {
            NativePlatformStorageError::BackendFailure {
                operation: NativePlatformStorageOperation::Seal,
            }
        })?;

        self.sealed
            .lock()
            .map_err(|_| NativePlatformStorageError::BackendFailure {
                operation: NativePlatformStorageOperation::Seal,
            })?
            .push((compartment, copy));

        NativeSealedMaterialV1::new(
            NativePlatformFamily::MacosKeychain,
            compartment,
            format!("memory://physical-m1-auth/{compartment:?}",).into_bytes(),
        )
    }

    fn unseal(
        &self,
        sealed: &NativeSealedMaterialV1,
    ) -> Result<NativeSecretBytes, NativePlatformStorageError> {
        self.unsealed
            .lock()
            .map_err(|_| NativePlatformStorageError::BackendFailure {
                operation: NativePlatformStorageOperation::Unseal,
            })?
            .push(sealed.compartment);

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

fn prepared_runtime(
    label: &str,
) -> (
    TestDirectory,
    MemoryVaultStore,
    RecordingPlatformSealer,
    DesktopPublicPassportDescriptorStore,
) {
    let directory = TestDirectory::new(label);

    let public_store =
        DesktopPublicPassportDescriptorStore::new(directory.path.clone()).expect("public store");

    let vault_store = MemoryVaultStore::default();

    let sealer = RecordingPlatformSealer::default();

    create_desktop_native_passport_vault_with_random(
        &SequencedRandom::new(),
        &vault_store,
        &sealer,
        CORRECT_PIN,
    )
    .expect("create deterministic vault");

    sealer.reset_unsealed();

    (directory, vault_store, sealer, public_store)
}

#[test]
fn correct_root_pin_finalizes_with_exactly_one_recovery_root_unseal() {
    let (_directory, vault_store, sealer, public_store) = prepared_runtime("auth-finalize-correct");

    let outcome = finalize_stored_desktop_passport_identity_with_root_pin(
        &vault_store,
        &sealer,
        &public_store,
        CORRECT_PIN,
    )
    .expect("authenticated finalization");

    assert_eq!(
        outcome.state,
        DesktopPassportIdentityFinalizationState::Finalized,
    );

    assert!(outcome.derived_from_recovery_root,);

    assert!(outcome.recovery_root_unsealed,);

    assert!(outcome.public_descriptor_written,);

    assert_eq!(
        sealer.unsealed(),
        vec![NativeSecureCompartment::RecoveryRoot,],
    );

    assert_eq!(
        public_store.load().expect("load descriptor"),
        outcome.public_identity,
    );
}

#[test]
fn wrong_root_pin_rejects_without_persisting_public_identity() {
    let (_directory, vault_store, sealer, public_store) = prepared_runtime("auth-finalize-wrong");

    assert_eq!(
        finalize_stored_desktop_passport_identity_with_root_pin(
            &vault_store,
            &sealer,
            &public_store,
            WRONG_PIN,
        ),
        Err(DesktopPassportIdentityFinalizationError::RootPinRejected,),
    );

    assert_eq!(
        sealer.unsealed(),
        vec![NativeSecureCompartment::RecoveryRoot,],
    );

    assert_eq!(public_store.load().expect("descriptor load"), None,);
}

#[test]
fn invalid_root_pin_length_rejects_without_persisting_public_identity() {
    let (_directory, vault_store, sealer, public_store) = prepared_runtime("auth-finalize-short");

    assert_eq!(
        finalize_stored_desktop_passport_identity_with_root_pin(
            &vault_store,
            &sealer,
            &public_store,
            b"x",
        ),
        Err(DesktopPassportIdentityFinalizationError::RootPinRejected,),
    );

    assert_eq!(public_store.load().expect("descriptor load"), None,);
}

#[test]
fn existing_public_identity_avoids_pin_verification_and_root_unseal() {
    let (_directory, vault_store, sealer, public_store) = prepared_runtime("auth-finalize-restart");

    let first = finalize_stored_desktop_passport_identity_with_root_pin(
        &vault_store,
        &sealer,
        &public_store,
        CORRECT_PIN,
    )
    .expect("first finalization");

    let expected = first.public_identity;

    sealer.reset_unsealed();

    let restarted = finalize_stored_desktop_passport_identity_with_root_pin(
        &vault_store,
        &sealer,
        &public_store,
        WRONG_PIN,
    )
    .expect("existing descriptor requires no root auth");

    assert_eq!(restarted.public_identity, expected,);

    assert!(!restarted.derived_from_recovery_root,);

    assert!(!restarted.recovery_root_unsealed,);

    assert!(!restarted.public_descriptor_written,);

    assert!(sealer.unsealed().is_empty(),);
}

#[derive(Debug, Default)]
struct PhysicalM1CompletePlatformMaterialClearer;

impl crablink_tauri_lib::passport_platform_material_clear_runtime::DesktopPlatformMaterialClearer
    for PhysicalM1CompletePlatformMaterialClearer
{
    fn clear_platform_material(
        &self,
    ) -> crablink_tauri_lib::passport_platform_material_clear_runtime::DesktopPlatformMaterialClearReview
    {
        crablink_tauri_lib::passport_platform_material_clear_runtime::DesktopPlatformMaterialClearReview {
            recovery_root:
                crablink_tauri_lib::passport_platform_material_clear_runtime::DesktopPlatformMaterialEntryClearState::Removed,
            device_key:
                crablink_tauri_lib::passport_platform_material_clear_runtime::DesktopPlatformMaterialEntryClearState::Removed,
        }
    }
}

#[test]
fn partial_clear_after_descriptor_removal_can_refinalize_and_retry_to_complete_clear() {
    let (directory, vault_store, sealer, public_store) =
        prepared_runtime("auth-finalize-partial-clear-retry");

    let initial = finalize_stored_desktop_passport_identity_with_root_pin(
        &vault_store,
        &sealer,
        &public_store,
        CORRECT_PIN,
    )
    .expect("initial authenticated identity finalization");

    assert_eq!(
        initial.state,
        DesktopPassportIdentityFinalizationState::Finalized,
    );
    assert!(initial.derived_from_recovery_root);
    assert!(initial.recovery_root_unsealed);
    assert!(initial.public_descriptor_written);

    let expected_identity = initial
        .public_identity
        .expect("initial public identity descriptor");

    assert_eq!(
        public_store
            .load()
            .expect("load initial public descriptor")
            .as_ref(),
        Some(&expected_identity),
    );

    let operational_session =
        crablink_tauri_lib::passport_operational_unlock_runtime::DesktopOperationalVaultSessionStore::default();

    let pending_recovery =
        crablink_tauri_lib::passport_pending_recovery_runtime::DesktopPendingRecoverySessionStore::default();

    let pending_operational =
        crablink_tauri_lib::passport_pending_operational_runtime::DesktopPendingOperationalSessionStore::default();

    let acknowledgement =
        crablink_tauri_lib::passport_recovery_acknowledgement_store::DesktopRecoveryAcknowledgementStore::new(
            directory.path.clone(),
        );

    let unavailable_clearer =
        crablink_tauri_lib::passport_platform_material_clear_runtime::UnavailableDesktopPlatformMaterialClearer;

    let first_clear =
        crablink_tauri_lib::passport_clear_command_runtime::clear_desktop_native_passport_with_public_identity_platform_material_and_recovery_acknowledgement(
            &vault_store,
            &operational_session,
            &pending_recovery,
            &pending_operational,
            &unavailable_clearer,
            &acknowledgement,
            &public_store,
        );

    assert_eq!(
        first_clear.state,
        crablink_tauri_lib::passport_clear_command_runtime::DesktopNativePassportClearCommandState::Unavailable,
    );
    assert!(!first_clear.platform_material_clear_completed);
    assert!(!first_clear.platform_material_mutated);
    assert!(!first_clear.encrypted_vault_removed);

    assert_eq!(
        public_store
            .load()
            .expect("descriptor must be absent after descriptor-first clear"),
        None,
    );

    assert!(
        vault_store
            .load_encrypted_vault()
            .expect("load preserved vault after partial clear")
            .is_some(),
        "partial custody clear must preserve the encrypted vault",
    );

    let repaired = finalize_stored_desktop_passport_identity_with_root_pin(
        &vault_store,
        &sealer,
        &public_store,
        CORRECT_PIN,
    )
    .expect("re-finalize identity from preserved Passport");

    assert_eq!(
        repaired.state,
        DesktopPassportIdentityFinalizationState::Finalized,
    );
    assert!(repaired.derived_from_recovery_root);
    assert!(repaired.recovery_root_unsealed);
    assert!(repaired.public_descriptor_written);
    assert_eq!(
        repaired.public_identity.as_ref(),
        Some(&expected_identity),
        "re-finalization must recreate the exact same public identity",
    );

    assert_eq!(
        public_store
            .load()
            .expect("load regenerated descriptor")
            .as_ref(),
        Some(&expected_identity),
    );

    assert!(vault_store
        .load_encrypted_vault()
        .expect("load vault before clear retry")
        .is_some(),);

    let complete_clearer = PhysicalM1CompletePlatformMaterialClearer;

    let retry =
        crablink_tauri_lib::passport_clear_command_runtime::clear_desktop_native_passport_with_public_identity_platform_material_and_recovery_acknowledgement(
            &vault_store,
            &operational_session,
            &pending_recovery,
            &pending_operational,
            &complete_clearer,
            &acknowledgement,
            &public_store,
        );

    assert_eq!(
        retry.state,
        crablink_tauri_lib::passport_clear_command_runtime::DesktopNativePassportClearCommandState::Cleared,
    );
    assert!(retry.platform_material_clear_completed);
    assert!(retry.platform_material_mutated);
    assert!(retry.encrypted_vault_removed);

    assert_eq!(
        public_store
            .load()
            .expect("descriptor absent after successful retry"),
        None,
    );

    assert!(
        vault_store
            .load_encrypted_vault()
            .expect("load vault after successful retry")
            .is_none(),
        "successful retry must remove the encrypted vault",
    );
}
