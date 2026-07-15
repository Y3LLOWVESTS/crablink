//! RO:WHAT — Bounded native OAP/1 object retrieval for CrabLink.
//! RO:WHY — Phase 22D requires the Tauri Rust boundary to fetch Service Node bytes and verify the full BLAKE3 digest before admission.
//! RO:INTERACTS — macronode embedded svc-storage `/oap/obj-get`, AppState HTTP client, Phase 22 live smoke.
//! RO:INVARIANTS — local loopback only; frame <= 1 MiB; chunk <= 64 KiB; object <= 4 MiB; exact canonical b3 digest.
//! RO:SECURITY — React never handles OAP wire bytes; malformed, truncated, oversized, cross-stream, and corrupt responses fail closed.
//! RO:TEST — focused unit tests below and `tests/phase22_live_oap_object.rs`.

#![forbid(unsafe_code)]

use crate::state::AppState;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
    net::IpAddr,
    sync::atomic::{AtomicU64, Ordering},
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tauri::State;

const OAP_VERSION: u16 = 1;
const OAP_HEADER_WIRE_SIZE: usize = 38;
const MAX_OAP_FRAME_BYTES: usize = 1024 * 1024;
const MAX_OAP_CHUNK_BYTES: usize = 64 * 1024;
const MAX_OAP_OBJECT_BYTES: usize = 4 * 1024 * 1024;
const MAX_ERROR_BODY_BYTES: usize = 64 * 1024;
const OBJ_GET_APP_PROTO_ID: u16 = 0x0101;

const FLAG_REQ: u16 = 1 << 0;
const FLAG_RESP: u16 = 1 << 1;
const FLAG_EVENT: u16 = 1 << 2;
const FLAG_START: u16 = 1 << 3;
const FLAG_END: u16 = 1 << 4;
const FLAG_ACK_REQ: u16 = 1 << 5;
const FLAG_COMP: u16 = 1 << 6;
const FLAG_APP_E2E: u16 = 1 << 7;

const KNOWN_FLAGS: u16 = FLAG_REQ
    | FLAG_RESP
    | FLAG_EVENT
    | FLAG_START
    | FLAG_END
    | FLAG_ACK_REQ
    | FLAG_COMP
    | FLAG_APP_E2E;

