//! RO:WHAT — Builds, runs, and verifies fixed FFmpeg transcode targets for CrabLink Tauri video jobs.
//! RO:WHY — Real local MP4 staging must stay Rust-owned, bounded, redacted, and dimension-honest.
//! RO:INTERACTS — video_jobs, video_sources, video_renditions, commands::media, local ffmpeg/ffprobe.
//! RO:INVARIANTS — no shell bridge; no caller-supplied args; no private paths in DTOs; no mint/receipt truth.
//! RO:METRICS — none yet; future staged media jobs should expose duration/failure counters.
//! RO:CONFIG — CRABLINK_FFMPEG/CRABLINK_FFPROBE may override developer machine binaries.
//! RO:SECURITY — fixed allowlisted codec/filter policy; metadata stripped with -map_metadata -1.
//! RO:TEST — cargo check; manual crab://video native source → prepare job → verified staged outputs.

use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};

use serde_json::Value;

use super::video_jobs::{VideoJobOutputDescriptor, VideoJobOutputVerification};
use super::video_renditions::VideoRenditionEntry;

#[derive(Debug, Clone)]
pub struct VideoTranscodeTarget {
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
    pub output_path: PathBuf,
    source_path: PathBuf,
    max_video_bitrate_kbps: Option<u32>,
    audio_bitrate_kbps: Option<u32>,
}

#[derive(Debug, Clone)]
pub struct VideoStagedOutputProbe {
    pub status: String,
    pub checked_with: String,
    pub actual_width: Option<u32>,
    pub actual_height: Option<u32>,
    pub actual_duration_seconds: Option<f64>,
    pub actual_video_codec: Option<String>,
    pub actual_audio_codec: Option<String>,
    pub dimensions_within_target: Option<bool>,
    pub note: String,
}

impl VideoTranscodeTarget {
    pub fn build_command(&self, ffmpeg_binary: &str) -> Command {
        let mut command = Command::new(ffmpeg_binary);
        command
            .arg("-hide_banner")
            .arg("-nostdin")
            .arg("-y")
            .arg("-i")
            .arg(&self.source_path);

        if self.asset_kind == "image" {
            command
                .arg("-map")
                .arg("0:v:0")
                .arg("-frames:v")
                .arg("1")
                .arg("-map_metadata")
                .arg("-1");

            if let Some(filter) = self.scale_filter() {
                command.arg("-vf").arg(filter);
            }

            command.arg("-q:v").arg("3").arg(&self.output_path);
            return command;
        }

        command
            .arg("-map")
            .arg("0:v:0")
            .arg("-map")
            .arg("0:a?")
            .arg("-map_metadata")
            .arg("-1")
            .arg("-c:v")
            .arg("libx264")
            .arg("-preset")
            .arg("veryfast")
            .arg("-pix_fmt")
            .arg("yuv420p")
            .arg("-profile:v")
            .arg("high");

        if let Some(filter) = self.scale_filter() {
            command.arg("-vf").arg(filter);
        }

        if let Some(kbps) = self.max_video_bitrate_kbps.filter(|value| *value > 0) {
            command
                .arg("-b:v")
                .arg(format!("{kbps}k"))
                .arg("-maxrate")
                .arg(format!("{kbps}k"))
                .arg("-bufsize")
                .arg(format!("{}k", kbps.saturating_mul(2)));
        }

        let audio_kbps = self.audio_bitrate_kbps.unwrap_or(128).clamp(64, 320);
        command
            .arg("-c:a")
            .arg("aac")
            .arg("-b:a")
            .arg(format!("{audio_kbps}k"))
            .arg("-ac")
            .arg("2")
            .arg("-movflags")
            .arg("+faststart")
            .arg(&self.output_path);

        command
    }

    pub fn descriptor(
        &self,
        bytes: Option<u64>,
        ready_for_mint: bool,
        note: String,
        verification: VideoJobOutputVerification,
    ) -> VideoJobOutputDescriptor {
        VideoJobOutputDescriptor {
            role: self.role.clone(),
            label: self.label.clone(),
            asset_kind: self.asset_kind.clone(),
            target_container: self.target_container.clone(),
            target_mime: self.target_mime.clone(),
            video_codec: verification
                .actual_video_codec
                .clone()
                .or_else(|| self.video_codec.clone()),
            audio_codec: verification
                .actual_audio_codec
                .clone()
                .or_else(|| self.audio_codec.clone()),
            width: verification.actual_width.or(self.width),
            height: verification.actual_height.or(self.height),
            duration_seconds: verification
                .actual_duration_seconds
                .or(self.duration_seconds),
            staged_handle: self.staged_handle.clone(),
            exists_on_disk: bytes.is_some(),
            bytes,
            content_id: None,
            crab_url: None,
            ready_for_mint,
            note,
            verification,
        }
    }

