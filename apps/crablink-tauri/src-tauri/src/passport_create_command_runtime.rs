//! RO:WHAT — Bridges the public desktop Passport create trigger to the platform-bound vault create runtime.
//! RO:WHY — Phase 15W makes desktop Passport creation command-addressable without accepting a PIN through React, WebView IPC, or Tauri serialization.
//! RO:INTERACTS — passport_operational_command_runtime native secret surface, passport_vault_create_runtime, VaultStore, PlatformSealer, and commands/passport.rs.
//! RO:INVARIANTS — creation refuses existing vaults before native PIN prompt; the PIN is collected only by DesktopNativeSecretSurfacePort; result DTOs are redacted and locked; no root unlock, proof, capability, username, wallet, or ledger mutation.
//! RO:SECURITY — create command returns labels only; no PIN, VMK, platform factor, encrypted vault bytes, capability material, or root material is serialized.
//! RO:TEST — tests/phase15w_desktop_passport_create_command_bridge.rs.

use svc_passport::native::{load_native_encrypted_vault, NativePlatformSealer, NativeVaultStore};

use crate::{
    passport_operational_command_runtime::{
        DesktopNativeSecretSurfaceError, DesktopNativeSecretSurfaceOutcome,
        DesktopNativeSecretSurfacePort,
    },
    passport_pending_operational_runtime::DesktopPendingOperationalSessionStore,
    passport_pending_recovery_runtime::DesktopPendingRecoverySessionStore,
    passport_vault_create_runtime::{
        create_desktop_native_passport_vault,
        create_desktop_native_passport_vault_with_random_and_factor_handoff,
        create_desktop_native_passport_vault_with_random_and_recovery_handoff,
        DesktopNativePassportVaultCreateError, OsNativeVaultRandomSource,
    },
};

