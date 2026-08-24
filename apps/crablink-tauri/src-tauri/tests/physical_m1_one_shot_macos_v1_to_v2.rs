//! RO:WHAT — Performs the single SHA-locked Physical M1 macOS Native Passport V1-to-V2 migration against the already-proven desktop migration engine.
//! RO:WHY — The existing physical Passport must receive durable per-device signing identity only after exact V1, descriptor, custody, and atomic-write preconditions are proven.
//! RO:INTERACTS — DesktopAtomicVaultStore, macOS Keychain PlatformSealer, native hidden PIN surface, operational session custody, V1-to-V2 migration runtime, and svc-passport versioned decoding.
//! RO:INVARIANTS — ignored by default; explicit environment opt-in required; exact captured V1 bytes/metadata required; exact public descriptor required; no temp file; only operational factor is unsealed; successful mutation must produce authenticated V2; immediate AlreadyV2 retry must not rewrite.
//! RO:METRICS — prints only redacted migration state, encrypted-vault SHA/size, and version.
//! RO:CONFIG — macOS Physical M1 only; fixed existing CrabLink app-data Native Passport root.
//! RO:SECURITY — PIN remains in the native hidden-answer surface; signing seed and VMK are never printed/exported; Keychain is read-only on this path; no root signing, username, capability, wallet, or ledger mutation.
//! RO:TEST — explicitly ignored; run only with CRABLINK_PHYSICAL_M1_MIGRATE_V1_TO_V2=YES after the exact physical precondition shell gate passes.

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
    passport_operational_unlock_runtime::DesktopOperationalVaultSessionStore,
    passport_platform_sealer::{
        active_macos_keychain_service, MacosKeychainPlatformSealer, PHASE15L_KEYCHAIN_SERVICE,
    },
    passport_vault_store::DesktopAtomicVaultStore,
    passport_vault_v2_migration_runtime::{
        migrate_desktop_native_passport_session_v1_to_v2, DesktopV1ToV2MigrationOutcome,
    },
};

use svc_passport::native::{
    decode_native_platform_bound_vault_versioned, load_native_encrypted_vault,
    NativePlatformBoundVaultVersioned,
};

const OPT_IN_ENV: &str = "CRABLINK_PHYSICAL_M1_MIGRATE_V1_TO_V2";

const EXPECTED_V1_SHA256: &str = "4d592680adf843ddaf0d841d6bc190252a2846be110c2dd472c5e5009a7ebe8e";

const EXPECTED_V1_SIZE: u64 = 926;
const EXPECTED_V1_INODE: u64 = 31_234_217;
const EXPECTED_V1_MTIME: i64 = 1_785_614_293;

const EXPECTED_DESCRIPTOR_SHA256: &str =
    "3f278e6364448bac095787787458e1d2cf8d1cd1ed5638a31b14b3d83743f0b0";

const EXPECTED_DESCRIPTOR_INODE: u64 = 33_230_863;
const EXPECTED_DESCRIPTOR_MTIME: i64 = 1_787_183_005;

fn physical_root() -> PathBuf {
    let home = std::env::var_os("HOME").expect("HOME must exist for Physical M1");

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
        .expect("run system shasum");

    assert!(output.status.success(), "system shasum failed",);

    let stdout = String::from_utf8(output.stdout).expect("shasum output UTF-8");

    stdout
        .split_whitespace()
        .next()
        .expect("shasum digest")
        .to_owned()
}

fn assert_regular_private_file(path: &Path) -> fs::Metadata {
    let metadata = fs::symlink_metadata(path).expect("required physical file metadata");

    assert!(
        !metadata.file_type().is_symlink(),
        "physical file must not be a symlink",
    );

    assert!(metadata.is_file(), "physical path must be a regular file",);

    assert_eq!(
        metadata.permissions().mode() & 0o777,
        0o600,
        "physical file must remain mode 0600",
    );

    metadata
}