    fn scale_filter(&self) -> Option<String> {
        match (
            self.width.filter(|value| *value >= 2),
            self.height.filter(|value| *value >= 2),
        ) {
            (Some(width), Some(height)) => Some(scale_filter_box(width, height)),
            (Some(width), None) => Some(scale_filter_max_width(width)),
            (None, Some(height)) => Some(scale_filter_max_height(height)),
            (None, None) => None,
        }
    }
}

pub fn ffmpeg_binary() -> String {
    std::env::var("CRABLINK_FFMPEG")
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "ffmpeg".to_string())
}

pub fn ffprobe_binary() -> String {
    std::env::var("CRABLINK_FFPROBE")
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "ffprobe".to_string())
}

pub fn build_video_transcode_targets(
    job_id: &str,
    source_path: PathBuf,
    entries: &[VideoRenditionEntry],
) -> Result<Vec<VideoTranscodeTarget>, String> {
    let output_dir = video_job_output_dir(job_id)?;
    std::fs::create_dir_all(&output_dir)
        .map_err(|_| "could not create local staged video output directory".to_string())?;

    let mut targets = Vec::new();

    for entry in entries.iter().filter(|entry| entry.planned) {
        if entry.asset_kind != "video" && entry.asset_kind != "image" {
            continue;
        }

        let role = safe_role(&entry.role);
        let extension = extension_for(entry);
        let output_path = output_dir.join(format!("{role}.{extension}"));
        let staged_handle = format!("staged://video-job/{job_id}/{role}.{extension}");

        targets.push(VideoTranscodeTarget {
            role,
            label: clean_label(&entry.label, "Prepared output"),
            asset_kind: entry.asset_kind.clone(),
            target_container: if entry.asset_kind == "image" {
                "jpeg".to_string()
            } else {
                entry.target_container.clone()
            },
            target_mime: if entry.asset_kind == "image" {
                "image/jpeg".to_string()
            } else {
                entry.target_mime.clone()
            },
            video_codec: entry.video_codec.clone(),
            audio_codec: entry.audio_codec.clone(),
            width: entry.width,
            height: entry.height,
            duration_seconds: entry.duration_seconds,
            staged_handle,
            output_path,
            source_path: source_path.clone(),
            max_video_bitrate_kbps: entry.max_video_bitrate_kbps,
            audio_bitrate_kbps: entry.audio_bitrate_kbps,
        });
    }

    if targets.is_empty() {
        return Err("video plan did not include any supported staged output targets".to_string());
    }

    Ok(targets)
}

pub fn probe_staged_output(ffprobe: &str, target: &VideoTranscodeTarget) -> VideoStagedOutputProbe {
    let output = Command::new(ffprobe)
        .arg("-v")
        .arg("error")
        .arg("-print_format")
        .arg("json")
        .arg("-show_streams")
        .arg("-show_format")
        .arg(&target.output_path)
        .stdin(Stdio::null())
        .stderr(Stdio::null())
        .output();

    let output = match output {
        Ok(output) => output,
        Err(_) => {
            return VideoStagedOutputProbe {
                status: "unverified".to_string(),
                checked_with: "ffprobe".to_string(),
                actual_width: None,
                actual_height: None,
                actual_duration_seconds: None,
                actual_video_codec: None,
                actual_audio_codec: None,
                dimensions_within_target: None,
                note: "ffprobe was not available, so the staged output exists but dimensions/codecs were not verified.".to_string(),
            };
        }
    };

    if !output.status.success() {
        return VideoStagedOutputProbe {
            status: "unverified".to_string(),
            checked_with: "ffprobe".to_string(),
            actual_width: None,
            actual_height: None,
            actual_duration_seconds: None,
            actual_video_codec: None,
            actual_audio_codec: None,
            dimensions_within_target: None,
            note: "ffprobe could not read the staged output. FFmpeg succeeded, but output facts are not verified.".to_string(),
        };
    }

    let root = match serde_json::from_slice::<Value>(&output.stdout) {
        Ok(root) => root,
        Err(_) => {
            return VideoStagedOutputProbe {
                status: "unverified".to_string(),
                checked_with: "ffprobe".to_string(),
                actual_width: None,
                actual_height: None,
                actual_duration_seconds: None,
                actual_video_codec: None,
                actual_audio_codec: None,
                dimensions_within_target: None,
                note: "ffprobe returned output, but the JSON could not be parsed.".to_string(),
            };
        }
    };

    let video_stream = first_stream_by_type(&root, "video");
    let audio_stream = first_stream_by_type(&root, "audio");

    let actual_width = video_stream.and_then(|stream| u32_field(stream, "width"));
    let actual_height = video_stream.and_then(|stream| u32_field(stream, "height"));
    let actual_video_codec = video_stream.and_then(|stream| string_field(stream, "codec_name"));
    let actual_audio_codec = audio_stream.and_then(|stream| string_field(stream, "codec_name"));
    let actual_duration_seconds = video_stream
        .and_then(|stream| f64_string_field(stream, "duration"))
        .or_else(|| format_duration_seconds(&root));

    let dimensions_within_target = dimensions_within_target(
        target.width,
        target.height,
        actual_width,
        actual_height,
    );

    let status = if actual_width.is_some() && actual_height.is_some() {
        "verified"
    } else {
        "unverified"
    };

    let note = match dimensions_within_target {
        Some(true) => "ffprobe verified the staged output and its dimensions are within the planned target.".to_string(),
        Some(false) => "ffprobe verified the staged output, but its dimensions exceed the planned target. Review scaling before minting this version.".to_string(),
        None => "ffprobe ran, but the staged output dimensions could not be compared to the planned target.".to_string(),
    };

    VideoStagedOutputProbe {
        status: status.to_string(),
        checked_with: "ffprobe".to_string(),
        actual_width,
        actual_height,
        actual_duration_seconds,
        actual_video_codec,
        actual_audio_codec,
        dimensions_within_target,
        note,
    }
}

