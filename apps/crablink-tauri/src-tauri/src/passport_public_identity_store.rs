//! RO:WHAT — Persists the immutable public Native Passport root descriptor beside the desktop encrypted vault.
//! RO:WHY — Physical M1 needs a restart-stable canonical Passport subject without repeatedly unsealing RecoveryRoot.
//! RO:INTERACTS — Desktop Passport vault directory, PassportIdV1, Ed25519PublicKeyHex, canonical Passport-ID derivation, serde_json, and later AppState identity projection.
//! RO:INVARIANTS — one public descriptor per local Passport; write-once/no-clobber; same-value writes are idempotent; conflicting identity fails closed; stored Passport ID must match the stored root public key.
//! RO:CONFIG — fixed filename, schema/version, and 4 KiB maximum encoded descriptor.
//! RO:SECURITY — stores only public Passport ID and root public key; no recovery factor, phrase, seed, PIN, VMK, signing key, device key, capability, username, wallet, or ledger material.
//! RO:TEST — tests/physical_m1_public_identity_store.rs.

use std::{
    fs::{self, File, OpenOptions},
    io::Write,
    path::{Path, PathBuf},
};

#[cfg(unix)]
use std::os::unix::fs::OpenOptionsExt;

use serde::{Deserialize, Serialize};

use svc_passport::native::{
    derive_native_passport_id_v1, Ed25519PublicKeyHex, PassportIdV1, RootPassportDescriptorV1,
};

pub const PHYSICAL_M1_PUBLIC_DESCRIPTOR_STORE_LABEL: &str =
    "PHYSICAL_M1_PUBLIC_PASSPORT_DESCRIPTOR_STORE_V1";

pub const PUBLIC_DESCRIPTOR_SCHEMA_V1: &str = "crablink.native-passport.public-descriptor.v1";

pub const PUBLIC_DESCRIPTOR_VERSION_V1: u16 = 1;

pub const PUBLIC_DESCRIPTOR_FILE_NAME: &str = "passport.public-identity.json";

pub const PUBLIC_DESCRIPTOR_TEMP_FILE_NAME: &str = "passport.public-identity.json.tmp";

