//! RO:WHAT — Reports whether CrabLink TV is ready to begin companion pairing.
//! RO:WHY — Exposes real pairing prerequisites without fabricating a code, approval, or session.
//! RO:INTERACTS — gateway profile command, React pairing panel, future pairing begin/poll commands.
//! RO:INVARIANTS — pairing approval remains external; no code or session exists until backend confirmation.
//! RO:SECURITY — no token, credential, account identifier, private key, or approval capability is returned.
//! RO:TEST — pairing is blocked for missing/invalid gateway and ready only for a reviewed gateway.

use serde::Serialize;

use super::gateway::{tv_gateway_profile, TvGatewayProfile};

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TvPairingStatus {
    pub schema: &'static str,
    pub state: &'static str,
    pub gateway_state: &'static str,
    pub pairing_code: Option<String>,
    pub expires_at: Option<String>,
    pub session_present: bool,
    pub approval_authority: &'static str,
    pub message: &'static str,
}

pub(crate) fn pairing_status_for_gateway(gateway: &TvGatewayProfile) -> TvPairingStatus {
    let (state, message) = match gateway.state {
        "ready" => (
            "ready_to_begin",
            "Gateway profile is ready. A future backend request must issue the pairing challenge.",
        ),
        "invalid" => (
            "blocked_invalid_gateway",
            "Pairing is blocked because the gateway profile is invalid.",
        ),
        _ => (
            "blocked_unconfigured",
            "Pairing is blocked until a reviewed gateway profile is configured.",
        ),
    };

    TvPairingStatus {
        schema: "crablink.tv.pairing-status.v1",
        state,
        gateway_state: gateway.state,
        pairing_code: None,
        expires_at: None,
        session_present: false,
        approval_authority: "companion-crablink-required",
        message,
    }
}

#[tauri::command]
pub fn tv_pairing_status() -> TvPairingStatus {
    let gateway = tv_gateway_profile();

    pairing_status_for_gateway(&gateway)
}

#[cfg(test)]
mod tests {
    use super::pairing_status_for_gateway;
    use crate::commands::gateway::review_gateway_profile;

    #[test]
    fn unconfigured_gateway_blocks_pairing_without_fake_code() {
        let gateway = review_gateway_profile(None, None, None);

        let status = pairing_status_for_gateway(&gateway);

        assert_eq!(status.state, "blocked_unconfigured",);
        assert_eq!(status.pairing_code, None);
        assert_eq!(status.expires_at, None);
        assert!(!status.session_present);
    }

    #[test]
    fn invalid_gateway_blocks_pairing() {
        let gateway =
            review_gateway_profile(Some("release-https"), Some("http://gateway.example"), None);

        let status = pairing_status_for_gateway(&gateway);

        assert_eq!(status.state, "blocked_invalid_gateway",);
        assert!(!status.session_present);
    }

    #[test]
    fn reviewed_gateway_is_ready_but_not_paired() {
        let gateway = review_gateway_profile(
            Some("development-lan"),
            Some("http://192.168.1.50:8090"),
            None,
        );

        let status = pairing_status_for_gateway(&gateway);

        assert_eq!(status.state, "ready_to_begin");
        assert_eq!(status.gateway_state, "ready");
        assert_eq!(status.pairing_code, None);
        assert!(!status.session_present);
        assert_eq!(status.approval_authority, "companion-crablink-required",);
    }
}
