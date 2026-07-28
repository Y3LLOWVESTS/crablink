use std::{
    collections::VecDeque,
    sync::{
        atomic::{AtomicUsize, Ordering},
        Mutex,
    },
};

use crablink_tauri_lib::{
    passport_create_command_runtime::{
        create_desktop_native_passport_from_native_surface,
        desktop_native_passport_create_command_posture, DesktopNativePassportCreateCommandState,
        NATIVE_PASSPORT_PHASE15W_LABEL,
    },
    passport_operational_command_runtime::{
        DesktopNativeSecretSurfaceError, DesktopNativeSecretSurfaceOutcome,
        DesktopNativeSecretSurfacePort,
    },
};
use svc_passport::native::{
    NativeEncryptedVaultV1, NativePlatformFamily, NativePlatformSealer, NativePlatformStorageError,
    NativePlatformStorageOperation, NativeSealedMaterialV1, NativeSecretBytes,
    NativeSecureCompartment, NativeVaultRecoveryOutcome, NativeVaultRemovalOutcome,
    NativeVaultStore,
};

const TEST_PIN: &[u8] = b"phase15w-create-pin";
const EXISTING_VAULT_BYTES: &[u8] = b"phase15w-existing-vault";

#[derive(Default)]
struct MemoryVaultStore {
    vault: Mutex<Option<NativeEncryptedVaultV1>>,
    load_calls: AtomicUsize,
    write_calls: AtomicUsize,
    remove_calls: AtomicUsize,
}

impl MemoryVaultStore {
    fn with_existing_vault() -> Self {
        Self {
            vault: Mutex::new(Some(
                NativeEncryptedVaultV1::new(EXISTING_VAULT_BYTES.to_vec())
                    .expect("bounded existing vault"),
            )),
            load_calls: AtomicUsize::new(0),
            write_calls: AtomicUsize::new(0),
            remove_calls: AtomicUsize::new(0),
        }
    }

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
    sealed_compartments: Mutex<Vec<NativeSecureCompartment>>,
}

