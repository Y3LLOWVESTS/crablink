//! RO:WHAT — Returns the display-safe CrabLink TV settings capability snapshot.
//! RO:WHY — Reports the real Android TV client posture before gateway and micronode attachment.
//! RO:INTERACTS — React settings surface and the narrow Tauri command bridge.
//! RO:INVARIANTS — read-only; local preferences cannot become node, reward, wallet, or ledger authority.
//! RO:SECURITY — contains no endpoints, credentials, identities, balances, receipts, or private state.
//! RO:TEST — android_tv_settings_are_truthful_and_non_authoritative.

use serde::Serialize;

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TvSettingsSnapshot {
    pub schema: &'static str,
    pub environment_profile: &'static str,
    pub gateway_configured: bool,
    pub android_initialized: bool,
    pub privacy_mode: bool,
    pub micronode_attached: bool,
    pub settings_authority: &'static str,
    pub supported_theme_modes: [&'static str; 3],
    pub supported_resource_modes: [&'static str; 3],
}

#[tauri::command]
pub fn tv_settings_read() -> TvSettingsSnapshot {
    let gateway = super::gateway::tv_gateway_profile();

    TvSettingsSnapshot {
        schema: "crablink.tv.settings-snapshot.v2",
        environment_profile: "android-tv-client",
        gateway_configured: gateway.state == "ready",
        android_initialized: true,
        privacy_mode: true,
        micronode_attached: false,
        settings_authority: "local-ui-preferences-only",
        supported_theme_modes: ["dark", "light", "system"],
        supported_resource_modes: ["low", "balanced", "plugged-in"],
    }
}

#[cfg(test)]
mod tests {
    use super::tv_settings_read;
    use crate::commands::gateway::tv_gateway_profile;

    #[test]
    fn android_tv_settings_are_truthful_and_non_authoritative() {
        let settings = tv_settings_read();

        assert_eq!(settings.schema, "crablink.tv.settings-snapshot.v2",);

        assert_eq!(settings.environment_profile, "android-tv-client",);

        assert_eq!(
            settings.gateway_configured,
            tv_gateway_profile().state == "ready",
        );
        assert!(settings.android_initialized);
        assert!(settings.privacy_mode);
        assert!(!settings.micronode_attached);

        assert_eq!(settings.settings_authority, "local-ui-preferences-only",);

        assert_eq!(settings.supported_theme_modes, ["dark", "light", "system"],);

        assert_eq!(
            settings.supported_resource_modes,
            ["low", "balanced", "plugged-in"],
        );
    }
}
