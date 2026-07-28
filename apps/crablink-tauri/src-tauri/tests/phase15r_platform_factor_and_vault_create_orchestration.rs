use std::sync::{
    atomic::{AtomicU8, AtomicUsize, Ordering},
    Mutex,
};

use crablink_tauri_lib::{
    passport_status_runtime::{inspect_stored_passport_status, StoredPassportStatus},
    passport_vault_create_runtime::{
        create_desktop_native_passport_vault_with_random,
        desktop_native_passport_vault_create_posture, DesktopNativePassportVaultCreateError,
        DesktopNativePassportVaultCreateState, NativeVaultRandomSource,
        NATIVE_PASSPORT_PHASE15R_LABEL,
    },
};
use svc_passport::native::{
    decode_native_platform_bound_vault, load_native_encrypted_vault, unlock_native_operational_vmk,
    unseal_native_secret, NativeEncryptedVaultV1, NativePlatformFamily, NativePlatformSealer,
    NativePlatformStorageError, NativePlatformStorageOperation, NativeSealedMaterialV1,
    NativeSecretBytes, NativeSecureCompartment, NativeVaultRecoveryOutcome,
    NativeVaultRemovalOutcome, NativeVaultStore, PHASE15Q_VAULT_MASTER_KEY_BYTES,
};

const TEST_PIN: &[u8] = b"phase15r-local-pin";

struct DeterministicRandomSource {
    next: AtomicU8,
    calls: AtomicUsize,
}

impl DeterministicRandomSource {
    fn new() -> Self {
        Self {
            next: AtomicU8::new(0x11),
            calls: AtomicUsize::new(0),
        }
    }

    fn calls(&self) -> usize {
        self.calls.load(Ordering::SeqCst)
    }
}

impl NativeVaultRandomSource for DeterministicRandomSource {
    fn fill(&self, output: &mut [u8]) -> Result<(), ()> {
        let seed = self.next.fetch_add(1, Ordering::SeqCst);
        self.calls.fetch_add(1, Ordering::SeqCst);

        for (index, slot) in output.iter_mut().enumerate() {
            let index = index as u8;

            *slot = seed
                .wrapping_add(index.wrapping_mul(73))
                .rotate_left(u32::from(index % 7))
                ^ 0xa7;
        }

        Ok(())
    }
}

struct FailingRandomSource {
    calls: AtomicUsize,
}

impl FailingRandomSource {
    fn new() -> Self {
        Self {
            calls: AtomicUsize::new(0),
        }
    }

    fn calls(&self) -> usize {
        self.calls.load(Ordering::SeqCst)
    }
}

impl NativeVaultRandomSource for FailingRandomSource {
    fn fill(&self, _: &mut [u8]) -> Result<(), ()> {
        self.calls.fetch_add(1, Ordering::SeqCst);

        Err(())
    }
}

struct MemoryPlatformSealer {
    family: NativePlatformFamily,
    recovery_root: Mutex<Option<Vec<u8>>>,
    operational: Mutex<Option<Vec<u8>>>,
    seal_calls: AtomicUsize,
}

impl MemoryPlatformSealer {
    fn new(family: NativePlatformFamily) -> Self {
        Self {
            family,
            recovery_root: Mutex::new(None),
            operational: Mutex::new(None),
            seal_calls: AtomicUsize::new(0),
        }
    }

    fn seal_calls(&self) -> usize {
        self.seal_calls.load(Ordering::SeqCst)
    }

    fn slot(&self, compartment: NativeSecureCompartment) -> &Mutex<Option<Vec<u8>>> {
        match compartment {
            NativeSecureCompartment::RecoveryRoot => &self.recovery_root,
            NativeSecureCompartment::DeviceKey => &self.operational,
        }
    }

    fn reference(compartment: NativeSecureCompartment) -> &'static [u8] {
        match compartment {
            NativeSecureCompartment::RecoveryRoot => b"memory://recovery-root",
            NativeSecureCompartment::DeviceKey => b"memory://operational",
        }
    }
}

impl NativePlatformSealer for MemoryPlatformSealer {
    fn platform_family(&self) -> NativePlatformFamily {
        self.family
    }

