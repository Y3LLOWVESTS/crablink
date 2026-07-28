//! RO:WHAT — Resolves and initializes the desktop Native Passport VaultStore under Tauri app data.
//! RO:WHY — Phase 15K wires the durable encrypted store into desktop startup and performs interrupted-write recovery before commands run.
//! RO:INTERACTS — Tauri path resolution, AppState, DesktopAtomicVaultStore, and Phase 15I recovery contracts.
//! RO:INVARIANTS — fixed native-passport child directory, absolute app-data root, encrypted storage only, fail-closed startup recovery.
//! RO:SECURITY — no decryption, PIN handling, platform unseal, secret export, capability issuance, wallet mutation, or React DTO.
//! RO:TEST — tests/phase15k_windows_atomic_replace_and_app_data_store_wiring.rs.

use std::path::{Path, PathBuf};

use svc_passport::native::{
    recover_native_interrupted_vault_write, NativePlatformStorageError,
    NativePlatformStorageOperation, NativeVaultRecoveryOutcome,
};

use crate::passport_vault_store::{DesktopAtomicVaultStore, PHASE15J_VAULT_DIRECTORY_NAME};

pub const NATIVE_PASSPORT_PHASE15K_LABEL: &str =
    "NATIVE_PASSPORT_PHASE15K_WINDOWS_ATOMIC_REPLACE_AND_APP_DATA_STORE_WIRING";

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DesktopPassportVaultRuntimePosture {
    pub phase_label: &'static str,
    pub windows_replace_existing_added: bool,
    pub windows_write_through_added: bool,
    pub tauri_app_data_root_used: bool,
    pub fixed_native_passport_child_directory: bool,
    pub startup_interrupted_write_recovery_added: bool,
    pub app_state_store_wiring_added: bool,
    pub encrypted_vault_only: bool,
    pub platform_sealer_added: bool,
    pub decryption_runtime_added: bool,
    pub pin_unlock_added: bool,
    pub command_storage_mutation_added: bool,
    pub frontend_secret_custody_added: bool,
    pub wallet_or_ledger_mutation_added: bool,
}

pub fn desktop_passport_vault_runtime_posture() -> DesktopPassportVaultRuntimePosture {
    DesktopPassportVaultRuntimePosture {
        phase_label: NATIVE_PASSPORT_PHASE15K_LABEL,
        windows_replace_existing_added: true,
        windows_write_through_added: true,
        tauri_app_data_root_used: true,
        fixed_native_passport_child_directory: true,
        startup_interrupted_write_recovery_added: true,
        app_state_store_wiring_added: true,
        encrypted_vault_only: true,
        platform_sealer_added: false,
        decryption_runtime_added: false,
        pin_unlock_added: false,
        command_storage_mutation_added: false,
        frontend_secret_custody_added: false,
        wallet_or_ledger_mutation_added: false,
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DesktopPassportVaultInitialization {
    pub store: DesktopAtomicVaultStore,
    pub recovery_outcome: NativeVaultRecoveryOutcome,
}

pub fn desktop_passport_vault_root(
    app_data_directory: &Path,
) -> Result<PathBuf, NativePlatformStorageError> {
    if app_data_directory.as_os_str().is_empty() || !app_data_directory.is_absolute() {
        return Err(NativePlatformStorageError::BackendFailure {
            operation: NativePlatformStorageOperation::LoadEncryptedVault,
        });
    }

    Ok(app_data_directory.join(PHASE15J_VAULT_DIRECTORY_NAME))
}

pub fn initialize_desktop_passport_vault_store(
    app_data_directory: &Path,
) -> Result<DesktopPassportVaultInitialization, NativePlatformStorageError> {
    let vault_root = desktop_passport_vault_root(app_data_directory)?;

    let store = DesktopAtomicVaultStore::new(vault_root)?;

    let recovery_outcome = recover_native_interrupted_vault_write(&store)?;

    Ok(DesktopPassportVaultInitialization {
        store,
        recovery_outcome,
    })
}
