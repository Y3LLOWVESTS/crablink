//! RO:WHAT — Focused durability tests for the Physical M1 public Passport descriptor sidecar.
//! RO:WHY — Proves the canonical public Passport subject survives process reconstruction without another RecoveryRoot unseal.
//! RO:INTERACTS — DesktopPublicPassportDescriptorStore, PassportIdV1, Ed25519PublicKeyHex, filesystem durability, and canonical Passport-ID validation.
//! RO:INVARIANTS — immutable/no-clobber identity; same identity idempotent; conflicts fail closed; corruption/schema/version/unknown-field drift rejected.
//! RO:SECURITY — public test vectors only; no vault, Keychain, recovery material, PIN, Tauri command, username, wallet, ledger, or network mutation.
//! RO:TEST — cargo test --test physical_m1_public_identity_store.

use std::{
    fs,
    path::PathBuf,
    sync::atomic::{AtomicU64, Ordering},
    time::{SystemTime, UNIX_EPOCH},
};

use crablink_tauri_lib::passport_public_identity_store::{
    DesktopPublicPassportDescriptorStore, DesktopPublicPassportDescriptorStoreError,
    PublicDescriptorPersistOutcome, PUBLIC_DESCRIPTOR_FILE_NAME, PUBLIC_DESCRIPTOR_SCHEMA_V1,
    PUBLIC_DESCRIPTOR_VERSION_V1,
};

use svc_passport::native::{Ed25519PublicKeyHex, PassportIdV1, RootPassportDescriptorV1};

static TEST_DIRECTORY_COUNTER: AtomicU64 = AtomicU64::new(0);

const PASSPORT_ID: &str =
    "passport:v1:main:ed25519:b3:acc2761e583fafc93cbb880bef1bd7285f43b3bbf326b9e185b226c5533cb7df";

const ROOT_PUBLIC_KEY: &str = "3d7f7a7cf1ca3e1af8e812d2ac349b13770d152c3f26b72560ee6870b9dec909";

const OTHER_ROOT_PUBLIC_KEY: &str =
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

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

fn canonical_descriptor() -> RootPassportDescriptorV1 {
    RootPassportDescriptorV1 {
        passport_id: PassportIdV1::parse(PASSPORT_ID).expect("Passport ID"),
        root_public_key: Ed25519PublicKeyHex::parse(ROOT_PUBLIC_KEY).expect("root public key"),
        optional_handle: None,
    }
}

#[test]
fn public_descriptor_roundtrips_across_store_reconstruction() {
    let directory = TestDirectory::new("physical-m1-public-descriptor-restart");

    let first_store =
        DesktopPublicPassportDescriptorStore::new(directory.path.clone()).expect("first store");

    let descriptor = canonical_descriptor();

    assert_eq!(
        first_store.persist_once(&descriptor,).expect("persist"),
        PublicDescriptorPersistOutcome::Written,
    );

    drop(first_store);

    let restarted_store =
        DesktopPublicPassportDescriptorStore::new(directory.path.clone()).expect("restart store");

    assert_eq!(
        restarted_store.load().expect("restart load"),
        Some(descriptor),
    );

    assert!(restarted_store.temporary_path().exists() == false,);
}

#[test]
fn same_identity_is_idempotent_and_conflicting_identity_is_rejected() {
    let directory = TestDirectory::new("physical-m1-public-descriptor-conflict");

    let store = DesktopPublicPassportDescriptorStore::new(directory.path.clone()).expect("store");

    let descriptor = canonical_descriptor();

    assert_eq!(
        store.persist_once(&descriptor,).expect("first write"),
        PublicDescriptorPersistOutcome::Written,
    );

    assert_eq!(
        store.persist_once(&descriptor,).expect("idempotent write"),
        PublicDescriptorPersistOutcome::AlreadyPresent,
    );

    let conflicting = RootPassportDescriptorV1 {
        passport_id: descriptor.passport_id.clone(),
        root_public_key: Ed25519PublicKeyHex::parse(OTHER_ROOT_PUBLIC_KEY).expect("other key"),
        optional_handle: None,
    };

    assert_eq!(
        store.persist_once(&conflicting,),
        Err(DesktopPublicPassportDescriptorStoreError::PassportIdRootKeyMismatch,),
    );

    assert_eq!(store.load().expect("original survives"), Some(descriptor),);
}

