//! RO:WHAT — Reviews the TV gateway profile and builds bounded gateway-health request/review contracts.
//! RO:WHY — Locks safe native network inputs and outputs before exposing an HTTP command.
//! RO:INTERACTS — pairing contracts, settings snapshot, React pairing panel, future bounded gateway client.
//! RO:INVARIANTS — release HTTPS; development private LAN only; bounded timeout/response; no arbitrary URL fetch.
//! RO:SECURITY — rejected origins and response bodies are never returned through contract errors.
//! RO:TEST — profile validation, LAN/HTTPS rules, health-request bounds, response taxonomy.

use crablink_native_core::gateway_profile::{
    is_loopback_or_unspecified_host, is_private_lan_host, GatewayEnvironmentProfile,
};

#[cfg(test)]
use crablink_native_core::gateway_profile::is_ipv6_unicast_link_local;

use crablink_native_core::settings_profile::normalize_request_timeout_ms;

use serde::Serialize;
use url::Url;

const PROFILE_SCHEMA: &str = "crablink.tv.gateway-profile.v1";
const HEALTH_REQUEST_SCHEMA: &str = "crablink.tv.gateway-health-request.v1";
const HEALTH_REVIEW_SCHEMA: &str = "crablink.tv.gateway-health-review.v1";
const HEALTH_PATH: &str = "/healthz";
const PAIRING_PATH: &str = "/v1/tv/pairing";
const MAX_HEALTH_RESPONSE_BYTES: usize = 16 * 1024;

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TvGatewayProfile {
    pub schema: &'static str,
    pub state: &'static str,
    pub environment_profile: &'static str,
    pub origin: Option<String>,
    pub transport: &'static str,
    pub pairing_path: &'static str,
    pub request_timeout_ms: u64,
    pub release_https_required: bool,
    pub error_code: Option<&'static str>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TvGatewayHealthRequest {
    pub schema: &'static str,
    pub method: &'static str,
    pub origin: String,
    pub path: &'static str,
    pub request_timeout_ms: u64,
    pub max_response_bytes: usize,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TvGatewayHealthReview {
    pub schema: &'static str,
    pub state: &'static str,
    pub healthy: bool,
    pub status: u16,
    pub response_bytes: usize,
    pub retryable: bool,
    pub error_code: Option<&'static str>,
}

// This contract intentionally lands before the future HTTP command.
#[allow(dead_code)]
pub(crate) fn gateway_health_request_for_profile(
    profile: &TvGatewayProfile,
) -> Result<TvGatewayHealthRequest, &'static str> {
    if profile.state != "ready" {
        return Err(match profile.state {
            "invalid" => "gateway_profile_invalid",
            _ => "gateway_profile_unconfigured",
        });
    }

    let Some(origin) = profile.origin.clone() else {
        return Err("gateway_origin_missing");
    };

    Ok(TvGatewayHealthRequest {
        schema: HEALTH_REQUEST_SCHEMA,
        method: "GET",
        origin,
        path: HEALTH_PATH,
        request_timeout_ms: profile.request_timeout_ms,
        max_response_bytes: MAX_HEALTH_RESPONSE_BYTES,
    })
}

// The future transport must count bytes before retaining or parsing a body.
#[allow(dead_code)]
pub(crate) fn review_gateway_health_response(
    status: u16,
    response_bytes: usize,
) -> TvGatewayHealthReview {
    if response_bytes > MAX_HEALTH_RESPONSE_BYTES {
        return TvGatewayHealthReview {
            schema: HEALTH_REVIEW_SCHEMA,
            state: "rejected",
            healthy: false,
            status,
            response_bytes,
            retryable: false,
            error_code: Some("gateway_health_response_too_large"),
        };
    }

    if (200..300).contains(&status) {
        return TvGatewayHealthReview {
            schema: HEALTH_REVIEW_SCHEMA,
            state: "healthy",
            healthy: true,
            status,
            response_bytes,
            retryable: false,
            error_code: None,
        };
    }

    let retryable = status == 408 || status == 429 || status >= 500;

    TvGatewayHealthReview {
        schema: HEALTH_REVIEW_SCHEMA,
        state: "unavailable",
        healthy: false,
        status,
        response_bytes,
        retryable,
        error_code: Some(if retryable {
            "gateway_health_unavailable"
        } else {
            "gateway_health_rejected"
        }),
    }
}

