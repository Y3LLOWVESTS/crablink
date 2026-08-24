//! RO:WHAT — Focused desktop tests for atomic Native Passport V1-to-V2 migration orchestration and write-failure classification.
//! RO:WHY — Physical M1 must prove device-key persistence cannot destroy or silently overwrite the existing Passport when storage operations fail.
//! RO:INTERACTS — passport_vault_v2_migration_runtime, svc-passport V1/V2 codecs, NativeVaultStore, and injected native randomness.
//! RO:INVARIANTS — successful migration validates readback; failed pre-replacement write preserves V1; replacement-observed write errors are not falsely rolled back; unknown post-write bytes are reported ambiguous; existing V2 is idempotent.
//! RO:METRICS — none.
//! RO:CONFIG — desktop Tauri test target.
//! RO:SECURITY — fixture-only secrets and in-memory storage; no real Passport path, Keychain, DPAPI, Secret Service, WebView, root signing, username, wallet, or ledger mutation.
//! RO:TEST — cargo test --test physical_m1_desktop_v1_to_v2_migration_runtime.

use std::sync::{
    atomic::{AtomicUsize, Ordering},
    Mutex,
};

use crablink_tauri_lib::passport_vault_v2_migration_runtime::{
    desktop_v1_to_v2_migration_posture, migrate_desktop_native_passport_v1_to_v2_with_random,
    DesktopV1ToV2MigrationError, DesktopV1ToV2MigrationOutcome,
    PHYSICAL_M1_DESKTOP_V1_TO_V2_MIGRATION_LABEL,
};

use svc_passport::native::{
    decode_native_platform_bound_vault_versioned, encode_native_platform_bound_vault,
    encode_native_vault_authenticated_header, NativeDeviceKeyGenerationError,
    NativeDeviceKeyRandomSource, NativeEncryptedVaultV1, NativePinWrappedCompartmentVmkV1,
    NativePinWrappedVaultKeysV1, NativePlatformBoundVaultV1, NativePlatformBoundVaultVersioned,
    NativePlatformFamily, NativePlatformStorageError, NativePlatformStorageOperation,
    NativeSealedMaterialV1, NativeSecretBytes, NativeSecureCompartment, NativeVaultRecoveryOutcome,
    NativeVaultRemovalOutcome, NativeVaultStore, PHASE15Q_VAULT_MASTER_KEY_BYTES,
    PHASE15Q_WRAPPED_VMK_BYTES,
};

const ROOT_SALT: [u8; 16] = [0x11; 16];
const OPERATIONAL_SALT: [u8; 16] = [0x22; 16];
const ROOT_NONCE: [u8; 24] = [0x33; 24];
const OPERATIONAL_NONCE: [u8; 24] = [0x44; 24];

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum WriteMode {
    Success,
    FailBeforeMutation,
    CommitThenError,
    CorruptThenError,
}

struct MemoryVaultStore {
    vault: Mutex<Option<NativeEncryptedVaultV1>>,
    write_mode: Mutex<WriteMode>,
    write_calls: AtomicUsize,
}

impl MemoryVaultStore {
    fn new(vault: NativeEncryptedVaultV1) -> Self {
        Self {
            vault: Mutex::new(Some(vault)),
            write_mode: Mutex::new(WriteMode::Success),
            write_calls: AtomicUsize::new(0),
        }
    }

    fn set_write_mode(&self, mode: WriteMode) {
        *self.write_mode.lock().expect("write-mode lock") = mode;
    }

    fn write_calls(&self) -> usize {
        self.write_calls.load(Ordering::SeqCst)
    }

    fn stored(&self) -> NativeEncryptedVaultV1 {
        self.vault
            .lock()
            .expect("vault lock")
            .clone()
            .expect("stored vault")
    }
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
        self.write_calls.fetch_add(1, Ordering::SeqCst);

        let mode = *self.write_mode.lock().expect("write-mode lock");

