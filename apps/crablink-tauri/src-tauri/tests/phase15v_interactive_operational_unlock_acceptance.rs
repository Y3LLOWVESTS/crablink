use std::{
    collections::VecDeque,
    sync::{
        atomic::{AtomicUsize, Ordering},
        Mutex, OnceLock,
    },
};

use crablink_tauri_lib::{
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
    encode_native_platform_bound_vault, wrap_native_compartment_vmk, NativeEncryptedVaultV1,
    NativePinWrappedVaultKeysV1, NativePlatformBoundVaultV1, NativePlatformFamily,
    NativePlatformSealer, NativePlatformStorageError, NativePlatformStorageOperation,
    NativeSealedMaterialV1, NativeSecretBytes, NativeSecureCompartment, NativeVaultRecoveryOutcome,
    NativeVaultRemovalOutcome, NativeVaultStore, PHASE15Q_PLATFORM_FACTOR_BYTES,
    PHASE15Q_VAULT_MASTER_KEY_BYTES,
};

const TEST_PIN: &[u8] = b"phase15v-local-pin";
const WRONG_PIN: &[u8] = b"phase15v-wrong-pin";

const ROOT_FACTOR_BYTE: u8 = 0x31;
const OPERATIONAL_FACTOR_BYTE: u8 = 0x32;
const WRONG_OPERATIONAL_FACTOR_BYTE: u8 = 0x99;

const ROOT_VMK_BYTE: u8 = 0x41;
const OPERATIONAL_VMK_BYTE: u8 = 0x42;

const ROOT_SALT: [u8; 16] = [0x51; 16];
const OPERATIONAL_SALT: [u8; 16] = [0x52; 16];

const ROOT_NONCE: [u8; 24] = [0x61; 24];
const OPERATIONAL_NONCE: [u8; 24] = [0x62; 24];

const ROOT_REFERENCE: &[u8] = b"memory://phase15v-root";
const OPERATIONAL_REFERENCE: &[u8] = b"memory://phase15v-operational";

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

#[derive(Default)]
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

struct RecordingPlatformSealer {
    operational_factor_byte: u8,
    fail_unseal: bool,
    unsealed_compartments: Mutex<Vec<NativeSecureCompartment>>,
}

impl RecordingPlatformSealer {
    fn valid() -> Self {
        Self {
            operational_factor_byte: OPERATIONAL_FACTOR_BYTE,
            fail_unseal: false,
            unsealed_compartments: Mutex::new(Vec::new()),
        }
    }

    fn wrong_operational_factor() -> Self {
        Self {
            operational_factor_byte: WRONG_OPERATIONAL_FACTOR_BYTE,
            fail_unseal: false,
            unsealed_compartments: Mutex::new(Vec::new()),
        }
    }

    fn failing() -> Self {
        Self {
            operational_factor_byte: OPERATIONAL_FACTOR_BYTE,
            fail_unseal: true,
            unsealed_compartments: Mutex::new(Vec::new()),
        }
    }

    fn unsealed_compartments(&self) -> Vec<NativeSecureCompartment> {
        self.unsealed_compartments
            .lock()
            .expect("unsealed compartment lock")
            .clone()
    }
}

impl NativePlatformSealer for RecordingPlatformSealer {
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
        sealed: &NativeSealedMaterialV1,
    ) -> Result<NativeSecretBytes, NativePlatformStorageError> {
        self.unsealed_compartments
            .lock()
            .map_err(|_| NativePlatformStorageError::BackendFailure {
                operation: NativePlatformStorageOperation::Unseal,
            })?
            .push(sealed.compartment);

        if self.fail_unseal {
            return Err(NativePlatformStorageError::BackendFailure {
                operation: NativePlatformStorageOperation::Unseal,
            });
        }

        let factor_byte = match sealed.compartment {
            NativeSecureCompartment::RecoveryRoot => ROOT_FACTOR_BYTE,
            NativeSecureCompartment::DeviceKey => self.operational_factor_byte,
        };

        Ok(secret(factor_byte, PHASE15Q_PLATFORM_FACTOR_BYTES))
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
    calls: AtomicUsize,
}

impl ScriptedNativeSecretSurface {
    fn new(plans: Vec<NativePromptPlan>) -> Self {
        Self {
            plans: Mutex::new(VecDeque::from(plans)),
            calls: AtomicUsize::new(0),
        }
    }

    fn secret(pin: &[u8]) -> Self {
        Self::new(vec![NativePromptPlan::Secret(pin.to_vec())])
    }

    fn calls(&self) -> usize {
        self.calls.load(Ordering::SeqCst)
    }
}

