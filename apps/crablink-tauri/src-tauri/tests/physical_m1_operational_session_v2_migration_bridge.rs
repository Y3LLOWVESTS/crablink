//! RO:WHAT — Integrates the real desktop operational-unlock session with the already-green V1-to-V2 Native Passport migration engine using fixture storage.
//! RO:WHY — Physical M1 must prove migration consumes the VMK from native session custody rather than accepting or exporting it through frontend/API state.
//! RO:INTERACTS — Phase 15S operational unlock, crate-private VMK borrow gate, V1-to-V2 migration runtime, svc-passport vault crypto, and an in-memory NativeVaultStore.
//! RO:INVARIANTS — locked sessions cannot migrate; wrong-factor unlock leaves migration unavailable; successful operational unlock feeds migration without a public VMK accessor; session remains operational after migration; V2 retry is idempotent.
//! RO:METRICS — none.
//! RO:CONFIG — desktop Tauri integration test only.
//! RO:SECURITY — fixture secrets only; no physical Passport path, platform secure-store mutation, WebView DTO, root signing, username mutation, capability issuance, wallet mutation, or ledger mutation.
//! RO:TEST — cargo test --test physical_m1_operational_session_v2_migration_bridge.

use std::sync::{
    atomic::{AtomicUsize, Ordering},
    Mutex, OnceLock,
};

use crablink_tauri_lib::{
    passport_operational_unlock_runtime::{
        unlock_desktop_native_passport_operational_with_factor, DesktopOperationalUnlockError,
        DesktopOperationalVaultSessionState, DesktopOperationalVaultSessionStore,
    },
    passport_vault_v2_migration_runtime::{
        migrate_desktop_native_passport_session_v1_to_v2_with_random,
        DesktopSessionV1ToV2MigrationError, DesktopV1ToV2MigrationOutcome,
    },
};

use svc_passport::native::{
    decode_native_platform_bound_vault_versioned, encode_native_platform_bound_vault,
    wrap_native_compartment_vmk, NativeDeviceKeyGenerationError, NativeDeviceKeyRandomSource,
    NativeEncryptedVaultV1, NativePinWrappedVaultKeysV1, NativePlatformBoundVaultV1,
    NativePlatformBoundVaultVersioned, NativePlatformFamily, NativePlatformStorageError,
    NativeSealedMaterialV1, NativeSecretBytes, NativeSecureCompartment, NativeVaultRecoveryOutcome,
    NativeVaultRemovalOutcome, NativeVaultStore, PHASE15Q_PLATFORM_FACTOR_BYTES,
    PHASE15Q_VAULT_MASTER_KEY_BYTES,
};

const TEST_PIN: &[u8] = b"physical-m1-session-pin";

const ROOT_FACTOR_BYTE: u8 = 0x31;
const OPERATIONAL_FACTOR_BYTE: u8 = 0x32;
const WRONG_OPERATIONAL_FACTOR_BYTE: u8 = 0x99;

const ROOT_VMK_BYTE: u8 = 0x41;
const OPERATIONAL_VMK_BYTE: u8 = 0x42;

const ROOT_SALT: [u8; 16] = [0x51; 16];
const OPERATIONAL_SALT: [u8; 16] = [0x52; 16];

const ROOT_NONCE: [u8; 24] = [0x61; 24];
const OPERATIONAL_NONCE: [u8; 24] = [0x62; 24];

const ROOT_REFERENCE: &[u8] = b"memory://physical-m1-session-root";

const OPERATIONAL_REFERENCE: &[u8] = b"memory://physical-m1-session-operational";

fn secret(byte: u8, length: usize) -> NativeSecretBytes {
    NativeSecretBytes::new(vec![byte; length]).expect("bounded NativeSecretBytes")
}

fn encoded_v1() -> NativeEncryptedVaultV1 {
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
                .expect("wrapped vault keys");

            let sealed_root = NativeSealedMaterialV1::new(
                NativePlatformFamily::MacosKeychain,
                NativeSecureCompartment::RecoveryRoot,
                ROOT_REFERENCE.to_vec(),
            )
            .expect("sealed root fixture");

            let sealed_operational = NativeSealedMaterialV1::new(
                NativePlatformFamily::MacosKeychain,
                NativeSecureCompartment::DeviceKey,
                OPERATIONAL_REFERENCE.to_vec(),
            )
            .expect("sealed operational fixture");

            let vault = NativePlatformBoundVaultV1::new(
                NativePlatformFamily::MacosKeychain,
                sealed_root,
                sealed_operational,
                wrapped_keys,
            )
            .expect("platform-bound V1");

            encode_native_platform_bound_vault(&vault)
                .expect("encode V1")
                .as_slice()
                .to_vec()
        })
        .clone();

    NativeEncryptedVaultV1::new(bytes).expect("bounded V1 fixture")
}