        match mode {
            WriteMode::Success => {
                *self.vault.lock().expect("vault lock") = Some(vault.clone());

                Ok(())
            }

            WriteMode::FailBeforeMutation => Err(NativePlatformStorageError::BackendFailure {
                operation: NativePlatformStorageOperation::WriteEncryptedVaultAtomic,
            }),

            WriteMode::CommitThenError => {
                *self.vault.lock().expect("vault lock") = Some(vault.clone());

                Err(NativePlatformStorageError::BackendFailure {
                    operation: NativePlatformStorageOperation::WriteEncryptedVaultAtomic,
                })
            }

            WriteMode::CorruptThenError => {
                *self.vault.lock().expect("vault lock") = Some(
                    NativeEncryptedVaultV1::new(b"physical-m1-ambiguous-post-write".to_vec())
                        .expect("bounded corrupt fixture"),
                );

                Err(NativePlatformStorageError::BackendFailure {
                    operation: NativePlatformStorageOperation::WriteEncryptedVaultAtomic,
                })
            }
        }
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
    calls: AtomicUsize,
    fail_on_call: Option<usize>,
}

impl SequencedRandom {
    fn success() -> Self {
        Self {
            calls: AtomicUsize::new(0),
            fail_on_call: None,
        }
    }

    fn fail_on(call: usize) -> Self {
        Self {
            calls: AtomicUsize::new(0),
            fail_on_call: Some(call),
        }
    }

    fn calls(&self) -> usize {
        self.calls.load(Ordering::SeqCst)
    }
}

impl NativeDeviceKeyRandomSource for SequencedRandom {
    fn fill(&self, output: &mut [u8]) -> Result<(), NativeDeviceKeyGenerationError> {
        let call = self.calls.fetch_add(1, Ordering::SeqCst) + 1;

        if self.fail_on_call == Some(call) {
            return Err(NativeDeviceKeyGenerationError::RandomnessUnavailable);
        }

        match call {
            1 => {
                for (index, byte) in output.iter_mut().enumerate() {
                    *byte = u8::try_from(index).expect("device-seed index fits");
                }
            }
            _ => output.fill(0xA5),
        }

        Ok(())
    }
}

fn wrapped_compartment(
    compartment: NativeSecureCompartment,
    salt: [u8; 16],
    nonce: [u8; 24],
    ciphertext_byte: u8,
) -> NativePinWrappedCompartmentVmkV1 {
    NativePinWrappedCompartmentVmkV1::new(
        compartment,
        salt,
        nonce,
        encode_native_vault_authenticated_header(compartment, &salt, &nonce),
        vec![ciphertext_byte; PHASE15Q_WRAPPED_VMK_BYTES],
    )
    .expect("wrapped compartment fixture")
}

fn v1() -> NativePlatformBoundVaultV1 {
    NativePlatformBoundVaultV1::new(
        NativePlatformFamily::MacosKeychain,
        NativeSealedMaterialV1::new(
            NativePlatformFamily::MacosKeychain,
            NativeSecureCompartment::RecoveryRoot,
            b"memory://physical-m1/root-factor".to_vec(),
        )
        .expect("root factor"),
        NativeSealedMaterialV1::new(
            NativePlatformFamily::MacosKeychain,
            NativeSecureCompartment::DeviceKey,
            b"memory://physical-m1/operational-factor".to_vec(),
        )
        .expect("operational factor"),
        NativePinWrappedVaultKeysV1::new(
            wrapped_compartment(
                NativeSecureCompartment::RecoveryRoot,
                ROOT_SALT,
                ROOT_NONCE,
                0x55,
            ),
            wrapped_compartment(
                NativeSecureCompartment::DeviceKey,
                OPERATIONAL_SALT,
                OPERATIONAL_NONCE,
                0x66,
            ),
        )
        .expect("wrapped keys"),
    )
    .expect("V1 fixture")
}

fn encoded_v1() -> NativeEncryptedVaultV1 {
    encode_native_platform_bound_vault(&v1()).expect("encoded V1")
}

fn operational_vmk(byte: u8) -> NativeSecretBytes {
    NativeSecretBytes::new(vec![byte; PHASE15Q_VAULT_MASTER_KEY_BYTES]).expect("operational VMK")
}

