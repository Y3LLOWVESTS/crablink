#![cfg(target_os = "macos")]

use std::{fs, path::PathBuf};

use crablink_tauri_lib::passport_platform_sealer::{
    macos_keychain_platform_sealer_posture, MacosKeychainPlatformSealer,
    NATIVE_PASSPORT_PHASE15L_LABEL, PHASE15L_DEVICE_KEY_ACCOUNT, PHASE15L_KEYCHAIN_SERVICE,
    PHASE15L_RECOVERY_ROOT_ACCOUNT,
};
use svc_passport::native::{NativePlatformFamily, NativePlatformSealer};

#[test]
fn phase15l_posture_and_public_identifiers_are_locked() {
    let posture = macos_keychain_platform_sealer_posture();

    assert_eq!(posture.phase_label, NATIVE_PASSPORT_PHASE15L_LABEL);
    assert_eq!(posture.platform_family, NativePlatformFamily::MacosKeychain);

    assert!(posture.apple_security_framework_used);
    assert!(posture.generic_password_storage_used);
    assert!(posture.fixed_service_identifier);
    assert!(posture.separate_compartment_accounts);
    assert!(posture.keychain_entry_create_or_update);
    assert!(posture.keychain_entry_read);
    assert!(posture.sealed_output_is_reference_only);
    assert!(posture.backend_errors_redacted);

    assert!(!posture.app_state_wired);
    assert!(!posture.vault_decryption_added);
    assert!(!posture.pin_unlock_added);
    assert!(!posture.root_confirmation_added);
    assert!(!posture.frontend_secret_custody_added);
    assert!(!posture.capability_issuance_added);
    assert!(!posture.wallet_or_ledger_mutation_added);

    assert_eq!(
        PHASE15L_KEYCHAIN_SERVICE,
        "com.rustyonions.crablink.native-passport.v1"
    );
    assert_eq!(PHASE15L_RECOVERY_ROOT_ACCOUNT, "recovery-root");
    assert_eq!(PHASE15L_DEVICE_KEY_ACCOUNT, "device-key");

    assert_eq!(
        MacosKeychainPlatformSealer::new().platform_family(),
        NativePlatformFamily::MacosKeychain
    );
}

#[test]
fn phase15l_dependency_module_and_source_boundary_are_locked() {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));

    let cargo = fs::read_to_string(root.join("Cargo.toml")).expect("Tauri Cargo.toml");

    let lib_source = fs::read_to_string(root.join("src/lib.rs")).expect("Tauri lib source");

    let source = fs::read_to_string(root.join("src/passport_platform_sealer.rs"))
        .expect("macOS Keychain sealer source");

    assert!(cargo.contains("[target.'cfg(target_os = \"macos\")'.dependencies]"));
    assert!(cargo.contains("security-framework = \"=3.7.0\""));

    assert!(lib_source.contains("#[cfg(target_os = \"macos\")]"));
    assert!(lib_source.contains("pub mod passport_platform_sealer;"));

    for required in [
        "set_generic_password",
        "generic_password",
        "PasswordOptions::new_generic_password",
        "impl NativePlatformSealer",
        "PHASE15L_RECOVERY_ROOT_REFERENCE",
        "PHASE15L_DEVICE_KEY_REFERENCE",
        "BackendFailure",
    ] {
        assert!(
            source.contains(required),
            "Phase 15L source missing {required}"
        );
    }

    for forbidden in [
        "#[tauri::command]",
        "serde::Serialize",
        "println!",
        "eprintln!",
        "tracing::",
        "std::fs",
        "tokio::fs",
        "unlock_vault(",
        "decrypt(",
        "seed_phrase",
        "private_key",
        "capability_token",
        "wallet.spend(",
        "ledger.write(",
    ] {
        assert!(
            !source.contains(forbidden),
            "Phase 15L source contains forbidden surface {forbidden}"
        );
    }
}
