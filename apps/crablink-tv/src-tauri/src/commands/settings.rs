//! RO:WHAT — Returns the immutable Phase 1 CrabLink TV settings snapshot.
//! RO:WHY — Gives the shell truthful profile labels before persistent settings exist.
//! RO:INTERACTS — React host scaffold and future TV settings implementation.
//! RO:INVARIANTS — no endpoint editing, persistence, credentials, or authority.
//! RO:SECURITY — returns display-safe configuration only.
//! RO:TEST — scaffold_settings_are_safe_and_non_authoritative.

use serde::Serialize;

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TvSettingsSnapshot {
    pub schema: &'static str,
    pub environment_profile: &'static str,
    pub gateway_configured: bool,
    pub android_initialized: bool,
    pub privacy_mode: bool,
}

#[tauri::command]
pub fn tv_settings_read() -> TvSettingsSnapshot {
    TvSettingsSnapshot {
        schema: "crablink.tv.settings-snapshot.v1",
        environment_profile: "host-scaffold",
        gateway_configured: false,
        android_initialized: false,
        privacy_mode: true,
    }
}

#[cfg(test)]
mod tests {
    use super::tv_settings_read;

    #[test]
    fn scaffold_settings_are_safe_and_non_authoritative() {
        let settings = tv_settings_read();

        assert_eq!(settings.schema, "crablink.tv.settings-snapshot.v1",);
        assert_eq!(settings.environment_profile, "host-scaffold",);
        assert!(!settings.gateway_configured);
        assert!(!settings.android_initialized);
        assert!(settings.privacy_mode);
    }
}