#[test]
fn physical_m1_desktop_migration_posture_is_narrow() {
    let posture = desktop_v1_to_v2_migration_posture();

    assert_eq!(
        posture.phase_label,
        PHYSICAL_M1_DESKTOP_V1_TO_V2_MIGRATION_LABEL,
    );

    assert!(posture.v1_to_v2_runtime_added);
    assert!(posture.readback_after_every_write_attempt);
    assert!(posture.already_v2_idempotent);

    assert!(!posture.blind_rollback_added);
    assert!(!posture.platform_sealer_used);
    assert!(!posture.root_material_used);
    assert!(!posture.public_tauri_command_added);
    assert!(!posture.frontend_secret_dto_added);
    assert!(!posture.username_mutation_added);
    assert!(!posture.wallet_or_ledger_mutation_added);
}

#[test]
fn physical_m1_successful_migration_writes_and_validates_v2() {
    let store = MemoryVaultStore::new(encoded_v1());
    let random = SequencedRandom::success();
    let vmk = operational_vmk(0x81);

    let outcome = migrate_desktop_native_passport_v1_to_v2_with_random(&random, &store, &vmk)
        .expect("migration succeeds");

    assert_eq!(outcome, DesktopV1ToV2MigrationOutcome::Migrated,);

    assert_eq!(random.calls(), 2);
    assert_eq!(store.write_calls(), 1);

    assert!(matches!(
        decode_native_platform_bound_vault_versioned(&store.stored(),).expect("stored V2"),
        NativePlatformBoundVaultVersioned::V2(_),
    ));
}

#[test]
fn physical_m1_existing_v2_is_idempotent_without_new_randomness_or_write() {
    let store = MemoryVaultStore::new(encoded_v1());
    let first_random = SequencedRandom::success();
    let vmk = operational_vmk(0x82);

    assert_eq!(
        migrate_desktop_native_passport_v1_to_v2_with_random(&first_random, &store, &vmk,)
            .expect("first migration"),
        DesktopV1ToV2MigrationOutcome::Migrated,
    );

    let second_random = SequencedRandom::success();

    assert_eq!(
        migrate_desktop_native_passport_v1_to_v2_with_random(&second_random, &store, &vmk,)
            .expect("idempotent second call"),
        DesktopV1ToV2MigrationOutcome::AlreadyV2,
    );

    assert_eq!(second_random.calls(), 0);
    assert_eq!(store.write_calls(), 1);
}

#[test]
fn physical_m1_write_failure_before_replace_preserves_exact_v1() {
    let original = encoded_v1();
    let original_bytes = original.as_slice().to_vec();

    let store = MemoryVaultStore::new(original);
    store.set_write_mode(WriteMode::FailBeforeMutation);

    let error = migrate_desktop_native_passport_v1_to_v2_with_random(
        &SequencedRandom::success(),
        &store,
        &operational_vmk(0x83),
    )
    .expect_err("write failure must be reported");

    assert_eq!(
        error,
        DesktopV1ToV2MigrationError::WriteFailedOriginalV1Preserved,
    );

    assert_eq!(store.stored().as_slice(), original_bytes.as_slice(),);

    assert_eq!(store.write_calls(), 1);
}

#[test]
fn physical_m1_candidate_observed_after_write_error_is_not_rolled_back() {
    let store = MemoryVaultStore::new(encoded_v1());
    store.set_write_mode(WriteMode::CommitThenError);

    let outcome = migrate_desktop_native_passport_v1_to_v2_with_random(
        &SequencedRandom::success(),
        &store,
        &operational_vmk(0x84),
    )
    .expect("candidate readback classifies outcome");

    assert_eq!(
        outcome,
        DesktopV1ToV2MigrationOutcome::V2ObservedAfterWriteError,
    );

    assert!(matches!(
        decode_native_platform_bound_vault_versioned(&store.stored(),)
            .expect("candidate V2 remains"),
        NativePlatformBoundVaultVersioned::V2(_),
    ));
}

