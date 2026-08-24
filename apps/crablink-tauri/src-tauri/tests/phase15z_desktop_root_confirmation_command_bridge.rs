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
    passport_public_identity_store::DesktopPublicPassportDescriptorStore,
    passport_root_confirmation_command_runtime::{
        confirm_and_finalize_desktop_native_passport_root_from_native_surface,
        confirm_desktop_native_passport_root_from_native_surface,
        desktop_root_confirmation_command_posture, DesktopRootConfirmationCommandState,
        NATIVE_PASSPORT_PHASE15Z_LABEL,
    },
};
use svc_passport::native::{
    NativeEncryptedVaultV1, NativePlatformFamily, NativePlatformSealer, NativePlatformStorageError,
    NativePlatformStorageOperation, NativeSealedMaterialV1, NativeSecretBytes,
    NativeSecureCompartment, NativeVaultRecoveryOutcome, NativeVaultRemovalOutcome,
    NativeVaultStore,
};

const CREATE_PIN: &[u8] = b"phase15z-create-pin";
const ROOT_CONFIRMATION_PIN: &[u8] = b"phase15z-root-confirmation-pin";

#[derive(Default)]
struct MemoryVaultStore {
    vault: Mutex<Option<NativeEncryptedVaultV1>>,
    load_calls: AtomicUsize,
    write_calls: AtomicUsize,
    remove_calls: AtomicUsize,
}

impl MemoryVaultStore {
    fn load_calls(&self) -> usize {
        self.load_calls.load(Ordering::SeqCst)
    }

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
    fn unsealed_compartments(&self) -> Vec<NativeSecureCompartment> {
        self.unsealed
            .lock()
            .expect("unsealed material lock")
            .clone()
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
            format!("memory://phase15z/{compartment:?}").into_bytes(),
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
    Rejected,
    Cancelled,
    Unavailable,
}

struct ScriptedNativeSecretSurface {
    create_plans: Mutex<VecDeque<NativePromptPlan>>,
    operational_plans: Mutex<VecDeque<NativePromptPlan>>,
    root_plans: Mutex<VecDeque<NativePromptPlan>>,
    create_calls: AtomicUsize,
    operational_calls: AtomicUsize,
    root_calls: AtomicUsize,
}

impl ScriptedNativeSecretSurface {
    fn new(
        create_plans: Vec<NativePromptPlan>,
        operational_plans: Vec<NativePromptPlan>,
        root_plans: Vec<NativePromptPlan>,
    ) -> Self {
        Self {
            create_plans: Mutex::new(VecDeque::from(create_plans)),
            operational_plans: Mutex::new(VecDeque::from(operational_plans)),
            root_plans: Mutex::new(VecDeque::from(root_plans)),
            create_calls: AtomicUsize::new(0),
            operational_calls: AtomicUsize::new(0),
            root_calls: AtomicUsize::new(0),
        }
    }

    fn create_secret(pin: &[u8]) -> Self {
        Self::new(
            vec![NativePromptPlan::Secret(pin.to_vec())],
            Vec::new(),
            Vec::new(),
        )
    }

    fn operational_secret(pin: &[u8]) -> Self {
        Self::new(
            Vec::new(),
            vec![NativePromptPlan::Secret(pin.to_vec())],
            Vec::new(),
        )
    }

    fn root_secret(pin: &[u8]) -> Self {
        Self::new(
            Vec::new(),
            Vec::new(),
            vec![NativePromptPlan::Secret(pin.to_vec())],
        )
    }

    fn root_plan(plan: NativePromptPlan) -> Self {
        Self::new(Vec::new(), Vec::new(), vec![plan])
    }

    fn create_calls(&self) -> usize {
        self.create_calls.load(Ordering::SeqCst)
    }

    fn operational_calls(&self) -> usize {
        self.operational_calls.load(Ordering::SeqCst)
    }

    fn root_calls(&self) -> usize {
        self.root_calls.load(Ordering::SeqCst)
    }

    fn pop_plan(
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
            NativePromptPlan::Rejected => Ok(DesktopNativeSecretSurfaceOutcome::Rejected),
            NativePromptPlan::Cancelled => Ok(DesktopNativeSecretSurfaceOutcome::Cancelled),
            NativePromptPlan::Unavailable => Ok(DesktopNativeSecretSurfaceOutcome::Unavailable),
        }
    }
}

