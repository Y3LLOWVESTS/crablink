//! RO:WHAT — Local media planning and staging limits for CrabLink video preparation.
//! RO:WHY — Video files are large; planning/transcode work must stay bounded and honest.
//! RO:INTERACTS — video_probe, video_renditions, video_sources, video_jobs, video_transcode.
//! RO:INVARIANTS — no full video bytes through command results; conservative limits; fail honestly.
//! RO:METRICS — none.
//! RO:CONFIG — constants only for this MVP batch.
//! RO:SECURITY — limits prevent accidental large DTOs, unbounded process runtime, or huge native work.
//! RO:TEST — cargo check; manual MOV→clean MP4 staging smoke.

pub const VIDEO_PLANNER_SCHEMA: &str = "crablink.local.video-converter-plan.v1";
pub const VIDEO_PROBE_SCHEMA: &str = "crablink.local.video-probe-summary.v1";

pub const MVP_MAX_LOCAL_VIDEO_BYTES: u64 = 250 * 1024 * 1024;
pub const MVP_WARN_LOCAL_VIDEO_BYTES: u64 = 100 * 1024 * 1024;

pub const MAX_RENDITION_ENTRIES: usize = 8;
#[allow(dead_code)]
pub const TRANSCODE_JOB_TIMEOUT_SECS: u64 = 20 * 60;

pub const TARGET_CONTAINER: &str = "mp4";
pub const TARGET_MIME: &str = "video/mp4";
pub const TARGET_VIDEO_CODEC: &str = "h264";
pub const TARGET_AUDIO_CODEC: &str = "aac";

pub const POSTER_WIDTH: u32 = 1280;
pub const POSTER_HEIGHT: u32 = 720;
pub const THUMBNAIL_WIDTH: u32 = 480;
pub const THUMBNAIL_HEIGHT: u32 = 270;
