//! RO:WHAT — Persists a fingerprint-bound native marker after the user acknowledges the desktop Passport recovery phrase.
//! RO:WHY — Onboarding Phase 6 must reject repeat recovery display using native durable truth rather than trusting a React/localStorage boolean.
//! RO:INTERACTS — DesktopAtomicVaultStore root, recovery phrase runtime, public recovery command, and Passport clear/reset.
//! RO:INVARIANTS — fixed private filenames; exact schema; one lowercase 16-character fingerprint; atomic temporary-file write; repeat acknowledgement rejected; fingerprint mismatch fails closed.
//! RO:SECURITY — stores no phrase words, entropy, root material, PIN, VMK, private key, capability, wallet data, or ledger data.
//! RO:TEST — focused tests below; command and clear wiring follow in Phase 6B2B2B2.

use std::{
    fs::{self, File, OpenOptions},
    io::Write,
    path::{Path, PathBuf},
};

#[cfg(unix)]
use std::os::unix::fs::{OpenOptionsExt, PermissionsExt};

pub const ONBOARDING_PHASE6B2B2B1_NATIVE_LABEL: &str =
    "ONBOARDING_PHASE6B2B2B1_NATIVE_ACKNOWLEDGEMENT_STORE";

pub const RECOVERY_ACKNOWLEDGEMENT_SCHEMA_V1: &str =
    "crablink.native-passport.recovery-acknowledgement.v1";

pub const RECOVERY_ACKNOWLEDGEMENT_FILE_NAME: &str = "recovery-acknowledged.v1";

pub const RECOVERY_ACKNOWLEDGEMENT_TEMP_FILE_NAME: &str = "recovery-acknowledged.v1.tmp";

pub const MAX_RECOVERY_ACKNOWLEDGEMENT_BYTES: usize = 128;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DesktopRecoveryAcknowledgementStoreError {
    InvalidFingerprint,
    BackendUnavailable,
    CorruptMarker,
    FingerprintMismatch,
    AlreadyAcknowledged,
}

pub trait DesktopRecoveryAcknowledgementStorePort: Send + Sync {
    fn is_recovery_acknowledged(
        &self,
        expected_fingerprint: &str,
    ) -> Result<bool, DesktopRecoveryAcknowledgementStoreError>;

    fn record_recovery_acknowledgement(
        &self,
        fingerprint: &str,
    ) -> Result<(), DesktopRecoveryAcknowledgementStoreError>;

    fn clear_recovery_acknowledgement(
        &self,
    ) -> Result<bool, DesktopRecoveryAcknowledgementStoreError>;
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DesktopRecoveryAcknowledgementStore {
    root_directory: PathBuf,
    marker_path: PathBuf,
    temporary_path: PathBuf,
}

impl DesktopRecoveryAcknowledgementStore {
    pub fn new(root_directory: impl Into<PathBuf>) -> Self {
        let root_directory = root_directory.into();

        Self {
            marker_path: root_directory.join(RECOVERY_ACKNOWLEDGEMENT_FILE_NAME),
            temporary_path: root_directory.join(RECOVERY_ACKNOWLEDGEMENT_TEMP_FILE_NAME),
            root_directory,
        }
    }

    pub fn root_directory(&self) -> &Path {
        &self.root_directory
    }

    pub fn marker_path(&self) -> &Path {
        &self.marker_path
    }

    pub fn temporary_path(&self) -> &Path {
        &self.temporary_path
    }

    fn root_exists(&self) -> Result<bool, DesktopRecoveryAcknowledgementStoreError> {
        match fs::symlink_metadata(&self.root_directory) {
            Ok(metadata) => {
                if metadata.file_type().is_symlink() || !metadata.is_dir() {
                    return Err(DesktopRecoveryAcknowledgementStoreError::BackendUnavailable);
                }

                secure_root_permissions(&self.root_directory)?;

                Ok(true)
            }
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(false),
            Err(_) => Err(DesktopRecoveryAcknowledgementStoreError::BackendUnavailable),
        }
    }

    fn ensure_root(&self) -> Result<(), DesktopRecoveryAcknowledgementStoreError> {
        if self.root_directory.as_os_str().is_empty() || !self.root_directory.is_absolute() {
            return Err(DesktopRecoveryAcknowledgementStoreError::BackendUnavailable);
        }

        fs::create_dir_all(&self.root_directory)
            .map_err(|_| DesktopRecoveryAcknowledgementStoreError::BackendUnavailable)?;

        if !self.root_exists()? {
            return Err(DesktopRecoveryAcknowledgementStoreError::BackendUnavailable);
        }

        Ok(())
    }

