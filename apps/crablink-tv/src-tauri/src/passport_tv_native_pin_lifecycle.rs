//! Native PIN and lifecycle state for the delegated CrabLink TV Passport.
//!
//! This state model never accepts PIN bytes. Android prompt collection,
//! device-material unsealing, and production proof activation remain later
//! Phase 16E slices.

#![forbid(unsafe_code)]

use serde::Serialize;

pub(crate) const TV_NATIVE_PIN_LIFECYCLE_SCHEMA: &str = "crablink.tv.native-pin-lifecycle.v1";

const SESSION_LOCKED: &str = "locked";
const SESSION_UNLOCKED: &str = "operationally_unlocked";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum TvNativePinPromptResult {
    Accepted,
    Cancelled,
    WrongPin,
    PromptUnavailable,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum TvLifecycleLockReason {
    Restart,
    Background,
    Suspension,
    Manual,
    Revocation,
}

impl TvLifecycleLockReason {
    fn label(self) -> &'static str {
        match self {
            Self::Restart => "restart",
            Self::Background => "background",
            Self::Suspension => "suspension",
            Self::Manual => "manual",
            Self::Revocation => "revocation",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum TvNativePinLifecycleError {
    DeviceMaterialAbsent,
    DeviceAuthorizationAbsent,
    CapabilityAbsent,
    DeviceRevoked,
    NativePinCancelled,
    NativePinRejected,
    NativePromptUnavailable,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) struct TvNativePinLifecycleInputsV1 {
    pub device_material_present: bool,
    pub device_authorized: bool,
    pub capability_present: bool,
    pub device_revoked: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TvNativePinLifecycleSnapshotV1 {
    pub schema: &'static str,
    pub device_material_present: bool,
    pub device_authorized: bool,
    pub capability_present: bool,
    pub session_state: &'static str,
    pub session_locked: bool,
    pub operationally_unlocked: bool,
    pub device_revoked: bool,
    pub operational_secret_present: bool,
    pub proof_sensitive_ready: bool,
    pub last_lock_reason: &'static str,
    pub pin_stored: bool,
    pub pin_returned_to_webview: bool,
    pub private_material_exported: bool,
    pub recovery_root_present: bool,
    pub root_admin_key_present: bool,
    pub raw_authorization_returned: bool,
    pub raw_capability_returned: bool,
}

#[derive(Debug)]
pub(crate) struct TvNativePinLifecycleRuntime {
    inputs: TvNativePinLifecycleInputsV1,
    operationally_unlocked: bool,
    operational_secret_present: bool,
    last_lock_reason: TvLifecycleLockReason,
}

impl Default for TvNativePinLifecycleRuntime {
    fn default() -> Self {
        Self {
            inputs: TvNativePinLifecycleInputsV1 {
                device_material_present: false,
                device_authorized: false,
                capability_present: false,
                device_revoked: false,
            },
            operationally_unlocked: false,
            operational_secret_present: false,
            last_lock_reason: TvLifecycleLockReason::Restart,
        }
    }
}

impl TvNativePinLifecycleRuntime {
    pub(crate) fn hydrate_restart_locked(
        &mut self,
        inputs: TvNativePinLifecycleInputsV1,
    ) -> TvNativePinLifecycleSnapshotV1 {
        self.inputs = inputs;
        self.lock(TvLifecycleLockReason::Restart)
    }

    pub(crate) fn record_native_pin_result(
        &mut self,
        result: TvNativePinPromptResult,
    ) -> Result<TvNativePinLifecycleSnapshotV1, TvNativePinLifecycleError> {
        self.lock(TvLifecycleLockReason::Manual);

        match result {
            TvNativePinPromptResult::Accepted => {
                self.validate_unlock_posture()?;

                self.operationally_unlocked = true;
                self.operational_secret_present = true;

                Ok(self.snapshot())
            }

            TvNativePinPromptResult::Cancelled => {
                Err(TvNativePinLifecycleError::NativePinCancelled)
            }

            TvNativePinPromptResult::WrongPin => Err(TvNativePinLifecycleError::NativePinRejected),

            TvNativePinPromptResult::PromptUnavailable => {
                Err(TvNativePinLifecycleError::NativePromptUnavailable)
            }
        }
    }

    pub(crate) fn lock(&mut self, reason: TvLifecycleLockReason) -> TvNativePinLifecycleSnapshotV1 {
        if reason == TvLifecycleLockReason::Revocation {
            self.inputs.device_revoked = true;
        }

        self.operationally_unlocked = false;
        self.operational_secret_present = false;
        self.last_lock_reason = reason;

        self.snapshot()
    }

    pub(crate) fn snapshot(&self) -> TvNativePinLifecycleSnapshotV1 {
        let proof_sensitive_ready = self.inputs.device_material_present
            && self.inputs.device_authorized
            && self.inputs.capability_present
            && !self.inputs.device_revoked
            && self.operationally_unlocked
            && self.operational_secret_present;

        TvNativePinLifecycleSnapshotV1 {
            schema: TV_NATIVE_PIN_LIFECYCLE_SCHEMA,
            device_material_present: self.inputs.device_material_present,
            device_authorized: self.inputs.device_authorized,
            capability_present: self.inputs.capability_present,
            session_state: if self.operationally_unlocked {
                SESSION_UNLOCKED
            } else {
                SESSION_LOCKED
            },
            session_locked: !self.operationally_unlocked,
            operationally_unlocked: self.operationally_unlocked,
            device_revoked: self.inputs.device_revoked,
            operational_secret_present: self.operational_secret_present,
            proof_sensitive_ready,
            last_lock_reason: self.last_lock_reason.label(),
            pin_stored: false,
            pin_returned_to_webview: false,
            private_material_exported: false,
            recovery_root_present: false,
            root_admin_key_present: false,
            raw_authorization_returned: false,
            raw_capability_returned: false,
        }
    }

    fn validate_unlock_posture(&self) -> Result<(), TvNativePinLifecycleError> {
        if self.inputs.device_revoked {
            return Err(TvNativePinLifecycleError::DeviceRevoked);
        }

        if !self.inputs.device_material_present {
            return Err(TvNativePinLifecycleError::DeviceMaterialAbsent);
        }

        if !self.inputs.device_authorized {
            return Err(TvNativePinLifecycleError::DeviceAuthorizationAbsent);
        }

        if !self.inputs.capability_present {
            return Err(TvNativePinLifecycleError::CapabilityAbsent);
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn complete_inputs() -> TvNativePinLifecycleInputsV1 {
        TvNativePinLifecycleInputsV1 {
            device_material_present: true,
            device_authorized: true,
            capability_present: true,
            device_revoked: false,
        }
    }

    fn unlocked_runtime() -> TvNativePinLifecycleRuntime {
        let mut runtime = TvNativePinLifecycleRuntime::default();

        runtime.hydrate_restart_locked(complete_inputs());

        runtime
            .record_native_pin_result(TvNativePinPromptResult::Accepted)
            .expect("complete authority should unlock");

        runtime
    }

    #[test]
    fn phase16e1_distinguishes_material_authority_capability_and_session() {
        let mut runtime = TvNativePinLifecycleRuntime::default();

        let snapshot = runtime.hydrate_restart_locked(TvNativePinLifecycleInputsV1 {
            device_material_present: true,
            device_authorized: false,
            capability_present: true,
            device_revoked: false,
        });

        assert!(snapshot.device_material_present);
        assert!(!snapshot.device_authorized);
        assert!(snapshot.capability_present);
        assert!(snapshot.session_locked);
        assert!(!snapshot.operationally_unlocked);
        assert!(!snapshot.proof_sensitive_ready);
    }

    #[test]
    fn phase16e1_restart_hydration_always_begins_locked() {
        let mut runtime = unlocked_runtime();

        let snapshot = runtime.hydrate_restart_locked(complete_inputs());

        assert_eq!(snapshot.session_state, SESSION_LOCKED);
        assert_eq!(snapshot.last_lock_reason, "restart");
        assert!(!snapshot.operational_secret_present);
        assert!(!snapshot.proof_sensitive_ready);
    }

    #[test]
    fn phase16e1_native_pin_acceptance_requires_complete_authority() {
        let incomplete = [
            TvNativePinLifecycleInputsV1 {
                device_material_present: false,
                ..complete_inputs()
            },
            TvNativePinLifecycleInputsV1 {
                device_authorized: false,
                ..complete_inputs()
            },
            TvNativePinLifecycleInputsV1 {
                capability_present: false,
                ..complete_inputs()
            },
        ];

        for inputs in incomplete {
            let mut runtime = TvNativePinLifecycleRuntime::default();

            runtime.hydrate_restart_locked(inputs);

            assert!(runtime
                .record_native_pin_result(TvNativePinPromptResult::Accepted)
                .is_err());

            assert!(runtime.snapshot().session_locked);
            assert!(!runtime.snapshot().operational_secret_present);
            assert!(!runtime.snapshot().proof_sensitive_ready);
        }

        let snapshot = unlocked_runtime().snapshot();

        assert!(snapshot.operationally_unlocked);
        assert!(snapshot.proof_sensitive_ready);
    }

    #[test]
    fn phase16e1_cancel_wrong_pin_and_unavailable_prompt_fail_closed() {
        let failures = [
            (
                TvNativePinPromptResult::Cancelled,
                TvNativePinLifecycleError::NativePinCancelled,
            ),
            (
                TvNativePinPromptResult::WrongPin,
                TvNativePinLifecycleError::NativePinRejected,
            ),
            (
                TvNativePinPromptResult::PromptUnavailable,
                TvNativePinLifecycleError::NativePromptUnavailable,
            ),
        ];

        for (result, expected) in failures {
            let mut runtime = TvNativePinLifecycleRuntime::default();

            runtime.hydrate_restart_locked(complete_inputs());

            assert_eq!(runtime.record_native_pin_result(result), Err(expected),);

            let snapshot = runtime.snapshot();

            assert!(snapshot.session_locked);
            assert!(!snapshot.operational_secret_present);
            assert!(!snapshot.proof_sensitive_ready);
        }
    }

    #[test]
    fn phase16e1_background_and_suspension_clear_operational_state() {
        for reason in [
            TvLifecycleLockReason::Background,
            TvLifecycleLockReason::Suspension,
        ] {
            let mut runtime = unlocked_runtime();

            let snapshot = runtime.lock(reason);

            assert!(snapshot.session_locked);
            assert!(!snapshot.operationally_unlocked);
            assert!(!snapshot.operational_secret_present);
            assert!(!snapshot.proof_sensitive_ready);
        }
    }

    #[test]
    fn phase16e1_revocation_blocks_unlock_and_proof_readiness() {
        let mut runtime = unlocked_runtime();

        let revoked = runtime.lock(TvLifecycleLockReason::Revocation);

        assert!(revoked.device_revoked);
        assert!(revoked.session_locked);
        assert!(!revoked.proof_sensitive_ready);

        assert_eq!(
            runtime.record_native_pin_result(TvNativePinPromptResult::Accepted),
            Err(TvNativePinLifecycleError::DeviceRevoked),
        );

        let snapshot = runtime.snapshot();

        assert!(snapshot.device_revoked);
        assert!(snapshot.session_locked);
        assert!(!snapshot.operational_secret_present);
        assert!(!snapshot.pin_stored);
        assert!(!snapshot.pin_returned_to_webview);
        assert!(!snapshot.private_material_exported);
        assert!(!snapshot.recovery_root_present);
        assert!(!snapshot.root_admin_key_present);
    }
}
