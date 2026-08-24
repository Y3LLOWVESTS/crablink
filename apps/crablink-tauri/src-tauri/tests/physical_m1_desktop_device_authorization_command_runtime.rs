//! RO:WHAT — Focused Physical M1 tests for fresh root-confirmed desktop DeviceAuthorization signing orchestration.
//!
//! RO:WHY — Proves CrabLink can turn trusted unsigned runtime facts into one strictly verified public root authorization without persistent root unlock or WebView secret custody.
//!
//! RO:INTERACTS — deterministic desktop vault creation, operational session, native root-confirmation surface, RecoveryRoot verification, `svc-passport` signer, and `ron-auth` verification.
//!
//! RO:INVARIANTS — locked sessions reject before prompting; cancellation rejects before RecoveryRoot unseal; wrong root PIN creates no authorization; successful signing performs no vault write.
//!
//! RO:METRICS — none.
//!
//! RO:CONFIG — deterministic test nonce/time only; private-beta product constants remain production-owned.
//!
//! RO:SECURITY — all test secrets remain process-local; no live Keychain, Tauri command, HTTP, persistence mutation after create, capability, username, wallet, or ledger mutation.
//!
//! RO:TEST — focused Cargo test target of this file.

use std::sync::{
    atomic::{AtomicU8, AtomicUsize, Ordering},
    Mutex,
};

use crablink_native_core::gateway_profile::GatewayEnvironmentProfile;
use crablink_tauri_lib::{
    passport_device_authorization_command_runtime::{
        authorize_physical_m1_private_beta_root_admin_desktop_with_sources,
        DesktopDeviceAuthorizationCommandRuntimeError,
        PHYSICAL_M1_ROOT_CONFIRMED_DEVICE_AUTHORIZATION_RUNTIME_LABEL,
    },
    passport_device_authorization_runtime_context::{
        DesktopDeviceAuthorizationClock, DesktopDeviceAuthorizationNonceRandomSource,
        DesktopDeviceAuthorizationRuntimeContextError,
    },
    passport_operational_command_runtime::{
        DesktopNativeSecretSurfaceError, DesktopNativeSecretSurfaceOutcome,
        DesktopNativeSecretSurfacePort,
    },
    passport_operational_unlock_runtime::{
        unlock_desktop_native_passport_operational, DesktopOperationalVaultSessionState,
        DesktopOperationalVaultSessionStore,
    },
    passport_vault_create_runtime::{
        create_desktop_native_passport_vault_with_random, NativeVaultRandomSource,
    },
};

use ron_proto::DeviceClassV1;

use svc_passport::native::{
    derive_native_device_id_v1, derive_native_recovery_public_identity_v1, Ed25519PublicKeyHex,
    NativeDevicePublicIdentityV1, NativeEncryptedVaultV1, NativePlatformFamily,
    NativePlatformSealer, NativePlatformStorageError, NativePlatformStorageOperation,
    NativeSealedMaterialV1, NativeSecretBytes, NativeSecureCompartment, NativeVaultRecoveryOutcome,
    NativeVaultRemovalOutcome, NativeVaultStore, RootPassportDescriptorV1,
};

const TEST_PIN: &[u8] = b"physical-m1-root-confirm";
const WRONG_PIN: &[u8] = b"physical-m1-wrong-root";
const FIXED_NOW_MS: u64 = 1_800_000_000_000;

const DEVICE_PUBLIC_KEY: &str = "2dfbfd60452275c726f8beb1a3d6ff9e91abbe670977716225807e4645044b17";

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
    fn recovery_factor(&self) -> NativeSecretBytes {
        let sealed = self.sealed.lock().expect("sealed material lock");

        let (_, material) = sealed
            .iter()
            .find(|(compartment, _)| *compartment == NativeSecureCompartment::RecoveryRoot)
            .expect("RecoveryRoot material created");

        NativeSecretBytes::new(material.as_slice().to_vec()).expect("RecoveryRoot test copy")
    }

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
            format!("memory://physical-m1-root-auth/{compartment:?}").into_bytes(),
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

enum RootPromptPlan {
    Secret(Vec<u8>),
    Cancelled,
}

struct RootPromptSurface {
    plan: Mutex<Option<RootPromptPlan>>,
    root_calls: AtomicUsize,
}

impl RootPromptSurface {
    fn secret(pin: &[u8]) -> Self {
        Self {
            plan: Mutex::new(Some(RootPromptPlan::Secret(pin.to_vec()))),
            root_calls: AtomicUsize::new(0),
        }
    }

    fn cancelled() -> Self {
        Self {
            plan: Mutex::new(Some(RootPromptPlan::Cancelled)),
            root_calls: AtomicUsize::new(0),
        }
    }

    fn root_calls(&self) -> usize {
        self.root_calls.load(Ordering::SeqCst)
    }
}

