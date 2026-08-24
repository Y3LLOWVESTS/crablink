//! RO:WHAT — Proves Native Passport V1-to-V2 migration survives actual DesktopAtomicVaultStore persistence and fresh runtime reconstruction.
//! RO:WHY — Physical M1 must establish restart-safe device-key custody before the existing physical Passport vault is migrated.
//! RO:INTERACTS — DesktopAtomicVaultStore, versioned V1/V2 operational unlock, NativePlatformSealer, session-owned migration, and canonical svc-passport device identity derivation.
//! RO:INVARIANTS — only an OS temporary directory is used; V1 remains unlockable; V2 atomically replaces V1; no temporary file remains; fresh store/session/sealer objects unlock V2; persisted device identity is unchanged; already-V2 retry does not rewrite.
//! RO:METRICS — none.
//! RO:CONFIG — desktop integration test only.
//! RO:SECURITY — fixture secrets only; no application-data Passport path, real platform secure-store mutation, WebView DTO, root signing, capability issuance, username mutation, wallet mutation, or ledger mutation.
//! RO:TEST — cargo test --test physical_m1_real_atomic_store_v2_restart.

use std::{
    fs,
    path::{Path, PathBuf},
    sync::atomic::{AtomicUsize, Ordering},
    time::{SystemTime, UNIX_EPOCH},
};

use crablink_tauri_lib::{
    passport_operational_unlock_runtime::{
        unlock_desktop_native_passport_operational, DesktopOperationalUnlockError,
        DesktopOperationalVaultSessionState, DesktopOperationalVaultSessionStore,
    },
    passport_vault_store::DesktopAtomicVaultStore,
    passport_vault_v2_migration_runtime::{
        migrate_desktop_native_passport_session_v1_to_v2_with_random,
        read_desktop_native_passport_session_device_public_identity,
        DesktopSessionDevicePublicIdentityError, DesktopV1ToV2MigrationOutcome,
    },
};

use svc_passport::native::{
    decode_native_platform_bound_vault_versioned, decrypt_native_operational_device_payload_v1,
    derive_native_device_public_identity_v1, encode_native_platform_bound_vault,
    load_native_encrypted_vault, recover_native_interrupted_vault_write,
    wrap_native_compartment_vmk, write_native_encrypted_vault_atomic,
    NativeDeviceKeyGenerationError, NativeDeviceKeyRandomSource, NativeDevicePublicIdentityV1,
    NativeEncryptedVaultV1, NativePinWrappedVaultKeysV1, NativePlatformBoundVaultV1,
    NativePlatformBoundVaultVersioned, NativePlatformFamily, NativePlatformSealer,
    NativePlatformStorageError, NativePlatformStorageOperation, NativeSealedMaterialV1,
    NativeSecretBytes, NativeSecureCompartment, NativeVaultRecoveryOutcome,
    PHASE15Q_PLATFORM_FACTOR_BYTES, PHASE15Q_VAULT_MASTER_KEY_BYTES,
};

const TEST_PIN: &[u8] = b"physical-m1-real-store-restart-pin";

const ROOT_FACTOR_BYTE: u8 = 0x21;
const OPERATIONAL_FACTOR_BYTE: u8 = 0x22;
const WRONG_OPERATIONAL_FACTOR_BYTE: u8 = 0x91;

const ROOT_VMK_BYTE: u8 = 0x31;
const OPERATIONAL_VMK_BYTE: u8 = 0x32;

const ROOT_SALT: [u8; 16] = [0x41; 16];
const OPERATIONAL_SALT: [u8; 16] = [0x42; 16];

const ROOT_NONCE: [u8; 24] = [0x51; 24];
const OPERATIONAL_NONCE: [u8; 24] = [0x52; 24];

const ROOT_REFERENCE: &[u8] = b"memory://physical-m1-real-store/root-factor";

const OPERATIONAL_REFERENCE: &[u8] = b"memory://physical-m1-real-store/operational-factor";

static TEST_DIRECTORY_COUNTER: AtomicUsize = AtomicUsize::new(0);

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
            "crablink-physical-m1-v2-restart-{label}-{}-{timestamp}-{counter}",
            std::process::id(),
        ));

        assert!(path.is_absolute());

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
                    *byte = u8::try_from(index).expect("device seed index fits");
                }
            }
            _ => output.fill(0xA5),
        }

        Ok(())
    }
}

