//! Returns redacted CrabLink Android scaffold diagnostics.
//! This command proves the narrow native bridge without adding product authority.

use serde::Serialize;

use crate::{
    android_deep_link::ANDROID_DEEP_LINK_POSTURE,
    android_lifecycle::ANDROID_LIFECYCLE_POSTURE,
    android_share::ANDROID_SHARE_POSTURE,
    passport_android_keystore::PASSPORT_ANDROID_KEYSTORE_POSTURE,
    passport_android_native_surface::PASSPORT_ANDROID_NATIVE_SURFACE_POSTURE,
    passport_android_vault::PASSPORT_ANDROID_VAULT_POSTURE,
};

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AndroidDiagnostics {
    pub schema: &'static str,
    pub app: &'static str,
    pub profile: &'static str,
    pub client_only: bool,
    pub adaptive_phone_tablet_target: bool,
    pub node_runtime_enabled: bool,
    pub operator_mode_enabled: bool,
    pub wallet_mutation: bool,
    pub ledger_mutation: bool,
    pub lifecycle_posture: &'static str,
    pub deep_link_posture: &'static str,
    pub share_posture: &'static str,
    pub passport_keystore_posture: &'static str,
    pub passport_native_surface_posture: &'static str,
    pub passport_vault_posture: &'static str,
}

#[tauri::command]
pub fn app_diagnostics() -> AndroidDiagnostics {
    AndroidDiagnostics {
        schema: "crablink.android.diagnostics.v1",
        app: "CrabLink",
        profile: "android-phone-tablet-scaffold",
        client_only: true,
        adaptive_phone_tablet_target: true,
        node_runtime_enabled: false,
        operator_mode_enabled: false,
        wallet_mutation: false,
        ledger_mutation: false,
        lifecycle_posture: ANDROID_LIFECYCLE_POSTURE,
        deep_link_posture: ANDROID_DEEP_LINK_POSTURE,
        share_posture: ANDROID_SHARE_POSTURE,
        passport_keystore_posture: PASSPORT_ANDROID_KEYSTORE_POSTURE,
        passport_native_surface_posture:
            PASSPORT_ANDROID_NATIVE_SURFACE_POSTURE,
        passport_vault_posture: PASSPORT_ANDROID_VAULT_POSTURE,
    }
}

#[cfg(test)]
mod tests {
    use super::app_diagnostics;

    #[test]
    fn diagnostics_truthfully_report_scaffold_posture() {
        let diagnostics = app_diagnostics();

        assert_eq!(
            diagnostics.schema,
            "crablink.android.diagnostics.v1",
        );
        assert_eq!(diagnostics.app, "CrabLink");
        assert!(diagnostics.client_only);
        assert!(diagnostics.adaptive_phone_tablet_target);
        assert!(!diagnostics.node_runtime_enabled);
        assert!(!diagnostics.operator_mode_enabled);
        assert!(!diagnostics.wallet_mutation);
        assert!(!diagnostics.ledger_mutation);
        assert_eq!(
            diagnostics.passport_vault_posture,
            "not-connected-in-scaffold",
        );
    }
}
