use std::{
    collections::VecDeque,
    sync::{
        atomic::{AtomicUsize, Ordering},
        Mutex,
    },
};

use crablink_tauri_lib::{
    passport_create_command_runtime::{
        create_desktop_native_passport_from_native_surface, DesktopNativePassportCreateCommandState,
    },
    passport_operational_command_runtime::{
        unlock_desktop_native_passport_operational_from_native_surface,
        DesktopNativeSecretSurfaceError, DesktopNativeSecretSurfaceOutcome,
        DesktopNativeSecretSurfacePort, DesktopOperationalUnlockCommandState,
    },
    passport_operational_unlock_runtime::{
        DesktopOperationalVaultSessionState, DesktopOperationalVaultSessionStore,
    },
};
use svc_passport::native::{
    load_native_encrypted_vault, NativeEncryptedVaultV1, NativePlatformFamily,
    NativePlatformSealer, NativePlatformStorageError, NativePlatformStorageOperation,
    NativeSealedMaterialV1, NativeSecretBytes, NativeSecureCompartment, NativeVaultRecoveryOutcome,
    NativeVaultRemovalOutcome, NativeVaultStore,
};

const CREATE_PIN: &[u8] = b"phase15x-create-pin";
const WRONG_PIN: &[u8] = b"phase15x-wrong-pin";

#[derive(Default)]
struct MemoryVaultStore {
    vault: Mutex<Option<NativeEncryptedVaultV1>>,
    load_calls: AtomicUsize,
    write_calls: AtomicUsize,
    remove_calls: AtomicUsize,
}

impl MemoryVaultStore {
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
struct RecordingPlatformSealer {
    sealed: Mutex<Vec<(NativeSecureCompartment, NativeSecretBytes)>>,
    unsealed: Mutex<Vec<NativeSecureCompartment>>,
}

impl RecordingPlatformSealer {
    fn sealed_compartments(&self) -> Vec<NativeSecureCompartment> {
        self.sealed
            .lock()
            .expect("sealed material lock")
            .iter()
            .map(|(compartment, _)| *compartment)
            .collect()
    }

    fn unsealed_compartments(&self) -> Vec<NativeSecureCompartment> {
        self.unsealed
            .lock()
            .expect("unsealed material lock")
            .clone()
    }

