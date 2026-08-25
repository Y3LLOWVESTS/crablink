//! RO:WHAT — Verifies production Passport operational unlock wires the existing V1-to-V2 migration lifecycle before DeviceKey authority can be consumed.
//! RO:WHY — Windows Physical M1 created a valid V1 Passport that could unlock but could not authorize its device because production never invoked the already-green migration engine.
//! RO:INTERACTS — Passport Tauri operational-unlock command, V1-to-V2 migration runtime, operational session custody, capability session, and DeviceAuthorization command.
//! RO:INVARIANTS — migration follows successful/native unlock; AlreadyV2 is idempotent; migration failure revokes session/capability authority; DeviceAuthorization does not own migration.
//! RO:SECURITY — no PIN, VMK, DeviceKey seed, raw capability, root material, wallet authority, or ledger authority enters the public command surface.
//! RO:TEST — cargo test --test physical_m1_production_unlock_v2_migration_wiring.

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

fn command_source() -> String {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));

    fs::read_to_string(root.join("src/commands/passport.rs")).expect("Passport command source")
}

#[test]
fn cn4_production_unlock_runs_existing_migration_after_native_unlock() {
    let source = command_source();
    let function = extract_function(&source, "passport_unlock_operational");

    let unlock = function
        .find(
            "unlock_desktop_native_passport_operational_from_native_surface_with_pending_operational",
        )
        .expect("native operational unlock");

    let migration = function
        .find("migrate_desktop_native_passport_session_v1_to_v2")
        .expect("production V1-to-V2 migration");

    assert!(
        unlock < migration,
        "native operational custody must exist before migration"
    );

    for required in [
        "DesktopOperationalUnlockCommandState::OperationalUnlocked",
        "DesktopOperationalUnlockCommandState::AlreadyUnlocked",
        "DesktopV1ToV2MigrationOutcome::Migrated",
        "DesktopV1ToV2MigrationOutcome::AlreadyV2",
        "DesktopV1ToV2MigrationOutcome::V2ObservedAfterWriteError",
        "encrypted_vault_mutated = true",
    ] {
        assert!(
            function.contains(required),
            "production unlock migration wiring missing {required}"
        );
    }
}

#[test]
fn cn4_migration_failure_drops_native_authority_and_fails_closed() {
    let source = command_source();
    let function = extract_function(&source, "passport_unlock_operational");

    for required in [
        "passport_capability_session.clear()",
        "lock_desktop_native_passport_operational(",
        "state: \"unavailable\"",
        "recovery_root_unsealed: false",
        "wallet_or_ledger_mutated: false",
        "platform_material_mutated: false",
    ] {
        assert!(
            function.contains(required),
            "fail-closed migration path missing {required}"
        );
    }

    for forbidden in [
        "pin:",
        "Vec<u8>",
        "NativeSecretBytes",
        "RecoveryRoot",
        "wallet.spend(",
        "ledger.write(",
        "write_native_encrypted_vault_atomic(",
    ] {
        assert!(
            !function.contains(forbidden),
            "public unlock gained forbidden boundary {forbidden}"
        );
    }
}

#[test]
fn cn4_post_write_migration_failures_are_not_reported_as_no_mutation() {
    let source = command_source();

    let helper_start = source
        .find("const fn migration_error_may_have_mutated_vault")
        .expect("migration mutation-classification helper");

    let unlock_start = source
        .find("pub fn passport_unlock_operational")
        .expect("production unlock");

    let helper = &source[helper_start..unlock_start];

    for required in [
        "PostWriteReadbackFailed",
        "PostWriteVerificationFailed",
        "PostWriteStateAmbiguous",
    ] {
        assert!(
            helper.contains(required),
            "post-write mutation classifier missing {required}"
        );
    }
}

#[test]
fn cn4_device_authorization_does_not_become_the_vault_migration_owner() {
    let source = command_source();
    let function = extract_function(&source, "passport_authorize_device");

    assert!(
        !function.contains("migrate_desktop_native_passport_session_v1_to_v2"),
        "DeviceAuthorization must not own V1-to-V2 migration"
    );

    assert!(
        function.contains("authorize_or_reuse_persisted_physical_m1_device_authorization"),
        "existing DeviceAuthorization authority path must remain"
    );
}
