//! RO:WHAT — Inspects whether the desktop Native Passport VaultStore contains a bounded encrypted vault.
//! RO:WHY — Lets `passport_status` report truthful persisted state instead of always reporting NoPassport.
//! RO:INTERACTS — NativeVaultStore, DesktopAtomicVaultStore, AppState, and the redacted Tauri status command.
//! RO:INVARIANTS — absence maps to NoPassport; a valid encrypted envelope maps to Locked; storage failure fails closed.
//! RO:SECURITY — read-only inspection; no PlatformSealer access, decryption, unlock, identity parsing, secret output, or storage mutation.
//! RO:TEST — tests/phase15p_real_stored_status_app_state_wiring.rs.

use svc_passport::native::{
    load_native_encrypted_vault, NativePlatformStorageError, NativeVaultStore,
};

pub const NATIVE_PASSPORT_PHASE15P_LABEL: &str =
    "NATIVE_PASSPORT_PHASE15P_REAL_STORED_STATUS_APP_STATE_WIRING";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StoredPassportStatus {
    NoPassport,
    Locked,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StoredPassportStatusRuntimePosture {
    pub phase_label: &'static str,
    pub managed_vault_store_read: bool,
    pub absent_vault_maps_to_no_passport: bool,
    pub encrypted_vault_maps_to_locked: bool,
    pub bounded_encrypted_load_reused: bool,
    pub storage_errors_fail_closed: bool,
    pub platform_sealer_accessed: bool,
    pub vault_decryption_added: bool,
    pub vault_identity_parsing_added: bool,
    pub unlock_added: bool,
    pub root_confirmation_added: bool,
    pub storage_mutation_added: bool,
    pub frontend_secret_custody_added: bool,
    pub capability_issuance_added: bool,
    pub wallet_or_ledger_mutation_added: bool,
}

pub fn stored_passport_status_runtime_posture() -> StoredPassportStatusRuntimePosture {
    StoredPassportStatusRuntimePosture {
        phase_label: NATIVE_PASSPORT_PHASE15P_LABEL,
        managed_vault_store_read: true,
        absent_vault_maps_to_no_passport: true,
        encrypted_vault_maps_to_locked: true,
        bounded_encrypted_load_reused: true,
        storage_errors_fail_closed: true,
        platform_sealer_accessed: false,
        vault_decryption_added: false,
        vault_identity_parsing_added: false,
        unlock_added: false,
        root_confirmation_added: false,
        storage_mutation_added: false,
        frontend_secret_custody_added: false,
        capability_issuance_added: false,
        wallet_or_ledger_mutation_added: false,
    }
}

pub fn inspect_stored_passport_status(
    store: &impl NativeVaultStore,
) -> Result<StoredPassportStatus, NativePlatformStorageError> {
    match load_native_encrypted_vault(store)? {
        Some(encrypted_vault) => {
            drop(encrypted_vault);
            Ok(StoredPassportStatus::Locked)
        }
        None => Ok(StoredPassportStatus::NoPassport),
    }
}
