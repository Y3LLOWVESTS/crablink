//! RO:WHAT — Loads a stored platform-bound Native Passport vault, unseals only its operational factor, unlocks its operational VMK, and retains that VMK in native-only session custody.
//! RO:WHY — Phase 15S establishes the real locked-to-operational-unlocked transition before exposing a bounded Tauri command.
//! RO:INTERACTS — NativeVaultStore, NativePlatformSealer, Phase 15R platform-bound vault envelope, Phase 15Q operational unlock, and AppState.
//! RO:INVARIANTS — only the device/operational factor is unsealed; recovery-root material remains sealed; one unlock attempt may run at a time; failed attempts restore Locked state; lock drops the zeroizing VMK.
//! RO:SECURITY — no PIN persistence, root unlock, secret serialization, frontend secret return, capability issuance, signing, wallet mutation, ledger mutation, or logging.
//! RO:TEST — tests/phase15s_operational_unseal_and_locked_vault_unlock_runtime.rs.

use std::{fmt, sync::Mutex};

use svc_passport::native::{
    decode_native_platform_bound_vault, load_native_encrypted_vault, unlock_native_operational_vmk,
    unseal_native_secret, NativePlatformFamily, NativePlatformSealer, NativeSecretBytes,
    NativeSecureCompartment, NativeVaultStore, PHASE6B_MAX_PIN_LENGTH, PHASE6B_MIN_PIN_LENGTH,
};

