//! RO:WHAT — Bridges desktop Native Passport lock and operational-unlock trigger requests to the native-only session runtime.
//! RO:WHY — Phase 15T exposes bounded command behavior without accepting a PIN through React, WebView IPC, or Tauri serialization.
//! RO:INTERACTS — AppState, passport_operational_unlock_runtime, NativeVaultStore, NativePlatformSealer, and future platform-native PIN prompts.
//! RO:INVARIANTS — operational unlock requests a PIN only through DesktopNativeSecretSurfacePort; no PIN parameter enters a Tauri command; root material remains sealed; lock drops only in-memory operational session material.
//! RO:SECURITY — production remains truthfully unavailable until a reviewed native PIN prompt is installed; secret bytes are zeroizing and never serialized, logged, persisted, or returned.
//! RO:TEST — unit tests below and tests/phase15t_operational_unlock_command_lock_and_status_bridge.rs.

use std::sync::Arc;
#[cfg(target_os = "macos")]
use std::{
    io::Write,
    process::{Command, Stdio},
};

use svc_passport::native::{
    load_native_encrypted_vault, NativePlatformSealer, NativeSecretBytes, NativeVaultStore,
};

use crate::{
    passport_operational_unlock_runtime::{
        unlock_desktop_native_passport_operational,
        unlock_desktop_native_passport_operational_with_factor, DesktopOperationalUnlockError,
        DesktopOperationalVaultSessionState, DesktopOperationalVaultSessionStore,
    },
    passport_pending_operational_runtime::DesktopPendingOperationalSessionStore,
};

pub const NATIVE_PASSPORT_PHASE15T_LABEL: &str =
    "NATIVE_PASSPORT_PHASE15T_OPERATIONAL_UNLOCK_COMMAND_LOCK_AND_STATUS_BRIDGE";

pub const NATIVE_PASSPORT_PHASE15U_LABEL: &str =
    "NATIVE_PASSPORT_PHASE15U_NATIVE_SECURE_PIN_INPUT_IMPLEMENTATION";

pub const ONBOARDING_PHASE6B2B1_NATIVE_LABEL: &str =
    "ONBOARDING_PHASE6B2B1_NATIVE_RECOVERY_SURFACE";

#[cfg(target_os = "macos")]
const MACOS_HIDDEN_ANSWER_SCRIPT: &str = r#"set dialog_result to display dialog "Enter CrabLink Passport PIN" default answer "" with hidden answer buttons {"Cancel", "Unlock"} default button "Unlock" cancel button "Cancel" with title "CrabLink Passport"
text returned of dialog_result"#;

pub type SharedDesktopNativeSecretSurface = Arc<dyn DesktopNativeSecretSurfacePort>;

pub trait DesktopNativeSecretSurfacePort: Send + Sync {
    fn request_operational_pin(
        &self,
    ) -> Result<DesktopNativeSecretSurfaceOutcome, DesktopNativeSecretSurfaceError>;

    fn request_create_pin(
        &self,
    ) -> Result<DesktopNativeSecretSurfaceOutcome, DesktopNativeSecretSurfaceError> {
        self.request_operational_pin()
    }

    fn request_root_confirmation_pin(
        &self,
    ) -> Result<DesktopNativeSecretSurfaceOutcome, DesktopNativeSecretSurfaceError> {
        self.request_operational_pin()
    }

