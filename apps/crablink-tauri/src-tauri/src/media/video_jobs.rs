//! RO:WHAT — In-process video preparation job state and Rust-owned FFmpeg staging for CrabLink Tauri.
//! RO:WHY — Proves bounded local MP4 preparation while React remains display/user intent only.
//! RO:INTERACTS — commands::media, AppState.video_jobs/video_sources, video_transcode, VideoConverterPanel.jsx.
//! RO:INVARIANTS — no shell bridge; no raw FFmpeg args; no video bytes; no fake CID/receipt/wallet truth.
//! RO:METRICS — none yet; future real jobs should expose progress and failure counters.
//! RO:CONFIG — CRABLINK_FFMPEG may override ffmpeg binary; local staged files go under the OS temp directory.
//! RO:SECURITY — redacted staged:// handles only; no private filesystem paths or native command strings in DTOs.
//! RO:TEST — cargo check; manual crab://video native source → prepare job → staged outputs.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{
    atomic::{AtomicU64, Ordering},
    Arc, Mutex,
};
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use super::video_probe::VideoProbeSummary;
use super::video_renditions::{VideoRenditionEntry, VideoRenditionPlanResponse};
use super::video_sources::RegisteredVideoSource;
use super::video_transcode::{
    build_video_transcode_targets, configure_command_stdio, ffmpeg_binary, ffprobe_binary,
    probe_staged_output, VideoStagedOutputProbe, VideoTranscodeTarget,
};

static NEXT_JOB_COUNTER: AtomicU64 = AtomicU64::new(1);

pub type VideoJobStore = Arc<Mutex<HashMap<String, VideoJobRecord>>>;