impl DesktopNativeSecretSurfacePort for ScriptedNativeSecretSurface {
    fn request_operational_pin(
        &self,
    ) -> Result<DesktopNativeSecretSurfaceOutcome, DesktopNativeSecretSurfaceError> {
        self.calls.fetch_add(1, Ordering::SeqCst);

        match self
            .plans
            .lock()
            .expect("scripted prompt lock")
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
fn phase15v_native_prompt_secret_unlocks_real_operational_session() {
    let store = MemoryVaultStore::with_vault(Some(encoded_vault()));
    let sealer = RecordingPlatformSealer::valid();
    let session = DesktopOperationalVaultSessionStore::default();
    let surface = ScriptedNativeSecretSurface::secret(TEST_PIN);

    let outcome = unlock_desktop_native_passport_operational_from_native_surface(
        &store, &sealer, &session, &surface,
    );

    assert_eq!(
        outcome.state,
        DesktopOperationalUnlockCommandState::OperationalUnlocked
    );
    assert!(outcome.native_secure_input_requested);

    assert_eq!(surface.calls(), 1);
    assert_eq!(store.load_calls(), 2);
    assert_eq!(store.write_calls(), 0);

    assert_eq!(
        sealer.unsealed_compartments(),
        vec![NativeSecureCompartment::DeviceKey],
    );

    assert_eq!(
        session.state().expect("operational session state"),
        DesktopOperationalVaultSessionState::OperationalUnlocked,
    );

    assert_eq!(
        session
            .operational_vmk_len()
            .expect("operational VMK length"),
        Some(PHASE15Q_VAULT_MASTER_KEY_BYTES),
    );

    let second_surface = ScriptedNativeSecretSurface::secret(TEST_PIN);

    let second = unlock_desktop_native_passport_operational_from_native_surface(
        &store,
        &sealer,
        &session,
        &second_surface,
    );

    assert_eq!(
        second.state,
        DesktopOperationalUnlockCommandState::AlreadyUnlocked
    );
    assert!(!second.native_secure_input_requested);
    assert_eq!(second_surface.calls(), 0);

    assert!(session.lock().expect("explicit lock drops VMK"));

    assert_eq!(
        session.state().expect("locked session state"),
        DesktopOperationalVaultSessionState::Locked,
    );

    assert_eq!(
        session
            .operational_vmk_len()
            .expect("locked operational VMK length"),
        None,
    );
}

#[test]
fn phase15v_no_vault_skips_native_prompt_and_keeps_session_locked() {
    let store = MemoryVaultStore::with_vault(None);
    let sealer = RecordingPlatformSealer::valid();
    let session = DesktopOperationalVaultSessionStore::default();
    let surface = ScriptedNativeSecretSurface::secret(TEST_PIN);

    let outcome = unlock_desktop_native_passport_operational_from_native_surface(
        &store, &sealer, &session, &surface,
    );

    assert_eq!(
        outcome.state,
        DesktopOperationalUnlockCommandState::NoPassport
    );
    assert!(!outcome.native_secure_input_requested);
    assert_eq!(surface.calls(), 0);
    assert_eq!(store.load_calls(), 1);
    assert_eq!(store.write_calls(), 0);
    assert!(sealer.unsealed_compartments().is_empty());

    assert_eq!(
        session.state().expect("no-vault session state"),
        DesktopOperationalVaultSessionState::Locked,
    );
}

#[test]
fn phase15v_cancel_unavailable_and_rejected_prompt_results_are_redacted_and_safe() {
    for (plan, expected_state) in [
        (
            NativePromptPlan::Cancelled,
            DesktopOperationalUnlockCommandState::Cancelled,
        ),
        (
            NativePromptPlan::Unavailable,
            DesktopOperationalUnlockCommandState::Unavailable,
        ),
        (
            NativePromptPlan::Rejected,
            DesktopOperationalUnlockCommandState::UnlockRejected,
        ),
    ] {
        let store = MemoryVaultStore::with_vault(Some(encoded_vault()));
        let sealer = RecordingPlatformSealer::valid();
        let session = DesktopOperationalVaultSessionStore::default();
        let surface = ScriptedNativeSecretSurface::new(vec![plan]);

        let outcome = unlock_desktop_native_passport_operational_from_native_surface(
            &store, &sealer, &session, &surface,
        );

        assert_eq!(outcome.state, expected_state);
        assert!(outcome.native_secure_input_requested);
        assert_eq!(surface.calls(), 1);
        assert_eq!(store.load_calls(), 1);
        assert_eq!(store.write_calls(), 0);
        assert!(sealer.unsealed_compartments().is_empty());

        assert_eq!(
            session.state().expect("prompt failure session state"),
            DesktopOperationalVaultSessionState::Locked,
        );
    }
}

#[test]
fn phase15v_wrong_pin_wrong_platform_factor_and_missing_factor_fail_closed() {
    for (surface, sealer) in [
        (
            ScriptedNativeSecretSurface::secret(WRONG_PIN),
            RecordingPlatformSealer::valid(),
        ),
        (
            ScriptedNativeSecretSurface::secret(TEST_PIN),
            RecordingPlatformSealer::wrong_operational_factor(),
        ),
        (
            ScriptedNativeSecretSurface::secret(TEST_PIN),
            RecordingPlatformSealer::failing(),
        ),
    ] {
        let store = MemoryVaultStore::with_vault(Some(encoded_vault()));
        let session = DesktopOperationalVaultSessionStore::default();

        let outcome = unlock_desktop_native_passport_operational_from_native_surface(
            &store, &sealer, &session, &surface,
        );

        assert_eq!(
            outcome.state,
            DesktopOperationalUnlockCommandState::UnlockRejected
        );
        assert!(outcome.native_secure_input_requested);
        assert_eq!(surface.calls(), 1);
        assert_eq!(store.write_calls(), 0);

        assert_eq!(
            sealer.unsealed_compartments(),
            vec![NativeSecureCompartment::DeviceKey],
        );

        assert_eq!(
            session.state().expect("failed unlock session state"),
            DesktopOperationalVaultSessionState::Locked,
        );

        assert_eq!(
            session
                .operational_vmk_len()
                .expect("failed unlock VMK length"),
            None,
        );
    }
}

#[test]
fn phase15v_source_boundaries_keep_pin_native_and_command_redacted() {
    let root = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let runtime = std::fs::read_to_string(root.join("src/passport_operational_command_runtime.rs"))
        .expect("Phase 15U runtime source");
    let commands =
        std::fs::read_to_string(root.join("src/commands/passport.rs")).expect("passport commands");
    let lib = std::fs::read_to_string(root.join("src/lib.rs")).expect("Tauri library source");

    for required in [
        "DesktopNativeSecretSurfacePort",
        "request_operational_pin",
        "DesktopNativeSecretSurfaceOutcome::Secret",
        "DesktopNativeSecretSurfaceOutcome::Cancelled",
        "DesktopNativeSecretSurfaceOutcome::Rejected",
        "DesktopNativeSecretSurfaceOutcome::Unavailable",
        "unlock_desktop_native_passport_operational",
    ] {
        assert!(
            runtime.contains(required),
            "interactive unlock runtime missing {required}",
        );
    }

    #[cfg(target_os = "macos")]
    {
        for required in [
            "MACOS_HIDDEN_ANSWER_SCRIPT",
            "with hidden answer",
            "Command::new(\"/usr/bin/osascript\")",
            "MacosHiddenAnswerNativeSecretSurface",
        ] {
            assert!(
                runtime.contains(required),
                "macOS native prompt runtime missing {required}",
            );
        }
    }

    let unlock_signature = commands
        .split("pub fn passport_unlock_operational")
        .nth(1)
        .expect("unlock command")
        .split("->")
        .next()
        .expect("unlock command signature");

    for forbidden in ["pin:", "String", "Vec<u8>", "Deserialize"] {
        assert!(
            !unlock_signature.contains(forbidden),
            "unlock command signature must not contain {forbidden}",
        );
    }

    let command_declaration_blocks: Vec<&str> =
        commands.split("#[tauri::command]").skip(1).collect();

    let handler_block = lib
        .split("generate_handler![")
        .nth(1)
        .and_then(|tail| tail.split(']').next())
        .expect("Tauri generate_handler block");

    for forbidden in [
        "passport_get_seed_to_webview",
        "passport_export_private_key",
        "passport_get_device_private_key",
        "passport_get_raw_capability",
        "passport_issue_arbitrary_scope",
        "passport_disable_policy",
    ] {
        assert!(
            !command_declaration_blocks.iter().any(|block| {
                block.contains(&format!("pub fn {forbidden}("))
                    || block.contains(&format!("fn {forbidden}("))
            }),
            "command surface declares forbidden Tauri command {forbidden}",
        );

        assert!(
            !handler_block.contains(forbidden),
            "Tauri handler registers forbidden command {forbidden}",
        );
    }

    for forbidden_literal in [
        "wallet_or_ledger_mutated: true",
        "recovery_root_unsealed: true",
    ] {
        assert!(
            !commands.contains(forbidden_literal) && !lib.contains(forbidden_literal),
            "command surface contains forbidden mutation literal {forbidden_literal}",
        );
    }
}
