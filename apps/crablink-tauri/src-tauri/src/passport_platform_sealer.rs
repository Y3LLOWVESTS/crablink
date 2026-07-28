//! RO:WHAT — Implements the macOS Native Passport PlatformSealer through Keychain generic-password entries.
//! RO:WHY — Phase 15L binds recovery-root and device-key material to macOS without exposing it to the vault or WebView.
//! RO:INTERACTS — svc-passport NativePlatformSealer, Apple Security Framework, and future desktop Passport runtime wiring.
//! RO:INVARIANTS — fixed service and compartment accounts; secret bytes enter Keychain only; sealed output is a non-secret fixed reference; backend errors are redacted.
//! RO:SECURITY — no secret logging, serialization, filesystem storage, WebView DTO, PIN handling, vault decryption, signing, capability issuance, wallet, or ledger mutation.
//! RO:TEST — module tests plus tests/phase15l_macos_keychain_platform_sealer.rs.

use std::{fmt, sync::Arc};

use security_framework::passwords::{generic_password, set_generic_password, PasswordOptions};
use svc_passport::native::{
    NativePlatformFamily, NativePlatformSealer, NativePlatformStorageError,
    NativePlatformStorageOperation, NativeSealedMaterialV1, NativeSecretBytes,
    NativeSecureCompartment,
};

pub const NATIVE_PASSPORT_PHASE15L_LABEL: &str =
    "NATIVE_PASSPORT_PHASE15L_MACOS_KEYCHAIN_PLATFORM_SEALER_ADAPTER";

pub const PHASE15L_KEYCHAIN_SERVICE: &str = "com.rustyonions.crablink.native-passport.v1";

pub const PHASE15L_RECOVERY_ROOT_ACCOUNT: &str = "recovery-root";

pub const PHASE15L_DEVICE_KEY_ACCOUNT: &str = "device-key";

const PHASE15L_RECOVERY_ROOT_REFERENCE: &[u8] = b"crablink-keychain:v1:recovery-root";

const PHASE15L_DEVICE_KEY_REFERENCE: &[u8] = b"crablink-keychain:v1:device-key";

trait MacosKeychainBackend: Send + Sync {
    fn set_secret(&self, service: &str, account: &str, secret: &[u8]) -> Result<(), ()>;

    fn get_secret(&self, service: &str, account: &str) -> Result<Vec<u8>, ()>;
}

#[derive(Debug, Default)]
struct SystemMacosKeychainBackend;

impl MacosKeychainBackend for SystemMacosKeychainBackend {
    fn set_secret(&self, service: &str, account: &str, secret: &[u8]) -> Result<(), ()> {
        set_generic_password(service, account, secret).map_err(|_| ())
    }

    fn get_secret(&self, service: &str, account: &str) -> Result<Vec<u8>, ()> {
        generic_password(PasswordOptions::new_generic_password(service, account)).map_err(|_| ())
    }
}

#[derive(Clone)]
pub struct MacosKeychainPlatformSealer {
    backend: Arc<dyn MacosKeychainBackend>,
}

impl MacosKeychainPlatformSealer {
    pub fn new() -> Self {
        Self {
            backend: Arc::new(SystemMacosKeychainBackend),
        }
    }

    #[cfg(test)]
    fn with_backend(backend: Arc<dyn MacosKeychainBackend>) -> Self {
        Self { backend }
    }
}

impl Default for MacosKeychainPlatformSealer {
    fn default() -> Self {
        Self::new()
    }
}

impl fmt::Debug for MacosKeychainPlatformSealer {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("MacosKeychainPlatformSealer")
            .field("platform_family", &NativePlatformFamily::MacosKeychain)
            .field("service", &PHASE15L_KEYCHAIN_SERVICE)
            .field("backend", &"REDACTED")
            .finish()
    }
}

impl NativePlatformSealer for MacosKeychainPlatformSealer {
    fn platform_family(&self) -> NativePlatformFamily {
        NativePlatformFamily::MacosKeychain
    }

    fn seal(
        &self,
        compartment: NativeSecureCompartment,
        secret: &NativeSecretBytes,
    ) -> Result<NativeSealedMaterialV1, NativePlatformStorageError> {
        let account = keychain_account(compartment);

        let reference = keychain_reference(compartment);

        let sealed = NativeSealedMaterialV1::new(
            NativePlatformFamily::MacosKeychain,
            compartment,
            reference.to_vec(),
        )?;

        self.backend
            .set_secret(PHASE15L_KEYCHAIN_SERVICE, account, secret.as_slice())
            .map_err(|_| backend_failure(NativePlatformStorageOperation::Seal))?;

        Ok(sealed)
    }

