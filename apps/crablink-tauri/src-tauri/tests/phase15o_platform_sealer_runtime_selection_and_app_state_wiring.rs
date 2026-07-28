use std::{fs, path::PathBuf};

use crablink_tauri_lib::passport_platform_runtime::{
    desktop_platform_sealer_runtime_posture, new_desktop_platform_sealer,
    selected_desktop_platform_family, NATIVE_PASSPORT_PHASE15O_LABEL,
};

#[test]
fn phase15o_runtime_selection_matches_active_host() {
    let sealer = new_desktop_platform_sealer();

    assert_eq!(sealer.platform_family(), selected_desktop_platform_family());
}

#[test]
fn phase15o_posture_is_selection_and_ownership_only() {
    let posture = desktop_platform_sealer_runtime_posture();

    assert_eq!(posture.phase_label, NATIVE_PASSPORT_PHASE15O_LABEL);

    assert!(posture.compile_time_platform_selection);
    assert!(posture.one_platform_sealer_selected);
    assert!(posture.platform_neutral_trait_object);
    assert!(posture.shared_app_state_ownership);

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

#[test]
fn phase15o_module_state_and_startup_wiring_are_locked() {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));

    let runtime_source = fs::read_to_string(root.join("src/passport_platform_runtime.rs"))
        .expect("platform runtime source");

    let state_source = fs::read_to_string(root.join("src/state.rs")).expect("AppState source");

    let lib_source = fs::read_to_string(root.join("src/lib.rs")).expect("Tauri library source");

    for required in [
        "MacosKeychainPlatformSealer::new()",
        "WindowsDpapiPlatformSealer::new()",
        "LinuxSecretServicePlatformSealer::new()",
        "Arc<dyn NativePlatformSealer>",
        "selected_desktop_platform_family",
    ] {
        assert!(
            runtime_source.contains(required),
            "Phase 15O runtime missing {required}"
        );
    }

    for required in [
        "pub passport_vault_store: DesktopAtomicVaultStore",
        "pub passport_platform_sealer: SharedNativePlatformSealer",
        "pub fn with_native_passport_runtime",
        "passport_vault_store,",
        "passport_platform_sealer,",
    ] {
        assert!(
            state_source.contains(required),
            "Phase 15O AppState missing {required}"
        );
    }

    for required in [
        "pub mod passport_platform_runtime;",
        "new_desktop_platform_sealer",
        "let passport_platform_sealer =",
        "AppState::with_native_passport_runtime",
        "app.manage(state)",
    ] {
        assert!(
            lib_source.contains(required),
            "Phase 15O startup missing {required}"
        );
    }

    assert!(!state_source.contains("with_passport_vault_store"));

    assert!(!lib_source.contains("AppState::with_passport_vault_store"));
}

#[test]
fn phase15o_runtime_has_no_secret_operation_or_command_surface() {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));

    let source = fs::read_to_string(root.join("src/passport_platform_runtime.rs"))
        .expect("platform runtime source");

    for forbidden in [
        "#[tauri::command]",
        "serde::Serialize",
        ".seal(",
        ".unseal(",
        "seal_native_secret",
        "unseal_native_secret",
        "load_native_encrypted_vault",
        "write_native_encrypted_vault_atomic",
        "decrypt(",
        "unlock_vault(",
        "seed_phrase",
        "private_key",
        "capability_token",
        "wallet.spend(",
        "ledger.write(",
        "println!",
        "eprintln!",
        "tracing::",
    ] {
        assert!(
            !source.contains(forbidden),
            "Phase 15O runtime contains forbidden surface {forbidden}"
        );
    }
}
