//! RO:WHAT — Implements the Windows Native Passport PlatformSealer through current-user DPAPI.
//! RO:WHY — Phase 15M binds recovery-root and device-key material to the Windows user and computer without exposing plaintext to the vault or WebView.
//! RO:INTERACTS — svc-passport NativePlatformSealer, CryptProtectData, CryptUnprotectData, LocalFree, and future desktop Passport runtime wiring.
//! RO:INVARIANTS — current-user scope only; UI forbidden; separate fixed entropy per compartment; DPAPI buffers are copied, cleared, and freed; errors remain redacted.
//! RO:SECURITY — no machine-wide DPAPI flag, secret logging, serialization, filesystem storage, WebView DTO, PIN handling, vault parsing, signing, capability issuance, wallet, or ledger mutation.
//! RO:TEST — deterministic backend unit tests plus tests/phase15m_windows_dpapi_platform_sealer.rs.

use std::{fmt, sync::Arc};

use svc_passport::native::{
    NativePlatformFamily, NativePlatformSealer, NativePlatformStorageError,
    NativePlatformStorageOperation, NativeSealedMaterialV1, NativeSecretBytes,
    NativeSecureCompartment,
};

#[cfg(target_os = "windows")]
use std::ptr::{null, null_mut};

#[cfg(target_os = "windows")]
use windows_sys::Win32::{
    Foundation::LocalFree,
    Security::Cryptography::{
        CryptProtectData, CryptUnprotectData, CRYPTPROTECT_UI_FORBIDDEN, CRYPT_INTEGER_BLOB,
    },
};

pub const NATIVE_PASSPORT_PHASE15M_LABEL: &str =
    "NATIVE_PASSPORT_PHASE15M_WINDOWS_DPAPI_PLATFORM_SEALER_ADAPTER";

#[cfg(target_os = "windows")]
const PHASE15M_RECOVERY_ROOT_ENTROPY: &[u8] =
    b"crablink-native-passport:v1:windows-dpapi:recovery-root";

#[cfg(target_os = "windows")]
const PHASE15M_DEVICE_KEY_ENTROPY: &[u8] = b"crablink-native-passport:v1:windows-dpapi:device-key";

trait WindowsDpapiBackend: Send + Sync {
    fn protect(
        &self,
        compartment: NativeSecureCompartment,
        plaintext: &[u8],
    ) -> Result<Vec<u8>, ()>;

    fn unprotect(
        &self,
        compartment: NativeSecureCompartment,
        protected: &[u8],
    ) -> Result<Vec<u8>, ()>;
}

#[cfg(target_os = "windows")]
#[derive(Debug, Default)]
struct SystemWindowsDpapiBackend;

#[cfg(target_os = "windows")]
impl WindowsDpapiBackend for SystemWindowsDpapiBackend {
    fn protect(
        &self,
        compartment: NativeSecureCompartment,
        plaintext: &[u8],
    ) -> Result<Vec<u8>, ()> {
        let mut input = dpapi_blob(plaintext)?;
        let mut entropy = dpapi_blob(compartment_entropy(compartment))?;
        let mut output = empty_dpapi_blob();

        // SAFETY: input and entropy point to valid slices for the duration of the call.
        // The output structure is initialized and its allocated buffer is handled below.
        let result = unsafe {
            CryptProtectData(
                &mut input,
                null(),
                &mut entropy,
                null(),
                null(),
                CRYPTPROTECT_UI_FORBIDDEN,
                &mut output,
            )
        };

        if result == 0 {
            unsafe {
                release_dpapi_blob(&mut output);
            }

            return Err(());
        }

        unsafe { take_dpapi_blob(&mut output) }
    }

    fn unprotect(
        &self,
        compartment: NativeSecureCompartment,
        protected: &[u8],
    ) -> Result<Vec<u8>, ()> {
        let mut input = dpapi_blob(protected)?;
        let mut entropy = dpapi_blob(compartment_entropy(compartment))?;
        let mut output = empty_dpapi_blob();

        // SAFETY: input and entropy point to valid slices for the duration of the call.
        // No description or UI is requested. The allocated output is handled below.
        let result = unsafe {
            CryptUnprotectData(
                &mut input,
                null_mut(),
                &mut entropy,
                null(),
                null(),
                CRYPTPROTECT_UI_FORBIDDEN,
                &mut output,
            )
        };

        if result == 0 {
            unsafe {
                release_dpapi_blob(&mut output);
            }

            return Err(());
        }

        unsafe { take_dpapi_blob(&mut output) }
    }
}