static NEXT_CORRELATION_ID: AtomicU64 = AtomicU64::new(1);

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ServiceNodeOapObjectFetchRequest {
    pub enabled: bool,
    pub connection_mode: String,
    pub storage_base_url: String,
    pub object: String,

    #[serde(default)]
    pub max_bytes: Option<usize>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServiceNodeOapObjectFetchResult {
    pub schema: &'static str,
    pub protocol: &'static str,
    pub route: &'static str,
    pub object: String,
    pub bytes: usize,
    pub body_bytes: Vec<u8>,
    pub calculated_cid: String,
    pub full_digest_verified: bool,
    pub frame_limit_bytes: usize,
    pub chunk_limit_bytes: usize,
    pub object_limit_bytes: usize,
    pub policy_mutation: bool,
    pub persistence_mutation: bool,
    pub provider_mutation: bool,
    pub reward_finality: bool,
    pub wallet_mutation: bool,
    pub ledger_mutation: bool,
    pub confirmed_roc: Option<u64>,
}

#[derive(Debug, Serialize)]
struct ObjGetRequest<'a> {
    obj: &'a str,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct ObjStreamStart {
    obj: String,
    total_bytes: u64,
    chunk_bytes: u32,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct ObjData {
    obj: String,
    seq: u64,
    bytes: Vec<u8>,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct ObjEnd {
    seq_end: u64,
    ok: bool,

    #[serde(default)]
    error: Option<Value>,
}

#[derive(Debug)]
struct ParsedFrame<'a> {
    flags: u16,
    code: u16,
    app_proto_id: u16,
    tenant_id: u128,
    corr_id: u64,
    cap: &'a [u8],
    payload: &'a [u8],
}

#[tauri::command]
pub async fn service_node_oap_object_fetch(
    state: State<'_, AppState>,
    request: ServiceNodeOapObjectFetchRequest,
) -> Result<ServiceNodeOapObjectFetchResult, String> {
    let timeout_ms = {
        let settings = state
            .settings
            .lock()
            .map_err(|_| "settings lock poisoned".to_string())?;

        settings.request_timeout_ms
    };

    fetch_service_node_oap_object(state.http.clone(), timeout_ms, request).await
}

/// Execute the production OAP object command without a Tauri runtime.
///
/// Phase 22 uses this helper against an independently running Service
/// Node. It performs no storage, policy, provider, reward, wallet, or
/// ledger mutation.
pub async fn fetch_service_node_oap_object(
    client: reqwest::Client,
    timeout_ms: u64,
    request: ServiceNodeOapObjectFetchRequest,
) -> Result<ServiceNodeOapObjectFetchResult, String> {
    if !request.enabled {
        return Err("OAP object fetch requires explicit enablement".to_string());
    }

    if request.connection_mode.trim() != "local" {
        return Err("OAP object fetch currently requires \
             connectionMode=local"
            .to_string());
    }

    let base_url = normalize_local_storage_base_url(&request.storage_base_url)?;

    let object = normalize_b3_object(&request.object)?;

    let max_bytes = normalize_max_bytes(request.max_bytes)?;

    let tenant_id = 0_u128;
    let corr_id = next_correlation_id();

    let request_wire = build_oap_obj_get_request_wire(&object, tenant_id, corr_id)?;

    let response = client
        .post(format!("{base_url}/oap/obj-get"))
        .timeout(Duration::from_millis(timeout_ms.clamp(1, 30_000)))
        .header("content-type", "application/oap")
        .header("accept", "application/oap")
        .body(request_wire)
        .send()
        .await
        .map_err(|error| format!("OAP OBJ_GET request failed: {error}"))?;

    let status = response.status();

    let content_type = response
        .headers()
        .get("content-type")
        .and_then(|value| value.to_str().ok())
        .unwrap_or("")
        .to_ascii_lowercase();

    if !status.is_success() {
        let error_body = read_response_bytes(response, MAX_ERROR_BODY_BYTES).await?;

        return Err(format!(
            "OAP OBJ_GET returned HTTP {}: {}",
            status.as_u16(),
            String::from_utf8_lossy(&error_body),
        ));
    }

    if !content_type.starts_with("application/oap") {
        return Err("OAP OBJ_GET response Content-Type \
             must be application/oap"
            .to_string());
    }

    let max_wire_bytes = max_wire_bytes(max_bytes)?;

    let wire = read_response_bytes(response, max_wire_bytes).await?;

    let body_bytes = verify_oap_object_stream(&object, tenant_id, corr_id, &wire, max_bytes)?;

    let calculated_cid = format!("b3:{}", blake3::hash(&body_bytes).to_hex(),);

    Ok(ServiceNodeOapObjectFetchResult {
        schema: "crablink.tauri.service-node-oap-object-fetch.v1",
        protocol: "oap/1",
        route: "/oap/obj-get",
        object,
        bytes: body_bytes.len(),
        body_bytes,
        calculated_cid,
        full_digest_verified: true,
        frame_limit_bytes: MAX_OAP_FRAME_BYTES,
        chunk_limit_bytes: MAX_OAP_CHUNK_BYTES,
        object_limit_bytes: max_bytes,
        policy_mutation: false,
        persistence_mutation: false,
        provider_mutation: false,
        reward_finality: false,
        wallet_mutation: false,
        ledger_mutation: false,
        confirmed_roc: None,
    })
}

/// Build one canonical OAP/1 `REQ|START|END`
/// OBJ_GET frame.
pub fn build_oap_obj_get_request_wire(
    object: &str,
    tenant_id: u128,
    corr_id: u64,
) -> Result<Vec<u8>, String> {
    let object = normalize_b3_object(object)?;

    let payload = serde_json::to_vec(&ObjGetRequest { obj: &object }).map_err(|error| {
        format!(
            "failed to encode OBJ_GET request: \
             {error}"
        )
    })?;

    encode_frame(
        FLAG_REQ | FLAG_START | FLAG_END,
        0,
        tenant_id,
        corr_id,
        &payload,
    )
}

/// Verify a complete OAP object response stream and
/// return only authenticated bytes.
pub fn verify_oap_object_stream(
    expected_object: &str,
    expected_tenant_id: u128,
    expected_corr_id: u64,
    wire: &[u8],
    max_bytes: usize,
) -> Result<Vec<u8>, String> {
    let expected_object = normalize_b3_object(expected_object)?;

    let max_bytes = normalize_max_bytes(Some(max_bytes))?;

    let max_wire_bytes = max_wire_bytes(max_bytes)?;

    if wire.is_empty() {
        return Err("OAP response stream is empty".to_string());
    }

    if wire.len() > max_wire_bytes {
        return Err(format!(
            "OAP response stream exceeds bounded \
             wire limit: {} > {max_wire_bytes}",
            wire.len(),
        ));
    }

    let frames = decode_frames(wire)?;

    if frames.len() < 2 {
        return Err("OAP response requires START and END frames".to_string());
    }

    let start_frame = &frames[0];

    validate_start_frame(start_frame, expected_tenant_id, expected_corr_id)?;

    let start: ObjStreamStart = decode_json_payload(start_frame, "START")?;

    let start_object = normalize_b3_object(&start.obj)?;

    if start_object != expected_object {
        return Err("OAP START object does not match the \
             requested object"
            .to_string());
    }

    let chunk_bytes = usize::try_from(start.chunk_bytes).map_err(|_| {
        "OAP START chunk size does not fit this \
         platform"
            .to_string()
    })?;

    if chunk_bytes == 0 || chunk_bytes > MAX_OAP_CHUNK_BYTES {
        return Err(format!(
            "OAP START chunk size is outside \
             1..={MAX_OAP_CHUNK_BYTES}: \
             {chunk_bytes}",
        ));
    }

    let total_bytes = usize::try_from(start.total_bytes).map_err(|_| {
        "OAP START object length does not fit \
         this platform"
            .to_string()
    })?;

    if total_bytes > max_bytes {
        return Err(format!(
            "OAP object exceeds requested object \
             limit: {total_bytes} > {max_bytes}",
        ));
    }

    let mut reconstructed = Vec::with_capacity(total_bytes);

    let mut expected_seq = 0_u64;

    for frame in &frames[1..frames.len() - 1] {
        validate_data_frame(frame, expected_tenant_id, expected_corr_id)?;

        let data: ObjData = decode_json_payload(frame, "DATA")?;

        let data_object = normalize_b3_object(&data.obj)?;

        if data_object != expected_object {
            return Err("OAP DATA object does not match \
                 the requested object"
                .to_string());
        }

        if data.seq != expected_seq {
            return Err(format!(
                "OAP DATA sequence is not \
                 contiguous: expected \
                 {expected_seq}, got {}",
                data.seq,
            ));
        }

        if data.bytes.len() > chunk_bytes || data.bytes.len() > MAX_OAP_CHUNK_BYTES {
            return Err(format!(
                "OAP DATA chunk exceeds announced \
                 or canonical limit: {} bytes",
                data.bytes.len(),
            ));
        }

        let next_len = reconstructed
            .len()
            .checked_add(data.bytes.len())
            .ok_or_else(|| {
                "OAP reconstructed object length \
                 overflow"
                    .to_string()
            })?;

        if next_len > total_bytes || next_len > max_bytes {
            return Err("OAP DATA exceeds the announced \
                 object length"
                .to_string());
        }

        reconstructed.extend_from_slice(&data.bytes);

        expected_seq = expected_seq
            .checked_add(1)
            .ok_or_else(|| "OAP DATA sequence overflow".to_string())?;
    }

    let end_frame = frames
        .last()
        .ok_or_else(|| "OAP response END frame is missing".to_string())?;

    validate_end_frame(end_frame, expected_tenant_id, expected_corr_id)?;

    let end: ObjEnd = decode_json_payload(end_frame, "END")?;

    if !end.ok || end.error.is_some() {
        return Err("OAP END reported an unsuccessful \
             object stream"
            .to_string());
    }

    if end.seq_end != expected_seq {
        return Err(format!(
            "OAP END sequence does not match \
             DATA count: expected \
             {expected_seq}, got {}",
            end.seq_end,
        ));
    }

    if reconstructed.len() != total_bytes {
        return Err(format!(
            "OAP reconstructed length does not \
             match START: {} != \
             {total_bytes}",
            reconstructed.len(),
        ));
    }

    let actual = format!("b3:{}", blake3::hash(&reconstructed).to_hex(),);

    if actual != expected_object {
        return Err(format!(
            "OAP full BLAKE3 digest mismatch: \
             expected {expected_object}, \
             got {actual}",
        ));
    }

    Ok(reconstructed)
}

fn normalize_max_bytes(requested: Option<usize>) -> Result<usize, String> {
    let max_bytes = requested.unwrap_or(MAX_OAP_OBJECT_BYTES);

    if max_bytes == 0 || max_bytes > MAX_OAP_OBJECT_BYTES {
        return Err(format!(
            "OAP object maxBytes must be within \
             1..={MAX_OAP_OBJECT_BYTES}",
        ));
    }

    Ok(max_bytes)
}

fn max_wire_bytes(max_bytes: usize) -> Result<usize, String> {
    max_bytes
        .checked_mul(5)
        .and_then(|value| value.checked_add(2 * MAX_OAP_FRAME_BYTES))
        .ok_or_else(|| "OAP wire limit overflow".to_string())
}

async fn read_response_bytes(
    mut response: reqwest::Response,
    max_bytes: usize,
) -> Result<Vec<u8>, String> {
    let mut bytes = Vec::new();

    while let Some(chunk) = response.chunk().await.map_err(|error| {
        format!(
            "OAP response read failed: \
                 {error}"
        )
    })? {
        let next_len = bytes
            .len()
            .checked_add(chunk.len())
            .ok_or_else(|| "OAP response length overflow".to_string())?;

        if next_len > max_bytes {
            return Err(format!(
                "OAP response exceeded bounded \
                 read limit: {next_len} > \
                 {max_bytes}",
            ));
        }

        bytes.extend_from_slice(&chunk);
    }

    Ok(bytes)
}

fn normalize_local_storage_base_url(raw: &str) -> Result<String, String> {
    let clean = raw.trim().trim_end_matches('/');

    let parsed = reqwest::Url::parse(clean)
        .map_err(|_| "OAP storageBaseUrl must be a valid URL".to_string())?;

    if parsed.scheme() != "http" {
        return Err("local OAP storageBaseUrl must use \
             http://"
            .to_string());
    }

    if !parsed.username().is_empty() || parsed.password().is_some() {
        return Err("local OAP storageBaseUrl must not \
             include credentials"
            .to_string());
    }

    if parsed.query().is_some() || parsed.fragment().is_some() {
        return Err("local OAP storageBaseUrl must not \
             include query or fragment data"
            .to_string());
    }

    if parsed.path() != "/" && !parsed.path().is_empty() {
        return Err("local OAP storageBaseUrl must not \
             include a route path"
            .to_string());
    }

    let host = parsed.host_str().ok_or_else(|| {
        "local OAP storageBaseUrl is missing \
             a host"
            .to_string()
    })?;

    if !is_loopback_host(host) {
        return Err("local OAP storageBaseUrl must remain loopback-only".to_string());
    }

    if parsed.port().is_none() {
        return Err("local OAP storageBaseUrl must include \
             an explicit port"
            .to_string());
    }

    Ok(clean.to_string())
}

fn is_loopback_host(host: &str) -> bool {
    if host.eq_ignore_ascii_case("localhost") {
        return true;
    }

    host.parse::<IpAddr>()
        .map(|address| address.is_loopback())
        .unwrap_or(false)
}

fn normalize_b3_object(raw: &str) -> Result<String, String> {
    let clean = raw.trim();

    let digest = clean.strip_prefix("b3:").ok_or_else(|| {
        "OAP object must use canonical \
             b3:<64 lowercase hex> form"
            .to_string()
    })?;

    if digest.len() != 64
        || !digest
            .bytes()
            .all(|byte| byte.is_ascii_digit() || matches!(byte, b'a'..=b'f'))
    {
        return Err("OAP object must use canonical \
             b3:<64 lowercase hex> form"
            .to_string());
    }

    Ok(format!("b3:{digest}"))
}

fn next_correlation_id() -> u64 {
    let time_component = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_nanos() as u64)
        .unwrap_or(0);

    time_component
        ^ NEXT_CORRELATION_ID.fetch_add(1, Ordering::Relaxed)
        ^ u64::from(std::process::id())
}

