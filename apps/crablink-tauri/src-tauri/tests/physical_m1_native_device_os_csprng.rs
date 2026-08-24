//! RO:WHAT — Focused Physical M1 tests for the desktop OS-CSPRNG device-key adapter.
//! RO:WHY — Proves production desktop device seeds use getrandom and feed the canonical svc-passport generation/identity path.
//! RO:INTERACTS — CrabLink Tauri getrandom adapter and svc-passport device-key generation/identity primitives.
//! RO:INVARIANTS — 32 random bytes; no fixed/test RNG in production adapter; no persistence, platform-factor overwrite, WebView secret DTO, or network authority.
//! RO:METRICS — none.
//! RO:CONFIG — desktop Tauri build.
//! RO:SECURITY — generated test secrets remain process-local and redacted; no real Passport vault or OS secure-storage entry is mutated.
//! RO:TEST — cargo test --manifest-path apps/crablink-tauri/src-tauri/Cargo.toml --test physical_m1_native_device_os_csprng.

use std::{fs, path::PathBuf};

use crablink_tauri_lib::passport_device_key_random_runtime::{
    OsDesktopNativeDeviceKeyRandomSource, PHYSICAL_M1_DESKTOP_DEVICE_OS_CSPRNG_LABEL,
};

use svc_passport::native::{
    derive_native_device_public_identity_v1, generate_native_device_signing_seed_v1_with_random,
    DEVICE_ID_V1_SIGNING_SEED_BYTES,
};

#[test]
fn physical_m1_desktop_device_generation_uses_os_csprng() {
    assert_eq!(
        PHYSICAL_M1_DESKTOP_DEVICE_OS_CSPRNG_LABEL,
        "PHYSICAL_M1_DESKTOP_DEVICE_OS_CSPRNG_V1",
    );

    let random = OsDesktopNativeDeviceKeyRandomSource;

    let first = generate_native_device_signing_seed_v1_with_random(&random)
        .expect("first OS-generated device seed");

    let second = generate_native_device_signing_seed_v1_with_random(&random)
        .expect("second OS-generated device seed");

    assert_eq!(first.len(), DEVICE_ID_V1_SIGNING_SEED_BYTES);
    assert_eq!(second.len(), DEVICE_ID_V1_SIGNING_SEED_BYTES);

    let first_identity =
        derive_native_device_public_identity_v1(&first).expect("first public device identity");

    let second_identity =
        derive_native_device_public_identity_v1(&second).expect("second public device identity");

    assert_ne!(
        first_identity.device_id, second_identity.device_id,
        "independent OS-generated device keys must not collapse to one DeviceIdV1",
    );

    let first_debug = format!("{first:?}");
    let second_debug = format!("{second:?}");

    assert!(first_debug.contains("REDACTED"));
    assert!(second_debug.contains("REDACTED"));
}

#[test]
fn physical_m1_desktop_os_rng_adapter_has_no_custody_or_network_authority() {
    let source = fs::read_to_string(
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("src/passport_device_key_random_runtime.rs"),
    )
    .expect("desktop device OS-CSPRNG source");

    assert!(source.contains("getrandom::fill(output)"));
    assert!(source.contains("NativeDeviceKeyRandomSource"));

    for forbidden in [
        "NativePlatformSealer",
        "NativeVaultStore",
        "seal_native_secret(",
        "unseal_native_secret(",
        "write_encrypted_vault_atomic(",
        "std::fs::",
        "tokio::fs",
        "#[tauri::command]",
        "tauri::command",
        "reqwest::",
        ".sign(",
        "issue_capability(",
        "wallet.spend(",
        "ledger.write(",
    ] {
        assert!(
            !source.contains(forbidden),
            "desktop OS-CSPRNG adapter gained forbidden authority marker {forbidden}",
        );
    }
}
