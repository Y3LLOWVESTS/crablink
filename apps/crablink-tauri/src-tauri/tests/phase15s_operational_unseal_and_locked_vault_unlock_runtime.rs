use std::sync::{
    atomic::{AtomicUsize, Ordering},
    Mutex, OnceLock,
};

use crablink_tauri_lib::passport_operational_unlock_runtime::{
    desktop_operational_unlock_posture, unlock_desktop_native_passport_operational,
    DesktopOperationalUnlockError, DesktopOperationalVaultSessionState,
    DesktopOperationalVaultSessionStore, NATIVE_PASSPORT_PHASE15S_LABEL,
};
use svc_passport::native::{
    encode_native_platform_bound_vault, wrap_native_compartment_vmk, NativeEncryptedVaultV1,
    NativePinWrappedVaultKeysV1, NativePlatformBoundVaultV1, NativePlatformFamily,
    NativePlatformSealer, NativePlatformStorageError, NativePlatformStorageOperation,
    NativeSealedMaterialV1, NativeSecretBytes, NativeSecureCompartment, NativeVaultRecoveryOutcome,
    NativeVaultRemovalOutcome, NativeVaultStore, PHASE15Q_PLATFORM_FACTOR_BYTES,
    PHASE15Q_VAULT_MASTER_KEY_BYTES,
};

const TEST_PIN: &[u8] = b"phase15s-local-pin";

const ROOT_FACTOR_BYTE: u8 = 0x31;
const OPERATIONAL_FACTOR_BYTE: u8 = 0x32;
const ROOT_VMK_BYTE: u8 = 0x41;
const OPERATIONAL_VMK_BYTE: u8 = 0x42;

const ROOT_SALT: [u8; 16] = [0x51; 16];

const OPERATIONAL_SALT: [u8; 16] = [0x52; 16];

const ROOT_NONCE: [u8; 24] = [0x61; 24];

const OPERATIONAL_NONCE: [u8; 24] = [0x62; 24];

const ROOT_REFERENCE: &[u8] = b"memory://phase15s-root";

const OPERATIONAL_REFERENCE: &[u8] = b"memory://phase15s-operational";

fn secret(byte: u8, length: usize) -> NativeSecretBytes {
    NativeSecretBytes::new(vec![byte; length]).expect("bounded NativeSecretBytes")
}

fn encoded_vault() -> NativeEncryptedVaultV1 {
    static ENCODED: OnceLock<Vec<u8>> = OnceLock::new();

    let bytes = ENCODED
        .get_or_init(|| {
            let root_factor = secret(ROOT_FACTOR_BYTE, PHASE15Q_PLATFORM_FACTOR_BYTES);

            let operational_factor =
                secret(OPERATIONAL_FACTOR_BYTE, PHASE15Q_PLATFORM_FACTOR_BYTES);

            let root_vmk = secret(ROOT_VMK_BYTE, PHASE15Q_VAULT_MASTER_KEY_BYTES);

            let operational_vmk = secret(OPERATIONAL_VMK_BYTE, PHASE15Q_VAULT_MASTER_KEY_BYTES);

            let root_wrapped = wrap_native_compartment_vmk(
                NativeSecureCompartment::RecoveryRoot,
                TEST_PIN,
                &root_factor,
                &ROOT_SALT,
                &ROOT_NONCE,
                &root_vmk,
            )
            .expect("wrap root VMK");

            let operational_wrapped = wrap_native_compartment_vmk(
                NativeSecureCompartment::DeviceKey,
                TEST_PIN,
                &operational_factor,
                &OPERATIONAL_SALT,
                &OPERATIONAL_NONCE,
                &operational_vmk,
            )
            .expect("wrap operational VMK");

            let wrapped_keys = NativePinWrappedVaultKeysV1::new(root_wrapped, operational_wrapped)
                .expect("two-compartment wrapped keys");

            let sealed_root = NativeSealedMaterialV1::new(
                NativePlatformFamily::MacosKeychain,
                NativeSecureCompartment::RecoveryRoot,
                ROOT_REFERENCE.to_vec(),
            )
            .expect("sealed root reference");

            let sealed_operational = NativeSealedMaterialV1::new(
                NativePlatformFamily::MacosKeychain,
                NativeSecureCompartment::DeviceKey,
                OPERATIONAL_REFERENCE.to_vec(),
            )
            .expect("sealed operational reference");

            let vault = NativePlatformBoundVaultV1::new(
                NativePlatformFamily::MacosKeychain,
                sealed_root,
                sealed_operational,
                wrapped_keys,
            )
            .expect("platform-bound vault");

            encode_native_platform_bound_vault(&vault)
                .expect("encode platform-bound vault")
                .as_slice()
                .to_vec()
        })
        .clone();

    NativeEncryptedVaultV1::new(bytes).expect("bounded encoded fixture")
}

