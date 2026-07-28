use std::{fs, path::PathBuf};

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

fn function_signature<'a>(source: &'a str, function_name: &str) -> &'a str {
    source
        .split(&format!("pub fn {function_name}"))
        .nth(1)
        .unwrap_or_else(|| panic!("function missing: {function_name}"))
        .split("->")
        .next()
        .unwrap_or_else(|| panic!("signature missing: {function_name}"))
}

fn generate_handler_block(source: &str) -> &str {
    source
        .split("generate_handler![")
        .nth(1)
        .and_then(|tail| tail.split(']').next())
        .expect("Tauri generate_handler block")
}

fn command_count(handler_block: &str, command_path: &str) -> usize {
    handler_block.matches(command_path).count()
}

#[test]
fn phase15y_create_status_lock_unlock_command_surface_is_registered_once() {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let commands =
        fs::read_to_string(root.join("src/commands/passport.rs")).expect("Passport command source");
    let lib = fs::read_to_string(root.join("src/lib.rs")).expect("Tauri library source");

    let handler = generate_handler_block(&lib);

    for required in [
        "commands::passport::passport_create,",
        "commands::passport::passport_clear,",
        "commands::passport::passport_status,",
        "commands::passport::passport_lock,",
        "commands::passport::passport_unlock_operational,",
    ] {
        assert!(
            handler.contains(required),
            "Passport handler missing {required}",
        );
        assert_eq!(
            command_count(handler, required),
            1,
            "Passport handler must register {required} exactly once",
        );
    }

    for required_constant in [
        "PASSPORT_CREATE_COMMAND",
        "PASSPORT_STATUS_COMMAND",
        "PASSPORT_LOCK_COMMAND",
        "PASSPORT_UNLOCK_OPERATIONAL_COMMAND",
        "PASSPORT_CREATE_DTO_SCHEMA_V1",
        "PASSPORT_STATUS_DTO_SCHEMA_V1",
        "PASSPORT_LOCK_DTO_SCHEMA_V1",
        "PASSPORT_UNLOCK_OPERATIONAL_DTO_SCHEMA_V1",
    ] {
        assert!(
            commands.contains(required_constant),
            "Passport command source missing {required_constant}",
        );
    }
}

#[test]
fn phase15y_passport_create_command_is_redacted_native_pin_only_and_locked() {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let commands =
        fs::read_to_string(root.join("src/commands/passport.rs")).expect("Passport command source");
    let create_runtime = fs::read_to_string(root.join("src/passport_create_command_runtime.rs"))
        .expect("create command runtime source");

    let create_signature = function_signature(&commands, "passport_create");

    assert!(create_signature.contains("state: State<'_, AppState>"));

    for forbidden in ["pin:", "String", "Vec<u8>", "Deserialize"] {
        assert!(
            !create_signature.contains(forbidden),
            "passport_create signature must not contain {forbidden}",
        );
    }

    let create = extract_function(&commands, "passport_create");

    for required in [
        "create_desktop_native_passport_from_native_surface",
        "&state.passport_vault_store",
        "state.passport_platform_sealer.as_ref()",
        "state.passport_secret_surface.as_ref()",
        "DesktopNativePassportCreateCommandState::CreatedLocked => \"created_locked\"",
        "DesktopNativePassportCreateCommandState::AlreadyExists => \"already_exists\"",
        "DesktopNativePassportCreateCommandState::CreateRejected => \"create_rejected\"",
        "DesktopNativePassportCreateCommandState::Cancelled => \"cancelled\"",
        "DesktopNativePassportCreateCommandState::Unavailable => \"unavailable\"",
        "schema: PASSPORT_CREATE_DTO_SCHEMA_V1",
        "command_name: PASSPORT_CREATE_COMMAND",
        "source_phase_label: NATIVE_PASSPORT_PHASE15W_LABEL",
        "redacted: true",
        "native_secure_input_requested: outcome.native_secure_input_requested",
        "pin_received_from_webview: false",
        "secret_material_returned: false",
        "session_changed: false",
        "recovery_root_unsealed: false",
        "wallet_or_ledger_mutated: false",
    ] {
        assert!(
            create.contains(required),
            "passport_create command missing {required}",
        );
    }

    assert!(
        create.contains("encrypted_vault_mutated: matches!")
            && create.contains("platform_material_mutated: matches!")
            && create.contains("DesktopNativePassportCreateCommandState::CreatedLocked"),
        "passport_create must only mark vault/platform mutation on CreatedLocked",
    );

    for forbidden in [
        "request_operational_pin",
        "unlock_desktop_native_passport_operational",
        "DesktopOperationalUnlockCommandState::OperationalUnlocked",
        "recovery_root_unsealed: true",
        "wallet_or_ledger_mutated: true",
        "secret_material_returned: true",
        "pin_received_from_webview: true",
    ] {
        assert!(
            !create.contains(forbidden),
            "passport_create command contains forbidden {forbidden}",
        );
    }

    for required in [
        "request_create_pin",
        "load_native_encrypted_vault",
        "create_desktop_native_passport_vault",
        "DesktopNativePassportCreateCommandState::CreatedLocked",
        "DesktopNativePassportCreateCommandState::AlreadyExists",
    ] {
        assert!(
            create_runtime.contains(required),
            "create runtime missing {required}",
        );
    }
}

#[test]
fn phase15y_passport_status_remains_persistent_plus_session_truth() {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let commands =
        fs::read_to_string(root.join("src/commands/passport.rs")).expect("Passport command source");

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
            "passport_status missing {required}",
        );
    }

    let compact_status: String = status
        .chars()
        .filter(|character| !character.is_whitespace())
        .collect();

    assert!(
        compact_status.contains("state.passport_operational_session"),
        "passport_status must read operational session state",
    );

    for forbidden in [
        "CreatedLocked",
        "created_locked",
        "passport_secret_surface",
        "request_create_pin",
        "request_operational_pin",
        "recovery_root_unsealed: true",
        "wallet_or_ledger_mutated: true",
    ] {
        assert!(
            !status.contains(forbidden),
            "passport_status must not contain {forbidden}",
        );
    }
}

#[test]
fn phase15y_live_command_surface_does_not_expose_root_or_secret_exports() {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let commands =
        fs::read_to_string(root.join("src/commands/passport.rs")).expect("Passport command source");
    let lib = fs::read_to_string(root.join("src/lib.rs")).expect("Tauri library source");

    let command_declaration_blocks: Vec<&str> =
        commands.split("#[tauri::command]").skip(1).collect();
    let handler = generate_handler_block(&lib);

    for forbidden in [
        "passport_get_seed_to_webview",
        "passport_export_private_key",
        "passport_get_device_private_key",
        "passport_get_raw_capability",
        "passport_issue_arbitrary_scope",
        "passport_disable_policy",
    ] {
        assert!(
            !command_declaration_blocks.iter().any(|block| {
                block.contains(&format!("pub fn {forbidden}("))
                    || block.contains(&format!("fn {forbidden}("))
            }),
            "command surface declares forbidden Tauri command {forbidden}",
        );

        assert!(
            !handler.contains(forbidden),
            "Tauri handler registers forbidden command {forbidden}",
        );
    }

    for forbidden_literal in [
        "secret_material_returned: true",
        "pin_received_from_webview: true",
        "recovery_root_unsealed: true",
        "wallet_or_ledger_mutated: true",
    ] {
        assert!(
            !commands.contains(forbidden_literal) && !lib.contains(forbidden_literal),
            "live command surface contains forbidden literal {forbidden_literal}",
        );
    }
}