pub const PUBLIC_DESCRIPTOR_MAX_BYTES: usize = 4 * 1024;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct StoredPublicPassportDescriptorV1 {
    schema: String,
    version: u16,
    passport_id: String,
    root_public_key: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PublicDescriptorPersistOutcome {
    Written,
    AlreadyPresent,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DesktopPublicPassportDescriptorStoreError {
    InvalidRootDirectory,
    RootDirectoryUnavailable,
    DescriptorTargetInvalid,
    TemporaryTargetInvalid,
    DescriptorTooLarge { actual: usize, maximum: usize },
    ReadFailed,
    DecodeFailed,
    SchemaMismatch,
    VersionMismatch,
    InvalidPassportId,
    InvalidRootPublicKey,
    PassportIdRootKeyMismatch,
    OptionalHandleNotAllowed,
    EncodeFailed,
    TemporaryWriteFailed,
    TemporarySyncFailed,
    PublishFailed,
    ParentSyncFailed,
    TemporaryCleanupFailed,
    DescriptorCleanupFailed,
    IdentityConflict,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DesktopPublicPassportDescriptorStore {
    root_directory: PathBuf,
    descriptor_path: PathBuf,
    temporary_path: PathBuf,
}

impl DesktopPublicPassportDescriptorStore {
    pub fn new(
        root_directory: impl Into<PathBuf>,
    ) -> Result<Self, DesktopPublicPassportDescriptorStoreError> {
        let root_directory = root_directory.into();

        if root_directory.as_os_str().is_empty() || !root_directory.is_absolute() {
            return Err(DesktopPublicPassportDescriptorStoreError::InvalidRootDirectory);
        }

        Ok(Self {
            descriptor_path: root_directory.join(PUBLIC_DESCRIPTOR_FILE_NAME),
            temporary_path: root_directory.join(PUBLIC_DESCRIPTOR_TEMP_FILE_NAME),
            root_directory,
        })
    }

    pub fn root_directory(&self) -> &Path {
        &self.root_directory
    }

    pub fn descriptor_path(&self) -> &Path {
        &self.descriptor_path
    }

    pub fn temporary_path(&self) -> &Path {
        &self.temporary_path
    }

    pub fn load(
        &self,
    ) -> Result<Option<RootPassportDescriptorV1>, DesktopPublicPassportDescriptorStoreError> {
        self.ensure_existing_root_directory()?;

        if !self.regular_file_exists(&self.descriptor_path)? {
            return Ok(None);
        }

        let metadata = fs::metadata(&self.descriptor_path)
            .map_err(|_| DesktopPublicPassportDescriptorStoreError::ReadFailed)?;

        let actual = usize::try_from(metadata.len()).unwrap_or(usize::MAX);

        if actual > PUBLIC_DESCRIPTOR_MAX_BYTES {
            return Err(
                DesktopPublicPassportDescriptorStoreError::DescriptorTooLarge {
                    actual,
                    maximum: PUBLIC_DESCRIPTOR_MAX_BYTES,
                },
            );
        }

        let bytes = fs::read(&self.descriptor_path)
            .map_err(|_| DesktopPublicPassportDescriptorStoreError::ReadFailed)?;

        decode_descriptor(&bytes).map(Some)
    }

    pub fn persist_once(
        &self,
        descriptor: &RootPassportDescriptorV1,
    ) -> Result<PublicDescriptorPersistOutcome, DesktopPublicPassportDescriptorStoreError> {
        validate_descriptor(descriptor)?;

        self.ensure_root_directory()?;

        if let Some(existing) = self.load()? {
            return if existing == *descriptor {
                Ok(PublicDescriptorPersistOutcome::AlreadyPresent)
            } else {
                Err(DesktopPublicPassportDescriptorStoreError::IdentityConflict)
            };
        }

        self.remove_stale_temporary_file()?;

        let stored = StoredPublicPassportDescriptorV1 {
            schema: PUBLIC_DESCRIPTOR_SCHEMA_V1.to_owned(),
            version: PUBLIC_DESCRIPTOR_VERSION_V1,
            passport_id: descriptor.passport_id.as_str().to_owned(),
            root_public_key: descriptor.root_public_key.as_str().to_owned(),
        };

        let encoded = serde_json::to_vec(&stored)
            .map_err(|_| DesktopPublicPassportDescriptorStoreError::EncodeFailed)?;

        if encoded.len() > PUBLIC_DESCRIPTOR_MAX_BYTES {
            return Err(
                DesktopPublicPassportDescriptorStoreError::DescriptorTooLarge {
                    actual: encoded.len(),
                    maximum: PUBLIC_DESCRIPTOR_MAX_BYTES,
                },
            );
        }

        let mut options = OpenOptions::new();

        options.write(true).create_new(true);

        #[cfg(unix)]
        options.mode(0o600);

        let mut file = options
            .open(&self.temporary_path)
            .map_err(|_| DesktopPublicPassportDescriptorStoreError::TemporaryWriteFailed)?;

        file.write_all(&encoded)
            .map_err(|_| DesktopPublicPassportDescriptorStoreError::TemporaryWriteFailed)?;

        file.sync_all()
            .map_err(|_| DesktopPublicPassportDescriptorStoreError::TemporarySyncFailed)?;

        drop(file);

        match fs::hard_link(&self.temporary_path, &self.descriptor_path) {
            Ok(()) => {}
            Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => {
                let existing = self
                    .load()?
                    .ok_or(DesktopPublicPassportDescriptorStoreError::PublishFailed)?;

                self.remove_regular_temporary_file()?;

                return if existing == *descriptor {
                    Ok(PublicDescriptorPersistOutcome::AlreadyPresent)
                } else {
                    Err(DesktopPublicPassportDescriptorStoreError::IdentityConflict)
                };
            }
            Err(_) => {
                let _ = self.remove_regular_temporary_file();

                return Err(DesktopPublicPassportDescriptorStoreError::PublishFailed);
            }
        }

        self.sync_parent_directory()?;

        self.remove_regular_temporary_file()?;

        Ok(PublicDescriptorPersistOutcome::Written)
    }

    /// Remove the durable public Passport descriptor and any stale
    /// publication temporary file.
    ///
    /// This is public metadata cleanup only. It does not access the
    /// PlatformSealer, encrypted vault, recovery material, native sessions,
    /// username state, wallet state, or ledger state.
    pub fn clear(&self) -> Result<bool, DesktopPublicPassportDescriptorStoreError> {
        match fs::symlink_metadata(&self.root_directory) {
            Ok(metadata) => {
                if metadata.file_type().is_symlink() || !metadata.is_dir() {
                    return Err(
                        DesktopPublicPassportDescriptorStoreError::RootDirectoryUnavailable,
                    );
                }
            }
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                return Ok(false);
            }
            Err(_) => {
                return Err(DesktopPublicPassportDescriptorStoreError::RootDirectoryUnavailable);
            }
        }

        let mut removed = false;

        if self.regular_file_exists(&self.descriptor_path)? {
            fs::remove_file(&self.descriptor_path)
                .map_err(|_| DesktopPublicPassportDescriptorStoreError::DescriptorCleanupFailed)?;

            removed = true;
        }

        if self.regular_file_exists(&self.temporary_path)? {
            fs::remove_file(&self.temporary_path)
                .map_err(|_| DesktopPublicPassportDescriptorStoreError::TemporaryCleanupFailed)?;

            removed = true;
        }

        if removed {
            self.sync_parent_directory()?;
        }

        Ok(removed)
    }

    fn ensure_root_directory(&self) -> Result<(), DesktopPublicPassportDescriptorStoreError> {
        match fs::symlink_metadata(&self.root_directory) {
            Ok(metadata) => {
                if metadata.file_type().is_symlink() || !metadata.is_dir() {
                    return Err(
                        DesktopPublicPassportDescriptorStoreError::RootDirectoryUnavailable,
                    );
                }
            }
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                fs::create_dir_all(&self.root_directory).map_err(|_| {
                    DesktopPublicPassportDescriptorStoreError::RootDirectoryUnavailable
                })?;

                self.ensure_existing_root_directory()?;
            }
            Err(_) => {
                return Err(DesktopPublicPassportDescriptorStoreError::RootDirectoryUnavailable);
            }
        }

        Ok(())
    }

    fn ensure_existing_root_directory(
        &self,
    ) -> Result<(), DesktopPublicPassportDescriptorStoreError> {
        let metadata = fs::symlink_metadata(&self.root_directory)
            .map_err(|_| DesktopPublicPassportDescriptorStoreError::RootDirectoryUnavailable)?;

        if metadata.file_type().is_symlink() || !metadata.is_dir() {
            return Err(DesktopPublicPassportDescriptorStoreError::RootDirectoryUnavailable);
        }

        Ok(())
    }

    fn regular_file_exists(
        &self,
        path: &Path,
    ) -> Result<bool, DesktopPublicPassportDescriptorStoreError> {
        match fs::symlink_metadata(path) {
            Ok(metadata) => {
                if metadata.file_type().is_symlink() || !metadata.is_file() {
                    return Err(if path == self.temporary_path {
                        DesktopPublicPassportDescriptorStoreError::TemporaryTargetInvalid
                    } else {
                        DesktopPublicPassportDescriptorStoreError::DescriptorTargetInvalid
                    });
                }

                Ok(true)
            }
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(false),
            Err(_) => Err(if path == self.temporary_path {
                DesktopPublicPassportDescriptorStoreError::TemporaryTargetInvalid
            } else {
                DesktopPublicPassportDescriptorStoreError::DescriptorTargetInvalid
            }),
        }
    }

    fn remove_stale_temporary_file(&self) -> Result<(), DesktopPublicPassportDescriptorStoreError> {
        if self.regular_file_exists(&self.temporary_path)? {
            self.remove_regular_temporary_file()?;
        }

        Ok(())
    }

    fn remove_regular_temporary_file(
        &self,
    ) -> Result<(), DesktopPublicPassportDescriptorStoreError> {
        if !self.regular_file_exists(&self.temporary_path)? {
            return Ok(());
        }

        fs::remove_file(&self.temporary_path)
            .map_err(|_| DesktopPublicPassportDescriptorStoreError::TemporaryCleanupFailed)
    }

    fn sync_parent_directory(&self) -> Result<(), DesktopPublicPassportDescriptorStoreError> {
        #[cfg(unix)]
        {
            let directory = File::open(&self.root_directory)
                .map_err(|_| DesktopPublicPassportDescriptorStoreError::ParentSyncFailed)?;

            directory
                .sync_all()
                .map_err(|_| DesktopPublicPassportDescriptorStoreError::ParentSyncFailed)?;
        }

        Ok(())
    }
}

fn decode_descriptor(
    bytes: &[u8],
) -> Result<RootPassportDescriptorV1, DesktopPublicPassportDescriptorStoreError> {
    let stored: StoredPublicPassportDescriptorV1 = serde_json::from_slice(bytes)
        .map_err(|_| DesktopPublicPassportDescriptorStoreError::DecodeFailed)?;

    if stored.schema != PUBLIC_DESCRIPTOR_SCHEMA_V1 {
        return Err(DesktopPublicPassportDescriptorStoreError::SchemaMismatch);
    }

    if stored.version != PUBLIC_DESCRIPTOR_VERSION_V1 {
        return Err(DesktopPublicPassportDescriptorStoreError::VersionMismatch);
    }

    let passport_id = PassportIdV1::parse(stored.passport_id)
        .map_err(|_| DesktopPublicPassportDescriptorStoreError::InvalidPassportId)?;

    let root_public_key = Ed25519PublicKeyHex::parse(stored.root_public_key)
        .map_err(|_| DesktopPublicPassportDescriptorStoreError::InvalidRootPublicKey)?;

    let descriptor = RootPassportDescriptorV1 {
        passport_id,
        root_public_key,
        optional_handle: None,
    };

    validate_descriptor(&descriptor)?;

    Ok(descriptor)
}

fn validate_descriptor(
    descriptor: &RootPassportDescriptorV1,
) -> Result<(), DesktopPublicPassportDescriptorStoreError> {
    if descriptor.optional_handle.is_some() {
        return Err(DesktopPublicPassportDescriptorStoreError::OptionalHandleNotAllowed);
    }

    let expected = derive_native_passport_id_v1(&descriptor.root_public_key)
        .map_err(|_| DesktopPublicPassportDescriptorStoreError::InvalidPassportId)?;

    if expected != descriptor.passport_id {
        return Err(DesktopPublicPassportDescriptorStoreError::PassportIdRootKeyMismatch);
    }

    Ok(())
}
