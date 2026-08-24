//! RO:WHAT — Proves a locked desktop operational session cannot read the persisted Native Passport device public identity.
//!
//! RO:WHY — Device identity used for root authorization must remain unavailable until the native operational session owns the authenticated VMK.
//!
//! RO:INTERACTS — `DesktopOperationalVaultSessionStore`, the authenticated V2 device-identity reader, and the canonical `NativeVaultStore` boundary.
//!
//! RO:INVARIANTS — locked session fails before vault access; no VMK or device seed escapes native custody; persisted state is not inspected or mutated.
//!
//! RO:METRICS — none.
//!
//! RO:CONFIG — deterministic zero-state test only; no physical Passport or platform storage.
//!
//! RO:SECURITY — the vault store panics on every operation so successful rejection proves the locked session short-circuits before storage access.
//!
//! RO:TEST — focused Cargo test target of this file.

use crablink_tauri_lib::{
    passport_operational_unlock_runtime::{
        DesktopOperationalVaultSessionState, DesktopOperationalVaultSessionStore,
    },
    passport_vault_v2_migration_runtime::{
        read_desktop_native_passport_session_device_public_identity,
        DesktopSessionDevicePublicIdentityError,
    },
};

use svc_passport::native::{
    NativeEncryptedVaultV1, NativePlatformStorageError, NativeVaultRecoveryOutcome,
    NativeVaultRemovalOutcome, NativeVaultStore,
};

/// Vault implementation that must never be touched by the locked-session path.
struct ForbiddenVaultStore;

impl NativeVaultStore for ForbiddenVaultStore {
    fn load_encrypted_vault(
        &self,
    ) -> Result<Option<NativeEncryptedVaultV1>, NativePlatformStorageError> {
        panic!("locked device-identity reader must not load the vault")
    }

    fn write_encrypted_vault_atomic(
        &self,
        _vault: &NativeEncryptedVaultV1,
    ) -> Result<(), NativePlatformStorageError> {
        panic!("locked device-identity reader must not write the vault")
    }

    fn recover_interrupted_write(
        &self,
    ) -> Result<NativeVaultRecoveryOutcome, NativePlatformStorageError> {
        panic!("locked device-identity reader must not recover storage")
    }

    fn remove_encrypted_vault(
        &self,
    ) -> Result<NativeVaultRemovalOutcome, NativePlatformStorageError> {
        panic!("locked device-identity reader must not remove the vault")
    }
}

#[test]
fn physical_m1_locked_session_blocks_device_identity_before_vault_access() {
    let session = DesktopOperationalVaultSessionStore::default();

    assert_eq!(
        session.state().expect("locked session state"),
        DesktopOperationalVaultSessionState::Locked,
    );

    assert_eq!(
        read_desktop_native_passport_session_device_public_identity(&ForbiddenVaultStore, &session,),
        Err(DesktopSessionDevicePublicIdentityError::OperationalSessionUnavailable,),
    );

    assert_eq!(
        session.state().expect("session remains locked"),
        DesktopOperationalVaultSessionState::Locked,
    );
}

#[test]
fn physical_m1_locked_reader_source_keeps_session_gate_ahead_of_vault_access() {
    let source = include_str!("../src/passport_vault_v2_migration_runtime.rs");

    let session_gate = source
        .find("with_operational_vmk_for_vault_migration")
        .expect("operational-session VMK gate");

    let stored_reader = source
        .find("read_stored_v2_device_public_identity")
        .expect("stored V2 device reader");

    assert!(
        session_gate < stored_reader,
        "operational session gate must remain ahead of persisted V2 device access",
    );

    assert!(
        source.contains("DesktopSessionDevicePublicIdentityError::OperationalSessionUnavailable"),
        "locked session must map to the canonical public error",
    );
}
