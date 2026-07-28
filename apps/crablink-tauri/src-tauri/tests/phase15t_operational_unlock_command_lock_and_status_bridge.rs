use std::{fs, path::PathBuf};

use crablink_tauri_lib::passport_operational_command_runtime::{
    desktop_operational_command_runtime_posture, NATIVE_PASSPORT_PHASE15T_LABEL,
};

fn extract_function<'a>(source: &'a str, function_name: &str) -> &'a str {
    let signature = format!("pub fn {function_name}");
    let start = source
        .find(&signature)
        .unwrap_or_else(|| panic!("function missing: {function_name}"));
    let relative_open = source[start..].find('{').expect("function opening brace");
    let open = start + relative_open;
    let bytes = source.as_bytes();
    let mut depth = 0usize;

    for index in open..bytes.len() {
        match bytes[index] {
            b'{' => depth += 1,
            b'}' => {
                depth -= 1;

                if depth == 0 {
                    return &source[start..=index];
                }
            }
            _ => {}
        }
    }

    panic!("function closing brace missing: {function_name}");
}

#[test]
fn phase15t_posture_and_tauri_command_boundary_are_locked() {
    let posture = desktop_operational_command_runtime_posture();

    assert_eq!(posture.phase_label, NATIVE_PASSPORT_PHASE15T_LABEL);
    assert!(posture.public_unlock_trigger_added);
    assert!(posture.public_lock_command_added);
    assert!(posture.status_combines_persistent_and_session_state);
    assert!(posture.native_secret_surface_port_added);
    assert_eq!(
        posture.production_native_pin_prompt_installed,
        cfg!(target_os = "macos")
    );
    assert!(!posture.pin_received_from_webview);
    assert!(!posture.pin_serialized);
    assert!(!posture.operational_vmk_serialized);
    assert!(!posture.recovery_root_factor_unsealed);
    assert!(!posture.recovery_root_vmk_unlocked);
    assert!(!posture.frontend_secret_custody_added);
    assert!(!posture.capability_issuance_added);
    assert!(!posture.wallet_or_ledger_mutation_added);

    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let commands =
        fs::read_to_string(root.join("src/commands/passport.rs")).expect("Passport command source");
    let state = fs::read_to_string(root.join("src/state.rs")).expect("AppState source");
    let lib = fs::read_to_string(root.join("src/lib.rs")).expect("Tauri registry source");

    let status = extract_function(&commands, "passport_status");

    for required in [
        "inspect_stored_passport_status",
        "state.passport_vault_store",
        "DesktopOperationalVaultSessionState::Locked",
        "DesktopOperationalVaultSessionState::Unlocking",
        "DesktopOperationalVaultSessionState::OperationalUnlocked",
        "PassportStatusFacts::no_passport",
        "PassportStatusFacts::stored_locked",
        "PassportStatusFacts::operational_unlocked",
    ] {
        assert!(
            status.contains(required),
            "status bridge missing {required}"
        );
    }

    let compact_status: String = status
        .chars()
        .filter(|character| !character.is_whitespace())
        .collect();

    assert!(
        compact_status.contains("state.passport_operational_session"),
        "status bridge missing state.passport_operational_session"
    );

    assert!(!status.contains("RootUnlocked"));
    assert!(!status.contains("passport_platform_sealer"));
    assert!(!status.contains("passport_secret_surface"));

    let unlock = extract_function(&commands, "passport_unlock_operational");

    assert!(unlock.contains("state: State<'_, AppState>"));

    for forbidden in ["pin:", "String", "Vec<u8>", "Deserialize"] {
        assert!(
            !unlock.contains(forbidden),
            "unlock command must not contain {forbidden}"
        );
    }

    for required in [
        "commands::passport::passport_status,",
        "commands::passport::passport_lock,",
        "commands::passport::passport_unlock_operational,",
        "pub mod passport_operational_command_runtime;",
        "pub passport_secret_surface: SharedDesktopNativeSecretSurface",
        "new_desktop_native_secret_surface()",
    ] {
        assert!(
            commands.contains(required) || state.contains(required) || lib.contains(required),
            "Phase 15T source missing {required}"
        );
    }

    for forbidden in [
        "passport_unlock_root",
        "passport_get_seed_to_webview",
        "passport_export_private_key",
        "passport_get_device_private_key",
        "passport_get_raw_capability",
        "passport_issue_arbitrary_scope",
        "passport_disable_policy",
    ] {
        assert!(!lib.contains(forbidden));
    }
}