fn encode_frame(
    flags: u16,
    code: u16,
    tenant_id: u128,
    corr_id: u64,
    payload: &[u8],
) -> Result<Vec<u8>, String> {
    let frame_len = OAP_HEADER_WIRE_SIZE
        .checked_add(payload.len())
        .ok_or_else(|| "OAP request frame length overflow".to_string())?;

    if frame_len > MAX_OAP_FRAME_BYTES {
        return Err(format!(
            "OAP request frame exceeds \
             {MAX_OAP_FRAME_BYTES} bytes",
        ));
    }

    let frame_len = u32::try_from(frame_len)
        .map_err(|_| "OAP request frame length does not fit u32".to_string())?;

    let mut wire = Vec::with_capacity(frame_len as usize);

    wire.extend_from_slice(&frame_len.to_be_bytes());

    wire.extend_from_slice(&OAP_VERSION.to_be_bytes());

    wire.extend_from_slice(&flags.to_be_bytes());

    wire.extend_from_slice(&code.to_be_bytes());

    wire.extend_from_slice(&OBJ_GET_APP_PROTO_ID.to_be_bytes());

    wire.extend_from_slice(&tenant_id.to_be_bytes());

    wire.extend_from_slice(&0_u16.to_be_bytes());

    wire.extend_from_slice(&corr_id.to_be_bytes());

    wire.extend_from_slice(payload);

    Ok(wire)
}

