//! RO:WHAT — Native media readiness diagnostics for CrabLink Tauri.
//! RO:WHY — Camera/screen support must be explicit, source-labeled, and honest before stream capture work.
//! RO:INTERACTS — StreamMediaReadiness.jsx, StreamLocalPreview.jsx, Tauri runtime/platform.
//! RO:INVARIANTS — diagnostics only; no capture start; no local path leak; no ingest secret; no backend live claim.
//! RO:METRICS — none yet; future native media manager should expose capture/session counters.
//! RO:CONFIG — reports compile/runtime platform facts and macOS permission guidance.
//! RO:SECURITY — no camera/mic permission is requested by this command; it only describes capability posture.
//! RO:TEST — cargo check and manual crab://stream media readiness smoke.

use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeMediaStatus {
    pub schema: String,
    pub platform: String,
    pub os_family: String,
    pub native_capture_wired: bool,
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
    pub executes_shell: bool,
    pub creates_stream_session: bool,
    pub creates_backend_stream: bool,
    pub creates_ingest_token: bool,
    pub sends_media_bytes: bool,
    pub mints_b3: bool,
    pub mutates_wallet: bool,
}

#[tauri::command]
pub fn media_status() -> NativeMediaStatus {
    let os_family = std::env::consts::FAMILY.to_string();
    let platform = std::env::consts::OS.to_string();
    let bundle_id = "com.rustyonions.crablink".to_string();

    NativeMediaStatus {
        schema: "crablink.media-status.v2".to_string(),
        platform: platform.clone(),
        os_family,
        native_capture_wired: false,
        webview_capture_expected: "probe_from_react_webview".to_string(),
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
            executes_shell: false,
            creates_stream_session: false,
            creates_backend_stream: false,
            creates_ingest_token: false,
            sends_media_bytes: false,
            mints_b3: false,
            mutates_wallet: false,
        },
        warnings: media_warnings(&platform),
    }
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
        "macos" => "Run npm run tauri:dev:mac-media after adding Info.plist. If permissions were denied before, reset Camera/Microphone with tccutil, then relaunch.",
        _ => "Use WebView media probe first; keep local file rehearsal fallback; wire native capture in a dedicated media module next.",
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
        "System Settings → Privacy & Security → Screen & System Audio Recording → CrabLink".to_string(),
    ]
}

fn media_warnings(platform: &str) -> Vec<String> {
    let mut warnings = vec![
        "This command does not request camera, microphone, or screen permission.".to_string(),
        "React/WebView camera APIs may be unavailable depending on platform/runtime.".to_string(),
        "Native capture is intentionally not wired in this diagnostic batch.".to_string(),
    ];

    if platform == "macos" {
        warnings.push(
            "The macOS dev media profile enables WebView private API behavior for proof work only; do not use it for App Store builds.".to_string(),
        );
        warnings.push(
            "If CrabLink was denied permission before Info.plist existed, reset macOS privacy state and relaunch the app.".to_string(),
        );
    }

    warnings
}