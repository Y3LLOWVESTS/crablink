//! RO:WHAT — Persists one strictly verified public Native Passport DeviceAuthorizationV1 beside the desktop Passport vault.
//!
//! RO:WHY — Physical M1 needs restart-stable device authority without modifying the frozen encrypted V2 operational vault or retaining root secret material.
//!
//! RO:INTERACTS — ron-proto DeviceAuthorizationV1, ron-auth strict verification, svc-passport public Passport/device descriptors, and the Native Passport app-data directory.
//!
//! RO:INVARIANTS — one immutable current authorization record; same record is idempotent; conflicting record fails closed; every persist/load verifies trusted Passport, root epoch, network/environment, signature, time, and current device binding.
//!
//! RO:METRICS — none.
//!
//! RO:CONFIG — fixed schema/version, fixed sidecar filename, 16 KiB encoded-size cap.
//!
//! RO:SECURITY — stores only public signed authorization metadata; no PIN, root-recovery factor plaintext, mnemonic, BIP-39 seed, VMK, signing seed, device secret, capability, username, wallet, or ledger material.
//!
//! RO:TEST — tests/physical_m1_device_authorization_store.rs.

#![forbid(unsafe_code)]

use std::{
    fs::{self, File, OpenOptions},
    io::Write,
    path::{Path, PathBuf},
};

#[cfg(unix)]
use std::os::unix::fs::OpenOptionsExt;

use ron_auth::native_passport::{
    verify_device_authorization_v1_strict, DeviceAuthorizationVerificationContextV1,
};
use ron_proto::{
    DeviceAuthorizationV1, Ed25519PublicKeyHex as ProtoEd25519PublicKeyHex,
    NativePassportContextLabelV1, PassportIdV1 as ProtoPassportIdV1,
};
use serde::{Deserialize, Serialize};
use svc_passport::native::{NativeDevicePublicIdentityV1, RootPassportDescriptorV1};

/// Physical M1 public signed-authorization store marker.
pub const PHYSICAL_M1_DEVICE_AUTHORIZATION_STORE_LABEL: &str =
    "PHYSICAL_M1_DEVICE_AUTHORIZATION_PUBLIC_STORE_V1";

/// Stable on-disk schema.
pub const DEVICE_AUTHORIZATION_STORE_SCHEMA_V1: &str =
    "crablink.native-passport.device-authorization-record.v1";

/// Stable store envelope version.
pub const DEVICE_AUTHORIZATION_STORE_VERSION_V1: u16 = 1;

/// Public signed DeviceAuthorization record.
pub const DEVICE_AUTHORIZATION_FILE_NAME: &str = "passport.device-authorization.json";

/// Atomic publication temporary file.
pub const DEVICE_AUTHORIZATION_TEMP_FILE_NAME: &str = "passport.device-authorization.json.tmp";

/// Maximum encoded record size.
pub const DEVICE_AUTHORIZATION_MAX_BYTES: usize = 16 * 1024;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct StoredDeviceAuthorizationRecordV1 {
    schema: String,
    version: u16,
    authorization: DeviceAuthorizationV1,
}

/// Trusted external state required before a persisted authorization can be
/// accepted.
///
/// None of these values are read from the untrusted stored authorization.
#[derive(Debug, Clone, Copy)]
pub struct DesktopDeviceAuthorizationVerificationContextV1<'a> {
    pub trusted_root: &'a RootPassportDescriptorV1,
    pub expected_device: &'a NativeDevicePublicIdentityV1,
    pub expected_network_id: &'a str,
    pub expected_environment: &'a str,
    pub trusted_root_key_epoch: u64,
    pub now_ms: u64,
    pub max_clock_skew_ms: u64,
}

/// Write-once persistence result.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DeviceAuthorizationPersistOutcome {
    Written,
    AlreadyPresent,
}

/// Fail-closed persistence/verification failure.
#[derive(Debug, Clone, PartialEq, Eq)]
#[non_exhaustive]
pub enum DesktopDeviceAuthorizationStoreError {
    InvalidRootDirectory,
    RootDirectoryUnavailable,
    AuthorizationTargetInvalid,
    TemporaryTargetInvalid,
    AuthorizationTooLarge { actual: usize, maximum: usize },
    ReadFailed,
    DecodeFailed,
    SchemaMismatch,
    VersionMismatch,
    EncodeFailed,
    TrustedContextInvalid,
    StrictVerificationFailed,
    DeviceBindingMismatch,
    AuthorizationConflict,
    TemporaryWriteFailed,
    TemporarySyncFailed,
    PublishFailed,
    ParentSyncFailed,
    TemporaryCleanupFailed,
    AuthorizationCleanupFailed,
}

