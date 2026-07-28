//! RO:WHAT — Shared native request-timeout and redacted network-settings projection.
//! RO:WHY — Native clients must expose one truthful gateway posture without leaking configured origins.
//! RO:INTERACTS — TV gateway review, TV settings snapshot, and future mobile settings adapters.
//! RO:INVARIANTS — exact gateway states/profiles; bounded timeout; development visibly marked; origin always redacted.
//! RO:SECURITY — no URL input, network access, storage, credentials, wallet, ledger, session, or finality authority.
//! RO:TEST — timeout bounds, managed release, development LAN, and fail-closed projection tests below.

#![forbid(unsafe_code)]

use serde::Serialize;

pub const NETWORK_SETTINGS_PROFILE_SCHEMA: &str = "crablink.native.network-settings-profile.v1";

pub const DEFAULT_REQUEST_TIMEOUT_MS: u64 = 5_000;

pub const MIN_REQUEST_TIMEOUT_MS: u64 = 1_000;

pub const MAX_REQUEST_TIMEOUT_MS: u64 = 30_000;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeNetworkSettingsProfile {
    pub schema: &'static str,
    pub gateway_state: &'static str,
    pub gateway_profile: &'static str,
    pub gateway_display_label: &'static str,
    pub development_profile: bool,
    pub request_timeout_ms: u64,
    pub gateway_origin_disclosure: &'static str,
    pub connection_allowed: bool,
    pub release_https_required: bool,
    pub error_code: Option<&'static str>,
}

#[must_use]
pub fn normalize_request_timeout_ms(value: Option<&str>) -> u64 {
    value
        .and_then(|raw| raw.trim().parse::<u64>().ok())
        .unwrap_or(DEFAULT_REQUEST_TIMEOUT_MS)
        .clamp(MIN_REQUEST_TIMEOUT_MS, MAX_REQUEST_TIMEOUT_MS)
}

const fn projection(
    gateway_state: &'static str,
    gateway_profile: &'static str,
    gateway_display_label: &'static str,
    development_profile: bool,
    request_timeout_ms: u64,
    connection_allowed: bool,
    error_code: Option<&'static str>,
) -> NativeNetworkSettingsProfile {
    NativeNetworkSettingsProfile {
        schema: NETWORK_SETTINGS_PROFILE_SCHEMA,
        gateway_state,
        gateway_profile,
        gateway_display_label,
        development_profile,
        request_timeout_ms,
        gateway_origin_disclosure: "redacted",
        connection_allowed,
        release_https_required: true,
        error_code,
    }
}

#[must_use]
pub fn review_native_network_settings_profile(
    gateway_state: &str,
    environment_profile: &str,
    request_timeout_ms: u64,
) -> NativeNetworkSettingsProfile {
    let timeout = request_timeout_ms.clamp(MIN_REQUEST_TIMEOUT_MS, MAX_REQUEST_TIMEOUT_MS);

    match (gateway_state, environment_profile) {
        ("ready", "release-https") => projection(
            "ready",
            "release-https",
            "Managed HTTPS gateway",
            false,
            timeout,
            true,
            None,
        ),

        ("ready", "development-lan") => projection(
            "ready",
            "development-lan",
            "Private development LAN",
            true,
            timeout,
            true,
            None,
        ),

        ("unconfigured", "unconfigured") => projection(
            "unconfigured",
            "unconfigured",
            "Gateway not configured",
            false,
            timeout,
            false,
            None,
        ),

        ("invalid", "release-https") => projection(
            "invalid",
            "release-https",
            "Managed HTTPS profile invalid",
            false,
            timeout,
            false,
            Some("gateway_profile_invalid"),
        ),

        ("invalid", "development-lan") => projection(
            "invalid",
            "development-lan",
            "Development LAN profile invalid",
            true,
            timeout,
            false,
            Some("gateway_profile_invalid"),
        ),

        ("invalid", _) => projection(
            "invalid",
            "invalid",
            "Gateway profile invalid",
            false,
            timeout,
            false,
            Some("gateway_profile_invalid"),
        ),

        ("ready" | "unconfigured", _) => projection(
            "invalid",
            "invalid",
            "Gateway profile blocked",
            false,
            timeout,
            false,
            Some("gateway_profile_state_mismatch"),
        ),

        _ => projection(
            "invalid",
            "invalid",
            "Gateway state unsupported",
            false,
            timeout,
            false,
            Some("gateway_state_unsupported"),
        ),
    }
}

#[cfg(test)]
mod tests {
    use super::{
        normalize_request_timeout_ms, review_native_network_settings_profile,
        DEFAULT_REQUEST_TIMEOUT_MS, MAX_REQUEST_TIMEOUT_MS, MIN_REQUEST_TIMEOUT_MS,
    };

    #[test]
    fn request_timeout_defaults_and_clamps() {
        assert_eq!(
            normalize_request_timeout_ms(None,),
            DEFAULT_REQUEST_TIMEOUT_MS,
        );

        assert_eq!(
            normalize_request_timeout_ms(Some("not-a-number"),),
            DEFAULT_REQUEST_TIMEOUT_MS,
        );

        assert_eq!(normalize_request_timeout_ms(Some(" 6000 "),), 6_000,);

        assert_eq!(
            normalize_request_timeout_ms(Some("1"),),
            MIN_REQUEST_TIMEOUT_MS,
        );

        assert_eq!(
            normalize_request_timeout_ms(Some("999999"),),
            MAX_REQUEST_TIMEOUT_MS,
        );
    }

    #[test]
    fn managed_release_profile_is_ready_and_redacted() {
        let profile = review_native_network_settings_profile("ready", "release-https", 6_000);

        assert_eq!(profile.gateway_state, "ready",);

        assert_eq!(profile.gateway_profile, "release-https",);

        assert_eq!(profile.gateway_display_label, "Managed HTTPS gateway",);

        assert!(profile.connection_allowed,);

        assert!(!profile.development_profile,);

        assert_eq!(profile.gateway_origin_disclosure, "redacted",);

        assert_eq!(profile.error_code, None,);
    }

    #[test]
    fn development_lan_profile_is_visibly_marked() {
        let profile = review_native_network_settings_profile("ready", "development-lan", 5_000);

        assert_eq!(profile.gateway_profile, "development-lan",);

        assert_eq!(profile.gateway_display_label, "Private development LAN",);

        assert!(profile.development_profile,);

        assert!(profile.connection_allowed,);

        assert_eq!(profile.gateway_origin_disclosure, "redacted",);
    }

    #[test]
    fn unconfigured_and_mismatched_profiles_fail_closed() {
        let unconfigured =
            review_native_network_settings_profile("unconfigured", "unconfigured", 5_000);

        assert!(!unconfigured.connection_allowed,);

        assert_eq!(unconfigured.error_code, None,);

        let mismatched = review_native_network_settings_profile("ready", "unknown-profile", 0);

        assert_eq!(mismatched.gateway_state, "invalid",);

        assert_eq!(mismatched.gateway_profile, "invalid",);

        assert!(!mismatched.connection_allowed,);

        assert_eq!(mismatched.request_timeout_ms, MIN_REQUEST_TIMEOUT_MS,);

        assert_eq!(
            mismatched.error_code,
            Some("gateway_profile_state_mismatch",),
        );

        assert_eq!(mismatched.gateway_origin_disclosure, "redacted",);
    }
}
