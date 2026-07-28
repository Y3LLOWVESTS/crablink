//! RO:WHAT — Performs the fixed-path bounded CrabLink TV gateway health request.
//! RO:WHY — Proves native read-only connectivity without exposing arbitrary URL fetch authority.
//! RO:INTERACTS — reviewed gateway profile, reqwest transport, React health projection later.
//! RO:INVARIANTS — no caller URL; GET /healthz only; redirects/proxies disabled; bounded time and bytes.
//! RO:SECURITY — no credentials, response body, raw transport error, wallet, ledger, or session data escapes.
//! RO:TEST — unconfigured blocking, local healthy response, declared oversize rejection.

use std::time::Duration;

use serde::Serialize;
use url::Url;

use super::gateway::{
    gateway_health_request_for_profile, review_gateway_health_response, tv_gateway_profile,
    TvGatewayHealthRequest, TvGatewayHealthReview, TvGatewayProfile,
};

const HEALTH_RESULT_SCHEMA: &str = "crablink.tv.gateway-health-result.v1";
const USER_AGENT: &str = "CrabLink-TV/0.1";

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TvGatewayHealthResult {
    pub schema: &'static str,
    pub state: &'static str,
    pub healthy: bool,
    pub status: u16,
    pub response_bytes: usize,
    pub retryable: bool,
    pub error_code: Option<&'static str>,
}

impl From<TvGatewayHealthReview> for TvGatewayHealthResult {
    fn from(review: TvGatewayHealthReview) -> Self {
        Self {
            schema: HEALTH_RESULT_SCHEMA,
            state: review.state,
            healthy: review.healthy,
            status: review.status,
            response_bytes: review.response_bytes,
            retryable: review.retryable,
            error_code: review.error_code,
        }
    }
}

fn failure(state: &'static str, code: &'static str, retryable: bool) -> TvGatewayHealthResult {
    TvGatewayHealthResult {
        schema: HEALTH_RESULT_SCHEMA,
        state,
        healthy: false,
        status: 0,
        response_bytes: 0,
        retryable,
        error_code: Some(code),
    }
}

fn classify_transport_error(error: &reqwest::Error) -> (&'static str, bool) {
    if error.is_timeout() {
        return ("gateway_health_timeout", true);
    }

    if error.is_connect() {
        return ("gateway_health_connect_failed", true);
    }

    if error.is_body() {
        return ("gateway_health_body_failed", true);
    }

    ("gateway_health_transport_failed", true)
}

fn health_url(request: &TvGatewayHealthRequest) -> Result<Url, ()> {
    let base = Url::parse(&request.origin).map_err(|_| ())?;

    let url = base.join(request.path).map_err(|_| ())?;

    if url.origin() != base.origin()
        || url.path() != request.path
        || url.query().is_some()
        || url.fragment().is_some()
    {
        return Err(());
    }

    Ok(url)
}

pub(crate) async fn perform_gateway_health(profile: &TvGatewayProfile) -> TvGatewayHealthResult {
    let request = match gateway_health_request_for_profile(profile) {
        Ok(request) => request,
        Err(code) => {
            return failure("blocked", code, false);
        }
    };

    let url = match health_url(&request) {
        Ok(url) => url,
        Err(()) => {
            return failure("blocked", "gateway_health_url_invalid", false);
        }
    };

    let timeout = Duration::from_millis(request.request_timeout_ms);

    let client = match reqwest::Client::builder()
        .connect_timeout(timeout)
        .timeout(timeout)
        .redirect(reqwest::redirect::Policy::none())
        .no_proxy()
        .user_agent(USER_AGENT)
        .build()
    {
        Ok(client) => client,
        Err(error) => {
            let (code, retryable) = classify_transport_error(&error);

            return failure("unavailable", code, retryable);
        }
    };

    let mut response = match client.get(url).send().await {
        Ok(response) => response,
        Err(error) => {
            let (code, retryable) = classify_transport_error(&error);

            return failure("unavailable", code, retryable);
        }
    };

    let status = response.status().as_u16();

    if response
        .content_length()
        .is_some_and(|length| length > request.max_response_bytes as u64)
    {
        return review_gateway_health_response(status, request.max_response_bytes + 1).into();
    }

    let mut response_bytes = 0_usize;

    loop {
        match response.chunk().await {
            Ok(Some(chunk)) => {
                response_bytes = response_bytes.saturating_add(chunk.len());

                if response_bytes > request.max_response_bytes {
                    return review_gateway_health_response(status, response_bytes).into();
                }
            }
            Ok(None) => break,
            Err(error) => {
                let (code, retryable) = classify_transport_error(&error);

                return failure("unavailable", code, retryable);
            }
        }
    }

    review_gateway_health_response(status, response_bytes).into()
}

