// FINAL_BETA_PHASE9A7_DESKTOP_OFFLINE_CACHE_STORE_V2
//
// Native ownership is intentionally narrow:
// - fixed app-data paths
// - bounded JSON object bytes
// - atomic temporary-file replacement
// - interrupted-write recovery
// - symlink rejection
//
// The native store does not own the feed-cache schema or publication rules.
// Strict cache validation remains in crablink-core.

use std::{
    fs::{self, File, OpenOptions},
    io::{Read, Write},
    path::{Path, PathBuf},
};

pub const LOCAL_FOLLOWING_FEED_CACHE_DIR: &str =
    "local-following-feed-cache";

pub const LOCAL_FOLLOWING_FEED_CACHE_FILE: &str =
    "feed-cache-v1.json";

pub const LOCAL_FOLLOWING_FEED_CACHE_TEMP_FILE: &str =
    "feed-cache-v1.json.tmp";

pub const LOCAL_FOLLOWING_FEED_CACHE_MAX_BYTES: usize =
    8 * 1024 * 1024;

#[derive(Debug)]
pub enum LocalFollowingFeedCacheStoreError {
    InvalidAppDataRoot,
    UnsafeSymlinkPath,
    CacheTooLarge,
    InvalidJsonObject,
    InvalidUtf8,
    Io(std::io::Error),
}

impl std::fmt::Display for LocalFollowingFeedCacheStoreError {
    fn fmt(
        &self,
        formatter: &mut std::fmt::Formatter<'_>,
    ) -> std::fmt::Result {
        match self {
            Self::InvalidAppDataRoot => {
                formatter.write_str(
                    "local following feed cache app-data root must be absolute",
                )
            }
            Self::UnsafeSymlinkPath => {
                formatter.write_str(
                    "local following feed cache path must not be a symlink",
                )
            }
            Self::CacheTooLarge => {
                formatter.write_str(
                    "local following feed cache exceeds the native byte bound",
                )
            }
            Self::InvalidJsonObject => {
                formatter.write_str(
                    "local following feed cache must contain a JSON object",
                )
            }
            Self::InvalidUtf8 => {
                formatter.write_str(
                    "local following feed cache must contain UTF-8 JSON",
                )
            }
            Self::Io(error) => {
                std::fmt::Display::fmt(
                    error,
                    formatter,
                )
            }
        }
    }
}

impl std::error::Error
    for LocalFollowingFeedCacheStoreError
{
    fn source(
        &self,
    ) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::Io(error) => Some(error),
            _ => None,
        }
    }
}

impl From<std::io::Error>
    for LocalFollowingFeedCacheStoreError
{
    fn from(
        error: std::io::Error,
    ) -> Self {
        Self::Io(error)
    }
}

#[derive(Debug, Clone)]
pub struct LocalFollowingFeedCacheStore {
    app_data_root: PathBuf,
    cache_dir: PathBuf,
    cache_path: PathBuf,
    temp_path: PathBuf,
}

impl LocalFollowingFeedCacheStore {
    pub fn from_app_data_root(
        app_data_root: PathBuf,
    ) -> Result<Self, LocalFollowingFeedCacheStoreError> {
        if app_data_root.is_absolute() == false {
            return Err(
                LocalFollowingFeedCacheStoreError::InvalidAppDataRoot,
            );
        }

        let cache_dir =
            app_data_root.join(
                LOCAL_FOLLOWING_FEED_CACHE_DIR,
            );

        let cache_path =
            cache_dir.join(
                LOCAL_FOLLOWING_FEED_CACHE_FILE,
            );

        let temp_path =
            cache_dir.join(
                LOCAL_FOLLOWING_FEED_CACHE_TEMP_FILE,
            );

        Ok(Self {
            app_data_root,
            cache_dir,
            cache_path,
            temp_path,
        })
    }

    pub fn app_data_root(
        &self,
    ) -> &Path {
        &self.app_data_root
    }

    pub fn cache_dir(
        &self,
    ) -> &Path {
        &self.cache_dir
    }

    pub fn cache_path(
        &self,
    ) -> &Path {
        &self.cache_path
    }

    pub fn temp_path(
        &self,
    ) -> &Path {
        &self.temp_path
    }

    pub fn read_cache_json(
        &self,
    ) -> Result<Option<String>, LocalFollowingFeedCacheStoreError> {
        self.ensure_read_paths_safe()?;

        if metadata_if_present(
            &self.cache_dir,
        )?
        .is_none()
        {
            return Ok(None);
        }

        if metadata_if_present(
            &self.cache_path,
        )?
        .is_some()
        {
            let value =
                read_bounded_json_object(
                    &self.cache_path,
                )?;

            self.remove_stale_temp_if_present()?;

            return Ok(Some(value));
        }

        if metadata_if_present(
            &self.temp_path,
        )?
        .is_some()
        {
            let value =
                read_bounded_json_object(
                    &self.temp_path,
                )?;

            fs::rename(
                &self.temp_path,
                &self.cache_path,
            )?;

            sync_directory_best_effort(
                &self.cache_dir,
            );

            return Ok(Some(value));
        }

        Ok(None)
    }

