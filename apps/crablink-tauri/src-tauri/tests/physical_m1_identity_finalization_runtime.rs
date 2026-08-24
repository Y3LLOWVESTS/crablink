//! RO:WHAT — Focused Physical M1 tests for one-time desktop Passport public-identity finalization.
//! RO:WHY — Proves first finalization derives from RecoveryRoot once while restart paths use only the immutable public descriptor.
//! RO:INTERACTS — deterministic platform-bound vault creation, NativeVaultStore, NativePlatformSealer, stored public-identity derivation, and public descriptor persistence.
//! RO:INVARIANTS — first pass unseals only RecoveryRoot; restart performs no unseal; no-vault state is non-authoritative; orphaned descriptors fail closed.
//! RO:SECURITY — deterministic in-memory test factors only; no live Keychain, Tauri command, React, username, wallet, ledger, or network mutation.
//! RO:TEST — cargo test --test physical_m1_identity_finalization_runtime.

use std::{
    fs,
    path::PathBuf,
    sync::{
        atomic::{AtomicU64, AtomicU8, AtomicUsize, Ordering},
        Mutex,
    },
    time::{SystemTime, UNIX_EPOCH},
};

use crablink_tauri_lib::{
    passport_identity_finalization_runtime::{
        desktop_passport_identity_finalization_posture, finalize_stored_desktop_passport_identity,
        DesktopPassportIdentityFinalizationError, DesktopPassportIdentityFinalizationState,
        PHYSICAL_M1_IDENTITY_FINALIZATION_LABEL,
    },
    passport_public_identity_store::{
        DesktopPublicPassportDescriptorStore, PublicDescriptorPersistOutcome,
    },
    passport_vault_create_runtime::{
        create_desktop_native_passport_vault_with_random, NativeVaultRandomSource,
    },
};

use svc_passport::native::{
    Ed25519PublicKeyHex, NativeEncryptedVaultV1, NativePlatformFamily, NativePlatformSealer,
    NativePlatformStorageError, NativePlatformStorageOperation, NativeSealedMaterialV1,
    NativeSecretBytes, NativeSecureCompartment, NativeVaultRecoveryOutcome,
    NativeVaultRemovalOutcome, NativeVaultStore, PassportIdV1, RootPassportDescriptorV1,
};

const TEST_PIN: &[u8] = b"physical-m1-finalization";

const VECTOR_PASSPORT_ID: &str =
    "passport:v1:main:ed25519:b3:acc2761e583fafc93cbb880bef1bd7285f43b3bbf326b9e185b226c5533cb7df";

const VECTOR_ROOT_PUBLIC_KEY: &str =
    "3d7f7a7cf1ca3e1af8e812d2ac349b13770d152c3f26b72560ee6870b9dec909";

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
    load_calls: AtomicUsize,
    write_calls: AtomicUsize,
}

impl NativeVaultStore for MemoryVaultStore {
    fn load_encrypted_vault(
        &self,
    ) -> Result<Option<NativeEncryptedVaultV1>, NativePlatformStorageError> {
        self.load_calls.fetch_add(1, Ordering::SeqCst);

        Ok(self.vault.lock().expect("vault lock").clone())
    }

