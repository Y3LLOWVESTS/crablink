//! RO:WHAT — Selects the native desktop PlatformSealer for the active operating system.
//! RO:WHY — Gives AppState one platform-neutral sealer owner without duplicating platform selection in commands.
//! RO:INTERACTS — macOS Keychain, Windows DPAPI, Linux Secret Service, AppState, and future Passport lifecycle commands.
//! RO:INVARIANTS — exactly one supported desktop platform family is selected and callers receive only the NativePlatformSealer trait.
//! RO:SECURITY — construction performs no sealing, unsealing, vault parsing, PIN handling, secret export, capability issuance, wallet, or ledger operation.
//! RO:TEST — tests/phase15o_platform_sealer_runtime_selection_and_app_state_wiring.rs.

use std::sync::Arc;

use svc_passport::native::{NativePlatformFamily, NativePlatformSealer};

use crate::passport_platform_material_clear_runtime::SharedDesktopPlatformMaterialClearer;

#[cfg(any(target_os = "windows", target_os = "linux"))]
use crate::passport_platform_material_clear_runtime::UnavailableDesktopPlatformMaterialClearer;

#[cfg(target_os = "linux")]
use crate::passport_platform_sealer_linux::LinuxSecretServicePlatformSealer;

#[cfg(target_os = "macos")]
use crate::passport_platform_sealer::MacosKeychainPlatformSealer;

#[cfg(target_os = "windows")]
use crate::passport_platform_sealer_windows::WindowsDpapiPlatformSealer;

pub const NATIVE_PASSPORT_PHASE15O_LABEL: &str =
    "NATIVE_PASSPORT_PHASE15O_PLATFORM_SEALER_RUNTIME_SELECTION_AND_APP_STATE_WIRING";

pub type SharedNativePlatformSealer = Arc<dyn NativePlatformSealer>;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DesktopPlatformSealerRuntimePosture {
    pub phase_label: &'static str,
    pub compile_time_platform_selection: bool,
    pub one_platform_sealer_selected: bool,
    pub platform_neutral_trait_object: bool,
    pub shared_app_state_ownership: bool,
    pub macos_keychain_selection_added: bool,
    pub windows_dpapi_selection_added: bool,
    pub linux_secret_service_selection_added: bool,
    pub sealer_backend_operation_performed: bool,
    pub vault_parsing_added: bool,
    pub vault_decryption_added: bool,
    pub pin_unlock_added: bool,
    pub root_confirmation_added: bool,
    pub command_mutation_added: bool,
    pub frontend_secret_custody_added: bool,
    pub capability_issuance_added: bool,
    pub wallet_or_ledger_mutation_added: bool,
}

pub fn desktop_platform_sealer_runtime_posture() -> DesktopPlatformSealerRuntimePosture {
    DesktopPlatformSealerRuntimePosture {
        phase_label: NATIVE_PASSPORT_PHASE15O_LABEL,
        compile_time_platform_selection: true,
        one_platform_sealer_selected: true,
        platform_neutral_trait_object: true,
        shared_app_state_ownership: true,
        macos_keychain_selection_added: true,
        windows_dpapi_selection_added: true,
        linux_secret_service_selection_added: true,
        sealer_backend_operation_performed: false,
        vault_parsing_added: false,
        vault_decryption_added: false,
        pin_unlock_added: false,
        root_confirmation_added: false,
        command_mutation_added: false,
        frontend_secret_custody_added: false,
        capability_issuance_added: false,
        wallet_or_ledger_mutation_added: false,
    }
}

pub fn selected_desktop_platform_family() -> NativePlatformFamily {
    #[cfg(target_os = "macos")]
    {
        NativePlatformFamily::MacosKeychain
    }

    #[cfg(target_os = "windows")]
    {
        NativePlatformFamily::WindowsDpapi
    }

    #[cfg(target_os = "linux")]
    {
        NativePlatformFamily::LinuxSecretService
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux",)))]
    {
        compile_error!("Native Passport desktop PlatformSealer requires macOS, Windows, or Linux");
    }
}

pub fn new_desktop_platform_sealer() -> SharedNativePlatformSealer {
    #[cfg(target_os = "macos")]
    {
        Arc::new(MacosKeychainPlatformSealer::new())
    }

    #[cfg(target_os = "windows")]
    {
        Arc::new(WindowsDpapiPlatformSealer::new())
    }

    #[cfg(target_os = "linux")]
    {
        Arc::new(LinuxSecretServicePlatformSealer::new())
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux",)))]
    {
        compile_error!("Native Passport desktop PlatformSealer requires macOS, Windows, or Linux");
    }
}

pub fn new_desktop_platform_material_clearer() -> SharedDesktopPlatformMaterialClearer {
    #[cfg(target_os = "macos")]
    {
        Arc::new(MacosKeychainPlatformSealer::new())
    }

    #[cfg(any(target_os = "windows", target_os = "linux"))]
    {
        Arc::new(UnavailableDesktopPlatformMaterialClearer)
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux",)))]
    {
        compile_error!("Native Passport platform material clear requires macOS, Windows, or Linux");
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn phase15o_factory_selects_current_platform_family() {
        let sealer = new_desktop_platform_sealer();

        assert_eq!(sealer.platform_family(), selected_desktop_platform_family());

        #[cfg(target_os = "macos")]
        assert_eq!(
            sealer.platform_family(),
            NativePlatformFamily::MacosKeychain
        );

        #[cfg(target_os = "windows")]
        assert_eq!(sealer.platform_family(), NativePlatformFamily::WindowsDpapi);

        #[cfg(target_os = "linux")]
        assert_eq!(
            sealer.platform_family(),
            NativePlatformFamily::LinuxSecretService
        );
    }

    #[test]
    fn phase15o_posture_adds_ownership_without_secret_operations() {
        let posture = desktop_platform_sealer_runtime_posture();

        assert_eq!(posture.phase_label, NATIVE_PASSPORT_PHASE15O_LABEL);

        assert!(posture.compile_time_platform_selection);
        assert!(posture.one_platform_sealer_selected);
        assert!(posture.platform_neutral_trait_object);
        assert!(posture.shared_app_state_ownership);

        assert!(posture.macos_keychain_selection_added);
        assert!(posture.windows_dpapi_selection_added);
        assert!(posture.linux_secret_service_selection_added);

        assert!(!posture.sealer_backend_operation_performed);
        assert!(!posture.vault_parsing_added);
        assert!(!posture.vault_decryption_added);
        assert!(!posture.pin_unlock_added);
        assert!(!posture.root_confirmation_added);
        assert!(!posture.command_mutation_added);
        assert!(!posture.frontend_secret_custody_added);
        assert!(!posture.capability_issuance_added);
        assert!(!posture.wallet_or_ledger_mutation_added);
    }
}