#[derive(Clone)]
pub struct WindowsDpapiPlatformSealer {
    backend: Arc<dyn WindowsDpapiBackend>,
}

impl WindowsDpapiPlatformSealer {
    #[cfg(target_os = "windows")]
    pub fn new() -> Self {
        Self {
            backend: Arc::new(SystemWindowsDpapiBackend),
        }
    }

    #[cfg(test)]
    fn with_backend(backend: Arc<dyn WindowsDpapiBackend>) -> Self {
        Self { backend }
    }
}

#[cfg(target_os = "windows")]
impl Default for WindowsDpapiPlatformSealer {
    fn default() -> Self {
        Self::new()
    }
}

impl fmt::Debug for WindowsDpapiPlatformSealer {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("WindowsDpapiPlatformSealer")
            .field("platform_family", &NativePlatformFamily::WindowsDpapi)
            .field("scope", &"CURRENT_USER")
            .field("backend", &"REDACTED")
            .finish()
    }
}

impl NativePlatformSealer for WindowsDpapiPlatformSealer {
    fn platform_family(&self) -> NativePlatformFamily {
        NativePlatformFamily::WindowsDpapi
    }

    fn seal(
        &self,
        compartment: NativeSecureCompartment,
        secret: &NativeSecretBytes,
    ) -> Result<NativeSealedMaterialV1, NativePlatformStorageError> {
        let protected = self
            .backend
            .protect(compartment, secret.as_slice())
            .map_err(|_| backend_failure(NativePlatformStorageOperation::Seal))?;

        NativeSealedMaterialV1::new(NativePlatformFamily::WindowsDpapi, compartment, protected)
    }

    fn unseal(
        &self,
        sealed: &NativeSealedMaterialV1,
    ) -> Result<NativeSecretBytes, NativePlatformStorageError> {
        sealed.validate()?;

        if sealed.platform_family != NativePlatformFamily::WindowsDpapi {
            return Err(NativePlatformStorageError::PlatformFamilyMismatch {
                expected: NativePlatformFamily::WindowsDpapi,
                actual: sealed.platform_family,
            });
        }

        let plaintext = self
            .backend
            .unprotect(sealed.compartment, sealed.as_slice())
            .map_err(|_| backend_failure(NativePlatformStorageOperation::Unseal))?;

        NativeSecretBytes::new(plaintext)
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct WindowsDpapiPlatformSealerPosture {
    pub phase_label: &'static str,
    pub platform_family: NativePlatformFamily,
    pub crypt_protect_data_used: bool,
    pub crypt_unprotect_data_used: bool,
    pub current_user_scope: bool,
    pub local_machine_scope: bool,
    pub ui_forbidden: bool,
    pub compartment_entropy_binding: bool,
    pub dpapi_integrity_check: bool,
    pub os_allocated_buffers_freed: bool,
    pub os_allocated_plaintext_cleared_before_free: bool,
    pub backend_errors_redacted: bool,
    pub app_state_wired: bool,
    pub vault_parsing_added: bool,
    pub pin_unlock_added: bool,
    pub root_confirmation_added: bool,
    pub frontend_secret_custody_added: bool,
    pub capability_issuance_added: bool,
    pub wallet_or_ledger_mutation_added: bool,
}

pub fn windows_dpapi_platform_sealer_posture() -> WindowsDpapiPlatformSealerPosture {
    WindowsDpapiPlatformSealerPosture {
        phase_label: NATIVE_PASSPORT_PHASE15M_LABEL,
        platform_family: NativePlatformFamily::WindowsDpapi,
        crypt_protect_data_used: true,
        crypt_unprotect_data_used: true,
        current_user_scope: true,
        local_machine_scope: false,
        ui_forbidden: true,
        compartment_entropy_binding: true,
        dpapi_integrity_check: true,
        os_allocated_buffers_freed: true,
        os_allocated_plaintext_cleared_before_free: true,
        backend_errors_redacted: true,
        app_state_wired: false,
        vault_parsing_added: false,
        pin_unlock_added: false,
        root_confirmation_added: false,
        frontend_secret_custody_added: false,
        capability_issuance_added: false,
        wallet_or_ledger_mutation_added: false,
    }
}

fn backend_failure(operation: NativePlatformStorageOperation) -> NativePlatformStorageError {
    NativePlatformStorageError::BackendFailure { operation }
}

#[cfg(target_os = "windows")]
fn compartment_entropy(compartment: NativeSecureCompartment) -> &'static [u8] {
    match compartment {
        NativeSecureCompartment::RecoveryRoot => PHASE15M_RECOVERY_ROOT_ENTROPY,
        NativeSecureCompartment::DeviceKey => PHASE15M_DEVICE_KEY_ENTROPY,
    }
}

#[cfg(target_os = "windows")]
fn dpapi_blob(bytes: &[u8]) -> Result<CRYPT_INTEGER_BLOB, ()> {
    let length = u32::try_from(bytes.len()).map_err(|_| ())?;

    Ok(CRYPT_INTEGER_BLOB {
        cbData: length,
        pbData: bytes.as_ptr().cast_mut(),
    })
}

#[cfg(target_os = "windows")]
fn empty_dpapi_blob() -> CRYPT_INTEGER_BLOB {
    CRYPT_INTEGER_BLOB {
        cbData: 0,
        pbData: null_mut(),
    }
}

#[cfg(target_os = "windows")]
unsafe fn take_dpapi_blob(blob: &mut CRYPT_INTEGER_BLOB) -> Result<Vec<u8>, ()> {
    if blob.pbData.is_null() || blob.cbData == 0 {
        release_dpapi_blob(blob);
        return Err(());
    }

    let length = usize::try_from(blob.cbData).map_err(|_| ())?;

    let mut copied = std::slice::from_raw_parts(blob.pbData, length).to_vec();

    std::ptr::write_bytes(blob.pbData, 0, length);

    let remaining_handle = LocalFree(blob.pbData.cast());

    blob.cbData = 0;
    blob.pbData = null_mut();

    if !remaining_handle.is_null() {
        copied.fill(0);
        return Err(());
    }

    Ok(copied)
}

#[cfg(target_os = "windows")]
unsafe fn release_dpapi_blob(blob: &mut CRYPT_INTEGER_BLOB) {
    if !blob.pbData.is_null() {
        let length = usize::try_from(blob.cbData).unwrap_or(0);

        if length != 0 {
            std::ptr::write_bytes(blob.pbData, 0, length);
        }

        let _ = LocalFree(blob.pbData.cast());
    }

    blob.cbData = 0;
    blob.pbData = null_mut();
}

#[cfg(test)]
mod tests {
    use std::sync::Arc;

