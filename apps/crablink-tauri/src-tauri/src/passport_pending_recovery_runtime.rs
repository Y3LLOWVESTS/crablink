//! RO:WHAT — Retains the newly created recovery factor in a native-only one-time session until the first recovery ceremony finishes.
//! RO:WHY — Immediate post-create recovery must not re-read macOS Keychain through an unsigned development executable and trigger a login-Keychain password prompt.
//! RO:INTERACTS — Passport create, recovery ceremony, clear command, and AppState.
//! RO:INVARIANTS — cancellation or temporary unavailability restores the factor for retry; acknowledgement, clear, replacement, or process exit drops it; React never receives it.
//! RO:SECURITY — no serialization, logging, clipboard, persistence, phrase storage, PIN storage, root export, wallet, ledger, capability, or username authority.
//! RO:TEST — passport_recovery_phrase_runtime Phase 11B focused tests.

use std::sync::Mutex;

use svc_passport::native::NativeSecretBytes;

pub const ONBOARDING_PHASE11B_PENDING_RECOVERY_LABEL: &str =
    "ONBOARDING_PHASE11B_NATIVE_PENDING_RECOVERY_HANDOFF";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DesktopPendingRecoverySessionError {
    StateUnavailable,
    InvalidRecoveryFactor,
    UnexpectedExistingFactor,
}

#[derive(Default)]
pub struct DesktopPendingRecoverySessionStore {
    recovery_factor: Mutex<Option<NativeSecretBytes>>,
}

impl DesktopPendingRecoverySessionStore {
    pub fn stage_recovery_factor(
        &self,
        recovery_factor: &NativeSecretBytes,
    ) -> Result<(), DesktopPendingRecoverySessionError> {
        let retained = NativeSecretBytes::new(recovery_factor.as_slice().to_vec())
            .map_err(|_| DesktopPendingRecoverySessionError::InvalidRecoveryFactor)?;

        self.restore_recovery_factor(retained)
    }

    pub fn take_pending_recovery_factor(
        &self,
    ) -> Result<Option<NativeSecretBytes>, DesktopPendingRecoverySessionError> {
        self.recovery_factor
            .lock()
            .map(|mut slot| slot.take())
            .map_err(|_| DesktopPendingRecoverySessionError::StateUnavailable)
    }

    pub fn restore_recovery_factor(
        &self,
        recovery_factor: NativeSecretBytes,
    ) -> Result<(), DesktopPendingRecoverySessionError> {
        let mut slot = self
            .recovery_factor
            .lock()
            .map_err(|_| DesktopPendingRecoverySessionError::StateUnavailable)?;

        if slot.is_some() {
            return Err(DesktopPendingRecoverySessionError::UnexpectedExistingFactor);
        }

        *slot = Some(recovery_factor);

        Ok(())
    }

    pub fn clear_pending_recovery_factor(
        &self,
    ) -> Result<bool, DesktopPendingRecoverySessionError> {
        self.recovery_factor
            .lock()
            .map(|mut slot| slot.take().is_some())
            .map_err(|_| DesktopPendingRecoverySessionError::StateUnavailable)
    }

    pub fn has_pending_recovery_factor(&self) -> Result<bool, DesktopPendingRecoverySessionError> {
        self.recovery_factor
            .lock()
            .map(|slot| slot.is_some())
            .map_err(|_| DesktopPendingRecoverySessionError::StateUnavailable)
    }
}
