//! RO:WHAT — Implements CrabLink desktop encrypted Native Passport vault persistence.
//! RO:WHY — Phase 15J provides durable atomic storage behind the Phase 15I `NativeVaultStore` trait.
//! RO:INTERACTS — svc-passport encrypted-vault envelopes, future Tauri Passport runtime state, and the desktop app-data directory.
//! RO:INVARIANTS — fixed filenames; encrypted envelopes only; bounded reads; temporary-file sync before rename; directory sync after rename; explicit interrupted-write recovery.
//! RO:SECURITY — rejects symlink/non-file targets, never logs bytes or paths, and does not decrypt, unlock, seal, issue capabilities, or expose material to React.
//! RO:TEST — tests/phase15j_desktop_atomic_vault_store.rs.

use std::{
    fs::{self, File, OpenOptions},
    io::Write,
    path::{Path, PathBuf},
};

#[cfg(unix)]
use std::os::unix::fs::{OpenOptionsExt, PermissionsExt};

#[cfg(windows)]
use std::os::windows::ffi::OsStrExt;

use svc_passport::native::{
    NativeEncryptedVaultV1, NativePlatformStorageError, NativePlatformStorageOperation,
    NativeVaultRecoveryOutcome, NativeVaultRemovalOutcome, NativeVaultStore,
    PHASE15I_MAX_ENCRYPTED_VAULT_BYTES,
};

pub const NATIVE_PASSPORT_PHASE15J_LABEL: &str =
    "NATIVE_PASSPORT_PHASE15J_DESKTOP_ATOMIC_VAULT_STORE_ADAPTER";

pub const PHASE15J_VAULT_DIRECTORY_NAME: &str = "native-passport";

pub const PHASE15J_VAULT_FILE_NAME: &str = "passport.vault.bin";

pub const PHASE15J_TEMPORARY_FILE_NAME: &str = "passport.vault.bin.tmp";

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DesktopAtomicVaultStorePosture {
    pub phase_label: &'static str,
    pub encrypted_vault_only: bool,
    pub fixed_paths: bool,
    pub bounded_reads: bool,
    pub temporary_file_create_new: bool,
    pub temporary_file_sync: bool,
    pub parent_directory_sync: bool,
    pub atomic_rename: bool,
    pub interrupted_write_recovery: bool,
    pub stale_temporary_file_cleanup: bool,
    pub symlink_targets_rejected: bool,
    pub unix_private_permissions: bool,
    pub windows_existing_destination_replace_added: bool,
    pub app_runtime_state_wired: bool,
    pub passport_commands_wired: bool,
    pub decryption_runtime_added: bool,
    pub platform_sealer_added: bool,
    pub frontend_secret_custody_added: bool,
    pub wallet_or_ledger_mutation_added: bool,
}

