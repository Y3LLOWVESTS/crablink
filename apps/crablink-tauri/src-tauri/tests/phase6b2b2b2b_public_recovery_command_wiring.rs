use std::{fs, path::PathBuf};

fn function_block<'a>(source: &'a str, name: &str) -> &'a str {
    let marker = format!("pub fn {name}");

    let start = source
        .find(&marker)
        .unwrap_or_else(|| panic!("function missing: {name}"));

    let opening = source[start..]
        .find('{')
        .map(|offset| start + offset)
        .unwrap_or_else(|| panic!("opening brace missing: {name}"));

    let mut depth = 0usize;

    for (offset, character) in source[opening..].char_indices() {
        match character {
            '{' => {
                depth += 1;
            }
            '}' => {
                depth -= 1;

                if depth == 0 {
                    return &source[start..opening + offset + 1];
                }
            }
            _ => {}
        }
    }

    panic!("closing brace missing: {name}");
}

#[test]
fn phase6b2b2b2b_public_recovery_command_uses_one_time_runtime() {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));

    let commands =
        fs::read_to_string(root.join("src/commands/passport.rs")).expect("read Passport commands");

    let lib = fs::read_to_string(root.join("src/lib.rs")).expect("read Tauri lib");

    let function = function_block(&commands, "passport_recovery_ceremony");

    let signature = function
        .split('{')
        .next()
        .expect("recovery command signature");

    assert!(signature.contains("state: State<'_, AppState>",));

    for forbidden in [
        "pin:",
        "phrase:",
        "fingerprint:",
        "String",
        "Vec<u8>",
        "Deserialize",
    ] {
        assert!(
            !signature.contains(forbidden),
            "recovery signature contains {forbidden}",
        );
    }

    for required in [
        "run_desktop_recovery_ceremony_once",
        "&state.passport_vault_store",
        "passport_platform_sealer",
        "passport_secret_surface",
        "passport_recovery_acknowledgement_store",
        "DesktopRecoveryCeremonyOnceState",
        "\"acknowledged\"",
        "\"already_acknowledged\"",
        "\"cancelled\"",
        "\"rejected\"",
        "\"unavailable\"",
        "\"REDACTED\"",
        "\"ABSENT\"",
        "shown,",
        "acknowledged,",
        "redacted: true",
        "words_returned_to_webview: false",
        "secret_material_returned: false",
        "recovery_root_exported: false",
        "wallet_or_ledger_mutated: false",
    ] {
        assert!(
            function.contains(required),
            "recovery command missing {required}",
        );
    }

    for forbidden in [
        "recovery_phrase:",
        "phrase_words",
        "seed_phrase",
        "private_key",
        "words_returned_to_webview: true",
        "secret_material_returned: true",
        "recovery_root_exported: true",
        "wallet_or_ledger_mutated: true",
    ] {
        assert!(
            !function.contains(forbidden),
            "recovery command contains forbidden {forbidden}",
        );
    }

    assert_eq!(
        lib.matches("commands::passport::passport_recovery_ceremony,")
            .count(),
        1,
    );
}

#[test]
fn phase6b2b2b2b_public_clear_command_resets_native_ack_marker() {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));

    let commands =
        fs::read_to_string(root.join("src/commands/passport.rs")).expect("read Passport commands");

    let lib = fs::read_to_string(root.join("src/lib.rs")).expect("read Tauri lib");

    let function = function_block(&commands, "passport_clear");

    let signature = function.split('{').next().expect("clear command signature");

    assert!(signature.contains("state: State<'_, AppState>",));

    for forbidden in [
        "pin:",
        "phrase:",
        "fingerprint:",
        "String",
        "Vec<u8>",
        "Deserialize",
    ] {
        assert!(
            !signature.contains(forbidden),
            "clear signature contains {forbidden}",
        );
    }

    for required in [
        "clear_desktop_native_passport_with_public_identity_platform_material_and_recovery_acknowledgement",
        "&state.passport_vault_store",
        "passport_operational_session",
        "passport_pending_recovery_session",
        "passport_pending_operational_session",
        "passport_platform_material_clearer",
        "passport_recovery_acknowledgement_store",
        "passport_public_identity_store",
        "schema: PASSPORT_CLEAR_DTO_SCHEMA_V1",
        "command_name: PASSPORT_CLEAR_COMMAND",
        "source_phase_label:",
        "ONBOARDING_PHASE11C2B_PLATFORM_SECRET_CLEAR_LABEL",
        "redacted: true",
        "native_secure_input_requested: false",
        "pin_received_from_webview: false",
        "secret_material_returned: false",
        "encrypted_vault_mutated:",
        "outcome.encrypted_vault_removed",
        "outcome.platform_material_mutated",
        "recovery_root_unsealed: false",
        "wallet_or_ledger_mutated: false",
    ] {
        assert!(
            function.contains(required),
            "clear command missing {required}",
        );
    }

    for forbidden in [
        "request_create_pin",
        "request_operational_pin",
        "request_root_confirmation_pin",
        "recovery_root_unsealed: true",
        "secret_material_returned: true",
        "wallet_or_ledger_mutated: true",
    ] {
        assert!(
            !function.contains(forbidden),
            "clear command contains forbidden {forbidden}",
        );
    }

    assert_eq!(
        lib.matches("commands::passport::passport_clear,").count(),
        1,
    );
}