pub const NATIVE_PASSPORT_PHASE15W_LABEL: &str =
    "NATIVE_PASSPORT_PHASE15W_DESKTOP_PASSPORT_CREATE_COMMAND_BRIDGE";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DesktopNativePassportCreateCommandState {
    CreatedLocked,
    AlreadyExists,
    CreateRejected,
    Cancelled,
    Unavailable,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DesktopNativePassportCreateCommandOutcome {
    pub state: DesktopNativePassportCreateCommandState,
    pub native_secure_input_requested: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DesktopNativePassportCreateCommandPosture {
    pub phase_label: &'static str,
    pub public_create_command_added: bool,
    pub native_secret_surface_used: bool,
    pub existing_vault_checked_before_prompt: bool,
    pub created_state_is_locked: bool,
    pub create_pin_received_from_webview: bool,
    pub tauri_pin_argument_added: bool,
    pub secret_material_returned: bool,
    pub root_unlock_added: bool,
    pub operational_unlock_added_by_create: bool,
    pub capability_issuance_added: bool,
    pub username_mutation_added: bool,
    pub wallet_or_ledger_mutation_added: bool,
}

pub fn desktop_native_passport_create_command_posture() -> DesktopNativePassportCreateCommandPosture
{
    DesktopNativePassportCreateCommandPosture {
        phase_label: NATIVE_PASSPORT_PHASE15W_LABEL,
        public_create_command_added: true,
        native_secret_surface_used: true,
        existing_vault_checked_before_prompt: true,
        created_state_is_locked: true,
        create_pin_received_from_webview: false,
        tauri_pin_argument_added: false,
        secret_material_returned: false,
        root_unlock_added: false,
        operational_unlock_added_by_create: false,
        capability_issuance_added: false,
        username_mutation_added: false,
        wallet_or_ledger_mutation_added: false,
    }
}

pub fn create_desktop_native_passport_from_native_surface<S, V, P>(
    store: &V,
    sealer: &S,
    secret_surface: &P,
) -> DesktopNativePassportCreateCommandOutcome
where
    S: NativePlatformSealer + ?Sized,
    V: NativeVaultStore + ?Sized,
    P: DesktopNativeSecretSurfacePort + ?Sized,
{
    create_desktop_native_passport_from_native_surface_inner(
        store,
        sealer,
        secret_surface,
        None,
        None,
    )
}

pub fn create_desktop_native_passport_from_native_surface_with_pending_recovery<S, V, P>(
    store: &V,
    sealer: &S,
    secret_surface: &P,
    pending_recovery_session: &DesktopPendingRecoverySessionStore,
) -> DesktopNativePassportCreateCommandOutcome
where
    S: NativePlatformSealer + ?Sized,
    V: NativeVaultStore + ?Sized,
    P: DesktopNativeSecretSurfacePort + ?Sized,
{
    create_desktop_native_passport_from_native_surface_inner(
        store,
        sealer,
        secret_surface,
        Some(pending_recovery_session),
        None,
    )
}

pub fn create_desktop_native_passport_from_native_surface_with_pending_factors<S, V, P>(
    store: &V,
    sealer: &S,
    secret_surface: &P,
    pending_recovery_session: &DesktopPendingRecoverySessionStore,
    pending_operational_session: &DesktopPendingOperationalSessionStore,
) -> DesktopNativePassportCreateCommandOutcome
where
    S: NativePlatformSealer + ?Sized,
    V: NativeVaultStore + ?Sized,
    P: DesktopNativeSecretSurfacePort + ?Sized,
{
    create_desktop_native_passport_from_native_surface_inner(
        store,
        sealer,
        secret_surface,
        Some(pending_recovery_session),
        Some(pending_operational_session),
    )
}

fn create_desktop_native_passport_from_native_surface_inner<S, V, P>(
    store: &V,
    sealer: &S,
    secret_surface: &P,
    pending_recovery_session: Option<&DesktopPendingRecoverySessionStore>,
    pending_operational_session: Option<&DesktopPendingOperationalSessionStore>,
) -> DesktopNativePassportCreateCommandOutcome
where
    S: NativePlatformSealer + ?Sized,
    V: NativeVaultStore + ?Sized,
    P: DesktopNativeSecretSurfacePort + ?Sized,
{
    match load_native_encrypted_vault(store) {
        Ok(Some(_)) => {
            return create_outcome(
                DesktopNativePassportCreateCommandState::AlreadyExists,
                false,
            );
        }

        Ok(None) => {
            if let Some(pending) = pending_recovery_session {
                if pending.clear_pending_recovery_factor().is_err() {
                    return create_outcome(
                        DesktopNativePassportCreateCommandState::Unavailable,
                        false,
                    );
                }
            }

            if let Some(pending) = pending_operational_session {
                if pending.clear_pending_operational_factor().is_err() {
                    return create_outcome(
                        DesktopNativePassportCreateCommandState::Unavailable,
                        false,
                    );
                }
            }
        }

        Err(_) => {
            return create_outcome(DesktopNativePassportCreateCommandState::Unavailable, false);
        }
    }

    let pin = match secret_surface.request_create_pin() {
        Ok(DesktopNativeSecretSurfaceOutcome::Secret(pin)) => pin,

        Ok(DesktopNativeSecretSurfaceOutcome::Rejected) => {
            return create_outcome(
                DesktopNativePassportCreateCommandState::CreateRejected,
                true,
            );
        }

        Ok(DesktopNativeSecretSurfaceOutcome::Cancelled) => {
            return create_outcome(DesktopNativePassportCreateCommandState::Cancelled, true);
        }

        Ok(DesktopNativeSecretSurfaceOutcome::Unavailable)
        | Err(DesktopNativeSecretSurfaceError::Unavailable) => {
            return create_outcome(DesktopNativePassportCreateCommandState::Unavailable, true);
        }
    };

    let create_result = match (pending_recovery_session, pending_operational_session) {
        (Some(pending_recovery), Some(pending_operational)) => {
            create_desktop_native_passport_vault_with_random_and_factor_handoff(
                &OsNativeVaultRandomSource,
                store,
                sealer,
                pin.as_slice(),
                |recovery_factor, operational_factor| {
                    pending_recovery
                        .stage_recovery_factor(recovery_factor)
                        .map_err(|_| {
                            DesktopNativePassportVaultCreateError::PendingRecoverySessionFailure
                        })?;

                    pending_operational
                        .stage_operational_factor(operational_factor)
                        .map_err(|_| {
                            DesktopNativePassportVaultCreateError::PendingOperationalSessionFailure
                        })
                },
            )
        }

        (Some(pending_recovery), None) => {
            create_desktop_native_passport_vault_with_random_and_recovery_handoff(
                &OsNativeVaultRandomSource,
                store,
                sealer,
                pin.as_slice(),
                |recovery_factor| {
                    pending_recovery
                        .stage_recovery_factor(recovery_factor)
                        .map_err(|_| {
                            DesktopNativePassportVaultCreateError::PendingRecoverySessionFailure
                        })
                },
            )
        }

        (None, Some(pending_operational)) => {
            create_desktop_native_passport_vault_with_random_and_factor_handoff(
                &OsNativeVaultRandomSource,
                store,
                sealer,
                pin.as_slice(),
                |_recovery_factor, operational_factor| {
                    pending_operational
                        .stage_operational_factor(operational_factor)
                        .map_err(|_| {
                            DesktopNativePassportVaultCreateError::PendingOperationalSessionFailure
                        })
                },
            )
        }

        (None, None) => create_desktop_native_passport_vault(store, sealer, pin.as_slice()),
    };

    if create_result.is_err() {
        if let Some(pending) = pending_recovery_session {
            let _ = pending.clear_pending_recovery_factor();
        }

        if let Some(pending) = pending_operational_session {
            let _ = pending.clear_pending_operational_factor();
        }
    }

    #[cfg(debug_assertions)]
    if let Some(pending) = pending_recovery_session {
        let staged = match pending.has_pending_recovery_factor() {
            Ok(true) => "YES",
            Ok(false) => "NO",
            Err(_) => "UNKNOWN",
        };

        eprintln!("CREATE_PROCESS_ID={}", std::process::id(),);

        eprintln!("CREATE_PENDING_STAGED={staged}",);
    }

    #[cfg(debug_assertions)]
    if let Some(pending) = pending_operational_session {
        let staged = match pending.has_pending_operational_factor() {
            Ok(true) => "YES",
            Ok(false) => "NO",
            Err(_) => "UNKNOWN",
        };

        eprintln!("CREATE_OPERATIONAL_PENDING_STAGED={staged}",);
    }

    match create_result {
        Ok(_) => create_outcome(DesktopNativePassportCreateCommandState::CreatedLocked, true),

        Err(DesktopNativePassportVaultCreateError::VaultAlreadyExists) => {
            create_outcome(DesktopNativePassportCreateCommandState::AlreadyExists, true)
        }

        Err(
            DesktopNativePassportVaultCreateError::InvalidPinLength { .. }
            | DesktopNativePassportVaultCreateError::VaultCryptoFailure
            | DesktopNativePassportVaultCreateError::PlatformBoundVaultFailure,
        ) => create_outcome(
            DesktopNativePassportCreateCommandState::CreateRejected,
            true,
        ),

        Err(
            DesktopNativePassportVaultCreateError::RandomnessUnavailable
            | DesktopNativePassportVaultCreateError::PlatformStorageFailure
            | DesktopNativePassportVaultCreateError::PendingRecoverySessionFailure
            | DesktopNativePassportVaultCreateError::PendingOperationalSessionFailure,
        ) => create_outcome(DesktopNativePassportCreateCommandState::Unavailable, true),
    }
}

fn create_outcome(
    state: DesktopNativePassportCreateCommandState,
    native_secure_input_requested: bool,
) -> DesktopNativePassportCreateCommandOutcome {
    DesktopNativePassportCreateCommandOutcome {
        state,
        native_secure_input_requested,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn phase15w_posture_keeps_create_pin_native_and_created_state_locked() {
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
    }
}