impl DesktopNativeSecretSurfacePort for ScriptedNativeSecretSurface {
    fn request_operational_pin(
        &self,
    ) -> Result<DesktopNativeSecretSurfaceOutcome, DesktopNativeSecretSurfaceError> {
        self.operational_calls.fetch_add(1, Ordering::SeqCst);

        Self::pop_plan(&self.operational_plans)
    }

    fn request_create_pin(
        &self,
    ) -> Result<DesktopNativeSecretSurfaceOutcome, DesktopNativeSecretSurfaceError> {
        self.create_calls.fetch_add(1, Ordering::SeqCst);

        Self::pop_plan(&self.create_plans)
    }

    fn request_root_confirmation_pin(
        &self,
    ) -> Result<DesktopNativeSecretSurfaceOutcome, DesktopNativeSecretSurfaceError> {
        self.root_calls.fetch_add(1, Ordering::SeqCst);

        Self::pop_plan(&self.root_plans)
    }
}

fn create_vault_and_unlock_operational_session() -> (
    MemoryVaultStore,
    RecordingPlatformSealer,
    DesktopOperationalVaultSessionStore,
) {
    let store = MemoryVaultStore::default();
    let sealer = RecordingPlatformSealer::default();
    let session = DesktopOperationalVaultSessionStore::default();

    let create_surface = ScriptedNativeSecretSurface::create_secret(CREATE_PIN);
    let create =
        create_desktop_native_passport_from_native_surface(&store, &sealer, &create_surface);

    assert_eq!(
        create.state,
        DesktopNativePassportCreateCommandState::CreatedLocked,
    );
    assert!(store.has_vault());
    assert_eq!(create_surface.create_calls(), 1);

    let unlock_surface = ScriptedNativeSecretSurface::operational_secret(CREATE_PIN);
    let unlock = unlock_desktop_native_passport_operational_from_native_surface(
        &store,
        &sealer,
        &session,
        &unlock_surface,
    );

    assert_eq!(
        unlock.state,
        DesktopOperationalUnlockCommandState::OperationalUnlocked,
    );
    assert_eq!(
        session.state().expect("operational session state"),
        DesktopOperationalVaultSessionState::OperationalUnlocked,
    );
    assert_eq!(unlock_surface.operational_calls(), 1);

    (store, sealer, session)
}

#[test]
fn phase15z_root_bridge_requires_existing_vault_and_operational_unlock_before_prompt() {
    let absent_store = MemoryVaultStore::default();
    let locked_session = DesktopOperationalVaultSessionStore::default();
    let surface = ScriptedNativeSecretSurface::root_secret(ROOT_CONFIRMATION_PIN);

    let absent = confirm_desktop_native_passport_root_from_native_surface(
        &absent_store,
        &locked_session,
        &surface,
    );

    assert_eq!(
        absent.state,
        DesktopRootConfirmationCommandState::NoPassport
    );
    assert!(!absent.native_secure_input_requested);
    assert_eq!(absent_store.load_calls(), 1);
    assert_eq!(absent_store.write_calls(), 0);
    assert_eq!(surface.root_calls(), 0);

    let existing_store = MemoryVaultStore::default();
    let sealer = RecordingPlatformSealer::default();
    let create_surface = ScriptedNativeSecretSurface::create_secret(CREATE_PIN);
    let create = create_desktop_native_passport_from_native_surface(
        &existing_store,
        &sealer,
        &create_surface,
    );

    assert_eq!(
        create.state,
        DesktopNativePassportCreateCommandState::CreatedLocked,
    );

    let blocked = confirm_desktop_native_passport_root_from_native_surface(
        &existing_store,
        &locked_session,
        &surface,
    );

    assert_eq!(
        blocked.state,
        DesktopRootConfirmationCommandState::OperationalUnlockRequired,
    );
    assert!(!blocked.native_secure_input_requested);
    assert_eq!(surface.root_calls(), 0);
}

