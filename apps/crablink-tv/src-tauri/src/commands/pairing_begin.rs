//! RO:WHAT — Performs the fixed-path bounded CrabLink TV pairing-begin request.
//! RO:WHY — Obtains a real backend challenge without giving the TV approval or session authority.
//! RO:INTERACTS — reviewed gateway profile, canonical pairing DTO review, reqwest transport.
//! RO:INVARIANTS — caller supplies only device name; POST /v1/tv/pairing; fixed scopes; no session creation.
//! RO:SECURITY — redirects/proxies disabled; bounded time/body; native clock; no credentials or raw body escapes.
//! RO:TEST — clock formatting, pre-network blocking, request projection, oversize, transient status.

use std::time::{Duration, SystemTime, UNIX_EPOCH};

use url::Url;

use super::gateway::{tv_gateway_profile, TvGatewayProfile};
use super::pairing::{
    pairing_begin_request_for_gateway, pairing_contract_error, review_pairing_begin_response,
    TvPairingBeginResponse, TvPairingContractError, MAX_PAIRING_BEGIN_RESPONSE_BYTES,
};

const USER_AGENT: &str = "CrabLink-TV/0.1";
const PAIRING_PATH: &str = "/v1/tv/pairing";

fn civil_from_days(days_since_epoch: i64) -> (i64, u32, u32) {
    let shifted = days_since_epoch + 719_468;

    let era = if shifted >= 0 {
        shifted
    } else {
        shifted - 146_096
    } / 146_097;

    let day_of_era = shifted - era * 146_097;

    let year_of_era =
        (day_of_era - day_of_era / 1_460 + day_of_era / 36_524 - day_of_era / 146_096) / 365;

    let mut year = year_of_era + era * 400;

    let day_of_year = day_of_era - (365 * year_of_era + year_of_era / 4 - year_of_era / 100);

    let month_prime = (5 * day_of_year + 2) / 153;

    let day = day_of_year - (153 * month_prime + 2) / 5 + 1;

    let month = month_prime + if month_prime < 10 { 3 } else { -9 };

    if month <= 2 {
        year += 1;
    }

    (
        year,
        u32::try_from(month).expect("civil month remains positive"),
        u32::try_from(day).expect("civil day remains positive"),
    )
}

fn format_unix_utc(unix_seconds: u64) -> Option<String> {
    let days = i64::try_from(unix_seconds / 86_400).ok()?;

    let second_of_day = unix_seconds % 86_400;

    let hour = second_of_day / 3_600;

    let minute = (second_of_day % 3_600) / 60;

    let second = second_of_day % 60;

    let (year, month, day) = civil_from_days(days);

    if !(1970..=9999).contains(&year) {
        return None;
    }

    Some(format!(
        "{year:04}-{month:02}-{day:02}T{hour:02}:{minute:02}:{second:02}Z"
    ))
}

fn current_utc_timestamp() -> Result<String, TvPairingContractError> {
    let elapsed = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|_| pairing_contract_error("pairing_clock_invalid", false))?;

    format_unix_utc(elapsed.as_secs())
        .ok_or_else(|| pairing_contract_error("pairing_clock_invalid", false))
}

fn pairing_url(profile: &TvGatewayProfile) -> Result<Url, TvPairingContractError> {
    if profile.pairing_path != PAIRING_PATH {
        return Err(pairing_contract_error("pairing_path_invalid", false));
    }

    let origin = profile
        .origin
        .as_deref()
        .ok_or_else(|| pairing_contract_error("gateway_profile_unconfigured", false))?;

    let base =
        Url::parse(origin).map_err(|_| pairing_contract_error("pairing_url_invalid", false))?;

    let url = base
        .join(PAIRING_PATH)
        .map_err(|_| pairing_contract_error("pairing_url_invalid", false))?;

    if url.origin() != base.origin()
        || url.path() != PAIRING_PATH
        || url.query().is_some()
        || url.fragment().is_some()
    {
        return Err(pairing_contract_error("pairing_url_invalid", false));
    }

    Ok(url)
}

fn transport_error(error: &reqwest::Error) -> TvPairingContractError {
    if error.is_timeout() {
        return pairing_contract_error("pairing_begin_timeout", true);
    }

    if error.is_connect() {
        return pairing_contract_error("pairing_begin_connect_failed", true);
    }

    if error.is_body() {
        return pairing_contract_error("pairing_begin_body_failed", true);
    }

    pairing_contract_error("pairing_begin_transport_failed", true)
}