fn decode_frames(wire: &[u8]) -> Result<Vec<ParsedFrame<'_>>, String> {
    let mut frames = Vec::new();
    let mut offset = 0_usize;

    while offset < wire.len() {
        let remaining = &wire[offset..];

        if remaining.len() < OAP_HEADER_WIRE_SIZE {
            return Err("OAP wire stream ended with a \
                 truncated header"
                .to_string());
        }

        let declared_len = read_u32(&remaining[0..4])? as usize;

        if !(OAP_HEADER_WIRE_SIZE..=MAX_OAP_FRAME_BYTES).contains(&declared_len) {
            return Err(format!(
                "OAP frame length is outside \
                 {OAP_HEADER_WIRE_SIZE}..=\
                 {MAX_OAP_FRAME_BYTES}: \
                 {declared_len}",
            ));
        }

        let frame_end = offset
            .checked_add(declared_len)
            .ok_or_else(|| "OAP frame offset overflow".to_string())?;

        if frame_end > wire.len() {
            return Err("OAP wire stream ended with an \
                 incomplete frame"
                .to_string());
        }

        let frame = &wire[offset..frame_end];

        let version = read_u16(&frame[4..6])?;

        if version != OAP_VERSION {
            return Err(format!(
                "unsupported OAP version: \
                 {version}",
            ));
        }

        let flags = read_u16(&frame[6..8])?;

        if flags & !KNOWN_FLAGS != 0 {
            return Err(format!(
                "OAP frame contains unknown \
                 flags: 0x{flags:04x}",
            ));
        }

        let code = read_u16(&frame[8..10])?;

        let app_proto_id = read_u16(&frame[10..12])?;

        let tenant_id = read_u128(&frame[12..28])?;

        let cap_len = read_u16(&frame[28..30])? as usize;

        let corr_id = read_u64(&frame[30..38])?;

        if cap_len > 0 && flags & FLAG_START == 0 {
            return Err("OAP capability bytes are only \
                 valid on START frames"
                .to_string());
        }

        let payload_start = OAP_HEADER_WIRE_SIZE
            .checked_add(cap_len)
            .ok_or_else(|| "OAP capability length overflow".to_string())?;

        if payload_start > frame.len() {
            return Err("OAP capability length exceeds \
                 frame length"
                .to_string());
        }

        frames.push(ParsedFrame {
            flags,
            code,
            app_proto_id,
            tenant_id,
            corr_id,
            cap: &frame[OAP_HEADER_WIRE_SIZE..payload_start],
            payload: &frame[payload_start..],
        });

        offset = frame_end;
    }

    Ok(frames)
}