#[test]
fn phase15z_root_bridge_uses_native_prompt_but_refuses_fake_root_success() {
    let (store, sealer, session) = create_vault_and_unlock_operational_session();
    let surface = ScriptedNativeSecretSurface::root_secret(ROOT_CONFIRMATION_PIN);

    let outcome =
        confirm_desktop_native_passport_root_from_native_surface(&store, &session, &surface);

    assert_eq!(
        outcome.state,
        DesktopRootConfirmationCommandState::Unavailable,
    );
    assert!(outcome.native_secure_input_requested);
    assert_eq!(surface.root_calls(), 1);
    assert_eq!(surface.create_calls(), 0);
    assert_eq!(surface.operational_calls(), 0);
    assert_eq!(store.write_calls(), 1);
    assert_eq!(store.remove_calls(), 0);

    assert_eq!(
        sealer.unsealed_compartments(),
        vec![NativeSecureCompartment::DeviceKey],
    );
}

#[test]
fn phase15z_root_confirmation_cancel_unavailable_and_rejected_are_redacted() {
    for (plan, expected) in [
        (
            NativePromptPlan::Cancelled,
            DesktopRootConfirmationCommandState::Cancelled,
        ),
        (
            NativePromptPlan::Unavailable,
            DesktopRootConfirmationCommandState::Unavailable,
        ),
        (
            NativePromptPlan::Rejected,
            DesktopRootConfirmationCommandState::ConfirmationRejected,
        ),
    ] {
        let (store, _sealer, session) = create_vault_and_unlock_operational_session();
        let surface = ScriptedNativeSecretSurface::root_plan(plan);

        let outcome =
            confirm_desktop_native_passport_root_from_native_surface(&store, &session, &surface);

        assert_eq!(outcome.state, expected);
        assert!(outcome.native_secure_input_requested);
        assert_eq!(surface.root_calls(), 1);
        assert_eq!(surface.create_calls(), 0);
        assert_eq!(surface.operational_calls(), 0);
        assert_eq!(store.remove_calls(), 0);
    }
}

#[test]
fn phase15z_posture_and_live_command_surface_are_redacted() {
    let posture = desktop_root_confirmation_command_posture();

    assert_eq!(posture.phase_label, NATIVE_PASSPORT_PHASE15Z_LABEL);
    assert!(posture.public_root_command_added);
    assert!(posture.native_root_confirmation_surface_used);
    assert!(posture.stored_vault_required_before_prompt);
    assert!(posture.operational_unlock_required_before_prompt);
    assert!(posture.fake_root_success_rejected);
    assert!(!posture.root_factor_unsealed);
    assert!(!posture.root_vmk_unlocked);
    assert!(!posture.root_material_returned);
    assert!(!posture.pin_received_from_webview);
    assert!(!posture.tauri_pin_argument_added);
    assert!(!posture.capability_issuance_added);
    assert!(!posture.username_mutation_added);
    assert!(!posture.wallet_or_ledger_mutation_added);

    let root = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let runtime =
        std::fs::read_to_string(root.join("src/passport_root_confirmation_command_runtime.rs"))
            .expect("root confirmation runtime source");
    let commands =
        std::fs::read_to_string(root.join("src/commands/passport.rs")).expect("commands source");
    let lib = std::fs::read_to_string(root.join("src/lib.rs")).expect("lib source");

    for required in [
        "request_root_confirmation_pin",
        "OperationalUnlockRequired",
        "fake_root_success_rejected",
        "root_factor_unsealed: false",
        "root_vmk_unlocked: false",
        "root_material_returned: false",
    ] {
        assert!(
            runtime.contains(required),
            "root confirmation runtime missing {required}",
        );
    }

    let signature = commands
        .split("pub fn passport_unlock_root")
        .nth(1)
        .expect("passport_unlock_root command")
        .split("->")
        .next()
        .expect("passport_unlock_root signature");

    assert!(signature.contains("state: State<'_, AppState>"));

    for forbidden in ["pin:", "String", "Vec<u8>", "Deserialize"] {
        assert!(
            !signature.contains(forbidden),
            "root confirmation signature must not contain {forbidden}",
        );
    }

    let handler_block = lib
        .split("generate_handler![")
        .nth(1)
        .and_then(|tail| tail.split(']').next())
        .expect("Tauri generate_handler block");

    assert!(handler_block.contains("commands::passport::passport_unlock_root,"));

    for forbidden_literal in [
        "secret_material_returned: true",
        "pin_received_from_webview: true",
        "recovery_root_unsealed: true",
        "wallet_or_ledger_mutated: true",
        "root_material_returned: true",
        "root_vmk_unlocked: true",
        "root_factor_unsealed: true",
    ] {
        assert!(
            !commands.contains(forbidden_literal) && !lib.contains(forbidden_literal),
            "live command surface contains forbidden literal {forbidden_literal}",
        );
    }
}

