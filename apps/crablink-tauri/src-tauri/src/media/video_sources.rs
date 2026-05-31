//! RO:WHAT — Registers local video source paths behind redacted handles for CrabLink Tauri.
//! RO:WHY — Real transcode jobs need native file authority without exposing private paths to React.
//! RO:INTERACTS — commands::media, AppState.video_sources, video_jobs, VideoConverterPanel.jsx.
//! RO:INVARIANTS — no media bytes in commands; no raw path returned; no shell bridge; handle-only follow-up.
//! RO:METRICS — none yet; future staging should expose source registrations and cleanup counters.
//! RO:CONFIG — uses conservative MVP size/input limits from limits.rs.
//! RO:SECURITY — validates file path, file type, size; stores canonical path only in Rust memory.
//! RO:TEST — cargo check; manual crab://video native source registration smoke.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{
    atomic::{AtomicU64, Ordering},
    Mutex,
};
use std::time::{SystemTime, UNIX_EPOCH};

use super::limits::{MVP_MAX_LOCAL_VIDEO_BYTES, MVP_WARN_LOCAL_VIDEO_BYTES};

static NEXT_SOURCE_COUNTER: AtomicU64 = AtomicU64::new(1);

pub type VideoSourceStore = Mutex<HashMap<String, RegisteredVideoSource>>;

