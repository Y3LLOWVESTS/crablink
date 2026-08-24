//! RO:WHAT — Focused Physical M1 tests for deriving the public identity from a real platform-bound desktop Passport vault.
//! RO:WHY — Proves CrabLink can recover the canonical public Passport subject from its existing vault without dev identity or frontend secret custody.
//! RO:INTERACTS — desktop vault creation, NativeVaultStore, NativePlatformSealer, RecoveryRoot unseal, and svc-passport recovery-identity derivation.
//! RO:INVARIANTS — only RecoveryRoot is unsealed; existing encrypted vault is not rewritten; absent vault fails closed to NoPassport; platform unseal errors propagate.
//! RO:SECURITY — deterministic fixture secrets exist only in test memory; no live Keychain, PIN prompt, Tauri command, username, wallet, ledger, or network mutation.
//! RO:TEST — cargo test --test physical_m1_stored_passport_public_identity_runtime.

use std::sync::{
    atomic::{AtomicU8, AtomicUsize, Ordering},
    Mutex,
};

use crablink_tauri_lib::{
    passport_public_identity_runtime::{
        derive_stored_desktop_passport_public_identity,
        desktop_stored_passport_public_identity_posture, DesktopStoredPassportPublicIdentityError,
        DesktopStoredPassportPublicIdentityState,
        PHYSICAL_M1_STORED_PASSPORT_PUBLIC_IDENTITY_LABEL,
    },
    passport_vault_create_runtime::{
        create_desktop_native_passport_vault_with_random, NativeVaultRandomSource,
    },
};

use svc_passport::native::{
    derive_native_recovery_public_identity_v1, NativeEncryptedVaultV1, NativePlatformFamily,
    NativePlatformSealer, NativePlatformStorageError, NativePlatformStorageOperation,
    NativeSealedMaterialV1, NativeSecretBytes, NativeSecureCompartment, NativeVaultRecoveryOutcome,
    NativeVaultRemovalOutcome, NativeVaultStore, PHASE15Q_PLATFORM_FACTOR_BYTES,
};

const TEST_PIN: &[u8] = b"physical-m1-stored-identity";

#[derive(Default)]
struct MemoryVaultStore {
    vault: Mutex<Option<NativeEncryptedVaultV1>>,
    load_calls: AtomicUsize,
    write_calls: AtomicUsize,
}

impl MemoryVaultStore {
    fn write_calls(&self) -> usize {
        self.write_calls.load(Ordering::SeqCst)
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
    fn unsealed_compartments(&self) -> Vec<NativeSecureCompartment> {
        self.unsealed.lock().expect("unsealed lock").clone()
    }

    fn reset_unsealed_compartments(&self) {
        self.unsealed.lock().expect("unsealed lock").clear();
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
            format!("memory://physical-m1/{compartment:?}",).into_bytes(),
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

struct FailingUnsealSealer;

impl NativePlatformSealer for FailingUnsealSealer {
    fn platform_family(&self) -> NativePlatformFamily {
        NativePlatformFamily::MacosKeychain
    }

    fn seal(
        &self,
        _: NativeSecureCompartment,
        _: &NativeSecretBytes,
    ) -> Result<NativeSealedMaterialV1, NativePlatformStorageError> {
        Err(NativePlatformStorageError::BackendFailure {
            operation: NativePlatformStorageOperation::Seal,
        })
    }

    fn unseal(
        &self,
        _: &NativeSealedMaterialV1,
    ) -> Result<NativeSecretBytes, NativePlatformStorageError> {
        Err(NativePlatformStorageError::BackendFailure {
            operation: NativePlatformStorageOperation::Unseal,
        })
    }
}

#[test]
fn stored_passport_derives_expected_public_identity_and_unseals_only_root() {
    let store = MemoryVaultStore::default();

    let sealer = RecordingPlatformSealer::default();

    let random = SequencedRandom::new();

    create_desktop_native_passport_vault_with_random(&random, &store, &sealer, TEST_PIN)
        .expect("create deterministic Passport vault");

    assert_eq!(store.write_calls(), 1,);

    sealer.reset_unsealed_compartments();

    let recovery_factor = NativeSecretBytes::new(vec![1u8; PHASE15Q_PLATFORM_FACTOR_BYTES])
        .expect("known recovery factor");

    let expected = derive_native_recovery_public_identity_v1(&recovery_factor)
        .expect("expected public identity");

    let outcome = derive_stored_desktop_passport_public_identity(&store, &sealer)
        .expect("stored public identity");

    assert_eq!(
        outcome.state,
        DesktopStoredPassportPublicIdentityState::Available,
    );

    assert_eq!(outcome.public_identity, Some(expected),);

    assert!(outcome.recovery_root_unsealed,);

    assert_eq!(
        sealer.unsealed_compartments(),
        vec![NativeSecureCompartment::RecoveryRoot,],
    );

    assert_eq!(
        store.write_calls(),
        1,
        "identity derivation must not rewrite the vault",
    );
}

#[test]
fn absent_vault_returns_no_passport_without_platform_unseal() {
    let store = MemoryVaultStore::default();

    let sealer = RecordingPlatformSealer::default();

    let outcome = derive_stored_desktop_passport_public_identity(&store, &sealer)
        .expect("absent-vault outcome");

    assert_eq!(
        outcome.state,
        DesktopStoredPassportPublicIdentityState::NoPassport,
    );

    assert!(outcome.public_identity.is_none(),);

    assert!(!outcome.recovery_root_unsealed,);

    assert!(sealer.unsealed_compartments().is_empty(),);

    assert_eq!(store.write_calls(), 0,);
}

#[test]
fn recovery_root_unseal_failure_fails_closed_without_vault_rewrite() {
    let store = MemoryVaultStore::default();

    let creation_sealer = RecordingPlatformSealer::default();

    create_desktop_native_passport_vault_with_random(
        &SequencedRandom::new(),
        &store,
        &creation_sealer,
        TEST_PIN,
    )
    .expect("create deterministic Passport vault");

    assert_eq!(
        derive_stored_desktop_passport_public_identity(&store, &FailingUnsealSealer,),
        Err(DesktopStoredPassportPublicIdentityError::RecoveryFactorUnsealFailed,),
    );

    assert_eq!(store.write_calls(), 1,);
}

#[test]
fn stored_public_identity_posture_preserves_native_authority_boundary() {
    let posture = desktop_stored_passport_public_identity_posture();

    assert_eq!(
        posture.phase_label,
        PHYSICAL_M1_STORED_PASSPORT_PUBLIC_IDENTITY_LABEL,
    );

    assert_eq!(posture.canonical_identity_owner, "svc-passport",);

    assert_eq!(posture.platform_orchestration_owner, "crablink-tauri",);

    assert!(posture.stored_vault_required,);

    assert!(posture.recovery_root_factor_unsealed,);

    assert!(!posture.operational_factor_unsealed,);

    assert!(!posture.root_vmk_unlocked,);

    assert!(!posture.recovery_phrase_returned,);

    assert!(!posture.recovery_factor_returned,);

    assert!(!posture.root_signing_material_returned,);

    assert!(!posture.public_tauri_command_added,);

    assert!(!posture.frontend_secret_custody_added,);

    assert!(!posture.vault_mutation_added,);

    assert!(!posture.username_mutation_added,);

    assert!(!posture.wallet_or_ledger_mutation_added,);
}