struct MemoryVaultStore {
    vault: Mutex<Option<NativeEncryptedVaultV1>>,
    load_calls: AtomicUsize,
    write_calls: AtomicUsize,
}

impl MemoryVaultStore {
    fn with_vault(vault: Option<NativeEncryptedVaultV1>) -> Self {
        Self {
            vault: Mutex::new(vault),
            load_calls: AtomicUsize::new(0),
            write_calls: AtomicUsize::new(0),
        }
    }

    fn load_calls(&self) -> usize {
        self.load_calls.load(Ordering::SeqCst)
    }

    fn write_calls(&self) -> usize {
        self.write_calls.load(Ordering::SeqCst)
    }
}

impl NativeVaultStore for MemoryVaultStore {
    fn load_encrypted_vault(
        &self,
    ) -> Result<Option<NativeEncryptedVaultV1>, NativePlatformStorageError> {
        self.load_calls.fetch_add(1, Ordering::SeqCst);

        Ok(self
            .vault
            .lock()
            .map_err(|_| NativePlatformStorageError::BackendFailure {
                operation: NativePlatformStorageOperation::LoadEncryptedVault,
            })?
            .clone())
    }

    fn write_encrypted_vault_atomic(
        &self,
        vault: &NativeEncryptedVaultV1,
    ) -> Result<(), NativePlatformStorageError> {
        self.write_calls.fetch_add(1, Ordering::SeqCst);

        *self
            .vault
            .lock()
            .map_err(|_| NativePlatformStorageError::BackendFailure {
                operation: NativePlatformStorageOperation::WriteEncryptedVaultAtomic,
            })? = Some(vault.clone());

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

struct RecordingPlatformSealer {
    platform_family: NativePlatformFamily,
    operational_factor_byte: u8,
    fail_unseal: bool,
    unsealed_compartments: Mutex<Vec<NativeSecureCompartment>>,
}

impl RecordingPlatformSealer {
    fn valid() -> Self {
        Self {
            platform_family: NativePlatformFamily::MacosKeychain,
            operational_factor_byte: OPERATIONAL_FACTOR_BYTE,
            fail_unseal: false,
            unsealed_compartments: Mutex::new(Vec::new()),
        }
    }

    fn wrong_operational_factor() -> Self {
        Self {
            operational_factor_byte: 0xee,
            ..Self::valid()
        }
    }

    fn failing() -> Self {
        Self {
            fail_unseal: true,
            ..Self::valid()
        }
    }

    fn unsealed_compartments(&self) -> Vec<NativeSecureCompartment> {
        self.unsealed_compartments
            .lock()
            .expect("recorded compartments")
            .clone()
    }
}

impl NativePlatformSealer for RecordingPlatformSealer {
    fn platform_family(&self) -> NativePlatformFamily {
        self.platform_family
    }

    fn seal(
        &self,
        _compartment: NativeSecureCompartment,
        _secret: &NativeSecretBytes,
    ) -> Result<NativeSealedMaterialV1, NativePlatformStorageError> {
        Err(NativePlatformStorageError::BackendFailure {
            operation: NativePlatformStorageOperation::Seal,
        })
    }

    fn unseal(
        &self,
        sealed: &NativeSealedMaterialV1,
    ) -> Result<NativeSecretBytes, NativePlatformStorageError> {
        self.unsealed_compartments
            .lock()
            .map_err(|_| NativePlatformStorageError::BackendFailure {
                operation: NativePlatformStorageOperation::Unseal,
            })?
            .push(sealed.compartment);

        if self.fail_unseal {
            return Err(NativePlatformStorageError::BackendUnavailable {
                operation: NativePlatformStorageOperation::Unseal,
            });
        }

        if sealed.platform_family != self.platform_family
            || sealed.compartment != NativeSecureCompartment::DeviceKey
            || sealed.as_slice() != OPERATIONAL_REFERENCE
        {
            return Err(NativePlatformStorageError::BackendFailure {
                operation: NativePlatformStorageOperation::Unseal,
            });
        }

        secret(self.operational_factor_byte, PHASE15Q_PLATFORM_FACTOR_BYTES).pipe(Ok)
    }
}

trait Pipe: Sized {
    fn pipe<T>(self, operation: impl FnOnce(Self) -> T) -> T {
        operation(self)
    }
}

impl<T> Pipe for T {}

#[test]
fn phase15s_posture_is_operational_only_and_native_secret_safe() {
    let posture = desktop_operational_unlock_posture();

    assert_eq!(posture.phase_label, NATIVE_PASSPORT_PHASE15S_LABEL,);

    assert_eq!(posture.canonical_crypto_owner, "svc-passport",);

    assert_eq!(posture.platform_orchestration_owner, "crablink-tauri",);

    assert!(posture.stored_platform_bound_vault_loaded);

    assert!(posture.operational_factor_unsealed);

    assert!(posture.operational_vmk_unlocked);

    assert!(posture.native_only_session_custody_added);

    assert!(posture.concurrent_unlock_rejected);

    assert!(posture.failed_unlock_restores_locked_state);

    assert!(posture.explicit_lock_drops_operational_vmk);

    assert!(!posture.recovery_root_factor_unsealed);

    assert!(!posture.recovery_root_vmk_unlocked);

    assert!(!posture.pin_persisted);

    assert!(!posture.public_tauri_command_added);

    assert!(!posture.frontend_secret_dto_added);

    assert!(!posture.ron_kms_key_lifecycle_touched);

    assert!(!posture.capability_issuance_added);

    assert!(!posture.wallet_or_ledger_mutation_added);
}

#[test]
fn phase15s_unlocks_only_operational_material_and_lock_drops_session() {
    let store = MemoryVaultStore::with_vault(Some(encoded_vault()));

    let sealer = RecordingPlatformSealer::valid();

    let session = DesktopOperationalVaultSessionStore::default();

    let outcome = unlock_desktop_native_passport_operational(&store, &sealer, &session, TEST_PIN)
        .expect("operational unlock");

    assert_eq!(
        outcome.state,
        DesktopOperationalVaultSessionState::OperationalUnlocked,
    );

    assert_eq!(outcome.platform_family, NativePlatformFamily::MacosKeychain,);

    assert_eq!(
        session.state().expect("session state",),
        DesktopOperationalVaultSessionState::OperationalUnlocked,
    );

    assert_eq!(
        session
            .operational_vmk_len()
            .expect("operational VMK length",),
        Some(PHASE15Q_VAULT_MASTER_KEY_BYTES,),
    );

    assert_eq!(
        sealer.unsealed_compartments(),
        vec![NativeSecureCompartment::DeviceKey],
    );

    assert_eq!(store.load_calls(), 1);
    assert_eq!(store.write_calls(), 0);

    assert_eq!(
        unlock_desktop_native_passport_operational(&store, &sealer, &session, TEST_PIN,),
        Err(DesktopOperationalUnlockError::AlreadyOperationalUnlocked,),
    );

    assert_eq!(
        sealer.unsealed_compartments(),
        vec![NativeSecureCompartment::DeviceKey],
    );

    assert!(session.lock().expect("lock operational session",));

    assert_eq!(
        session.state().expect("locked state",),
        DesktopOperationalVaultSessionState::Locked,
    );

    assert_eq!(
        session.operational_vmk_len().expect("locked VMK length",),
        None,
    );
}

#[test]
fn phase15s_wrong_pin_and_wrong_platform_factor_fail_closed() {
    for (pin, sealer) in [
        (
            b"incorrect-phase15s-pin".as_slice(),
            RecordingPlatformSealer::valid(),
        ),
        (
            TEST_PIN,
            RecordingPlatformSealer::wrong_operational_factor(),
        ),
    ] {
        let store = MemoryVaultStore::with_vault(Some(encoded_vault()));

        let session = DesktopOperationalVaultSessionStore::default();

        assert_eq!(
            unlock_desktop_native_passport_operational(&store, &sealer, &session, pin,),
            Err(DesktopOperationalUnlockError::UnlockRejected,),
        );

        assert_eq!(
            session.state().expect("failed unlock restores state",),
            DesktopOperationalVaultSessionState::Locked,
        );

        assert_eq!(
            session
                .operational_vmk_len()
                .expect("failed unlock has no VMK",),
            None,
        );

        assert_eq!(
            sealer.unsealed_compartments(),
            vec![NativeSecureCompartment::DeviceKey],
        );

        assert_eq!(store.write_calls(), 0);
    }
}

#[test]
fn phase15s_missing_platform_material_fails_without_session_or_storage_mutation() {
    let store = MemoryVaultStore::with_vault(Some(encoded_vault()));

    let sealer = RecordingPlatformSealer::failing();

    let session = DesktopOperationalVaultSessionStore::default();

    assert_eq!(
        unlock_desktop_native_passport_operational(&store, &sealer, &session, TEST_PIN,),
        Err(DesktopOperationalUnlockError::UnlockRejected,),
    );

    assert_eq!(
        session.state().expect("failed unseal state",),
        DesktopOperationalVaultSessionState::Locked,
    );

    assert_eq!(
        sealer.unsealed_compartments(),
        vec![NativeSecureCompartment::DeviceKey],
    );

    assert_eq!(store.write_calls(), 0);
}

#[test]
fn phase15s_invalid_pin_and_absent_vault_reject_before_unsafe_side_effects() {
    let invalid_pin_store = MemoryVaultStore::with_vault(Some(encoded_vault()));

    let invalid_pin_sealer = RecordingPlatformSealer::valid();

    let invalid_pin_session = DesktopOperationalVaultSessionStore::default();

    assert_eq!(
        unlock_desktop_native_passport_operational(
            &invalid_pin_store,
            &invalid_pin_sealer,
            &invalid_pin_session,
            b"12345",
        ),
        Err(DesktopOperationalUnlockError::InvalidPinLength {
            actual: 5,
            minimum: 6,
            maximum: 64,
        },),
    );

    assert_eq!(invalid_pin_store.load_calls(), 0,);

    assert!(invalid_pin_sealer.unsealed_compartments().is_empty());

    let absent_store = MemoryVaultStore::with_vault(None);

    let absent_sealer = RecordingPlatformSealer::valid();

    let absent_session = DesktopOperationalVaultSessionStore::default();

    assert_eq!(
        unlock_desktop_native_passport_operational(
            &absent_store,
            &absent_sealer,
            &absent_session,
            TEST_PIN,
        ),
        Err(DesktopOperationalUnlockError::NoStoredVault,),
    );

    assert_eq!(
        absent_session.state().expect("absent-vault state",),
        DesktopOperationalVaultSessionState::Locked,
    );

    assert!(absent_sealer.unsealed_compartments().is_empty());

    assert_eq!(absent_store.write_calls(), 0);
}

#[test]
fn phase15s_source_and_app_state_boundaries_remain_native_only() {
    let root = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));