    fn show_recovery_phrase(
        &self,
        _phrase: &str,
        _fingerprint: &str,
    ) -> Result<DesktopNativeRecoveryPhraseOutcome, DesktopNativeSecretSurfaceError> {
        Ok(DesktopNativeRecoveryPhraseOutcome::Unavailable)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DesktopNativeRecoveryPhraseOutcome {
    Acknowledged,
    Cancelled,
    Unavailable,
}

#[derive(Debug)]
pub enum DesktopNativeSecretSurfaceOutcome {
    Secret(NativeSecretBytes),
    Rejected,
    Cancelled,
    Unavailable,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DesktopNativeSecretSurfaceError {
    Unavailable,
}

#[derive(Debug, Clone, Copy, Default)]
pub struct UnavailableDesktopNativeSecretSurface;

impl DesktopNativeSecretSurfacePort for UnavailableDesktopNativeSecretSurface {
    fn request_operational_pin(
        &self,
    ) -> Result<DesktopNativeSecretSurfaceOutcome, DesktopNativeSecretSurfaceError> {
        Ok(DesktopNativeSecretSurfaceOutcome::Unavailable)
    }
}

#[cfg(target_os = "macos")]
#[derive(Debug, Clone, Copy, Default)]
pub struct MacosHiddenAnswerNativeSecretSurface;

#[cfg(target_os = "macos")]
impl DesktopNativeSecretSurfacePort for MacosHiddenAnswerNativeSecretSurface {
    fn request_operational_pin(
        &self,
    ) -> Result<DesktopNativeSecretSurfaceOutcome, DesktopNativeSecretSurfaceError> {
        request_macos_hidden_answer_operational_pin()
    }

    fn show_recovery_phrase(
        &self,
        phrase: &str,
        fingerprint: &str,
    ) -> Result<DesktopNativeRecoveryPhraseOutcome, DesktopNativeSecretSurfaceError> {
        request_macos_recovery_phrase_acknowledgement(phrase, fingerprint)
    }
}

#[cfg(target_os = "macos")]
fn request_macos_hidden_answer_operational_pin(
) -> Result<DesktopNativeSecretSurfaceOutcome, DesktopNativeSecretSurfaceError> {
    let output = Command::new("/usr/bin/osascript")
        .arg("-e")
        .arg(MACOS_HIDDEN_ANSWER_SCRIPT)
        .output()
        .map_err(|_| DesktopNativeSecretSurfaceError::Unavailable)?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_ascii_lowercase();

        if stderr.contains("user canceled") || stderr.contains("-128") {
            return Ok(DesktopNativeSecretSurfaceOutcome::Cancelled);
        }

        return Ok(DesktopNativeSecretSurfaceOutcome::Unavailable);
    }

    let mut secret = output.stdout;

    while matches!(secret.last(), Some(b'\n' | b'\r')) {
        secret.pop();
    }

    match NativeSecretBytes::new(secret) {
        Ok(secret) => Ok(DesktopNativeSecretSurfaceOutcome::Secret(secret)),
        Err(_) => Ok(DesktopNativeSecretSurfaceOutcome::Rejected),
    }
}

#[cfg(target_os = "macos")]
fn request_macos_recovery_phrase_acknowledgement(
    phrase: &str,
    fingerprint: &str,
) -> Result<DesktopNativeRecoveryPhraseOutcome, DesktopNativeSecretSurfaceError> {
    validate_native_recovery_phrase_display(phrase, fingerprint)?;

    let mut child = Command::new("/usr/bin/osascript")
        .arg("-")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|_| DesktopNativeSecretSurfaceError::Unavailable)?;

    {
        let stdin = child
            .stdin
            .as_mut()
            .ok_or(DesktopNativeSecretSurfaceError::Unavailable)?;

        stdin
            .write_all(b"set recovery_phrase to \"")
            .map_err(|_| DesktopNativeSecretSurfaceError::Unavailable)?;

        stdin
            .write_all(phrase.as_bytes())
            .map_err(|_| DesktopNativeSecretSurfaceError::Unavailable)?;

        stdin
            .write_all(b"\"\nset recovery_fingerprint to \"")
            .map_err(|_| DesktopNativeSecretSurfaceError::Unavailable)?;

        stdin
            .write_all(fingerprint.as_bytes())
            .map_err(|_| DesktopNativeSecretSurfaceError::Unavailable)?;

        stdin
            .write_all(
                br#""
set dialog_text to "Write down these 24 recovery words in order:" & return & return & recovery_phrase & return & return & "Fingerprint: " & recovery_fingerprint & return & return & "CrabLink cannot recover this phrase for you. Store it offline before continuing."
set dialog_result to display dialog dialog_text buttons {"Cancel", "I Wrote It Down"} default button "I Wrote It Down" cancel button "Cancel" with title "CrabLink Passport Recovery"
button returned of dialog_result
"#,
            )
            .map_err(
                |_| DesktopNativeSecretSurfaceError::Unavailable,
            )?;
    }

    let output = child
        .wait_with_output()
        .map_err(|_| DesktopNativeSecretSurfaceError::Unavailable)?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_ascii_lowercase();

        if stderr.contains("user canceled") || stderr.contains("-128") {
            return Ok(DesktopNativeRecoveryPhraseOutcome::Cancelled);
        }

        return Ok(DesktopNativeRecoveryPhraseOutcome::Unavailable);
    }

    let button = String::from_utf8_lossy(&output.stdout);

    if button.trim() == "I Wrote It Down" {
        Ok(DesktopNativeRecoveryPhraseOutcome::Acknowledged)
    } else {
        Ok(DesktopNativeRecoveryPhraseOutcome::Unavailable)
    }
}

