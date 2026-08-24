//! RO:WHAT — Focused durability and fail-closed tests for the Physical M1 public DeviceAuthorization store.
//!
//! RO:WHY — Proves a real root-signed authorization can survive restart without modifying the encrypted Passport vault or becoming trusted merely because JSON parses.
//!
//! RO:INTERACTS — DesktopDeviceAuthorizationStore, ron-proto DeviceAuthorizationV1, svc-passport recovery signer/public identity derivation, and ron-auth strict verification.
//!
//! RO:INVARIANTS — strict verify before write and after restart; current device binding required; same record idempotent; conflicting/tampered/corrupt records reject.
//!
//! RO:METRICS — none.
//!
//! RO:CONFIG — deterministic nonphysical root/device fixtures only.
//!
//! RO:SECURITY — no physical Passport, Keychain, PIN, network, capability, username, wallet, or ledger mutation.
//!
//! RO:TEST — cargo test --test physical_m1_device_authorization_store.

use std::{
    fs,
    path::PathBuf,
    sync::atomic::{AtomicU64, Ordering},
    time::{SystemTime, UNIX_EPOCH},
};

use crablink_tauri_lib::passport_device_authorization_store::{
    DesktopDeviceAuthorizationStore, DesktopDeviceAuthorizationStoreError,
    DesktopDeviceAuthorizationVerificationContextV1, DeviceAuthorizationPersistOutcome,
    DEVICE_AUTHORIZATION_FILE_NAME, DEVICE_AUTHORIZATION_STORE_SCHEMA_V1,
    DEVICE_AUTHORIZATION_STORE_VERSION_V1, PHYSICAL_M1_DEVICE_AUTHORIZATION_STORE_LABEL,
};

use ron_proto::{
    DeviceAuthorizationNonceV1, DeviceAuthorizationScopeCeilingV1,
    DeviceAuthorizationSigningPayloadV1, DeviceClassV1, DeviceIdV1 as ProtoDeviceIdV1,
    Ed25519PublicKeyHex as ProtoEd25519PublicKeyHex, NativePassportContextLabelV1,
    NativePassportScopeV1, PassportIdV1 as ProtoPassportIdV1, DEVICE_AUTHORIZATION_V1_VERSION,
};

use svc_passport::native::{
    derive_native_device_public_identity_v1, derive_native_recovery_public_identity_v1,
    sign_native_recovery_device_authorization_v1, NativeDevicePublicIdentityV1, NativeSecretBytes,
    RootPassportDescriptorV1,
};

static TEST_DIRECTORY_COUNTER: AtomicU64 = AtomicU64::new(0);

const ISSUED_AT_MS: u64 = 1_800_000_000_000;
const VERIFY_AT_MS: u64 = 1_800_000_000_100;

struct TestDirectory {
    path: PathBuf,
}

impl TestDirectory {
    fn new(label: &str) -> Self {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("clock")
            .as_nanos();

        let counter = TEST_DIRECTORY_COUNTER.fetch_add(1, Ordering::SeqCst);

        let path = std::env::temp_dir().join(format!(
            "crablink-{label}-{}-{timestamp}-{counter}",
            std::process::id(),
        ));

        fs::create_dir_all(&path).expect("create test directory");

        Self { path }
    }
}

impl Drop for TestDirectory {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.path);
    }
}

fn recovery_factor() -> NativeSecretBytes {
    NativeSecretBytes::new(vec![0x22; 32]).expect("test RecoveryRoot factor")
}

fn device_seed(byte: u8) -> NativeSecretBytes {
    NativeSecretBytes::new(vec![byte; 32]).expect("test device seed")
}

fn trusted_root() -> RootPassportDescriptorV1 {
    derive_native_recovery_public_identity_v1(&recovery_factor()).expect("trusted root")
}

fn device_identity(byte: u8) -> NativeDevicePublicIdentityV1 {
    derive_native_device_public_identity_v1(&device_seed(byte)).expect("device identity")
}

fn scope_ceiling() -> DeviceAuthorizationScopeCeilingV1 {
    DeviceAuthorizationScopeCeilingV1::new(vec![
        NativePassportScopeV1::parse("identity.read").expect("scope")
    ])
    .expect("scope ceiling")
}

fn signed_authorization(nonce_first_byte: u8) -> ron_proto::DeviceAuthorizationV1 {
    let recovery = recovery_factor();

    let root = derive_native_recovery_public_identity_v1(&recovery).expect("root");

    let device = device_identity(0x42);

    let mut nonce = [
        0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e,
        0x0f,
    ];

    nonce[0] = nonce_first_byte;

    let payload = DeviceAuthorizationSigningPayloadV1 {
        version: DEVICE_AUTHORIZATION_V1_VERSION,

        network_id: NativePassportContextLabelV1::parse("rustyonions-devnet").expect("network"),

        environment: NativePassportContextLabelV1::parse("private-beta").expect("environment"),

        passport_id: ProtoPassportIdV1::parse(root.passport_id.as_str()).expect("Passport ID"),

        root_key_epoch: 0,

        device_id: ProtoDeviceIdV1::parse(device.device_id.as_str()).expect("Device ID"),

        device_public_key: ProtoEd25519PublicKeyHex::parse(device.device_public_key.as_str())
            .expect("device public key"),

        device_class: DeviceClassV1::RootAdminDesktop,

        authorized_scope_ceiling: scope_ceiling(),

        authorization_nonce: DeviceAuthorizationNonceV1::from_bytes(nonce),

        issued_at_ms: ISSUED_AT_MS,

        expires_at_ms: None,
    };

    sign_native_recovery_device_authorization_v1(&recovery, payload).expect("signed authorization")
}

