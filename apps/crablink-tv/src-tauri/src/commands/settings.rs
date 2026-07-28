//! RO:WHAT — Returns a typed, display-safe CrabLink TV settings and network-profile snapshot.
//! RO:WHY — The settings screen needs truthful gateway posture without exposing the configured origin.
//! RO:INTERACTS — shared native settings profile, reviewed TV gateway, React settings adapter.
//! RO:INVARIANTS — read-only; development is marked; origin is redacted; local preferences remain non-authoritative.
//! RO:SECURITY — no endpoint, credential, identity, balance, receipt, session, wallet, ledger, or private state.
//! RO:TEST — unconfigured, managed release, development LAN, and invalid redaction tests below.

use crablink_native_core::settings_profile::{
    review_native_network_settings_profile, NativeNetworkSettingsProfile,
};

use serde::Serialize;

use super::gateway::{tv_gateway_profile, TvGatewayProfile};

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TvSettingsSnapshot {
    pub schema: &'static str,
    pub client_profile: &'static str,
    pub gateway_state: &'static str,
    pub gateway_profile: &'static str,
    pub gateway_display_label: &'static str,
    pub gateway_configured: bool,
    pub gateway_connection_allowed: bool,
    pub gateway_development_profile: bool,
    pub gateway_origin_disclosure: &'static str,
    pub request_timeout_ms: u64,
    pub release_https_required: bool,
    pub gateway_error_code: Option<&'static str>,
    pub android_initialized: bool,
    pub privacy_mode: bool,
    pub micronode_attached: bool,
    pub settings_authority: &'static str,
    pub supported_theme_modes: [&'static str; 3],
    pub supported_resource_modes: [&'static str; 3],
}

fn settings_snapshot_from_profile(profile: NativeNetworkSettingsProfile) -> TvSettingsSnapshot {
    TvSettingsSnapshot {
        schema: "crablink.tv.settings-snapshot.v3",
        client_profile: "android-tv-client",
        gateway_state: profile.gateway_state,
        gateway_profile: profile.gateway_profile,
        gateway_display_label: profile.gateway_display_label,
        gateway_configured: profile.connection_allowed,
        gateway_connection_allowed: profile.connection_allowed,
        gateway_development_profile: profile.development_profile,
        gateway_origin_disclosure: profile.gateway_origin_disclosure,
        request_timeout_ms: profile.request_timeout_ms,
        release_https_required: profile.release_https_required,
        gateway_error_code: profile.error_code,
        android_initialized: true,
        privacy_mode: true,
        micronode_attached: false,
        settings_authority: "local-ui-preferences-only",
        supported_theme_modes: ["dark", "light", "system"],
        supported_resource_modes: ["low", "balanced", "plugged-in"],
    }
}

pub(crate) fn settings_snapshot_for_gateway(gateway: &TvGatewayProfile) -> TvSettingsSnapshot {
    settings_snapshot_from_profile(review_native_network_settings_profile(
        gateway.state,
        gateway.environment_profile,
        gateway.request_timeout_ms,
    ))
}

#[tauri::command]
pub fn tv_settings_read() -> TvSettingsSnapshot {
    let gateway = tv_gateway_profile();

    settings_snapshot_for_gateway(&gateway)
}

#[cfg(test)]
mod tests {
    use super::settings_snapshot_for_gateway;

    use crate::commands::gateway::review_gateway_profile;

    #[test]
    fn unconfigured_settings_are_truthful_and_non_authoritative() {
        let gateway = review_gateway_profile(None, None, None);

        let settings = settings_snapshot_for_gateway(&gateway);

        assert_eq!(settings.schema, "crablink.tv.settings-snapshot.v3",);

        assert_eq!(settings.client_profile, "android-tv-client",);

        assert_eq!(settings.gateway_state, "unconfigured",);

        assert_eq!(settings.gateway_display_label, "Gateway not configured",);

        assert!(!settings.gateway_configured,);

        assert!(!settings.gateway_connection_allowed,);

        assert_eq!(settings.gateway_origin_disclosure, "redacted",);

        assert!(settings.android_initialized,);

        assert!(settings.privacy_mode,);

        assert!(!settings.micronode_attached,);

        assert_eq!(settings.settings_authority, "local-ui-preferences-only",);
    }

    #[test]
    fn managed_release_settings_are_ready_without_origin_disclosure() {
        let gateway = review_gateway_profile(
            Some("release-https"),
            Some("https://gateway.example"),
            Some("6000"),
        );

        let settings = settings_snapshot_for_gateway(&gateway);

        assert_eq!(settings.gateway_profile, "release-https",);

        assert_eq!(settings.gateway_display_label, "Managed HTTPS gateway",);

        assert!(settings.gateway_configured,);

        assert!(settings.gateway_connection_allowed,);

        assert!(!settings.gateway_development_profile,);

        assert_eq!(settings.request_timeout_ms, 6_000,);

        assert_eq!(settings.gateway_error_code, None,);

        let serialized = serde_json::to_string(&settings).expect("serialize settings snapshot");

        assert!(!serialized.contains("gateway.example",),);
    }

    #[test]
    fn development_lan_settings_are_visibly_marked_and_redacted() {
        let gateway = review_gateway_profile(
            Some("development-lan"),
            Some("http://192.168.1.50:8090"),
            None,
        );

        let settings = settings_snapshot_for_gateway(&gateway);

        assert_eq!(settings.gateway_state, "ready",);

        assert_eq!(settings.gateway_profile, "development-lan",);

        assert_eq!(settings.gateway_display_label, "Private development LAN",);

        assert!(settings.gateway_development_profile,);

        assert!(settings.gateway_connection_allowed,);

        let serialized = serde_json::to_string(&settings).expect("serialize settings snapshot");

        assert!(!serialized.contains("192.168.1.50",),);
    }

    #[test]
    fn invalid_gateway_settings_fail_closed_and_remain_redacted() {
        let gateway =
            review_gateway_profile(Some("release-https"), Some("http://gateway.example"), None);

        let settings = settings_snapshot_for_gateway(&gateway);

        assert_eq!(settings.gateway_state, "invalid",);

        assert!(!settings.gateway_configured,);

        assert!(!settings.gateway_connection_allowed,);

        assert_eq!(
            settings.gateway_error_code,
            Some("gateway_profile_invalid",),
        );

        assert_eq!(settings.gateway_origin_disclosure, "redacted",);

        let serialized = serde_json::to_string(&settings).expect("serialize settings snapshot");

        assert!(!serialized.contains("gateway.example",),);
    }
}
