//! Orchestrates native operational unlock for the delegated TV Passport.
//!
//! Native PIN acceptance is necessary but not sufficient. The runtime becomes
//! operationally unlocked only after bounded device-key and capability
//! material are unsealed through an injected native-only port and the existing
//! delegated-authority runtime accepts a non-forgeable unlock grant.
//!
//! Secret-bearing values remain zeroizing native memory and are never
//! serialized, cloned, logged, returned to the frontend, or stored here.

#![forbid(unsafe_code)]

use serde::Serialize;

#[cfg(target_os = "android")]
use std::sync::{Mutex, OnceLock};

use zeroize::Zeroizing;

use crate::passport_tv_authority_runtime::{
    TvAuthorityRuntimeSnapshotV1, TvDelegatedAuthorityRuntime,
};

#[cfg(target_os = "android")]
use crate::passport_tv_authority_runtime::global_tv_authority_runtime;
use crate::passport_tv_native_pin_lifecycle::{
    TvLifecycleLockReason, TvNativePinLifecycleError, TvNativePinLifecycleInputsV1,
    TvNativePinLifecycleRuntime, TvNativePinPromptResult,
};

pub(crate) const TV_OPERATIONAL_UNLOCK_RECEIPT_SCHEMA: &str = "crablink.tv.operational-unlock.v1";

const DEVICE_SIGNING_KEY_BYTES: usize = 32;
const MAX_UNLOCKED_CAPABILITY_BYTES: usize = 64 * 1_024;

#[cfg_attr(not(target_os = "android"), allow(dead_code))]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum TvOperationalMaterialPortError {
    DeviceMaterialUnavailable,
    CapabilityUnavailable,
    PlatformUnsealFailed,
}

pub(crate) trait TvOperationalMaterialPort {
    fn unseal_device_signing_key(
        &mut self,
    ) -> Result<Zeroizing<Vec<u8>>, TvOperationalMaterialPortError>;

    fn unseal_narrow_capability(
        &mut self,
    ) -> Result<Zeroizing<Vec<u8>>, TvOperationalMaterialPortError>;
}

#[cfg_attr(not(target_os = "android"), allow(dead_code))]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum TvOperationalUnlockError {
    NativePinCancelled,
    NativePinRejected,
    NativePromptUnavailable,
    LifecycleRejected,
    DeviceMaterialUnsealFailed,
    DeviceMaterialInvalid,
    CapabilityUnsealFailed,
    CapabilityInvalid,
    AuthorityUnlockFailed,
    RuntimeUnavailable,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TvOperationalUnlockReceiptV1 {
    pub schema: &'static str,
    pub operationally_unlocked: bool,
    pub device_proof_available: bool,
    pub device_material_present: bool,
    pub device_authorized: bool,
    pub capability_present: bool,
    pub device_revoked: bool,
    pub device_key_bytes: usize,
    pub capability_bytes: usize,
    pub operational_material_present: bool,
    pub pin_stored: bool,
    pub pin_returned_to_webview: bool,
    pub raw_authorization_returned: bool,
    pub raw_capability_returned: bool,
    pub private_material_exported: bool,
    pub recovery_root_present: bool,
    pub root_admin_key_present: bool,
}

pub(crate) struct TvOperationalUnlockGrant {
    device_key_bytes: usize,
    capability_bytes: usize,
    native_pin_accepted: bool,
}

impl TvOperationalUnlockGrant {
    fn new(device_key_bytes: usize, capability_bytes: usize) -> Self {
        Self {
            device_key_bytes,
            capability_bytes,
            native_pin_accepted: true,
        }
    }

    pub(crate) fn allows_device_proof(&self) -> bool {
        self.native_pin_accepted
            && self.device_key_bytes == DEVICE_SIGNING_KEY_BYTES
            && self.capability_bytes > 0
            && self.capability_bytes <= MAX_UNLOCKED_CAPABILITY_BYTES
    }
}

#[derive(Default)]
pub(crate) struct TvOperationalUnlockRuntime {
    lifecycle: TvNativePinLifecycleRuntime,
    device_signing_key: Option<Zeroizing<Vec<u8>>>,
    narrow_capability: Option<Zeroizing<Vec<u8>>>,
}

