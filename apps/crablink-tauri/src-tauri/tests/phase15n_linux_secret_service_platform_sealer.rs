use std::{fs, path::PathBuf};

#[test]
fn phase15n_linux_dependency_module_and_source_boundary_are_locked() {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));

    let cargo = fs::read_to_string(root.join("Cargo.toml")).expect("Tauri Cargo.toml");

    let lib_source = fs::read_to_string(root.join("src/lib.rs")).expect("Tauri lib source");

    let source = fs::read_to_string(root.join("src/passport_platform_sealer_linux.rs"))
        .expect("Linux Secret Service source");

    assert!(cargo.contains("[target.'cfg(target_os = \"linux\")'.dependencies]"));

    let dependency = concat!(
        "secret-service = { version = \"=5.1.0\", ",
        "default-features = false, ",
        "features = [\"rt-tokio-crypto-rust\"] }",
    );

    assert_eq!(
        cargo.matches(dependency).count(),
        2,
        "production Linux and host-test dependencies must remain exact"
    );

    assert!(lib_source.contains("#[cfg(any(target_os = \"linux\", test))]"));
    assert!(lib_source.contains("pub mod passport_platform_sealer_linux;"));

    for required in [
        "blocking::SecretService",
        "EncryptionType::Dh",
        "get_default_collection",
        "create_item",
        "search_items",
        "unlock_all",
        "get_secret",
        "application/octet-stream",
        "impl NativePlatformSealer",
        "PHASE15N_RECOVERY_ROOT_REFERENCE",
        "PHASE15N_DEVICE_KEY_REFERENCE",
        "item_count != 1",
    ] {
        assert!(
            source.contains(required),
            "Phase 15N source missing {required}"
        );
    }

    for forbidden in [
        "EncryptionType::Plain",
        "#[tauri::command]",
        "serde::Serialize",
        "println!",
        "eprintln!",
        "tracing::",
        "std::fs",
        "tokio::fs",
        "unlock_vault(",
        "seed_phrase",
        "private_key",
        "capability_token",
        "wallet.spend(",
        "ledger.write(",
    ] {
        assert!(
            !source.contains(forbidden),
            "Phase 15N source contains forbidden surface {forbidden}"
        );
    }
}
