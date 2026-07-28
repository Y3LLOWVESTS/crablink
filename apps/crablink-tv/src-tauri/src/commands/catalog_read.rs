//! RO:WHAT — Performs the fixed-path bounded CrabLink TV home-catalog request.
//! RO:WHY — Phase 8 needs real backend catalog bytes without arbitrary native fetch authority.
//! RO:INTERACTS — reviewed gateway profile, reqwest transport, TV catalog JavaScript projection.
//! RO:INVARIANTS — no caller URL or arguments; GET /v1/tv/catalog only; bounded time and bytes.
//! RO:SECURITY — redirects/proxies disabled; only typed error codes escape; no credentials or economic authority.
//! RO:TEST — pre-network blocking, fixed path, bounded JSON, oversize, malformed, and transient status.

use std::time::Duration;

use serde::Serialize;
use serde_json::Value;
use url::Url;

use super::gateway::{tv_gateway_profile, TvGatewayProfile};

const CATALOG_PATH: &str = "/v1/tv/catalog";
const MAX_CATALOG_RESPONSE_BYTES: usize = 256 * 1024;
const USER_AGENT: &str = "CrabLink-TV/0.1";

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TvCatalogReadError {
    pub code: &'static str,
    pub retryable: bool,
}

fn catalog_error(code: &'static str, retryable: bool) -> TvCatalogReadError {
    TvCatalogReadError { code, retryable }
}

fn catalog_url(profile: &TvGatewayProfile) -> Result<Url, TvCatalogReadError> {
    if profile.state != "ready" {
        return Err(catalog_error("gateway_unconfigured", false));
    }

    let origin = profile
        .origin
        .as_deref()
        .ok_or_else(|| catalog_error("gateway_unconfigured", false))?;

    let base = Url::parse(origin).map_err(|_| catalog_error("catalog_unavailable", false))?;

    let url = base
        .join(CATALOG_PATH)
        .map_err(|_| catalog_error("catalog_unavailable", false))?;

    if url.origin() != base.origin()
        || url.path() != CATALOG_PATH
        || url.query().is_some()
        || url.fragment().is_some()
    {
        return Err(catalog_error("catalog_unavailable", false));
    }

    Ok(url)
}

fn transport_error(_error: &reqwest::Error) -> TvCatalogReadError {
    catalog_error("gateway_unreachable", true)
}

fn status_error(status: u16) -> TvCatalogReadError {
    let retryable = status == 408 || status == 429 || status >= 500;

    if retryable {
        catalog_error("gateway_unreachable", true)
    } else {
        catalog_error("catalog_unavailable", false)
    }
}

pub(crate) async fn perform_catalog_read(
    profile: &TvGatewayProfile,
) -> Result<Value, TvCatalogReadError> {
    let url = catalog_url(profile)?;

    let timeout = Duration::from_millis(profile.request_timeout_ms);

    let client = reqwest::Client::builder()
        .connect_timeout(timeout)
        .timeout(timeout)
        .redirect(reqwest::redirect::Policy::none())
        .no_proxy()
        .user_agent(USER_AGENT)
        .build()
        .map_err(|error| transport_error(&error))?;

    let mut response = client
        .get(url)
        .header(reqwest::header::ACCEPT, "application/json")
        .send()
        .await
        .map_err(|error| transport_error(&error))?;

    let status = response.status().as_u16();

    if !(200..300).contains(&status) {
        return Err(status_error(status));
    }

    if response
        .content_length()
        .is_some_and(|length| length > MAX_CATALOG_RESPONSE_BYTES as u64)
    {
        return Err(catalog_error("catalog_unavailable", false));
    }

    let mut body = Vec::new();

    loop {
        match response.chunk().await {
            Ok(Some(chunk)) => {
                let next_length = body.len().saturating_add(chunk.len());

                if next_length > MAX_CATALOG_RESPONSE_BYTES {
                    return Err(catalog_error("catalog_unavailable", false));
                }

                body.extend_from_slice(&chunk);
            }

            Ok(None) => {
                break;
            }

            Err(error) => {
                return Err(transport_error(&error));
            }
        }
    }

    serde_json::from_slice(&body).map_err(|_| catalog_error("catalog_unavailable", false))
}

#[tauri::command]
pub async fn tv_catalog_read() -> Result<Value, TvCatalogReadError> {
    let profile = tv_gateway_profile();

    perform_catalog_read(&profile).await
}

#[cfg(test)]
mod tests {
    use std::io::{Read, Write};
    use std::net::TcpListener;
    use std::thread;