pub(crate) async fn perform_pairing_begin(
    profile: &TvGatewayProfile,
    device_name: &str,
    now_utc: &str,
) -> Result<TvPairingBeginResponse, TvPairingContractError> {
    let request = pairing_begin_request_for_gateway(profile, device_name)?;

    let url = pairing_url(profile)?;

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
        .post(url)
        .json(&request)
        .send()
        .await
        .map_err(|error| transport_error(&error))?;

    let status = response.status().as_u16();

    if !(200..300).contains(&status) {
        return review_pairing_begin_response(status, &[], now_utc);
    }

    if response
        .content_length()
        .is_some_and(|length| length > MAX_PAIRING_BEGIN_RESPONSE_BYTES as u64)
    {
        return Err(pairing_contract_error(
            "pairing_begin_response_too_large",
            false,
        ));
    }

    let mut body = Vec::new();

    loop {
        match response.chunk().await {
            Ok(Some(chunk)) => {
                let next_length = body.len().saturating_add(chunk.len());

                if next_length > MAX_PAIRING_BEGIN_RESPONSE_BYTES {
                    return Err(pairing_contract_error(
                        "pairing_begin_response_too_large",
                        false,
                    ));
                }

                body.extend_from_slice(&chunk);
            }
            Ok(None) => break,
            Err(error) => {
                return Err(transport_error(&error));
            }
        }
    }

    review_pairing_begin_response(status, &body, now_utc)
}

#[tauri::command]
pub async fn tv_pairing_begin(
    device_name: String,
) -> Result<TvPairingBeginResponse, TvPairingContractError> {
    let profile = tv_gateway_profile();

    let now_utc = current_utc_timestamp()?;

    perform_pairing_begin(&profile, &device_name, &now_utc).await
}

#[cfg(test)]
mod tests {
    use std::io::{Read, Write};
    use std::net::{TcpListener, TcpStream};
    use std::thread;
    use std::time::Duration;

    use serde_json::Value;

    use super::{format_unix_utc, perform_pairing_begin};
    use crate::commands::gateway::TvGatewayProfile;