/// Filesystem-backed public signed DeviceAuthorization store.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DesktopDeviceAuthorizationStore {
    root_directory: PathBuf,
    authorization_path: PathBuf,
    temporary_path: PathBuf,
}

impl DesktopDeviceAuthorizationStore {
    /// Construct a store rooted in the canonical Native Passport directory.
    ///
    /// # Errors
    ///
    /// Rejects empty or relative roots.
    pub fn new(
        root_directory: impl Into<PathBuf>,
    ) -> Result<Self, DesktopDeviceAuthorizationStoreError> {
        let root_directory = root_directory.into();

        if root_directory.as_os_str().is_empty() || !root_directory.is_absolute() {
            return Err(DesktopDeviceAuthorizationStoreError::InvalidRootDirectory);
        }

        Ok(Self {
            authorization_path: root_directory.join(DEVICE_AUTHORIZATION_FILE_NAME),
            temporary_path: root_directory.join(DEVICE_AUTHORIZATION_TEMP_FILE_NAME),
            root_directory,
        })
    }

    #[must_use]
    pub fn root_directory(&self) -> &Path {
        &self.root_directory
    }

    #[must_use]
    pub fn authorization_path(&self) -> &Path {
        &self.authorization_path
    }

    #[must_use]
    pub fn temporary_path(&self) -> &Path {
        &self.temporary_path
    }

    /// Load and fully verify the persisted public authorization.
    ///
    /// No stored record is accepted merely because it parses.
    ///
    /// # Errors
    ///
    /// Fails closed on storage, schema, cryptographic, time, trusted-context,
    /// or local-device binding failures.
    pub fn load_verified(
        &self,
        context: DesktopDeviceAuthorizationVerificationContextV1<'_>,
    ) -> Result<Option<DeviceAuthorizationV1>, DesktopDeviceAuthorizationStoreError> {
        self.ensure_existing_root_directory()?;

        if !self.regular_file_exists(&self.authorization_path)? {
            return Ok(None);
        }

        let metadata = fs::metadata(&self.authorization_path)
            .map_err(|_| DesktopDeviceAuthorizationStoreError::ReadFailed)?;

        let actual = usize::try_from(metadata.len()).unwrap_or(usize::MAX);

        if actual > DEVICE_AUTHORIZATION_MAX_BYTES {
            return Err(
                DesktopDeviceAuthorizationStoreError::AuthorizationTooLarge {
                    actual,
                    maximum: DEVICE_AUTHORIZATION_MAX_BYTES,
                },
            );
        }

        let bytes = fs::read(&self.authorization_path)
            .map_err(|_| DesktopDeviceAuthorizationStoreError::ReadFailed)?;

        let authorization = decode_record(&bytes)?;

        verify_authorization(&authorization, context)?;

        Ok(Some(authorization))
    }