fn validate_start_frame(
    frame: &ParsedFrame<'_>,
    tenant_id: u128,
    corr_id: u64,
) -> Result<(), String> {
    let required = FLAG_RESP | FLAG_START;

    let forbidden = FLAG_REQ | FLAG_EVENT | FLAG_END | FLAG_COMP | FLAG_APP_E2E;

    validate_response_frame(frame, required, forbidden, 200, tenant_id, corr_id, "START")
}

fn validate_data_frame(
    frame: &ParsedFrame<'_>,
    tenant_id: u128,
    corr_id: u64,
) -> Result<(), String> {
    let required = FLAG_RESP;

    let forbidden = FLAG_REQ | FLAG_EVENT | FLAG_START | FLAG_END | FLAG_COMP | FLAG_APP_E2E;

    validate_response_frame(frame, required, forbidden, 206, tenant_id, corr_id, "DATA")
}

fn validate_end_frame(
    frame: &ParsedFrame<'_>,
    tenant_id: u128,
    corr_id: u64,
) -> Result<(), String> {
    let required = FLAG_RESP | FLAG_END;

    let forbidden = FLAG_REQ | FLAG_EVENT | FLAG_START | FLAG_COMP | FLAG_APP_E2E;

    validate_response_frame(frame, required, forbidden, 200, tenant_id, corr_id, "END")
}

