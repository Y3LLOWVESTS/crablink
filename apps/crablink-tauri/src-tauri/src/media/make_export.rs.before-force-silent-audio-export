//! RO:WHAT — Stages approved crab://make clip chunks and exports one normalized local MP4 source handle.
//! RO:WHY — Make records browser-native clips, then Rust normalizes/joins them without inventing backend truth.
//! RO:INTERACTS — commands::media, AppState.make_exports, video_sources, video_transcode, MakePage.jsx.
//! RO:INVARIANTS — bounded chunks only; no private paths returned; no fake CIDs/receipts; no wallet mutation.
//! RO:METRICS — none yet; future export jobs should expose chunk/write/transcode counters.
//! RO:CONFIG — CRABLINK_FFMPEG/CRABLINK_FFPROBE may override tools; temp files live under OS temp dir.
//! RO:SECURITY — fixed FFmpeg args only, generated temp paths only, metadata stripped, redacted source handles.
//! RO:TEST — cargo check; manual crab://make sequence export → crab://video source handoff smoke.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::{self, File, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::{
    atomic::{AtomicU64, Ordering},
    Mutex,
};
use std::time::{SystemTime, UNIX_EPOCH};

use super::limits::MVP_MAX_LOCAL_VIDEO_BYTES;
use super::video_sources::{
    register_video_source_from_path, VideoRegisterSourceInput, VideoSourceRegistration,
    VideoSourceStore,
};
use super::video_transcode::{configure_command_stdio, ffmpeg_binary};

static NEXT_MAKE_EXPORT_COUNTER: AtomicU64 = AtomicU64::new(1);

const MAKE_EXPORT_SCHEMA: &str = "crablink.local.make-export.v2";
const MAX_MAKE_EXPORT_SEGMENTS: usize = 64;
const MAX_MAKE_EXPORT_CHUNK_BYTES: usize = 512 * 1024;
const DEFAULT_EXPORT_WIDTH: u32 = 1280;
const DEFAULT_EXPORT_HEIGHT: u32 = 720;
const DEFAULT_EXPORT_FPS: u32 = 30;

pub type MakeExportStore = Mutex<HashMap<String, MakeExportRecord>>;