    let runtime = std::fs::read_to_string(root.join("src/passport_operational_unlock_runtime.rs"))
        .expect("Phase 15S runtime source");

    let state = std::fs::read_to_string(root.join("src/state.rs")).expect("AppState source");

    let lib = std::fs::read_to_string(root.join("src/lib.rs")).expect("Tauri lib source");

    for required in [
        "load_native_encrypted_vault",
        "decode_native_platform_bound_vault",
        "unseal_native_secret",
        "NativeSecureCompartment::DeviceKey",
        "unlock_native_operational_vmk",
        "DesktopOperationalVaultSessionStore",
        "DesktopOperationalVaultSessionSlot::Unlocking",
        "REDACTED_NATIVE_SESSION_MATERIAL",
    ] {
        assert!(
            runtime.contains(required),
            "Phase 15S runtime missing {required}",
        );
    }

    for forbidden in [
        "#[tauri::command]",
        "tauri::",
        "serde::Serialize",
        "serde::Deserialize",
        ".recovery_root_factor()",
        "NativeSecureCompartment::RecoveryRoot",
        "unlock_native_recovery",
        "unlock_native_root",
        "passport_unlock_root",
        "seed_phrase",
        "recovery_phrase",
        "private_key",
        "capability_token",
        "ron_kms::",
        "SigningKey",
        "VerifyingKey",
        "wallet.spend(",
        "ledger.write(",
        "println!",
        "eprintln!",
        "tracing::",
        "localStorage",
        "sessionStorage",
        "indexedDB",
    ] {
        assert!(
            !runtime.contains(forbidden),
            "Phase 15S runtime contains forbidden {forbidden}",
        );
    }

    assert!(state.contains("pub passport_operational_session: DesktopOperationalVaultSessionStore"));

    assert!(state
        .contains("passport_operational_session: DesktopOperationalVaultSessionStore::default()"));

    assert_eq!(
        lib.matches("pub mod passport_operational_unlock_runtime;")
            .count(),
        1,
    );
}