    fn regular_file_exists(
        &self,
        path: &Path,
    ) -> Result<bool, DesktopRecoveryAcknowledgementStoreError> {
        match fs::symlink_metadata(path) {
            Ok(metadata) => {
                if metadata.file_type().is_symlink() || !metadata.is_file() {
                    return Err(DesktopRecoveryAcknowledgementStoreError::BackendUnavailable);
                }

                Ok(true)
            }
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(false),
            Err(_) => Err(DesktopRecoveryAcknowledgementStoreError::BackendUnavailable),
        }
    }

    fn read_marker(&self, path: &Path) -> Result<String, DesktopRecoveryAcknowledgementStoreError> {
        if !self.regular_file_exists(path)? {
            return Err(DesktopRecoveryAcknowledgementStoreError::BackendUnavailable);
        }

        let metadata = fs::metadata(path)
            .map_err(|_| DesktopRecoveryAcknowledgementStoreError::BackendUnavailable)?;

        let actual = usize::try_from(metadata.len()).unwrap_or(usize::MAX);

        if actual == 0 || actual > MAX_RECOVERY_ACKNOWLEDGEMENT_BYTES {
            return Err(DesktopRecoveryAcknowledgementStoreError::CorruptMarker);
        }

        let bytes = fs::read(path)
            .map_err(|_| DesktopRecoveryAcknowledgementStoreError::BackendUnavailable)?;

        let text = std::str::from_utf8(&bytes)
            .map_err(|_| DesktopRecoveryAcknowledgementStoreError::CorruptMarker)?;

        parse_marker(text)
    }

    fn recover_interrupted_write(&self) -> Result<(), DesktopRecoveryAcknowledgementStoreError> {
        if !self.regular_file_exists(&self.temporary_path)? {
            return Ok(());
        }

        if self.regular_file_exists(&self.marker_path)? {
            fs::remove_file(&self.temporary_path)
                .map_err(|_| DesktopRecoveryAcknowledgementStoreError::BackendUnavailable)?;

            self.sync_root()?;

            return Ok(());
        }

        self.read_marker(&self.temporary_path)?;

        fs::rename(&self.temporary_path, &self.marker_path)
            .map_err(|_| DesktopRecoveryAcknowledgementStoreError::BackendUnavailable)?;

        self.sync_root()
    }

    fn create_temporary_file(&self) -> Result<File, DesktopRecoveryAcknowledgementStoreError> {
        let mut options = OpenOptions::new();

        options.write(true).create_new(true);

        #[cfg(unix)]
        {
            options.mode(0o600);
        }

        options
            .open(&self.temporary_path)
            .map_err(|_| DesktopRecoveryAcknowledgementStoreError::BackendUnavailable)
    }

    fn sync_root(&self) -> Result<(), DesktopRecoveryAcknowledgementStoreError> {
        #[cfg(unix)]
        {
            let directory = File::open(&self.root_directory)
                .map_err(|_| DesktopRecoveryAcknowledgementStoreError::BackendUnavailable)?;

            directory
                .sync_all()
                .map_err(|_| DesktopRecoveryAcknowledgementStoreError::BackendUnavailable)?;
        }

        Ok(())
    }
}

impl DesktopRecoveryAcknowledgementStorePort for DesktopRecoveryAcknowledgementStore {
    fn is_recovery_acknowledged(
        &self,
        expected_fingerprint: &str,
    ) -> Result<bool, DesktopRecoveryAcknowledgementStoreError> {
        validate_fingerprint(expected_fingerprint)?;

        if !self.root_exists()? {
            return Ok(false);
        }

        self.recover_interrupted_write()?;

        if !self.regular_file_exists(&self.marker_path)? {
            return Ok(false);
        }

        let stored = self.read_marker(&self.marker_path)?;

        if stored != expected_fingerprint {
            return Err(DesktopRecoveryAcknowledgementStoreError::FingerprintMismatch);
        }

        Ok(true)
    }

    fn record_recovery_acknowledgement(
        &self,
        fingerprint: &str,
    ) -> Result<(), DesktopRecoveryAcknowledgementStoreError> {
        validate_fingerprint(fingerprint)?;

        self.ensure_root()?;
        self.recover_interrupted_write()?;

        if self.regular_file_exists(&self.marker_path)? {
            let stored = self.read_marker(&self.marker_path)?;

            if stored == fingerprint {
                return Err(DesktopRecoveryAcknowledgementStoreError::AlreadyAcknowledged);
            }

            return Err(DesktopRecoveryAcknowledgementStoreError::FingerprintMismatch);
        }

        let bytes = marker_bytes(fingerprint);

        let mut temporary = self.create_temporary_file()?;

        temporary
            .write_all(bytes.as_bytes())
            .map_err(|_| DesktopRecoveryAcknowledgementStoreError::BackendUnavailable)?;

        temporary
            .sync_all()
            .map_err(|_| DesktopRecoveryAcknowledgementStoreError::BackendUnavailable)?;

        drop(temporary);

        fs::rename(&self.temporary_path, &self.marker_path)
            .map_err(|_| DesktopRecoveryAcknowledgementStoreError::BackendUnavailable)?;

        self.sync_root()
    }