impl DesktopNativeSecretSurfacePort for RootPromptSurface {
    fn request_operational_pin(
        &self,
    ) -> Result<DesktopNativeSecretSurfaceOutcome, DesktopNativeSecretSurfaceError> {
        Ok(DesktopNativeSecretSurfaceOutcome::Unavailable)
    }

    fn request_root_confirmation_pin(
        &self,
    ) -> Result<DesktopNativeSecretSurfaceOutcome, DesktopNativeSecretSurfaceError> {
        self.root_calls.fetch_add(1, Ordering::SeqCst);

        let plan = self
            .plan
            .lock()
            .expect("root prompt plan")
            .take()
            .expect("one root prompt plan");

        match plan {
            RootPromptPlan::Secret(pin) => NativeSecretBytes::new(pin)
                .map(DesktopNativeSecretSurfaceOutcome::Secret)
                .map_err(|_| DesktopNativeSecretSurfaceError::Unavailable),

            RootPromptPlan::Cancelled => Ok(DesktopNativeSecretSurfaceOutcome::Cancelled),
        }
    }
}

#[derive(Debug, Clone, Copy)]
struct FixedNonce;

impl DesktopDeviceAuthorizationNonceRandomSource for FixedNonce {
    fn fill_authorization_nonce(
        &self,
        output: &mut [u8; 16],
    ) -> Result<(), DesktopDeviceAuthorizationRuntimeContextError> {
        *output = [
            0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d,
            0x0e, 0x0f,
        ];

        Ok(())
    }
}

#[derive(Debug, Clone, Copy)]
struct FixedClock;

impl DesktopDeviceAuthorizationClock for FixedClock {
    fn now_ms(&self) -> Result<u64, DesktopDeviceAuthorizationRuntimeContextError> {
        Ok(FIXED_NOW_MS)
    }
}

fn device_identity() -> NativeDevicePublicIdentityV1 {
    let device_public_key =
        Ed25519PublicKeyHex::parse(DEVICE_PUBLIC_KEY).expect("device public key");

    let device_id = derive_native_device_id_v1(&device_public_key).expect("Device ID");

    NativeDevicePublicIdentityV1 {
        device_id,
        device_public_key,
    }
}

fn create_vault_fixture() -> (
    MemoryVaultStore,
    RecordingPlatformSealer,
    RootPassportDescriptorV1,
) {
    let store = MemoryVaultStore::default();
    let sealer = RecordingPlatformSealer::default();

    create_desktop_native_passport_vault_with_random(
        &SequencedRandom::new(),
        &store,
        &sealer,
        TEST_PIN,
    )
    .expect("create deterministic platform-bound vault");

    let recovery_factor = sealer.recovery_factor();

    let root = derive_native_recovery_public_identity_v1(&recovery_factor)
        .expect("derive root identity from actual test RecoveryRoot factor");

    (store, sealer, root)
}

fn unlock_fixture(
    store: &MemoryVaultStore,
    sealer: &RecordingPlatformSealer,
) -> DesktopOperationalVaultSessionStore {
    let session = DesktopOperationalVaultSessionStore::default();

    unlock_desktop_native_passport_operational(store, sealer, &session, TEST_PIN)
        .expect("operationally unlock deterministic vault");

    sealer.reset_unsealed_compartments();

    session
}

#[test]
fn physical_m1_root_confirmed_runtime_signs_and_strictly_verifies_public_authorization() {
    assert_eq!(
        PHYSICAL_M1_ROOT_CONFIRMED_DEVICE_AUTHORIZATION_RUNTIME_LABEL,
        "PHYSICAL_M1_ROOT_CONFIRMED_DEVICE_AUTHORIZATION_RUNTIME_V1",
    );

    let (store, sealer, root) = create_vault_fixture();
    let session = unlock_fixture(&store, &sealer);
    let surface = RootPromptSurface::secret(TEST_PIN);

    let authorization = authorize_physical_m1_private_beta_root_admin_desktop_with_sources(
        &store,
        &sealer,
        &session,
        &surface,
        &root,
        &device_identity(),
        GatewayEnvironmentProfile::DevelopmentLan,
        &FixedNonce,
        &FixedClock,
    )
    .expect("root-confirmed DeviceAuthorization");

    assert_eq!(authorization.network_id.as_str(), "rustyonions-devnet");
    assert_eq!(authorization.environment.as_str(), "private-beta");
    assert_eq!(authorization.root_key_epoch, 0);
    assert_eq!(authorization.device_class, DeviceClassV1::RootAdminDesktop,);
    assert_eq!(authorization.issued_at_ms, FIXED_NOW_MS);
    assert_eq!(authorization.expires_at_ms, None);

    assert_eq!(surface.root_calls(), 1);

    assert_eq!(
        sealer.unsealed_compartments(),
        vec![NativeSecureCompartment::RecoveryRoot],
    );

    assert_eq!(
        store.write_calls(),
        1,
        "authorization ceremony must not rewrite the Passport vault",
    );

    assert_eq!(
        session.state().expect("session remains readable"),
        DesktopOperationalVaultSessionState::OperationalUnlocked,
    );
}