    use super::*;
    use svc_passport::native::{seal_native_secret, unseal_native_secret};

    #[derive(Debug, Default)]
    struct MemoryWindowsDpapiBackend {
        fail_protect: bool,
        fail_unprotect: bool,
    }

    impl MemoryWindowsDpapiBackend {
        fn compartment_tag(compartment: NativeSecureCompartment) -> u8 {
            match compartment {
                NativeSecureCompartment::RecoveryRoot => 0x51,
                NativeSecureCompartment::DeviceKey => 0xA7,
            }
        }
    }

    impl WindowsDpapiBackend for MemoryWindowsDpapiBackend {
        fn protect(
            &self,
            compartment: NativeSecureCompartment,
            plaintext: &[u8],
        ) -> Result<Vec<u8>, ()> {
            if self.fail_protect {
                return Err(());
            }

            let tag = Self::compartment_tag(compartment);
            let mut protected = Vec::with_capacity(plaintext.len() + 1);

            protected.push(tag);
            protected.extend(plaintext.iter().map(|byte| byte ^ tag));

            Ok(protected)
        }

        fn unprotect(
            &self,
            compartment: NativeSecureCompartment,
            protected: &[u8],
        ) -> Result<Vec<u8>, ()> {
            if self.fail_unprotect || protected.is_empty() {
                return Err(());
            }

            let tag = Self::compartment_tag(compartment);

            if protected.first() != Some(&tag) {
                return Err(());
            }

            Ok(protected[1..].iter().map(|byte| byte ^ tag).collect())
        }
    }