    /// Persist one already-signed authorization after strict verification.
    ///
    /// A different signed authorization never silently replaces the current
    /// record. Rotation/revocation requires a separately reviewed lifecycle.
    ///
    /// # Errors
    ///
    /// Fails closed when verification, storage, publication, or conflict
    /// checks fail.
    pub fn persist_verified_once(
        &self,
        authorization: &DeviceAuthorizationV1,
        context: DesktopDeviceAuthorizationVerificationContextV1<'_>,
    ) -> Result<DeviceAuthorizationPersistOutcome, DesktopDeviceAuthorizationStoreError> {
        verify_authorization(authorization, context)?;

        self.ensure_root_directory()?;

        if let Some(existing) = self.load_verified(context)? {
            return if existing == *authorization {
                Ok(DeviceAuthorizationPersistOutcome::AlreadyPresent)
            } else {
                Err(DesktopDeviceAuthorizationStoreError::AuthorizationConflict)
            };
        }

        self.remove_stale_temporary_file()?;

        let stored = StoredDeviceAuthorizationRecordV1 {
            schema: DEVICE_AUTHORIZATION_STORE_SCHEMA_V1.to_owned(),
            version: DEVICE_AUTHORIZATION_STORE_VERSION_V1,
            authorization: authorization.clone(),
        };

        let encoded = serde_json::to_vec(&stored)
            .map_err(|_| DesktopDeviceAuthorizationStoreError::EncodeFailed)?;

        if encoded.len() > DEVICE_AUTHORIZATION_MAX_BYTES {
            return Err(
                DesktopDeviceAuthorizationStoreError::AuthorizationTooLarge {
                    actual: encoded.len(),
                    maximum: DEVICE_AUTHORIZATION_MAX_BYTES,
                },
            );
        }

        let mut options = OpenOptions::new();

        options.write(true).create_new(true);

        #[cfg(unix)]
        options.mode(0o600);

        let mut file = options
            .open(&self.temporary_path)
            .map_err(|_| DesktopDeviceAuthorizationStoreError::TemporaryWriteFailed)?;

        file.write_all(&encoded)
            .map_err(|_| DesktopDeviceAuthorizationStoreError::TemporaryWriteFailed)?;

        file.sync_all()
            .map_err(|_| DesktopDeviceAuthorizationStoreError::TemporarySyncFailed)?;

        drop(file);

        match fs::hard_link(&self.temporary_path, &self.authorization_path) {
            Ok(()) => {}

            Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => {
                let existing = self
                    .load_verified(context)?
                    .ok_or(DesktopDeviceAuthorizationStoreError::PublishFailed)?;

                self.remove_regular_temporary_file()?;

                return if existing == *authorization {
                    Ok(DeviceAuthorizationPersistOutcome::AlreadyPresent)
                } else {
                    Err(DesktopDeviceAuthorizationStoreError::AuthorizationConflict)
                };
            }

            Err(_) => {
                let _ = self.remove_regular_temporary_file();

                return Err(DesktopDeviceAuthorizationStoreError::PublishFailed);
            }
        }

        self.sync_parent_directory()?;

        self.remove_regular_temporary_file()?;

        Ok(DeviceAuthorizationPersistOutcome::Written)
    }

    /// Remove the public authorization record and stale temp file.
    ///
    /// This does not revoke server-side authority. It is local public-metadata
    /// cleanup only.
    ///
    /// # Errors
    ///
    /// Fails closed on invalid filesystem targets or cleanup failures.
    pub fn clear(&self) -> Result<bool, DesktopDeviceAuthorizationStoreError> {
        match fs::symlink_metadata(&self.root_directory) {
            Ok(metadata) => {
                if metadata.file_type().is_symlink() || !metadata.is_dir() {
                    return Err(DesktopDeviceAuthorizationStoreError::RootDirectoryUnavailable);
                }
            }

            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                return Ok(false);
            }

            Err(_) => {
                return Err(DesktopDeviceAuthorizationStoreError::RootDirectoryUnavailable);
            }
        }

        let mut removed = false;

        if self.regular_file_exists(&self.authorization_path)? {
            fs::remove_file(&self.authorization_path)
                .map_err(|_| DesktopDeviceAuthorizationStoreError::AuthorizationCleanupFailed)?;

            removed = true;
        }

        if self.regular_file_exists(&self.temporary_path)? {
            fs::remove_file(&self.temporary_path)
                .map_err(|_| DesktopDeviceAuthorizationStoreError::TemporaryCleanupFailed)?;

            removed = true;
        }

        if removed {
            self.sync_parent_directory()?;
        }