#[tauri::command]
pub async fn tv_gateway_health() -> TvGatewayHealthResult {
    let profile = tv_gateway_profile();

    perform_gateway_health(&profile).await
}

#[cfg(test)]
mod tests {
    use std::io::{Read, Write};
    use std::net::TcpListener;
    use std::thread;

    use super::perform_gateway_health;
    use crate::commands::gateway::TvGatewayProfile;

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

    fn spawn_health_server(
        declared_length: usize,
        body: &'static [u8],
    ) -> (String, thread::JoinHandle<()>) {
        let listener = TcpListener::bind("127.0.0.1:0").expect("local gateway-health listener");

        let address = listener.local_addr().expect("local listener address");

        let handle = thread::spawn(move || {
            let (mut stream, _) = listener.accept().expect("accept local health request");

            let mut request = [0_u8; 2048];

            let request_bytes = stream
                .read(&mut request)
                .expect("read local health request");

            let request_text = String::from_utf8_lossy(&request[..request_bytes]);

            assert!(
                request_text.starts_with("GET /healthz HTTP/1.1",),
                "health operation must use fixed /healthz path",
            );

            let headers = format!(
                "HTTP/1.1 200 OK\r\n\
                 Content-Length: {declared_length}\r\n\
                 Content-Type: text/plain\r\n\
                 Connection: close\r\n\
                 \r\n"
            );

            stream
                .write_all(headers.as_bytes())
                .expect("write health headers");

            if !body.is_empty() {
                stream.write_all(body).expect("write health body");
            }
        });

        (format!("http://{address}"), handle)
    }

    #[test]
    fn unconfigured_profile_blocks_before_network() {
        let result =
            tauri::async_runtime::block_on(perform_gateway_health(&profile(None, "unconfigured")));

        assert_eq!(result.state, "blocked");
        assert!(!result.healthy);
        assert_eq!(result.status, 0);
        assert!(!result.retryable);
        assert_eq!(result.error_code, Some("gateway_profile_unconfigured",),);
    }

    #[test]
    fn local_fixed_path_health_response_is_accepted() {
        let (origin, server) = spawn_health_server(2, b"OK");

        let result =
            tauri::async_runtime::block_on(perform_gateway_health(&profile(Some(origin), "ready")));

        server.join().expect("local health server");

        assert_eq!(result.state, "healthy");
        assert!(result.healthy);
        assert_eq!(result.status, 200);
        assert_eq!(result.response_bytes, 2);
        assert!(!result.retryable);
        assert_eq!(result.error_code, None);
    }

    #[test]
    fn declared_oversize_health_response_is_rejected() {
        let (origin, server) = spawn_health_server(16 * 1024 + 1, b"");

        let result =
            tauri::async_runtime::block_on(perform_gateway_health(&profile(Some(origin), "ready")));

        server.join().expect("local health server");

        assert_eq!(result.state, "rejected");
        assert!(!result.healthy);
        assert_eq!(result.status, 200);
        assert!(!result.retryable);
        assert_eq!(
            result.error_code,
            Some("gateway_health_response_too_large",),
        );
    }
}
