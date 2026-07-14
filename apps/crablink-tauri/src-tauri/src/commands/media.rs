//! RO:WHAT — Native media readiness, video source selection, and video prepare command bridge.
//! RO:WHY — Media workflows need native file authority while React remains display/user intent only.
//! RO:INTERACTS — VideoConverterPanel.jsx, videoConverterClient.js, AppState.video_sources, AppState.video_jobs.
//! RO:INVARIANTS — typed allowlisted commands only; no raw paths returned; no media bytes; no shell bridge.
//! RO:METRICS — none yet; future media jobs should expose bounded progress/status counters.
//! RO:CONFIG — reports platform facts and uses conservative MVP media limits.
//! RO:SECURITY — picker/register commands redact paths; no backend truth, receipts, or wallet mutation here.
//! RO:TEST — cargo check; manual crab://video → choose native source → build plan → start prepare job.

use crate::media::{
    append_make_export_audio_chunk, append_make_export_chunk, begin_make_export_session,
    cancel_video_prepare_job, clear_make_export_session, clear_video_source_registration,
    finish_make_export_session, get_make_export_status, get_registered_video_source_for_job,
    get_video_prepare_job_status, get_video_source_registration, plan_video_renditions_from_probe,
    probe_video_from_local_facts, register_video_source_from_path, start_video_prepare_job,
    MakeExportAppendAudioChunkInput, MakeExportAppendChunkInput, MakeExportBeginInput,
    MakeExportFinishInput, MakeExportStatus, VideoJobStatus, VideoPrepareBundleInput,
    VideoProbeInput, VideoProbeSummary, VideoRegisterSourceInput, VideoRenditionPlanInput,
    VideoRenditionPlanResponse, VideoSourceClearResponse, VideoSourceRegistration,
};
use crate::state::AppState;
use serde::{Deserialize, Serialize};
use std::path::Path;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_dialog::DialogExt;