    const VALID_RESPONSE: &[u8] = br#"{
        "schema":"crablink.tv.pairing-begin-response.v1",
        "state":"waiting",
        "challengeHandle":"challenge_12345678",
        "pairingCode":"ABC234",
        "expiresAt":"2030-01-02T03:04:05Z",
        "approvalAuthority":"companion-crablink-required"
    }"#;

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

    fn find_header_end(bytes: &[u8]) -> Option<usize> {
        bytes.windows(4).position(|window| window == b"\r\n\r\n")
    }

    fn content_length(headers: &str) -> usize {
        headers
            .lines()
            .find_map(|line| {
                let (name, value) = line.split_once(':')?;

                if name.eq_ignore_ascii_case("content-length") {
                    return value.trim().parse().ok();
                }

                None
            })
            .expect("pairing request content length")
    }

    fn read_request(stream: &mut TcpStream) -> Vec<u8> {
        stream
            .set_read_timeout(Some(Duration::from_secs(2)))
            .expect("set request read timeout");

        let mut received = Vec::new();
        let mut buffer = [0_u8; 2_048];

        loop {
            let count = stream.read(&mut buffer).expect("read pairing request");

            if count == 0 {
                break;
            }

            received.extend_from_slice(&buffer[..count]);

            if let Some(header_end) = find_header_end(&received) {
                let headers = String::from_utf8_lossy(&received[..header_end]);

                let expected = header_end + 4 + content_length(&headers);

                if received.len() >= expected {
                    break;
                }
            }

            assert!(
                received.len() <= 16 * 1_024,
                "pairing request must remain bounded",
            );
        }

        received
    }

    fn inspect_pairing_request(request: &[u8]) {
        let header_end = find_header_end(request).expect("pairing request headers");

        let headers = String::from_utf8_lossy(&request[..header_end]);

        assert!(
            headers.starts_with("POST /v1/tv/pairing HTTP/1.1",),
            "pairing begin must use fixed POST path",
        );

        assert!(
            headers
                .to_ascii_lowercase()
                .contains("content-type: application/json",),
            "pairing begin must use JSON",
        );

        let payload: Value =
            serde_json::from_slice(&request[header_end + 4..]).expect("pairing request JSON");

        assert_eq!(payload["schema"], "crablink.tv.pairing-begin-request.v1",);

        assert_eq!(payload["deviceClass"], "android-tv",);

        assert_eq!(payload["deviceName"], "Living Room TV",);

        let scopes = payload["requestedScopes"]
            .as_array()
            .expect("fixed requested scopes");

        assert_eq!(scopes.len(), 7);

        for forbidden in ["wallet", "ledger", "reward", "operator", "publish"] {
            assert!(
                !scopes.iter().any(|scope| {
                    scope
                        .as_str()
                        .is_some_and(|value| value.contains(forbidden))
                }),
                "forbidden scope leaked: {forbidden}",
            );
        }
    }

    fn spawn_pairing_server(
        status_line: &'static str,
        declared_length: usize,
        response_body: &'static [u8],
    ) -> (String, thread::JoinHandle<()>) {
        let listener = TcpListener::bind("127.0.0.1:0").expect("local pairing listener");

        let address = listener.local_addr().expect("local pairing address");

        let handle = thread::spawn(move || {
            let (mut stream, _) = listener.accept().expect("accept pairing request");

            let request = read_request(&mut stream);

            inspect_pairing_request(&request);

            let headers = format!(
                "{status_line}\r\n\
                 Content-Length: {declared_length}\r\n\
                 Content-Type: application/json\r\n\
                 Connection: close\r\n\
                 \r\n"
            );

            stream
                .write_all(headers.as_bytes())
                .expect("write pairing headers");

            if !response_body.is_empty() {
                stream
                    .write_all(response_body)
                    .expect("write pairing response");
            }
        });

        (format!("http://{address}"), handle)
    }

    #[test]
    fn unix_timestamp_formatter_matches_known_utc_values() {
        assert_eq!(format_unix_utc(0).as_deref(), Some("1970-01-01T00:00:00Z"),);

        assert_eq!(
            format_unix_utc(1_784_246_400,).as_deref(),
            Some("2026-07-17T00:00:00Z"),
        );
    }

    #[test]
    fn unconfigured_profile_blocks_pairing_before_network() {
        let error = tauri::async_runtime::block_on(perform_pairing_begin(
            &profile(None, "unconfigured"),
            "Living Room TV",
            "2026-07-17T00:00:00Z",
        ))
        .expect_err("unconfigured gateway must block");

        assert_eq!(error.code, "gateway_profile_unconfigured",);

        assert!(!error.retryable);
    }

    #[test]
    fn local_pairing_begin_posts_fixed_request_and_accepts_challenge() {
        let (origin, server) =
            spawn_pairing_server("HTTP/1.1 201 Created", VALID_RESPONSE.len(), VALID_RESPONSE);

        let response = tauri::async_runtime::block_on(perform_pairing_begin(
            &profile(Some(origin), "ready"),
            "Living Room TV",
            "2026-07-17T00:00:00Z",
        ))
        .expect("valid backend challenge");

        server.join().expect("local pairing server");

        assert_eq!(response.state, "waiting",);

        assert_eq!(response.pairing_code, "ABC234",);

        assert!(!response.session_present);
    }

    #[test]
    fn declared_oversize_pairing_response_is_rejected() {
        let (origin, server) = spawn_pairing_server("HTTP/1.1 200 OK", 8 * 1_024 + 1, b"");

        let error = tauri::async_runtime::block_on(perform_pairing_begin(
            &profile(Some(origin), "ready"),
            "Living Room TV",
            "2026-07-17T00:00:00Z",
        ))
        .expect_err("oversize response must fail");

        server.join().expect("local pairing server");

        assert_eq!(error.code, "pairing_begin_response_too_large",);

        assert!(!error.retryable);
    }

    #[test]
    fn transient_pairing_status_is_retryable() {
        let (origin, server) = spawn_pairing_server("HTTP/1.1 503 Service Unavailable", 0, b"");

        let error = tauri::async_runtime::block_on(perform_pairing_begin(
            &profile(Some(origin), "ready"),
            "Living Room TV",
            "2026-07-17T00:00:00Z",
        ))
        .expect_err("transient status must fail");

        server.join().expect("local pairing server");

        assert_eq!(error.code, "pairing_begin_unavailable",);

        assert!(error.retryable);
    }
}