pub fn new_make_export_store() -> MakeExportStore {
    Mutex::new(HashMap::new())
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MakeExportBeginInput {
    pub title: Option<String>,
    pub target_file_name: Option<String>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub fps: Option<u32>,
    pub segment_count: usize,
    pub expected_bytes: Option<u64>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MakeExportAppendChunkInput {
    pub session_id: String,
    pub segment_index: usize,
    pub segment_name: Option<String>,
    pub mime_type: Option<String>,
    pub total_bytes: u64,
    pub offset: u64,
    pub bytes: Vec<u8>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MakeExportFinishInput {
    pub session_id: String,
    pub title: Option<String>,
    pub target_file_name: Option<String>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub fps: Option<u32>,
    pub register_source: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MakeExportStatus {
    pub schema: String,
    pub session_id: String,
    pub status: String,
    pub phase: String,
    pub progress_percent: u8,
    pub created_at_unix_ms: u128,
    pub updated_at_unix_ms: u128,
    pub completed_at_unix_ms: Option<u128>,
    pub title: String,
    pub output_file_name: String,
    pub output_content_type: String,
    pub output_bytes: Option<u64>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub fps: Option<u32>,
    pub segment_count: usize,
    pub uploaded_segments: usize,
    pub received_bytes: u64,
    pub expected_bytes: Option<u64>,
    pub source: Option<VideoSourceRegistration>,
    pub warnings: Vec<String>,
    pub error: Option<MakeExportError>,
    pub truth_boundary: MakeExportTruthBoundary,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MakeExportError {
    pub code: String,
    pub message: String,
    pub retryable: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MakeExportTruthBoundary {
    pub accepts_bounded_chunks: bool,
    pub returns_private_path: bool,
    pub returns_video_bytes: bool,
    pub runs_transcode: bool,
    pub strips_metadata: bool,
    pub writes_output_files: bool,
    pub registers_video_source_handle: bool,
    pub uploads_bytes: bool,
    pub mints_b3: bool,
    pub creates_receipt: bool,
    pub mutates_wallet: bool,
    pub exposes_native_command: bool,
}

#[derive(Debug, Clone)]
pub struct MakeExportRecord {
    pub session_id: String,
    pub status: String,
    pub phase: String,
    pub progress_percent: u8,
    pub created_at_unix_ms: u128,
    pub updated_at_unix_ms: u128,
    pub completed_at_unix_ms: Option<u128>,
    pub title: String,
    pub output_file_name: String,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub fps: Option<u32>,
    pub segment_count: usize,
    pub expected_bytes: Option<u64>,
    pub received_bytes: u64,
    pub dir: PathBuf,
    pub output_path: PathBuf,
    pub segments: Vec<MakeExportSegment>,
    pub source: Option<VideoSourceRegistration>,
    pub warnings: Vec<String>,
    pub error: Option<MakeExportError>,
}

#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct MakeExportSegment {
    pub index: usize,
    pub file_name: String,
    pub mime_type: String,
    pub expected_bytes: u64,
    pub received_bytes: u64,
    pub path: PathBuf,
}

pub fn begin_make_export_session(
    store: &MakeExportStore,
    input: MakeExportBeginInput,
) -> Result<MakeExportStatus, String> {
    validate_begin_input(&input)?;

    let now = now_unix_ms()?;
    let counter = NEXT_MAKE_EXPORT_COUNTER.fetch_add(1, Ordering::Relaxed);
    let session_id = format!("make_export_{now}_{counter}");
    let dir = make_export_dir(&session_id)?;
    fs::create_dir_all(&dir)
        .map_err(|_| "could not create local Make export staging directory".to_string())?;

    let output_file_name = safe_output_file_name(
        input
            .target_file_name
            .as_deref()
            .or(input.title.as_deref())
            .unwrap_or("crablink-make-export"),
    );
    let output_path = dir.join(&output_file_name);
    let expected_bytes = input.expected_bytes.filter(|value| *value > 0);

    let mut warnings = vec![
        "Make export accepts browser clip bytes as bounded chunks and writes them to a Rust-owned temp staging directory.".to_string(),
        "Browser-recorded clips may arrive as WebM; Rust normalizes each clip before writing the final MP4.".to_string(),
        "The returned source handle is local Tauri authority only; it is not a backend CID, crab URL, receipt, ownership proof, or paid unlock.".to_string(),
    ];

    if expected_bytes.unwrap_or(0) > 100 * 1024 * 1024 {
        warnings.push(
            "This Make export is large. Keep the app open until the MP4 handoff finishes."
                .to_string(),
        );
    }

    let record = MakeExportRecord {
        session_id: session_id.clone(),
        status: "receiving".to_string(),
        phase: "waiting_for_clip_chunks".to_string(),
        progress_percent: 1,
        created_at_unix_ms: now,
        updated_at_unix_ms: now,
        completed_at_unix_ms: None,
        title: clean_title(input.title.as_deref(), "CrabLink Make export"),
        output_file_name,
        width: input.width.filter(|value| *value >= 2),
        height: input.height.filter(|value| *value >= 2),
        fps: input.fps.map(|value| value.clamp(12, 60)),
        segment_count: input.segment_count,
        expected_bytes,
        received_bytes: 0,
        dir,
        output_path,
        segments: Vec::new(),
        source: None,
        warnings,
        error: None,
    };

    {
        let mut guard = store
            .lock()
            .map_err(|_| "Make export store lock poisoned".to_string())?;
        guard.insert(session_id.clone(), record);
    }

    get_make_export_status(store, session_id)
}

pub fn append_make_export_chunk(
    store: &MakeExportStore,
    input: MakeExportAppendChunkInput,
) -> Result<MakeExportStatus, String> {
    validate_append_input(&input)?;
    let clean_session_id = clean_handle(&input.session_id, "sessionId")?;

    let (segment_path, expected_offset) = {
        let mut guard = store
            .lock()
            .map_err(|_| "Make export store lock poisoned".to_string())?;
        let record = guard
            .get_mut(&clean_session_id)
            .ok_or_else(|| "Make export session not found".to_string())?;

        if record.status != "receiving" {
            return Err("Make export session is not accepting chunks".to_string());
        }

        if input.segment_index >= record.segment_count {
            return Err("segmentIndex is outside the Make export session segment count".to_string());
        }

        let segment = ensure_segment(record, &input)?;
        (segment.path.clone(), segment.received_bytes)
    };

    if expected_offset != input.offset {
        return Err(format!(
            "chunk offset mismatch for segment {}: expected {}, got {}",
            input.segment_index, expected_offset, input.offset
        ));
    }

    {
        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&segment_path)
            .map_err(|_| "could not open Make export segment for append".to_string())?;

        file.write_all(&input.bytes)
            .map_err(|_| "could not write Make export chunk".to_string())?;
        file.flush()
            .map_err(|_| "could not flush Make export chunk".to_string())?;
    }

    {
        let mut guard = store
            .lock()
            .map_err(|_| "Make export store lock poisoned".to_string())?;
        let record = guard
            .get_mut(&clean_session_id)
            .ok_or_else(|| "Make export session not found".to_string())?;

        let segment = record
            .segments
            .iter_mut()
            .find(|candidate| candidate.index == input.segment_index)
            .ok_or_else(|| "Make export segment disappeared".to_string())?;

        segment.received_bytes = segment
            .received_bytes
            .checked_add(input.bytes.len() as u64)
            .ok_or_else(|| "Make export segment byte count overflow".to_string())?;
        record.received_bytes = record
            .received_bytes
            .checked_add(input.bytes.len() as u64)
            .ok_or_else(|| "Make export byte count overflow".to_string())?;

        if segment.received_bytes > segment.expected_bytes {
            return Err("Make export segment received more bytes than declared".to_string());
        }

        if record.received_bytes > MVP_MAX_LOCAL_VIDEO_BYTES {
            return Err(format!(
                "Make export exceeds local MVP video cap of {} bytes",
                MVP_MAX_LOCAL_VIDEO_BYTES
            ));
        }

        record.updated_at_unix_ms = now_unix_ms()?;
        record.phase = format!("receiving_segment_{}", input.segment_index + 1);
        record.progress_percent = receiving_progress(record);
    }

    get_make_export_status(store, clean_session_id)
}

pub fn finish_make_export_session(
    store: &MakeExportStore,
    source_store: &VideoSourceStore,
    input: MakeExportFinishInput,
) -> Result<MakeExportStatus, String> {
    let clean_session_id = clean_handle(&input.session_id, "sessionId")?;

    let (dir, output_path, fps, width, height, title, output_file_name, segments) = {
        let mut guard = store
            .lock()
            .map_err(|_| "Make export store lock poisoned".to_string())?;
        let record = guard
            .get_mut(&clean_session_id)
            .ok_or_else(|| "Make export session not found".to_string())?;

        if record.status != "receiving" {
            return Err("Make export session cannot be finished from its current state".to_string());
        }

        if record.segments.len() != record.segment_count {
            return Err("Make export is missing one or more recorded segments".to_string());
        }

        for segment in &record.segments {
            if segment.received_bytes != segment.expected_bytes {
                return Err(format!(
                    "Make export segment {} is incomplete",
                    segment.index + 1
                ));
            }
        }

        record.status = "transcoding".to_string();
        record.phase = "normalizing_clip_segments".to_string();
        record.progress_percent = 88;
        record.updated_at_unix_ms = now_unix_ms()?;

        if let Some(name) = input.target_file_name.as_deref() {
            record.output_file_name = safe_output_file_name(name);
            record.output_path = record.dir.join(&record.output_file_name);
        }

        let mut segments = record.segments.clone();
        segments.sort_by_key(|segment| segment.index);

        (
            record.dir.clone(),
            record.output_path.clone(),
            input.fps.or(record.fps).map(|value| value.clamp(12, 60)),
            input.width.or(record.width),
            input.height.or(record.height),
            clean_title(input.title.as_deref(), &record.title),
            record.output_file_name.clone(),
            segments,
        )
    };

    let normalized_dir = dir.join("normalized");
    fs::create_dir_all(&normalized_dir)
        .map_err(|_| "could not create normalized Make export segment directory".to_string())?;

    let target_width = even_dimension(width.unwrap_or(DEFAULT_EXPORT_WIDTH));
    let target_height = even_dimension(height.unwrap_or(DEFAULT_EXPORT_HEIGHT));
    let target_fps = fps.unwrap_or(DEFAULT_EXPORT_FPS).clamp(12, 60);

    let mut normalized_paths = Vec::with_capacity(segments.len());

    for segment in &segments {
        let normalized_path = normalized_dir.join(format!("normalized-{:03}.mp4", segment.index + 1));
        run_ffmpeg_normalize_segment(
            &segment.path,
            &normalized_path,
            target_width,
            target_height,
            target_fps,
        )?;
        normalized_paths.push(normalized_path);
    }

    {
        let mut guard = store
            .lock()
            .map_err(|_| "Make export store lock poisoned".to_string())?;
        if let Some(record) = guard.get_mut(&clean_session_id) {
            record.phase = "joining_normalized_mp4_segments".to_string();
            record.progress_percent = 94;
            record.updated_at_unix_ms = now_unix_ms()?;
        }
    }

    let concat_list_path = dir.join("normalized-concat-list.txt");
    write_concat_list_from_paths(&normalized_paths, &concat_list_path)?;

    run_ffmpeg_concat_normalized(&concat_list_path, &output_path)?;

    let output_bytes = fs::metadata(&output_path)
        .map_err(|_| "Make export completed but output metadata could not be read".to_string())?
        .len();

    if output_bytes == 0 {
        return Err("Make export produced an empty MP4".to_string());
    }

    if output_bytes > MVP_MAX_LOCAL_VIDEO_BYTES {
        return Err(format!(
            "Make export MP4 exceeds local MVP video cap of {} bytes",
            MVP_MAX_LOCAL_VIDEO_BYTES
        ));
    }

    let source = if input.register_source.unwrap_or(true) {
        Some(register_video_source_from_path(
            source_store,
            VideoRegisterSourceInput {
                path: output_path.to_string_lossy().to_string(),
                content_type: Some("video/mp4".to_string()),
                duration_seconds: None,
                width: Some(target_width),
                height: Some(target_height),
                frame_rate: Some(target_fps.to_string()),
                source: Some("crablink_make_export_mp4".to_string()),
            },
        )?)
    } else {
        None
    };

    {
        let mut guard = store
            .lock()
            .map_err(|_| "Make export store lock poisoned".to_string())?;
        let record = guard
            .get_mut(&clean_session_id)
            .ok_or_else(|| "Make export session not found".to_string())?;

        record.status = "completed".to_string();
        record.phase = "mp4_source_handle_ready".to_string();
        record.progress_percent = 100;
        record.completed_at_unix_ms = Some(now_unix_ms()?);
        record.updated_at_unix_ms = record.completed_at_unix_ms.unwrap_or(record.updated_at_unix_ms);
        record.title = title;
        record.output_file_name = output_file_name;
        record.width = Some(target_width);
        record.height = Some(target_height);
        record.fps = Some(target_fps);
        record.source = source;
        record.warnings.push(
            "MP4 export is a local source handle for crab://video. It is not uploaded or minted yet."
                .to_string(),
        );
    }

    get_make_export_status(store, clean_session_id)
}

pub fn get_make_export_status(
    store: &MakeExportStore,
    session_id: String,
) -> Result<MakeExportStatus, String> {
    let clean_session_id = clean_handle(&session_id, "sessionId")?;
    let guard = store
        .lock()
        .map_err(|_| "Make export store lock poisoned".to_string())?;
    let record = guard
        .get(&clean_session_id)
        .ok_or_else(|| "Make export session not found".to_string())?;

    Ok(status_from_record(record))
}

pub fn clear_make_export_session(
    store: &MakeExportStore,
    session_id: String,
) -> Result<MakeExportStatus, String> {
    let clean_session_id = clean_handle(&session_id, "sessionId")?;

    let mut removed = {
        let mut guard = store
            .lock()
            .map_err(|_| "Make export store lock poisoned".to_string())?;
        guard
            .remove(&clean_session_id)
            .ok_or_else(|| "Make export session not found".to_string())?
    };

    removed.status = "cleared".to_string();
    removed.phase = "staging_files_removed".to_string();
    removed.progress_percent = 100;
    removed.updated_at_unix_ms = now_unix_ms()?;
    removed.completed_at_unix_ms = Some(removed.updated_at_unix_ms);

    if removed.dir.exists() {
        let _ = fs::remove_dir_all(&removed.dir);
    }

    Ok(status_from_record(&removed))
}

fn validate_begin_input(input: &MakeExportBeginInput) -> Result<(), String> {
    if input.segment_count == 0 {
        return Err("Make export requires at least one segment".to_string());
    }

    if input.segment_count > MAX_MAKE_EXPORT_SEGMENTS {
        return Err(format!(
            "Make export supports at most {MAX_MAKE_EXPORT_SEGMENTS} segments"
        ));
    }

    if input.expected_bytes.unwrap_or(0) > MVP_MAX_LOCAL_VIDEO_BYTES {
        return Err(format!(
            "Make export expected bytes exceed local MVP video cap of {} bytes",
            MVP_MAX_LOCAL_VIDEO_BYTES
        ));
    }

    Ok(())
}

fn validate_append_input(input: &MakeExportAppendChunkInput) -> Result<(), String> {
    if input.bytes.is_empty() {
        return Err("Make export chunk is empty".to_string());
    }

    if input.bytes.len() > MAX_MAKE_EXPORT_CHUNK_BYTES {
        return Err(format!(
            "Make export chunk exceeds {} byte command cap",
            MAX_MAKE_EXPORT_CHUNK_BYTES
        ));
    }

    if input.total_bytes == 0 {
        return Err("Make export segment totalBytes is required".to_string());
    }

    if input.total_bytes > MVP_MAX_LOCAL_VIDEO_BYTES {
        return Err(format!(
            "Make export segment exceeds local MVP video cap of {} bytes",
            MVP_MAX_LOCAL_VIDEO_BYTES
        ));
    }

    let chunk_len = input.bytes.len() as u64;
    let end = input
        .offset
        .checked_add(chunk_len)
        .ok_or_else(|| "Make export chunk offset overflow".to_string())?;

    if end > input.total_bytes {
        return Err("Make export chunk extends past declared segment length".to_string());
    }

    Ok(())
}

fn ensure_segment<'a>(
    record: &'a mut MakeExportRecord,
    input: &MakeExportAppendChunkInput,
) -> Result<&'a mut MakeExportSegment, String> {
    if let Some(position) = record
        .segments
        .iter()
        .position(|candidate| candidate.index == input.segment_index)
    {
        let segment = record
            .segments
            .get_mut(position)
            .ok_or_else(|| "Make export segment lookup failed".to_string())?;

        if segment.expected_bytes != input.total_bytes {
            return Err("segment totalBytes changed after upload started".to_string());
        }

        return Ok(segment);
    }

    let file_name = safe_segment_file_name(
        input
            .segment_name
            .as_deref()
            .unwrap_or("make-segment.webm"),
        input.segment_index,
    );
    let path = record.dir.join(&file_name);

    if path.exists() {
        let _ = fs::remove_file(&path);
    }

    record.segments.push(MakeExportSegment {
        index: input.segment_index,
        file_name,
        mime_type: input
            .mime_type
            .clone()
            .unwrap_or_else(|| "video/webm".to_string()),
        expected_bytes: input.total_bytes,
        received_bytes: 0,
        path,
    });
    record.segments.sort_by_key(|segment| segment.index);

    record
        .segments
        .iter_mut()
        .find(|segment| segment.index == input.segment_index)
        .ok_or_else(|| "Make export segment insert failed".to_string())
}

fn run_ffmpeg_normalize_segment(
    input_path: &Path,
    output_path: &Path,
    width: u32,
    height: u32,
    fps: u32,
) -> Result<(), String> {
    let ffmpeg = ffmpeg_binary();
    let has_audio = has_audio_stream(input_path);

    let mut command = Command::new(&ffmpeg);
    configure_command_stdio(&mut command);

    command
        .arg("-hide_banner")
        .arg("-nostdin")
        .arg("-y")
        .arg("-fflags")
        .arg("+genpts")
        .arg("-i")
        .arg(input_path);

    if !has_audio {
        command
            .arg("-f")
            .arg("lavfi")
            .arg("-i")
            .arg("anullsrc=channel_layout=stereo:sample_rate=48000");
    }

    let video_filter = format!(
        "scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2,fps={fps},format=yuv420p,setpts=PTS-STARTPTS"
    );

    command
        .arg("-map")
        .arg("0:v:0")
        .arg("-map")
        .arg(if has_audio { "0:a:0" } else { "1:a:0" })
        .arg("-vf")
        .arg(video_filter)
        .arg("-c:v")
        .arg("libx264")
        .arg("-preset")
        .arg("veryfast")
        .arg("-profile:v")
        .arg("high")
        .arg("-pix_fmt")
        .arg("yuv420p")
        .arg("-c:a")
        .arg("aac")
        .arg("-ar")
        .arg("48000")
        .arg("-ac")
        .arg("2")
        .arg("-b:a")
        .arg("160k")
        .arg("-shortest")
        .arg("-map_metadata")
        .arg("-1")
        .arg("-avoid_negative_ts")
        .arg("make_zero")
        .arg("-movflags")
        .arg("+faststart")
        .arg(output_path);

    run_command(command, "FFmpeg segment normalization failed")
}

fn run_ffmpeg_concat_normalized(
    concat_list_path: &Path,
    output_path: &Path,
) -> Result<(), String> {
    let ffmpeg = ffmpeg_binary();
    let mut command = Command::new(&ffmpeg);
    configure_command_stdio(&mut command);

    command
        .arg("-hide_banner")
        .arg("-nostdin")
        .arg("-y")
        .arg("-f")
        .arg("concat")
        .arg("-safe")
        .arg("0")
        .arg("-i")
        .arg(concat_list_path)
        .arg("-c")
        .arg("copy")
        .arg("-map_metadata")
        .arg("-1")
        .arg("-movflags")
        .arg("+faststart")
        .arg(output_path);

    run_command(command, "FFmpeg normalized MP4 join failed")
}

fn run_command(mut command: Command, label: &str) -> Result<(), String> {
    let output = command
        .output()
        .map_err(|_| format!("{label}: could not start FFmpeg"))?;

    if output.status.success() {
        return Ok(());
    }

    let stderr = String::from_utf8_lossy(&output.stderr);
    let stderr = sanitize_ffmpeg_error(&stderr);

    Err(if stderr.is_empty() {
        label.to_string()
    } else {
        format!("{label}: {stderr}")
    })
}

fn has_audio_stream(path: &Path) -> bool {
    let ffprobe = ffprobe_binary();
    let output = Command::new(ffprobe)
        .arg("-v")
        .arg("error")
        .arg("-select_streams")
        .arg("a:0")
        .arg("-show_entries")
        .arg("stream=index")
        .arg("-of")
        .arg("csv=p=0")
        .arg(path)
        .output();

    match output {
        Ok(output) if output.status.success() => !output.stdout.is_empty(),
        _ => false,
    }
}

fn ffprobe_binary() -> String {
    if let Ok(value) = std::env::var("CRABLINK_FFPROBE") {
        let trimmed = value.trim();

        if !trimmed.is_empty() {
            return trimmed.to_string();
        }
    }

    if let Ok(ffmpeg) = std::env::var("CRABLINK_FFMPEG") {
        let path = PathBuf::from(ffmpeg.trim());

        if let Some(parent) = path.parent() {
            let candidate = parent.join("ffprobe");

            if candidate.exists() {
                return candidate.to_string_lossy().to_string();
            }
        }
    }

    "ffprobe".to_string()
}

fn write_concat_list_from_paths(paths: &[PathBuf], concat_list_path: &Path) -> Result<(), String> {
    let mut file = File::create(concat_list_path)
        .map_err(|_| "could not create Make export concat list".to_string())?;

    for path in paths {
        if !path.exists() {
            return Err("Make export normalized segment missing on disk".to_string());
        }

        let escaped = concat_escape_path(path);
        writeln!(file, "file '{}'", escaped)
            .map_err(|_| "could not write Make export concat list".to_string())?;
    }

    file.flush()
        .map_err(|_| "could not flush Make export concat list".to_string())
}

fn status_from_record(record: &MakeExportRecord) -> MakeExportStatus {
    MakeExportStatus {
        schema: MAKE_EXPORT_SCHEMA.to_string(),
        session_id: record.session_id.clone(),
        status: record.status.clone(),
        phase: record.phase.clone(),
        progress_percent: record.progress_percent,
        created_at_unix_ms: record.created_at_unix_ms,
        updated_at_unix_ms: record.updated_at_unix_ms,
        completed_at_unix_ms: record.completed_at_unix_ms,
        title: record.title.clone(),
        output_file_name: record.output_file_name.clone(),
        output_content_type: "video/mp4".to_string(),
        output_bytes: fs::metadata(&record.output_path).ok().map(|meta| meta.len()),
        width: record.width,
        height: record.height,
        fps: record.fps,
        segment_count: record.segment_count,
        uploaded_segments: record
            .segments
            .iter()
            .filter(|segment| segment.received_bytes == segment.expected_bytes)
            .count(),
        received_bytes: record.received_bytes,
        expected_bytes: record.expected_bytes,
        source: record.source.clone(),
        warnings: record.warnings.clone(),
        error: record.error.clone(),
        truth_boundary: MakeExportTruthBoundary {
            accepts_bounded_chunks: true,
            returns_private_path: false,
            returns_video_bytes: false,
            runs_transcode: record.status == "transcoding" || record.status == "completed",
            strips_metadata: true,
            writes_output_files: true,
            registers_video_source_handle: record.source.is_some(),
            uploads_bytes: false,
            mints_b3: false,
            creates_receipt: false,
            mutates_wallet: false,
            exposes_native_command: false,
        },
    }
}

fn receiving_progress(record: &MakeExportRecord) -> u8 {
    let expected = record.expected_bytes.unwrap_or_else(|| {
        record
            .segments
            .iter()
            .map(|segment| segment.expected_bytes)
            .sum::<u64>()
            .max(1)
    });

    let pct = ((record.received_bytes as f64 / expected as f64) * 86.0).round() as u8;
    pct.clamp(1, 86)
}

fn make_export_dir(session_id: &str) -> Result<PathBuf, String> {
    let clean = clean_handle(session_id, "sessionId")?;
    Ok(std::env::temp_dir()
        .join("crablink-make-exports")
        .join(clean))
}

fn now_unix_ms() -> Result<u128, String> {
    Ok(SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|_| "system clock before unix epoch".to_string())?
        .as_millis())
}

fn clean_title(value: Option<&str>, fallback: &str) -> String {
    let trimmed = value.unwrap_or(fallback).trim();
    if trimmed.is_empty() {
        fallback.to_string()
    } else {
        trimmed.chars().take(120).collect()
    }
}

fn clean_handle(value: &str, label: &str) -> Result<String, String> {
    let clean: String = value
        .chars()
        .filter(|ch| ch.is_ascii_alphanumeric() || *ch == '_' || *ch == '-')
        .take(96)
        .collect();

    if clean.is_empty() {
        Err(format!("{label} is required"))
    } else {
        Ok(clean)
    }
}

fn safe_output_file_name(value: &str) -> String {
    let mut base = sanitize_file_stem(value);

    if base.is_empty() {
        base = "crablink-make-export".to_string();
    }

    if !base.ends_with(".mp4") {
        base.push_str(".mp4");
    }

    base
}

fn safe_segment_file_name(value: &str, index: usize) -> String {
    let stem = sanitize_file_stem(value);
    let ext = segment_extension(value);
    format!(
        "segment-{:03}-{}.{}",
        index + 1,
        if stem.is_empty() { "clip" } else { &stem },
        ext
    )
}

fn sanitize_file_stem(value: &str) -> String {
    let without_ext = value
        .rsplit_once('.')
        .map(|(stem, _)| stem)
        .unwrap_or(value);

    without_ext
        .trim()
        .to_lowercase()
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' {
                ch
            } else {
                '-'
            }
        })
        .collect::<String>()
        .split('-')
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>()
        .join("-")
        .chars()
        .take(80)
        .collect()
}

fn segment_extension(value: &str) -> &'static str {
    let lower = value.to_lowercase();
    if lower.ends_with(".mp4") {
        "mp4"
    } else if lower.ends_with(".mov") {
        "mov"
    } else if lower.ends_with(".mkv") {
        "mkv"
    } else {
        "webm"
    }
}

fn concat_escape_path(path: &Path) -> String {
    path.to_string_lossy()
        .replace('\\', "\\\\")
        .replace('\'', "'\\''")
}

fn even_dimension(value: u32) -> u32 {
    let clamped = value.clamp(160, 3840);
    if clamped % 2 == 0 {
        clamped
    } else {
        clamped - 1
    }
}

fn sanitize_ffmpeg_error(value: &str) -> String {
    value
        .lines()
        .rev()
        .take(10)
        .collect::<Vec<_>>()
        .into_iter()
        .rev()
        .collect::<Vec<_>>()
        .join(" ")
        .chars()
        .take(1400)
        .collect()
}