impl TvOperationalUnlockRuntime {
    pub(crate) fn hydrate_restart_locked(
        &mut self,
        inputs: TvNativePinLifecycleInputsV1,
        authority: &mut TvDelegatedAuthorityRuntime,
    ) -> TvOperationalUnlockReceiptV1 {
        self.clear_operational_material();

        let lifecycle_snapshot = self.lifecycle.hydrate_restart_locked(inputs);

        let authority_snapshot = authority.lock_operational_state();

        receipt(&lifecycle_snapshot, &authority_snapshot, 0, 0, false)
    }

    pub(crate) fn unlock_after_native_pin<P: TvOperationalMaterialPort>(
        &mut self,
        pin_result: TvNativePinPromptResult,
        now_ms: u64,
        authority: &mut TvDelegatedAuthorityRuntime,
        port: &mut P,
    ) -> Result<TvOperationalUnlockReceiptV1, TvOperationalUnlockError> {
        self.clear_operational_material();
        authority.lock_operational_state();

        let lifecycle_snapshot = match self.lifecycle.record_native_pin_result(pin_result) {
            Ok(snapshot) => snapshot,
            Err(error) => {
                return Err(map_lifecycle_error(error));
            }
        };

        let device_signing_key = match port.unseal_device_signing_key() {
            Ok(material) => material,
            Err(_) => {
                self.fail_closed(authority);

                return Err(TvOperationalUnlockError::DeviceMaterialUnsealFailed);
            }
        };

        if device_signing_key.len() != DEVICE_SIGNING_KEY_BYTES {
            self.fail_closed(authority);

            return Err(TvOperationalUnlockError::DeviceMaterialInvalid);
        }

        let narrow_capability = match port.unseal_narrow_capability() {
            Ok(material) => material,
            Err(_) => {
                self.fail_closed(authority);

                return Err(TvOperationalUnlockError::CapabilityUnsealFailed);
            }
        };

        if narrow_capability.is_empty() || narrow_capability.len() > MAX_UNLOCKED_CAPABILITY_BYTES {
            self.fail_closed(authority);

            return Err(TvOperationalUnlockError::CapabilityInvalid);
        }

        let device_key_bytes = device_signing_key.len();

        let capability_bytes = narrow_capability.len();

        let grant = TvOperationalUnlockGrant::new(device_key_bytes, capability_bytes);

        self.device_signing_key = Some(device_signing_key);

        self.narrow_capability = Some(narrow_capability);

        let authority_snapshot = match authority.unlock_with_native_grant(&grant, now_ms) {
            Ok(snapshot) => snapshot,
            Err(_) => {
                self.fail_closed(authority);

                return Err(TvOperationalUnlockError::AuthorityUnlockFailed);
            }
        };

        Ok(receipt(
            &lifecycle_snapshot,
            &authority_snapshot,
            device_key_bytes,
            capability_bytes,
            self.operational_material_present(),
        ))
    }

    pub(crate) fn lock(
        &mut self,
        reason: TvLifecycleLockReason,
        authority: &mut TvDelegatedAuthorityRuntime,
    ) -> TvOperationalUnlockReceiptV1 {
        self.clear_operational_material();

        let lifecycle_snapshot = self.lifecycle.lock(reason);

        let authority_snapshot = authority.lock_operational_state();

        receipt(&lifecycle_snapshot, &authority_snapshot, 0, 0, false)
    }

    pub(crate) fn operational_material_present(&self) -> bool {
        self.device_signing_key.is_some() && self.narrow_capability.is_some()
    }

    fn fail_closed(&mut self, authority: &mut TvDelegatedAuthorityRuntime) {
        self.clear_operational_material();

        self.lifecycle.lock(TvLifecycleLockReason::Manual);

        authority.lock_operational_state();
    }

    fn clear_operational_material(&mut self) {
        self.device_signing_key.take();
        self.narrow_capability.take();
    }
}

#[cfg(target_os = "android")]
static GLOBAL_TV_OPERATIONAL_UNLOCK_RUNTIME: OnceLock<Mutex<TvOperationalUnlockRuntime>> =
    OnceLock::new();

#[cfg(target_os = "android")]
fn global_tv_operational_unlock_runtime() -> &'static Mutex<TvOperationalUnlockRuntime> {
    GLOBAL_TV_OPERATIONAL_UNLOCK_RUNTIME
        .get_or_init(|| Mutex::new(TvOperationalUnlockRuntime::default()))
}