    use super::{perform_catalog_read, MAX_CATALOG_RESPONSE_BYTES};
    use crate::commands::gateway::TvGatewayProfile;

    const VALID_CATALOG: &[u8] =
        br#"{"schema":"crablink.tv.catalog.v1","generatedAt":"2030-01-02T03:04:05Z","rails":[]}"#;

    fn profile(origin: Option<String>, state: &'static str) -> TvGatewayProfile {
        TvGatewayProfile {
            schema: "crablink.tv.gateway-profile.v1",
            state,
            environment_profile: "development-lan",
            origin,
            transport: "development-lan-http",
            pairing_path: "/v1/tv/pairing",
            request_timeout_ms: 2_000,
            release_https_required: true,
            error_code: None,
        }
    }

    fn spawn_catalog_server(
        status_line: &'static str,
        declared_length: usize,
        body: &'static [u8],
    ) -> (String, thread::JoinHandle<()>) {
        let listener = TcpListener::bind("127.0.0.1:0").expect("local catalog listener");

        let address = listener.local_addr().expect("local catalog address");

        let handle = thread::spawn(move || {
            let (mut stream, _) = listener.accept().expect("accept catalog request");

            let mut request = [0_u8; 2_048];

            let request_bytes = stream.read(&mut request).expect("read catalog request");

            let request_text = String::from_utf8_lossy(&request[..request_bytes]);

            assert!(
                request_text.starts_with("GET /v1/tv/catalog HTTP/1.1",),
                "catalog operation must use fixed /v1/tv/catalog path",
            );

            assert!(
                request_text
                    .to_ascii_lowercase()
                    .contains("accept: application/json",),
                "catalog operation must request JSON",
            );

            let headers = format!(
                "HTTP/1.1 {status_line}\r\n\
                     Content-Length: {declared_length}\r\n\
                     Content-Type: application/json\r\n\
                     Connection: close\r\n\
                     \r\n",
            );

            stream
                .write_all(headers.as_bytes())
                .expect("write catalog headers");

            if !body.is_empty() {
                stream.write_all(body).expect("write catalog body");
            }
        });

        (format!("http://{address}",), handle)
    }

    #[test]
    fn unconfigured_profile_blocks_before_network() {
        let error =
            tauri::async_runtime::block_on(perform_catalog_read(&profile(None, "unconfigured")))
                .expect_err("unconfigured catalog must fail");

        assert_eq!(error.code, "gateway_unconfigured",);

        assert!(!error.retryable,);
    }

    #[test]
    fn local_fixed_path_catalog_response_is_returned_as_json() {
        let (origin, server) = spawn_catalog_server("200 OK", VALID_CATALOG.len(), VALID_CATALOG);

        let value =
            tauri::async_runtime::block_on(perform_catalog_read(&profile(Some(origin), "ready")))
                .expect("bounded catalog response");

        server.join().expect("catalog server join");

        assert_eq!(value["schema"], "crablink.tv.catalog.v1",);

        assert!(value["rails"]
            .as_array()
            .is_some_and(|items| { items.is_empty() },),);
    }

    #[test]
    fn declared_oversize_catalog_response_is_rejected() {
        let (origin, server) = spawn_catalog_server("200 OK", MAX_CATALOG_RESPONSE_BYTES + 1, b"");

        let error =
            tauri::async_runtime::block_on(perform_catalog_read(&profile(Some(origin), "ready")))
                .expect_err("oversize catalog must fail");

        server.join().expect("catalog server join");

        assert_eq!(error.code, "catalog_unavailable",);

        assert!(!error.retryable,);
    }

    #[test]
    fn malformed_catalog_json_is_rejected_without_raw_body() {
        let (origin, server) = spawn_catalog_server("200 OK", 1, b"{");

        let error =
            tauri::async_runtime::block_on(perform_catalog_read(&profile(Some(origin), "ready")))
                .expect_err("malformed JSON must fail");

        server.join().expect("catalog server join");

        assert_eq!(error.code, "catalog_unavailable",);

        assert!(!error.retryable,);
    }

    #[test]
    fn transient_catalog_status_is_retryable_and_sanitized() {
        let (origin, server) = spawn_catalog_server("503 Service Unavailable", 0, b"");

        let error =
            tauri::async_runtime::block_on(perform_catalog_read(&profile(Some(origin), "ready")))
                .expect_err("transient catalog status must fail");

        server.join().expect("catalog server join");

        assert_eq!(error.code, "gateway_unreachable",);

        assert!(error.retryable,);
    }
}