    fn unseal(
        &self,
        sealed: &NativeSealedMaterialV1,
    ) -> Result<NativeSecretBytes, NativePlatformStorageError> {
        sealed.validate()?;

        if sealed.platform_family != NativePlatformFamily::MacosKeychain {
            return Err(NativePlatformStorageError::PlatformFamilyMismatch {
                expected: NativePlatformFamily::MacosKeychain,
                actual: sealed.platform_family,
            });
        }

        let expected_reference = keychain_reference(sealed.compartment);

        if sealed.as_slice() != expected_reference {
            return Err(backend_failure(NativePlatformStorageOperation::Unseal));
        }

        let account = keychain_account(sealed.compartment);

        let secret = self
            .backend
            .get_secret(PHASE15L_KEYCHAIN_SERVICE, account)
            .map_err(|_| backend_failure(NativePlatformStorageOperation::Unseal))?;

        NativeSecretBytes::new(secret)
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MacosKeychainPlatformSealerPosture {
    pub phase_label: &'static str,
    pub platform_family: NativePlatformFamily,
    pub apple_security_framework_used: bool,
    pub generic_password_storage_used: bool,
    pub fixed_service_identifier: bool,
    pub separate_compartment_accounts: bool,
    pub keychain_entry_create_or_update: bool,
    pub keychain_entry_read: bool,
    pub sealed_output_is_reference_only: bool,
    pub backend_errors_redacted: bool,
    pub app_state_wired: bool,
    pub vault_decryption_added: bool,
    pub pin_unlock_added: bool,
    pub root_confirmation_added: bool,
    pub frontend_secret_custody_added: bool,
    pub capability_issuance_added: bool,
    pub wallet_or_ledger_mutation_added: bool,
}

pub fn macos_keychain_platform_sealer_posture() -> MacosKeychainPlatformSealerPosture {
    MacosKeychainPlatformSealerPosture {
        phase_label: NATIVE_PASSPORT_PHASE15L_LABEL,
        platform_family: NativePlatformFamily::MacosKeychain,
        apple_security_framework_used: true,
        generic_password_storage_used: true,
        fixed_service_identifier: true,
        separate_compartment_accounts: true,
        keychain_entry_create_or_update: true,
        keychain_entry_read: true,
        sealed_output_is_reference_only: true,
        backend_errors_redacted: true,
        app_state_wired: false,
        vault_decryption_added: false,
        pin_unlock_added: false,
        root_confirmation_added: false,
        frontend_secret_custody_added: false,
        capability_issuance_added: false,
        wallet_or_ledger_mutation_added: false,
    }
}

fn keychain_account(compartment: NativeSecureCompartment) -> &'static str {
    match compartment {
        NativeSecureCompartment::RecoveryRoot => PHASE15L_RECOVERY_ROOT_ACCOUNT,
        NativeSecureCompartment::DeviceKey => PHASE15L_DEVICE_KEY_ACCOUNT,
    }
}

fn keychain_reference(compartment: NativeSecureCompartment) -> &'static [u8] {
    match compartment {
        NativeSecureCompartment::RecoveryRoot => PHASE15L_RECOVERY_ROOT_REFERENCE,
        NativeSecureCompartment::DeviceKey => PHASE15L_DEVICE_KEY_REFERENCE,
    }
}

fn backend_failure(operation: NativePlatformStorageOperation) -> NativePlatformStorageError {
    NativePlatformStorageError::BackendFailure { operation }
}

#[cfg(test)]
mod tests {
    use std::{
        collections::HashMap,
        sync::{Arc, Mutex},
    };

    use super::*;
    use svc_passport::native::{seal_native_secret, unseal_native_secret};

    #[derive(Debug, Default)]
    struct MemoryKeychainBackend {
        entries: Mutex<HashMap<String, Vec<u8>>>,
        fail_set: bool,
        fail_get: bool,
    }

    impl MemoryKeychainBackend {
        fn key(service: &str, account: &str) -> String {
            format!("{service}\0{account}")
        }
    }

    impl MacosKeychainBackend for MemoryKeychainBackend {
        fn set_secret(&self, service: &str, account: &str, secret: &[u8]) -> Result<(), ()> {
            if self.fail_set {
                return Err(());
            }

            self.entries
                .lock()
                .expect("memory keychain lock")
                .insert(Self::key(service, account), secret.to_vec());

            Ok(())
        }