fn assert_v1_preconditions(vault: &Path, temporary: &Path, descriptor: &Path) {
    assert_eq!(
        std::env::var(OPT_IN_ENV).as_deref(),
        Ok("YES"),
        "explicit Physical M1 migration opt-in missing",
    );

    assert_eq!(
        active_macos_keychain_service(),
        PHASE15L_KEYCHAIN_SERVICE,
        "Physical M1 must use the canonical production Keychain service",
    );

    assert!(
        !temporary.exists(),
        "physical migration refuses an existing temporary vault file",
    );

    let vault_metadata = assert_regular_private_file(vault);

    assert_eq!(
        vault_metadata.len(),
        EXPECTED_V1_SIZE,
        "physical V1 size changed",
    );

    assert_eq!(
        vault_metadata.ino(),
        EXPECTED_V1_INODE,
        "physical V1 inode changed",
    );

    assert_eq!(
        vault_metadata.mtime(),
        EXPECTED_V1_MTIME,
        "physical V1 mtime changed",
    );

    assert_eq!(
        sha256(vault),
        EXPECTED_V1_SHA256,
        "physical V1 SHA-256 changed",
    );

    let descriptor_metadata = assert_regular_private_file(descriptor);

    assert_eq!(
        descriptor_metadata.ino(),
        EXPECTED_DESCRIPTOR_INODE,
        "public descriptor inode changed",
    );

    assert_eq!(
        descriptor_metadata.mtime(),
        EXPECTED_DESCRIPTOR_MTIME,
        "public descriptor mtime changed",
    );

    assert_eq!(
        sha256(descriptor),
        EXPECTED_DESCRIPTOR_SHA256,
        "public descriptor SHA-256 changed",
    );

    let encoded = load_native_encrypted_vault(
        &DesktopAtomicVaultStore::new(physical_root()).expect("physical desktop VaultStore"),
    )
    .expect("load exact physical V1")
    .expect("physical V1 must exist");

    assert!(matches!(
        decode_native_platform_bound_vault_versioned(&encoded,).expect("decode exact physical V1"),
        NativePlatformBoundVaultVersioned::V1(_),
    ));
}

#[test]
#[ignore = "REAL PHYSICAL PASSPORT MUTATION: requires exact captured V1 fingerprint and explicit environment opt-in"]
fn physical_m1_sha_locked_one_shot_macos_v1_to_v2_migration() {
    let root = physical_root();

    let vault = root.join("passport.vault.bin");

    let temporary = root.join("passport.vault.bin.tmp");

    let descriptor = root.join("passport.public-identity.json");

    assert_v1_preconditions(&vault, &temporary, &descriptor);

    let store = DesktopAtomicVaultStore::new(root.clone()).expect("physical desktop VaultStore");

    let sealer = MacosKeychainPlatformSealer::new();

    let session = DesktopOperationalVaultSessionStore::default();

    let surface = MacosHiddenAnswerNativeSecretSurface;

    let unlock = unlock_desktop_native_passport_operational_from_native_surface(
        &store, &sealer, &session, &surface,
    );

    assert_eq!(
        unlock.state,
        DesktopOperationalUnlockCommandState::OperationalUnlocked,
        "physical V1 operational unlock must succeed before mutation",
    );

    assert!(
        unlock.native_secure_input_requested,
        "physical migration must use the native hidden PIN surface",
    );

    let outcome = migrate_desktop_native_passport_session_v1_to_v2(&store, &session)
        .expect("physical V1-to-V2 migration");

    assert_eq!(
        outcome,
        DesktopV1ToV2MigrationOutcome::Migrated,
        "one-shot physical migration must report durable Migrated",
    );

    assert!(
        !temporary.exists(),
        "atomic migration must leave no temporary vault file",
    );

    let v2_metadata = assert_regular_private_file(&vault);

    assert_ne!(
        sha256(&vault),
        EXPECTED_V1_SHA256,
        "V2 must not equal the original V1 bytes",
    );

    let encoded_v2 = load_native_encrypted_vault(&store)
        .expect("load physical V2")
        .expect("physical V2 must exist");

    assert!(matches!(
        decode_native_platform_bound_vault_versioned(&encoded_v2,).expect("decode physical V2"),
        NativePlatformBoundVaultVersioned::V2(_),
    ));

    assert_eq!(
        sha256(&descriptor),
        EXPECTED_DESCRIPTOR_SHA256,
        "public Passport descriptor must remain byte-identical",
    );

    let committed_v2_sha = sha256(&vault);

    let committed_v2_size = v2_metadata.len();

    let retry = migrate_desktop_native_passport_session_v1_to_v2(&store, &session)
        .expect("AlreadyV2 validation");

    assert_eq!(
        retry,
        DesktopV1ToV2MigrationOutcome::AlreadyV2,
        "immediate V2 validation must be idempotent",
    );

    assert_eq!(
        sha256(&vault),
        committed_v2_sha,
        "AlreadyV2 validation must not rewrite the physical vault",
    );

    assert!(
        !temporary.exists(),
        "AlreadyV2 validation must not create a temp file",
    );

    assert!(
        session
            .lock()
            .expect("drop physical operational VMK session"),
        "successful migration session must lock explicitly",
    );

    println!("PHYSICAL_M1_ONE_SHOT_TEST=GREEN");
    println!("PHYSICAL_V2_SHA256={committed_v2_sha}");
    println!("PHYSICAL_V2_SIZE_BYTES={committed_v2_size}");
    println!("PHYSICAL_V2_VERSION=2");
    println!("PUBLIC_DESCRIPTOR_SHA256={EXPECTED_DESCRIPTOR_SHA256}");
    println!("PUBLIC_DESCRIPTOR_MUTATED=NO");
    println!("KEYCHAIN_WRITE=NO");
    println!("OPERATIONAL_SESSION_LOCKED_AFTER_MIGRATION=YES");
}
