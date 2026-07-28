use std::{fs, path::PathBuf};

#[test]
fn phase15m_windows_dependency_and_module_boundary_are_locked() {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));

    let cargo = fs::read_to_string(root.join("Cargo.toml")).expect("Tauri Cargo.toml");

    let lib_source = fs::read_to_string(root.join("src/lib.rs")).expect("Tauri lib source");

    let source = fs::read_to_string(root.join("src/passport_platform_sealer_windows.rs"))
        .expect("Windows DPAPI sealer source");

    assert!(cargo.contains("[target.'cfg(windows)'.dependencies]"));

    for required_feature in [
        "\"Win32_Foundation\"",
        "\"Win32_Storage_FileSystem\"",
        "\"Win32_Security_Cryptography\"",
    ] {
        assert!(
            cargo.contains(required_feature),
            "Windows dependency missing {required_feature}"
        );
    }

    assert!(lib_source.contains("#[cfg(any(target_os = \"windows\", test))]"));
    assert!(lib_source.contains("pub mod passport_platform_sealer_windows;"));

    for required in [
        "CryptProtectData",
        "CryptUnprotectData",
        "CRYPTPROTECT_UI_FORBIDDEN",
        "CRYPT_INTEGER_BLOB",
        "LocalFree",
        "PHASE15M_RECOVERY_ROOT_ENTROPY",
        "PHASE15M_DEVICE_KEY_ENTROPY",
        "impl NativePlatformSealer for WindowsDpapiPlatformSealer",
        "std::ptr::write_bytes",
        "CURRENT_USER",
    ] {
        assert!(
            source.contains(required),
            "Phase 15M source missing {required}"
        );
    }

    for forbidden in [
        "CRYPTPROTECT_LOCAL_MACHINE",
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
            "Phase 15M source contains forbidden surface {forbidden}"
        );
    }
}
