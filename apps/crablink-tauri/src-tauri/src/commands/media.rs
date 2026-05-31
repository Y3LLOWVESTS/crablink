//! RO:WHAT — Native media readiness, video source selection, and video prepare command bridge.
//! RO:WHY — Media workflows need native file authority while React remains display/user intent only.
//! RO:INTERACTS — VideoConverterPanel.jsx, videoConverterClient.js, AppState.video_sources, AppState.video_jobs.
//! RO:INVARIANTS — typed allowlisted commands only; no raw paths returned; no media bytes; no shell bridge.
//! RO:METRICS — none yet; future media jobs should expose bounded progress/status counters.
//! RO:CONFIG — reports platform facts and uses conservative MVP media limits.
//! RO:SECURITY — picker/register commands redact paths; no backend truth, receipts, or wallet mutation here.
//! RO:TEST — cargo check; manual crab://video → choose native source → build plan → start prepare job.

use crate::media::{
    cancel_video_prepare_job, clear_video_source_registration, get_registered_video_source_for_job,
    get_video_prepare_job_status, get_video_source_registration, plan_video_renditions_from_probe,
    probe_video_from_local_facts, register_video_source_from_path, start_video_prepare_job,
    VideoJobStatus, VideoPrepareBundleInput, VideoProbeInput, VideoProbeSummary,
    VideoRegisterSourceInput, VideoRenditionPlanInput, VideoRenditionPlanResponse,
    VideoSourceClearResponse, VideoSourceRegistration,
};
use crate::state::AppState;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};
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
}

#[tauri::command]
pub fn media_status() -> NativeMediaStatus {
    let os_family = std::env::consts::FAMILY.to_string();
    let platform = std::env::consts::OS.to_string();
    let bundle_id = "com.rustyonions.crablink".to_string();

    NativeMediaStatus {
        schema: "crablink.media-status.v7".to_string(),
        platform: platform.clone(),
        os_family,
        native_capture_wired: false,
        video_converter_scaffold_wired: true,
        video_source_registration_wired: true,
        video_native_file_picker_wired: true,
        video_prepare_jobs_wired: true,
        video_transcode_jobs_wired: true,
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
    let registered_source = match input.source_handle.as_deref().map(str::trim).filter(|value| !value.is_empty()) {
        Some(source_handle) => {
            let registered = get_registered_video_source_for_job(&state.video_sources, source_handle)?;

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