pub fn desktop_atomic_vault_store_posture() -> DesktopAtomicVaultStorePosture {
    DesktopAtomicVaultStorePosture {
        phase_label: NATIVE_PASSPORT_PHASE15J_LABEL,
        encrypted_vault_only: true,
        fixed_paths: true,
        bounded_reads: true,
        temporary_file_create_new: true,
        temporary_file_sync: true,
        parent_directory_sync: cfg!(unix),
        atomic_rename: cfg!(unix),
        interrupted_write_recovery: true,
        stale_temporary_file_cleanup: true,
        symlink_targets_rejected: true,
        unix_private_permissions: cfg!(unix),
        windows_existing_destination_replace_added: false,
        app_runtime_state_wired: false,
        passport_commands_wired: false,
        decryption_runtime_added: false,
        platform_sealer_added: false,
        frontend_secret_custody_added: false,
        wallet_or_ledger_mutation_added: false,
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DesktopAtomicVaultStore {
    root_directory: PathBuf,
    vault_path: PathBuf,
    temporary_path: PathBuf,
}

impl DesktopAtomicVaultStore {
    pub fn new(root_directory: impl Into<PathBuf>) -> Result<Self, NativePlatformStorageError> {
        let root_directory = root_directory.into();

        if root_directory.as_os_str().is_empty() || !root_directory.is_absolute() {
            return Err(backend_failure(
                NativePlatformStorageOperation::LoadEncryptedVault,
            ));
        }

        Ok(Self {
            vault_path: root_directory.join(PHASE15J_VAULT_FILE_NAME),
            temporary_path: root_directory.join(PHASE15J_TEMPORARY_FILE_NAME),
            root_directory,
        })
    }

    pub fn root_directory(&self) -> &Path {
        &self.root_directory
    }

    pub fn vault_path(&self) -> &Path {
        &self.vault_path
    }

    pub fn temporary_path(&self) -> &Path {
        &self.temporary_path
    }

    fn ensure_root_directory(
        &self,
        operation: NativePlatformStorageOperation,
    ) -> Result<(), NativePlatformStorageError> {
        fs::create_dir_all(&self.root_directory).map_err(|_| backend_failure(operation))?;

        let exists = self.ensure_existing_root_directory(operation)?;

        if !exists {
            return Err(backend_failure(operation));
        }

        Ok(())
    }

    fn ensure_existing_root_directory(
        &self,
        operation: NativePlatformStorageOperation,
    ) -> Result<bool, NativePlatformStorageError> {
        let metadata = match fs::symlink_metadata(&self.root_directory) {
            Ok(metadata) => metadata,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                return Ok(false);
            }
            Err(_) => {
                return Err(backend_failure(operation));
            }
        };

        if metadata.file_type().is_symlink() || !metadata.is_dir() {
            return Err(backend_failure(operation));
        }

        secure_directory_permissions(&self.root_directory, operation)?;

        Ok(true)
    }

    fn regular_file_exists(
        &self,
        path: &Path,
        operation: NativePlatformStorageOperation,
    ) -> Result<bool, NativePlatformStorageError> {
        match fs::symlink_metadata(path) {
            Ok(metadata) => {
                if metadata.file_type().is_symlink() || !metadata.is_file() {
                    return Err(backend_failure(operation));
                }

                Ok(true)
            }
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(false),
            Err(_) => Err(backend_failure(operation)),
        }
    }

    fn read_encrypted_vault_file(
        &self,
        path: &Path,
        operation: NativePlatformStorageOperation,
    ) -> Result<NativeEncryptedVaultV1, NativePlatformStorageError> {
        if !self.regular_file_exists(path, operation)? {
            return Err(backend_failure(operation));
        }

        let metadata = fs::metadata(path).map_err(|_| backend_failure(operation))?;

        let actual = usize::try_from(metadata.len()).unwrap_or(usize::MAX);

        if actual > PHASE15I_MAX_ENCRYPTED_VAULT_BYTES {
            return Err(NativePlatformStorageError::EncryptedVaultTooLarge {
                actual,
                maximum: PHASE15I_MAX_ENCRYPTED_VAULT_BYTES,
            });
        }

        let bytes = fs::read(path).map_err(|_| backend_failure(operation))?;

        NativeEncryptedVaultV1::new(bytes)
    }

    fn remove_regular_file_if_present(
        &self,
        path: &Path,
        operation: NativePlatformStorageOperation,
    ) -> Result<bool, NativePlatformStorageError> {
        if !self.regular_file_exists(path, operation)? {
            return Ok(false);
        }

        fs::remove_file(path).map_err(|_| backend_failure(operation))?;

        Ok(true)
    }

    fn create_temporary_file(
        &self,
        operation: NativePlatformStorageOperation,
    ) -> Result<File, NativePlatformStorageError> {
        let mut options = OpenOptions::new();

        options.write(true).create_new(true);

        #[cfg(unix)]
        {
            options.mode(0o600);
        }

        options
            .open(&self.temporary_path)
            .map_err(|_| backend_failure(operation))
    }

    fn sync_root_directory(
        &self,
        operation: NativePlatformStorageOperation,
    ) -> Result<(), NativePlatformStorageError> {
        #[cfg(unix)]
        {
            let directory =
                File::open(&self.root_directory).map_err(|_| backend_failure(operation))?;

            directory
                .sync_all()
                .map_err(|_| backend_failure(operation))?;
        }

        #[cfg(not(unix))]
        {
            let _ = operation;
        }

        Ok(())
    }

    #[cfg(unix)]
    fn replace_temporary_file(
        &self,
        destination_exists: bool,
        operation: NativePlatformStorageOperation,
    ) -> Result<(), NativePlatformStorageError> {
        let _ = destination_exists;

        fs::rename(&self.temporary_path, &self.vault_path).map_err(|_| backend_failure(operation))
    }

    #[cfg(windows)]
    fn replace_temporary_file(
        &self,
        destination_exists: bool,
        operation: NativePlatformStorageOperation,
    ) -> Result<(), NativePlatformStorageError> {
        use windows_sys::Win32::Storage::FileSystem::{
            MoveFileExW, MOVEFILE_REPLACE_EXISTING, MOVEFILE_WRITE_THROUGH,
        };

        let source = windows_wide_path(&self.temporary_path);
        let destination = windows_wide_path(&self.vault_path);

        let mut flags = MOVEFILE_WRITE_THROUGH;

        if destination_exists {
            flags |= MOVEFILE_REPLACE_EXISTING;
        }

        // SAFETY: both buffers are NUL-terminated UTF-16 paths
        // that remain alive for the complete system call.
        let result = unsafe { MoveFileExW(source.as_ptr(), destination.as_ptr(), flags) };

        if result == 0 {
            return Err(backend_failure(operation));
        }

        Ok(())
    }

    #[cfg(not(any(unix, windows)))]
    fn replace_temporary_file(
        &self,
        destination_exists: bool,
        operation: NativePlatformStorageOperation,
    ) -> Result<(), NativePlatformStorageError> {
        if destination_exists {
            return Err(NativePlatformStorageError::BackendUnavailable { operation });
        }

        fs::rename(&self.temporary_path, &self.vault_path).map_err(|_| backend_failure(operation))
    }

    fn discard_invalid_temporary_file(
        &self,
        operation: NativePlatformStorageOperation,
    ) -> Result<NativeVaultRecoveryOutcome, NativePlatformStorageError> {
        self.remove_regular_file_if_present(&self.temporary_path, operation)?;

        self.sync_root_directory(operation)?;

        Ok(NativeVaultRecoveryOutcome::StaleTemporaryFileRemoved)
    }
}

impl NativeVaultStore for DesktopAtomicVaultStore {
    fn load_encrypted_vault(
        &self,
    ) -> Result<Option<NativeEncryptedVaultV1>, NativePlatformStorageError> {
        let operation = NativePlatformStorageOperation::LoadEncryptedVault;

        if !self.ensure_existing_root_directory(operation)? {
            return Ok(None);
        }

        if !self.regular_file_exists(&self.vault_path, operation)? {
            return Ok(None);
        }

        self.read_encrypted_vault_file(&self.vault_path, operation)
            .map(Some)
    }

    fn write_encrypted_vault_atomic(
        &self,
        vault: &NativeEncryptedVaultV1,
    ) -> Result<(), NativePlatformStorageError> {
        let operation = NativePlatformStorageOperation::WriteEncryptedVaultAtomic;

        vault.validate()?;
        self.ensure_root_directory(operation)?;

        self.remove_regular_file_if_present(&self.temporary_path, operation)?;

        let destination_exists = self.regular_file_exists(&self.vault_path, operation)?;

        let mut temporary = self.create_temporary_file(operation)?;

        temporary
            .write_all(vault.as_slice())
            .map_err(|_| backend_failure(operation))?;

        temporary
            .sync_all()
            .map_err(|_| backend_failure(operation))?;

        drop(temporary);

        self.sync_root_directory(operation)?;

        self.replace_temporary_file(destination_exists, operation)?;

        self.sync_root_directory(operation)?;

        Ok(())
    }

    fn recover_interrupted_write(
        &self,
    ) -> Result<NativeVaultRecoveryOutcome, NativePlatformStorageError> {
        let operation = NativePlatformStorageOperation::RecoverInterruptedWrite;

        if !self.ensure_existing_root_directory(operation)? {
            return Ok(NativeVaultRecoveryOutcome::NoRecoveryNeeded);
        }

        if !self.regular_file_exists(&self.temporary_path, operation)? {
            return Ok(NativeVaultRecoveryOutcome::NoRecoveryNeeded);
        }

        let destination_exists = self.regular_file_exists(&self.vault_path, operation)?;

        if destination_exists {
            return self.discard_invalid_temporary_file(operation);
        }

        match self.read_encrypted_vault_file(&self.temporary_path, operation) {
            Ok(_) => {
                self.replace_temporary_file(false, operation)?;

                self.sync_root_directory(operation)?;

                Ok(NativeVaultRecoveryOutcome::ValidTemporaryFilePromoted)
            }
            Err(NativePlatformStorageError::EmptyEncryptedVault)
            | Err(NativePlatformStorageError::EncryptedVaultTooLarge { .. }) => {
                self.discard_invalid_temporary_file(operation)
            }
            Err(error) => Err(error),
        }
    }

    fn remove_encrypted_vault(
        &self,
    ) -> Result<NativeVaultRemovalOutcome, NativePlatformStorageError> {
        let operation = NativePlatformStorageOperation::RemoveEncryptedVault;

        if !self.ensure_existing_root_directory(operation)? {
            return Ok(NativeVaultRemovalOutcome::NotFound);
        }

        let removed_vault = self.remove_regular_file_if_present(&self.vault_path, operation)?;

        let removed_temporary =
            self.remove_regular_file_if_present(&self.temporary_path, operation)?;

        if removed_vault || removed_temporary {
            self.sync_root_directory(operation)?;
        }

        Ok(if removed_vault {
            NativeVaultRemovalOutcome::Removed
        } else {
            NativeVaultRemovalOutcome::NotFound
        })
    }
}

fn backend_failure(operation: NativePlatformStorageOperation) -> NativePlatformStorageError {
    NativePlatformStorageError::BackendFailure { operation }
}

#[cfg(windows)]
fn windows_wide_path(path: &Path) -> Vec<u16> {
    path.as_os_str()
        .encode_wide()
        .chain(std::iter::once(0))
        .collect()
}

#[cfg(unix)]
fn secure_directory_permissions(
    path: &Path,
    operation: NativePlatformStorageOperation,
) -> Result<(), NativePlatformStorageError> {
    fs::set_permissions(path, fs::Permissions::from_mode(0o700))
        .map_err(|_| backend_failure(operation))
}

#[cfg(not(unix))]
fn secure_directory_permissions(
    _path: &Path,
    _operation: NativePlatformStorageOperation,
) -> Result<(), NativePlatformStorageError> {
    Ok(())
}
