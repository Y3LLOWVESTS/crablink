//! RO:WHAT — Reviews the compile-time CrabLink TV gateway profile.
//! RO:WHY — Gives the television a strict, display-safe connection posture before network commands exist.
//! RO:INTERACTS — pairing status, settings snapshot, React pairing panel, future bounded gateway client.
//! RO:INVARIANTS — release uses HTTPS; development HTTP is limited to private LAN hosts; no credentials or URL decorations.
//! RO:SECURITY — invalid configuration returns a redacted error code and never exposes the rejected raw value.
//! RO:TEST — profile validation, HTTPS enforcement, LAN enforcement, URL-shape rejection, timeout bounds.

use serde::Serialize;
use std::net::{IpAddr, Ipv6Addr};
use url::Url;

const PROFILE_SCHEMA: &str = "crablink.tv.gateway-profile.v1";
const PAIRING_PATH: &str = "/v1/tv/pairing";
const DEFAULT_TIMEOUT_MS: u64 = 5_000;
const MIN_TIMEOUT_MS: u64 = 1_000;
const MAX_TIMEOUT_MS: u64 = 30_000;

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

fn normalize_timeout(value: Option<&str>) -> u64 {
    value
        .and_then(|raw| raw.trim().parse::<u64>().ok())
        .unwrap_or(DEFAULT_TIMEOUT_MS)
        .clamp(MIN_TIMEOUT_MS, MAX_TIMEOUT_MS)
}

fn is_loopback_or_unspecified(host: &str) -> bool {
    if host.eq_ignore_ascii_case("localhost") {
        return true;
    }

    let Ok(address) = host.parse::<IpAddr>() else {
        return false;
    };

    address.is_loopback() || address.is_unspecified()
}

fn is_ipv6_unicast_link_local(address: Ipv6Addr) -> bool {
    // IPv6 link-local unicast occupies fe80::/10. Use the prefix
    // directly because Ipv6Addr::is_unicast_link_local is newer
    // than this crate's Rust 1.80 MSRV.
    address.segments()[0] & 0xffc0 == 0xfe80
}

fn is_private_lan_host(host: &str) -> bool {
    if host.eq_ignore_ascii_case("localhost") {
        return false;
    }

    if host.to_ascii_lowercase().ends_with(".local") {
        return true;
    }

    let Ok(address) = host.parse::<IpAddr>() else {
        return false;
    };

    match address {
        IpAddr::V4(address) => {
            address.is_private() && !address.is_loopback() && !address.is_unspecified()
        }
        IpAddr::V6(address) => {
            let first_segment = address.segments()[0];

            let unique_local = first_segment & 0xfe00 == 0xfc00;

            (unique_local || is_ipv6_unicast_link_local(address))
                && !address.is_loopback()
                && !address.is_unspecified()
        }
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
    let timeout = normalize_timeout(timeout_value);

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

    let environment_profile = match profile {
        "release-https" => "release-https",
        "development-lan" => "development-lan",
        _ => {
            return invalid("invalid", timeout, "gateway_profile_unsupported");
        }
    };

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

    let transport = match environment_profile {
        "release-https" => {
            if parsed.scheme() != "https" {
                return invalid(environment_profile, timeout, "release_https_required");
            }

            if is_loopback_or_unspecified(host) {
                return invalid(environment_profile, timeout, "release_gateway_host_invalid");
            }

            "https"
        }

        "development-lan" => {
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

        _ => unreachable!("profile was normalized above"),
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
    use super::{is_ipv6_unicast_link_local, review_gateway_profile};

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
    fn timeout_is_bounded() {
        let low = review_gateway_profile(None, None, Some("1"));

        let high = review_gateway_profile(None, None, Some("999999"));

        assert_eq!(low.request_timeout_ms, 1_000);
        assert_eq!(high.request_timeout_ms, 30_000);
    }
}