pub fn new_video_job_store() -> VideoJobStore {
    Arc::new(Mutex::new(HashMap::new()))
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoPrepareBundleInput {
    pub probe: VideoProbeSummary,
    pub plan: VideoRenditionPlanResponse,
    pub source_label: Option<String>,
    pub source_handle: Option<String>,
    pub requested_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoJobRecord {
    pub schema: String,
    pub job_id: String,
    pub kind: String,
    pub status: String,
    pub phase: String,
    pub progress_percent: u8,
    pub created_at_unix_ms: u128,
    pub updated_at_unix_ms: u128,
    pub cancelled_at_unix_ms: Option<u128>,
    pub completed_at_unix_ms: Option<u128>,
    pub source: VideoJobSource,
    pub requested_by: String,
    pub entries: Vec<VideoRenditionEntry>,
    pub outputs: Vec<VideoJobOutputDescriptor>,
    pub warnings: Vec<String>,
    pub error: Option<VideoJobError>,
    pub truth_boundary: VideoJobTruthBoundary,
}

pub type VideoJobStatus = VideoJobRecord;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoJobSource {
    pub file_name: String,
    pub content_type: String,
    pub bytes: u64,
    pub duration_seconds: Option<f64>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub needs_transcode: bool,
    pub source_label: String,
    pub source_handle: Option<String>,
    pub source_authority: String,
    pub native_source_registered: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoJobOutputDescriptor {
    pub role: String,
    pub label: String,
    pub asset_kind: String,
    pub target_container: String,
    pub target_mime: String,
    pub video_codec: Option<String>,
    pub audio_codec: Option<String>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub duration_seconds: Option<f64>,
    pub staged_handle: String,
    pub exists_on_disk: bool,
    pub bytes: Option<u64>,
    pub content_id: Option<String>,
    pub crab_url: Option<String>,
    pub ready_for_mint: bool,
    pub note: String,
    pub verification: VideoJobOutputVerification,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoJobOutputVerification {
    pub status: String,
    pub checked_with: String,
    pub expected_width: Option<u32>,
    pub expected_height: Option<u32>,
    pub actual_width: Option<u32>,
    pub actual_height: Option<u32>,
    pub actual_duration_seconds: Option<f64>,
    pub actual_video_codec: Option<String>,
    pub actual_audio_codec: Option<String>,
    pub dimensions_within_target: Option<bool>,
    pub note: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoJobError {
    pub code: String,
    pub message: String,
    pub retryable: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoJobTruthBoundary {
    pub simulated_job: bool,
    pub has_native_source_handle: bool,
    pub runs_transcode: bool,
    pub strips_metadata: bool,
    pub writes_output_files: bool,
    pub returns_video_bytes: bool,
    pub uploads_bytes: bool,
    pub mints_b3: bool,
    pub creates_receipt: bool,
    pub mutates_wallet: bool,
    pub exposes_native_command: bool,
    pub returns_private_path: bool,
}

pub fn start_video_prepare_job(
    store: &VideoJobStore,
    input: VideoPrepareBundleInput,
    registered_source: Option<RegisteredVideoSource>,
) -> Result<VideoJobStatus, String> {
    validate_prepare_input(&input)?;

    let now = now_unix_ms()?;
    let counter = NEXT_JOB_COUNTER.fetch_add(1, Ordering::Relaxed);
    let job_id = format!("video_prepare_{now}_{counter}");

    let source_handle = clean_optional_handle(input.source_handle.clone());
    let has_native_source_handle = source_handle.is_some();
    let runs_real_transcode = registered_source.is_some();

    let mut warnings = Vec::new();
    warnings.extend(input.probe.warnings.clone());
    warnings.extend(input.plan.warnings.clone());

    if runs_real_transcode {
        warnings.push(
            "Prepare job is linked to a Rust-held native source handle and will stage local MP4/image outputs. The private path is not returned to React."
                .to_string(),
        );
        warnings.push(
            "Staged outputs are local files only. They are not backend CIDs, crab URLs, receipts, ownership proofs, or paid unlocks."
                .to_string(),
        );
    } else if has_native_source_handle {
        warnings.push(
            "A sourceHandle was supplied but no matching Rust-held source was provided to the job engine."
                .to_string(),
        );
    } else {
        warnings.push(
            "Prepare job has preview facts only. Register a native source handle before real local transcode can run."
                .to_string(),
        );
        warnings.push(
            "No output file, b3 CID, crab URL, receipt, upload, or wallet mutation is created by preview-facts-only jobs."
                .to_string(),
        );
    }

    let source_label = clean_label(input.source_label.as_deref(), "local-preview");
    let requested_by = clean_label(input.requested_by.as_deref(), "local-creator");

    let record = VideoJobRecord {
        schema: "crablink.local.video-prepare-job.v4".to_string(),
        job_id: job_id.clone(),
        kind: "video_prepare_bundle".to_string(),
        status: "queued".to_string(),
        phase: "validating_source".to_string(),
        progress_percent: 1,
        created_at_unix_ms: now,
        updated_at_unix_ms: now,
        cancelled_at_unix_ms: None,
        completed_at_unix_ms: None,
        source: VideoJobSource {
            file_name: input.plan.source.file_name.clone(),
            content_type: input.plan.source.content_type.clone(),
            bytes: input.plan.source.bytes,
            duration_seconds: input.plan.source.duration_seconds,
            width: input.plan.source.width,
            height: input.plan.source.height,
            needs_transcode: input.plan.source.needs_transcode,
            source_label,
            source_handle: source_handle.clone(),
            source_authority: if has_native_source_handle {
                "native_registered_source".to_string()
            } else {
                "preview_facts_only".to_string()
            },
            native_source_registered: has_native_source_handle,
        },
        requested_by,
        entries: input.plan.entries.clone(),
        outputs: Vec::new(),
        warnings,
        error: None,
        truth_boundary: VideoJobTruthBoundary {
            simulated_job: !runs_real_transcode,
            has_native_source_handle,
            runs_transcode: runs_real_transcode,
            strips_metadata: runs_real_transcode,
            writes_output_files: runs_real_transcode,
            returns_video_bytes: false,
            uploads_bytes: false,
            mints_b3: false,
            creates_receipt: false,
            mutates_wallet: false,
            exposes_native_command: false,
            returns_private_path: false,
        },
    };

    {
        let mut guard = store
            .lock()
            .map_err(|_| "video job store lock poisoned".to_string())?;
        guard.insert(job_id.clone(), record.clone());
    }

    if let Some(source) = registered_source {
        spawn_real_prepare_job(
            Arc::clone(store),
            job_id,
            source,
            input.plan.entries.clone(),
        );
    }

    Ok(record)
}

pub fn get_video_prepare_job_status(
    store: &VideoJobStore,
    job_id: String,
) -> Result<VideoJobStatus, String> {
    let clean_job_id = clean_job_id(&job_id)?;
    let now = now_unix_ms()?;

    let mut guard = store
        .lock()
        .map_err(|_| "video job store lock poisoned".to_string())?;

    let record = guard
        .get_mut(&clean_job_id)
        .ok_or_else(|| "video job not found".to_string())?;

    if record.truth_boundary.simulated_job {
        update_simulated_job_progress(record, now);
    } else {
        record.updated_at_unix_ms = now;
    }

    Ok(record.clone())
}

pub fn cancel_video_prepare_job(
    store: &VideoJobStore,
    job_id: String,
) -> Result<VideoJobStatus, String> {
    let clean_job_id = clean_job_id(&job_id)?;
    let now = now_unix_ms()?;

    let mut guard = store
        .lock()
        .map_err(|_| "video job store lock poisoned".to_string())?;

    let record = guard
        .get_mut(&clean_job_id)
        .ok_or_else(|| "video job not found".to_string())?;

    if record.status == "completed" {
        record.warnings.push(
            "Cancel was requested after the prepare job had already completed.".to_string(),
        );
        record.updated_at_unix_ms = now;
        return Ok(record.clone());
    }

    record.status = "cancelled".to_string();
    record.phase = "cancelled_by_user".to_string();
    record.cancelled_at_unix_ms = Some(now);
    record.updated_at_unix_ms = now;
    record.progress_percent = record.progress_percent.min(99);
    record.error = Some(VideoJobError {
        code: "cancelled_by_user".to_string(),
        message: "The local video preparation job was cancelled by the user.".to_string(),
        retryable: true,
    });

    if record.truth_boundary.simulated_job {
        record.outputs.clear();
    }

    Ok(record.clone())
}

fn spawn_real_prepare_job(
    store: VideoJobStore,
    job_id: String,
    source: RegisteredVideoSource,
    entries: Vec<VideoRenditionEntry>,
) {
    thread::spawn(move || {
        if let Err(message) = run_real_prepare_job(&store, &job_id, source, entries) {
            if message == "cancelled_by_user" {
                return;
            }

            mark_failed(
                &store,
                &job_id,
                "transcode_failed",
                "The Rust-owned local video prepare job failed. Confirm ffmpeg can read this file and write MP4/H.264/AAC outputs.",
                true,
            );
        }
    });
}

fn run_real_prepare_job(
    store: &VideoJobStore,
    job_id: &str,
    source: RegisteredVideoSource,
    entries: Vec<VideoRenditionEntry>,
) -> Result<(), String> {
    set_job_phase(store, job_id, "validating_native_source", 3)?;

    if !source.canonical_path.exists() {
        mark_failed(
            store,
            job_id,
            "source_missing",
            "The registered native source file is no longer available.",
            true,
        );
        return Err("source_missing".to_string());
    }

    if is_cancelled(store, job_id) {
        return Err("cancelled_by_user".to_string());
    }

    set_job_phase(store, job_id, "building_staged_targets", 7)?;
    let targets = build_video_transcode_targets(job_id, source.canonical_path, &entries)?;

    let ffmpeg = ffmpeg_binary();
    let ffprobe = ffprobe_binary();
    let total = targets.len().max(1);

    for (index, target) in targets.iter().enumerate() {
        if is_cancelled(store, job_id) {
            return Err("cancelled_by_user".to_string());
        }

        let start_progress = progress_for(index, total, 10, 86);
        set_job_phase(
            store,
            job_id,
            &format!("writing_{}", target.role),
            start_progress,
        )?;

        if let Err(message) = run_ffmpeg_target(store, job_id, &ffmpeg, target) {
            return finish_partial_or_fail(
                store,
                job_id,
                &format!(
                    "FFmpeg failed while writing {}. Existing successful staged outputs remain usable for explicit mint/upload. Error: {}",
                    target.role,
                    message
                ),
            );
        }

        let bytes = std::fs::metadata(&target.output_path)
            .ok()
            .filter(|metadata| metadata.is_file())
            .map(|metadata| metadata.len());

        if bytes.unwrap_or(0) == 0 {
            return finish_partial_or_fail(
                store,
                job_id,
                &format!(
                    "FFmpeg wrote an empty output for {}. Existing successful staged outputs remain usable for explicit mint/upload.",
                    target.role
                ),
            );
        }

        let output_probe = probe_staged_output(&ffprobe, target);
        let verification = output_verification_from_probe(target, output_probe);
        let descriptor_note = descriptor_note_for_verification(&verification);
        let descriptor = target.descriptor(bytes, true, descriptor_note, verification);

        push_output(
            store,
            job_id,
            descriptor,
            progress_for(index + 1, total, 10, 86),
        )?;
    }

    mark_completed(store, job_id)
}

fn run_ffmpeg_target(
    store: &VideoJobStore,
    job_id: &str,
    ffmpeg: &str,
    target: &VideoTranscodeTarget,
) -> Result<(), String> {
    let mut command = target.build_command(ffmpeg);
    configure_command_stdio(&mut command);

    let mut child = command
        .spawn()
        .map_err(|_| "video_transcoder_unavailable".to_string())?;

    loop {
        if is_cancelled(store, job_id) {
            let _ = child.kill();
            let _ = child.wait();
            return Err("cancelled_by_user".to_string());
        }

        match child.try_wait() {
            Ok(Some(status)) => {
                if status.success() {
                    return Ok(());
                }

                return Err("video_transcoder_failed".to_string());
            }
            Ok(None) => thread::sleep(Duration::from_millis(180)),
            Err(_) => return Err("video_transcoder_status_failed".to_string()),
        }
    }
}

fn set_job_phase(
    store: &VideoJobStore,
    job_id: &str,
    phase: &str,
    progress_percent: u8,
) -> Result<(), String> {
    let now = now_unix_ms()?;
    let mut guard = store
        .lock()
        .map_err(|_| "video job store lock poisoned".to_string())?;

    let record = guard
        .get_mut(job_id)
        .ok_or_else(|| "video job not found".to_string())?;

    if record.status == "cancelled" {
        return Err("cancelled_by_user".to_string());
    }

    record.status = "running".to_string();
    record.phase = phase.to_string();
    record.progress_percent = progress_percent.min(99);
    record.updated_at_unix_ms = now;
    Ok(())
}

fn push_output(
    store: &VideoJobStore,
    job_id: &str,
    descriptor: VideoJobOutputDescriptor,
    progress_percent: u8,
) -> Result<(), String> {
    let now = now_unix_ms()?;
    let mut guard = store
        .lock()
        .map_err(|_| "video job store lock poisoned".to_string())?;

    let record = guard
        .get_mut(job_id)
        .ok_or_else(|| "video job not found".to_string())?;

    if record.status == "cancelled" {
        return Err("cancelled_by_user".to_string());
    }

    record.outputs.push(descriptor);
    record.progress_percent = progress_percent.min(99);
    record.updated_at_unix_ms = now;
    Ok(())
}

fn finish_partial_or_fail(
    store: &VideoJobStore,
    job_id: &str,
    warning: &str,
) -> Result<(), String> {
    let now = now_unix_ms()?;
    let mut guard = store
        .lock()
        .map_err(|_| "video job store lock poisoned".to_string())?;

    let record = guard
        .get_mut(job_id)
        .ok_or_else(|| "video job not found".to_string())?;

    if record.status == "cancelled" {
        return Err("cancelled_by_user".to_string());
    }

    if record.outputs.iter().any(|output| {
        output.ready_for_mint && output.exists_on_disk && output.bytes.unwrap_or(0) > 0
    }) {
        record.status = "completed".to_string();
        record.phase = "completed_with_partial_outputs".to_string();
        record.progress_percent = 100;
        record.completed_at_unix_ms = Some(now);
        record.updated_at_unix_ms = now;
        record.warnings.push(warning.to_string());
        record.warnings.push(
            "Prepare completed with partial staged outputs. Mint/upload only the listed ready local outputs; no backend CID, crab URL, receipt, or wallet mutation has been created by prepare."
                .to_string(),
        );
        record.error = None;
        return Ok(());
    }

    record.status = "failed".to_string();
    record.phase = "failed_before_any_ready_output".to_string();
    record.progress_percent = record.progress_percent.min(99);
    record.updated_at_unix_ms = now;
    record.error = Some(VideoJobError {
        code: "transcode_failed".to_string(),
        message: "The Rust-owned local video prepare job failed before any usable staged outputs were written."
            .to_string(),
        retryable: true,
    });
    record.warnings.push(warning.to_string());

    Err("transcode_failed".to_string())
}

fn mark_completed(store: &VideoJobStore, job_id: &str) -> Result<(), String> {
    let now = now_unix_ms()?;
    let mut guard = store
        .lock()
        .map_err(|_| "video job store lock poisoned".to_string())?;

    let record = guard
        .get_mut(job_id)
        .ok_or_else(|| "video job not found".to_string())?;

    if record.status == "cancelled" {
        return Ok(());
    }

    record.status = "completed".to_string();
    record.phase = "completed_staged_outputs".to_string();
    record.progress_percent = 100;
    record.completed_at_unix_ms = Some(now);
    record.updated_at_unix_ms = now;

    if record.outputs.is_empty() {
        record.warnings.push(
            "Prepare job completed without staged outputs. Nothing is ready for the future upload/mint step."
                .to_string(),
        );
    }

    Ok(())
}

fn mark_failed(
    store: &VideoJobStore,
    job_id: &str,
    code: &str,
    message: &str,
    retryable: bool,
) {
    let now = now_unix_ms().unwrap_or(0);

    if let Ok(mut guard) = store.lock() {
        if let Some(record) = guard.get_mut(job_id) {
            if record.status == "cancelled" {
                return;
            }

            record.status = "failed".to_string();
            record.phase = code.to_string();
            record.updated_at_unix_ms = now;
            record.error = Some(VideoJobError {
                code: code.to_string(),
                message: message.to_string(),
                retryable,
            });
        }
    }
}

fn is_cancelled(store: &VideoJobStore, job_id: &str) -> bool {
    let Ok(guard) = store.lock() else {
        return true;
    };

    guard
        .get(job_id)
        .map(|record| record.status == "cancelled")
        .unwrap_or(true)
}

fn progress_for(index: usize, total: usize, start: u8, end: u8) -> u8 {
    let safe_total = total.max(1) as f64;
    let fraction = (index as f64 / safe_total).clamp(0.0, 1.0);
    let span = end.saturating_sub(start) as f64;

    (start as f64 + span * fraction).round().clamp(0.0, 99.0) as u8
}

fn validate_prepare_input(input: &VideoPrepareBundleInput) -> Result<(), String> {
    if input.plan.entries.is_empty() {
        return Err("video plan must include at least one planned output entry".to_string());
    }

    if input.plan.entries.len() > 12 {
        return Err("video plan has too many output entries for this local MVP".to_string());
    }

    if input.plan.source.bytes == 0 {
        return Err("video source size is required before starting a prepare job".to_string());
    }

    if input.plan.source.file_name.trim().is_empty() {
        return Err("video source file name is required before starting a prepare job".to_string());
    }

    if !input.probe.supported_input {
        return Err("video source is not supported by the current planner".to_string());
    }

    if let Some(source_handle) = input.source_handle.as_deref() {
        let clean = source_handle.trim();

        if clean.is_empty() {
            return Err("sourceHandle must not be empty when supplied".to_string());
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
    }

    Ok(())
}

fn update_simulated_job_progress(record: &mut VideoJobRecord, now: u128) {
    if record.status == "cancelled" || record.status == "completed" || record.status == "failed" {
        record.updated_at_unix_ms = now;
        return;
    }

    let elapsed = now.saturating_sub(record.created_at_unix_ms);

    let (status, phase, progress) = if elapsed < 800 {
        ("queued", "validating_source", 3)
    } else if elapsed < 1_900 {
        ("running", "planning_privacy_cleanup", 17)
    } else if elapsed < 3_100 {
        ("running", "staging_clean_master_descriptor", 34)
    } else if elapsed < 4_400 {
        ("running", "staging_device_rendition_descriptors", 55)
    } else if elapsed < 5_800 {
        ("running", "staging_poster_thumbnail_descriptors", 76)
    } else if elapsed < 7_000 {
        ("running", "finalizing_bundle_descriptors", 92)
    } else {
        ("completed", "completed_descriptor_scaffold", 100)
    };

    record.status = status.to_string();
    record.phase = phase.to_string();
    record.progress_percent = progress;
    record.updated_at_unix_ms = now;

    if status == "completed" {
        record.completed_at_unix_ms = Some(now);

        if record.outputs.is_empty() {
            record.outputs = build_output_descriptors(&record.job_id, &record.entries);
        }
    }
}

fn build_output_descriptors(
    job_id: &str,
    entries: &[VideoRenditionEntry],
) -> Vec<VideoJobOutputDescriptor> {
    entries
        .iter()
        .map(|entry| {
            let ext = extension_for(entry);
            VideoJobOutputDescriptor {
                role: entry.role.clone(),
                label: entry.label.clone(),
                asset_kind: entry.asset_kind.clone(),
                target_container: entry.target_container.clone(),
                target_mime: entry.target_mime.clone(),
                video_codec: entry.video_codec.clone(),
                audio_codec: entry.audio_codec.clone(),
                width: entry.width,
                height: entry.height,
                duration_seconds: entry.duration_seconds,
                staged_handle: format!(
                    "staged://video-job/{job_id}/{}.{}",
                    safe_role(&entry.role),
                    ext
                ),
                exists_on_disk: false,
                bytes: None,
                content_id: None,
                crab_url: None,
                ready_for_mint: false,
                note: "Descriptor only. Register a native source handle to write a real local staged file."
                    .to_string(),
                verification: descriptor_only_verification(entry),
            }
        })
        .collect()
}

fn output_verification_from_probe(
    target: &VideoTranscodeTarget,
    probe: VideoStagedOutputProbe,
) -> VideoJobOutputVerification {
    VideoJobOutputVerification {
        status: probe.status,
        checked_with: probe.checked_with,
        expected_width: target.width,
        expected_height: target.height,
        actual_width: probe.actual_width,
        actual_height: probe.actual_height,
        actual_duration_seconds: probe.actual_duration_seconds,
        actual_video_codec: probe.actual_video_codec,
        actual_audio_codec: probe.actual_audio_codec,
        dimensions_within_target: probe.dimensions_within_target,
        note: probe.note,
    }
}

fn descriptor_note_for_verification(verification: &VideoJobOutputVerification) -> String {
    let base = "Staged local file written by Rust-owned FFmpeg job. Ready for a future explicit backend upload/mint step; not a CID or crab URL yet.";

    match verification.dimensions_within_target {
        Some(false) => format!("{base} Verification warning: {}", verification.note),
        _ => format!("{base} {}", verification.note),
    }
}

fn descriptor_only_verification(entry: &VideoRenditionEntry) -> VideoJobOutputVerification {
    VideoJobOutputVerification {
        status: "descriptor_only".to_string(),
        checked_with: "none".to_string(),
        expected_width: entry.width,
        expected_height: entry.height,
        actual_width: None,
        actual_height: None,
        actual_duration_seconds: None,
        actual_video_codec: None,
        actual_audio_codec: None,
        dimensions_within_target: None,
        note: "No staged file exists yet, so no output facts were verified.".to_string(),
    }
}

fn extension_for(entry: &VideoRenditionEntry) -> &'static str {
    match entry.asset_kind.as_str() {
        "image" => "jpg",
        "caption" => "caption",
        "audio" => "m4a",
        _ => "mp4",
    }
}

fn safe_role(value: &str) -> String {
    let mut out = String::new();

    for ch in value.chars().take(96) {
        if ch.is_ascii_alphanumeric() || ch == '_' || ch == '-' {
            out.push(ch);
        }
    }

    if out.is_empty() {
        "output".to_string()
    } else {
        out
    }
}

fn clean_label(value: Option<&str>, fallback: &str) -> String {
    let clean: String = value
        .unwrap_or(fallback)
        .chars()
        .filter(|ch| !ch.is_control())
        .take(160)
        .collect::<String>()
        .trim()
        .to_string();

    if clean.is_empty() {
        fallback.to_string()
    } else {
        clean
    }
}

fn clean_optional_handle(value: Option<String>) -> Option<String> {
    let clean = value.unwrap_or_default().trim().to_string();

    if clean.is_empty() {
        None
    } else {
        Some(clean)
    }
}

fn clean_job_id(value: &str) -> Result<String, String> {
    let clean = value.trim();

    if clean.is_empty() {
        return Err("job_id is required".to_string());
    }

    if clean.len() > 160 {
        return Err("job_id is too long".to_string());
    }

    if !clean
        .chars()
        .all(|ch| ch.is_ascii_alphanumeric() || ch == '_' || ch == '-')
    {
        return Err("job_id contains unsupported characters".to_string());
    }

    Ok(clean.to_string())
}

fn now_unix_ms() -> Result<u128, String> {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .map_err(|_| "system clock is before unix epoch".to_string())
}