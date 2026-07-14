//! RO:WHAT — Bounded paid asset upload commands for CrabLink Tauri.
//! RO:WHY — Binary media bytes cannot safely/reliably flow through the generic JSON/text gateway_request bridge.
//! RO:INTERACTS — assetClient.js, videoAssetClient.js, musicAssetClient.js, podcastAssetClient.js, ImagePublishFlow.jsx, VideoPublishFlow.jsx, MusicPublishFlow.jsx, PodcastPublishFlow.jsx, svc-gateway asset routes.
//! RO:INVARIANTS — gateway-first; fixed routes only; no direct storage/index/ledger calls; no fake CIDs/receipts.
//! RO:SECURITY — bounded request/response; redacted errors; no arbitrary URL/path upload; paid proof headers required.
//! RO:TEST — manual crab://image, crab://video, crab://music, and crab://podcast prepare → hold → upload smoke from Tauri.

use crate::state::AppState;
use reqwest::header::{HeaderName, HeaderValue, CONTENT_LENGTH};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::time::Duration;
use tauri::State;
use tokio_util::io::ReaderStream;

const MAX_IMAGE_UPLOAD_BYTES: usize = 25 * 1024 * 1024;
const MAX_VIDEO_UPLOAD_BYTES: usize = 10 * 1024 * 1024;
const MAX_STAGED_VIDEO_UPLOAD_BYTES: usize = 512 * 1024 * 1024;
const MAX_MUSIC_UPLOAD_BYTES: usize = 25 * 1024 * 1024;
const MAX_ASSET_BYTES_FETCH_BYTES: usize = 12 * 1024 * 1024;
const MAX_PODCAST_UPLOAD_BYTES: usize = 25 * 1024 * 1024;
const MAX_RESPONSE_TEXT_BYTES: usize = 4 * 1024 * 1024;
const STAGED_VIDEO_PREFIX: &str = "staged://video-job/";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PaidAssetUploadRequest {
    pub headers: Option<HashMap<String, String>>,
    pub body_bytes: Vec<u8>,
    pub idempotency_key: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StagedPaidAssetUploadRequest {
    pub headers: Option<HashMap<String, String>>,
    pub staged_handle: String,
    pub idempotency_key: Option<String>,
    pub expected_asset_kind: Option<String>,
    pub content_type_hint: Option<String>,
    pub max_bytes: Option<usize>,
}

#[derive(Debug, Serialize)]
pub struct PaidAssetUploadResponse {
    pub schema: &'static str,
    pub method: &'static str,
    pub route: &'static str,
    pub status: u16,
    pub ok: bool,
    pub correlation_id: String,
    pub content_type: String,
    pub data: Value,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AssetBytesFetchRequest {
    pub route: String,
    pub accept: Option<String>,
    pub content_type_hint: Option<String>,
    pub max_bytes: Option<usize>,
    pub headers: Option<HashMap<String, String>>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AssetBytesFetchResponse {
    pub schema: &'static str,
    pub method: &'static str,
    pub route: String,
    pub status: u16,
    pub ok: bool,
    pub correlation_id: String,
    pub content_type: String,
    pub bytes: usize,
    pub body_bytes: Vec<u8>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageAssetHashRequest {
    pub body_bytes: Vec<u8>,
    pub content_type: Option<String>,
    pub role: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageAssetHashResponse {
    pub schema: &'static str,
    pub asset_kind: &'static str,
    pub role: String,
    pub content_type: String,
    pub bytes: usize,
    pub hash: String,
    pub cid: String,
    pub crab_url: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StagedAssetHashRequest {
    pub staged_handle: String,
    pub expected_asset_kind: Option<String>,
    pub content_type_hint: Option<String>,
    pub role: Option<String>,
    pub max_bytes: Option<usize>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StagedAssetHashResponse {
    pub schema: &'static str,
    pub asset_kind: String,
    pub role: String,
    pub content_type: String,
    pub bytes: u64,
    pub hash: String,
    pub cid: String,
    pub crab_url: String,
    pub staged_handle_redacted: String,
}

#[tauri::command]
pub async fn hash_image_asset_bytes(
    request: ImageAssetHashRequest,
) -> Result<ImageAssetHashResponse, String> {
    if request.body_bytes.is_empty() {
        return Err("image hash requires non-empty image bytes".to_string());
    }

    if request.body_bytes.len() > MAX_IMAGE_UPLOAD_BYTES {
        return Err(format!(
            "image hash exceeds the {} MiB MVP command bridge limit",
            MAX_IMAGE_UPLOAD_BYTES / (1024 * 1024)
        ));
    }

    let content_type = request
        .content_type
        .unwrap_or_else(|| "image/png".to_string())
        .trim()
        .to_string();

    if !content_type.to_ascii_lowercase().starts_with("image/") {
        return Err("image hash Content-Type must be image/*".to_string());
    }

    let hash = blake3::hash(&request.body_bytes).to_hex().to_string();
    let cid = format!("b3:{hash}");
    let crab_url = format!("crab://{hash}.image");

    Ok(ImageAssetHashResponse {
        schema: "crablink.tauri.image-asset-hash-response.v1",
        asset_kind: "image",
        role: request
            .role
            .unwrap_or_else(|| "image".to_string())
            .trim()
            .to_string(),
        content_type,
        bytes: request.body_bytes.len(),
        hash,
        cid,
        crab_url,
    })
}

#[tauri::command]
pub async fn hash_staged_asset_bytes(
    request: StagedAssetHashRequest,
) -> Result<StagedAssetHashResponse, String> {
    let asset_kind = normalize_staged_asset_kind(request.expected_asset_kind.as_deref());
    let mime_prefix = if asset_kind == "image" {
        "image/"
    } else {
        "video/"
    };
    let default_content_type = if asset_kind == "image" {
        "image/jpeg"
    } else {
        "video/mp4"
    };
    let max_cap = if asset_kind == "image" {
        MAX_IMAGE_UPLOAD_BYTES
    } else {
        MAX_STAGED_VIDEO_UPLOAD_BYTES
    };
    let path = resolve_video_staged_handle_to_path(&request.staged_handle)?;
    let metadata =
        std::fs::metadata(&path).map_err(|_| "staged hash file is not available".to_string())?;

    if !metadata.is_file() {
        return Err("staged hash handle does not point to a file".to_string());
    }

    if metadata.len() == 0 {
        return Err("staged hash file is empty".to_string());
    }

    let max_bytes = request.max_bytes.unwrap_or(max_cap).min(max_cap);

    if metadata.len() > max_bytes as u64 {
        return Err(format!(
            "staged hash file exceeds the {} MiB staged hash limit",
            max_bytes / (1024 * 1024)
        ));
    }

    let content_type = request
        .content_type_hint
        .unwrap_or_else(|| default_content_type.to_string())
        .trim()
        .to_string();

    if !content_type
        .to_ascii_lowercase()
        .starts_with(&mime_prefix.to_ascii_lowercase())
    {
        return Err(format!(
            "staged hash Content-Type must be a {}* MIME type",
            mime_prefix
        ));
    }

    let hash = tauri::async_runtime::spawn_blocking(move || hash_file_blake3(path))
        .await
        .map_err(|_| "staged hash read task failed".to_string())??;
    let cid = format!("b3:{hash}");
    let crab_url = format!("crab://{hash}.{asset_kind}");

    Ok(StagedAssetHashResponse {
        schema: "crablink.tauri.staged-asset-hash-response.v1",
        asset_kind,
        role: request
            .role
            .unwrap_or_else(|| "staged_asset".to_string())
            .trim()
            .to_string(),
        content_type,
        bytes: metadata.len(),
        hash,
        cid,
        crab_url,
        staged_handle_redacted: redact_staged_handle(&request.staged_handle),
    })
}

#[tauri::command]
pub async fn fetch_asset_bytes_gateway(
    state: State<'_, AppState>,
    request: AssetBytesFetchRequest,
) -> Result<AssetBytesFetchResponse, String> {
    let route = normalize_asset_bytes_route(&request.route)?;
    let max_bytes = request
        .max_bytes
        .unwrap_or(MAX_ASSET_BYTES_FETCH_BYTES)
        .min(MAX_ASSET_BYTES_FETCH_BYTES);

    let request_headers = request.headers.unwrap_or_default();

    let (base_url, timeout_ms, default_passport, default_wallet) = {
        let settings = state
            .settings
            .lock()
            .map_err(|_| "settings lock poisoned".to_string())?;

        (
            normalize_base_url(&settings.gateway_url),
            settings.request_timeout_ms.min(30_000),
            settings.passport_label.clone(),
            settings.wallet_account.clone(),
        )
    };

    let correlation_id = header_value(&request_headers, "x-correlation-id")
        .unwrap_or_else(|| "crablink-tauri-asset-bytes".to_string());

    let mut builder = state
        .http
        .get(format!("{base_url}{route}"))
        .timeout(Duration::from_millis(timeout_ms))
        .header("x-correlation-id", correlation_id.clone())
        .header(
            "Accept",
            request
                .accept
                .as_deref()
                .unwrap_or("audio/*,video/*,application/octet-stream,*/*"),
        );

    let effective_passport =
        effective_header_or_default(&request_headers, "x-ron-passport", &default_passport);
    let effective_wallet =
        effective_header_or_default(&request_headers, "x-ron-wallet-account", &default_wallet);

    if let Some(passport) = effective_passport {
        builder = builder.header("x-ron-passport", passport);
    }

    if let Some(wallet) = effective_wallet {
        builder = builder.header("x-ron-wallet-account", wallet);
    }

    for (raw_name, raw_value) in request_headers {
        if should_skip_asset_bytes_header(&raw_name) {
            continue;
        }

        if let (Some(name), Some(value)) = (
            sanitize_header_name(&raw_name),
            sanitize_header_value(&raw_value),
        ) {
            builder = builder.header(name, value);
        }
    }

    let response = builder.send().await.map_err(|err| {
        format!(
            "asset byte gateway request failed: {}",
            redact_error(&err.to_string())
        )
    })?;

    let status = response.status().as_u16();
    let response_headers = response.headers().clone();

    if let Some(content_length) = response.content_length() {
        if content_length > max_bytes as u64 {
            return Err(format!(
                "asset byte response is too large for the MVP bridge: {} bytes > {} bytes",
                content_length, max_bytes
            ));
        }
    }

    let returned_correlation_id = response_headers
        .get("x-correlation-id")
        .and_then(|value| value.to_str().ok())
        .unwrap_or(correlation_id.as_str())
        .to_string();

    let response_content_type = response_headers
        .get("content-type")
        .and_then(|value| value.to_str().ok())
        .unwrap_or("")
        .to_string();

    let mut content_type = response_content_type.trim().to_string();
    let hint = request.content_type_hint.unwrap_or_default();

    if content_type.is_empty()
        || content_type.eq_ignore_ascii_case("application/octet-stream")
        || content_type
            .to_ascii_lowercase()
            .starts_with("application/octet-stream")
    {
        let clean_hint = hint.trim();

        if clean_hint.starts_with("audio/") || clean_hint.starts_with("video/") {
            content_type = clean_hint.to_string();
        }
    }

    if content_type.is_empty() {
        content_type = "application/octet-stream".to_string();
    }

    let body = response.bytes().await.map_err(|err| {
        format!(
            "asset byte gateway response read failed: {}",
            redact_error(&err.to_string())
        )
    })?;

    if body.len() > max_bytes {
        return Err(format!(
            "asset byte response is too large for the MVP bridge: {} bytes > {} bytes",
            body.len(),
            max_bytes
        ));
    }

    Ok(AssetBytesFetchResponse {
        schema: "crablink.tauri.asset-bytes-fetch-response.v1",
        method: "GET",
        route,
        status,
        ok: (200..300).contains(&status),
        correlation_id: returned_correlation_id,
        content_type,
        bytes: body.len(),
        body_bytes: body.to_vec(),
    })
}

#[tauri::command]
pub async fn upload_image_asset_gateway(
    state: State<'_, AppState>,
    request: PaidAssetUploadRequest,
) -> Result<PaidAssetUploadResponse, String> {
    upload_paid_asset_gateway(
        state,
        request,
        PaidAssetUploadSpec {
            asset_kind: "image",
            route: "/assets/image",
            schema: "crablink.tauri.image-asset-upload-response.v1",
            max_bytes: MAX_IMAGE_UPLOAD_BYTES,
            mime_prefix: "image/",
            default_content_type: "image/png",
            bridge_label: "image upload",
        },
    )
    .await
}

#[tauri::command]
pub async fn upload_video_asset_gateway(
    state: State<'_, AppState>,
    request: PaidAssetUploadRequest,
) -> Result<PaidAssetUploadResponse, String> {
    upload_paid_asset_gateway(
        state,
        request,
        PaidAssetUploadSpec {
            asset_kind: "video",
            route: "/assets/video",
            schema: "crablink.tauri.video-asset-upload-response.v1",
            max_bytes: MAX_VIDEO_UPLOAD_BYTES,
            mime_prefix: "video/",
            default_content_type: "video/mp4",
            bridge_label: "video upload",
        },
    )
    .await
}

#[tauri::command]
pub async fn upload_staged_video_asset_gateway(
    state: State<'_, AppState>,
    request: StagedPaidAssetUploadRequest,
) -> Result<PaidAssetUploadResponse, String> {
    upload_staged_paid_asset_gateway(
        state,
        request,
        PaidAssetUploadSpec {
            asset_kind: "video",
            route: "/assets/video",
            schema: "crablink.tauri.staged-video-asset-upload-response.v1",
            max_bytes: MAX_STAGED_VIDEO_UPLOAD_BYTES,
            mime_prefix: "video/",
            default_content_type: "video/mp4",
            bridge_label: "staged video stream upload",
        },
    )
    .await
}

#[tauri::command]
pub async fn upload_staged_image_asset_gateway(
    state: State<'_, AppState>,
    request: StagedPaidAssetUploadRequest,
) -> Result<PaidAssetUploadResponse, String> {
    upload_staged_paid_asset_gateway(
        state,
        request,
        PaidAssetUploadSpec {
            asset_kind: "image",
            route: "/assets/image",
            schema: "crablink.tauri.staged-image-asset-upload-response.v1",
            max_bytes: MAX_IMAGE_UPLOAD_BYTES,
            mime_prefix: "image/",
            default_content_type: "image/jpeg",
            bridge_label: "staged image upload",
        },
    )
    .await
}

#[tauri::command]
pub async fn upload_music_asset_gateway(
    state: State<'_, AppState>,
    request: PaidAssetUploadRequest,
) -> Result<PaidAssetUploadResponse, String> {
    upload_paid_asset_gateway(
        state,
        request,
        PaidAssetUploadSpec {
            asset_kind: "music",
            route: "/assets/music",
            schema: "crablink.tauri.music-asset-upload-response.v1",
            max_bytes: MAX_MUSIC_UPLOAD_BYTES,
            mime_prefix: "audio/",
            default_content_type: "audio/mpeg",
            bridge_label: "music upload",
        },
    )
    .await
}

#[tauri::command]
pub async fn upload_podcast_asset_gateway(
    state: State<'_, AppState>,
    request: PaidAssetUploadRequest,
) -> Result<PaidAssetUploadResponse, String> {
    upload_paid_asset_gateway(
        state,
        request,
        PaidAssetUploadSpec {
            asset_kind: "podcast",
            route: "/assets/podcast",
            schema: "crablink.tauri.podcast-asset-upload-response.v1",
            max_bytes: MAX_PODCAST_UPLOAD_BYTES,
            mime_prefix: "audio/",
            default_content_type: "audio/mpeg",
            bridge_label: "podcast upload",
        },
    )
    .await
}

#[derive(Clone, Copy)]
struct PaidAssetUploadSpec {
    asset_kind: &'static str,
    route: &'static str,
    schema: &'static str,
    max_bytes: usize,
    mime_prefix: &'static str,
    default_content_type: &'static str,
    bridge_label: &'static str,
}

async fn upload_staged_paid_asset_gateway(
    state: State<'_, AppState>,
    request: StagedPaidAssetUploadRequest,
    spec: PaidAssetUploadSpec,
) -> Result<PaidAssetUploadResponse, String> {
    let expected_kind = request
        .expected_asset_kind
        .as_deref()
        .unwrap_or(spec.asset_kind)
        .trim()
        .to_ascii_lowercase();

    if expected_kind != spec.asset_kind {
        return Err(format!(
            "{} expected asset kind '{}' but command uploads '{}'",
            spec.bridge_label, expected_kind, spec.asset_kind
        ));
    }

    let path = resolve_video_staged_handle_to_path(&request.staged_handle)?;
    let max_bytes = request
        .max_bytes
        .unwrap_or(spec.max_bytes)
        .min(spec.max_bytes);

    let metadata = std::fs::metadata(&path)
        .map_err(|_| format!("{} staged file is not available", spec.bridge_label))?;

    if !metadata.is_file() {
        return Err(format!(
            "{} staged handle does not point to a file",
            spec.bridge_label
        ));
    }

    if metadata.len() == 0 {
        return Err(format!("{} staged file is empty", spec.bridge_label));
    }

    if metadata.len() > max_bytes as u64 {
        return Err(format!(
            "{} staged file exceeds the {} MiB staged streaming limit",
            spec.bridge_label,
            max_bytes / (1024 * 1024)
        ));
    }

    let mut headers = request.headers.unwrap_or_default();
    let content_type = header_value(&headers, "Content-Type")
        .or_else(|| header_value(&headers, "content-type"))
        .or(request.content_type_hint)
        .unwrap_or_else(|| spec.default_content_type.to_string());

    if !content_type
        .to_ascii_lowercase()
        .starts_with(&spec.mime_prefix.to_ascii_lowercase())
    {
        return Err(format!(
            "{} Content-Type must be a {}* MIME type",
            spec.bridge_label, spec.mime_prefix
        ));
    }

    headers.insert("Content-Type".to_string(), content_type.clone());
    validate_required_paid_upload_headers(&headers, spec.asset_kind)?;

    let (base_url, timeout_ms, default_passport, default_wallet) = {
        let settings = state
            .settings
            .lock()
            .map_err(|_| "settings lock poisoned".to_string())?;

        (
            normalize_base_url(&settings.gateway_url),
            settings.request_timeout_ms.min(30_000),
            settings.passport_label.clone(),
            settings.wallet_account.clone(),
        )
    };

    let url = format!("{base_url}{}", spec.route);
    let correlation_id = header_value(&headers, "x-correlation-id")
        .unwrap_or_else(|| format!("crablink-tauri-{}-staged-upload", spec.asset_kind));
    let idempotency_key = header_value(&headers, "Idempotency-Key")
        .or_else(|| {
            request
                .idempotency_key
                .map(|value| value.trim().to_string())
        })
        .filter(|value| !value.is_empty())
        .ok_or_else(|| format!("{} requires an Idempotency-Key", spec.bridge_label))?;

    let effective_passport =
        effective_header_or_default(&headers, "x-ron-passport", &default_passport);
    let effective_wallet =
        effective_header_or_default(&headers, "x-ron-wallet-account", &default_wallet);

    let file = tokio::fs::File::open(&path)
        .await
        .map_err(|_| format!("{} staged file could not be opened", spec.bridge_label))?;
    let stream = ReaderStream::new(file);

    let mut builder = state
        .http
        .post(url)
        .timeout(Duration::from_millis(timeout_ms))
        .header("x-correlation-id", correlation_id.clone())
        .header("Idempotency-Key", idempotency_key)
        .header("Content-Type", content_type)
        .header(CONTENT_LENGTH, metadata.len().to_string())
        .body(reqwest::Body::wrap_stream(stream));

    if let Some(passport) = effective_passport {
        builder = builder.header("x-ron-passport", passport);
    }

    if let Some(wallet) = effective_wallet {
        builder = builder.header("x-ron-wallet-account", wallet);
    }

    for (raw_name, raw_value) in headers {
        if should_skip_managed_header(&raw_name) {
            continue;
        }

        if let (Some(name), Some(value)) = (
            sanitize_header_name(&raw_name),
            sanitize_header_value(&raw_value),
        ) {
            builder = builder.header(name, value);
        }
    }

    let response = builder.send().await.map_err(|err| {
        format!(
            "{} gateway stream request failed: {}",
            spec.bridge_label,
            redact_error(&err.to_string())
        )
    })?;

    let status = response.status().as_u16();
    let content_type = response
        .headers()
        .get("content-type")
        .and_then(|value| value.to_str().ok())
        .unwrap_or("")
        .to_string();

    let returned_correlation_id = response
        .headers()
        .get("x-correlation-id")
        .and_then(|value| value.to_str().ok())
        .unwrap_or(correlation_id.as_str())
        .to_string();

    let body_text = response
        .text()
        .await
        .map_err(|err| {
            format!(
                "{} gateway response read failed: {}",
                spec.bridge_label, err
            )
        })
        .and_then(response_text_with_limit)?;

    Ok(PaidAssetUploadResponse {
        schema: spec.schema,
        method: "POST",
        route: spec.route,
        status,
        ok: (200..300).contains(&status),
        correlation_id: returned_correlation_id,
        content_type,
        data: parse_response_body(&body_text),
    })
}

async fn upload_paid_asset_gateway(
    state: State<'_, AppState>,
    request: PaidAssetUploadRequest,
    spec: PaidAssetUploadSpec,
) -> Result<PaidAssetUploadResponse, String> {
    if request.body_bytes.is_empty() {
        return Err(format!(
            "{} requires non-empty {} bytes",
            spec.bridge_label, spec.asset_kind
        ));
    }

    if request.body_bytes.len() > spec.max_bytes {
        return Err(format!(
            "{} exceeds the {} MiB MVP command bridge limit",
            spec.bridge_label,
            spec.max_bytes / (1024 * 1024)
        ));
    }

    let request_headers = request.headers.unwrap_or_default();
    validate_required_paid_upload_headers(&request_headers, spec.asset_kind)?;

    let (base_url, timeout_ms, default_passport, default_wallet) = {
        let settings = state
            .settings
            .lock()
            .map_err(|_| "settings lock poisoned".to_string())?;

        (
            normalize_base_url(&settings.gateway_url),
            settings.request_timeout_ms.min(30_000),
            settings.passport_label.clone(),
            settings.wallet_account.clone(),
        )
    };

    let url = format!("{base_url}{}", spec.route);
    let correlation_id = header_value(&request_headers, "x-correlation-id")
        .unwrap_or_else(|| format!("crablink-tauri-{}-upload", spec.asset_kind));
    let idempotency_key = header_value(&request_headers, "Idempotency-Key")
        .or_else(|| {
            request
                .idempotency_key
                .map(|value| value.trim().to_string())
        })
        .filter(|value| !value.is_empty())
        .ok_or_else(|| format!("{} requires an Idempotency-Key", spec.bridge_label))?;

    let content_type = header_value(&request_headers, "Content-Type")
        .or_else(|| header_value(&request_headers, "content-type"))
        .unwrap_or_else(|| spec.default_content_type.to_string());

    if !content_type
        .to_ascii_lowercase()
        .starts_with(&spec.mime_prefix.to_ascii_lowercase())
    {
        return Err(format!(
            "{} Content-Type must be a {}* MIME type",
            spec.bridge_label, spec.mime_prefix
        ));
    }

    let effective_passport =
        effective_header_or_default(&request_headers, "x-ron-passport", &default_passport);
    let effective_wallet =
        effective_header_or_default(&request_headers, "x-ron-wallet-account", &default_wallet);

    let mut builder = state
        .http
        .post(url)
        .timeout(Duration::from_millis(timeout_ms))
        .header("x-correlation-id", correlation_id.clone())
        .header("Idempotency-Key", idempotency_key)
        .header("Content-Type", content_type)
        .body(request.body_bytes);

    if let Some(passport) = effective_passport {
        builder = builder.header("x-ron-passport", passport);
    }

    if let Some(wallet) = effective_wallet {
        builder = builder.header("x-ron-wallet-account", wallet);
    }

    for (raw_name, raw_value) in request_headers {
        if should_skip_managed_header(&raw_name) {
            continue;
        }

        if let (Some(name), Some(value)) = (
            sanitize_header_name(&raw_name),
            sanitize_header_value(&raw_value),
        ) {
            builder = builder.header(name, value);
        }
    }

    let response = builder.send().await.map_err(|err| {
        format!(
            "{} gateway request failed: {}",
            spec.bridge_label,
            redact_error(&err.to_string())
        )
    })?;

    let status = response.status().as_u16();
    let content_type = response
        .headers()
        .get("content-type")
        .and_then(|value| value.to_str().ok())
        .unwrap_or("")
        .to_string();

    let returned_correlation_id = response
        .headers()
        .get("x-correlation-id")
        .and_then(|value| value.to_str().ok())
        .unwrap_or(correlation_id.as_str())
        .to_string();

    let body_text = response
        .text()
        .await
        .map_err(|err| {
            format!(
                "{} gateway response read failed: {}",
                spec.bridge_label, err
            )
        })
        .and_then(response_text_with_limit)?;

    Ok(PaidAssetUploadResponse {
        schema: spec.schema,
        method: "POST",
        route: spec.route,
        status,
        ok: (200..300).contains(&status),
        correlation_id: returned_correlation_id,
        content_type,
        data: parse_response_body(&body_text),
    })
}

fn hash_file_blake3(path: PathBuf) -> Result<String, String> {
    let mut file = std::fs::File::open(path)
        .map_err(|_| "staged hash file could not be opened".to_string())?;
    let mut hasher = blake3::Hasher::new();
    let mut buffer = [0_u8; 64 * 1024];

    loop {
        let read = file
            .read(&mut buffer)
            .map_err(|_| "staged hash file could not be read".to_string())?;

        if read == 0 {
            break;
        }

        hasher.update(&buffer[..read]);
    }

    Ok(hasher.finalize().to_hex().to_string())
}

fn normalize_staged_asset_kind(value: Option<&str>) -> String {
    match value
        .unwrap_or("video")
        .trim()
        .to_ascii_lowercase()
        .as_str()
    {
        "image" => "image".to_string(),
        _ => "video".to_string(),
    }
}

fn redact_staged_handle(value: &str) -> String {
    let raw = value.trim();

    if raw.len() <= 56 {
        return raw.to_string();
    }

    format!("{}…{}", &raw[..48], &raw[raw.len().saturating_sub(8)..])
}

fn resolve_video_staged_handle_to_path(staged_handle: &str) -> Result<PathBuf, String> {
    let raw = staged_handle.trim();

    if !raw.starts_with(STAGED_VIDEO_PREFIX) {
        return Err("staged upload only accepts staged://video-job/... handles".to_string());
    }

    let rest = raw
        .strip_prefix(STAGED_VIDEO_PREFIX)
        .ok_or_else(|| "invalid staged video handle".to_string())?;

    let (job_id, file_name) = rest
        .split_once('/')
        .ok_or_else(|| "staged video handle must include job id and file name".to_string())?;

    let safe_job = safe_path_segment(job_id, "job id")?;
    let safe_file = safe_file_name(file_name)?;

    let mut path = std::env::temp_dir();
    path.push("crablink-video-jobs");
    path.push(safe_job);
    path.push(safe_file);

    validate_staged_path(&path)?;
    Ok(path)
}

fn safe_path_segment(value: &str, label: &str) -> Result<String, String> {
    let clean = value.trim();

    if clean.is_empty() {
        return Err(format!("staged handle {label} is empty"));
    }

    if clean.len() > 160 {
        return Err(format!("staged handle {label} is too long"));
    }

    if !clean
        .chars()
        .all(|ch| ch.is_ascii_alphanumeric() || ch == '_' || ch == '-')
    {
        return Err(format!(
            "staged handle {label} contains unsupported characters"
        ));
    }

    Ok(clean.to_string())
}

fn safe_file_name(value: &str) -> Result<String, String> {
    let clean = value.trim();

    if clean.is_empty() {
        return Err("staged handle file name is empty".to_string());
    }

    if clean.len() > 180 {
        return Err("staged handle file name is too long".to_string());
    }

    if clean.contains('/') || clean.contains('\\') || clean.contains("..") {
        return Err("staged handle file name must not contain path traversal".to_string());
    }

    if !clean
        .chars()
        .all(|ch| ch.is_ascii_alphanumeric() || ch == '_' || ch == '-' || ch == '.')
    {
        return Err("staged handle file name contains unsupported characters".to_string());
    }

    let lower = clean.to_ascii_lowercase();

    if !lower.ends_with(".mp4") && !lower.ends_with(".jpg") && !lower.ends_with(".jpeg") {
        return Err("staged handle file extension must be .mp4, .jpg, or .jpeg".to_string());
    }

    Ok(clean.to_string())
}

fn validate_staged_path(path: &Path) -> Result<(), String> {
    if path.components().count() > 96 {
        return Err("staged upload path is too deeply nested".to_string());
    }

    Ok(())
}

fn validate_required_paid_upload_headers(
    headers: &HashMap<String, String>,
    asset_kind: &str,
) -> Result<(), String> {
    let required = [
        "x-ron-paid-op",
        "x-ron-paid-asset",
        "x-ron-paid-estimate-minor",
        "x-ron-wallet-txid",
        "x-ron-wallet-receipt-hash",
        "x-ron-wallet-from",
        "x-ron-wallet-to",
    ];

    for name in required {
        if header_value(headers, name).is_none() {
            return Err(format!(
                "{asset_kind} upload requires paid proof header {name}"
            ));
        }
    }

    Ok(())
}

fn normalize_asset_bytes_route(value: &str) -> Result<String, String> {
    let raw = value.trim();

    if raw.is_empty() {
        return Err("asset byte fetch requires a gateway object route".to_string());
    }

    if raw.starts_with("http://") || raw.starts_with("https://") {
        return Err(
            "asset byte fetch route must be a gateway path, not an absolute URL".to_string(),
        );
    }

    let path = raw.split('?').next().unwrap_or(raw).trim();

    if let Some(hash) = path.strip_prefix("/o/b3:") {
        let clean = hash.to_ascii_lowercase();

        if is_hex_64(&clean) {
            return Ok(format!("/o/b3:{clean}"));
        }
    }

    if let Some(hash) = path.strip_prefix("/o/") {
        let clean = hash.to_ascii_lowercase();

        if is_hex_64(&clean) {
            return Ok(format!("/o/b3:{clean}"));
        }
    }

    Err("asset byte fetch only allows /o/b3:<64 lowercase hex>".to_string())
}

fn is_hex_64(value: &str) -> bool {
    value.len() == 64 && value.bytes().all(|byte| byte.is_ascii_hexdigit())
}

fn should_skip_asset_bytes_header(name: &str) -> bool {
    matches!(
        name.trim().to_ascii_lowercase().as_str(),
        "host"
            | "connection"
            | "content-length"
            | "transfer-encoding"
            | "upgrade"
            | "proxy-authorization"
            | "proxy-authenticate"
            | "accept"
            | "x-correlation-id"
            | "x-ron-passport"
            | "x-ron-wallet-account"
    )
}

fn normalize_base_url(value: &str) -> String {
    value.trim().trim_end_matches('/').to_string()
}

fn should_skip_managed_header(name: &str) -> bool {
    matches!(
        name.trim().to_ascii_lowercase().as_str(),
        "host"
            | "connection"
            | "content-length"
            | "transfer-encoding"
            | "upgrade"
            | "proxy-authorization"
            | "proxy-authenticate"
            | "x-correlation-id"
            | "idempotency-key"
            | "content-type"
            | "x-ron-passport"
            | "x-ron-wallet-account"
    )
}

fn effective_header_or_default(
    request_headers: &HashMap<String, String>,
    name: &str,
    default_value: &str,
) -> Option<String> {
    header_value(request_headers, name).or_else(|| {
        let clean = default_value.trim();

        if clean.is_empty() {
            None
        } else {
            Some(clean.to_string())
        }
    })
}

fn header_value(headers: &HashMap<String, String>, name: &str) -> Option<String> {
    headers
        .iter()
        .find(|(key, _)| key.eq_ignore_ascii_case(name))
        .map(|(_, value)| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

fn sanitize_header_name(value: &str) -> Option<HeaderName> {
    let clean = value.trim();

    if clean.is_empty() {
        return None;
    }

    HeaderName::from_bytes(clean.as_bytes()).ok()
}

fn sanitize_header_value(value: &str) -> Option<HeaderValue> {
    let clean = value
        .replace("\r\n", " ")
        .replace(['\r', '\n'], " ")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ");

    if clean.is_empty() {
        return None;
    }

    HeaderValue::from_str(&clean).ok()
}

fn parse_response_body(text: &str) -> Value {
    let clean = text.trim();

    if clean.is_empty() {
        return Value::Null;
    }

    serde_json::from_str(clean).unwrap_or_else(|_| Value::String(clean.to_string()))
}

fn response_text_with_limit(text: String) -> Result<String, String> {
    if text.len() > MAX_RESPONSE_TEXT_BYTES {
        return Err("asset upload gateway response was too large for command bridge".to_string());
    }

    Ok(text)
}

fn redact_error(value: &str) -> String {
    value
        .replace("Bearer ", "Bearer [redacted] ")
        .chars()
        .take(300)
        .collect()
}