fn physical_m1_public_identity_store(
    label: &str,
) -> (std::path::PathBuf, DesktopPublicPassportDescriptorStore) {
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .expect("clock")
        .as_nanos();

    let path = std::env::temp_dir().join(format!(
        "crablink-{label}-{}-{timestamp}",
        std::process::id(),
    ));

    std::fs::create_dir_all(&path).expect("create identity test root");

    let store = DesktopPublicPassportDescriptorStore::new(path.clone()).expect("identity store");

    (path, store)
}

#[test]
fn physical_m1_live_root_confirmation_finalizes_once_then_avoids_repeat_prompt_and_unseal() {
    let (store, sealer, session) = create_vault_and_unlock_operational_session();

    let (public_root, public_store) = physical_m1_public_identity_store("live-root-finalize");

    let before = sealer.unsealed_compartments();

    let surface = ScriptedNativeSecretSurface::root_secret(CREATE_PIN);

    let finalized = confirm_and_finalize_desktop_native_passport_root_from_native_surface(
        &store,
        &session,
        &sealer,
        &public_store,
        &surface,
    );

    assert_eq!(
        finalized.state,
        DesktopRootConfirmationCommandState::IdentityFinalized,
    );

    assert!(finalized.native_secure_input_requested,);

    assert!(finalized.recovery_root_unsealed,);

    assert!(finalized.public_descriptor_written,);

    assert_eq!(surface.root_calls(), 1,);

    let after_first = sealer.unsealed_compartments();

    assert_eq!(after_first.len(), before.len() + 1,);

    assert_eq!(
        after_first.last(),
        Some(&NativeSecureCompartment::RecoveryRoot,),
    );

    assert!(public_store.load().expect("descriptor").is_some(),);

    let repeat_surface = ScriptedNativeSecretSurface::root_secret(ROOT_CONFIRMATION_PIN);

    let repeated = confirm_and_finalize_desktop_native_passport_root_from_native_surface(
        &store,
        &session,
        &sealer,
        &public_store,
        &repeat_surface,
    );

    assert_eq!(
        repeated.state,
        DesktopRootConfirmationCommandState::IdentityAvailable,
    );

    assert!(!repeated.native_secure_input_requested,);

    assert!(!repeated.recovery_root_unsealed,);

    assert!(!repeated.public_descriptor_written,);

    assert_eq!(repeat_surface.root_calls(), 0,);

    assert_eq!(sealer.unsealed_compartments(), after_first,);

    std::fs::remove_dir_all(public_root).expect("cleanup");
}

#[test]
fn physical_m1_live_root_confirmation_wrong_pin_rejects_without_descriptor_write() {
    let (store, sealer, session) = create_vault_and_unlock_operational_session();

    let (public_root, public_store) = physical_m1_public_identity_store("live-root-wrong");

    let before = sealer.unsealed_compartments();

    let surface = ScriptedNativeSecretSurface::root_secret(ROOT_CONFIRMATION_PIN);

    let outcome = confirm_and_finalize_desktop_native_passport_root_from_native_surface(
        &store,
        &session,
        &sealer,
        &public_store,
        &surface,
    );

    assert_eq!(
        outcome.state,
        DesktopRootConfirmationCommandState::ConfirmationRejected,
    );

    assert!(outcome.native_secure_input_requested,);

    assert!(outcome.recovery_root_unsealed,);

    assert!(!outcome.public_descriptor_written,);

    assert_eq!(surface.root_calls(), 1,);

    assert_eq!(public_store.load().expect("descriptor"), None,);

    let after = sealer.unsealed_compartments();

    assert_eq!(after.len(), before.len() + 1,);

    assert_eq!(after.last(), Some(&NativeSecureCompartment::RecoveryRoot,),);

    std::fs::remove_dir_all(public_root).expect("cleanup");
}