pub fn new_video_source_store() -> VideoSourceStore {
    Mutex::new(HashMap::new())
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoRegisterSourceInput {
    pub path: String,
    pub content_type: Option<String>,
    pub duration_seconds: Option<f64>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub frame_rate: Option<String>,
    pub source: Option<String>,
}

#[derive(Debug, Clone)]
pub struct RegisteredVideoSource {
    pub canonical_path: PathBuf,
    pub public: VideoSourceRegistration,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoSourceRegistration {
    pub schema: String,
    pub source_handle: String,
    pub status: String,
    pub safe_display_name: String,
    pub extension: String,
    pub content_type: String,
    pub bytes: u64,
    pub duration_seconds: Option<f64>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub frame_rate: Option<String>,
    pub modified_unix_ms: Option<u128>,
    pub registered_at_unix_ms: u128,
    pub source_kind: String,
    pub supported_input: bool,
    pub native_file_authority: bool,
    pub warnings: Vec<String>,
    pub truth_boundary: VideoSourceTruthBoundary,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoSourceTruthBoundary {
    pub returns_private_path: bool,
    pub returns_video_bytes: bool,
    pub reads_full_video_bytes: bool,
    pub runs_transcode: bool,
    pub strips_metadata: bool,
    pub writes_output_files: bool,
    pub mints_b3: bool,
    pub creates_receipt: bool,
    pub mutates_wallet: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoSourceClearResponse {
    pub schema: String,
    pub source_handle: String,
    pub cleared: bool,
    pub message: String,
}

pub fn register_video_source_from_path(
    store: &VideoSourceStore,
    input: VideoRegisterSourceInput,
) -> Result<VideoSourceRegistration, String> {
    let now = now_unix_ms()?;
    let raw_path = input.path.trim();

    if raw_path.is_empty() {
        return Err("video source path is required".to_string());
    }

    if raw_path.len() > 4096 {
        return Err("video source path is too long".to_string());
    }

    let expanded = expand_user_path(raw_path)?;
    let canonical = std::fs::canonicalize(&expanded)
        .map_err(|_| "video source file was not found or is not accessible".to_string())?;

    validate_reasonable_local_path(&canonical)?;

    let metadata = std::fs::metadata(&canonical)
        .map_err(|_| "video source metadata could not be read".to_string())?;

    if !metadata.is_file() {
        return Err("video source must be a regular file".to_string());
    }

    let bytes = metadata.len();
    if bytes == 0 {
        return Err("video source file is empty".to_string());
    }

    if bytes > MVP_MAX_LOCAL_VIDEO_BYTES {
        return Err(format!(
            "video source exceeds the first local conversion MVP cap: {} > {}",
            format_bytes(bytes),
            format_bytes(MVP_MAX_LOCAL_VIDEO_BYTES)
        ));
    }

    let safe_display_name = safe_file_name(&canonical);
    let extension = file_extension(&canonical);
    let content_type = clean_string(input.content_type)
        .unwrap_or_else(|| guess_content_type(&extension).to_string());

    let supported_input = is_supported_extension(&extension) || content_type.starts_with("video/");
    if !supported_input {
        return Err("video source extension/content type is not supported by the current planner".to_string());
    }

    let source_handle = format!(
        "video_source_{}_{}",
        now,
        NEXT_SOURCE_COUNTER.fetch_add(1, Ordering::Relaxed)
    );

    let mut warnings = Vec::new();

    if bytes > MVP_WARN_LOCAL_VIDEO_BYTES {
        warnings.push(format!(
            "This source is larger than the conservative warning threshold: {}.",
            format_bytes(bytes)
        ));
    }

    if !matches!(extension.as_str(), "mp4" | "m4v") {
        warnings.push(
            "This source will likely need MP4/H.264/AAC conversion before creator-facing mint."
                .to_string(),
        );
    } else {
        warnings.push(
            "This source appears to already be an MP4-family file, but metadata cleanup is still recommended."
                .to_string(),
        );
    }

    warnings.push(
        "Rust stored a native file handle internally. The private filesystem path is not returned to React."
            .to_string(),
    );

    let public = VideoSourceRegistration {
        schema: "crablink.local.video-source.v1".to_string(),
        source_handle: source_handle.clone(),
        status: "registered".to_string(),
        safe_display_name,
        extension,
        content_type,
        bytes,
        duration_seconds: finite_positive_f64(input.duration_seconds),
        width: input.width.filter(|value| *value > 0),
        height: input.height.filter(|value| *value > 0),
        frame_rate: clean_string(input.frame_rate),
        modified_unix_ms: metadata
            .modified()
            .ok()
            .and_then(|modified| modified.duration_since(UNIX_EPOCH).ok())
            .map(|duration| duration.as_millis()),
        registered_at_unix_ms: now,
        source_kind: clean_string(input.source).unwrap_or_else(|| "native_path_registration".to_string()),
        supported_input,
        native_file_authority: true,
        warnings,
        truth_boundary: VideoSourceTruthBoundary {
            returns_private_path: false,
            returns_video_bytes: false,
            reads_full_video_bytes: false,
            runs_transcode: false,
            strips_metadata: false,
            writes_output_files: false,
            mints_b3: false,
            creates_receipt: false,
            mutates_wallet: false,
        },
    };

    let registered = RegisteredVideoSource {
        canonical_path: canonical,
        public: public.clone(),
    };

    let mut guard = store
        .lock()
        .map_err(|_| "video source store lock poisoned".to_string())?;

    guard.insert(source_handle, registered);
    Ok(public)
}

pub fn get_video_source_registration(
    store: &VideoSourceStore,
    source_handle: String,
) -> Result<VideoSourceRegistration, String> {
    let clean_handle = clean_source_handle(&source_handle)?;

    let guard = store
        .lock()
        .map_err(|_| "video source store lock poisoned".to_string())?;

    let source = guard
        .get(&clean_handle)
        .ok_or_else(|| "video source handle not found".to_string())?;

    Ok(source.public.clone())
}

pub fn get_registered_video_source_for_job(
    store: &VideoSourceStore,
    source_handle: &str,
) -> Result<RegisteredVideoSource, String> {
    let clean_handle = clean_source_handle(source_handle)?;

    let guard = store
        .lock()
        .map_err(|_| "video source store lock poisoned".to_string())?;

    let source = guard
        .get(&clean_handle)
        .ok_or_else(|| "video source handle not found".to_string())?;

    if !source.canonical_path.exists() {
        return Err("video source file is no longer available".to_string());
    }

    Ok(source.clone())
}

pub fn clear_video_source_registration(
    store: &VideoSourceStore,
    source_handle: String,
) -> Result<VideoSourceClearResponse, String> {
    let clean_handle = clean_source_handle(&source_handle)?;

    let mut guard = store
        .lock()
        .map_err(|_| "video source store lock poisoned".to_string())?;

    let cleared = guard.remove(&clean_handle).is_some();

    Ok(VideoSourceClearResponse {
        schema: "crablink.local.video-source-clear.v1".to_string(),
        source_handle: clean_handle,
        cleared,
        message: if cleared {
            "Native video source handle cleared from Rust memory.".to_string()
        } else {
            "Native video source handle was not present.".to_string()
        },
    })
}

fn validate_reasonable_local_path(path: &Path) -> Result<(), String> {
    if path.components().count() > 96 {
        return Err("video source path is too deeply nested".to_string());
    }

    Ok(())
}

fn expand_user_path(value: &str) -> Result<PathBuf, String> {
    if value == "~" {
        let home = std::env::var_os("HOME")
            .ok_or_else(|| "HOME is unavailable for ~ expansion".to_string())?;
        return Ok(PathBuf::from(home));
    }

    if let Some(rest) = value.strip_prefix("~/") {
        let home = std::env::var_os("HOME")
            .ok_or_else(|| "HOME is unavailable for ~ expansion".to_string())?;
        return Ok(PathBuf::from(home).join(rest));
    }

    Ok(PathBuf::from(value))
}

fn safe_file_name(path: &Path) -> String {
    let fallback = "selected-video".to_string();

    let raw = path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("selected-video");

    let safe: String = raw
        .chars()
        .filter(|ch| !ch.is_control())
        .take(180)
        .collect();

    if safe.trim().is_empty() {
        fallback
    } else {
        safe
    }
}

fn file_extension(path: &Path) -> String {
    path.extension()
        .and_then(|value| value.to_str())
        .unwrap_or("")
        .trim()
        .trim_start_matches('.')
        .to_ascii_lowercase()
}

fn guess_content_type(extension: &str) -> &'static str {
    match extension {
        "mp4" | "m4v" => "video/mp4",
        "mov" => "video/quicktime",
        "webm" => "video/webm",
        "ogv" | "ogg" => "video/ogg",
        "mkv" => "video/x-matroska",
        "avi" => "video/x-msvideo",
        _ => "application/octet-stream",
    }
}

fn is_supported_extension(extension: &str) -> bool {
    matches!(
        extension,
        "mp4" | "m4v" | "mov" | "webm" | "ogv" | "ogg" | "mkv" | "avi"
    )
}

fn clean_string(value: Option<String>) -> Option<String> {
    let clean = value.unwrap_or_default().trim().to_string();

    if clean.is_empty() {
        None
    } else {
        Some(clean)
    }
}

fn finite_positive_f64(value: Option<f64>) -> Option<f64> {
    value.filter(|n| n.is_finite() && *n > 0.0)
}

fn clean_source_handle(value: &str) -> Result<String, String> {
    let clean = value.trim();

    if clean.is_empty() {
        return Err("sourceHandle is required".to_string());
    }

    if clean.len() > 180 {
        return Err("sourceHandle is too long".to_string());
    }

    if !clean
        .chars()
        .all(|ch| ch.is_ascii_alphanumeric() || ch == '_' || ch == '-')
    {
        return Err("sourceHandle contains unsupported characters".to_string());
    }

    Ok(clean.to_string())
}

fn now_unix_ms() -> Result<u128, String> {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .map_err(|_| "system clock is before unix epoch".to_string())
}

fn format_bytes(bytes: u64) -> String {
    if bytes < 1024 {
        return format!("{bytes} B");
    }

    let kib = bytes as f64 / 1024.0;
    if kib < 1024.0 {
        return format!("{kib:.1} KiB");
    }

    let mib = kib / 1024.0;
    if mib < 1024.0 {
        return format!("{mib:.1} MiB");
    }

    format!("{:.2} GiB", mib / 1024.0)
}