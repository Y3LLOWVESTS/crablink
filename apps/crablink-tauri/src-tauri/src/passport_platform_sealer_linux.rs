//! RO:WHAT — Implements the Linux Native Passport PlatformSealer through the FreeDesktop Secret Service.
//! RO:WHY — Phase 15N binds recovery-root and device-key material to the Linux desktop secret store without exposing plaintext to the vault or WebView.
//! RO:INTERACTS — svc-passport NativePlatformSealer, Secret Service over the user session bus, and future desktop Passport runtime wiring.
//! RO:INVARIANTS — encrypted DH sessions; default collection; fixed attributes and labels; one item per compartment; sealed output is a non-secret reference; ambiguous searches fail closed.
//! RO:SECURITY — no secret logging, serialization, filesystem storage, WebView DTO, PIN handling, vault parsing, signing, capability issuance, wallet, or ledger mutation.
//! RO:TEST — deterministic backend unit tests plus tests/phase15n_linux_secret_service_platform_sealer.rs.

use std::{fmt, sync::Arc};

#[cfg(any(target_os = "linux", test))]
use std::collections::HashMap;

#[cfg(any(target_os = "linux", test))]
use secret_service::{blocking::SecretService, EncryptionType};

use svc_passport::native::{
    NativePlatformFamily, NativePlatformSealer, NativePlatformStorageError,
    NativePlatformStorageOperation, NativeSealedMaterialV1, NativeSecretBytes,
    NativeSecureCompartment,
};

pub const NATIVE_PASSPORT_PHASE15N_LABEL: &str =
    "NATIVE_PASSPORT_PHASE15N_LINUX_SECRET_SERVICE_PLATFORM_SEALER_ADAPTER";

pub const PHASE15N_SECRET_SERVICE_APPLICATION: &str = "com.rustyonions.crablink";

pub const PHASE15N_SECRET_SERVICE_SCHEMA: &str = "native-passport-v1";

pub const PHASE15N_RECOVERY_ROOT_ITEM_LABEL: &str = "CrabLink Native Passport Recovery Root";

pub const PHASE15N_DEVICE_KEY_ITEM_LABEL: &str = "CrabLink Native Passport Device Key";

pub const PHASE15N_SECRET_SERVICE_CONTENT_TYPE: &str = "application/octet-stream";

const PHASE15N_RECOVERY_ROOT_REFERENCE: &[u8] = b"crablink-secret-service:v1:recovery-root";

const PHASE15N_DEVICE_KEY_REFERENCE: &[u8] = b"crablink-secret-service:v1:device-key";

trait LinuxSecretServiceBackend: Send + Sync {
    fn set_secret(&self, compartment: NativeSecureCompartment, secret: &[u8]) -> Result<(), ()>;

    fn get_secret(&self, compartment: NativeSecureCompartment) -> Result<Vec<u8>, ()>;
}

#[cfg(any(target_os = "linux", test))]
#[derive(Debug, Default)]
struct SystemLinuxSecretServiceBackend;

#[cfg(any(target_os = "linux", test))]
impl LinuxSecretServiceBackend for SystemLinuxSecretServiceBackend {
    fn set_secret(&self, compartment: NativeSecureCompartment, secret: &[u8]) -> Result<(), ()> {
        let secret_service = SecretService::connect(EncryptionType::Dh).map_err(|_| ())?;

        let collection = secret_service.get_default_collection().map_err(|_| ())?;

        if collection.is_locked().map_err(|_| ())? {
            collection.unlock().map_err(|_| ())?;
        }

        collection
            .create_item(
                secret_service_item_label(compartment),
                secret_service_attributes(compartment),
                secret,
                true,
                PHASE15N_SECRET_SERVICE_CONTENT_TYPE,
            )
            .map_err(|_| ())?;

        Ok(())
    }