fn validate_response_frame(
    frame: &ParsedFrame<'_>,
    required_flags: u16,
    forbidden_flags: u16,
    expected_code: u16,
    tenant_id: u128,
    corr_id: u64,
    label: &str,
) -> Result<(), String> {
    if frame.flags & required_flags != required_flags || frame.flags & forbidden_flags != 0 {
        return Err(format!("OAP {label} response flags are invalid",));
    }

    if frame.app_proto_id != OBJ_GET_APP_PROTO_ID {
        return Err(format!(
            "OAP {label} used an unexpected \
             app protocol ID",
        ));
    }

    if frame.code != expected_code {
        return Err(format!(
            "OAP {label} status must be \
             {expected_code}, got {}",
            frame.code,
        ));
    }

    if frame.tenant_id != tenant_id || frame.corr_id != corr_id {
        return Err(format!(
            "OAP {label} changed tenant or \
             correlation identity",
        ));
    }

    if !frame.cap.is_empty() {
        return Err(format!(
            "OAP {label} response must not carry \
             capability bytes",
        ));
    }

    if frame.payload.is_empty() {
        return Err(format!("OAP {label} response payload is required",));
    }

    Ok(())
}

fn decode_json_payload<T: for<'de> Deserialize<'de>>(
    frame: &ParsedFrame<'_>,
    label: &str,
) -> Result<T, String> {
    serde_json::from_slice(frame.payload).map_err(|error| {
        format!(
            "OAP {label} payload is invalid JSON: \
             {error}",
        )
    })
}

fn read_u16(bytes: &[u8]) -> Result<u16, String> {
    let bytes: [u8; 2] = bytes
        .try_into()
        .map_err(|_| "OAP u16 field was truncated".to_string())?;

    Ok(u16::from_be_bytes(bytes))
}

fn read_u32(bytes: &[u8]) -> Result<u32, String> {
    let bytes: [u8; 4] = bytes
        .try_into()
        .map_err(|_| "OAP u32 field was truncated".to_string())?;

    Ok(u32::from_be_bytes(bytes))
}