    pub fn write_cache_json(
        &self,
        json: &str,
    ) -> Result<(), LocalFollowingFeedCacheStoreError> {
        validate_bounded_json_object(
            json,
        )?;

        self.ensure_write_paths_safe()?;

        fs::create_dir_all(
            &self.cache_dir,
        )?;

        ensure_not_symlink(
            &self.cache_dir,
        )?;

        ensure_not_symlink_if_present(
            &self.cache_path,
        )?;

        ensure_not_symlink_if_present(
            &self.temp_path,
        )?;

        let mut file =
            OpenOptions::new()
                .create(true)
                .write(true)
                .truncate(true)
                .open(
                    &self.temp_path,
                )?;

        file.write_all(
            json.as_bytes(),
        )?;

        file.sync_all()?;

        drop(file);

        fs::rename(
            &self.temp_path,
            &self.cache_path,
        )?;

        sync_directory_best_effort(
            &self.cache_dir,
        );

        Ok(())
    }

    fn ensure_read_paths_safe(
        &self,
    ) -> Result<(), LocalFollowingFeedCacheStoreError> {
        ensure_not_symlink_if_present(
            &self.app_data_root,
        )?;

        ensure_not_symlink_if_present(
            &self.cache_dir,
        )?;

        ensure_not_symlink_if_present(
            &self.cache_path,
        )?;

        ensure_not_symlink_if_present(
            &self.temp_path,
        )?;

        Ok(())
    }

    fn ensure_write_paths_safe(
        &self,
    ) -> Result<(), LocalFollowingFeedCacheStoreError> {
        ensure_not_symlink_if_present(
            &self.app_data_root,
        )?;

        ensure_not_symlink_if_present(
            &self.cache_dir,
        )?;

        ensure_not_symlink_if_present(
            &self.cache_path,
        )?;

        ensure_not_symlink_if_present(
            &self.temp_path,
        )?;

        Ok(())
    }

    fn remove_stale_temp_if_present(
        &self,
    ) -> Result<(), LocalFollowingFeedCacheStoreError> {
        let metadata =
            metadata_if_present(
                &self.temp_path,
            )?;

        if let Some(metadata) = metadata {
            if metadata.file_type().is_symlink() {
                return Err(
                    LocalFollowingFeedCacheStoreError::UnsafeSymlinkPath,
                );
            }

            if metadata.is_file() {
                fs::remove_file(
                    &self.temp_path,
                )?;
            }
        }

        Ok(())
    }
}

fn validate_bounded_json_object(
    json: &str,
) -> Result<(), LocalFollowingFeedCacheStoreError> {
    if json.len() >
        LOCAL_FOLLOWING_FEED_CACHE_MAX_BYTES
    {
        return Err(
            LocalFollowingFeedCacheStoreError::CacheTooLarge,
        );
    }

    let value:
        serde_json::Value =
        serde_json::from_str(
            json,
        )
        .map_err(
            |_| {
                LocalFollowingFeedCacheStoreError::InvalidJsonObject
            },
        )?;

    if value.is_object() == false {
        return Err(
            LocalFollowingFeedCacheStoreError::InvalidJsonObject,
        );
    }

    Ok(())
}

fn read_bounded_json_object(
    path: &Path,
) -> Result<String, LocalFollowingFeedCacheStoreError> {
    ensure_not_symlink(
        path,
    )?;

    let metadata =
        fs::metadata(
            path,
        )?;

    if metadata.len() >
        LOCAL_FOLLOWING_FEED_CACHE_MAX_BYTES as u64
    {
        return Err(
            LocalFollowingFeedCacheStoreError::CacheTooLarge,
        );
    }

    let file =
        File::open(
            path,
        )?;

    let mut bytes =
        Vec::with_capacity(
            metadata.len() as usize,
        );

    file.take(
        LOCAL_FOLLOWING_FEED_CACHE_MAX_BYTES as u64 + 1,
    )
    .read_to_end(
        &mut bytes,
    )?;

    if bytes.len() >
        LOCAL_FOLLOWING_FEED_CACHE_MAX_BYTES
    {
        return Err(
            LocalFollowingFeedCacheStoreError::CacheTooLarge,
        );
    }

    let json =
        String::from_utf8(
            bytes,
        )
        .map_err(
            |_| {
                LocalFollowingFeedCacheStoreError::InvalidUtf8
            },
        )?;

    validate_bounded_json_object(
        &json,
    )?;

    Ok(json)
}

fn metadata_if_present(
    path: &Path,
) -> Result<Option<std::fs::Metadata>, LocalFollowingFeedCacheStoreError> {
    match fs::symlink_metadata(
        path,
    ) {
        Ok(metadata) => Ok(Some(metadata)),
        Err(error)
            if error.kind() ==
                std::io::ErrorKind::NotFound =>
        {
            Ok(None)
        }
        Err(error) => Err(
            LocalFollowingFeedCacheStoreError::Io(
                error,
            ),
        ),
    }
}

fn ensure_not_symlink_if_present(
    path: &Path,
) -> Result<(), LocalFollowingFeedCacheStoreError> {
    if let Some(metadata) =
        metadata_if_present(
            path,
        )?
    {
        if metadata.file_type().is_symlink() {
            return Err(
                LocalFollowingFeedCacheStoreError::UnsafeSymlinkPath,
            );
        }
    }

    Ok(())
}

fn ensure_not_symlink(
    path: &Path,
) -> Result<(), LocalFollowingFeedCacheStoreError> {
    let metadata =
        fs::symlink_metadata(
            path,
        )?;

    if metadata.file_type().is_symlink() {
        return Err(
            LocalFollowingFeedCacheStoreError::UnsafeSymlinkPath,
        );
    }

    Ok(())
}

fn sync_directory_best_effort(
    path: &Path,
) {
    if let Ok(directory) =
        File::open(
            path,
        )
    {
        let _ =
            directory.sync_all();
    }
}