const VIDEO_PICKER_EXTENSIONS: &[&str] = &["mp4", "m4v", "mov", "webm", "ogv", "ogg", "mkv", "avi"];

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoChooseSourceInput {
    pub content_type: Option<String>,
    pub duration_seconds: Option<f64>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub frame_rate: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoSourcePreviewInput {
    pub source_handle: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoSourcePreviewResponse {
    pub schema: String,
    pub source_handle: String,
    pub status: String,
    pub safe_display_name: String,
    pub content_type: String,
    pub bytes: u64,
    pub app_cache_path: String,
    pub copied_to_app_cache: bool,
    pub note: String,
    pub truth_boundary: VideoSourcePreviewTruthBoundary,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoSourcePreviewTruthBoundary {
    pub returns_private_source_path: bool,
    pub returns_video_bytes: bool,
    pub returns_app_cache_path: bool,
    pub mints_b3: bool,
    pub creates_receipt: bool,
    pub mutates_wallet: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeMediaStatus {
    pub schema: String,
    pub platform: String,
    pub os_family: String,
    pub native_capture_wired: bool,
    pub video_converter_scaffold_wired: bool,
    pub video_source_registration_wired: bool,
    pub video_native_file_picker_wired: bool,
    pub video_prepare_jobs_wired: bool,
    pub video_transcode_jobs_wired: bool,
    pub make_export_wired: bool,
    pub make_export_chunk_cap_bytes: usize,
    pub webview_capture_expected: String,
    pub camera_permission_model: String,
    pub microphone_permission_model: String,
    pub screen_permission_model: String,
    pub recommended_next_step: String,
    pub safe_fallback: String,
    pub macos_bundle_identifier: String,
    pub macos_info_plist_expected: bool,
    pub macos_dev_media_profile: String,
    pub macos_privacy_reset_commands: Vec<String>,
    pub macos_system_settings_paths: Vec<String>,
    pub truth_boundary: NativeMediaTruthBoundary,
    pub warnings: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeMediaTruthBoundary {
    pub starts_capture: bool,
    pub requests_permission: bool,
    pub opens_system_settings: bool,
    pub opens_native_file_picker: bool,
    pub executes_shell: bool,
    pub creates_stream_session: bool,
    pub creates_backend_stream: bool,
    pub creates_ingest_token: bool,
    pub sends_media_bytes: bool,
    pub mints_b3: bool,
    pub mutates_wallet: bool,
    pub probes_video_metadata: bool,
    pub registers_native_video_source: bool,
    pub starts_video_prepare_job: bool,
    pub runs_video_transcode: bool,
    pub accepts_make_export_chunks: bool,
    pub joins_make_segments: bool,
}

#[tauri::command]
pub fn media_status() -> NativeMediaStatus {
    let os_family = std::env::consts::FAMILY.to_string();
    let platform = std::env::consts::OS.to_string();
    let bundle_id = "com.rustyonions.crablink".to_string();

    NativeMediaStatus {
        schema: "crablink.media-status.v8".to_string(),
        platform: platform.clone(),
        os_family,
        native_capture_wired: false,
        video_converter_scaffold_wired: true,
        video_source_registration_wired: true,
        video_native_file_picker_wired: true,
        video_prepare_jobs_wired: true,
        video_transcode_jobs_wired: true,
        make_export_wired: true,
        make_export_chunk_cap_bytes: 512 * 1024,
        webview_capture_expected: "optional_react_webview_preview".to_string(),
        camera_permission_model: camera_permission_model(&platform).to_string(),
        microphone_permission_model: microphone_permission_model(&platform).to_string(),
        screen_permission_model: screen_permission_model(&platform).to_string(),
        recommended_next_step: recommended_next_step(&platform).to_string(),
        safe_fallback: "local_video_file_rehearsal_preview".to_string(),
        macos_bundle_identifier: bundle_id.clone(),
        macos_info_plist_expected: platform == "macos",
        macos_dev_media_profile: "npm run tauri:dev:mac-media".to_string(),
        macos_privacy_reset_commands: macos_privacy_reset_commands(&platform, &bundle_id),
        macos_system_settings_paths: macos_system_settings_paths(&platform),
        truth_boundary: NativeMediaTruthBoundary {
            starts_capture: false,
            requests_permission: false,
            opens_system_settings: false,
            opens_native_file_picker: true,
            executes_shell: false,
            creates_stream_session: false,
            creates_backend_stream: false,
            creates_ingest_token: false,
            sends_media_bytes: false,
            mints_b3: false,
            mutates_wallet: false,
            probes_video_metadata: true,
            registers_native_video_source: true,
            starts_video_prepare_job: true,
            runs_video_transcode: true,
            accepts_make_export_chunks: true,
            joins_make_segments: true,
        },
        warnings: media_warnings(&platform),
    }
}

#[tauri::command]
pub async fn media_choose_video_source(
    app: AppHandle,
    state: State<'_, AppState>,
    input: VideoChooseSourceInput,
) -> Result<VideoSourceRegistration, String> {
    let picked = tauri::async_runtime::spawn_blocking(move || {
        app.dialog()
            .file()
            .set_title("Choose CrabLink video source")
            .add_filter("Video files", VIDEO_PICKER_EXTENSIONS)
            .blocking_pick_file()
            .map(|file_path| file_path.to_string())
    })
    .await
    .map_err(|_| "native file picker task failed".to_string())?;

    let Some(path) = picked else {
        return Err("video source selection cancelled".to_string());
    };

    if path.trim().is_empty() {
        return Err("native file picker returned an empty path".to_string());
    }

    register_video_source_from_path(
        &state.video_sources,
        VideoRegisterSourceInput {
            path,
            content_type: input.content_type,
            duration_seconds: input.duration_seconds,
            width: input.width,
            height: input.height,
            frame_rate: input.frame_rate,
            source: Some("native_file_picker".to_string()),
        },
    )
}

#[tauri::command]
pub fn media_register_video_source(
    state: State<'_, AppState>,
    input: VideoRegisterSourceInput,
) -> Result<VideoSourceRegistration, String> {
    register_video_source_from_path(&state.video_sources, input)
}

#[tauri::command]
pub fn media_get_video_source(
    state: State<'_, AppState>,
    source_handle: String,
) -> Result<VideoSourceRegistration, String> {
    get_video_source_registration(&state.video_sources, source_handle)
}

#[tauri::command]
pub async fn media_get_video_source_preview(
    app: AppHandle,
    state: State<'_, AppState>,
    input: VideoSourcePreviewInput,
) -> Result<VideoSourcePreviewResponse, String> {
    let source_handle = input.source_handle.trim().to_string();
    if source_handle.is_empty() {
        return Err("sourceHandle is required for local preview".to_string());
    }

    let registered = get_registered_video_source_for_job(&state.video_sources, &source_handle)?;
    let source_path = registered.canonical_path.clone();
    let public = registered.public.clone();

    let app_cache_dir = app
        .path()
        .app_cache_dir()
        .map_err(|_| "app cache directory is unavailable for local video preview".to_string())?
        .join("media-preview")
        .join("video-sources");

    let extension = clean_preview_extension(&public.extension, &public.content_type);
    let preview_path = app_cache_dir.join(format!(
        "{}-preview.{}",
        sanitize_preview_file_stem(&source_handle),
        extension
    ));
    let expected_bytes = public.bytes;

    let copied_to_app_cache = tauri::async_runtime::spawn_blocking({
        let source_path = source_path.clone();
        let preview_path = preview_path.clone();
        move || copy_preview_source_if_needed(&source_path, &preview_path, expected_bytes)
    })
    .await
    .map_err(|_| "local video preview cache task failed".to_string())??;

    Ok(VideoSourcePreviewResponse {
        schema: "crablink.local.video-source-preview.v1".to_string(),
        source_handle,
        status: "ready".to_string(),
        safe_display_name: public.safe_display_name,
        content_type: public.content_type,
        bytes: public.bytes,
        app_cache_path: preview_path.to_string_lossy().to_string(),
        copied_to_app_cache,
        note: "Preview uses an app-cache copy of the Rust-owned local source. This is not a backend CID, receipt, or paid unlock.".to_string(),
        truth_boundary: VideoSourcePreviewTruthBoundary {
            returns_private_source_path: false,
            returns_video_bytes: false,
            returns_app_cache_path: true,
            mints_b3: false,
            creates_receipt: false,
            mutates_wallet: false,
        },
    })
}

#[tauri::command]
pub fn media_clear_video_source(
    state: State<'_, AppState>,
    source_handle: String,
) -> Result<VideoSourceClearResponse, String> {
    clear_video_source_registration(&state.video_sources, source_handle)
}

#[tauri::command]
pub fn media_probe_video(input: VideoProbeInput) -> Result<VideoProbeSummary, String> {
    Ok(probe_video_from_local_facts(input))
}

#[tauri::command]
pub fn media_plan_video_renditions(
    input: VideoRenditionPlanInput,
) -> Result<VideoRenditionPlanResponse, String> {
    Ok(plan_video_renditions_from_probe(input))
}

#[tauri::command]
pub fn media_prepare_video_bundle(
    state: State<'_, AppState>,
    input: VideoPrepareBundleInput,
) -> Result<VideoJobStatus, String> {
    let registered_source = match input
        .source_handle
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        Some(source_handle) => {
            let registered =
                get_registered_video_source_for_job(&state.video_sources, source_handle)?;

            if registered.public.bytes != input.plan.source.bytes {
                return Err(
                    "registered native source size does not match the current video plan source size"
                        .to_string(),
                );
            }

            Some(registered)
        }
        None => None,
    };

    start_video_prepare_job(&state.video_jobs, input, registered_source)
}

#[tauri::command]
pub fn media_make_export_begin(
    state: State<'_, AppState>,
    input: MakeExportBeginInput,
) -> Result<MakeExportStatus, String> {
    begin_make_export_session(&state.make_exports, input)
}

#[tauri::command]
pub fn media_make_export_append_chunk(
    state: State<'_, AppState>,
    input: MakeExportAppendChunkInput,
) -> Result<MakeExportStatus, String> {
    append_make_export_chunk(&state.make_exports, input)
}

#[tauri::command]
pub fn media_make_export_append_audio_chunk(
    state: State<'_, AppState>,
    input: MakeExportAppendAudioChunkInput,
) -> Result<MakeExportStatus, String> {
    append_make_export_audio_chunk(&state.make_exports, input)
}

#[tauri::command]
pub fn media_make_export_finish(
    state: State<'_, AppState>,
    input: MakeExportFinishInput,
) -> Result<MakeExportStatus, String> {
    finish_make_export_session(&state.make_exports, &state.video_sources, input)
}

#[tauri::command]
pub fn media_make_export_status(
    state: State<'_, AppState>,
    session_id: String,
) -> Result<MakeExportStatus, String> {
    get_make_export_status(&state.make_exports, session_id)
}

#[tauri::command]
pub fn media_make_export_clear(
    state: State<'_, AppState>,
    session_id: String,
) -> Result<MakeExportStatus, String> {
    clear_make_export_session(&state.make_exports, session_id)
}

#[tauri::command]
pub fn media_get_video_job_status(
    state: State<'_, AppState>,
    job_id: String,
) -> Result<VideoJobStatus, String> {
    get_video_prepare_job_status(&state.video_jobs, job_id)
}

#[tauri::command]
pub fn media_cancel_video_job(
    state: State<'_, AppState>,
    job_id: String,
) -> Result<VideoJobStatus, String> {
    cancel_video_prepare_job(&state.video_jobs, job_id)
}

fn camera_permission_model(platform: &str) -> &'static str {
    match platform {
        "macos" => "macOS camera access requires NSCameraUsageDescription in src-tauri/Info.plist, a fresh app launch, and user approval in System Settings if previously denied.",
        "windows" => "Windows camera privacy permission is managed by OS privacy settings.",
        "linux" => "Linux camera access depends on WebKit/WebRTC/runtime and device permissions.",
        _ => "Platform camera permission model is runtime-specific.",
    }
}

fn microphone_permission_model(platform: &str) -> &'static str {
    match platform {
        "macos" => "macOS microphone access requires NSMicrophoneUsageDescription in src-tauri/Info.plist, a fresh app launch, and user approval in System Settings if previously denied.",
        "windows" => "Windows microphone privacy permission is managed by OS privacy settings.",
        "linux" => "Linux microphone access depends on WebKit/WebRTC/runtime and device permissions.",
        _ => "Platform microphone permission model is runtime-specific.",
    }
}

fn screen_permission_model(platform: &str) -> &'static str {
    match platform {
        "macos" => "macOS screen recording permission may be required for screen/window capture. Enable it manually in System Settings when prompted or listed.",
        "windows" => "Windows screen capture permission depends on OS/runtime capture APIs.",
        "linux" => "Linux screen capture depends on compositor, portal, and WebKit/runtime support.",
        _ => "Platform screen permission model is runtime-specific.",
    }
}

fn recommended_next_step(platform: &str) -> &'static str {
    match platform {
        "macos" => "Use crab://video → Choose video source and build MP4 plan. The Rust job stages local MP4/JPEG outputs; backend upload/mint remains an explicit future step.",
        _ => "Use the native source picker where available, then keep video work in Rust-owned bounded job modules.",
    }
}

