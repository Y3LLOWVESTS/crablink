use std::{fs, path::PathBuf};

#[test]
fn onboarding_phase11c2a_appstate_platform_clearer_wiring_is_locked() {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));

    let clear_source =
        fs::read_to_string(root.join("src/passport_platform_material_clear_runtime.rs"))
            .expect("platform material clear source");

    let runtime_source = fs::read_to_string(root.join("src/passport_platform_runtime.rs"))
        .expect("platform runtime source");

    let state_source = fs::read_to_string(root.join("src/state.rs")).expect("AppState source");

    let lib_source = fs::read_to_string(root.join("src/lib.rs")).expect("Tauri library source");

    let phase11b_source =
        fs::read_to_string(root.join("src/onboarding_phase11b_command_path_tests.rs"))
            .expect("Phase 11B command-path source");

    for required in [
        "pub type SharedDesktopPlatformMaterialClearer",
        "AlreadyAbsentDesktopPlatformMaterialClearer",
        "UnavailableDesktopPlatformMaterialClearer",
    ] {
        assert!(
            clear_source.contains(required),
            "Phase 11C2A clear contract missing {required}",
        );
    }

    for required in [
        "pub fn new_desktop_platform_material_clearer",
        "MacosKeychainPlatformSealer::new()",
        "UnavailableDesktopPlatformMaterialClearer",
    ] {
        assert!(
            runtime_source.contains(required),
            "Phase 11C2A runtime missing {required}",
        );
    }

    for required in [
        "pub passport_platform_material_clearer:",
        "SharedDesktopPlatformMaterialClearer",
        "passport_platform_material_clearer,",
    ] {
        assert!(
            state_source.contains(required),
            "Phase 11C2A AppState missing {required}",
        );
    }

    for required in [
        "new_desktop_platform_material_clearer",
        "let passport_platform_material_clearer =",
        "passport_platform_material_clearer,",
    ] {
        assert!(
            lib_source.contains(required),
            "Phase 11C2A startup wiring missing {required}",
        );
    }

    assert_eq!(
        phase11b_source
            .matches("Arc::new(AlreadyAbsentDesktopPlatformMaterialClearer)")
            .count(),
        2,
    );

    for forbidden in [
        "#[tauri::command]",
        "serde::Serialize",
        "seed_phrase",
        "private_key",
        "capability_token",
        "wallet.spend(",
        "ledger.write(",
    ] {
        assert!(
            !clear_source.contains(forbidden),
            "Phase 11C2A clear contract contains forbidden {forbidden}",
        );
    }
}
