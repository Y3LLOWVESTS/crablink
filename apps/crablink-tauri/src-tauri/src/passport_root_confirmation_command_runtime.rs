//! RO:WHAT — Adds the desktop root-confirmation command bridge without exposing or unlocking root material.
//! RO:WHY — Phase 15Z makes the expected root-capable command surface explicit while refusing fake root success until canonical root operation behavior exists.
//! RO:INTERACTS — NativeVaultStore, DesktopOperationalVaultSessionStore, DesktopNativeSecretSurfacePort, commands/passport.rs, and the Tauri handler registry.
//! RO:INVARIANTS — a stored vault and operational-unlocked session are required before native root confirmation is requested; confirmation remains redacted and unavailable rather than claiming root unlock.
//! RO:SECURITY — no recovery-root factor unseal, no root VMK unlock, no root material return, no capability issuance, no username mutation, and no wallet/ledger mutation.
//! RO:TEST — tests/phase15z_desktop_root_confirmation_command_bridge.rs.

use svc_passport::native::{load_native_encrypted_vault, NativeVaultStore};

use crate::{
    passport_operational_command_runtime::{
        DesktopNativeSecretSurfaceError, DesktopNativeSecretSurfaceOutcome,
        DesktopNativeSecretSurfacePort,
    },
    passport_operational_unlock_runtime::{
        DesktopOperationalVaultSessionState, DesktopOperationalVaultSessionStore,
    },
};

pub const NATIVE_PASSPORT_PHASE15Z_LABEL: &str =
    "NATIVE_PASSPORT_PHASE15Z_DESKTOP_ROOT_CONFIRMATION_COMMAND_BRIDGE";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DesktopRootConfirmationCommandState {
    NoPassport,
    OperationalUnlockRequired,
    ConfirmationRejected,
    Cancelled,
    Unavailable,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DesktopRootConfirmationCommandOutcome {
    pub state: DesktopRootConfirmationCommandState,
    pub native_secure_input_requested: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DesktopRootConfirmationCommandPosture {
    pub phase_label: &'static str,
    pub public_root_command_added: bool,
    pub native_root_confirmation_surface_used: bool,
    pub stored_vault_required_before_prompt: bool,
    pub operational_unlock_required_before_prompt: bool,
    pub fake_root_success_rejected: bool,
    pub root_factor_unsealed: bool,
    pub root_vmk_unlocked: bool,
    pub root_material_returned: bool,
    pub pin_received_from_webview: bool,
    pub tauri_pin_argument_added: bool,
    pub capability_issuance_added: bool,
    pub username_mutation_added: bool,
    pub wallet_or_ledger_mutation_added: bool,
}

pub fn desktop_root_confirmation_command_posture() -> DesktopRootConfirmationCommandPosture {
    DesktopRootConfirmationCommandPosture {
        phase_label: NATIVE_PASSPORT_PHASE15Z_LABEL,
        public_root_command_added: true,
        native_root_confirmation_surface_used: true,
        stored_vault_required_before_prompt: true,
        operational_unlock_required_before_prompt: true,
        fake_root_success_rejected: true,
        root_factor_unsealed: false,
        root_vmk_unlocked: false,
        root_material_returned: false,
        pin_received_from_webview: false,
        tauri_pin_argument_added: false,
        capability_issuance_added: false,
        username_mutation_added: false,
        wallet_or_ledger_mutation_added: false,
    }
}

pub fn confirm_desktop_native_passport_root_from_native_surface<V, P>(
    store: &V,
    session_store: &DesktopOperationalVaultSessionStore,
    secret_surface: &P,
) -> DesktopRootConfirmationCommandOutcome
where
    V: NativeVaultStore + ?Sized,
    P: DesktopNativeSecretSurfacePort + ?Sized,
{
    match load_native_encrypted_vault(store) {
        Ok(Some(_)) => {}
        Ok(None) => {
            return root_outcome(DesktopRootConfirmationCommandState::NoPassport, false);
        }
        Err(_) => {
            return root_outcome(DesktopRootConfirmationCommandState::Unavailable, false);
        }
    }

    match session_store.state() {
        Ok(DesktopOperationalVaultSessionState::OperationalUnlocked) => {}
        Ok(DesktopOperationalVaultSessionState::Locked)
        | Ok(DesktopOperationalVaultSessionState::Unlocking) => {
            return root_outcome(
                DesktopRootConfirmationCommandState::OperationalUnlockRequired,
                false,
            );
        }
        Err(_) => {
            return root_outcome(DesktopRootConfirmationCommandState::Unavailable, false);
        }
    }

    match secret_surface.request_root_confirmation_pin() {
        Ok(DesktopNativeSecretSurfaceOutcome::Secret(_pin)) => {
            root_outcome(DesktopRootConfirmationCommandState::Unavailable, true)
        }
        Ok(DesktopNativeSecretSurfaceOutcome::Rejected) => root_outcome(
            DesktopRootConfirmationCommandState::ConfirmationRejected,
            true,
        ),
        Ok(DesktopNativeSecretSurfaceOutcome::Cancelled) => {
            root_outcome(DesktopRootConfirmationCommandState::Cancelled, true)
        }
        Ok(DesktopNativeSecretSurfaceOutcome::Unavailable)
        | Err(DesktopNativeSecretSurfaceError::Unavailable) => {
            root_outcome(DesktopRootConfirmationCommandState::Unavailable, true)
        }
    }
}

fn root_outcome(
    state: DesktopRootConfirmationCommandState,
    native_secure_input_requested: bool,
) -> DesktopRootConfirmationCommandOutcome {
    DesktopRootConfirmationCommandOutcome {
        state,
        native_secure_input_requested,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn phase15z_posture_adds_root_bridge_without_fake_root_unlock() {
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
    }
}
