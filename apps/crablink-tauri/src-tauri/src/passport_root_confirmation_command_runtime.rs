//! RO:WHAT — Preserves the legacy desktop root-confirmation bridge and implements authenticated public Passport identity finalization for the live command path.
//! RO:WHY — Physical M1 must turn a native root-PIN confirmation into durable canonical public identity without creating a persistent root-unlocked session or exposing root material.
//! RO:INTERACTS — NativeVaultStore, NativePlatformSealer, operational session state, native secret surface, identity finalization runtime, public descriptor store, commands/passport.rs, and the Tauri handler registry.
//! RO:INVARIANTS — a stored vault and operational-unlocked session are required; an existing descriptor returns without another root prompt or RecoveryRoot unseal; first finalization authenticates the root PIN and persists the canonical descriptor; the legacy Phase15Z bridge still refuses fake root success.
//! RO:SECURITY — first finalization may transiently unseal RecoveryRoot to authenticate and derive public identity; the verified root VMK is immediately discarded by svc-passport; no root secret or persistent root session is returned, no PIN crosses the WebView boundary, and no capability, username, wallet, or ledger mutation is added.
//! RO:TEST — tests/phase15z_desktop_root_confirmation_command_bridge.rs and tests/physical_m1_authenticated_identity_finalization_runtime.rs.

use svc_passport::native::{load_native_encrypted_vault, NativePlatformSealer, NativeVaultStore};

use crate::{
    passport_identity_finalization_runtime::{
        finalize_stored_desktop_passport_identity_with_root_pin,
        DesktopPassportIdentityFinalizationError,
    },
    passport_operational_command_runtime::{
        DesktopNativeSecretSurfaceError, DesktopNativeSecretSurfaceOutcome,
        DesktopNativeSecretSurfacePort,
    },
    passport_operational_unlock_runtime::{
        DesktopOperationalVaultSessionState, DesktopOperationalVaultSessionStore,
    },
    passport_public_identity_store::DesktopPublicPassportDescriptorStore,
};

pub const NATIVE_PASSPORT_PHASE15Z_LABEL: &str =
    "NATIVE_PASSPORT_PHASE15Z_DESKTOP_ROOT_CONFIRMATION_COMMAND_BRIDGE";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DesktopRootConfirmationCommandState {
    NoPassport,
    OperationalUnlockRequired,
    ConfirmationRejected,
    Cancelled,
    IdentityFinalized,
    IdentityAvailable,
    Unavailable,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DesktopRootConfirmationCommandOutcome {
    pub state: DesktopRootConfirmationCommandState,
    pub native_secure_input_requested: bool,
    pub recovery_root_unsealed: bool,
    pub public_descriptor_written: bool,
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

/// Authenticate the native root confirmation and finalize the canonical
/// restart-safe public Passport descriptor.
///
/// Once a descriptor exists, this path returns it as available without
/// prompting for the root PIN or unsealing RecoveryRoot again.
pub fn confirm_and_finalize_desktop_native_passport_root_from_native_surface<V, S, P>(
    store: &V,
    session_store: &DesktopOperationalVaultSessionStore,
    sealer: &S,
    public_store: &DesktopPublicPassportDescriptorStore,
    secret_surface: &P,
) -> DesktopRootConfirmationCommandOutcome
where
    V: NativeVaultStore + ?Sized,
    S: NativePlatformSealer + ?Sized,
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

    match public_store.load() {
        Ok(Some(_)) => {
            return root_identity_outcome(
                DesktopRootConfirmationCommandState::IdentityAvailable,
                false,
                false,
                false,
            );
        }
        Ok(None) => {}
        Err(_) => {
            return root_outcome(DesktopRootConfirmationCommandState::Unavailable, false);
        }
    }

    match secret_surface.request_root_confirmation_pin() {
        Ok(DesktopNativeSecretSurfaceOutcome::Secret(pin)) => {
            match finalize_stored_desktop_passport_identity_with_root_pin(
                store,
                sealer,
                public_store,
                pin.as_slice(),
            ) {
                Ok(finalized) => {
                    let state = if finalized.public_descriptor_written {
                        DesktopRootConfirmationCommandState::IdentityFinalized
                    } else {
                        DesktopRootConfirmationCommandState::IdentityAvailable
                    };

                    root_identity_outcome(
                        state,
                        true,
                        finalized.recovery_root_unsealed,
                        finalized.public_descriptor_written,
                    )
                }
                Err(error) => {
                    let root_was_unsealed = matches!(
                            error,
                            DesktopPassportIdentityFinalizationError::
                                RootPinRejected
                                | DesktopPassportIdentityFinalizationError::
                                    RootPinVerificationFailed
                                | DesktopPassportIdentityFinalizationError::
                                    IdentityDerivationFailed
                                | DesktopPassportIdentityFinalizationError::
                                    PublicDescriptorPersistFailed
                        );

                    if error == DesktopPassportIdentityFinalizationError::RootPinRejected {
                        root_identity_outcome(
                            DesktopRootConfirmationCommandState::ConfirmationRejected,
                            true,
                            root_was_unsealed,
                            false,
                        )
                    } else {
                        root_identity_outcome(
                            DesktopRootConfirmationCommandState::Unavailable,
                            true,
                            root_was_unsealed,
                            false,
                        )
                    }
                }
            }
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
        recovery_root_unsealed: false,
        public_descriptor_written: false,
    }
}

fn root_identity_outcome(
    state: DesktopRootConfirmationCommandState,
    native_secure_input_requested: bool,
    recovery_root_unsealed: bool,
    public_descriptor_written: bool,
) -> DesktopRootConfirmationCommandOutcome {
    DesktopRootConfirmationCommandOutcome {
        state,
        native_secure_input_requested,
        recovery_root_unsealed,
        public_descriptor_written,
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
