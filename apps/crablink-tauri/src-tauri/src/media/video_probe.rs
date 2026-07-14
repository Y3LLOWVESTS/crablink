//! RO:WHAT — Builds an honest video probe summary from bounded local preview facts.
//! RO:WHY — Starts the Rust-owned converter path without reading or returning full video bytes.
//! RO:INTERACTS — commands::media, video_renditions, VideoConverterPanel.jsx.
//! RO:INVARIANTS — no fake codec proof; no fake b3 CID; no file bytes; no shell/native execution.
//! RO:METRICS — none.
//! RO:CONFIG — uses limits.rs warning thresholds.
//! RO:SECURITY — sanitizes display names; returns small DTOs only.
//! RO:TEST — cargo check; future tests for extension/container guesses.

use serde::{Deserialize, Serialize};

use super::limits::{
    MVP_MAX_LOCAL_VIDEO_BYTES, MVP_WARN_LOCAL_VIDEO_BYTES, TARGET_AUDIO_CODEC, TARGET_CONTAINER,
    TARGET_MIME, TARGET_VIDEO_CODEC, VIDEO_PROBE_SCHEMA,
};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoProbeInput {
    pub file_name: Option<String>,
    pub content_type: Option<String>,
    pub bytes: Option<u64>,
    pub duration_seconds: Option<f64>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub frame_rate: Option<String>,
    pub source: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoProbeSource {
    pub kind: String,
    pub from_react_preview: bool,
    pub rust_deep_probe_available: bool,
    pub note: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoProbeSummary {
    pub schema: String,
    pub status: String,
    pub file_name: String,
    pub safe_display_name: String,
    pub content_type: String,
    pub bytes: u64,
    pub duration_seconds: Option<f64>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub resolution: Option<String>,
    pub aspect_ratio: Option<String>,
    pub frame_rate: Option<String>,
    pub guessed_container: String,
    pub input_family: String,
    pub supported_input: bool,
    pub recommended_container: String,
    pub recommended_mime: String,
    pub recommended_video_codec: String,
    pub recommended_audio_codec: String,
    pub needs_transcode: bool,
    pub metadata_cleanup_recommended: bool,
    pub source: VideoProbeSource,
    pub warnings: Vec<String>,
    pub truth_boundary: VideoProbeTruthBoundary,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoProbeTruthBoundary {
    pub reads_full_video_bytes: bool,
    pub returns_video_bytes: bool,
    pub runs_transcode: bool,
    pub strips_metadata: bool,
    pub mints_b3: bool,
    pub creates_receipt: bool,
    pub mutates_wallet: bool,
    pub claims_codec_certainty: bool,
}

pub fn probe_video_from_local_facts(input: VideoProbeInput) -> VideoProbeSummary {
    let raw_name = clean_string(input.file_name).unwrap_or_else(|| "selected-video".to_string());
    let safe_display_name = sanitize_display_name(&raw_name);
    let content_type =
        clean_string(input.content_type).unwrap_or_else(|| "application/octet-stream".to_string());
    let bytes = input.bytes.unwrap_or(0);
    let duration_seconds = finite_positive_f64(input.duration_seconds);
    let width = input.width.filter(|value| *value > 0);
    let height = input.height.filter(|value| *value > 0);
    let frame_rate = clean_string(input.frame_rate);

    let guessed_container = guess_container(&raw_name, &content_type).to_string();
    let input_family = input_family_for(&guessed_container, &content_type).to_string();
    let supported_input = is_supported_input(&guessed_container, &content_type);
    let needs_transcode = guessed_container != TARGET_CONTAINER
        || !content_type.to_ascii_lowercase().starts_with("video/mp4");

    let mut warnings = Vec::new();

    if bytes == 0 {
        warnings.push("File size was not available from the local preview.".to_string());
    }

    if bytes > MVP_WARN_LOCAL_VIDEO_BYTES {
        warnings.push(format!(
            "This source is larger than the conservative planner warning threshold: {}.",
            format_bytes(bytes)
        ));
    }

    if bytes > MVP_MAX_LOCAL_VIDEO_BYTES {
        warnings.push(format!(
            "This source exceeds the first local conversion MVP target of {}. Planning is still shown, but actual jobs should reject until large-media paths are wired.",
            format_bytes(MVP_MAX_LOCAL_VIDEO_BYTES)
        ));
    }

    if duration_seconds.is_none() {
        warnings.push(
            "Duration is not known yet. Open the local preview long enough for metadata to load."
                .to_string(),
        );
    }

    if width.is_none() || height.is_none() {
        warnings.push(
            "Resolution is not known yet. The rendition ladder will stay conservative.".to_string(),
        );
    }

    if !supported_input {
        warnings.push(
            "Source format is not in the current supported input list. A future controlled codec engine may still handle it."
                .to_string(),
        );
    }

    if needs_transcode {
        warnings.push(
            "Source should be converted to MP4/H.264/AAC before creator-facing mint.".to_string(),
        );
    } else {
        warnings.push(
            "Source appears to already be MP4, but metadata cleanup is still recommended before minting."
                .to_string(),
        );
    }

    let status = if supported_input {
        "planned"
    } else {
        "needs_codec_support"
    };

    VideoProbeSummary {
        schema: VIDEO_PROBE_SCHEMA.to_string(),
        status: status.to_string(),
        file_name: raw_name,
        safe_display_name,
        content_type,
        bytes,
        duration_seconds,
        width,
        height,
        resolution: resolution_label(width, height),
        aspect_ratio: aspect_ratio_label(width, height),
        frame_rate,
        guessed_container,
        input_family,
        supported_input,
        recommended_container: TARGET_CONTAINER.to_string(),
        recommended_mime: TARGET_MIME.to_string(),
        recommended_video_codec: TARGET_VIDEO_CODEC.to_string(),
        recommended_audio_codec: TARGET_AUDIO_CODEC.to_string(),
        needs_transcode,
        metadata_cleanup_recommended: true,
        source: VideoProbeSource {
            kind: clean_string(input.source).unwrap_or_else(|| "local_preview_metadata".to_string()),
            from_react_preview: true,
            rust_deep_probe_available: false,
            note: "This first batch uses WebView metadata facts and Rust-owned planning. Deep container probing/transcode is the next job-engine batch.".to_string(),
        },
        warnings,
        truth_boundary: VideoProbeTruthBoundary {
            reads_full_video_bytes: false,
            returns_video_bytes: false,
            runs_transcode: false,
            strips_metadata: false,
            mints_b3: false,
            creates_receipt: false,
            mutates_wallet: false,
            claims_codec_certainty: false,
        },
    }
}

fn clean_string(value: Option<String>) -> Option<String> {
    let clean = value.unwrap_or_default().trim().to_string();

    if clean.is_empty() {
        None
    } else {
        Some(clean)
    }
}

fn sanitize_display_name(value: &str) -> String {
    let file_name = value
        .rsplit(['/', '\\'])
        .next()
        .unwrap_or("selected-video")
        .trim();

    let safe: String = file_name
        .chars()
        .filter(|ch| !ch.is_control())
        .take(180)
        .collect();

    if safe.is_empty() {
        "selected-video".to_string()
    } else {
        safe
    }
}

fn finite_positive_f64(value: Option<f64>) -> Option<f64> {
    value.filter(|n| n.is_finite() && *n > 0.0)
}

fn guess_container(file_name: &str, content_type: &str) -> &'static str {
    let lower_name = file_name.to_ascii_lowercase();
    let lower_type = content_type.to_ascii_lowercase();

    if lower_type.contains("mp4") || lower_name.ends_with(".mp4") {
        "mp4"
    } else if lower_type.contains("quicktime") || lower_name.ends_with(".mov") {
        "mov"
    } else if lower_name.ends_with(".m4v") {
        "m4v"
    } else if lower_type.contains("webm") || lower_name.ends_with(".webm") {
        "webm"
    } else if lower_type.contains("ogg")
        || lower_name.ends_with(".ogv")
        || lower_name.ends_with(".ogg")
    {
        "ogg"
    } else if lower_name.ends_with(".mkv") {
        "mkv"
    } else if lower_name.ends_with(".avi") {
        "avi"
    } else {
        "unknown"
    }
}

fn input_family_for(container: &str, content_type: &str) -> &'static str {
    match container {
        "mp4" | "m4v" => "mp4_family",
        "mov" => "quicktime_family",
        "webm" => "webm_family",
        "ogg" => "ogg_family",
        "mkv" => "matroska_family",
        "avi" => "avi_family",
        _ if content_type.to_ascii_lowercase().starts_with("video/") => "video_unknown_container",
        _ => "unknown",
    }
}

fn is_supported_input(container: &str, content_type: &str) -> bool {
    matches!(
        container,
        "mp4" | "m4v" | "mov" | "webm" | "ogg" | "mkv" | "avi"
    ) || content_type.to_ascii_lowercase().starts_with("video/")
}

fn resolution_label(width: Option<u32>, height: Option<u32>) -> Option<String> {
    match (width, height) {
        (Some(w), Some(h)) if w > 0 && h > 0 => Some(format!("{w}x{h}")),
        _ => None,
    }
}

fn aspect_ratio_label(width: Option<u32>, height: Option<u32>) -> Option<String> {
    let (w, h) = match (width, height) {
        (Some(w), Some(h)) if w > 0 && h > 0 => (w, h),
        _ => return None,
    };

    let divisor = gcd(w, h);
    Some(format!("{}:{}", w / divisor, h / divisor))
}

fn gcd(a: u32, b: u32) -> u32 {
    let mut x = a.max(1);
    let mut y = b.max(1);

    while y != 0 {
        let temp = y;
        y = x % y;
        x = temp;
    }

    x.max(1)
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
