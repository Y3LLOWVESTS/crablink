//! RO:WHAT — Verifies the migrated Physical M1 macOS Native Passport V2 through a fresh native unlock and reads only the canonical public Device ID/public key.
//! RO:WHY — Before root-authorizing the physical Mac, prove persisted V2 authentication and stable public device identity after restart without rewriting the vault.
//! RO:INTERACTS — DesktopAtomicVaultStore, MacosKeychainPlatformSealer, native hidden PIN surface, operational session custody, authenticated V2 public-device reader, and canonical svc-passport DeviceIdV1.
//! RO:INVARIANTS — ignored by default; exact V2 SHA/metadata required; no temp file; no migration/write API; fresh session unlocks once, reads identity twice, then locks; vault bytes/inode/mtime and descriptor remain unchanged.
//! RO:METRICS — emits only public Device ID/public key and immutable encrypted-file fingerprints.
//! RO:CONFIG — macOS Physical M1 only; explicit environment opt-in required.
//! RO:SECURITY — PIN remains native-only; VMK and signing seed never leave Rust-native custody; no root signing, capability issuance, username mutation, wallet mutation, or ledger mutation.
//! RO:TEST — ignored; CRABLINK_PHYSICAL_M1_VERIFY_V2_DEVICE_ID=YES required.

#![cfg(target_os = "macos")]

use std::{
    fs,
    os::unix::fs::{MetadataExt, PermissionsExt},
    path::{Path, PathBuf},
    process::Command,
};

use crablink_tauri_lib::{
    passport_operational_command_runtime::{
        unlock_desktop_native_passport_operational_from_native_surface,
        DesktopOperationalUnlockCommandState, MacosHiddenAnswerNativeSecretSurface,
    },
    passport_operational_unlock_runtime::{
        DesktopOperationalVaultSessionState, DesktopOperationalVaultSessionStore,
    },
    passport_platform_sealer::MacosKeychainPlatformSealer,
    passport_vault_store::DesktopAtomicVaultStore,
    passport_vault_v2_migration_runtime::read_desktop_native_passport_session_device_public_identity,
};

use svc_passport::native::{
    decode_native_platform_bound_vault_versioned, load_native_encrypted_vault,
    NativePlatformBoundVaultVersioned,
};

const OPT_IN_ENV: &str = "CRABLINK_PHYSICAL_M1_VERIFY_V2_DEVICE_ID";

const EXPECTED_V2_SHA256: &str = "ea518d2a23016996edcf305a3726e0af813650c183c462ce7c8fd24304273ed0";

const EXPECTED_V2_SIZE: u64 = 1100;
const EXPECTED_V2_INODE: u64 = 33_314_191;
const EXPECTED_V2_MTIME: i64 = 1_787_195_266;

const EXPECTED_DESCRIPTOR_SHA256: &str =
    "3f278e6364448bac095787787458e1d2cf8d1cd1ed5638a31b14b3d83743f0b0";

fn physical_root() -> PathBuf {
    let home = std::env::var_os("HOME").expect("HOME must exist");

    PathBuf::from(home)
        .join("Library")
        .join("Application Support")
        .join("com.rustyonions.crablink")
        .join("native-passport")
}

fn sha256(path: &Path) -> String {
    let output = Command::new("/usr/bin/shasum")
        .arg("-a")
        .arg("256")
        .arg(path)
        .output()
        .expect("run shasum");

    assert!(output.status.success(), "shasum failed",);

    String::from_utf8(output.stdout)
        .expect("UTF-8 shasum")
        .split_whitespace()
        .next()
        .expect("digest")
        .to_owned()
}