    #[test]
    fn phase15m_round_trips_both_compartments() {
        let sealer = WindowsDpapiPlatformSealer::with_backend(Arc::new(
            MemoryWindowsDpapiBackend::default(),
        ));

        for (compartment, secret_material) in [
            (
                NativeSecureCompartment::RecoveryRoot,
                b"phase15m-recovery-root".as_slice(),
            ),
            (
                NativeSecureCompartment::DeviceKey,
                b"phase15m-device-key".as_slice(),
            ),
        ] {
            let secret = NativeSecretBytes::new(secret_material.to_vec()).expect("bounded secret");

            let sealed = seal_native_secret(
                &sealer,
                NativePlatformFamily::WindowsDpapi,
                compartment,
                &secret,
            )
            .expect("DPAPI protect");

            assert_ne!(sealed.as_slice(), secret_material);
            assert_eq!(sealed.platform_family, NativePlatformFamily::WindowsDpapi);
            assert_eq!(sealed.compartment, compartment);

            let unsealed = unseal_native_secret(
                &sealer,
                NativePlatformFamily::WindowsDpapi,
                compartment,
                &sealed,
            )
            .expect("DPAPI unprotect");

            assert_eq!(unsealed.as_slice(), secret_material);
        }
    }

    #[test]
    fn phase15m_compartment_entropy_isolation_rejects_cross_use() {
        let sealer = WindowsDpapiPlatformSealer::with_backend(Arc::new(
            MemoryWindowsDpapiBackend::default(),
        ));

        let secret = NativeSecretBytes::new(b"device-secret".to_vec()).expect("device secret");

        let sealed = sealer
            .seal(NativeSecureCompartment::DeviceKey, &secret)
            .expect("protect device secret");

        let drifted = NativeSealedMaterialV1::new(
            NativePlatformFamily::WindowsDpapi,
            NativeSecureCompartment::RecoveryRoot,
            sealed.as_slice().to_vec(),
        )
        .expect("drifted fixture");

        assert_eq!(
            sealer.unseal(&drifted),
            Err(NativePlatformStorageError::BackendFailure {
                operation: NativePlatformStorageOperation::Unseal,
            })
        );
    }

    #[test]
    fn phase15m_rejects_platform_drift() {
        let sealer = WindowsDpapiPlatformSealer::with_backend(Arc::new(
            MemoryWindowsDpapiBackend::default(),
        ));

        let sealed = NativeSealedMaterialV1::new(
            NativePlatformFamily::MacosKeychain,
            NativeSecureCompartment::DeviceKey,
            b"protected-material".to_vec(),
        )
        .expect("wrong-platform fixture");

        assert_eq!(
            sealer.unseal(&sealed),
            Err(NativePlatformStorageError::PlatformFamilyMismatch {
                expected: NativePlatformFamily::WindowsDpapi,
                actual: NativePlatformFamily::MacosKeychain,
            })
        );
    }

    #[test]
    fn phase15m_redacts_backend_failures_and_debug() {
        let sealer =
            WindowsDpapiPlatformSealer::with_backend(Arc::new(MemoryWindowsDpapiBackend {
                fail_protect: true,
                fail_unprotect: false,
            }));

        let secret = NativeSecretBytes::new(b"must-not-appear".to_vec()).expect("secret");

        assert_eq!(
            sealer.seal(NativeSecureCompartment::DeviceKey, &secret),
            Err(NativePlatformStorageError::BackendFailure {
                operation: NativePlatformStorageOperation::Seal,
            })
        );

        let debug = format!("{sealer:?}");

        assert!(debug.contains("REDACTED"));
        assert!(debug.contains("CURRENT_USER"));
        assert!(!debug.contains("must-not-appear"));
    }

    #[test]
    fn phase15m_posture_is_current_user_and_runtime_bounded() {
        let posture = windows_dpapi_platform_sealer_posture();

        assert_eq!(posture.phase_label, NATIVE_PASSPORT_PHASE15M_LABEL);
        assert_eq!(posture.platform_family, NativePlatformFamily::WindowsDpapi);
        assert!(posture.crypt_protect_data_used);
        assert!(posture.crypt_unprotect_data_used);
        assert!(posture.current_user_scope);
        assert!(!posture.local_machine_scope);
        assert!(posture.ui_forbidden);
        assert!(posture.compartment_entropy_binding);
        assert!(posture.dpapi_integrity_check);
        assert!(posture.os_allocated_buffers_freed);
        assert!(posture.os_allocated_plaintext_cleared_before_free);
        assert!(posture.backend_errors_redacted);

        assert!(!posture.app_state_wired);
        assert!(!posture.vault_parsing_added);
        assert!(!posture.pin_unlock_added);
        assert!(!posture.root_confirmation_added);
        assert!(!posture.frontend_secret_custody_added);
        assert!(!posture.capability_issuance_added);
        assert!(!posture.wallet_or_ledger_mutation_added);
    }
}