struct FixtureOperationalSealer {
    factor_byte: u8,
    unseal_calls: AtomicUsize,
}

impl FixtureOperationalSealer {
    fn new(factor_byte: u8) -> Self {
        Self {
            factor_byte,
            unseal_calls: AtomicUsize::new(0),
        }
    }

    fn unseal_calls(&self) -> usize {
        self.unseal_calls.load(Ordering::SeqCst)
    }
}

impl NativePlatformSealer for FixtureOperationalSealer {
    fn platform_family(&self) -> NativePlatformFamily {
        NativePlatformFamily::MacosKeychain
    }

    fn seal(
        &self,
        _compartment: NativeSecureCompartment,
        _material: &NativeSecretBytes,
    ) -> Result<NativeSealedMaterialV1, NativePlatformStorageError> {
        Err(NativePlatformStorageError::BackendFailure {
            operation: NativePlatformStorageOperation::Seal,
        })
    }

    fn unseal(
        &self,
        sealed: &NativeSealedMaterialV1,
    ) -> Result<NativeSecretBytes, NativePlatformStorageError> {
        self.unseal_calls.fetch_add(1, Ordering::SeqCst);

        if sealed.compartment != NativeSecureCompartment::DeviceKey {
            return Err(NativePlatformStorageError::BackendFailure {
                operation: NativePlatformStorageOperation::Unseal,
            });
        }

        secret(self.factor_byte, PHASE15Q_PLATFORM_FACTOR_BYTES).pipe(Ok)
    }
}

trait Pipe: Sized {
    fn pipe<T>(self, function: impl FnOnce(Self) -> T) -> T {
        function(self)
    }
}

impl<T> Pipe for T {}

fn secret(byte: u8, length: usize) -> NativeSecretBytes {
    NativeSecretBytes::new(vec![byte; length]).expect("bounded NativeSecretBytes")
}

fn operational_vmk() -> NativeSecretBytes {
    secret(OPERATIONAL_VMK_BYTE, PHASE15Q_VAULT_MASTER_KEY_BYTES)
}

fn encoded_v1() -> NativeEncryptedVaultV1 {
    let root_factor = secret(ROOT_FACTOR_BYTE, PHASE15Q_PLATFORM_FACTOR_BYTES);

    let operational_factor = secret(OPERATIONAL_FACTOR_BYTE, PHASE15Q_PLATFORM_FACTOR_BYTES);

    let root_vmk = secret(ROOT_VMK_BYTE, PHASE15Q_VAULT_MASTER_KEY_BYTES);

    let operational_vmk = operational_vmk();

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

    let wrapped_keys =
        NativePinWrappedVaultKeysV1::new(root_wrapped, operational_wrapped).expect("wrapped keys");

    let root_factor = NativeSealedMaterialV1::new(
        NativePlatformFamily::MacosKeychain,
        NativeSecureCompartment::RecoveryRoot,
        ROOT_REFERENCE.to_vec(),
    )
    .expect("sealed root fixture");

    let operational_factor = NativeSealedMaterialV1::new(
        NativePlatformFamily::MacosKeychain,
        NativeSecureCompartment::DeviceKey,
        OPERATIONAL_REFERENCE.to_vec(),
    )
    .expect("sealed operational fixture");

    let vault = NativePlatformBoundVaultV1::new(
        NativePlatformFamily::MacosKeychain,
        root_factor,
        operational_factor,
        wrapped_keys,
    )
    .expect("valid V1 vault");

    encode_native_platform_bound_vault(&vault).expect("encode V1 vault")
}

fn unlock_with_sealer(
    store: &DesktopAtomicVaultStore,
    session: &DesktopOperationalVaultSessionStore,
    factor_byte: u8,
) -> Result<usize, DesktopOperationalUnlockError> {
    let sealer = FixtureOperationalSealer::new(factor_byte);

    let outcome = unlock_desktop_native_passport_operational(store, &sealer, session, TEST_PIN)?;

    assert_eq!(
        outcome.state,
        DesktopOperationalVaultSessionState::OperationalUnlocked,
    );

    Ok(sealer.unseal_calls())
}