#[test]
#[ignore = "physical V2 verification requires exact migrated Passport plus native PIN prompt"]
fn physical_m1_fresh_v2_restart_unlock_reads_canonical_device_identity() {
    assert_eq!(std::env::var(OPT_IN_ENV).as_deref(), Ok("YES"),);

    let root = physical_root();
    let vault = root.join("passport.vault.bin");
    let temporary = root.join("passport.vault.bin.tmp");
    let descriptor = root.join("passport.public-identity.json");

    assert!(!temporary.exists());

    let before = fs::symlink_metadata(&vault).expect("physical V2 metadata");

    assert!(before.is_file());
    assert!(!before.file_type().is_symlink());

    assert_eq!(before.permissions().mode() & 0o777, 0o600,);

    assert_eq!(before.len(), EXPECTED_V2_SIZE);
    assert_eq!(before.ino(), EXPECTED_V2_INODE);
    assert_eq!(before.mtime(), EXPECTED_V2_MTIME);

    let before_sha = sha256(&vault);

    assert_eq!(before_sha, EXPECTED_V2_SHA256,);

    let descriptor_sha_before = sha256(&descriptor);

    assert_eq!(descriptor_sha_before, EXPECTED_DESCRIPTOR_SHA256,);

    let store = DesktopAtomicVaultStore::new(root).expect("physical VaultStore");

    let encoded = load_native_encrypted_vault(&store)
        .expect("load physical V2")
        .expect("physical V2 exists");

    assert!(matches!(
        decode_native_platform_bound_vault_versioned(&encoded,).expect("decode physical V2"),
        NativePlatformBoundVaultVersioned::V2(_),
    ));

    let session = DesktopOperationalVaultSessionStore::default();

    assert_eq!(
        session.state().expect("initial session"),
        DesktopOperationalVaultSessionState::Locked,
    );

    let sealer = MacosKeychainPlatformSealer::new();

    let surface = MacosHiddenAnswerNativeSecretSurface;

    let unlock = unlock_desktop_native_passport_operational_from_native_surface(
        &store, &sealer, &session, &surface,
    );

    assert_eq!(
        unlock.state,
        DesktopOperationalUnlockCommandState::OperationalUnlocked,
    );

    assert!(unlock.native_secure_input_requested,);

    let identity = read_desktop_native_passport_session_device_public_identity(&store, &session)
        .expect("physical V2 public identity");

    let repeated = read_desktop_native_passport_session_device_public_identity(&store, &session)
        .expect("repeat physical V2 public identity");

    assert_eq!(identity, repeated);

    assert!(identity
        .device_id
        .as_str()
        .starts_with("device:v1:ed25519:b3:"),);

    assert_eq!(identity.device_public_key.as_str().len(), 64,);

    assert!(identity
        .device_public_key
        .as_str()
        .bytes()
        .all(|byte| byte.is_ascii_digit() || matches!(byte, b'a'..=b'f')),);

    assert!(session.lock().expect("lock physical session"),);

    assert_eq!(
        session.state().expect("final session"),
        DesktopOperationalVaultSessionState::Locked,
    );

    let after = fs::symlink_metadata(&vault).expect("post-proof metadata");

    assert_eq!(after.len(), before.len());
    assert_eq!(after.ino(), before.ino());
    assert_eq!(after.mtime(), before.mtime());

    assert_eq!(after.permissions().mode() & 0o777, 0o600,);

    assert_eq!(sha256(&vault), before_sha,);

    assert_eq!(sha256(&descriptor), descriptor_sha_before,);

    assert!(!temporary.exists());

    println!("PHYSICAL_M1_FRESH_V2_RESTART_PROOF=GREEN");
    println!("PHYSICAL_DEVICE_ID={}", identity.device_id.as_str(),);
    println!(
        "PHYSICAL_DEVICE_PUBLIC_KEY={}",
        identity.device_public_key.as_str(),
    );
    println!("PHYSICAL_V2_SHA256={before_sha}");
    println!("PUBLIC_DESCRIPTOR_SHA256={descriptor_sha_before}");
    println!("PHYSICAL_VAULT_REWRITE=NO");
    println!("PHYSICAL_VAULT_REPLACEMENT=NO");
    println!("DEVICE_SIGNING_SEED_OUTPUT=NO");
    println!("VMK_OUTPUT=NO");
    println!("OPERATIONAL_SESSION_LOCKED_AFTER_PROOF=YES");
}