    fn seal(
        &self,
        compartment: NativeSecureCompartment,
        secret: &NativeSecretBytes,
    ) -> Result<NativeSealedMaterialV1, NativePlatformStorageError> {
        self.seal_calls.fetch_add(1, Ordering::SeqCst);

        *self.slot(compartment).lock().map_err(|_| {
            NativePlatformStorageError::BackendFailure {
                operation: NativePlatformStorageOperation::Seal,
            }
        })? = Some(secret.as_slice().to_vec());

        NativeSealedMaterialV1::new(
            self.family,
            compartment,
            Self::reference(compartment).to_vec(),
        )
    }

    fn unseal(
        &self,
        sealed: &NativeSealedMaterialV1,
    ) -> Result<NativeSecretBytes, NativePlatformStorageError> {
        if sealed.platform_family != self.family
            || sealed.as_slice() != Self::reference(sealed.compartment)
        {
            return Err(NativePlatformStorageError::BackendFailure {
                operation: NativePlatformStorageOperation::Unseal,
            });
        }

        let bytes = self
            .slot(sealed.compartment)
            .lock()
            .map_err(|_| NativePlatformStorageError::BackendFailure {
                operation: NativePlatformStorageOperation::Unseal,
            })?
            .clone()
            .ok_or(NativePlatformStorageError::BackendUnavailable {
                operation: NativePlatformStorageOperation::Unseal,
            })?;

        NativeSecretBytes::new(bytes)
    }
}

#[derive(Default)]
struct MemoryVaultStore {
    bytes: Mutex<Option<Vec<u8>>>,
    write_calls: AtomicUsize,
}

impl MemoryVaultStore {
    fn with_existing(bytes: Vec<u8>) -> Self {
        Self {
            bytes: Mutex::new(Some(bytes)),
            write_calls: AtomicUsize::new(0),
        }
    }

    fn write_calls(&self) -> usize {
        self.write_calls.load(Ordering::SeqCst)
    }
}

impl NativeVaultStore for MemoryVaultStore {
    fn load_encrypted_vault(
        &self,
    ) -> Result<Option<NativeEncryptedVaultV1>, NativePlatformStorageError> {
        self.bytes
            .lock()
            .map_err(|_| NativePlatformStorageError::BackendFailure {
                operation: NativePlatformStorageOperation::LoadEncryptedVault,
            })?
            .as_ref()
            .map(|bytes| NativeEncryptedVaultV1::new(bytes.clone()))
            .transpose()
    }

    fn write_encrypted_vault_atomic(
        &self,
        vault: &NativeEncryptedVaultV1,
    ) -> Result<(), NativePlatformStorageError> {
        self.write_calls.fetch_add(1, Ordering::SeqCst);

        *self
            .bytes
            .lock()
            .map_err(|_| NativePlatformStorageError::BackendFailure {
                operation: NativePlatformStorageOperation::WriteEncryptedVaultAtomic,
            })? = Some(vault.as_slice().to_vec());

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
            .bytes
            .lock()
            .map_err(|_| NativePlatformStorageError::BackendFailure {
                operation: NativePlatformStorageOperation::RemoveEncryptedVault,
            })?
            .take()
            .is_some();

        Ok(if removed {
            NativeVaultRemovalOutcome::Removed
        } else {
            NativeVaultRemovalOutcome::NotFound
        })
    }
}

#[test]
fn phase15r_posture_is_create_only_and_secret_safe() {
    let posture = desktop_native_passport_vault_create_posture();

    assert_eq!(posture.phase_label, NATIVE_PASSPORT_PHASE15R_LABEL,);

    assert_eq!(posture.canonical_crypto_owner, "svc-passport",);

    assert_eq!(posture.platform_adapter_owner, "crablink-tauri",);

    assert!(posture.secure_os_randomness_used);

    assert!(posture.existing_vault_overwrite_rejected);

    assert!(posture.pin_validated_before_side_effects);

    assert!(posture.independent_root_and_operational_factors);

    assert!(posture.independent_root_and_operational_vmks);

    assert!(posture.independent_salts_and_nonces);

    assert!(posture.platform_factors_sealed);

    assert!(posture.encrypted_vault_written_atomically);

    assert!(posture.created_state_is_locked);

    assert!(!posture.public_create_command_added);

    assert!(!posture.pin_persisted);
    assert!(!posture.root_unlock_added);
    assert!(!posture.secret_return_dto_added);

    assert!(!posture.ron_kms_key_lifecycle_touched);

    assert!(!posture.capability_issuance_added);

    assert!(!posture.wallet_or_ledger_mutation_added);
}