fn macos_privacy_reset_commands(platform: &str, bundle_id: &str) -> Vec<String> {
    if platform != "macos" {
        return Vec::new();
    }

    vec![
        format!("tccutil reset Camera {bundle_id}"),
        format!("tccutil reset Microphone {bundle_id}"),
        format!("tccutil reset ScreenCapture {bundle_id}"),
    ]
}

fn macos_system_settings_paths(platform: &str) -> Vec<String> {
    if platform != "macos" {
        return Vec::new();
    }

    vec![
        "System Settings → Privacy & Security → Camera → CrabLink".to_string(),
        "System Settings → Privacy & Security → Microphone → CrabLink".to_string(),
        "System Settings → Privacy & Security → Screen & System Audio Recording → CrabLink"
            .to_string(),
    ]
}

fn media_warnings(platform: &str) -> Vec<String> {
    let mut warnings = vec![
        "This command set does not request camera, microphone, or screen permission.".to_string(),
        "React/WebView camera APIs may be unavailable depending on platform/runtime.".to_string(),
        "Native video source picking returns only a redacted source registration DTO to React."
            .to_string(),
        "Video prepare jobs can now run a fixed Rust-owned FFmpeg path for staged local MP4/JPEG outputs when a native source handle is registered.".to_string(),
        "Make export can accept approved local clip chunks, join them into one MP4, and register a redacted video source handle.".to_string(),
        "Make export can accept bounded clip chunks, join them into one local MP4, and register a redacted source handle for crab://video.".to_string(),
        "Staged handles are not backend CIDs, crab URLs, receipts, or ownership proofs."
            .to_string(),
    ];

    if platform == "macos" {
        warnings.push(
            "On macOS, use the media dev profile when testing camera/microphone/screen behavior."
                .to_string(),
        );
    }

    warnings
}