fn verification_context<'a>(
    root: &'a RootPassportDescriptorV1,
    device: &'a NativeDevicePublicIdentityV1,
) -> DesktopDeviceAuthorizationVerificationContextV1<'a> {
    DesktopDeviceAuthorizationVerificationContextV1 {
        trusted_root: root,
        expected_device: device,
        expected_network_id: "rustyonions-devnet",
        expected_environment: "private-beta",
        trusted_root_key_epoch: 0,
        now_ms: VERIFY_AT_MS,
        max_clock_skew_ms: 0,
    }
}

#[test]
fn physical_m1_signed_authorization_roundtrips_after_store_reconstruction() {
    assert_eq!(
        PHYSICAL_M1_DEVICE_AUTHORIZATION_STORE_LABEL,
        "PHYSICAL_M1_DEVICE_AUTHORIZATION_PUBLIC_STORE_V1",
    );

    let directory = TestDirectory::new("device-auth-restart");

    let root = trusted_root();
    let device = device_identity(0x42);
    let authorization = signed_authorization(0x00);

    let first_store =
        DesktopDeviceAuthorizationStore::new(directory.path.clone()).expect("first store");

    assert_eq!(
        first_store
            .persist_verified_once(&authorization, verification_context(&root, &device),)
            .expect("persist"),
        DeviceAuthorizationPersistOutcome::Written,
    );

    assert!(!first_store.temporary_path().exists());

    drop(first_store);

    let restarted =
        DesktopDeviceAuthorizationStore::new(directory.path.clone()).expect("restarted store");

    assert_eq!(
        restarted
            .load_verified(verification_context(&root, &device),)
            .expect("verified restart load"),
        Some(authorization),
    );

    assert!(!restarted.temporary_path().exists());
}

#[test]
fn physical_m1_same_authorization_is_idempotent_and_different_authorization_conflicts() {
    let directory = TestDirectory::new("device-auth-conflict");

    let root = trusted_root();
    let device = device_identity(0x42);

    let first = signed_authorization(0x00);
    let second = signed_authorization(0x55);

    let store = DesktopDeviceAuthorizationStore::new(directory.path.clone()).expect("store");

    assert_eq!(
        store
            .persist_verified_once(&first, verification_context(&root, &device),)
            .expect("first persist"),
        DeviceAuthorizationPersistOutcome::Written,
    );

    assert_eq!(
        store
            .persist_verified_once(&first, verification_context(&root, &device),)
            .expect("idempotent persist"),
        DeviceAuthorizationPersistOutcome::AlreadyPresent,
    );

    assert_eq!(
        store.persist_verified_once(&second, verification_context(&root, &device),),
        Err(DesktopDeviceAuthorizationStoreError::AuthorizationConflict,),
    );

    assert_eq!(
        store
            .load_verified(verification_context(&root, &device),)
            .expect("original survives"),
        Some(first),
    );
}

#[test]
fn physical_m1_wrong_local_device_binding_fails_closed() {
    let directory = TestDirectory::new("device-auth-device-binding");

    let root = trusted_root();
    let device = device_identity(0x42);
    let wrong_device = device_identity(0x43);
    let authorization = signed_authorization(0x00);

    let store = DesktopDeviceAuthorizationStore::new(directory.path.clone()).expect("store");

    assert_eq!(
        store
            .persist_verified_once(&authorization, verification_context(&root, &device),)
            .expect("persist"),
        DeviceAuthorizationPersistOutcome::Written,
    );

    assert_eq!(
        store.load_verified(verification_context(&root, &wrong_device),),
        Err(DesktopDeviceAuthorizationStoreError::DeviceBindingMismatch,),
    );
}

#[test]
fn physical_m1_tampered_signed_record_fails_strict_verification_after_restart() {
    let directory = TestDirectory::new("device-auth-tamper");

    let root = trusted_root();
    let device = device_identity(0x42);
    let authorization = signed_authorization(0x00);

    let store = DesktopDeviceAuthorizationStore::new(directory.path.clone()).expect("store");

    store
        .persist_verified_once(&authorization, verification_context(&root, &device))
        .expect("persist");

    let mut value: serde_json::Value =
        serde_json::from_slice(&fs::read(store.authorization_path()).expect("read stored record"))
            .expect("parse stored JSON");

    value["authorization"]["issued_at_ms"] = serde_json::Value::from(ISSUED_AT_MS + 1);

    fs::write(
        store.authorization_path(),
        serde_json::to_vec(&value).expect("encode tamper"),
    )
    .expect("write tamper");

    let restarted =
        DesktopDeviceAuthorizationStore::new(directory.path.clone()).expect("restart store");

    assert_eq!(
        restarted.load_verified(verification_context(&root, &device),),
        Err(DesktopDeviceAuthorizationStoreError::StrictVerificationFailed,),
    );
}