    fn clear_recovery_acknowledgement(
        &self,
    ) -> Result<bool, DesktopRecoveryAcknowledgementStoreError> {
        if !self.root_exists()? {
            return Ok(false);
        }

        let mut removed = false;

        for path in [&self.marker_path, &self.temporary_path] {
            if self.regular_file_exists(path)? {
                fs::remove_file(path)
                    .map_err(|_| DesktopRecoveryAcknowledgementStoreError::BackendUnavailable)?;

                removed = true;
            }
        }

        if removed {
            self.sync_root()?;
        }

        Ok(removed)
    }
}

fn marker_bytes(fingerprint: &str) -> String {
    format!("{RECOVERY_ACKNOWLEDGEMENT_SCHEMA_V1}\nfingerprint={fingerprint}\n")
}

fn parse_marker(text: &str) -> Result<String, DesktopRecoveryAcknowledgementStoreError> {
    let mut lines = text.lines();

    if lines.next() != Some(RECOVERY_ACKNOWLEDGEMENT_SCHEMA_V1) {
        return Err(DesktopRecoveryAcknowledgementStoreError::CorruptMarker);
    }

    let fingerprint = lines
        .next()
        .and_then(|line| line.strip_prefix("fingerprint="))
        .ok_or(DesktopRecoveryAcknowledgementStoreError::CorruptMarker)?;

    if lines.next().is_some() {
        return Err(DesktopRecoveryAcknowledgementStoreError::CorruptMarker);
    }

    validate_fingerprint(fingerprint)?;

    Ok(fingerprint.to_owned())
}

fn validate_fingerprint(fingerprint: &str) -> Result<(), DesktopRecoveryAcknowledgementStoreError> {
    if fingerprint.len() != 16
        || !fingerprint
            .bytes()
            .all(|byte| byte.is_ascii_digit() || matches!(byte, b'a'..=b'f'))
    {
        return Err(DesktopRecoveryAcknowledgementStoreError::InvalidFingerprint);
    }

    Ok(())
}

#[cfg(unix)]
fn secure_root_permissions(path: &Path) -> Result<(), DesktopRecoveryAcknowledgementStoreError> {
    fs::set_permissions(path, fs::Permissions::from_mode(0o700))
        .map_err(|_| DesktopRecoveryAcknowledgementStoreError::BackendUnavailable)
}

#[cfg(not(unix))]
fn secure_root_permissions(_path: &Path) -> Result<(), DesktopRecoveryAcknowledgementStoreError> {
    Ok(())
}

#[cfg(test)]
mod tests {
    use std::{
        fs,
        sync::atomic::{AtomicU64, Ordering},
        time::{SystemTime, UNIX_EPOCH},
    };

    use super::*;

    static TEST_DIRECTORY_COUNTER: AtomicU64 = AtomicU64::new(0);

    const FINGERPRINT_A: &str = "0123456789abcdef";

    const FINGERPRINT_B: &str = "fedcba9876543210";

    struct TestDirectory {
        path: PathBuf,
    }

    impl TestDirectory {
        fn new(label: &str) -> Self {
            let timestamp = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("clock after Unix epoch")
                .as_nanos();

            let counter = TEST_DIRECTORY_COUNTER.fetch_add(1, Ordering::Relaxed);

            let path = std::env::temp_dir().join(format!(
                "crablink-phase6b2b2b1-{label}-{}-{timestamp}-{counter}",
                std::process::id(),
            ));

            Self { path }
        }

        fn path(&self) -> &Path {
            &self.path
        }
    }

