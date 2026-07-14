//! RO:WHAT — Plans MP4 video renditions from an honest local probe summary.
//! RO:WHY — Device-size output planning must be deterministic before native transcode jobs are wired.
//! RO:INTERACTS — video_probe, video_jobs, commands::media, VideoConverterPanel.jsx.
//! RO:INVARIANTS — no upscaling; no fake CIDs; no fake output files; no wallet/storage/index mutation.
//! RO:METRICS — none.
//! RO:CONFIG — uses conservative static output profiles.
//! RO:SECURITY — fixed allowlisted output roles only; no arbitrary codec args from React.
//! RO:TEST — cargo check; future unit tests for no-upscale ladder.

use serde::{Deserialize, Serialize};

use super::limits::{
    MAX_RENDITION_ENTRIES, POSTER_HEIGHT, POSTER_WIDTH, TARGET_AUDIO_CODEC, TARGET_CONTAINER,
    TARGET_MIME, TARGET_VIDEO_CODEC, THUMBNAIL_HEIGHT, THUMBNAIL_WIDTH, VIDEO_PLANNER_SCHEMA,
};
use super::video_probe::VideoProbeSummary;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoRenditionPlanInput {
    pub probe: VideoProbeSummary,
    pub include_poster: Option<bool>,
    pub include_thumbnail: Option<bool>,
    pub include_source_clean_master: Option<bool>,
    pub max_entries: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoRenditionPlanResponse {
    pub schema: String,
    pub status: String,
    pub generated_at_unix_ms: u128,
    pub target_container: String,
    pub target_mime: String,
    pub target_video_codec: String,
    pub target_audio_codec: String,
    pub source: VideoPlanSource,
    pub entries: Vec<VideoRenditionEntry>,
    pub skipped: Vec<VideoRenditionSkip>,
    pub privacy_cleanup: VideoPrivacyCleanupPlan,
    pub warnings: Vec<String>,
    pub truth_boundary: VideoPlanTruthBoundary,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoPlanSource {
    pub file_name: String,
    pub content_type: String,
    pub bytes: u64,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub duration_seconds: Option<f64>,
    pub needs_transcode: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoRenditionEntry {
    pub role: String,
    pub label: String,
    pub asset_kind: String,
    pub planned: bool,
    pub target_container: String,
    pub target_mime: String,
    pub video_codec: Option<String>,
    pub audio_codec: Option<String>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub max_video_bitrate_kbps: Option<u32>,
    pub audio_bitrate_kbps: Option<u32>,
    pub duration_seconds: Option<f64>,
    pub source_relation: String,
    pub output_file_claimed: bool,
    pub cid: Option<String>,
    pub crab_url: Option<String>,
    pub note: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoRenditionSkip {
    pub role: String,
    pub label: String,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoPrivacyCleanupPlan {
    pub default_policy: String,
    pub strips_hidden_container_metadata: bool,
    pub preserves_intentional_manifest_fields: bool,
    pub note: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoPlanTruthBoundary {
    pub runs_transcode: bool,
    pub writes_output_files: bool,
    pub uploads_bytes: bool,
    pub mints_b3: bool,
    pub creates_receipt: bool,
    pub mutates_wallet: bool,
    pub unlocks_paid_content: bool,
}

pub fn plan_video_renditions_from_probe(
    input: VideoRenditionPlanInput,
) -> VideoRenditionPlanResponse {
    let probe = input.probe;
    let max_entries = input
        .max_entries
        .unwrap_or(MAX_RENDITION_ENTRIES)
        .clamp(1, MAX_RENDITION_ENTRIES);

    let include_master = input.include_source_clean_master.unwrap_or(true);
    let include_poster = input.include_poster.unwrap_or(true);
    let include_thumbnail = input.include_thumbnail.unwrap_or(true);

    let mut entries = Vec::new();
    let mut skipped = Vec::new();

    if include_master {
        entries.push(clean_master_entry(&probe));
    }

    push_video_profile(
        &mut entries,
        &mut skipped,
        &probe,
        TargetProfile {
            role: "desktop_1080p",
            label: "Desktop 1080p MP4",
            max_height: 1080,
            max_video_bitrate_kbps: 5000,
            audio_bitrate_kbps: 160,
        },
    );

    push_video_profile(
        &mut entries,
        &mut skipped,
        &probe,
        TargetProfile {
            role: "tablet_720p",
            label: "Tablet 720p MP4",
            max_height: 720,
            max_video_bitrate_kbps: 3000,
            audio_bitrate_kbps: 128,
        },
    );

    push_video_profile(
        &mut entries,
        &mut skipped,
        &probe,
        TargetProfile {
            role: "mobile_480p",
            label: "Mobile 480p MP4",
            max_height: 480,
            max_video_bitrate_kbps: 1400,
            audio_bitrate_kbps: 128,
        },
    );

    push_video_profile(
        &mut entries,
        &mut skipped,
        &probe,
        TargetProfile {
            role: "low_360p",
            label: "Low bandwidth 360p MP4",
            max_height: 360,
            max_video_bitrate_kbps: 800,
            audio_bitrate_kbps: 96,
        },
    );

    if include_poster {
        entries.push(image_entry(
            "poster_image",
            "Poster image",
            POSTER_WIDTH,
            POSTER_HEIGHT,
            "Poster extraction from the cleaned source. It will mint as a separate .image asset only after backend upload confirms truth.",
        ));
    }

    if include_thumbnail {
        entries.push(image_entry(
            "thumbnail_image",
            "Thumbnail image",
            THUMBNAIL_WIDTH,
            THUMBNAIL_HEIGHT,
            "Thumbnail extraction from the cleaned source. It will mint as a separate .image asset only after backend upload confirms truth.",
        ));
    }

    entries.truncate(max_entries);

    let mut warnings = probe.warnings.clone();
    warnings.push("This is a Rust-owned plan. Real staged files are written only after a native source handle starts the prepare job.".to_string());
    warnings.push("Backend upload, b3 confirmation, crab URL creation, receipts, and wallet mutation remain separate explicit backend steps.".to_string());

    let status = if probe.supported_input {
        "ready_for_job_engine"
    } else {
        "blocked_until_codec_engine"
    };

    VideoRenditionPlanResponse {
        schema: VIDEO_PLANNER_SCHEMA.to_string(),
        status: status.to_string(),
        generated_at_unix_ms: now_unix_ms(),
        target_container: TARGET_CONTAINER.to_string(),
        target_mime: TARGET_MIME.to_string(),
        target_video_codec: TARGET_VIDEO_CODEC.to_string(),
        target_audio_codec: TARGET_AUDIO_CODEC.to_string(),
        source: VideoPlanSource {
            file_name: probe.safe_display_name.clone(),
            content_type: probe.content_type.clone(),
            bytes: probe.bytes,
            width: probe.width,
            height: probe.height,
            duration_seconds: probe.duration_seconds,
            needs_transcode: probe.needs_transcode,
        },
        entries,
        skipped,
        privacy_cleanup: VideoPrivacyCleanupPlan {
            default_policy: "default_video_privacy".to_string(),
            strips_hidden_container_metadata: true,
            preserves_intentional_manifest_fields: true,
            note: "Strip hidden source metadata during local staging; keep creator-entered CrabLink manifest fields intentional and separate.".to_string(),
        },
        warnings,
        truth_boundary: VideoPlanTruthBoundary {
            runs_transcode: false,
            writes_output_files: false,
            uploads_bytes: false,
            mints_b3: false,
            creates_receipt: false,
            mutates_wallet: false,
            unlocks_paid_content: false,
        },
    }
}

struct TargetProfile {
    role: &'static str,
    label: &'static str,
    max_height: u32,
    max_video_bitrate_kbps: u32,
    audio_bitrate_kbps: u32,
}

fn clean_master_entry(probe: &VideoProbeSummary) -> VideoRenditionEntry {
    VideoRenditionEntry {
        role: "source_clean_master".to_string(),
        label: "Clean MP4 master".to_string(),
        asset_kind: "video".to_string(),
        planned: true,
        target_container: TARGET_CONTAINER.to_string(),
        target_mime: TARGET_MIME.to_string(),
        video_codec: Some(TARGET_VIDEO_CODEC.to_string()),
        audio_codec: Some(TARGET_AUDIO_CODEC.to_string()),
        width: probe.width,
        height: probe.height,
        max_video_bitrate_kbps: None,
        audio_bitrate_kbps: Some(160),
        duration_seconds: probe.duration_seconds,
        source_relation: "cleaned_from_selected_source".to_string(),
        output_file_claimed: false,
        cid: None,
        crab_url: None,
        note: "Cleaned MP4 master output. Not minted until backend returns a real b3/crab URL."
            .to_string(),
    }
}

fn push_video_profile(
    entries: &mut Vec<VideoRenditionEntry>,
    skipped: &mut Vec<VideoRenditionSkip>,
    probe: &VideoProbeSummary,
    profile: TargetProfile,
) {
    let (source_width, source_height) = match (probe.width, probe.height) {
        (Some(w), Some(h)) if w > 0 && h > 0 => (w, h),
        _ => {
            entries.push(VideoRenditionEntry {
                role: profile.role.to_string(),
                label: profile.label.to_string(),
                asset_kind: "video".to_string(),
                planned: true,
                target_container: TARGET_CONTAINER.to_string(),
                target_mime: TARGET_MIME.to_string(),
                video_codec: Some(TARGET_VIDEO_CODEC.to_string()),
                audio_codec: Some(TARGET_AUDIO_CODEC.to_string()),
                width: None,
                height: Some(profile.max_height),
                max_video_bitrate_kbps: Some(profile.max_video_bitrate_kbps),
                audio_bitrate_kbps: Some(profile.audio_bitrate_kbps),
                duration_seconds: probe.duration_seconds,
                source_relation: "planned_from_unknown_resolution".to_string(),
                output_file_claimed: false,
                cid: None,
                crab_url: None,
                note: "Resolution is unknown, so this remains a proposed target until deep probe is wired.".to_string(),
            });
            return;
        }
    };

    if source_height < profile.max_height {
        skipped.push(VideoRenditionSkip {
            role: profile.role.to_string(),
            label: profile.label.to_string(),
            reason: format!(
                "Skipped to avoid upscaling: source height is {}p, target is {}p.",
                source_height, profile.max_height
            ),
        });
        return;
    }

    let target_height = profile.max_height.min(source_height);
    let target_width = even_u32(
        ((source_width as f64 / source_height as f64) * target_height as f64).round() as u32,
    );

    entries.push(VideoRenditionEntry {
        role: profile.role.to_string(),
        label: profile.label.to_string(),
        asset_kind: "video".to_string(),
        planned: true,
        target_container: TARGET_CONTAINER.to_string(),
        target_mime: TARGET_MIME.to_string(),
        video_codec: Some(TARGET_VIDEO_CODEC.to_string()),
        audio_codec: Some(TARGET_AUDIO_CODEC.to_string()),
        width: Some(target_width),
        height: Some(even_u32(target_height)),
        max_video_bitrate_kbps: Some(profile.max_video_bitrate_kbps),
        audio_bitrate_kbps: Some(profile.audio_bitrate_kbps),
        duration_seconds: probe.duration_seconds,
        source_relation: "derived_from_clean_master".to_string(),
        output_file_claimed: false,
        cid: None,
        crab_url: None,
        note: "Generated MP4 rendition. Not minted until backend upload returns real truth."
            .to_string(),
    });
}

fn image_entry(
    role: &str,
    label: &str,
    width: u32,
    height: u32,
    note: &str,
) -> VideoRenditionEntry {
    VideoRenditionEntry {
        role: role.to_string(),
        label: label.to_string(),
        asset_kind: "image".to_string(),
        planned: true,
        target_container: "jpeg".to_string(),
        target_mime: "image/jpeg".to_string(),
        video_codec: None,
        audio_codec: None,
        width: Some(width),
        height: Some(height),
        max_video_bitrate_kbps: None,
        audio_bitrate_kbps: None,
        duration_seconds: None,
        source_relation: "extracted_from_clean_master".to_string(),
        output_file_claimed: false,
        cid: None,
        crab_url: None,
        note: note.to_string(),
    }
}

fn even_u32(value: u32) -> u32 {
    let safe = value.max(2);
    if safe % 2 == 0 {
        safe
    } else {
        safe - 1
    }
}

fn now_unix_ms() -> u128 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0)
}
