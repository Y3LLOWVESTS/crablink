//! RO:WHAT — Holds one short-lived server-issued Native Passport capability in native process memory.
//! RO:WHY — Username/request-proof work needs the issued capability without ever returning capability material to React or persisting bearer-like authority to disk.
//! RO:INTERACTS — `passport_capability_http_runtime`, AppState, canonical `NativePassportDeviceBoundCapabilityV1`, and later request-proof/username mutation.
//! RO:INVARIANTS — memory only; structurally valid and unexpired capabilities only; expired entries are rejected/removed; replacement is atomic under one short synchronous lock.
//! RO:METRICS — none.
//! RO:CONFIG — capability expiry comes exclusively from the server-issued canonical DTO.
//! RO:SECURITY — no serialization, filesystem persistence, logs, WebView export, DeviceKey, RecoveryRoot, PIN, wallet, or ledger authority.
//! RO:TEST — unit tests below verify valid storage, expiry eviction, and explicit clear.

#![forbid(unsafe_code)]

use std::sync::Mutex;

use ron_proto::NativePassportDeviceBoundCapabilityV1;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DesktopCapabilitySessionState {
    Absent,
    Present,
    Expired,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[non_exhaustive]
pub enum DesktopCapabilitySessionError {
    SessionLockUnavailable,
    CapabilityInvalid,
    CapabilityExpired,
}

#[derive(Debug, Default)]
pub struct DesktopCapabilitySessionStore {
    inner: Mutex<Option<NativePassportDeviceBoundCapabilityV1>>,
}

impl DesktopCapabilitySessionStore {
    /// Replace the current native-only capability with one already verified
    /// against the current Passport/device/challenge transaction.
    ///
    /// # Errors
    ///
    /// Rejects structurally invalid or already-expired capabilities and fails
    /// closed if the in-memory session lock is poisoned.
    pub fn replace(
        &self,
        capability: NativePassportDeviceBoundCapabilityV1,
        now_ms: u64,
    ) -> Result<(), DesktopCapabilitySessionError> {
        capability
            .validate()
            .map_err(|_| DesktopCapabilitySessionError::CapabilityInvalid)?;

        if now_ms == 0 || capability.expires_at_ms <= now_ms {
            return Err(DesktopCapabilitySessionError::CapabilityExpired);
        }

        let mut guard = self
            .inner
            .lock()
            .map_err(|_| DesktopCapabilitySessionError::SessionLockUnavailable)?;

        *guard = Some(capability);

        Ok(())
    }

    /// Return a clone of the active native capability.
    ///
    /// Expired material is removed before returning.
    ///
    /// # Errors
    ///
    /// Fails closed if the in-memory session lock is poisoned.
    pub fn load_active(
        &self,
        now_ms: u64,
    ) -> Result<Option<NativePassportDeviceBoundCapabilityV1>, DesktopCapabilitySessionError> {
        let mut guard = self
            .inner
            .lock()
            .map_err(|_| DesktopCapabilitySessionError::SessionLockUnavailable)?;

        let Some(capability) = guard.as_ref() else {
            return Ok(None);
        };

        if now_ms == 0 || capability.expires_at_ms <= now_ms {
            *guard = None;
            return Ok(None);
        }

        Ok(guard.clone())
    }

    /// Inspect redacted capability state without exposing capability material.
    ///
    /// # Errors
    ///
    /// Fails closed if the in-memory session lock is poisoned.
    pub fn state(
        &self,
        now_ms: u64,
    ) -> Result<DesktopCapabilitySessionState, DesktopCapabilitySessionError> {
        let mut guard = self
            .inner
            .lock()
            .map_err(|_| DesktopCapabilitySessionError::SessionLockUnavailable)?;

        let Some(capability) = guard.as_ref() else {
            return Ok(DesktopCapabilitySessionState::Absent);
        };

        if now_ms == 0 || capability.expires_at_ms <= now_ms {
            *guard = None;
            return Ok(DesktopCapabilitySessionState::Expired);
        }

        Ok(DesktopCapabilitySessionState::Present)
    }

    /// Remove all temporary capability authority.
    ///
    /// # Errors
    ///
    /// Fails closed if the in-memory session lock is poisoned.
    pub fn clear(&self) -> Result<(), DesktopCapabilitySessionError> {
        let mut guard = self
            .inner
            .lock()
            .map_err(|_| DesktopCapabilitySessionError::SessionLockUnavailable)?;

        *guard = None;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use ron_proto::{
        CapabilityIdV1, DeviceIdV1, NativePassportContextLabelV1,
        NativePassportDeviceBoundCapabilityV1, NativePassportScopeV1, PassportIdV1,
        NATIVE_PASSPORT_DEVICE_BOUND_CAPABILITY_V1_VERSION,
    };

    use super::{DesktopCapabilitySessionState, DesktopCapabilitySessionStore};

    fn capability() -> NativePassportDeviceBoundCapabilityV1 {
        NativePassportDeviceBoundCapabilityV1 {
            version:
                NATIVE_PASSPORT_DEVICE_BOUND_CAPABILITY_V1_VERSION,
            capability_id: CapabilityIdV1::parse(
                "capability:v1:b3:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            )
            .expect("capability ID"),
            passport_id: PassportIdV1::parse(
                "passport:v1:main:ed25519:b3:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            )
            .expect("Passport ID"),
            device_id: DeviceIdV1::parse(
                "device:v1:ed25519:b3:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
            )
            .expect("Device ID"),
            audience:
                NativePassportContextLabelV1::parse("svc-passport")
                    .expect("audience"),
            environment:
                NativePassportContextLabelV1::parse("private-beta")
                    .expect("environment"),
            scopes: vec![
                NativePassportScopeV1::parse("identity.read")
                    .expect("read"),
                NativePassportScopeV1::parse("identity.username.claim")
                    .expect("username claim"),
            ],
            issued_at_ms: 1_000,
            expires_at_ms: 4_000,
            policy_version: 1,
            root_key_epoch: Some(0),
        }
    }

    #[test]
    fn valid_capability_is_memory_only_and_expiry_evicts_it() {
        let store = DesktopCapabilitySessionStore::default();

        assert_eq!(
            store.state(1_500).expect("empty state"),
            DesktopCapabilitySessionState::Absent,
        );

        store
            .replace(capability(), 1_500)
            .expect("store capability");

        assert_eq!(
            store.state(2_000).expect("present state"),
            DesktopCapabilitySessionState::Present,
        );

        assert!(store
            .load_active(2_000)
            .expect("active capability")
            .is_some(),);

        assert_eq!(
            store.state(4_000).expect("expired state"),
            DesktopCapabilitySessionState::Expired,
        );

        assert!(store
            .load_active(4_000)
            .expect("expired capability removed")
            .is_none(),);
    }

    #[test]
    fn explicit_clear_removes_temporary_authority() {
        let store = DesktopCapabilitySessionStore::default();

        store
            .replace(capability(), 1_500)
            .expect("store capability");

        store.clear().expect("clear");

        assert_eq!(
            store.state(2_000).expect("state"),
            DesktopCapabilitySessionState::Absent,
        );
    }
}