pub const NATIVE_PASSPORT_PHASE15S_LABEL: &str =
    "NATIVE_PASSPORT_PHASE15S_OPERATIONAL_UNSEAL_AND_LOCKED_VAULT_UNLOCK_RUNTIME";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DesktopOperationalVaultSessionState {
    Locked,
    Unlocking,
    OperationalUnlocked,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DesktopOperationalUnlockOutcome {
    pub state: DesktopOperationalVaultSessionState,
    pub platform_family: NativePlatformFamily,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DesktopOperationalUnlockError {
    NoStoredVault,
    InvalidPinLength {
        actual: usize,
        minimum: usize,
        maximum: usize,
    },
    UnlockAlreadyInProgress,
    AlreadyOperationalUnlocked,
    VaultLoadFailed,
    VaultDecodeFailed,
    UnlockRejected,
    SessionUnavailable,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DesktopOperationalUnlockPosture {
    pub phase_label: &'static str,
    pub canonical_crypto_owner: &'static str,
    pub platform_orchestration_owner: &'static str,
    pub stored_platform_bound_vault_loaded: bool,
    pub operational_factor_unsealed: bool,
    pub operational_vmk_unlocked: bool,
    pub native_only_session_custody_added: bool,
    pub concurrent_unlock_rejected: bool,
    pub failed_unlock_restores_locked_state: bool,
    pub explicit_lock_drops_operational_vmk: bool,
    pub recovery_root_factor_unsealed: bool,
    pub recovery_root_vmk_unlocked: bool,
    pub pin_persisted: bool,
    pub public_tauri_command_added: bool,
    pub frontend_secret_dto_added: bool,
    pub ron_kms_key_lifecycle_touched: bool,
    pub capability_issuance_added: bool,
    pub wallet_or_ledger_mutation_added: bool,
}

pub fn desktop_operational_unlock_posture() -> DesktopOperationalUnlockPosture {
    DesktopOperationalUnlockPosture {
        phase_label: NATIVE_PASSPORT_PHASE15S_LABEL,
        canonical_crypto_owner: "svc-passport",
        platform_orchestration_owner: "crablink-tauri",
        stored_platform_bound_vault_loaded: true,
        operational_factor_unsealed: true,
        operational_vmk_unlocked: true,
        native_only_session_custody_added: true,
        concurrent_unlock_rejected: true,
        failed_unlock_restores_locked_state: true,
        explicit_lock_drops_operational_vmk: true,
        recovery_root_factor_unsealed: false,
        recovery_root_vmk_unlocked: false,
        pin_persisted: false,
        public_tauri_command_added: false,
        frontend_secret_dto_added: false,
        ron_kms_key_lifecycle_touched: false,
        capability_issuance_added: false,
        wallet_or_ledger_mutation_added: false,
    }
}

struct DesktopOperationalVaultSession {
    platform_family: NativePlatformFamily,
    operational_vmk: NativeSecretBytes,
}

impl fmt::Debug for DesktopOperationalVaultSession {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("DesktopOperationalVaultSession")
            .field("platform_family", &self.platform_family)
            .field("operational_vmk", &"REDACTED_NATIVE_SESSION_MATERIAL")
            .field("operational_vmk_length", &self.operational_vmk.len())
            .finish()
    }
}

enum DesktopOperationalVaultSessionSlot {
    Locked,
    Unlocking,
    OperationalUnlocked(DesktopOperationalVaultSession),
}

pub struct DesktopOperationalVaultSessionStore {
    slot: Mutex<DesktopOperationalVaultSessionSlot>,
}

impl Default for DesktopOperationalVaultSessionStore {
    fn default() -> Self {
        Self {
            slot: Mutex::new(DesktopOperationalVaultSessionSlot::Locked),
        }
    }
}

impl fmt::Debug for DesktopOperationalVaultSessionStore {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("DesktopOperationalVaultSessionStore")
            .field("session_material", &"REDACTED_NATIVE_ONLY")
            .finish()
    }
}

impl DesktopOperationalVaultSessionStore {
    pub fn state(
        &self,
    ) -> Result<DesktopOperationalVaultSessionState, DesktopOperationalUnlockError> {
        let slot = self
            .slot
            .lock()
            .map_err(|_| DesktopOperationalUnlockError::SessionUnavailable)?;

        Ok(match &*slot {
            DesktopOperationalVaultSessionSlot::Locked => {
                DesktopOperationalVaultSessionState::Locked
            }
            DesktopOperationalVaultSessionSlot::Unlocking => {
                DesktopOperationalVaultSessionState::Unlocking
            }
            DesktopOperationalVaultSessionSlot::OperationalUnlocked(_) => {
                DesktopOperationalVaultSessionState::OperationalUnlocked
            }
        })
    }

    pub fn operational_vmk_len(&self) -> Result<Option<usize>, DesktopOperationalUnlockError> {
        let slot = self
            .slot
            .lock()
            .map_err(|_| DesktopOperationalUnlockError::SessionUnavailable)?;

        Ok(match &*slot {
            DesktopOperationalVaultSessionSlot::OperationalUnlocked(session) => {
                Some(session.operational_vmk.len())
            }
            DesktopOperationalVaultSessionSlot::Locked
            | DesktopOperationalVaultSessionSlot::Unlocking => None,
        })
    }

    pub fn lock(&self) -> Result<bool, DesktopOperationalUnlockError> {
        let mut slot = self
            .slot
            .lock()
            .map_err(|_| DesktopOperationalUnlockError::SessionUnavailable)?;

        let was_unlocked = matches!(
            &*slot,
            DesktopOperationalVaultSessionSlot::OperationalUnlocked(_,)
        );

        *slot = DesktopOperationalVaultSessionSlot::Locked;

        Ok(was_unlocked)
    }

    fn begin_unlock(&self) -> Result<(), DesktopOperationalUnlockError> {
        let mut slot = self
            .slot
            .lock()
            .map_err(|_| DesktopOperationalUnlockError::SessionUnavailable)?;

        match &*slot {
            DesktopOperationalVaultSessionSlot::Locked => {
                *slot = DesktopOperationalVaultSessionSlot::Unlocking;

                Ok(())
            }
            DesktopOperationalVaultSessionSlot::Unlocking => {
                Err(DesktopOperationalUnlockError::UnlockAlreadyInProgress)
            }
            DesktopOperationalVaultSessionSlot::OperationalUnlocked(_) => {
                Err(DesktopOperationalUnlockError::AlreadyOperationalUnlocked)
            }
        }
    }

    fn cancel_unlock(&self) -> Result<(), DesktopOperationalUnlockError> {
        let mut slot = self
            .slot
            .lock()
            .map_err(|_| DesktopOperationalUnlockError::SessionUnavailable)?;

        if matches!(&*slot, DesktopOperationalVaultSessionSlot::Unlocking) {
            *slot = DesktopOperationalVaultSessionSlot::Locked;
        }

        Ok(())
    }

    fn install(
        &self,
        platform_family: NativePlatformFamily,
        operational_vmk: NativeSecretBytes,
    ) -> Result<(), DesktopOperationalUnlockError> {
        let mut slot = self
            .slot
            .lock()
            .map_err(|_| DesktopOperationalUnlockError::SessionUnavailable)?;

        if !matches!(&*slot, DesktopOperationalVaultSessionSlot::Unlocking) {
            return Err(DesktopOperationalUnlockError::SessionUnavailable);
        }

        *slot = DesktopOperationalVaultSessionSlot::OperationalUnlocked(
            DesktopOperationalVaultSession {
                platform_family,
                operational_vmk,
            },
        );

        Ok(())
    }
}

pub fn unlock_desktop_native_passport_operational<S, V>(
    store: &V,
    sealer: &S,
    session_store: &DesktopOperationalVaultSessionStore,
    pin: &[u8],
) -> Result<DesktopOperationalUnlockOutcome, DesktopOperationalUnlockError>
where
    S: NativePlatformSealer + ?Sized,
    V: NativeVaultStore + ?Sized,
{
    validate_operational_unlock_pin(pin)?;

    session_store.begin_unlock()?;

    let result = perform_operational_unlock(store, sealer, pin);

    match result {
        Ok((platform_family, operational_vmk)) => {
            session_store.install(platform_family, operational_vmk)?;

            Ok(DesktopOperationalUnlockOutcome {
                state: DesktopOperationalVaultSessionState::OperationalUnlocked,
                platform_family,
            })
        }
        Err(error) => {
            session_store.cancel_unlock()?;

            Err(error)
        }
    }
}

pub fn unlock_desktop_native_passport_operational_with_factor<V>(
    store: &V,
    session_store: &DesktopOperationalVaultSessionStore,
    pin: &[u8],
    operational_factor: &NativeSecretBytes,
) -> Result<DesktopOperationalUnlockOutcome, DesktopOperationalUnlockError>
where
    V: NativeVaultStore + ?Sized,
{
    validate_operational_unlock_pin(pin)?;

    session_store.begin_unlock()?;

    let result = perform_operational_unlock_with_factor(store, pin, operational_factor);

    match result {
        Ok((platform_family, operational_vmk)) => {
            session_store.install(platform_family, operational_vmk)?;

            Ok(DesktopOperationalUnlockOutcome {
                state: DesktopOperationalVaultSessionState::OperationalUnlocked,
                platform_family,
            })
        }

        Err(error) => {
            session_store.cancel_unlock()?;

            Err(error)
        }
    }
}

fn perform_operational_unlock_with_factor<V>(
    store: &V,
    pin: &[u8],
    operational_factor: &NativeSecretBytes,
) -> Result<(NativePlatformFamily, NativeSecretBytes), DesktopOperationalUnlockError>
where
    V: NativeVaultStore + ?Sized,
{
    let encrypted_vault = load_native_encrypted_vault(store)
        .map_err(|_| DesktopOperationalUnlockError::VaultLoadFailed)?
        .ok_or(DesktopOperationalUnlockError::NoStoredVault)?;

    let platform_bound_vault = decode_native_platform_bound_vault(&encrypted_vault)
        .map_err(|_| DesktopOperationalUnlockError::VaultDecodeFailed)?;

    let platform_family = platform_bound_vault.platform_family();

    let operational_vmk = unlock_native_operational_vmk(
        platform_bound_vault.wrapped_keys().operational(),
        pin,
        operational_factor,
    )
    .map_err(|_| DesktopOperationalUnlockError::UnlockRejected)?;

    Ok((platform_family, operational_vmk))
}

fn perform_operational_unlock<S, V>(
    store: &V,
    sealer: &S,
    pin: &[u8],
) -> Result<(NativePlatformFamily, NativeSecretBytes), DesktopOperationalUnlockError>
where
    S: NativePlatformSealer + ?Sized,
    V: NativeVaultStore + ?Sized,
{
    let encrypted_vault = load_native_encrypted_vault(store)
        .map_err(|_| DesktopOperationalUnlockError::VaultLoadFailed)?
        .ok_or(DesktopOperationalUnlockError::NoStoredVault)?;

    let platform_bound_vault = decode_native_platform_bound_vault(&encrypted_vault)
        .map_err(|_| DesktopOperationalUnlockError::VaultDecodeFailed)?;

    let platform_family = platform_bound_vault.platform_family();

    let operational_factor = unseal_native_secret(
        sealer,
        platform_family,
        NativeSecureCompartment::DeviceKey,
        platform_bound_vault.operational_factor(),
    )
    .map_err(|_| DesktopOperationalUnlockError::UnlockRejected)?;

    let operational_vmk = unlock_native_operational_vmk(
        platform_bound_vault.wrapped_keys().operational(),
        pin,
        &operational_factor,
    )
    .map_err(|_| DesktopOperationalUnlockError::UnlockRejected)?;

    Ok((platform_family, operational_vmk))
}

fn validate_operational_unlock_pin(pin: &[u8]) -> Result<(), DesktopOperationalUnlockError> {
    let minimum = usize::from(PHASE6B_MIN_PIN_LENGTH);

    let maximum = usize::from(PHASE6B_MAX_PIN_LENGTH);

    if pin.len() < minimum || pin.len() > maximum {
        return Err(DesktopOperationalUnlockError::InvalidPinLength {
            actual: pin.len(),
            minimum,
            maximum,
        });
    }

    Ok(())
}
