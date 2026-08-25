//! RO:WHAT — Locks the Windows Native Passport PIN and recovery UI source boundary.
//! RO:WHY — Physical CN-4 Windows acceptance requires a real native secret surface rather than the fail-closed non-macOS fallback.
//! RO:INTERACTS — passport_operational_command_runtime and the existing Windows DPAPI-backed Passport runtime.
//! RO:INVARIANTS — PIN/recovery material never enters React, WebView IPC, Tauri command arguments, process arguments, or environment variables.
//! RO:SECURITY — Windows uses a native WinForms child surface; PIN output returns only to native Rust custody and recovery words enter the child only through stdin.
//! RO:TEST — source-boundary regression here plus physical packaged Windows Passport creation.

use std::{fs, path::PathBuf};

#[test]
fn windows_native_passport_surface_is_real_and_native_only() {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));

    let source = fs::read_to_string(root.join("src/passport_operational_command_runtime.rs"))
        .expect("Native Passport operational command runtime");

    let production = source
        .split_once("#[cfg(test)]")
        .map(|(production, _)| production)
        .expect("test boundary");

    for required in [
        "WindowsHiddenPinNativeSecretSurface",
        "WINDOWS_HIDDEN_PIN_SCRIPT",
        "WINDOWS_RECOVERY_PHRASE_SCRIPT",
        "UseSystemPasswordChar = $true",
        "windows_system_powershell",
        "WindowsPowerShell",
        "powershell.exe",
        "Arc::new(WindowsHiddenPinNativeSecretSurface)",
        "write_all(phrase.as_bytes())",
        "write_all(fingerprint.as_bytes())",
        "DesktopNativeRecoveryPhraseOutcome::Acknowledged",
        "cfg!(any(target_os = \"macos\", target_os = \"windows\"))",
    ] {
        assert!(
            production.contains(required),
            "Windows native Passport surface missing {required}",
        );
    }

    for forbidden in [
        ".arg(phrase)",
        ".arg(fingerprint)",
        ".env(\"PIN",
        ".env(\"RECOVERY",
        "#[tauri::command]",
        "serde::Serialize",
        "pbcopy",
        "set the clipboard",
    ] {
        assert!(
            !production.contains(forbidden),
            "Windows native Passport surface contains forbidden {forbidden}",
        );
    }
}
