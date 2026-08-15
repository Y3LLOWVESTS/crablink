//! RO:WHAT — Atomic desktop app-data store for CrabLink private local-following preferences.
//! RO:WHY — FINAL_BETA Phase 8 keeps creator selection local while surviving restart and interrupted writes.
//! RO:INTERACTS — Tauri app-data root, future following commands, crablink.local-following.v1.
//! RO:INVARIANTS — fixed app-data path; bounded JSON; strict schema; atomic replacement; no server social graph.
//! RO:METRICS — none; local preference persistence only.
//! RO:CONFIG — fixed directory local-following and file following-v1.json.
//! RO:SECURITY — no Passport secrets, capabilities, network mutation, follower counts, wallet, ledger, ROC, or finality authority.
//! RO:TEST — tests/final_beta_phase8a3_desktop_local_following_store.rs.

// FINAL_BETA_PHASE8A3_DESKTOP_LOCAL_FOLLOWING_STORE_V1

use serde::{Deserialize, Serialize};
use std::{
    collections::HashSet,
    error::Error,
    fmt,
    fs::{self, File, OpenOptions},
    io::Write,
    path::{Path, PathBuf},
};

#[cfg(unix)]
use std::os::unix::fs::{OpenOptionsExt, PermissionsExt};

#[cfg(windows)]
use std::os::windows::ffi::OsStrExt;

#[cfg(windows)]
use windows_sys::Win32::Storage::FileSystem::{
    MoveFileExW, MOVEFILE_REPLACE_EXISTING, MOVEFILE_WRITE_THROUGH,
};

pub const FINAL_BETA_PHASE8A3_LABEL: &str =
    "FINAL_BETA_PHASE8A3_DESKTOP_LOCAL_FOLLOWING_STORE";

pub const LOCAL_FOLLOWING_SCHEMA: &str =
    "crablink.local-following.v1";

pub const LOCAL_FOLLOWING_DIRECTORY_NAME: &str =
    "local-following";

pub const LOCAL_FOLLOWING_FILE_NAME: &str =
    "following-v1.json";

pub const LOCAL_FOLLOWING_TEMPORARY_FILE_NAME: &str =
    "following-v1.json.tmp";

pub const LOCAL_FOLLOWING_MAX_ENTRIES: usize =
    10_000;

pub const LOCAL_FOLLOWING_MAX_FILE_BYTES: u64 =
    8 * 1024 * 1024;