#[test]
fn physical_m1_locked_session_rejects_before_prompt_or_recovery_root_unseal() {
    let (store, sealer, root) = create_vault_fixture();
    let session = DesktopOperationalVaultSessionStore::default();
    let surface = RootPromptSurface::secret(TEST_PIN);

    sealer.reset_unsealed_compartments();

    let error = authorize_physical_m1_private_beta_root_admin_desktop_with_sources(
        &store,
        &sealer,
        &session,
        &surface,
        &root,
        &device_identity(),
        GatewayEnvironmentProfile::DevelopmentLan,
        &FixedNonce,
        &FixedClock,
    )
    .expect_err("locked session must reject");

    assert_eq!(
        error,
        DesktopDeviceAuthorizationCommandRuntimeError::OperationalUnlockRequired,
    );

    assert_eq!(surface.root_calls(), 0);
    assert!(sealer.unsealed_compartments().is_empty());
    assert_eq!(store.write_calls(), 1);
}

#[test]
fn physical_m1_root_confirmation_cancel_rejects_before_recovery_root_unseal() {
    let (store, sealer, root) = create_vault_fixture();
    let session = unlock_fixture(&store, &sealer);
    let surface = RootPromptSurface::cancelled();

    let error = authorize_physical_m1_private_beta_root_admin_desktop_with_sources(
        &store,
        &sealer,
        &session,
        &surface,
        &root,
        &device_identity(),
        GatewayEnvironmentProfile::DevelopmentLan,
        &FixedNonce,
        &FixedClock,
    )
    .expect_err("cancelled root confirmation must reject");

    assert_eq!(
        error,
        DesktopDeviceAuthorizationCommandRuntimeError::RootConfirmationCancelled,
    );

    assert_eq!(surface.root_calls(), 1);
    assert!(sealer.unsealed_compartments().is_empty());
    assert_eq!(store.write_calls(), 1);
}

#[test]
fn physical_m1_wrong_root_pin_rejects_without_authorization_or_vault_mutation() {
    let (store, sealer, root) = create_vault_fixture();
    let session = unlock_fixture(&store, &sealer);
    let surface = RootPromptSurface::secret(WRONG_PIN);

    let error = authorize_physical_m1_private_beta_root_admin_desktop_with_sources(
        &store,
        &sealer,
        &session,
        &surface,
        &root,
        &device_identity(),
        GatewayEnvironmentProfile::DevelopmentLan,
        &FixedNonce,
        &FixedClock,
    )
    .expect_err("wrong root PIN must reject");

    assert_eq!(
        error,
        DesktopDeviceAuthorizationCommandRuntimeError::RootPinRejected,
    );

    assert_eq!(surface.root_calls(), 1);

    assert_eq!(
        sealer.unsealed_compartments(),
        vec![NativeSecureCompartment::RecoveryRoot],
    );

    assert_eq!(store.write_calls(), 1);
}

#[test]
fn physical_m1_root_confirmed_runtime_source_keeps_signing_native_and_nonpersistent() {
    let source = std::fs::read_to_string(
        std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("src/passport_device_authorization_command_runtime.rs"),
    )
    .expect("root-confirmed authorization runtime source");

    for required in [
        "OperationalUnlocked",
        "request_root_confirmation_pin",
        "NativeSecureCompartment::RecoveryRoot",
        "verify_native_recovery_root_pin",
        "sign_native_recovery_device_authorization_v1",
        "verify_device_authorization_v1_strict",
        "DeviceAuthorizationVerificationContextV1",
        "PHYSICAL_M1_PRIVATE_BETA_NETWORK_ID",
        "PHYSICAL_M1_PRIVATE_BETA_AUTHORIZATION_ENVIRONMENT",
        "PHYSICAL_M1_PRIVATE_BETA_ROOT_KEY_EPOCH",
    ] {
        assert!(
            source.contains(required),
            "root-confirmed runtime missing required boundary {required}",
        );
    }

    for forbidden in [
        "#[tauri::command]",
        "tauri::command",
        "reqwest::",
        "std::fs::write",
        "tokio::fs",
        "write_native_encrypted_vault_atomic",
        "issue_capability(",
        "username.claim(",
        "wallet.spend(",
        "ledger.write(",
        "SigningKey",
        "VerifyingKey",
        "recovery_phrase",
        "seed_phrase",
    ] {
        assert!(
            !source.contains(forbidden),
            "root-confirmed runtime gained forbidden authority marker {forbidden}",
        );
    }
}