pub fn configure_command_stdio(command: &mut Command) {
    command
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());
}

fn video_job_output_dir(job_id: &str) -> Result<PathBuf, String> {
    let mut dir = std::env::temp_dir();
    dir.push("crablink-video-jobs");
    dir.push(safe_role(job_id));

    validate_output_dir(&dir)?;
    Ok(dir)
}

fn validate_output_dir(path: &Path) -> Result<(), String> {
    if path.components().count() > 96 {
        return Err("video output directory is too deeply nested".to_string());
    }

    Ok(())
}

fn extension_for(entry: &VideoRenditionEntry) -> &'static str {
    match entry.asset_kind.as_str() {
        "image" => "jpg",
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

fn clean_label(value: &str, fallback: &str) -> String {
    let clean: String = value
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

fn scale_filter_box(width: u32, height: u32) -> String {
    let even_width = even_u32(width);
    let even_height = even_u32(height);

    format!(
        "scale=trunc(min(iw\\,{even_width})/2)*2:trunc(min(ih\\,{even_height})/2)*2:force_original_aspect_ratio=decrease"
    )
}

fn scale_filter_max_width(width: u32) -> String {
    let even_width = even_u32(width);
    format!("scale=trunc(min(iw\\,{even_width})/2)*2:-2")
}

fn scale_filter_max_height(height: u32) -> String {
    let even_height = even_u32(height);
    format!("scale=-2:trunc(min(ih\\,{even_height})/2)*2")
}

fn even_u32(value: u32) -> u32 {
    let safe = value.max(2);
    if safe % 2 == 0 {
        safe
    } else {
        safe - 1
    }
}

fn first_stream_by_type<'a>(root: &'a Value, codec_type: &str) -> Option<&'a Value> {
    root.get("streams")?
        .as_array()?
        .iter()
        .find(|stream| string_field(stream, "codec_type").as_deref() == Some(codec_type))
}

fn u32_field(value: &Value, key: &str) -> Option<u32> {
    value
        .get(key)?
        .as_u64()
        .and_then(|number| u32::try_from(number).ok())
        .filter(|number| *number > 0)
}

fn string_field(value: &Value, key: &str) -> Option<String> {
    value
        .get(key)?
        .as_str()
        .map(str::trim)
        .filter(|text| !text.is_empty())
        .map(|text| text.chars().take(80).collect())
}

fn f64_string_field(value: &Value, key: &str) -> Option<f64> {
    value
        .get(key)?
        .as_str()?
        .parse::<f64>()
        .ok()
        .filter(|number| number.is_finite() && *number > 0.0)
}

fn format_duration_seconds(root: &Value) -> Option<f64> {
    root.get("format")
        .and_then(|format| f64_string_field(format, "duration"))
}

fn dimensions_within_target(
    target_width: Option<u32>,
    target_height: Option<u32>,
    actual_width: Option<u32>,
    actual_height: Option<u32>,
) -> Option<bool> {
    let mut checks = Vec::new();

    if let (Some(target), Some(actual)) = (target_width, actual_width) {
        checks.push(actual <= even_u32(target).saturating_add(2));
    }

    if let (Some(target), Some(actual)) = (target_height, actual_height) {
        checks.push(actual <= even_u32(target).saturating_add(2));
    }

    if checks.is_empty() {
        None
    } else {
        Some(checks.into_iter().all(|check| check))
    }
}