fn read_u64(bytes: &[u8]) -> Result<u64, String> {
    let bytes: [u8; 8] = bytes
        .try_into()
        .map_err(|_| "OAP u64 field was truncated".to_string())?;

    Ok(u64::from_be_bytes(bytes))
}

fn read_u128(bytes: &[u8]) -> Result<u128, String> {
    let bytes: [u8; 16] = bytes
        .try_into()
        .map_err(|_| "OAP u128 field was truncated".to_string())?;

    Ok(u128::from_be_bytes(bytes))
}

#[cfg(test)]
mod tests {
    use super::*;

    const OBJECT_BYTES: &[u8] = b"abc";

    const OBJECT_CID: &str = "b3:6437b3ac38465133ffb63b75273a8db548c558465d79db03fd359c6cd5bd9d85";

    fn response_wire(bytes: &[u8], tenant_id: u128, corr_id: u64) -> Vec<u8> {
        let start = serde_json::json!({
            "obj": OBJECT_CID,
            "total_bytes": bytes.len(),
            "chunk_bytes":
                MAX_OAP_CHUNK_BYTES,
        });

        let data = serde_json::json!({
            "obj": OBJECT_CID,
            "seq": 0,
            "bytes": bytes,
        });

        let end = serde_json::json!({
            "seq_end": 1,
            "ok": true,
            "error": null,
        });

        let mut wire = Vec::new();

        wire.extend(
            encode_frame(
                FLAG_RESP | FLAG_START,
                200,
                tenant_id,
                corr_id,
                &serde_json::to_vec(&start).expect("START JSON"),
            )
            .expect("START frame"),
        );

        wire.extend(
            encode_frame(
                FLAG_RESP,
                206,
                tenant_id,
                corr_id,
                &serde_json::to_vec(&data).expect("DATA JSON"),
            )
            .expect("DATA frame"),
        );

        wire.extend(
            encode_frame(
                FLAG_RESP | FLAG_END,
                200,
                tenant_id,
                corr_id,
                &serde_json::to_vec(&end).expect("END JSON"),
            )
            .expect("END frame"),
        );

        wire
    }

    #[test]
    fn request_is_one_canonical_bounded_obj_get_frame() {
        let wire = build_oap_obj_get_request_wire(OBJECT_CID, 7, 9).expect("OBJ_GET wire");

        let frames = decode_frames(&wire).expect("decode request");

        assert_eq!(frames.len(), 1);

        assert_eq!(frames[0].flags, FLAG_REQ | FLAG_START | FLAG_END,);

        assert_eq!(frames[0].code, 0);

        assert_eq!(frames[0].app_proto_id, OBJ_GET_APP_PROTO_ID,);

        assert_eq!(frames[0].tenant_id, 7,);

        assert_eq!(frames[0].corr_id, 9,);

        assert!(frames[0].cap.is_empty());

        assert!(wire.len() <= MAX_OAP_FRAME_BYTES);
    }

    #[test]
    fn complete_stream_returns_only_full_digest_verified_bytes() {
        let wire = response_wire(OBJECT_BYTES, 7, 9);

        let verified =
            verify_oap_object_stream(OBJECT_CID, 7, 9, &wire, 1024).expect("verified stream");

        assert_eq!(verified, OBJECT_BYTES,);
    }

    #[test]
    fn corrupt_stream_is_rejected_by_full_blake3_digest() {
        let wire = response_wire(b"abd", 7, 9);

        let error = verify_oap_object_stream(OBJECT_CID, 7, 9, &wire, 1024)
            .expect_err("corrupt bytes must reject");

        assert!(error.contains("BLAKE3 digest mismatch"));
    }

    #[test]
    fn truncated_stream_and_non_loopback_targets_fail_closed() {
        let mut wire = response_wire(OBJECT_BYTES, 7, 9);

        wire.pop();

        let error = verify_oap_object_stream(OBJECT_CID, 7, 9, &wire, 1024)
            .expect_err("truncated stream must reject");

        assert!(error.contains("incomplete frame"));

        assert!(normalize_local_storage_base_url("http://192.0.2.10:5302",).is_err());

        assert!(normalize_local_storage_base_url("https://127.0.0.1:5302",).is_err());
    }
}