    fn get_secret(&self, compartment: NativeSecureCompartment) -> Result<Vec<u8>, ()> {
        let secret_service = SecretService::connect(EncryptionType::Dh).map_err(|_| ())?;

        let search_result = secret_service
            .search_items(secret_service_attributes(compartment))
            .map_err(|_| ())?;

        let item_count = search_result.unlocked.len() + search_result.locked.len();

        if item_count != 1 {
            return Err(());
        }

        if let Some(item) = search_result.unlocked.first() {
            return item.get_secret().map_err(|_| ());
        }

        let locked_items: Vec<_> = search_result.locked.iter().collect();

        secret_service.unlock_all(&locked_items).map_err(|_| ())?;

        search_result
            .locked
            .first()
            .ok_or(())?
            .get_secret()
            .map_err(|_| ())
    }
}

#[derive(Clone)]
pub struct LinuxSecretServicePlatformSealer {
    backend: Arc<dyn LinuxSecretServiceBackend>,
}

impl LinuxSecretServicePlatformSealer {
    #[cfg(target_os = "linux")]
    pub fn new() -> Self {
        Self {
            backend: Arc::new(SystemLinuxSecretServiceBackend),
        }
    }

    #[cfg(test)]
    fn with_backend(backend: Arc<dyn LinuxSecretServiceBackend>) -> Self {
        Self { backend }
    }
}

#[cfg(target_os = "linux")]
impl Default for LinuxSecretServicePlatformSealer {
    fn default() -> Self {
        Self::new()
    }
}

impl fmt::Debug for LinuxSecretServicePlatformSealer {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("LinuxSecretServicePlatformSealer")
            .field("platform_family", &NativePlatformFamily::LinuxSecretService)
            .field("application", &PHASE15N_SECRET_SERVICE_APPLICATION)
            .field("session_encryption", &"DIFFIE_HELLMAN")
            .field("backend", &"REDACTED")
            .finish()
    }
}

impl NativePlatformSealer for LinuxSecretServicePlatformSealer {
    fn platform_family(&self) -> NativePlatformFamily {
        NativePlatformFamily::LinuxSecretService
    }

    fn seal(
        &self,
        compartment: NativeSecureCompartment,
        secret: &NativeSecretBytes,
    ) -> Result<NativeSealedMaterialV1, NativePlatformStorageError> {
        let reference = secret_service_reference(compartment);

        let sealed = NativeSealedMaterialV1::new(
            NativePlatformFamily::LinuxSecretService,
            compartment,
            reference.to_vec(),
        )?;

        self.backend
            .set_secret(compartment, secret.as_slice())
            .map_err(|_| backend_failure(NativePlatformStorageOperation::Seal))?;

        Ok(sealed)
    }