    fn write_encrypted_vault_atomic(
        &self,
        vault: &NativeEncryptedVaultV1,
    ) -> Result<(), NativePlatformStorageError> {
        self.write_calls.fetch_add(1, Ordering::SeqCst);

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
            format!("memory://physical-m1-finalization/{compartment:?}",).into_bytes(),
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

fn vector_descriptor() -> RootPassportDescriptorV1 {
    RootPassportDescriptorV1 {
        passport_id: PassportIdV1::parse(VECTOR_PASSPORT_ID).expect("vector Passport ID"),
        root_public_key: Ed25519PublicKeyHex::parse(VECTOR_ROOT_PUBLIC_KEY)
            .expect("vector root public key"),
        optional_handle: None,
    }
}

#[test]
fn first_finalization_derives_once_and_persists_public_descriptor() {
    let directory = TestDirectory::new("identity-finalize-first");

    let public_store =
        DesktopPublicPassportDescriptorStore::new(directory.path.clone()).expect("public store");

    let vault_store = MemoryVaultStore::default();

    let sealer = RecordingPlatformSealer::default();

    create_desktop_native_passport_vault_with_random(
        &SequencedRandom::new(),
        &vault_store,
        &sealer,
        TEST_PIN,
    )
    .expect("create vault");

    sealer.reset_unsealed();

    let outcome = finalize_stored_desktop_passport_identity(&vault_store, &sealer, &public_store)
        .expect("first finalization");

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
        public_store.load().expect("load persisted"),
        outcome.public_identity,
    );
}

#[test]
fn restart_uses_public_descriptor_without_second_root_unseal() {
    let directory = TestDirectory::new("identity-finalize-restart");

    let vault_store = MemoryVaultStore::default();

    let sealer = RecordingPlatformSealer::default();

    create_desktop_native_passport_vault_with_random(
        &SequencedRandom::new(),
        &vault_store,
        &sealer,
        TEST_PIN,
    )
    .expect("create vault");

    let first_store = DesktopPublicPassportDescriptorStore::new(directory.path.clone())
        .expect("first public store");

    let first = finalize_stored_desktop_passport_identity(&vault_store, &sealer, &first_store)
        .expect("first finalization");

    let expected = first.public_identity.clone();

    sealer.reset_unsealed();

    drop(first_store);

    let restarted_store = DesktopPublicPassportDescriptorStore::new(directory.path.clone())
        .expect("restarted public store");

    let restarted =
        finalize_stored_desktop_passport_identity(&vault_store, &sealer, &restarted_store)
            .expect("restart finalization");

    assert_eq!(restarted.public_identity, expected,);

    assert!(!restarted.derived_from_recovery_root,);

    assert!(!restarted.recovery_root_unsealed,);

    assert!(!restarted.public_descriptor_written,);

    assert!(sealer.unsealed().is_empty(),);
}

#[test]
fn no_vault_and_no_public_descriptor_returns_no_passport_without_unseal() {
    let directory = TestDirectory::new("identity-finalize-empty");

    let vault_store = MemoryVaultStore::default();

    let sealer = RecordingPlatformSealer::default();

    let public_store =
        DesktopPublicPassportDescriptorStore::new(directory.path.clone()).expect("public store");

    let outcome = finalize_stored_desktop_passport_identity(&vault_store, &sealer, &public_store)
        .expect("empty finalization");

    assert_eq!(
        outcome.state,
        DesktopPassportIdentityFinalizationState::NoPassport,
    );

    assert!(outcome.public_identity.is_none(),);

    assert!(sealer.unsealed().is_empty(),);
}

#[test]
fn orphaned_public_descriptor_without_vault_fails_closed() {
    let directory = TestDirectory::new("identity-finalize-orphan");

    let public_store =
        DesktopPublicPassportDescriptorStore::new(directory.path.clone()).expect("public store");

    assert_eq!(
        public_store
            .persist_once(&vector_descriptor(),)
            .expect("persist vector"),
        PublicDescriptorPersistOutcome::Written,
    );

    let vault_store = MemoryVaultStore::default();

    let sealer = RecordingPlatformSealer::default();

    assert_eq!(
        finalize_stored_desktop_passport_identity(&vault_store, &sealer, &public_store,),
        Err(DesktopPassportIdentityFinalizationError::OrphanedPublicDescriptor,),
    );

    assert!(sealer.unsealed().is_empty(),);
}

#[test]
fn finalization_posture_preserves_authority_boundaries() {
    let posture = desktop_passport_identity_finalization_posture();

    assert_eq!(posture.phase_label, PHYSICAL_M1_IDENTITY_FINALIZATION_LABEL,);

    assert_eq!(posture.canonical_identity_owner, "svc-passport",);

    assert_eq!(posture.platform_orchestration_owner, "crablink-tauri",);

    assert!(posture.vault_required_for_descriptor_use,);

    assert!(posture.existing_descriptor_avoids_root_unseal,);

    assert!(posture.first_finalization_derives_from_recovery_root,);

    assert!(posture.public_descriptor_persisted,);

    assert!(!posture.public_tauri_command_added,);

    assert!(!posture.app_state_mutation_added,);

    assert!(!posture.frontend_secret_custody_added,);

    assert!(!posture.username_mutation_added,);

    assert!(!posture.wallet_or_ledger_mutation_added,);
}