fn unconfigured(timeout: u64) -> TvGatewayProfile {
    TvGatewayProfile {
        schema: PROFILE_SCHEMA,
        state: "unconfigured",
        environment_profile: "unconfigured",
        origin: None,
        transport: "none",
        pairing_path: PAIRING_PATH,
        request_timeout_ms: timeout,
        release_https_required: true,
        error_code: None,
    }
}

fn invalid(
    environment_profile: &'static str,
    timeout: u64,
    error_code: &'static str,
) -> TvGatewayProfile {
    TvGatewayProfile {
        schema: PROFILE_SCHEMA,
        state: "invalid",
        environment_profile,
        origin: None,
        transport: "none",
        pairing_path: PAIRING_PATH,
        request_timeout_ms: timeout,
        release_https_required: true,
        error_code: Some(error_code),
    }
}

pub(crate) fn review_gateway_profile(
    profile_value: Option<&str>,
    origin_value: Option<&str>,
    timeout_value: Option<&str>,
) -> TvGatewayProfile {
    let timeout = normalize_request_timeout_ms(timeout_value);

    let profile = profile_value
        .map(str::trim)
        .filter(|value| !value.is_empty());

    let origin = origin_value
        .map(str::trim)
        .filter(|value| !value.is_empty());

    if profile.is_none() && origin.is_none() {
        return unconfigured(timeout);
    }

    let Some(profile) = profile else {
        return invalid("invalid", timeout, "gateway_profile_missing");
    };

    let environment = match GatewayEnvironmentProfile::from_label(profile) {
        Ok(environment) => environment,
        Err(error_code) => {
            return invalid("invalid", timeout, error_code);
        }
    };

    let environment_profile = environment.as_str();

    let Some(origin) = origin else {
        return invalid(environment_profile, timeout, "gateway_origin_missing");
    };

    let Ok(parsed) = Url::parse(origin) else {
        return invalid(environment_profile, timeout, "gateway_origin_invalid");
    };

    if !parsed.username().is_empty() || parsed.password().is_some() {
        return invalid(
            environment_profile,
            timeout,
            "gateway_credentials_forbidden",
        );
    }

    if parsed.query().is_some() || parsed.fragment().is_some() || parsed.path() != "/" {
        return invalid(
            environment_profile,
            timeout,
            "gateway_origin_must_be_origin_only",
        );
    }

    let Some(host) = parsed.host_str() else {
        return invalid(environment_profile, timeout, "gateway_host_missing");
    };

    let transport = match environment {
        GatewayEnvironmentProfile::ReleaseHttps => {
            if parsed.scheme() != "https" {
                return invalid(environment_profile, timeout, "release_https_required");
            }

            if is_loopback_or_unspecified_host(host) {
                return invalid(environment_profile, timeout, "release_gateway_host_invalid");
            }

            "https"
        }

        GatewayEnvironmentProfile::DevelopmentLan => {
            if !matches!(parsed.scheme(), "http" | "https") {
                return invalid(
                    environment_profile,
                    timeout,
                    "development_transport_invalid",
                );
            }

            if !is_private_lan_host(host) {
                return invalid(
                    environment_profile,
                    timeout,
                    "development_lan_host_required",
                );
            }

            if parsed.scheme() == "https" {
                "https"
            } else {
                "development-lan-http"
            }
        }
    };

    TvGatewayProfile {
        schema: PROFILE_SCHEMA,
        state: "ready",
        environment_profile,
        origin: Some(parsed.origin().ascii_serialization()),
        transport,
        pairing_path: PAIRING_PATH,
        request_timeout_ms: timeout,
        release_https_required: true,
        error_code: None,
    }
}

#[tauri::command]
pub fn tv_gateway_profile() -> TvGatewayProfile {
    review_gateway_profile(
        option_env!("CRABLINK_TV_GATEWAY_PROFILE"),
        option_env!("CRABLINK_TV_GATEWAY_ORIGIN"),
        option_env!("CRABLINK_TV_REQUEST_TIMEOUT_MS"),
    )
}

#[cfg(test)]
mod tests {
    use super::{
        gateway_health_request_for_profile, is_ipv6_unicast_link_local,
        review_gateway_health_response, review_gateway_profile, MAX_HEALTH_RESPONSE_BYTES,
    };

    #[test]
    fn missing_profile_is_truthfully_unconfigured() {
        let profile = review_gateway_profile(None, None, None);

        assert_eq!(profile.state, "unconfigured");
        assert_eq!(profile.environment_profile, "unconfigured",);
        assert_eq!(profile.origin, None);
        assert_eq!(profile.transport, "none");
        assert_eq!(profile.request_timeout_ms, 5_000);
        assert_eq!(profile.error_code, None);
    }