#[test]
fn corrupted_schema_version_and_unknown_fields_fail_closed() {
    for (
        label,
        body,
        expected,
    ) in [
        (
            "schema",
            format!(
                "{{\"schema\":\"wrong\",\"version\":1,\"passport_id\":\"{PASSPORT_ID}\",\"root_public_key\":\"{ROOT_PUBLIC_KEY}\"}}",
            ),
            DesktopPublicPassportDescriptorStoreError::
                SchemaMismatch,
        ),
        (
            "version",
            format!(
                "{{\"schema\":\"{PUBLIC_DESCRIPTOR_SCHEMA_V1}\",\"version\":{},\"passport_id\":\"{PASSPORT_ID}\",\"root_public_key\":\"{ROOT_PUBLIC_KEY}\"}}",
                PUBLIC_DESCRIPTOR_VERSION_V1 + 1,
            ),
            DesktopPublicPassportDescriptorStoreError::
                VersionMismatch,
        ),
        (
            "unknown",
            format!(
                "{{\"schema\":\"{PUBLIC_DESCRIPTOR_SCHEMA_V1}\",\"version\":1,\"passport_id\":\"{PASSPORT_ID}\",\"root_public_key\":\"{ROOT_PUBLIC_KEY}\",\"unexpected\":true}}",
            ),
            DesktopPublicPassportDescriptorStoreError::
                DecodeFailed,
        ),
    ] {
        let directory =
            TestDirectory::new(
                label,
            );

        let store =
            DesktopPublicPassportDescriptorStore::new(
                directory.path.clone(),
            )
            .expect("store");

        fs::write(
            directory
                .path
                .join(
                    PUBLIC_DESCRIPTOR_FILE_NAME,
                ),
            body,
        )
        .expect("write malformed descriptor");

        assert_eq!(
            store.load(),
            Err(expected),
        );
    }
}

#[test]
fn malformed_identity_binding_fails_closed() {
    let directory = TestDirectory::new("physical-m1-public-descriptor-binding");

    let store = DesktopPublicPassportDescriptorStore::new(directory.path.clone()).expect("store");

    let body =
        format!(
            "{{\"schema\":\"{PUBLIC_DESCRIPTOR_SCHEMA_V1}\",\"version\":1,\"passport_id\":\"{PASSPORT_ID}\",\"root_public_key\":\"{OTHER_ROOT_PUBLIC_KEY}\"}}",
        );

    fs::write(directory.path.join(PUBLIC_DESCRIPTOR_FILE_NAME), body)
        .expect("write mismatched descriptor");

    assert_eq!(
        store.load(),
        Err(DesktopPublicPassportDescriptorStoreError::PassportIdRootKeyMismatch,),
    );
}

#[test]
fn public_descriptor_clear_removes_sidecar_and_is_idempotent() {
    let directory = TestDirectory::new("physical-m1-public-descriptor-clear");

    let store = DesktopPublicPassportDescriptorStore::new(directory.path.clone())
        .expect("public descriptor store");

    let descriptor = canonical_descriptor();

    assert_eq!(
        store
            .persist_once(&descriptor,)
            .expect("persist descriptor"),
        PublicDescriptorPersistOutcome::Written,
    );

    assert!(store.descriptor_path().exists(),);

    assert_eq!(store.clear().expect("first clear"), true,);

    assert!(!store.descriptor_path().exists(),);

    assert!(!store.temporary_path().exists(),);

    assert_eq!(store.load().expect("load after clear"), None,);

    assert_eq!(store.clear().expect("idempotent clear"), false,);
}
