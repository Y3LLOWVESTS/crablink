//! RO:WHAT — Reusable local media planning/core staging for CrabLink Tauri.
//! RO:WHY — Keeps heavy video preparation Rust-owned and separate from thin Tauri command glue.
//! RO:INTERACTS — commands::media, video_probe, video_renditions, video_sources, video_jobs, video_transcode.
//! RO:INVARIANTS — no shell bridge; no full media bytes in command results; no backend truth claims.
//! RO:METRICS — none yet; future jobs should expose bounded progress/status counters.
//! RO:CONFIG — hard local MVP limits live in limits.rs; CRABLINK_FFMPEG may override ffmpeg.
//! RO:SECURITY — returns small redacted DTOs only; no secrets, stack traces, or raw native command strings.
//! RO:TEST — cargo check; future unit tests for probe/rendition/source/job state decisions.

pub mod limits;
pub mod make_export;
pub mod video_jobs;
pub mod video_probe;
pub mod video_renditions;
pub mod video_sources;
pub mod video_transcode;

pub use video_jobs::{
    cancel_video_prepare_job, get_video_prepare_job_status, new_video_job_store,
    start_video_prepare_job, VideoJobStatus, VideoJobStore, VideoPrepareBundleInput,
};
pub use video_probe::{probe_video_from_local_facts, VideoProbeInput, VideoProbeSummary};
pub use video_renditions::{
    plan_video_renditions_from_probe, VideoRenditionPlanInput, VideoRenditionPlanResponse,
};
pub use video_sources::{
    clear_video_source_registration, get_registered_video_source_for_job,
    get_video_source_registration, new_video_source_store, register_video_source_from_path,
    VideoRegisterSourceInput, VideoSourceClearResponse, VideoSourceRegistration, VideoSourceStore,
};

pub use make_export::{
    append_make_export_audio_chunk, append_make_export_chunk, begin_make_export_session,
    clear_make_export_session, finish_make_export_session, get_make_export_status,
    new_make_export_store, MakeExportAppendAudioChunkInput, MakeExportAppendChunkInput,
    MakeExportBeginInput, MakeExportFinishInput, MakeExportStatus, MakeExportStore,
};