    #[test]
    fn release_profile_accepts_https_origin() {
        let profile = review_gateway_profile(
            Some("release-https"),
            Some("https://gateway.example"),
            Some("6000"),
        );

        assert_eq!(profile.state, "ready");
        assert_eq!(profile.environment_profile, "release-https",);
        assert_eq!(profile.origin.as_deref(), Some("https://gateway.example"),);
        assert_eq!(profile.transport, "https");
        assert_eq!(profile.request_timeout_ms, 6_000);
    }

    #[test]
    fn release_profile_rejects_cleartext() {
        let profile =
            review_gateway_profile(Some("release-https"), Some("http://gateway.example"), None);

        assert_eq!(profile.state, "invalid");
        assert_eq!(profile.error_code, Some("release_https_required"),);
        assert_eq!(profile.origin, None);
    }

    #[test]
    fn development_profile_accepts_private_lan_http() {
        let profile = review_gateway_profile(
            Some("development-lan"),
            Some("http://192.168.1.50:8090"),
            None,
        );

        assert_eq!(profile.state, "ready");
        assert_eq!(profile.origin.as_deref(), Some("http://192.168.1.50:8090"),);
        assert_eq!(profile.transport, "development-lan-http",);
    }

    #[test]
    fn development_profile_rejects_tv_loopback() {
        let profile =
            review_gateway_profile(Some("development-lan"), Some("http://127.0.0.1:8090"), None);

        assert_eq!(profile.state, "invalid");
        assert_eq!(profile.error_code, Some("development_lan_host_required"),);
    }

    #[test]
    fn profile_rejects_credentials_paths_and_queries() {
        for origin in [
            "https://user:secret@gateway.example",
            "https://gateway.example/private",
            "https://gateway.example/?token=secret",
            "https://gateway.example/#fragment",
        ] {
            let profile = review_gateway_profile(Some("release-https"), Some(origin), None);

            assert_eq!(profile.state, "invalid");
            assert_eq!(profile.origin, None);
        }
    }

    #[test]
    fn ipv6_link_local_detection_uses_msrv_compatible_prefix_check() {
        for raw in ["fe80::1", "fe9f::1", "febf:ffff::1"] {
            let address = raw.parse().expect("valid IPv6 link-local fixture");

            assert!(
                is_ipv6_unicast_link_local(address),
                "{raw} must remain inside fe80::/10",
            );
        }

        for raw in [
            "fe7f::1",
            "fec0::1",
            "feff::1",
            "fc00::1",
            "::1",
            "2001:db8::1",
        ] {
            let address = raw.parse().expect("valid non-link-local IPv6 fixture");

            assert!(
                !is_ipv6_unicast_link_local(address),
                "{raw} must remain outside fe80::/10",
            );
        }
    }

    #[test]
    fn gateway_health_request_reuses_reviewed_profile_bounds() {
        let profile = review_gateway_profile(
            Some("development-lan"),
            Some("http://192.168.1.50:8090"),
            Some("999999"),
        );

        let request = gateway_health_request_for_profile(&profile)
            .expect("reviewed gateway must produce a bounded health request");

        assert_eq!(request.method, "GET");
        assert_eq!(request.origin, "http://192.168.1.50:8090",);
        assert_eq!(request.path, "/healthz");
        assert_eq!(request.request_timeout_ms, 30_000);
        assert_eq!(request.max_response_bytes, MAX_HEALTH_RESPONSE_BYTES,);
    }

    #[test]
    fn gateway_health_response_rejects_oversize_before_body_use() {
        let review = review_gateway_health_response(200, MAX_HEALTH_RESPONSE_BYTES + 1);

        assert_eq!(review.state, "rejected");
        assert!(!review.healthy);
        assert!(!review.retryable);
        assert_eq!(review.error_code, Some("gateway_health_response_too_large"),);
    }

    #[test]
    fn gateway_health_response_marks_transient_status_retryable() {
        let review = review_gateway_health_response(503, 32);

        assert_eq!(review.state, "unavailable");
        assert!(!review.healthy);
        assert!(review.retryable);
        assert_eq!(review.error_code, Some("gateway_health_unavailable"),);
    }

    #[test]
    fn timeout_is_bounded() {
        let low = review_gateway_profile(None, None, Some("1"));

        let high = review_gateway_profile(None, None, Some("999999"));

        assert_eq!(low.request_timeout_ms, 1_000);
        assert_eq!(high.request_timeout_ms, 30_000);
    }
}