pub const LOCAL_FOLLOWING_MAX_CURSOR_BYTES: usize =
    512;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct LocalFollowingEntryV1 {
    pub profile_ref: String,
    pub username: String,
    pub followed_at: String,
    pub last_timeline_cursor: Option<String>,
    pub last_refresh_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct LocalFollowingRecordV1 {
    pub schema: String,
    pub entries: Vec<LocalFollowingEntryV1>,
    pub updated_at: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LocalFollowingStoreError {
    InvalidRoot,
    InvalidRecord,
    TooLarge,
    Io,
    Json,
}

impl fmt::Display for LocalFollowingStoreError {
    fn fmt(
        &self,
        formatter: &mut fmt::Formatter<'_>,
    ) -> fmt::Result {
        let message = match self {
            Self::InvalidRoot =>
                "local following storage root is invalid",
            Self::InvalidRecord =>
                "local following record is invalid",
            Self::TooLarge =>
                "local following record exceeds its local storage bound",
            Self::Io =>
                "local following storage operation failed",
            Self::Json =>
                "local following record encoding is invalid",
        };

        formatter.write_str(message)
    }
}

impl Error for LocalFollowingStoreError {}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LocalFollowingRecoveryOutcome {
    NoTemporaryFile,
    StaleTemporaryFileRemoved,
    ValidTemporaryFilePromoted,
}

#[derive(Debug, Clone)]
pub struct DesktopLocalFollowingStore {
    root_directory: PathBuf,
}

impl DesktopLocalFollowingStore {
    pub fn new(
        app_data_directory: &Path,
    ) -> Result<Self, LocalFollowingStoreError> {
        if app_data_directory.is_absolute() == false {
            return Err(
                LocalFollowingStoreError::InvalidRoot,
            );
        }

        let root_directory =
            app_data_directory.join(
                LOCAL_FOLLOWING_DIRECTORY_NAME,
            );

        fs::create_dir_all(
            &root_directory,
        )
        .map_err(
            |_| LocalFollowingStoreError::Io,
        )?;

        let metadata =
            fs::symlink_metadata(
                &root_directory,
            )
            .map_err(
                |_| LocalFollowingStoreError::Io,
            )?;

        if metadata.file_type().is_dir() == false {
            return Err(
                LocalFollowingStoreError::InvalidRoot,
            );
        }

        #[cfg(unix)]
        fs::set_permissions(
            &root_directory,
            fs::Permissions::from_mode(0o700),
        )
        .map_err(
            |_| LocalFollowingStoreError::Io,
        )?;

        Ok(Self {
            root_directory,
        })
    }

    pub fn root_directory(
        &self,
    ) -> &Path {
        &self.root_directory
    }

    pub fn record_path(
        &self,
    ) -> PathBuf {
        self.root_directory.join(
            LOCAL_FOLLOWING_FILE_NAME,
        )
    }

    pub fn temporary_path(
        &self,
    ) -> PathBuf {
        self.root_directory.join(
            LOCAL_FOLLOWING_TEMPORARY_FILE_NAME,
        )
    }

    pub fn load(
        &self,
    ) -> Result<
        Option<LocalFollowingRecordV1>,
        LocalFollowingStoreError,
    > {
        let path =
            self.record_path();

        if regular_file_exists(
            &path,
        )? == false {
            return Ok(None);
        }

        let bytes =
            read_bounded_file(
                &path,
            )?;

        let record =
            decode_record(
                &bytes,
            )?;

        Ok(Some(record))
    }

    pub fn write_atomic(
        &self,
        record: &LocalFollowingRecordV1,
    ) -> Result<(), LocalFollowingStoreError> {
        validate_local_following_record(
            record,
        )?;

        let mut encoded =
            serde_json::to_vec_pretty(
                record,
            )
            .map_err(
                |_| LocalFollowingStoreError::Json,
            )?;

        encoded.push(
            b'\n',
        );

        if encoded.len() as u64 >
            LOCAL_FOLLOWING_MAX_FILE_BYTES
        {
            return Err(
                LocalFollowingStoreError::TooLarge,
            );
        }

        let destination =
            self.record_path();

        let temporary =
            self.temporary_path();

        if path_exists(
            &destination,
        )? {
            require_regular_file(
                &destination,
            )?;
        }

        if path_exists(
            &temporary,
        )? {
            require_regular_file(
                &temporary,
            )?;

            fs::remove_file(
                &temporary,
            )
            .map_err(
                |_| LocalFollowingStoreError::Io,
            )?;
        }

        let mut options =
            OpenOptions::new();

        options
            .write(true)
            .create_new(true);

        #[cfg(unix)]
        {
            options.mode(
                0o600,
            );
        }

        let mut file =
            options
                .open(
                    &temporary,
                )
                .map_err(
                    |_| LocalFollowingStoreError::Io,
                )?;

        file.write_all(
            &encoded,
        )
        .map_err(
            |_| LocalFollowingStoreError::Io,
        )?;

        file.sync_all()
            .map_err(
                |_| LocalFollowingStoreError::Io,
            )?;

        drop(file);

        replace_file(
            &temporary,
            &destination,
        )?;

        sync_directory(
            &self.root_directory,
        )?;

        Ok(())
    }

    pub fn recover_interrupted_write(
        &self,
    ) -> Result<
        LocalFollowingRecoveryOutcome,
        LocalFollowingStoreError,
    > {
        let temporary =
            self.temporary_path();

        if path_exists(
            &temporary,
        )? == false {
            return Ok(
                LocalFollowingRecoveryOutcome::NoTemporaryFile,
            );
        }

        require_regular_file(
            &temporary,
        )?;

        let destination =
            self.record_path();

        if path_exists(
            &destination,
        )? {
            require_regular_file(
                &destination,
            )?;

            fs::remove_file(
                &temporary,
            )
            .map_err(
                |_| LocalFollowingStoreError::Io,
            )?;

            sync_directory(
                &self.root_directory,
            )?;

            return Ok(
                LocalFollowingRecoveryOutcome::
                    StaleTemporaryFileRemoved,
            );
        }

        let bytes =
            read_bounded_file(
                &temporary,
            )?;

        if let Err(error) =
            decode_record(
                &bytes,
            )
        {
            let _ =
                fs::remove_file(
                    &temporary,
                );

            let _ =
                sync_directory(
                    &self.root_directory,
                );

            return Err(error);
        }

        replace_file(
            &temporary,
            &destination,
        )?;

        sync_directory(
            &self.root_directory,
        )?;

        Ok(
            LocalFollowingRecoveryOutcome::
                ValidTemporaryFilePromoted,
        )
    }
}

#[derive(Debug)]
pub struct InitializedDesktopLocalFollowingStore {
    pub store: DesktopLocalFollowingStore,
    pub recovery_outcome:
        LocalFollowingRecoveryOutcome,
}

pub fn initialize_desktop_local_following_store(
    app_data_directory: &Path,
) -> Result<
    InitializedDesktopLocalFollowingStore,
    LocalFollowingStoreError,
> {
    let store =
        DesktopLocalFollowingStore::new(
            app_data_directory,
        )?;

    let recovery_outcome =
        store.recover_interrupted_write()?;

    Ok(
        InitializedDesktopLocalFollowingStore {
            store,
            recovery_outcome,
        },
    )
}

pub fn validate_local_following_record(
    record: &LocalFollowingRecordV1,
) -> Result<(), LocalFollowingStoreError> {
    if record.schema !=
        LOCAL_FOLLOWING_SCHEMA
    {
        return Err(
            LocalFollowingStoreError::InvalidRecord,
        );
    }

    if record.entries.len() >
        LOCAL_FOLLOWING_MAX_ENTRIES
    {
        return Err(
            LocalFollowingStoreError::TooLarge,
        );
    }

    if canonical_timestamp(
        &record.updated_at,
    ) == false
    {
        return Err(
            LocalFollowingStoreError::InvalidRecord,
        );
    }

    let mut seen =
        HashSet::with_capacity(
            record.entries.len(),
        );

    for entry in &record.entries {
        validate_entry(
            entry,
        )?;

        if seen.insert(
            entry.profile_ref.as_str(),
        ) == false
        {
            return Err(
                LocalFollowingStoreError::InvalidRecord,
            );
        }
    }

    Ok(())
}

fn validate_entry(
    entry: &LocalFollowingEntryV1,
) -> Result<(), LocalFollowingStoreError> {
    if valid_username(
        &entry.username,
    ) == false
    {
        return Err(
            LocalFollowingStoreError::InvalidRecord,
        );
    }

    let expected_profile_ref = [
        "crab://@",
        entry.username.as_str(),
    ]
    .concat();

    if entry.profile_ref !=
        expected_profile_ref
    {
        return Err(
            LocalFollowingStoreError::InvalidRecord,
        );
    }

    if canonical_timestamp(
        &entry.followed_at,
    ) == false
    {
        return Err(
            LocalFollowingStoreError::InvalidRecord,
        );
    }

    if let Some(
        last_refresh_at,
    ) = &entry.last_refresh_at
    {
        if canonical_timestamp(
            last_refresh_at,
        ) == false
        {
            return Err(
                LocalFollowingStoreError::InvalidRecord,
            );
        }
    }

    if let Some(
        cursor,
    ) = &entry.last_timeline_cursor
    {
        if cursor.is_empty() ||
            cursor.len() >
                LOCAL_FOLLOWING_MAX_CURSOR_BYTES ||
            cursor
                .chars()
                .any(
                    char::is_control,
                )
        {
            return Err(
                LocalFollowingStoreError::InvalidRecord,
            );
        }
    }

    Ok(())
}

fn valid_username(
    value: &str,
) -> bool {
    let bytes =
        value.as_bytes();

    if bytes.len() < 3 ||
        bytes.len() > 32
    {
        return false;
    }

    let ascii_alphanumeric =
        |byte: u8| {
            byte.is_ascii_lowercase() ||
                byte.is_ascii_digit()
        };

    if ascii_alphanumeric(
        bytes[0],
    ) == false ||
        ascii_alphanumeric(
            bytes[bytes.len() - 1],
        ) == false
    {
        return false;
    }

    bytes.iter().all(
        |byte| {
            ascii_alphanumeric(
                *byte,
            ) ||
                *byte == b'.' ||
                *byte == b'_'
        },
    )
}

fn canonical_timestamp(
    value: &str,
) -> bool {
    let bytes =
        value.as_bytes();

    if bytes.len() != 24 {
        return false;
    }

    for (
        index,
        expected,
    ) in [
        (4, b'-'),
        (7, b'-'),
        (10, b'T'),
        (13, b':'),
        (16, b':'),
        (19, b'.'),
        (23, b'Z'),
    ] {
        if bytes[index] != expected {
            return false;
        }
    }

    for index in [
        0usize, 1, 2, 3,
        5, 6,
        8, 9,
        11, 12,
        14, 15,
        17, 18,
        20, 21, 22,
    ] {
        if bytes[index]
            .is_ascii_digit() == false
        {
            return false;
        }
    }

    let year =
        parse_ascii_digits(
            bytes,
            0,
            4,
        );

    let month =
        parse_ascii_digits(
            bytes,
            5,
            2,
        );

    let day =
        parse_ascii_digits(
            bytes,
            8,
            2,
        );

    let hour =
        parse_ascii_digits(
            bytes,
            11,
            2,
        );

    let minute =
        parse_ascii_digits(
            bytes,
            14,
            2,
        );

    let second =
        parse_ascii_digits(
            bytes,
            17,
            2,
        );

    if year == 0 ||
        month == 0 ||
        month > 12 ||
        hour > 23 ||
        minute > 59 ||
        second > 59
    {
        return false;
    }

    let max_day =
        days_in_month(
            year,
            month,
        );

    day >= 1 &&
        day <= max_day
}

fn parse_ascii_digits(
    bytes: &[u8],
    start: usize,
    length: usize,
) -> u32 {
    let mut value =
        0u32;

    for byte in
        &bytes[start..start + length]
    {
        value =
            value * 10 +
            u32::from(
                *byte - b'0',
            );
    }

    value
}

fn days_in_month(
    year: u32,
    month: u32,
) -> u32 {
    match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 =>
            31,
        4 | 6 | 9 | 11 =>
            30,
        2 => {
            if leap_year(
                year,
            ) {
                29
            } else {
                28
            }
        }
        _ =>
            0,
    }
}

fn leap_year(
    year: u32,
) -> bool {
    year % 4 == 0 &&
        (
            year % 100 != 0 ||
            year % 400 == 0
        )
}

fn decode_record(
    bytes: &[u8],
) -> Result<
    LocalFollowingRecordV1,
    LocalFollowingStoreError,
> {
    let record:
        LocalFollowingRecordV1 =
        serde_json::from_slice(
            bytes,
        )
        .map_err(
            |_| LocalFollowingStoreError::Json,
        )?;

    validate_local_following_record(
        &record,
    )?;

    Ok(record)
}

fn path_exists(
    path: &Path,
) -> Result<bool, LocalFollowingStoreError> {
    match fs::symlink_metadata(
        path,
    ) {
        Ok(_) =>
            Ok(true),
        Err(error)
            if error.kind() ==
                std::io::ErrorKind::NotFound =>
        {
            Ok(false)
        }
        Err(_) =>
            Err(
                LocalFollowingStoreError::Io,
            ),
    }
}

fn regular_file_exists(
    path: &Path,
) -> Result<bool, LocalFollowingStoreError> {
    if path_exists(
        path,
    )? == false
    {
        return Ok(false);
    }

    require_regular_file(
        path,
    )?;

    Ok(true)
}

fn require_regular_file(
    path: &Path,
) -> Result<(), LocalFollowingStoreError> {
    let metadata =
        fs::symlink_metadata(
            path,
        )
        .map_err(
            |_| LocalFollowingStoreError::Io,
        )?;

    if metadata.file_type().is_file() == false {
        return Err(
            LocalFollowingStoreError::Io,
        );
    }

    Ok(())
}

fn read_bounded_file(
    path: &Path,
) -> Result<Vec<u8>, LocalFollowingStoreError> {
    require_regular_file(
        path,
    )?;

    let metadata =
        fs::metadata(
            path,
        )
        .map_err(
            |_| LocalFollowingStoreError::Io,
        )?;

    if metadata.len() >
        LOCAL_FOLLOWING_MAX_FILE_BYTES
    {
        return Err(
            LocalFollowingStoreError::TooLarge,
        );
    }

    fs::read(
        path,
    )
    .map_err(
        |_| LocalFollowingStoreError::Io,
    )
}

#[cfg(not(windows))]
fn replace_file(
    source: &Path,
    destination: &Path,
) -> Result<(), LocalFollowingStoreError> {
    fs::rename(
        source,
        destination,
    )
    .map_err(
        |_| LocalFollowingStoreError::Io,
    )
}

#[cfg(windows)]
fn replace_file(
    source: &Path,
    destination: &Path,
) -> Result<(), LocalFollowingStoreError> {
    let mut source_wide:
        Vec<u16> =
        source
            .as_os_str()
            .encode_wide()
            .collect();

    source_wide.push(
        0,
    );

    let mut destination_wide:
        Vec<u16> =
        destination
            .as_os_str()
            .encode_wide()
            .collect();

    destination_wide.push(
        0,
    );

    let result =
        unsafe {
            MoveFileExW(
                source_wide.as_ptr(),
                destination_wide.as_ptr(),
                MOVEFILE_REPLACE_EXISTING |
                    MOVEFILE_WRITE_THROUGH,
            )
        };

    if result == 0 {
        return Err(
            LocalFollowingStoreError::Io,
        );
    }

    Ok(())
}

#[cfg(unix)]
fn sync_directory(
    path: &Path,
) -> Result<(), LocalFollowingStoreError> {
    File::open(
        path,
    )
    .and_then(
        |directory|
            directory.sync_all(),
    )
    .map_err(
        |_| LocalFollowingStoreError::Io,
    )
}

#[cfg(not(unix))]
fn sync_directory(
    path: &Path,
) -> Result<(), LocalFollowingStoreError> {
    let _ =
        path;

    Ok(())
}