#[test]
fn phase15r_create_seals_two_factors_and_persists_locked_platform_bound_vault() {
    let random = DeterministicRandomSource::new();

    let store = MemoryVaultStore::default();

    let sealer = MemoryPlatformSealer::new(NativePlatformFamily::MacosKeychain);

    let outcome =
        create_desktop_native_passport_vault_with_random(&random, &store, &sealer, TEST_PIN)
            .expect("create platform-bound vault");

    assert_eq!(
        outcome.state,
        DesktopNativePassportVaultCreateState::CreatedLocked,
    );

    assert_eq!(outcome.platform_family, NativePlatformFamily::MacosKeychain,);

    assert_eq!(random.calls(), 8,);

    assert_eq!(sealer.seal_calls(), 2,);

    assert_eq!(store.write_calls(), 1,);

    assert_eq!(
        inspect_stored_passport_status(&store,).expect("stored status",),
        StoredPassportStatus::Locked,
    );

    let encrypted = load_native_encrypted_vault(&store)
        .expect("load encrypted vault")
        .expect("stored encrypted vault");

    let platform_bound =
        decode_native_platform_bound_vault(&encrypted).expect("decode platform-bound vault");

    let operational_factor = unseal_native_secret(
        &sealer,
        NativePlatformFamily::MacosKeychain,
        NativeSecureCompartment::DeviceKey,
        platform_bound.operational_factor(),
    )
    .expect("unseal operational factor");

    let operational_vmk = unlock_native_operational_vmk(
        platform_bound.wrapped_keys().operational(),
        TEST_PIN,
        &operational_factor,
    )
    .expect("unlock operational VMK");

    let expected_operational_vmk = (0..PHASE15Q_VAULT_MASTER_KEY_BYTES)
        .map(|index| {
            let index = index as u8;

            0x14u8
                .wrapping_add(index.wrapping_mul(73))
                .rotate_left(u32::from(index % 7))
                ^ 0xa7
        })
        .collect::<Vec<u8>>();

    assert_eq!(
        operational_vmk.as_slice(),
        expected_operational_vmk.as_slice(),
    );

    let unique_operational_vmk_bytes = operational_vmk
        .as_slice()
        .iter()
        .copied()
        .collect::<std::collections::BTreeSet<u8>>();

    assert!(
        unique_operational_vmk_bytes.len() >= 24,
        "operational VMK fixture must not remain repeated-byte material",
    );

    let old_repeated_operational_vmk = vec![0x14u8; PHASE15Q_VAULT_MASTER_KEY_BYTES];

    assert_ne!(
        operational_vmk.as_slice(),
        old_repeated_operational_vmk.as_slice(),
    );
}

#[test]
fn phase15r_existing_vault_rejects_before_randomness_or_sealing() {
    let random = DeterministicRandomSource::new();

    let store = MemoryVaultStore::with_existing(vec![0x99]);

    let sealer = MemoryPlatformSealer::new(NativePlatformFamily::MacosKeychain);

    assert_eq!(
        create_desktop_native_passport_vault_with_random(&random, &store, &sealer, TEST_PIN,),
        Err(DesktopNativePassportVaultCreateError::VaultAlreadyExists,),
    );

    assert_eq!(random.calls(), 0);
    assert_eq!(sealer.seal_calls(), 0);
    assert_eq!(store.write_calls(), 0);
}

#[test]
fn phase15r_invalid_pin_rejects_before_randomness_or_sealing() {
    let random = DeterministicRandomSource::new();

    let store = MemoryVaultStore::default();

    let sealer = MemoryPlatformSealer::new(NativePlatformFamily::MacosKeychain);

    assert_eq!(
        create_desktop_native_passport_vault_with_random(&random, &store, &sealer, b"12345",),
        Err(DesktopNativePassportVaultCreateError::InvalidPinLength {
            actual: 5,
            minimum: 6,
            maximum: 64,
        },),
    );

    assert_eq!(random.calls(), 0);
    assert_eq!(sealer.seal_calls(), 0);
    assert_eq!(store.write_calls(), 0);
}