struct MemoryVaultStore {
    vault: Mutex<Option<NativeEncryptedVaultV1>>,
    write_calls: AtomicUsize,
}

impl MemoryVaultStore {
    fn new(vault: NativeEncryptedVaultV1) -> Self {
        Self {
            vault: Mutex::new(Some(vault)),
            write_calls: AtomicUsize::new(0),
        }
    }

    fn stored(&self) -> NativeEncryptedVaultV1 {
        self.vault
            .lock()
            .expect("vault lock")
            .clone()
            .expect("stored vault")
    }

    fn write_calls(&self) -> usize {
        self.write_calls.load(Ordering::SeqCst)
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
    calls: AtomicUsize,
}

impl SequencedRandom {
    fn new() -> Self {
        Self {
            calls: AtomicUsize::new(0),
        }
    }

    fn calls(&self) -> usize {
        self.calls.load(Ordering::SeqCst)
    }
}

impl NativeDeviceKeyRandomSource for SequencedRandom {
    fn fill(&self, output: &mut [u8]) -> Result<(), NativeDeviceKeyGenerationError> {
        let call = self.calls.fetch_add(1, Ordering::SeqCst) + 1;

        match call {
            1 => {
                for (index, byte) in output.iter_mut().enumerate() {
                    *byte = u8::try_from(index).expect("seed index fits");
                }
            }
            _ => output.fill(0xA5),
        }

        Ok(())
    }
}

fn unlock_session(store: &MemoryVaultStore, session: &DesktopOperationalVaultSessionStore) {
    let factor = secret(OPERATIONAL_FACTOR_BYTE, PHASE15Q_PLATFORM_FACTOR_BYTES);

    let outcome =
        unlock_desktop_native_passport_operational_with_factor(store, session, TEST_PIN, &factor)
            .expect("fixture operational unlock");

    assert_eq!(
        outcome.state,
        DesktopOperationalVaultSessionState::OperationalUnlocked,
    );
}

#[test]
fn physical_m1_locked_session_cannot_trigger_migration() {
    let store = MemoryVaultStore::new(encoded_v1());
    let session = DesktopOperationalVaultSessionStore::default();
    let random = SequencedRandom::new();

    let error =
        migrate_desktop_native_passport_session_v1_to_v2_with_random(&random, &store, &session)
            .expect_err("locked session must reject migration");

    assert_eq!(
        error,
        DesktopSessionV1ToV2MigrationError::OperationalSessionUnavailable,
    );

    assert_eq!(random.calls(), 0);
    assert_eq!(store.write_calls(), 0);

    assert!(matches!(
        decode_native_platform_bound_vault_versioned(&store.stored(),).expect("original V1"),
        NativePlatformBoundVaultVersioned::V1(_),
    ));
}

#[test]
fn physical_m1_wrong_factor_keeps_session_locked_and_migration_unavailable() {
    let store = MemoryVaultStore::new(encoded_v1());
    let session = DesktopOperationalVaultSessionStore::default();

    let wrong_factor = secret(
        WRONG_OPERATIONAL_FACTOR_BYTE,
        PHASE15Q_PLATFORM_FACTOR_BYTES,
    );

    assert_eq!(
        unlock_desktop_native_passport_operational_with_factor(
            &store,
            &session,
            TEST_PIN,
            &wrong_factor,
        ),
        Err(DesktopOperationalUnlockError::UnlockRejected,),
    );

    assert_eq!(
        session.state().expect("session state"),
        DesktopOperationalVaultSessionState::Locked,
    );

    let random = SequencedRandom::new();

    assert_eq!(
        migrate_desktop_native_passport_session_v1_to_v2_with_random(&random, &store, &session,),
        Err(DesktopSessionV1ToV2MigrationError::OperationalSessionUnavailable,),
    );

    assert_eq!(random.calls(), 0);
    assert_eq!(store.write_calls(), 0);
}

#[test]
fn physical_m1_real_unlock_session_custody_drives_v2_migration() {
    let store = MemoryVaultStore::new(encoded_v1());
    let session = DesktopOperationalVaultSessionStore::default();

    unlock_session(&store, &session);

    assert_eq!(
        session.operational_vmk_len().expect("VMK length"),
        Some(PHASE15Q_VAULT_MASTER_KEY_BYTES),
    );

    let random = SequencedRandom::new();

    let outcome =
        migrate_desktop_native_passport_session_v1_to_v2_with_random(&random, &store, &session)
            .expect("session-owned migration");

    assert_eq!(outcome, DesktopV1ToV2MigrationOutcome::Migrated,);

    assert_eq!(random.calls(), 2);
    assert_eq!(store.write_calls(), 1);

    assert_eq!(
        session.state().expect("session remains unlocked"),
        DesktopOperationalVaultSessionState::OperationalUnlocked,
    );

    assert!(matches!(
        decode_native_platform_bound_vault_versioned(&store.stored(),).expect("stored V2"),
        NativePlatformBoundVaultVersioned::V2(_),
    ));
}

#[test]
fn physical_m1_session_migration_is_idempotent_without_new_randomness() {
    let store = MemoryVaultStore::new(encoded_v1());
    let session = DesktopOperationalVaultSessionStore::default();

    unlock_session(&store, &session);

    let first_random = SequencedRandom::new();

    assert_eq!(
        migrate_desktop_native_passport_session_v1_to_v2_with_random(
            &first_random,
            &store,
            &session,
        )
        .expect("initial migration"),
        DesktopV1ToV2MigrationOutcome::Migrated,
    );

    assert_eq!(first_random.calls(), 2);

    let second_random = SequencedRandom::new();

    assert_eq!(
        migrate_desktop_native_passport_session_v1_to_v2_with_random(
            &second_random,
            &store,
            &session,
        )
        .expect("idempotent migration"),
        DesktopV1ToV2MigrationOutcome::AlreadyV2,
    );

    assert_eq!(second_random.calls(), 0);
    assert_eq!(store.write_calls(), 1);
}

#[test]
fn physical_m1_session_bridge_is_crate_private_and_non_serializing() {
    let root = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));

    let session_source =
        std::fs::read_to_string(root.join("src/passport_operational_unlock_runtime.rs"))
            .expect("session source");

    let migration_source =
        std::fs::read_to_string(root.join("src/passport_vault_v2_migration_runtime.rs"))
            .expect("migration source");

    assert!(session_source.contains("pub(crate) fn with_operational_vmk_for_vault_migration",),);

    assert!(
        !session_source.contains("pub fn with_operational_vmk_for_vault_migration",),
        "operational VMK migration gate must not become public",
    );

    let bridge_start = session_source
        .find("pub(crate) fn with_operational_vmk_for_vault_migration")
        .expect("bridge method start");

    let bridge_open = session_source[bridge_start..]
        .find('{')
        .map(|offset| bridge_start + offset)
        .expect("bridge method opening brace");

    let mut bridge_depth = 0usize;
    let mut bridge_end = None;

    for (offset, byte) in session_source.as_bytes()[bridge_open..].iter().enumerate() {
        match byte {
            b'{' => bridge_depth += 1,
            b'}' => {
                bridge_depth = bridge_depth.checked_sub(1).expect("bridge brace depth");

                if bridge_depth == 0 {
                    bridge_end = Some(bridge_open + offset + 1);
                    break;
                }
            }
            _ => {}
        }
    }

    let bridge_end = bridge_end.expect("bridge method closing brace");
    let bridge_source = &session_source[bridge_start..bridge_end];

    for forbidden in [
        ".to_vec()",
        ".clone()",
        "async ",
        ".await",
        "serde",
        "tauri",
        "println!",
        "eprintln!",
        "tracing::",
    ] {
        assert!(
            !bridge_source.contains(forbidden),
            "session migration bridge gained forbidden marker {forbidden}",
        );
    }

    for required in [
        "with_operational_vmk_for_vault_migration",
        "DesktopOperationalVaultSessionStore",
        "migrate_desktop_native_passport_v1_to_v2_with_random",
        "OperationalSessionUnavailable",
    ] {
        assert!(
            migration_source.contains(required),
            "migration runtime missing session bridge marker {required}",
        );
    }

    for forbidden in [
        "#[tauri::command]",
        "serde::Serialize",
        "serde::Deserialize",
        "request_operational_pin",
        "unseal_native_secret(",
        "NativePlatformSealer",
        "wallet.spend(",
        "ledger.write(",
        "issue_capability(",
    ] {
        assert!(
            !migration_source.contains(forbidden),
            "session migration runtime gained forbidden marker {forbidden}",
        );
    }
}