#[test]
fn physical_m1_schema_version_and_unknown_fields_fail_closed() {
    let root = trusted_root();
    let device = device_identity(0x42);
    let authorization = signed_authorization(0x00);

    for (label, mutate, expected) in [
        (
            "schema",
            "schema",
            DesktopDeviceAuthorizationStoreError::SchemaMismatch,
        ),
        (
            "version",
            "version",
            DesktopDeviceAuthorizationStoreError::VersionMismatch,
        ),
        (
            "unknown",
            "unknown",
            DesktopDeviceAuthorizationStoreError::DecodeFailed,
        ),
    ] {
        let directory = TestDirectory::new(label);

        let store = DesktopDeviceAuthorizationStore::new(directory.path.clone()).expect("store");

        store
            .persist_verified_once(&authorization, verification_context(&root, &device))
            .expect("persist fixture");

        let mut value: serde_json::Value =
            serde_json::from_slice(&fs::read(store.authorization_path()).expect("read fixture"))
                .expect("parse fixture");

        match mutate {
            "schema" => {
                value["schema"] = serde_json::Value::from("wrong");
            }

            "version" => {
                value["version"] =
                    serde_json::Value::from(DEVICE_AUTHORIZATION_STORE_VERSION_V1 + 1);
            }

            "unknown" => {
                value["unexpected"] = serde_json::Value::from(true);
            }

            _ => unreachable!(),
        }

        fs::write(
            store.authorization_path(),
            serde_json::to_vec(&value).expect("encode mutation"),
        )
        .expect("write mutation");

        assert_eq!(
            store.load_verified(verification_context(&root, &device),),
            Err(expected),
        );
    }

    assert_eq!(
        DEVICE_AUTHORIZATION_STORE_SCHEMA_V1,
        "crablink.native-passport.device-authorization-record.v1",
    );
}

#[test]
fn physical_m1_store_contains_public_authority_only_and_clear_is_idempotent() {
    let directory = TestDirectory::new("device-auth-public-only");

    let root = trusted_root();
    let device = device_identity(0x42);
    let authorization = signed_authorization(0x00);

    let store = DesktopDeviceAuthorizationStore::new(directory.path.clone()).expect("store");

    store
        .persist_verified_once(&authorization, verification_context(&root, &device))
        .expect("persist");

    let encoded = fs::read_to_string(store.authorization_path()).expect("stored record");

    for forbidden in [
        "recovery_factor",
        "recovery_phrase",
        "mnemonic",
        "bip39",
        "root_seed",
        "device_seed",
        "operational_vmk",
        "root_vmk",
        "\"pin\"",
        "wallet",
        "ledger",
        "capability_token",
    ] {
        assert!(
            !encoded.to_ascii_lowercase().contains(forbidden),
            "public authorization record leaked forbidden material: {forbidden}",
        );
    }

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;

        let mode = fs::metadata(store.authorization_path())
            .expect("metadata")
            .permissions()
            .mode()
            & 0o777;

        assert_eq!(mode, 0o600);
    }

    assert_eq!(
        fs::metadata(store.authorization_path())
            .expect("record metadata")
            .len()
            <= 16 * 1024,
        true,
    );

    assert_eq!(store.clear().expect("first clear"), true,);

    assert!(!store.authorization_path().exists());
    assert!(!store.temporary_path().exists());

    assert_eq!(store.clear().expect("idempotent clear"), false,);
}

#[test]
fn physical_m1_store_source_has_no_secret_or_network_authority() {
    let source = include_str!("../src/passport_device_authorization_store.rs");

    for required in [
        "verify_device_authorization_v1_strict",
        "DeviceAuthorizationVerificationContextV1",
        "fs::hard_link",
        "file.sync_all()",
        "sync_parent_directory",
        "DeviceBindingMismatch",
        "AuthorizationConflict",
        "serde(deny_unknown_fields)",
    ] {
        assert!(
            source.contains(required),
            "store missing required durability/security marker {required}",
        );
    }

    for forbidden in [
        "#[tauri::command]",
        "tauri::command",
        "NativeSecretBytes",
        "RecoveryRoot",
        "SigningKey",
        "request_root_confirmation_pin",
        "reqwest::",
        "issue_capability(",
        "username.claim(",
        "wallet.spend(",
        "ledger.write(",
    ] {
        assert!(
            !source.contains(forbidden),
            "store gained forbidden authority marker {forbidden}",
        );
    }

    assert!(source.contains(DEVICE_AUTHORIZATION_FILE_NAME),);
}