        Ok(removed)
    }

    fn ensure_root_directory(&self) -> Result<(), DesktopDeviceAuthorizationStoreError> {
        match fs::symlink_metadata(&self.root_directory) {
            Ok(metadata) => {
                if metadata.file_type().is_symlink() || !metadata.is_dir() {
                    return Err(DesktopDeviceAuthorizationStoreError::RootDirectoryUnavailable);
                }
            }

            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                fs::create_dir_all(&self.root_directory)
                    .map_err(|_| DesktopDeviceAuthorizationStoreError::RootDirectoryUnavailable)?;

                self.ensure_existing_root_directory()?;
            }

            Err(_) => {
                return Err(DesktopDeviceAuthorizationStoreError::RootDirectoryUnavailable);
            }
        }

        Ok(())
    }

    fn ensure_existing_root_directory(&self) -> Result<(), DesktopDeviceAuthorizationStoreError> {
        let metadata = fs::symlink_metadata(&self.root_directory)
            .map_err(|_| DesktopDeviceAuthorizationStoreError::RootDirectoryUnavailable)?;

        if metadata.file_type().is_symlink() || !metadata.is_dir() {
            return Err(DesktopDeviceAuthorizationStoreError::RootDirectoryUnavailable);
        }

        Ok(())
    }

    fn regular_file_exists(
        &self,
        path: &Path,
    ) -> Result<bool, DesktopDeviceAuthorizationStoreError> {
        match fs::symlink_metadata(path) {
            Ok(metadata) => {
                if metadata.file_type().is_symlink() || !metadata.is_file() {
                    return Err(if path == self.temporary_path {
                        DesktopDeviceAuthorizationStoreError::TemporaryTargetInvalid
                    } else {
                        DesktopDeviceAuthorizationStoreError::AuthorizationTargetInvalid
                    });
                }

                Ok(true)
            }

            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(false),

            Err(_) => Err(if path == self.temporary_path {
                DesktopDeviceAuthorizationStoreError::TemporaryTargetInvalid
            } else {
                DesktopDeviceAuthorizationStoreError::AuthorizationTargetInvalid
            }),
        }
    }

    fn remove_stale_temporary_file(&self) -> Result<(), DesktopDeviceAuthorizationStoreError> {
        if self.regular_file_exists(&self.temporary_path)? {
            self.remove_regular_temporary_file()?;
        }

        Ok(())
    }

    fn remove_regular_temporary_file(&self) -> Result<(), DesktopDeviceAuthorizationStoreError> {
        if !self.regular_file_exists(&self.temporary_path)? {
            return Ok(());
        }

        fs::remove_file(&self.temporary_path)
            .map_err(|_| DesktopDeviceAuthorizationStoreError::TemporaryCleanupFailed)
    }

    fn sync_parent_directory(&self) -> Result<(), DesktopDeviceAuthorizationStoreError> {
        #[cfg(unix)]
        {
            let directory = File::open(&self.root_directory)
                .map_err(|_| DesktopDeviceAuthorizationStoreError::ParentSyncFailed)?;

            directory
                .sync_all()
                .map_err(|_| DesktopDeviceAuthorizationStoreError::ParentSyncFailed)?;
        }

        Ok(())
    }
}

fn decode_record(
    bytes: &[u8],
) -> Result<DeviceAuthorizationV1, DesktopDeviceAuthorizationStoreError> {
    let stored: StoredDeviceAuthorizationRecordV1 = serde_json::from_slice(bytes)
        .map_err(|_| DesktopDeviceAuthorizationStoreError::DecodeFailed)?;

    if stored.schema != DEVICE_AUTHORIZATION_STORE_SCHEMA_V1 {
        return Err(DesktopDeviceAuthorizationStoreError::SchemaMismatch);
    }

    if stored.version != DEVICE_AUTHORIZATION_STORE_VERSION_V1 {
        return Err(DesktopDeviceAuthorizationStoreError::VersionMismatch);
    }

    Ok(stored.authorization)
}

fn verify_authorization(
    authorization: &DeviceAuthorizationV1,
    context: DesktopDeviceAuthorizationVerificationContextV1<'_>,
) -> Result<(), DesktopDeviceAuthorizationStoreError> {
    let trusted_passport_id =
        ProtoPassportIdV1::parse(context.trusted_root.passport_id.as_str())
            .map_err(|_| DesktopDeviceAuthorizationStoreError::TrustedContextInvalid)?;

    let trusted_root_public_key =
        ProtoEd25519PublicKeyHex::parse(context.trusted_root.root_public_key.as_str())
            .map_err(|_| DesktopDeviceAuthorizationStoreError::TrustedContextInvalid)?;

    let expected_network_id = NativePassportContextLabelV1::parse(context.expected_network_id)
        .map_err(|_| DesktopDeviceAuthorizationStoreError::TrustedContextInvalid)?;

    let expected_environment = NativePassportContextLabelV1::parse(context.expected_environment)
        .map_err(|_| DesktopDeviceAuthorizationStoreError::TrustedContextInvalid)?;

    verify_device_authorization_v1_strict(
        authorization,
        DeviceAuthorizationVerificationContextV1 {
            trusted_passport_id: &trusted_passport_id,
            trusted_root_public_key: &trusted_root_public_key,
            trusted_root_key_epoch: context.trusted_root_key_epoch,
            expected_network_id: &expected_network_id,
            expected_environment: &expected_environment,
            now_ms: context.now_ms,
            max_clock_skew_ms: context.max_clock_skew_ms,
        },
    )
    .map_err(|_| DesktopDeviceAuthorizationStoreError::StrictVerificationFailed)?;

    if authorization.device_id.as_str() != context.expected_device.device_id.as_str()
        || authorization.device_public_key.as_str()
            != context.expected_device.device_public_key.as_str()
    {
        return Err(DesktopDeviceAuthorizationStoreError::DeviceBindingMismatch);
    }

    Ok(())
}