    fn unseal(
        &self,
        sealed: &NativeSealedMaterialV1,
    ) -> Result<NativeSecretBytes, NativePlatformStorageError> {
        sealed.validate()?;

        if sealed.platform_family != NativePlatformFamily::LinuxSecretService {
            return Err(NativePlatformStorageError::PlatformFamilyMismatch {
                expected: NativePlatformFamily::LinuxSecretService,
                actual: sealed.platform_family,
            });
        }

        let expected_reference = secret_service_reference(sealed.compartment);

        if sealed.as_slice() != expected_reference {
            return Err(backend_failure(NativePlatformStorageOperation::Unseal));
        }

        let secret = self
            .backend
            .get_secret(sealed.compartment)
            .map_err(|_| backend_failure(NativePlatformStorageOperation::Unseal))?;

        NativeSecretBytes::new(secret)
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LinuxSecretServicePlatformSealerPosture {
    pub phase_label: &'static str,
    pub platform_family: NativePlatformFamily,
    pub freedesktop_secret_service_used: bool,
    pub user_session_bus_used: bool,
    pub encrypted_dh_session_used: bool,
    pub default_collection_used: bool,
    pub fixed_application_attribute: bool,
    pub fixed_schema_attribute: bool,
    pub separate_compartment_attributes: bool,
    pub replace_matching_item: bool,
    pub ambiguous_search_rejected: bool,
    pub locked_item_unlock_supported: bool,
    pub sealed_output_is_reference_only: bool,
    pub backend_errors_redacted: bool,
    pub app_state_wired: bool,
    pub vault_parsing_added: bool,
    pub pin_unlock_added: bool,
    pub root_confirmation_added: bool,
    pub frontend_secret_custody_added: bool,
    pub capability_issuance_added: bool,
    pub wallet_or_ledger_mutation_added: bool,
}

pub fn linux_secret_service_platform_sealer_posture() -> LinuxSecretServicePlatformSealerPosture {
    LinuxSecretServicePlatformSealerPosture {
        phase_label: NATIVE_PASSPORT_PHASE15N_LABEL,
        platform_family: NativePlatformFamily::LinuxSecretService,
        freedesktop_secret_service_used: true,
        user_session_bus_used: true,
        encrypted_dh_session_used: true,
        default_collection_used: true,
        fixed_application_attribute: true,
        fixed_schema_attribute: true,
        separate_compartment_attributes: true,
        replace_matching_item: true,
        ambiguous_search_rejected: true,
        locked_item_unlock_supported: true,
        sealed_output_is_reference_only: true,
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

fn secret_service_reference(compartment: NativeSecureCompartment) -> &'static [u8] {
    match compartment {
        NativeSecureCompartment::RecoveryRoot => PHASE15N_RECOVERY_ROOT_REFERENCE,
        NativeSecureCompartment::DeviceKey => PHASE15N_DEVICE_KEY_REFERENCE,
    }
}

#[cfg(any(target_os = "linux", test))]
fn secret_service_item_label(compartment: NativeSecureCompartment) -> &'static str {
    match compartment {
        NativeSecureCompartment::RecoveryRoot => PHASE15N_RECOVERY_ROOT_ITEM_LABEL,
        NativeSecureCompartment::DeviceKey => PHASE15N_DEVICE_KEY_ITEM_LABEL,
    }
}

#[cfg(any(target_os = "linux", test))]
fn secret_service_compartment_attribute(compartment: NativeSecureCompartment) -> &'static str {
    match compartment {
        NativeSecureCompartment::RecoveryRoot => "recovery-root",
        NativeSecureCompartment::DeviceKey => "device-key",
    }
}

#[cfg(any(target_os = "linux", test))]
fn secret_service_attributes(
    compartment: NativeSecureCompartment,
) -> HashMap<&'static str, &'static str> {
    HashMap::from([
        ("application", PHASE15N_SECRET_SERVICE_APPLICATION),
        ("schema", PHASE15N_SECRET_SERVICE_SCHEMA),
        (
            "compartment",
            secret_service_compartment_attribute(compartment),
        ),
    ])
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
    struct MemoryLinuxSecretServiceBackend {
        entries: Mutex<HashMap<u8, Vec<u8>>>,
        fail_set: bool,
        fail_get: bool,
    }

    impl MemoryLinuxSecretServiceBackend {
        fn key(compartment: NativeSecureCompartment) -> u8 {
            match compartment {
                NativeSecureCompartment::RecoveryRoot => 1,
                NativeSecureCompartment::DeviceKey => 2,
            }
        }
    }

    impl LinuxSecretServiceBackend for MemoryLinuxSecretServiceBackend {
        fn set_secret(
            &self,
            compartment: NativeSecureCompartment,
            secret: &[u8],
        ) -> Result<(), ()> {
            if self.fail_set {
                return Err(());
            }

            self.entries
                .lock()
                .expect("memory Secret Service lock")
                .insert(Self::key(compartment), secret.to_vec());

            Ok(())
        }

        fn get_secret(&self, compartment: NativeSecureCompartment) -> Result<Vec<u8>, ()> {
            if self.fail_get {
                return Err(());
            }

            self.entries
                .lock()
                .expect("memory Secret Service lock")
                .get(&Self::key(compartment))
                .cloned()
                .ok_or(())
        }
    }

    #[test]
    fn phase15n_system_backend_api_compiles() {
        let backend = SystemLinuxSecretServiceBackend;

        let _ = format!("{backend:?}");

        assert_eq!(
            secret_service_item_label(NativeSecureCompartment::RecoveryRoot,),
            PHASE15N_RECOVERY_ROOT_ITEM_LABEL
        );

        assert_eq!(
            secret_service_attributes(NativeSecureCompartment::DeviceKey,).get("compartment"),
            Some(&"device-key")
        );
    }

    #[test]
    fn phase15n_round_trips_both_compartments() {
        let sealer = LinuxSecretServicePlatformSealer::with_backend(Arc::new(
            MemoryLinuxSecretServiceBackend::default(),
        ));

        for (compartment, secret_material) in [
            (
                NativeSecureCompartment::RecoveryRoot,
                b"phase15n-recovery-root".as_slice(),
            ),
            (
                NativeSecureCompartment::DeviceKey,
                b"phase15n-device-key".as_slice(),
            ),
        ] {
            let secret = NativeSecretBytes::new(secret_material.to_vec()).expect("bounded secret");

            let sealed = seal_native_secret(
                &sealer,
                NativePlatformFamily::LinuxSecretService,
                compartment,
                &secret,
            )
            .expect("Secret Service seal");

            assert_ne!(sealed.as_slice(), secret_material);

            let unsealed = unseal_native_secret(
                &sealer,
                NativePlatformFamily::LinuxSecretService,
                compartment,
                &sealed,
            )
            .expect("Secret Service unseal");

            assert_eq!(unsealed.as_slice(), secret_material);
        }
    }

    #[test]
    fn phase15n_compartment_entries_are_independent() {
        let sealer = LinuxSecretServicePlatformSealer::with_backend(Arc::new(
            MemoryLinuxSecretServiceBackend::default(),
        ));

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
    fn phase15n_rejects_reference_and_platform_drift() {
        let sealer = LinuxSecretServicePlatformSealer::with_backend(Arc::new(
            MemoryLinuxSecretServiceBackend::default(),
        ));

        let wrong_reference = NativeSealedMaterialV1::new(
            NativePlatformFamily::LinuxSecretService,
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
            PHASE15N_DEVICE_KEY_REFERENCE.to_vec(),
        )
        .expect("wrong-platform fixture");

        assert_eq!(
            sealer.unseal(&wrong_platform),
            Err(NativePlatformStorageError::PlatformFamilyMismatch {
                expected: NativePlatformFamily::LinuxSecretService,
                actual: NativePlatformFamily::WindowsDpapi,
            })
        );
    }

    #[test]
    fn phase15n_redacts_backend_failures_and_debug() {
        let sealer = LinuxSecretServicePlatformSealer::with_backend(Arc::new(
            MemoryLinuxSecretServiceBackend {
                fail_set: true,
                ..Default::default()
            },
        ));

        let secret = NativeSecretBytes::new(b"must-not-appear".to_vec()).expect("secret");

        assert_eq!(
            sealer.seal(NativeSecureCompartment::DeviceKey, &secret,),
            Err(NativePlatformStorageError::BackendFailure {
                operation: NativePlatformStorageOperation::Seal,
            })
        );

        let debug = format!("{sealer:?}");

        assert!(debug.contains("REDACTED"));
        assert!(debug.contains("DIFFIE_HELLMAN"));
        assert!(!debug.contains("must-not-appear"));
    }

    #[test]
    fn phase15n_posture_is_encrypted_and_runtime_bounded() {
        let posture = linux_secret_service_platform_sealer_posture();

        assert_eq!(posture.phase_label, NATIVE_PASSPORT_PHASE15N_LABEL);
        assert_eq!(
            posture.platform_family,
            NativePlatformFamily::LinuxSecretService
        );

        assert!(posture.freedesktop_secret_service_used);
        assert!(posture.user_session_bus_used);
        assert!(posture.encrypted_dh_session_used);
        assert!(posture.default_collection_used);
        assert!(posture.fixed_application_attribute);
        assert!(posture.fixed_schema_attribute);
        assert!(posture.separate_compartment_attributes);
        assert!(posture.replace_matching_item);
        assert!(posture.ambiguous_search_rejected);
        assert!(posture.locked_item_unlock_supported);
        assert!(posture.sealed_output_is_reference_only);
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