        fn get_secret(&self, service: &str, account: &str) -> Result<Vec<u8>, ()> {
            if self.fail_get {
                return Err(());
            }

            self.entries
                .lock()
                .expect("memory keychain lock")
                .get(&Self::key(service, account))
                .cloned()
                .ok_or(())
        }
    }

    #[test]
    fn phase15l_round_trips_both_compartments() {
        let sealer =
            MacosKeychainPlatformSealer::with_backend(Arc::new(MemoryKeychainBackend::default()));

        for (compartment, secret_material) in [
            (
                NativeSecureCompartment::RecoveryRoot,
                b"phase15l-recovery-root".as_slice(),
            ),
            (
                NativeSecureCompartment::DeviceKey,
                b"phase15l-device-key".as_slice(),
            ),
        ] {
            let secret = NativeSecretBytes::new(secret_material.to_vec()).expect("bounded secret");

            let sealed = seal_native_secret(
                &sealer,
                NativePlatformFamily::MacosKeychain,
                compartment,
                &secret,
            )
            .expect("Keychain seal");

            assert_ne!(sealed.as_slice(), secret_material);

            let unsealed = unseal_native_secret(
                &sealer,
                NativePlatformFamily::MacosKeychain,
                compartment,
                &sealed,
            )
            .expect("Keychain unseal");

            assert_eq!(unsealed.as_slice(), secret_material);
        }
    }

    #[test]
    fn phase15l_compartment_entries_are_independent() {
        let sealer =
            MacosKeychainPlatformSealer::with_backend(Arc::new(MemoryKeychainBackend::default()));

        let root_secret = NativeSecretBytes::new(b"root-secret".to_vec()).expect("root secret");

        let device_secret =
            NativeSecretBytes::new(b"device-secret".to_vec()).expect("device secret");

        let root_sealed = sealer
            .seal(NativeSecureCompartment::RecoveryRoot, &root_secret)
            .expect("seal root");

        let device_sealed = sealer
            .seal(NativeSecureCompartment::DeviceKey, &device_secret)
            .expect("seal device");

        assert_ne!(root_sealed.as_slice(), device_sealed.as_slice());

        assert_eq!(
            sealer.unseal(&root_sealed).expect("unseal root").as_slice(),
            b"root-secret"
        );

        assert_eq!(
            sealer
                .unseal(&device_sealed)
                .expect("unseal device")
                .as_slice(),
            b"device-secret"
        );
    }

    #[test]
    fn phase15l_rejects_reference_and_platform_drift() {
        let sealer =
            MacosKeychainPlatformSealer::with_backend(Arc::new(MemoryKeychainBackend::default()));

        let wrong_reference = NativeSealedMaterialV1::new(
            NativePlatformFamily::MacosKeychain,
            NativeSecureCompartment::DeviceKey,
            b"wrong-reference".to_vec(),
        )
        .expect("wrong-reference fixture");

        assert_eq!(
            sealer.unseal(&wrong_reference),
            Err(NativePlatformStorageError::BackendFailure {
                operation: NativePlatformStorageOperation::Unseal,
            })
        );

        let wrong_platform = NativeSealedMaterialV1::new(
            NativePlatformFamily::WindowsDpapi,
            NativeSecureCompartment::DeviceKey,
            PHASE15L_DEVICE_KEY_REFERENCE.to_vec(),
        )
        .expect("wrong-platform fixture");

        assert_eq!(
            sealer.unseal(&wrong_platform),
            Err(NativePlatformStorageError::PlatformFamilyMismatch {
                expected: NativePlatformFamily::MacosKeychain,
                actual: NativePlatformFamily::WindowsDpapi,
            })
        );
    }

    #[test]
    fn phase15l_redacts_backend_failures_and_debug() {
        let failing_set =
            MacosKeychainPlatformSealer::with_backend(Arc::new(MemoryKeychainBackend {
                fail_set: true,
                ..Default::default()
            }));

        let secret = NativeSecretBytes::new(b"must-not-appear".to_vec()).expect("secret");

        assert_eq!(
            failing_set.seal(NativeSecureCompartment::DeviceKey, &secret,),
            Err(NativePlatformStorageError::BackendFailure {
                operation: NativePlatformStorageOperation::Seal,
            })
        );

        let debug = format!("{failing_set:?}");

        assert!(debug.contains("REDACTED"));
        assert!(!debug.contains("must-not-appear"));
    }
}