fn persisted_device_identity(store: &DesktopAtomicVaultStore) -> NativeDevicePublicIdentityV1 {
    let encoded = load_native_encrypted_vault(store)
        .expect("load persisted vault")
        .expect("persisted vault exists");

    let versioned =
        decode_native_platform_bound_vault_versioned(&encoded).expect("decode versioned vault");

    let v2 = match versioned {
        NativePlatformBoundVaultVersioned::V2(v2) => v2,
        NativePlatformBoundVaultVersioned::V1(_) => {
            panic!("expected persisted V2 vault");
        }
    };

    let vmk = operational_vmk();

    let payload =
        decrypt_native_operational_device_payload_v1(&vmk, v2.operational_device_payload())
            .expect("decrypt persisted device payload");

    derive_native_device_public_identity_v1(payload.device_signing_seed())
        .expect("derive persisted public device identity")
}

#[test]
fn physical_m1_real_atomic_store_v2_survives_fresh_runtime_restart() {
    let directory = TestDirectory::new("restart");

    let original_v1 = encoded_v1();
    let original_v1_bytes = original_v1.as_slice().to_vec();

    let committed_v2_bytes;
    let identity_before_restart;

    {
        let store = DesktopAtomicVaultStore::new(directory.path())
            .expect("real desktop atomic vault store");

        write_native_encrypted_vault_atomic(&store, &original_v1).expect("persist V1 atomically");

        assert!(store.vault_path().is_file());
        assert!(!store.temporary_path().exists());

        let loaded_v1 = load_native_encrypted_vault(&store)
            .expect("load V1")
            .expect("V1 exists");

        assert_eq!(loaded_v1.as_slice(), original_v1_bytes.as_slice(),);

        assert!(matches!(
            decode_native_platform_bound_vault_versioned(&loaded_v1,).expect("decode V1"),
            NativePlatformBoundVaultVersioned::V1(_),
        ));

        let session = DesktopOperationalVaultSessionStore::default();

        assert_eq!(
            unlock_with_sealer(&store, &session, OPERATIONAL_FACTOR_BYTE,)
                .expect("unlock persisted V1"),
            1,
            "ordinary unlock must unseal only the operational factor",
        );

        let random = SequencedRandom::new();

        assert_eq!(
            migrate_desktop_native_passport_session_v1_to_v2_with_random(
                &random,
                &store,
                &session,
            )
            .expect("migrate V1 to V2"),
            DesktopV1ToV2MigrationOutcome::Migrated,
        );

        assert_eq!(random.calls(), 2);

        assert!(store.vault_path().is_file());
        assert!(!store.temporary_path().exists());

        let loaded_v2 = load_native_encrypted_vault(&store)
            .expect("load V2")
            .expect("V2 exists");

        assert!(matches!(
            decode_native_platform_bound_vault_versioned(&loaded_v2,).expect("decode V2"),
            NativePlatformBoundVaultVersioned::V2(_),
        ));

        assert_ne!(loaded_v2.as_slice(), original_v1_bytes.as_slice(),);

        committed_v2_bytes = loaded_v2.as_slice().to_vec();

        identity_before_restart = persisted_device_identity(&store);

        assert!(session.lock().expect("lock pre-restart session"),);
    }

    {
        let store = DesktopAtomicVaultStore::new(directory.path())
            .expect("fresh desktop atomic vault store");

        assert_eq!(
            recover_native_interrupted_vault_write(&store,).expect("restart recovery"),
            NativeVaultRecoveryOutcome::NoRecoveryNeeded,
        );

        assert!(!store.temporary_path().exists());

        let reopened = load_native_encrypted_vault(&store)
            .expect("reopen persisted V2")
            .expect("V2 survives restart");

        assert_eq!(
            reopened.as_slice(),
            committed_v2_bytes.as_slice(),
            "restart must reopen the exact committed V2 bytes",
        );

        let fresh_session = DesktopOperationalVaultSessionStore::default();

        assert_eq!(
            unlock_with_sealer(&store, &fresh_session, OPERATIONAL_FACTOR_BYTE,)
                .expect("fresh runtime V2 unlock"),
            1,
            "V2 unlock must still unseal only operational factor",
        );

        let identity_after_restart = persisted_device_identity(&store);

        assert_eq!(
            identity_after_restart, identity_before_restart,
            "device identity must survive restart unchanged",
        );

        let session_identity_after_restart =
            read_desktop_native_passport_session_device_public_identity(&store, &fresh_session)
                .expect("fresh unlocked V2 session public identity");

        assert_eq!(
            session_identity_after_restart, identity_after_restart,
            "session-owned VMK reader must return the canonical persisted identity",
        );

        let retry_random = SequencedRandom::new();

        assert_eq!(
            migrate_desktop_native_passport_session_v1_to_v2_with_random(
                &retry_random,
                &store,
                &fresh_session,
            )
            .expect("already-V2 idempotency"),
            DesktopV1ToV2MigrationOutcome::AlreadyV2,
        );

        assert_eq!(
            retry_random.calls(),
            0,
            "already-V2 restart must generate no new secret material",
        );

        let after_retry = load_native_encrypted_vault(&store)
            .expect("load after retry")
            .expect("V2 remains");

        assert_eq!(
            after_retry.as_slice(),
            committed_v2_bytes.as_slice(),
            "already-V2 check must not rewrite storage",
        );

        assert!(!store.temporary_path().exists());

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;

            let mode = fs::metadata(store.vault_path())
                .expect("vault metadata")
                .permissions()
                .mode()
                & 0o777;

            assert_eq!(mode, 0o600, "persisted vault file must remain private",);
        }
    }
}

