//! RO:WHAT — Defines TV pairing readiness and thin adapters over shared pairing DTO validation.
//! RO:WHY — Gateway readiness remains TV-local while DTO rules have one platform-neutral Rust owner.
//! RO:INTERACTS — reviewed gateway profile, shared pairing DTOs, React projection, pairing transport.
//! RO:INVARIANTS — fixed read-only scopes; backend-issued challenge only; no session from begin response.
//! RO:SECURITY — shared validation rejects unknown fields, malformed codes, expiry, and wrong authority.
//! RO:TEST — gateway readiness plus shared request and response regressions below.
//! RO:SHARED — crablink-native-core defines `pub struct TvPairingBeginRequest` and `pub struct TvPairingBeginResponse`.
//! RO:SHARED — `TvPairingBeginWireResponse` uses `deny_unknown_fields` and `serde_json::from_slice` in shared code.

pub use crablink_native_core::pairing_dto::{
    pairing_contract_error, review_pairing_begin_response, TvPairingBeginRequest,
    TvPairingBeginResponse, TvPairingContractError, MAX_PAIRING_BEGIN_RESPONSE_BYTES,
};

use crablink_native_core::pairing_dto::{build_pairing_begin_request, APPROVAL_AUTHORITY};

#[cfg(test)]
use crablink_native_core::pairing_dto::INITIAL_TV_SESSION_SCOPES;
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

pub(crate) fn pairing_begin_request_for_gateway(
    gateway: &TvGatewayProfile,
    device_name: &str,
) -> Result<TvPairingBeginRequest, TvPairingContractError> {
    if gateway.state != "ready" || gateway.origin.is_none() {
        return Err(pairing_contract_error(
            if gateway.state == "invalid" {
                "gateway_profile_invalid"
            } else {
                "gateway_profile_unconfigured"
            },
            false,
        ));
    }

    build_pairing_begin_request(gateway.environment_profile, device_name)
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
        approval_authority: APPROVAL_AUTHORITY,
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
    use super::{
        pairing_begin_request_for_gateway, pairing_status_for_gateway,
        review_pairing_begin_response, INITIAL_TV_SESSION_SCOPES, MAX_PAIRING_BEGIN_RESPONSE_BYTES,
    };

    use crate::commands::gateway::review_gateway_profile;

    #[test]
    fn unconfigured_gateway_blocks_pairing_without_fake_code() {
        let gateway = review_gateway_profile(None, None, None);

        let status = pairing_status_for_gateway(&gateway);

        assert_eq!(status.state, "blocked_unconfigured",);

        assert_eq!(status.pairing_code, None,);

        assert_eq!(status.expires_at, None,);

        assert!(!status.session_present,);
    }

    #[test]
    fn invalid_gateway_blocks_pairing() {
        let gateway =
            review_gateway_profile(Some("release-https"), Some("http://gateway.example"), None);

        let status = pairing_status_for_gateway(&gateway);

        assert_eq!(status.state, "blocked_invalid_gateway",);

        assert!(!status.session_present,);
    }

    #[test]
    fn pairing_begin_request_uses_fixed_read_only_scopes() {
        let gateway = review_gateway_profile(
            Some("development-lan"),
            Some("http://192.168.1.50:8090"),
            None,
        );

        let request = pairing_begin_request_for_gateway(&gateway, "Living Room TV")
            .expect("reviewed gateway must produce pairing intent");

        assert_eq!(request.device_class, "tv_read_only",);

        assert_eq!(request.device_name, "Living Room TV",);

        assert_eq!(
            request.requested_scopes.as_slice(),
            INITIAL_TV_SESSION_SCOPES.as_slice(),
        );

        assert!(!request.requested_scopes.iter().any(|scope| {
            scope.contains("wallet")
                || scope.contains("ledger")
                || scope.contains("reward")
                || scope.contains("node")
                || scope.contains("operator")
                || scope.contains("publish")
        },),);
    }

    #[test]
    fn pairing_begin_response_accepts_authoritative_waiting_challenge() {
        let body = br#"{
            "schema":"crablink.tv.pairing-begin-response.v1",
            "state":"waiting",
            "challengeHandle":"challenge_12345678",
            "pairingCode":"ABC234",
            "expiresAt":"2030-01-02T03:04:05Z",
            "approvalAuthority":"root-admin-device-required"
        }"#;

        let response = review_pairing_begin_response(201, body, "2026-07-16T22:00:00Z")
            .expect("valid future challenge must be accepted");

        assert_eq!(response.state, "waiting",);

        assert_eq!(response.challenge_handle, "challenge_12345678",);

        assert_eq!(response.pairing_code, "ABC234",);

        assert!(!response.session_present,);
    }

    #[test]
    fn pairing_begin_response_rejects_oversize_and_unknown_fields() {
        let oversized = vec![b'x'; MAX_PAIRING_BEGIN_RESPONSE_BYTES + 1];

        let oversized_error =
            review_pairing_begin_response(200, &oversized, "2026-07-16T22:00:00Z")
                .expect_err("oversized response must fail before parsing");

        assert_eq!(oversized_error.code, "pairing_begin_response_too_large",);

        let unknown_field = br#"{
            "schema":"crablink.tv.pairing-begin-response.v1",
            "state":"waiting",
            "challengeHandle":"challenge_12345678",
            "pairingCode":"ABC234",
            "expiresAt":"2030-01-02T03:04:05Z",
            "approvalAuthority":"root-admin-device-required",
            "token":"forbidden"
        }"#;

        let unknown_error =
            review_pairing_begin_response(200, unknown_field, "2026-07-16T22:00:00Z")
                .expect_err("unknown field must be rejected");

        assert_eq!(unknown_error.code, "pairing_begin_json_invalid",);
    }

    #[test]
    fn pairing_begin_response_rejects_bad_code_and_expired_challenge() {
        let bad_code = br#"{
            "schema":"crablink.tv.pairing-begin-response.v1",
            "state":"waiting",
            "challengeHandle":"challenge_12345678",
            "pairingCode":"ABC10I",
            "expiresAt":"2030-01-02T03:04:05Z",
            "approvalAuthority":"root-admin-device-required"
        }"#;

        let code_error = review_pairing_begin_response(200, bad_code, "2026-07-16T22:00:00Z")
            .expect_err("ambiguous code characters must be rejected");

        assert_eq!(code_error.code, "pairing_code_invalid",);

        let expired = br#"{
            "schema":"crablink.tv.pairing-begin-response.v1",
            "state":"waiting",
            "challengeHandle":"challenge_12345678",
            "pairingCode":"ABC234",
            "expiresAt":"2020-01-02T03:04:05Z",
            "approvalAuthority":"root-admin-device-required"
        }"#;

        let expiry_error = review_pairing_begin_response(200, expired, "2026-07-16T22:00:00Z")
            .expect_err("expired challenge must be rejected");

        assert_eq!(expiry_error.code, "pairing_challenge_expired",);
    }

    #[test]
    fn reviewed_gateway_is_ready_but_not_paired() {
        let gateway = review_gateway_profile(
            Some("development-lan"),
            Some("http://192.168.1.50:8090"),
            None,
        );

        let status = pairing_status_for_gateway(&gateway);

        assert_eq!(status.state, "ready_to_begin",);

        assert_eq!(status.gateway_state, "ready",);

        assert_eq!(status.pairing_code, None,);

        assert!(!status.session_present,);

        assert_eq!(status.approval_authority, "root-admin-device-required",);
    }
}