#[test]
fn physical_m1_unknown_post_write_state_is_reported_ambiguous_without_rollback() {
    let store = MemoryVaultStore::new(encoded_v1());
    store.set_write_mode(WriteMode::CorruptThenError);

    let error = migrate_desktop_native_passport_v1_to_v2_with_random(
        &SequencedRandom::success(),
        &store,
        &operational_vmk(0x85),
    )
    .expect_err("unknown state must fail closed");

    assert_eq!(error, DesktopV1ToV2MigrationError::PostWriteStateAmbiguous,);

    assert_eq!(
        store.stored().as_slice(),
        b"physical-m1-ambiguous-post-write",
    );
}

#[test]
fn physical_m1_device_seed_randomness_failure_performs_no_write() {
    let original = encoded_v1();
    let original_bytes = original.as_slice().to_vec();

    let store = MemoryVaultStore::new(original);
    let random = SequencedRandom::fail_on(1);

    let error = migrate_desktop_native_passport_v1_to_v2_with_random(
        &random,
        &store,
        &operational_vmk(0x86),
    )
    .expect_err("device randomness failure");

    assert_eq!(
        error,
        DesktopV1ToV2MigrationError::DeviceKeyGenerationFailed,
    );

    assert_eq!(random.calls(), 1);
    assert_eq!(store.write_calls(), 0);

    assert_eq!(store.stored().as_slice(), original_bytes.as_slice(),);
}

#[test]
fn physical_m1_nonce_randomness_failure_performs_no_write() {
    let original = encoded_v1();
    let original_bytes = original.as_slice().to_vec();

    let store = MemoryVaultStore::new(original);
    let random = SequencedRandom::fail_on(2);

    let error = migrate_desktop_native_passport_v1_to_v2_with_random(
        &random,
        &store,
        &operational_vmk(0x87),
    )
    .expect_err("nonce randomness failure");

    assert_eq!(error, DesktopV1ToV2MigrationError::NonceGenerationFailed,);

    assert_eq!(random.calls(), 2);
    assert_eq!(store.write_calls(), 0);

    assert_eq!(store.stored().as_slice(), original_bytes.as_slice(),);
}

#[test]
fn physical_m1_existing_v2_requires_correct_operational_vmk() {
    let store = MemoryVaultStore::new(encoded_v1());
    let correct_vmk = operational_vmk(0x88);

    migrate_desktop_native_passport_v1_to_v2_with_random(
        &SequencedRandom::success(),
        &store,
        &correct_vmk,
    )
    .expect("initial migration");

    let write_calls_before = store.write_calls();

    let error = migrate_desktop_native_passport_v1_to_v2_with_random(
        &SequencedRandom::success(),
        &store,
        &operational_vmk(0x89),
    )
    .expect_err("wrong VMK must fail authentication");

    assert_eq!(
        error,
        DesktopV1ToV2MigrationError::StoredV2AuthenticationFailed,
    );

    assert_eq!(store.write_calls(), write_calls_before,);
}

#[test]
fn physical_m1_migration_source_has_no_platform_or_frontend_authority() {
    let source = std::fs::read_to_string(
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("src/passport_vault_v2_migration_runtime.rs"),
    )
    .expect("migration source");

    for required in [
        "load_native_encrypted_vault",
        "write_native_encrypted_vault_atomic",
        "decode_native_platform_bound_vault_versioned",
        "prepare_native_platform_bound_vault_v1_to_v2_migration",
        "V2ObservedAfterWriteError",
        "PostWriteStateAmbiguous",
        "OsDesktopNativeDeviceKeyRandomSource",
    ] {
        assert!(
            source.contains(required),
            "migration source missing {required}",
        );
    }

    for forbidden in [
        "std::fs::",
        "tokio::fs",
        "File::create",
        "OpenOptions::",
        "fs::rename",
        "NativePlatformSealer",
        "unseal_native_secret(",
        "seal_native_secret(",
        "#[tauri::command]",
        "tauri::",
        "Keychain",
        "DPAPI",
        "SecretService",
        "passport_username_claim",
        "issue_capability(",
        "wallet.spend(",
        "ledger.write(",
        "mint_roc(",
        "burn_roc(",
        "println!",
        "eprintln!",
        "tracing::",
    ] {
        assert!(
            !source.contains(forbidden),
            "migration source gained forbidden marker {forbidden}",
        );
    }
}

use std::path::PathBuf;