fn validate_native_recovery_phrase_display(
    phrase: &str,
    fingerprint: &str,
) -> Result<(), DesktopNativeSecretSurfaceError> {
    let valid_phrase = phrase.split_ascii_whitespace().count() == 24
        && !phrase.starts_with(' ')
        && !phrase.ends_with(' ')
        && !phrase.contains("  ")
        && phrase
            .bytes()
            .all(|byte| byte == b' ' || byte.is_ascii_lowercase());

    let valid_fingerprint = fingerprint.len() == 16
        && fingerprint
            .bytes()
            .all(|byte| byte.is_ascii_digit() || matches!(byte, b'a'..=b'f'));

    if !valid_phrase || !valid_fingerprint {
        return Err(DesktopNativeSecretSurfaceError::Unavailable);
    }

    Ok(())
}

pub fn new_desktop_native_secret_surface() -> SharedDesktopNativeSecretSurface {
    #[cfg(target_os = "macos")]
    {
        Arc::new(MacosHiddenAnswerNativeSecretSurface)
    }

    #[cfg(not(target_os = "macos"))]
    {
        Arc::new(UnavailableDesktopNativeSecretSurface)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DesktopOperationalUnlockCommandState {
    NoPassport,
    OperationalUnlocked,
    AlreadyUnlocked,
    UnlockRejected,
    Cancelled,
    Unavailable,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DesktopOperationalUnlockCommandOutcome {
    pub state: DesktopOperationalUnlockCommandState,
    pub native_secure_input_requested: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DesktopOperationalLockCommandOutcome {
    pub session_dropped: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DesktopOperationalCommandRuntimeError {
    Unavailable,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DesktopNativeSecretSurfacePosture {
    pub phase_label: &'static str,
    pub platform_native_prompt_selected: bool,
    pub macos_hidden_answer_prompt_added: bool,
    pub frontend_pin_input_added: bool,
    pub tauri_pin_argument_added: bool,
    pub pin_serialized_through_webview: bool,
    pub root_unlock_added: bool,
    pub wallet_or_ledger_mutation_added: bool,
}

pub fn desktop_native_secret_surface_posture() -> DesktopNativeSecretSurfacePosture {
    DesktopNativeSecretSurfacePosture {
        phase_label: NATIVE_PASSPORT_PHASE15U_LABEL,
        platform_native_prompt_selected: cfg!(target_os = "macos"),
        macos_hidden_answer_prompt_added: cfg!(target_os = "macos"),
        frontend_pin_input_added: false,
        tauri_pin_argument_added: false,
        pin_serialized_through_webview: false,
        root_unlock_added: false,
        wallet_or_ledger_mutation_added: false,
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DesktopOperationalCommandRuntimePosture {
    pub phase_label: &'static str,
    pub public_unlock_trigger_added: bool,
    pub public_lock_command_added: bool,
    pub status_combines_persistent_and_session_state: bool,
    pub native_secret_surface_port_added: bool,
    pub production_native_pin_prompt_installed: bool,
    pub pin_received_from_webview: bool,
    pub pin_serialized: bool,
    pub operational_vmk_serialized: bool,
    pub recovery_root_factor_unsealed: bool,
    pub recovery_root_vmk_unlocked: bool,
    pub encrypted_vault_mutated_by_lock: bool,
    pub platform_material_mutated_by_lock: bool,
    pub frontend_secret_custody_added: bool,
    pub capability_issuance_added: bool,
    pub wallet_or_ledger_mutation_added: bool,
}

pub fn desktop_operational_command_runtime_posture() -> DesktopOperationalCommandRuntimePosture {
    DesktopOperationalCommandRuntimePosture {
        phase_label: NATIVE_PASSPORT_PHASE15T_LABEL,
        public_unlock_trigger_added: true,
        public_lock_command_added: true,
        status_combines_persistent_and_session_state: true,
        native_secret_surface_port_added: true,
        production_native_pin_prompt_installed: cfg!(target_os = "macos"),
        pin_received_from_webview: false,
        pin_serialized: false,
        operational_vmk_serialized: false,
        recovery_root_factor_unsealed: false,
        recovery_root_vmk_unlocked: false,
        encrypted_vault_mutated_by_lock: false,
        platform_material_mutated_by_lock: false,
        frontend_secret_custody_added: false,
        capability_issuance_added: false,
        wallet_or_ledger_mutation_added: false,
    }
}

pub fn lock_desktop_native_passport_operational(
    session_store: &DesktopOperationalVaultSessionStore,
) -> Result<DesktopOperationalLockCommandOutcome, DesktopOperationalCommandRuntimeError> {
    let session_dropped = session_store
        .lock()
        .map_err(|_| DesktopOperationalCommandRuntimeError::Unavailable)?;

    Ok(DesktopOperationalLockCommandOutcome { session_dropped })
}

pub fn unlock_desktop_native_passport_operational_from_native_surface<S, V, P>(
    store: &V,
    sealer: &S,
    session_store: &DesktopOperationalVaultSessionStore,
    secret_surface: &P,
) -> DesktopOperationalUnlockCommandOutcome
where
    S: NativePlatformSealer + ?Sized,
    V: NativeVaultStore,
    P: DesktopNativeSecretSurfacePort + ?Sized,
{
    match load_native_encrypted_vault(store) {
        Ok(None) => {
            return unlock_outcome(DesktopOperationalUnlockCommandState::NoPassport, false);
        }
        Ok(Some(encrypted_vault)) => drop(encrypted_vault),
        Err(_) => {
            return unlock_outcome(DesktopOperationalUnlockCommandState::Unavailable, false);
        }
    }

    match session_store.state() {
        Ok(DesktopOperationalVaultSessionState::OperationalUnlocked) => {
            return unlock_outcome(DesktopOperationalUnlockCommandState::AlreadyUnlocked, false);
        }
        Ok(DesktopOperationalVaultSessionState::Unlocking) | Err(_) => {
            return unlock_outcome(DesktopOperationalUnlockCommandState::Unavailable, false);
        }
        Ok(DesktopOperationalVaultSessionState::Locked) => {}
    }

    let pin = match secret_surface.request_operational_pin() {
        Ok(DesktopNativeSecretSurfaceOutcome::Secret(pin)) => pin,
        Ok(DesktopNativeSecretSurfaceOutcome::Rejected) => {
            return unlock_outcome(DesktopOperationalUnlockCommandState::UnlockRejected, true);
        }
        Ok(DesktopNativeSecretSurfaceOutcome::Cancelled) => {
            return unlock_outcome(DesktopOperationalUnlockCommandState::Cancelled, true);
        }
        Ok(DesktopNativeSecretSurfaceOutcome::Unavailable)
        | Err(DesktopNativeSecretSurfaceError::Unavailable) => {
            return unlock_outcome(DesktopOperationalUnlockCommandState::Unavailable, true);
        }
    };

    match unlock_desktop_native_passport_operational(store, sealer, session_store, pin.as_slice()) {
        Ok(_) => unlock_outcome(
            DesktopOperationalUnlockCommandState::OperationalUnlocked,
            true,
        ),
        Err(DesktopOperationalUnlockError::NoStoredVault) => {
            unlock_outcome(DesktopOperationalUnlockCommandState::NoPassport, true)
        }
        Err(DesktopOperationalUnlockError::AlreadyOperationalUnlocked) => {
            unlock_outcome(DesktopOperationalUnlockCommandState::AlreadyUnlocked, true)
        }
        Err(
            DesktopOperationalUnlockError::InvalidPinLength { .. }
            | DesktopOperationalUnlockError::VaultDecodeFailed
            | DesktopOperationalUnlockError::UnlockRejected,
        ) => unlock_outcome(DesktopOperationalUnlockCommandState::UnlockRejected, true),
        Err(
            DesktopOperationalUnlockError::UnlockAlreadyInProgress
            | DesktopOperationalUnlockError::VaultLoadFailed
            | DesktopOperationalUnlockError::SessionUnavailable,
        ) => unlock_outcome(DesktopOperationalUnlockCommandState::Unavailable, true),
    }
}

pub fn unlock_desktop_native_passport_operational_from_native_surface_with_pending_operational<
    S,
    V,
    P,
>(
    store: &V,
    sealer: &S,
    session_store: &DesktopOperationalVaultSessionStore,
    secret_surface: &P,
    pending_operational_session: &DesktopPendingOperationalSessionStore,
) -> DesktopOperationalUnlockCommandOutcome
where
    S: NativePlatformSealer + ?Sized,
    V: NativeVaultStore,
    P: DesktopNativeSecretSurfacePort + ?Sized,
{
    match load_native_encrypted_vault(store) {
        Ok(None) => {
            return unlock_outcome(DesktopOperationalUnlockCommandState::NoPassport, false);
        }

        Ok(Some(encrypted_vault)) => {
            drop(encrypted_vault);
        }

        Err(_) => {
            return unlock_outcome(DesktopOperationalUnlockCommandState::Unavailable, false);
        }
    }

    match session_store.state() {
        Ok(DesktopOperationalVaultSessionState::OperationalUnlocked) => {
            return unlock_outcome(DesktopOperationalUnlockCommandState::AlreadyUnlocked, false);
        }

        Ok(DesktopOperationalVaultSessionState::Unlocking) | Err(_) => {
            return unlock_outcome(DesktopOperationalUnlockCommandState::Unavailable, false);
        }

        Ok(DesktopOperationalVaultSessionState::Locked) => {}
    }

    let pin = match secret_surface.request_operational_pin() {
        Ok(DesktopNativeSecretSurfaceOutcome::Secret(pin)) => pin,

        Ok(DesktopNativeSecretSurfaceOutcome::Rejected) => {
            return unlock_outcome(DesktopOperationalUnlockCommandState::UnlockRejected, true);
        }

        Ok(DesktopNativeSecretSurfaceOutcome::Cancelled) => {
            return unlock_outcome(DesktopOperationalUnlockCommandState::Cancelled, true);
        }

        Ok(DesktopNativeSecretSurfaceOutcome::Unavailable)
        | Err(DesktopNativeSecretSurfaceError::Unavailable) => {
            return unlock_outcome(DesktopOperationalUnlockCommandState::Unavailable, true);
        }
    };

    let pending_factor = match pending_operational_session.take_pending_operational_factor() {
        Ok(value) => value,

        Err(_) => {
            return unlock_outcome(DesktopOperationalUnlockCommandState::Unavailable, true);
        }
    };

    #[cfg(debug_assertions)]
    {
        eprintln!("OPERATIONAL_UNLOCK_PROCESS_ID={}", std::process::id(),);

        eprintln!(
            "OPERATIONAL_PENDING_PRESENT={}",
            if pending_factor.is_some() {
                "YES"
            } else {
                "NO"
            },
        );

        eprintln!(
            "OPERATIONAL_PENDING_USED={}",
            if pending_factor.is_some() {
                "YES"
            } else {
                "NO"
            },
        );

        eprintln!(
            "OPERATIONAL_PLATFORM_UNSEAL_ATTEMPTED={}",
            if pending_factor.is_some() {
                "NO"
            } else {
                "YES"
            },
        );
    }

    let result = if let Some(operational_factor) = pending_factor.as_ref() {
        unlock_desktop_native_passport_operational_with_factor(
            store,
            session_store,
            pin.as_slice(),
            operational_factor,
        )
    } else {
        unlock_desktop_native_passport_operational(store, sealer, session_store, pin.as_slice())
    };

    if result.is_err() {
        if let Some(operational_factor) = pending_factor {
            if pending_operational_session
                .restore_operational_factor(operational_factor)
                .is_err()
            {
                return unlock_outcome(DesktopOperationalUnlockCommandState::Unavailable, true);
            }
        }
    }

    match result {
        Ok(_) => unlock_outcome(
            DesktopOperationalUnlockCommandState::OperationalUnlocked,
            true,
        ),

        Err(DesktopOperationalUnlockError::NoStoredVault) => {
            unlock_outcome(DesktopOperationalUnlockCommandState::NoPassport, true)
        }

        Err(DesktopOperationalUnlockError::AlreadyOperationalUnlocked) => {
            unlock_outcome(DesktopOperationalUnlockCommandState::AlreadyUnlocked, true)
        }

        Err(
            DesktopOperationalUnlockError::InvalidPinLength { .. }
            | DesktopOperationalUnlockError::VaultDecodeFailed
            | DesktopOperationalUnlockError::UnlockRejected,
        ) => unlock_outcome(DesktopOperationalUnlockCommandState::UnlockRejected, true),

        Err(
            DesktopOperationalUnlockError::UnlockAlreadyInProgress
            | DesktopOperationalUnlockError::VaultLoadFailed
            | DesktopOperationalUnlockError::SessionUnavailable,
        ) => unlock_outcome(DesktopOperationalUnlockCommandState::Unavailable, true),
    }
}

fn unlock_outcome(
    state: DesktopOperationalUnlockCommandState,
    native_secure_input_requested: bool,
) -> DesktopOperationalUnlockCommandOutcome {
    DesktopOperationalUnlockCommandOutcome {
        state,
        native_secure_input_requested,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn unavailable_fallback_secret_surface_is_truthfully_unavailable() {
        let surface = UnavailableDesktopNativeSecretSurface;

        assert!(matches!(
            surface.request_operational_pin(),
            Ok(DesktopNativeSecretSurfaceOutcome::Unavailable)
        ));
    }

    #[test]
    fn phase15u_native_secret_surface_posture_keeps_pin_out_of_webview() {
        let posture = desktop_native_secret_surface_posture();

        assert_eq!(posture.phase_label, NATIVE_PASSPORT_PHASE15U_LABEL);
        assert_eq!(
            posture.platform_native_prompt_selected,
            cfg!(target_os = "macos")
        );
        assert_eq!(
            posture.macos_hidden_answer_prompt_added,
            cfg!(target_os = "macos")
        );
        assert!(!posture.frontend_pin_input_added);
        assert!(!posture.tauri_pin_argument_added);
        assert!(!posture.pin_serialized_through_webview);
        assert!(!posture.root_unlock_added);
        assert!(!posture.wallet_or_ledger_mutation_added);
    }

    #[test]
    fn phase15t_posture_rejects_secret_serialization_and_root_unlock() {
        let posture = desktop_operational_command_runtime_posture();

        assert_eq!(posture.phase_label, NATIVE_PASSPORT_PHASE15T_LABEL);
        assert!(posture.public_unlock_trigger_added);
        assert!(posture.public_lock_command_added);
        assert!(posture.status_combines_persistent_and_session_state);
        assert!(posture.native_secret_surface_port_added);
        assert_eq!(
            posture.production_native_pin_prompt_installed,
            cfg!(target_os = "macos")
        );
        assert!(!posture.pin_received_from_webview);
        assert!(!posture.pin_serialized);
        assert!(!posture.operational_vmk_serialized);
        assert!(!posture.recovery_root_factor_unsealed);
        assert!(!posture.recovery_root_vmk_unlocked);
        assert!(!posture.frontend_secret_custody_added);
        assert!(!posture.capability_issuance_added);
        assert!(!posture.wallet_or_ledger_mutation_added);
    }

    #[test]
    fn phase6b2b1_unavailable_surface_rejects_recovery_display_truthfully() {
        let surface = UnavailableDesktopNativeSecretSurface;

        assert_eq!(
            surface.show_recovery_phrase(
                "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art",
                "0123456789abcdef",
            ),
            Ok(
                DesktopNativeRecoveryPhraseOutcome::Unavailable,
            ),
        );
    }

    #[test]
    fn phase6b2b1_recovery_display_validation_accepts_the_locked_shape() {
        assert_eq!(
            validate_native_recovery_phrase_display(
                "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art",
                "0123456789abcdef",
            ),
            Ok(()),
        );
    }

    #[test]
    fn phase6b2b1_recovery_display_validation_rejects_unsafe_shapes() {
        for phrase in [
            "abandon",
            "Abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art",
            "abandon  abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art",
            "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon \"art\"",
        ] {
            assert_eq!(
                validate_native_recovery_phrase_display(
                    phrase,
                    "0123456789abcdef",
                ),
                Err(
                    DesktopNativeSecretSurfaceError::Unavailable,
                ),
            );
        }

        for fingerprint in [
            "",
            "0123456789abcde",
            "0123456789ABCDEf",
            "0123456789abcdeg",
        ] {
            assert_eq!(
                validate_native_recovery_phrase_display(
                    "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art",
                    fingerprint,
                ),
                Err(
                    DesktopNativeSecretSurfaceError::Unavailable,
                ),
            );
        }
    }

    #[test]
    fn phase6b2b1_source_keeps_phrase_out_of_process_arguments_and_clipboard() {
        let source = include_str!("passport_operational_command_runtime.rs");

        let production_source = source
            .split_once("#[cfg(test)]")
            .map(|(production, _tests)| production)
            .expect("test-only boundary must exist");

        assert!(production_source.contains("fn show_recovery_phrase"));

        assert!(production_source.contains(".arg(\"-\")"));

        assert!(production_source.contains("write_all(phrase.as_bytes())"));

        for forbidden in [
            ".arg(phrase)",
            ".env(\"RECOVERY",
            "set the clipboard",
            "pbcopy",
        ] {
            assert!(
                !production_source.contains(forbidden),
                "production source contains forbidden {forbidden}",
            );
        }
    }
}