fn copy_preview_source_if_needed(
    source_path: &Path,
    preview_path: &Path,
    expected_bytes: u64,
) -> Result<bool, String> {
    if !source_path.exists() {
        return Err("local source file is no longer available for preview".to_string());
    }

    if let Some(parent) = preview_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|_| "could not create app-cache preview directory".to_string())?;
    }

    let existing_matches = std::fs::metadata(preview_path)
        .ok()
        .filter(|metadata| metadata.is_file())
        .map(|metadata| metadata.len() == expected_bytes && expected_bytes > 0)
        .unwrap_or(false);

    if existing_matches {
        return Ok(false);
    }

    std::fs::copy(source_path, preview_path)
        .map_err(|_| "could not copy local source into app-cache preview file".to_string())?;

    let copied_len = std::fs::metadata(preview_path)
        .map_err(|_| "could not verify copied preview file".to_string())?
        .len();

    if expected_bytes > 0 && copied_len != expected_bytes {
        let _ = std::fs::remove_file(preview_path);
        return Err("copied preview file size did not match source".to_string());
    }

    Ok(true)
}

fn clean_preview_extension(extension: &str, content_type: &str) -> String {
    let clean = extension
        .trim()
        .trim_start_matches('.')
        .to_ascii_lowercase();

    if matches!(
        clean.as_str(),
        "mp4" | "m4v" | "mov" | "webm" | "ogv" | "ogg"
    ) {
        return clean;
    }

    match content_type.trim().to_ascii_lowercase().as_str() {
        "video/webm" => "webm".to_string(),
        "video/quicktime" => "mov".to_string(),
        "video/ogg" => "ogv".to_string(),
        _ => "mp4".to_string(),
    }
}

fn sanitize_preview_file_stem(value: &str) -> String {
    let safe: String = value
        .chars()
        .filter(|ch| ch.is_ascii_alphanumeric() || *ch == '_' || *ch == '-')
        .take(120)
        .collect();

    if safe.trim().is_empty() {
        "video-source".to_string()
    } else {
        safe
    }
}
