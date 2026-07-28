//! RO:WHAT — Retains a newly created operational platform factor in native-only memory until first-run PIN confirmation succeeds.
//! RO:WHY — Same-process onboarding verifies the PIN without immediately re-reading macOS Keychain through an unsigned development executable.
//! RO:INTERACTS — Passport create, operational unlock, clear command, and AppState.
//! RO:INVARIANTS — success consumes the factor; failed verification restores it; clear, replacement, or process exit drops it.
//! RO:SECURITY — no serialization, persistence, logging, WebView custody, recovery-root access, wallet, ledger, capability, or username authority.
//! RO:TEST — onboarding_phase11b_command_path_tests.

use std::sync::Mutex;

use svc_passport::native::NativeSecretBytes;

pub const ONBOARDING_PHASE11B_PENDING_OPERATIONAL_LABEL: &str =
    "ONBOARDING_PHASE11B_NATIVE_PENDING_OPERATIONAL_HANDOFF";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DesktopPendingOperationalSessionError {
    StateUnavailable,
    InvalidOperationalFactor,
    UnexpectedExistingFactor,
}

#[derive(Default)]
pub struct DesktopPendingOperationalSessionStore {
    operational_factor: Mutex<Option<NativeSecretBytes>>,
}

impl DesktopPendingOperationalSessionStore {
    pub fn stage_operational_factor(
        &self,
        operational_factor: &NativeSecretBytes,
    ) -> Result<(), DesktopPendingOperationalSessionError> {
        let retained = NativeSecretBytes::new(operational_factor.as_slice().to_vec())
            .map_err(|_| DesktopPendingOperationalSessionError::InvalidOperationalFactor)?;

        self.restore_operational_factor(retained)
    }

    pub fn take_pending_operational_factor(
        &self,
    ) -> Result<Option<NativeSecretBytes>, DesktopPendingOperationalSessionError> {
        self.operational_factor
            .lock()
            .map(|mut slot| slot.take())
            .map_err(|_| DesktopPendingOperationalSessionError::StateUnavailable)
    }

    pub fn restore_operational_factor(
        &self,
        operational_factor: NativeSecretBytes,
    ) -> Result<(), DesktopPendingOperationalSessionError> {
        let mut slot = self
            .operational_factor
            .lock()
            .map_err(|_| DesktopPendingOperationalSessionError::StateUnavailable)?;

        if slot.is_some() {
            return Err(DesktopPendingOperationalSessionError::UnexpectedExistingFactor);
        }

        *slot = Some(operational_factor);

        Ok(())
    }

    pub fn clear_pending_operational_factor(
        &self,
    ) -> Result<bool, DesktopPendingOperationalSessionError> {
        self.operational_factor
            .lock()
            .map(|mut slot| slot.take().is_some())
            .map_err(|_| DesktopPendingOperationalSessionError::StateUnavailable)
    }

    pub fn has_pending_operational_factor(
        &self,
    ) -> Result<bool, DesktopPendingOperationalSessionError> {
        self.operational_factor
            .lock()
            .map(|slot| slot.is_some())
            .map_err(|_| DesktopPendingOperationalSessionError::StateUnavailable)
    }
}