    fn reset_unsealed_compartments(&self) {
        self.unsealed
            .lock()
            .expect("unsealed material lock")
            .clear();
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
            format!("memory://phase15x/{compartment:?}").into_bytes(),
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

enum NativePromptPlan {
    Secret(Vec<u8>),
    Unavailable,
}

struct ScriptedNativeSecretSurface {
    create_plans: Mutex<VecDeque<NativePromptPlan>>,
    operational_plans: Mutex<VecDeque<NativePromptPlan>>,
    create_calls: AtomicUsize,
    operational_calls: AtomicUsize,
}

impl ScriptedNativeSecretSurface {
    fn create_secret(pin: &[u8]) -> Self {
        Self {
            create_plans: Mutex::new(VecDeque::from(vec![NativePromptPlan::Secret(pin.to_vec())])),
            operational_plans: Mutex::new(VecDeque::new()),
            create_calls: AtomicUsize::new(0),
            operational_calls: AtomicUsize::new(0),
        }
    }

    fn operational_secret(pin: &[u8]) -> Self {
        Self {
            create_plans: Mutex::new(VecDeque::new()),
            operational_plans: Mutex::new(VecDeque::from(vec![NativePromptPlan::Secret(
                pin.to_vec(),
            )])),
            create_calls: AtomicUsize::new(0),
            operational_calls: AtomicUsize::new(0),
        }
    }

    fn create_calls(&self) -> usize {
        self.create_calls.load(Ordering::SeqCst)
    }

    fn operational_calls(&self) -> usize {
        self.operational_calls.load(Ordering::SeqCst)
    }

    fn pop_secret(
        plans: &Mutex<VecDeque<NativePromptPlan>>,
    ) -> Result<DesktopNativeSecretSurfaceOutcome, DesktopNativeSecretSurfaceError> {
        match plans
            .lock()
            .expect("scripted native prompt lock")
            .pop_front()
            .unwrap_or(NativePromptPlan::Unavailable)
        {
            NativePromptPlan::Secret(pin) => NativeSecretBytes::new(pin)
                .map(DesktopNativeSecretSurfaceOutcome::Secret)
                .map_err(|_| DesktopNativeSecretSurfaceError::Unavailable),
            NativePromptPlan::Unavailable => Ok(DesktopNativeSecretSurfaceOutcome::Unavailable),
        }
    }
}

impl DesktopNativeSecretSurfacePort for ScriptedNativeSecretSurface {
    fn request_operational_pin(
        &self,
    ) -> Result<DesktopNativeSecretSurfaceOutcome, DesktopNativeSecretSurfaceError> {
        self.operational_calls.fetch_add(1, Ordering::SeqCst);

        Self::pop_secret(&self.operational_plans)
    }

    fn request_create_pin(
        &self,
    ) -> Result<DesktopNativeSecretSurfaceOutcome, DesktopNativeSecretSurfaceError> {
        self.create_calls.fetch_add(1, Ordering::SeqCst);

        Self::pop_secret(&self.create_plans)
    }
}

fn assert_locked_session(session: &DesktopOperationalVaultSessionStore) {
    assert_eq!(
        session.state().expect("session state"),
        DesktopOperationalVaultSessionState::Locked,
    );

    assert_eq!(
        session
            .operational_vmk_len()
            .expect("operational VMK length"),
        None,
    );
}

#[test]
fn phase15x_create_persists_locked_status_and_restart_requires_explicit_unlock() {
    let store = MemoryVaultStore::default();
    let sealer = RecordingPlatformSealer::default();

    let create_surface = ScriptedNativeSecretSurface::create_secret(CREATE_PIN);
    let create =
        create_desktop_native_passport_from_native_surface(&store, &sealer, &create_surface);

    assert_eq!(
        create.state,
        DesktopNativePassportCreateCommandState::CreatedLocked,
    );
    assert!(create.native_secure_input_requested);
    assert_eq!(create_surface.create_calls(), 1);
    assert_eq!(create_surface.operational_calls(), 0);

    assert!(store.has_vault());
    assert!(load_native_encrypted_vault(&store)
        .expect("stored vault status load")
        .is_some());

    let never_unlocked_session = DesktopOperationalVaultSessionStore::default();
    assert_locked_session(&never_unlocked_session);

    let restart_session = DesktopOperationalVaultSessionStore::default();
    assert_locked_session(&restart_session);

    assert_eq!(store.write_calls(), 1);
    assert_eq!(store.remove_calls(), 0);

    let sealed = sealer.sealed_compartments();

    assert_eq!(sealed.len(), 2);
    assert!(sealed.contains(&NativeSecureCompartment::DeviceKey));
    assert!(sealed.contains(&NativeSecureCompartment::RecoveryRoot));
    assert!(sealer.unsealed_compartments().is_empty());

    let unlock_surface = ScriptedNativeSecretSurface::operational_secret(CREATE_PIN);
    let unlock = unlock_desktop_native_passport_operational_from_native_surface(
        &store,
        &sealer,
        &restart_session,
        &unlock_surface,
    );

    assert_eq!(
        unlock.state,
        DesktopOperationalUnlockCommandState::OperationalUnlocked,
    );
    assert!(unlock.native_secure_input_requested);
    assert_eq!(unlock_surface.create_calls(), 0);
    assert_eq!(unlock_surface.operational_calls(), 1);

    assert_eq!(
        restart_session.state().expect("unlocked restart state"),
        DesktopOperationalVaultSessionState::OperationalUnlocked,
    );

    assert!(restart_session
        .operational_vmk_len()
        .expect("operational VMK after unlock")
        .is_some());

    assert_eq!(
        sealer.unsealed_compartments(),
        vec![NativeSecureCompartment::DeviceKey],
    );
}

#[test]
fn phase15x_existing_created_vault_skips_second_create_prompt_after_restart() {
    let store = MemoryVaultStore::default();
    let sealer = RecordingPlatformSealer::default();

    let first_surface = ScriptedNativeSecretSurface::create_secret(CREATE_PIN);
    let first = create_desktop_native_passport_from_native_surface(&store, &sealer, &first_surface);

    assert_eq!(
        first.state,
        DesktopNativePassportCreateCommandState::CreatedLocked,
    );

    let restart_session = DesktopOperationalVaultSessionStore::default();
    assert_locked_session(&restart_session);

    let second_surface = ScriptedNativeSecretSurface::create_secret(b"phase15x-second-pin");
    let second =
        create_desktop_native_passport_from_native_surface(&store, &sealer, &second_surface);

    assert_eq!(
        second.state,
        DesktopNativePassportCreateCommandState::AlreadyExists,
    );
    assert!(!second.native_secure_input_requested);
    assert_eq!(second_surface.create_calls(), 0);
    assert_eq!(second_surface.operational_calls(), 0);
    assert_eq!(store.write_calls(), 1);
    assert_eq!(store.remove_calls(), 0);
    assert!(store.has_vault());
    assert_locked_session(&restart_session);
}

#[test]
fn phase15x_wrong_pin_after_restart_fails_closed_and_keeps_persistent_vault() {
    let store = MemoryVaultStore::default();
    let sealer = RecordingPlatformSealer::default();

    let create_surface = ScriptedNativeSecretSurface::create_secret(CREATE_PIN);
    let create =
        create_desktop_native_passport_from_native_surface(&store, &sealer, &create_surface);

    assert_eq!(
        create.state,
        DesktopNativePassportCreateCommandState::CreatedLocked,
    );

    let restart_session = DesktopOperationalVaultSessionStore::default();
    assert_locked_session(&restart_session);
    sealer.reset_unsealed_compartments();

    let wrong_unlock_surface = ScriptedNativeSecretSurface::operational_secret(WRONG_PIN);
    let wrong_unlock = unlock_desktop_native_passport_operational_from_native_surface(
        &store,
        &sealer,
        &restart_session,
        &wrong_unlock_surface,
    );

    assert_eq!(
        wrong_unlock.state,
        DesktopOperationalUnlockCommandState::UnlockRejected,
    );
    assert!(wrong_unlock.native_secure_input_requested);
    assert_eq!(wrong_unlock_surface.create_calls(), 0);
    assert_eq!(wrong_unlock_surface.operational_calls(), 1);

    assert_locked_session(&restart_session);
    assert!(store.has_vault());
    assert_eq!(store.write_calls(), 1);
    assert_eq!(store.remove_calls(), 0);

    assert_eq!(
        sealer.unsealed_compartments(),
        vec![NativeSecureCompartment::DeviceKey],
    );
}

#[test]
fn phase15x_source_boundaries_keep_create_restart_status_redacted() {
    let root = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let create_runtime =
        std::fs::read_to_string(root.join("src/passport_create_command_runtime.rs"))
            .expect("create command runtime source");
    let unlock_runtime =
        std::fs::read_to_string(root.join("src/passport_operational_command_runtime.rs"))
            .expect("unlock command runtime source");
    let commands =
        std::fs::read_to_string(root.join("src/commands/passport.rs")).expect("commands source");
    let lib = std::fs::read_to_string(root.join("src/lib.rs")).expect("lib source");

    for required in [
        "DesktopNativePassportCreateCommandState::CreatedLocked",
        "DesktopNativePassportCreateCommandState::AlreadyExists",
        "request_create_pin",
        "load_native_encrypted_vault",
    ] {
        assert!(
            create_runtime.contains(required),
            "create restart acceptance source missing {required}",
        );
    }

    for required in [
        "DesktopOperationalUnlockCommandState::AlreadyUnlocked",
        "DesktopOperationalUnlockCommandState::OperationalUnlocked",
        "request_operational_pin",
    ] {
        assert!(
            unlock_runtime.contains(required),
            "unlock restart acceptance source missing {required}",
        );
    }

    let create_signature = commands
        .split("pub fn passport_create")
        .nth(1)
        .expect("passport_create command")
        .split("->")
        .next()
        .expect("passport_create signature");

    let unlock_signature = commands
        .split("pub fn passport_unlock_operational")
        .nth(1)
        .expect("passport_unlock_operational command")
        .split("->")
        .next()
        .expect("passport_unlock_operational signature");

    for signature in [create_signature, unlock_signature] {
        assert!(signature.contains("state: State<'_, AppState>"));

        for forbidden in ["pin:", "String", "Vec<u8>", "Deserialize"] {
            assert!(
                !signature.contains(forbidden),
                "command signature must not contain {forbidden}",
            );
        }
    }

    let handler_block = lib
        .split("generate_handler![")
        .nth(1)
        .and_then(|tail| tail.split(']').next())
        .expect("Tauri generate_handler block");

    for required in [
        "commands::passport::passport_create,",
        "commands::passport::passport_status,",
        "commands::passport::passport_unlock_operational,",
        "commands::passport::passport_lock,",
    ] {
        assert!(
            handler_block.contains(required),
            "handler missing required Passport command {required}",
        );
    }

    for forbidden_literal in [
        "secret_material_returned: true",
        "pin_received_from_webview: true",
        "recovery_root_unsealed: true",
        "wallet_or_ledger_mutated: true",
    ] {
        assert!(
            !commands.contains(forbidden_literal) && !lib.contains(forbidden_literal),
            "command surface contains forbidden literal {forbidden_literal}",
        );
    }
}