#[test]
fn physical_m1_fresh_v2_runtime_wrong_platform_factor_fails_without_mutation() {
    let directory = TestDirectory::new("wrong-factor");

    let committed_v2_bytes;

    {
        let store = DesktopAtomicVaultStore::new(directory.path())
            .expect("real desktop atomic vault store");

        write_native_encrypted_vault_atomic(&store, &encoded_v1()).expect("persist V1");

        let session = DesktopOperationalVaultSessionStore::default();

        unlock_with_sealer(&store, &session, OPERATIONAL_FACTOR_BYTE).expect("unlock V1");

        migrate_desktop_native_passport_session_v1_to_v2_with_random(
            &SequencedRandom::new(),
            &store,
            &session,
        )
        .expect("migrate V1 to V2");

        committed_v2_bytes = load_native_encrypted_vault(&store)
            .expect("load committed V2")
            .expect("V2 exists")
            .as_slice()
            .to_vec();
    }

    let store = DesktopAtomicVaultStore::new(directory.path()).expect("fresh store");

    let fresh_session = DesktopOperationalVaultSessionStore::default();

    assert_eq!(
        unlock_with_sealer(&store, &fresh_session, WRONG_OPERATIONAL_FACTOR_BYTE,),
        Err(DesktopOperationalUnlockError::UnlockRejected,),
    );

    assert_eq!(
        fresh_session.state().expect("fresh session state"),
        DesktopOperationalVaultSessionState::Locked,
    );

    let after_rejection = load_native_encrypted_vault(&store)
        .expect("load after rejected unlock")
        .expect("V2 remains");

    assert_eq!(
        after_rejection.as_slice(),
        committed_v2_bytes.as_slice(),
        "wrong-factor unlock must not mutate V2",
    );

    assert!(!store.temporary_path().exists());
}

#[test]
fn physical_m1_locked_session_cannot_read_v2_device_identity() {
    let directory = TestDirectory::new("locked-identity");

    let store =
        DesktopAtomicVaultStore::new(directory.path()).expect("real desktop atomic vault store");

    write_native_encrypted_vault_atomic(&store, &encoded_v1()).expect("persist V1");

    let session = DesktopOperationalVaultSessionStore::default();

    unlock_with_sealer(&store, &session, OPERATIONAL_FACTOR_BYTE).expect("unlock V1");

    migrate_desktop_native_passport_session_v1_to_v2_with_random(
        &SequencedRandom::new(),
        &store,
        &session,
    )
    .expect("migrate fixture to V2");

    assert!(session.lock().expect("lock fixture session"),);

    assert_eq!(
        read_desktop_native_passport_session_device_public_identity(&store, &session,),
        Err(DesktopSessionDevicePublicIdentityError::OperationalSessionUnavailable,),
    );

    assert!(!store.temporary_path().exists(),);
}
