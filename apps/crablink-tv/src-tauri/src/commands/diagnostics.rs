//! RO:WHAT — Returns redacted CrabLink TV host diagnostics.
//! RO:WHY — Proves the native bridge without granting backend or economic authority.
//! RO:INTERACTS — React host scaffold and Tauri invoke handler.
//! RO:INVARIANTS — client-only; no node runtime; no operator or economic mutation.
//! RO:SECURITY — no endpoints, credentials, tokens, device IDs, or secrets.
//! RO:TEST — diagnostics_truthfully_reports_client_only_posture.

use serde::Serialize;

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TvDiagnostics {
    pub schema: &'static str,
    pub app: &'static str,
    pub profile: &'static str,
    pub client_only: bool,
    pub node_runtime_enabled: bool,
    pub operator_mode_enabled: bool,
    pub wallet_mutation: bool,
    pub ledger_mutation: bool,
}

#[tauri::command]
pub fn tv_diagnostics() -> TvDiagnostics {
    TvDiagnostics {
        schema: "crablink.tv.diagnostics.v1",
        app: "CrabLink TV",
        profile: "host-scaffold",
        client_only: true,
        node_runtime_enabled: false,
        operator_mode_enabled: false,
        wallet_mutation: false,
        ledger_mutation: false,
    }
}

#[cfg(test)]
mod tests {
    use super::tv_diagnostics;

    #[test]
    fn diagnostics_truthfully_reports_client_only_posture() {
        let diagnostics = tv_diagnostics();

        assert_eq!(diagnostics.schema, "crablink.tv.diagnostics.v1",);
        assert_eq!(diagnostics.app, "CrabLink TV");
        assert!(diagnostics.client_only);
        assert!(!diagnostics.node_runtime_enabled);
        assert!(!diagnostics.operator_mode_enabled);
        assert!(!diagnostics.wallet_mutation);
        assert!(!diagnostics.ledger_mutation);
    }
}