    impl Drop for TestDirectory {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.path);
        }
    }

    #[test]
    fn phase6b2b2b1_absent_marker_is_not_acknowledged() {
        let directory = TestDirectory::new("absent");

        let store = DesktopRecoveryAcknowledgementStore::new(directory.path());

        assert_eq!(store.is_recovery_acknowledged(FINGERPRINT_A,), Ok(false),);
    }

    #[test]
    fn phase6b2b2b1_records_and_reads_exact_fingerprint() {
        let directory = TestDirectory::new("roundtrip");

        let store = DesktopRecoveryAcknowledgementStore::new(directory.path());

        assert_eq!(
            store.record_recovery_acknowledgement(FINGERPRINT_A,),
            Ok(()),
        );

        assert_eq!(store.is_recovery_acknowledged(FINGERPRINT_A,), Ok(true),);

        let marker = fs::read_to_string(store.marker_path()).expect("read marker");

        assert_eq!(marker, marker_bytes(FINGERPRINT_A),);

        assert!(!store.temporary_path().exists());
    }

    #[test]
    fn phase6b2b2b1_repeat_acknowledgement_is_rejected() {
        let directory = TestDirectory::new("repeat");

        let store = DesktopRecoveryAcknowledgementStore::new(directory.path());

        store
            .record_recovery_acknowledgement(FINGERPRINT_A)
            .expect("record acknowledgement");

        assert_eq!(
            store.record_recovery_acknowledgement(FINGERPRINT_A,),
            Err(DesktopRecoveryAcknowledgementStoreError::AlreadyAcknowledged,),
        );
    }

    #[test]
    fn phase6b2b2b1_fingerprint_mismatch_fails_closed() {
        let directory = TestDirectory::new("mismatch");

        let store = DesktopRecoveryAcknowledgementStore::new(directory.path());

        store
            .record_recovery_acknowledgement(FINGERPRINT_A)
            .expect("record acknowledgement");

        assert_eq!(
            store.is_recovery_acknowledged(FINGERPRINT_B,),
            Err(DesktopRecoveryAcknowledgementStoreError::FingerprintMismatch,),
        );

        assert_eq!(
            store.record_recovery_acknowledgement(FINGERPRINT_B,),
            Err(DesktopRecoveryAcknowledgementStoreError::FingerprintMismatch,),
        );
    }

    #[test]
    fn phase6b2b2b1_valid_interrupted_write_is_promoted() {
        let directory = TestDirectory::new("recovery");

        let store = DesktopRecoveryAcknowledgementStore::new(directory.path());

        fs::create_dir_all(store.root_directory()).expect("create marker root");

        fs::write(store.temporary_path(), marker_bytes(FINGERPRINT_A))
            .expect("write interrupted marker");

        assert_eq!(store.is_recovery_acknowledged(FINGERPRINT_A,), Ok(true),);

        assert!(store.marker_path().exists());

        assert!(!store.temporary_path().exists());
    }

    #[test]
    fn phase6b2b2b1_clear_removes_marker_and_temporary_file() {
        let directory = TestDirectory::new("clear");

        let store = DesktopRecoveryAcknowledgementStore::new(directory.path());

        store
            .record_recovery_acknowledgement(FINGERPRINT_A)
            .expect("record acknowledgement");

        fs::write(store.temporary_path(), marker_bytes(FINGERPRINT_A))
            .expect("write stale temporary marker");

        assert_eq!(store.clear_recovery_acknowledgement(), Ok(true),);

        assert!(!store.marker_path().exists());

        assert!(!store.temporary_path().exists());

        assert_eq!(store.clear_recovery_acknowledgement(), Ok(false),);
    }

    #[test]
    fn phase6b2b2b1_invalid_fingerprint_is_rejected_before_io() {
        let directory = TestDirectory::new("invalid");

        let store = DesktopRecoveryAcknowledgementStore::new(directory.path());

        for invalid in [
            "",
            "0123456789abcde",
            "0123456789abcdef0",
            "0123456789ABCDEf",
            "0123456789abcdeg",
        ] {
            assert_eq!(
                store.record_recovery_acknowledgement(invalid,),
                Err(DesktopRecoveryAcknowledgementStoreError::InvalidFingerprint,),
            );
        }

        assert!(!store.root_directory().exists());
    }

    #[test]
    fn phase6b2b2b1_source_stores_only_redacted_marker_truth() {
        let source = include_str!("passport_recovery_acknowledgement_store.rs");

        let production_source = source
            .split_once("#[cfg(test)]")
            .map(|(production, _tests)| production)
            .expect("test boundary present");

        let production_code = production_source
            .lines()
            .filter(|line| !line.trim_start().starts_with("//"))
            .collect::<Vec<_>>()
            .join("\n");

        for required in [
            "create_new(true)",
            "write_all(",
            "sync_all()",
            "fs::rename(",
            "FingerprintMismatch",
            "AlreadyAcknowledged",
            "fingerprint=",
        ] {
            assert!(
                production_code.contains(required),
                "production store missing {required}",
            );
        }

        for forbidden in [
            "#[tauri::command]",
            "serde::",
            "recovery_phrase",
            "mnemonic",
            "entropy",
            "private_key",
            "seed_phrase",
            "println!",
            "eprintln!",
            "tracing::",
            "clipboard",
            "localStorage",
            "sessionStorage",
            "wallet.spend(",
            "ledger.write(",
        ] {
            assert!(
                !production_code.contains(forbidden),
                "production store contains forbidden {forbidden}",
            );
        }
    }
}