#[cfg(target_os = "android")]
pub(crate) fn unlock_global_after_verified_native_pin<P: TvOperationalMaterialPort>(
    now_ms: u64,

    port: &mut P,
) -> Result<TvOperationalUnlockReceiptV1, TvOperationalUnlockError> {
    if now_ms == 0 {
        return Err(TvOperationalUnlockError::RuntimeUnavailable);
    }

    let mut operational_runtime = global_tv_operational_unlock_runtime()
        .lock()
        .map_err(|_| TvOperationalUnlockError::RuntimeUnavailable)?;

    let mut authority_runtime = global_tv_authority_runtime()
        .lock()
        .map_err(|_| TvOperationalUnlockError::RuntimeUnavailable)?;

    let authority_snapshot = authority_runtime.snapshot();

    let device_authorized = authority_snapshot.authority_present
        && authority_snapshot.authorization_present
        && authority_snapshot.device_bound
        && authority_snapshot.passport_bound
        && !authority_snapshot.revoked;

    operational_runtime.hydrate_restart_locked(
        TvNativePinLifecycleInputsV1 {
            device_material_present: authority_snapshot.authority_present
                && authority_snapshot.device_bound,

            device_authorized,

            capability_present: authority_snapshot.capability_present,

            device_revoked: authority_snapshot.revoked,
        },
        &mut authority_runtime,
    );

    operational_runtime.unlock_after_native_pin(
        TvNativePinPromptResult::Accepted,
        now_ms,
        &mut authority_runtime,
        port,
    )
}

#[cfg(target_os = "android")]
pub(crate) fn fail_closed_global_operational_unlock(
) -> Result<TvOperationalUnlockReceiptV1, TvOperationalUnlockError> {
    let mut operational_runtime = global_tv_operational_unlock_runtime()
        .lock()
        .map_err(|_| TvOperationalUnlockError::RuntimeUnavailable)?;

    let mut authority_runtime = global_tv_authority_runtime()
        .lock()
        .map_err(|_| TvOperationalUnlockError::RuntimeUnavailable)?;

    Ok(operational_runtime.lock(TvLifecycleLockReason::Manual, &mut authority_runtime))
}

fn map_lifecycle_error(error: TvNativePinLifecycleError) -> TvOperationalUnlockError {
    match error {
        TvNativePinLifecycleError::NativePinCancelled => {
            TvOperationalUnlockError::NativePinCancelled
        }

        TvNativePinLifecycleError::NativePinRejected => TvOperationalUnlockError::NativePinRejected,

        TvNativePinLifecycleError::NativePromptUnavailable => {
            TvOperationalUnlockError::NativePromptUnavailable
        }

        TvNativePinLifecycleError::DeviceMaterialAbsent
        | TvNativePinLifecycleError::DeviceAuthorizationAbsent
        | TvNativePinLifecycleError::CapabilityAbsent
        | TvNativePinLifecycleError::DeviceRevoked => TvOperationalUnlockError::LifecycleRejected,
    }
}