#[test]
fn phase15r_randomness_failure_rejects_without_platform_or_storage_side_effects() {
    let random = FailingRandomSource::new();

    let store = MemoryVaultStore::default();

    let sealer = MemoryPlatformSealer::new(NativePlatformFamily::MacosKeychain);

    assert_eq!(
        create_desktop_native_passport_vault_with_random(&random, &store, &sealer, TEST_PIN,),
        Err(DesktopNativePassportVaultCreateError::RandomnessUnavailable,),
    );

    assert_eq!(random.calls(), 1);
    assert_eq!(sealer.seal_calls(), 0);
    assert_eq!(store.write_calls(), 0);
}

#[test]
fn phase15r_source_has_no_command_root_unlock_or_secret_return_surface() {
    let root = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));

    let runtime = std::fs::read_to_string(root.join("src/passport_vault_create_runtime.rs"))
        .expect("Phase 15R runtime source");

    let lib = std::fs::read_to_string(root.join("src/lib.rs")).expect("Tauri library source");

    let cargo = std::fs::read_to_string(root.join("Cargo.toml")).expect("Tauri Cargo.toml");

    for required in [
        "getrandom::fill",
        "load_native_encrypted_vault",
        "wrap_native_compartment_vmk",
        "seal_native_secret",
        "NativePlatformBoundVaultV1::new",
        "encode_native_platform_bound_vault",
        "write_native_encrypted_vault_atomic",
        "CreatedLocked",
    ] {
        assert!(
            runtime.contains(required),
            "Phase 15R runtime missing {required}",
        );
    }

    for forbidden in [
        "#[tauri::command]",
        "State<'_, AppState>",
        "passport_create_native",
        "unseal_native_secret",
        "unlock_native_operational_vmk",
        "unlock_native_recovery",
        "serde::Serialize",
        "seed_phrase",
        "recovery_phrase",
        "private_key",
        "capability_token",
        "wallet.spend(",
        "ledger.write(",
        "println!",
        "eprintln!",
        "tracing::",
    ] {
        assert!(
            !runtime.contains(forbidden),
            "Phase 15R runtime contains forbidden {forbidden}",
        );
    }

    assert!(lib.contains("pub mod passport_vault_create_runtime;"));

    assert!(cargo.contains("getrandom = \"0.3\""));
}

#[test]
fn phase6e_deterministic_test_random_source_is_diverse_not_repeated() {
    let random = DeterministicRandomSource::new();

    let mut bytes = [0u8; 32];

    random
        .fill(&mut bytes)
        .expect("deterministic test random source should fill");

    assert_eq!(random.calls(), 1);

    let unique_bytes = bytes
        .iter()
        .copied()
        .collect::<std::collections::BTreeSet<u8>>();

    assert!(
        unique_bytes.len() >= 24,
        "test random source must not emit one repeated byte across secret material",
    );
}

#[test]
fn phase6e_production_create_uses_os_csprng_boundary() {
    let source = include_str!("../src/passport_vault_create_runtime.rs");

    assert!(
        source.contains("pub struct OsNativeVaultRandomSource"),
        "production vault creation must expose a dedicated OS random source",
    );

    assert!(
        source.contains("impl NativeVaultRandomSource for OsNativeVaultRandomSource",),
        "OS random source must implement the vault randomness port",
    );

    assert!(
        source.contains("getrandom::fill(output)"),
        "production vault creation must fill secret material from getrandom",
    );

    assert!(
        source.contains(
            "create_desktop_native_passport_vault_with_random(&OsNativeVaultRandomSource",
        ),
        "public vault create path must call the OS CSPRNG-backed random source",
    );

    assert!(
        source.contains("PHASE15Q_PLATFORM_FACTOR_BYTES"),
        "platform factor byte length must remain owned by svc-passport",
    );

    assert!(
        source.contains("PHASE15Q_VAULT_MASTER_KEY_BYTES"),
        "vault master key byte length must remain owned by svc-passport",
    );

    for forbidden in [
        "DeterministicRandomSource",
        "output.fill(byte)",
        "thread_rng",
        "from_entropy",
        "seed_from_u64",
        "StdRng",
        "SmallRng",
    ] {
        assert!(
            !source.contains(forbidden),
            "production vault create source must not contain deterministic or ad-hoc randomness pattern {forbidden}",
        );
    }
}