impl RecordingPlatformSealer {
    fn sealed_compartments(&self) -> Vec<NativeSecureCompartment> {
        self.sealed_compartments
            .lock()
            .expect("sealed compartment lock")
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
        _: &NativeSecretBytes,
    ) -> Result<NativeSealedMaterialV1, NativePlatformStorageError> {
        self.sealed_compartments
            .lock()
            .map_err(|_| NativePlatformStorageError::BackendFailure {
                operation: NativePlatformStorageOperation::Seal,
            })?
            .push(compartment);

        NativeSealedMaterialV1::new(
            NativePlatformFamily::MacosKeychain,
            compartment,
            format!("memory://phase15w/{compartment:?}").into_bytes(),
        )
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

enum NativePromptPlan {
    Secret(Vec<u8>),
    Rejected,
    Cancelled,
    Unavailable,
}

struct ScriptedNativeSecretSurface {
    plans: Mutex<VecDeque<NativePromptPlan>>,
    create_calls: AtomicUsize,
    operational_calls: AtomicUsize,
}

impl ScriptedNativeSecretSurface {
    fn new(plans: Vec<NativePromptPlan>) -> Self {
        Self {
            plans: Mutex::new(VecDeque::from(plans)),
            create_calls: AtomicUsize::new(0),
            operational_calls: AtomicUsize::new(0),
        }
    }

    fn secret(pin: &[u8]) -> Self {
        Self::new(vec![NativePromptPlan::Secret(pin.to_vec())])
    }

    fn create_calls(&self) -> usize {
        self.create_calls.load(Ordering::SeqCst)
    }

    fn operational_calls(&self) -> usize {
        self.operational_calls.load(Ordering::SeqCst)
    }
}

impl DesktopNativeSecretSurfacePort for ScriptedNativeSecretSurface {
    fn request_operational_pin(
        &self,
    ) -> Result<DesktopNativeSecretSurfaceOutcome, DesktopNativeSecretSurfaceError> {
        self.operational_calls.fetch_add(1, Ordering::SeqCst);

        Ok(DesktopNativeSecretSurfaceOutcome::Unavailable)
    }

    fn request_create_pin(
        &self,
    ) -> Result<DesktopNativeSecretSurfaceOutcome, DesktopNativeSecretSurfaceError> {
        self.create_calls.fetch_add(1, Ordering::SeqCst);

        match self
            .plans
            .lock()
            .expect("scripted create prompt lock")
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

#[test]
fn phase15w_native_create_prompt_creates_locked_platform_bound_vault() {
    let store = MemoryVaultStore::default();
    let sealer = RecordingPlatformSealer::default();
    let surface = ScriptedNativeSecretSurface::secret(TEST_PIN);

    let outcome = create_desktop_native_passport_from_native_surface(&store, &sealer, &surface);

    assert_eq!(
        outcome.state,
        DesktopNativePassportCreateCommandState::CreatedLocked
    );
    assert!(outcome.native_secure_input_requested);

    assert_eq!(surface.create_calls(), 1);
    assert_eq!(surface.operational_calls(), 0);
    assert_eq!(store.load_calls(), 2);
    assert_eq!(store.write_calls(), 1);
    assert_eq!(store.remove_calls(), 0);
    assert!(store.has_vault());

    let mut sealed = sealer.sealed_compartments();
    sealed.sort_by_key(|compartment| match compartment {
        NativeSecureCompartment::DeviceKey => 0,
        NativeSecureCompartment::RecoveryRoot => 1,
    });

    assert_eq!(
        sealed,
        vec![
            NativeSecureCompartment::DeviceKey,
            NativeSecureCompartment::RecoveryRoot,
        ],
    );
}

#[test]
fn phase15w_existing_vault_rejects_before_native_create_prompt() {
    let store = MemoryVaultStore::with_existing_vault();
    let sealer = RecordingPlatformSealer::default();
    let surface = ScriptedNativeSecretSurface::secret(TEST_PIN);

    let outcome = create_desktop_native_passport_from_native_surface(&store, &sealer, &surface);

    assert_eq!(
        outcome.state,
        DesktopNativePassportCreateCommandState::AlreadyExists
    );
    assert!(!outcome.native_secure_input_requested);

    assert_eq!(surface.create_calls(), 0);
    assert_eq!(surface.operational_calls(), 0);
    assert_eq!(store.load_calls(), 1);
    assert_eq!(store.write_calls(), 0);
    assert_eq!(store.remove_calls(), 0);
    assert!(sealer.sealed_compartments().is_empty());
}

#[test]
fn phase15w_cancel_unavailable_and_rejected_create_prompt_results_are_redacted_and_safe() {
    for (plan, expected_state) in [
        (
            NativePromptPlan::Cancelled,
            DesktopNativePassportCreateCommandState::Cancelled,
        ),
        (
            NativePromptPlan::Unavailable,
            DesktopNativePassportCreateCommandState::Unavailable,
        ),
        (
            NativePromptPlan::Rejected,
            DesktopNativePassportCreateCommandState::CreateRejected,
        ),
    ] {
        let store = MemoryVaultStore::default();
        let sealer = RecordingPlatformSealer::default();
        let surface = ScriptedNativeSecretSurface::new(vec![plan]);

        let outcome = create_desktop_native_passport_from_native_surface(&store, &sealer, &surface);

        assert_eq!(outcome.state, expected_state);
        assert!(outcome.native_secure_input_requested);
        assert_eq!(surface.create_calls(), 1);
        assert_eq!(surface.operational_calls(), 0);
        assert_eq!(store.load_calls(), 1);
        assert_eq!(store.write_calls(), 0);
        assert_eq!(store.remove_calls(), 0);
        assert!(!store.has_vault());
        assert!(sealer.sealed_compartments().is_empty());
    }
}

#[test]
fn phase15w_posture_and_source_boundaries_keep_create_pin_native() {
    let posture = desktop_native_passport_create_command_posture();

    assert_eq!(posture.phase_label, NATIVE_PASSPORT_PHASE15W_LABEL);
    assert!(posture.public_create_command_added);
    assert!(posture.native_secret_surface_used);
    assert!(posture.existing_vault_checked_before_prompt);
    assert!(posture.created_state_is_locked);
    assert!(!posture.create_pin_received_from_webview);
    assert!(!posture.tauri_pin_argument_added);
    assert!(!posture.secret_material_returned);
    assert!(!posture.root_unlock_added);
    assert!(!posture.operational_unlock_added_by_create);
    assert!(!posture.capability_issuance_added);
    assert!(!posture.username_mutation_added);
    assert!(!posture.wallet_or_ledger_mutation_added);

    let root = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let create_runtime =
        std::fs::read_to_string(root.join("src/passport_create_command_runtime.rs"))
            .expect("create command runtime source");
    let secret_runtime =
        std::fs::read_to_string(root.join("src/passport_operational_command_runtime.rs"))
            .expect("secret surface runtime source");
    let commands =
        std::fs::read_to_string(root.join("src/commands/passport.rs")).expect("commands source");
    let lib = std::fs::read_to_string(root.join("src/lib.rs")).expect("lib source");

    for required in [
        "request_create_pin",
        "create_desktop_native_passport_vault",
        "DesktopNativePassportCreateCommandState::CreatedLocked",
        "DesktopNativePassportCreateCommandState::AlreadyExists",
        "DesktopNativePassportCreateCommandState::Cancelled",
        "DesktopNativePassportCreateCommandState::Unavailable",
        "DesktopNativePassportCreateCommandState::CreateRejected",
    ] {
        assert!(
            create_runtime.contains(required) || secret_runtime.contains(required),
            "create bridge missing {required}",
        );
    }

    let create_signature = commands
        .split("pub fn passport_create")
        .nth(1)
        .expect("passport_create command")
        .split("->")
        .next()
        .expect("passport_create command signature");

    assert!(create_signature.contains("state: State<'_, AppState>"));

    for forbidden in ["pin:", "String", "Vec<u8>", "Deserialize"] {
        assert!(
            !create_signature.contains(forbidden),
            "passport_create signature must not contain {forbidden}",
        );
    }

    let handler_block = lib
        .split("generate_handler![")
        .nth(1)
        .and_then(|tail| tail.split(']').next())
        .expect("Tauri generate_handler block");

    assert!(handler_block.contains("commands::passport::passport_create,"));

    for forbidden_literal in [
        "secret_material_returned: true",
        "recovery_root_unsealed: true",
        "wallet_or_ledger_mutated: true",
    ] {
        assert!(
            !commands.contains(forbidden_literal) && !lib.contains(forbidden_literal),
            "command surface contains forbidden literal {forbidden_literal}",
        );
    }
}