fn receipt(
    lifecycle: &crate::passport_tv_native_pin_lifecycle::TvNativePinLifecycleSnapshotV1,
    authority: &TvAuthorityRuntimeSnapshotV1,
    device_key_bytes: usize,
    capability_bytes: usize,
    operational_material_present: bool,
) -> TvOperationalUnlockReceiptV1 {
    TvOperationalUnlockReceiptV1 {
        schema: TV_OPERATIONAL_UNLOCK_RECEIPT_SCHEMA,
        operationally_unlocked: lifecycle.operationally_unlocked
            && authority.operationally_unlocked
            && operational_material_present,
        device_proof_available: authority.device_proof_available && operational_material_present,
        device_material_present: lifecycle.device_material_present,
        device_authorized: lifecycle.device_authorized,
        capability_present: lifecycle.capability_present,
        device_revoked: lifecycle.device_revoked || authority.revoked,
        device_key_bytes,
        capability_bytes,
        operational_material_present,
        pin_stored: false,
        pin_returned_to_webview: false,
        raw_authorization_returned: false,
        raw_capability_returned: false,
        private_material_exported: false,
        recovery_root_present: false,
        root_admin_key_present: false,
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;
    use zeroize::Zeroizing;

    use super::*;

    use crate::passport_tv_delegated_authority::{
        TV_DELEGATED_AUTHORITY_RECORD_SCHEMA, TV_DELEGATED_AUTHORIZATION_MODE,
        TV_DELEGATED_CAPABILITY_BINDING, TV_DELEGATED_DEVICE_CLASS,
        TV_DELEGATED_PROOF_KEY_ALGORITHM, TV_DELEGATED_READ_SCOPES,
    };

    const NOW_MS: u64 = 1_800_000_000_000;

    const PASSPORT_ID: &str =
        "passport:v1:main:ed25519:b3:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

    const DEVICE_PUBLIC_KEY: &str =
        "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

    const AUTHORIZATION_ID: &str =
        "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";

    const CAPABILITY_ID: &str = "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";

    fn authority_record_json() -> String {
        json!({
            "schema":
                TV_DELEGATED_AUTHORITY_RECORD_SCHEMA,
            "deviceClass":
                TV_DELEGATED_DEVICE_CLASS,
            "authorizationMode":
                TV_DELEGATED_AUTHORIZATION_MODE,
            "passportId":
                PASSPORT_ID,
            "devicePublicKeyHex":
                DEVICE_PUBLIC_KEY,
            "authorizationId":
                AUTHORIZATION_ID,
            "capabilityId":
                CAPABILITY_ID,
            "scopes":
                TV_DELEGATED_READ_SCOPES,
            "authorizationRootEpoch":
                7,
            "authorizationExpiresAtMs":
                NOW_MS + 3_600_000,
            "capabilityExpiresAtMs":
                NOW_MS + 900_000,
            "refreshNotAfterMs":
                NOW_MS + 1_800_000,
            "revocationVersion":
                2,
            "revoked":
                false,
            "capabilityBinding":
                TV_DELEGATED_CAPABILITY_BINDING,
            "proofKeyAlgorithm":
                TV_DELEGATED_PROOF_KEY_ALGORITHM,
            "authorizationMaterialSealed":
                true,
            "capabilityMaterialSealed":
                true,
            "rawAuthorizationReturned":
                false,
            "rawCapabilityReturned":
                false,
            "webviewSecretReturned":
                false,
            "recoveryRootPresent":
                false,
            "rootAdminKeyPresent":
                false,
            "sessionPresent":
                false,
            "operationallyUnlocked":
                false
        })
        .to_string()
    }

    fn complete_inputs() -> TvNativePinLifecycleInputsV1 {
        TvNativePinLifecycleInputsV1 {
            device_material_present: true,
            device_authorized: true,
            capability_present: true,
            device_revoked: false,
        }
    }

    fn hydrated_runtimes() -> (TvOperationalUnlockRuntime, TvDelegatedAuthorityRuntime) {
        let mut authority = TvDelegatedAuthorityRuntime::default();

        authority
            .hydrate(&authority_record_json(), NOW_MS)
            .expect("valid delegated authority should hydrate");

        let mut unlock = TvOperationalUnlockRuntime::default();

        unlock.hydrate_restart_locked(complete_inputs(), &mut authority);

        (unlock, authority)
    }

    struct RecordingMaterialPort {
        device_result: Result<Vec<u8>, TvOperationalMaterialPortError>,
        capability_result: Result<Vec<u8>, TvOperationalMaterialPortError>,
        device_calls: usize,
        capability_calls: usize,
    }

    impl RecordingMaterialPort {
        fn valid() -> Self {
            Self {
                device_result: Ok(vec![7; DEVICE_SIGNING_KEY_BYTES]),
                capability_result: Ok(vec![9; 128]),
                device_calls: 0,
                capability_calls: 0,
            }
        }
    }

    impl TvOperationalMaterialPort for RecordingMaterialPort {
        fn unseal_device_signing_key(
            &mut self,
        ) -> Result<Zeroizing<Vec<u8>>, TvOperationalMaterialPortError> {
            self.device_calls += 1;

            match &self.device_result {
                Ok(material) => Ok(Zeroizing::new(material.clone())),

                Err(error) => Err(*error),
            }
        }

        fn unseal_narrow_capability(
            &mut self,
        ) -> Result<Zeroizing<Vec<u8>>, TvOperationalMaterialPortError> {
            self.capability_calls += 1;

            match &self.capability_result {
                Ok(material) => Ok(Zeroizing::new(material.clone())),

                Err(error) => Err(*error),
            }
        }
    }

    #[test]
    fn phase16e3a_nonaccepted_pin_never_invokes_unseal_port() {
        let failures = [
            TvNativePinPromptResult::Cancelled,
            TvNativePinPromptResult::WrongPin,
            TvNativePinPromptResult::PromptUnavailable,
        ];

        for pin_result in failures {
            let (mut unlock, mut authority) = hydrated_runtimes();

            let mut port = RecordingMaterialPort::valid();

            assert!(unlock
                .unlock_after_native_pin(pin_result, NOW_MS, &mut authority, &mut port,)
                .is_err(),);

            assert_eq!(port.device_calls, 0,);

            assert_eq!(port.capability_calls, 0,);

            assert!(!unlock.operational_material_present(),);

            assert!(!authority.snapshot().operationally_unlocked,);
        }
    }

    #[test]
    fn phase16e3a_valid_native_material_unlocks_authority_runtime() {
        let (mut unlock, mut authority) = hydrated_runtimes();

        let mut port = RecordingMaterialPort::valid();

        let receipt = unlock
            .unlock_after_native_pin(
                TvNativePinPromptResult::Accepted,
                NOW_MS,
                &mut authority,
                &mut port,
            )
            .expect("valid native materials should unlock");

        assert_eq!(port.device_calls, 1,);

        assert_eq!(port.capability_calls, 1,);

        assert!(receipt.operationally_unlocked,);

        assert!(receipt.device_proof_available,);

        assert!(receipt.operational_material_present,);

        assert_eq!(receipt.device_key_bytes, DEVICE_SIGNING_KEY_BYTES,);

        assert_eq!(receipt.capability_bytes, 128,);

        assert!(authority.snapshot().session_present,);

        assert!(!receipt.private_material_exported,);

        assert!(!receipt.raw_capability_returned,);
    }

    #[test]
    fn phase16e3a_invalid_device_key_length_fails_closed() {
        let (mut unlock, mut authority) = hydrated_runtimes();

        let mut port = RecordingMaterialPort::valid();

        port.device_result = Ok(vec![1; DEVICE_SIGNING_KEY_BYTES - 1]);

        assert_eq!(
            unlock.unlock_after_native_pin(
                TvNativePinPromptResult::Accepted,
                NOW_MS,
                &mut authority,
                &mut port,
            ),
            Err(TvOperationalUnlockError::DeviceMaterialInvalid,),
        );

        assert!(!unlock.operational_material_present(),);

        assert!(!authority.snapshot().operationally_unlocked,);
    }

    #[test]
    fn phase16e3a_invalid_capability_length_fails_closed() {
        for capability in [Vec::new(), vec![1; MAX_UNLOCKED_CAPABILITY_BYTES + 1]] {
            let (mut unlock, mut authority) = hydrated_runtimes();

            let mut port = RecordingMaterialPort::valid();

            port.capability_result = Ok(capability);

            assert_eq!(
                unlock.unlock_after_native_pin(
                    TvNativePinPromptResult::Accepted,
                    NOW_MS,
                    &mut authority,
                    &mut port,
                ),
                Err(TvOperationalUnlockError::CapabilityInvalid,),
            );

            assert!(!unlock.operational_material_present(),);

            assert!(!authority.snapshot().device_proof_available,);
        }
    }

    #[test]
    fn phase16e3a_platform_unseal_failure_fails_closed() {
        let (mut unlock, mut authority) = hydrated_runtimes();

        let mut port = RecordingMaterialPort::valid();

        port.capability_result = Err(TvOperationalMaterialPortError::PlatformUnsealFailed);

        assert_eq!(
            unlock.unlock_after_native_pin(
                TvNativePinPromptResult::Accepted,
                NOW_MS,
                &mut authority,
                &mut port,
            ),
            Err(TvOperationalUnlockError::CapabilityUnsealFailed,),
        );

        assert_eq!(port.device_calls, 1,);

        assert_eq!(port.capability_calls, 1,);

        assert!(!unlock.operational_material_present(),);

        assert!(!authority.snapshot().operationally_unlocked,);
    }

    #[test]
    fn phase16e3a_lock_clears_operational_material_and_authority() {
        let (mut unlock, mut authority) = hydrated_runtimes();

        let mut port = RecordingMaterialPort::valid();

        unlock
            .unlock_after_native_pin(
                TvNativePinPromptResult::Accepted,
                NOW_MS,
                &mut authority,
                &mut port,
            )
            .expect("valid native materials should unlock");

        let locked = unlock.lock(TvLifecycleLockReason::Background, &mut authority);

        assert!(!locked.operationally_unlocked,);

        assert!(!locked.device_proof_available,);

        assert!(!locked.operational_material_present,);

        assert!(!unlock.operational_material_present(),);

        let authority_snapshot = authority.snapshot();

        assert!(!authority_snapshot.operationally_unlocked,);

        assert!(!authority_snapshot.device_proof_available,);

        assert!(!authority_snapshot.session_present,);
    }
}
