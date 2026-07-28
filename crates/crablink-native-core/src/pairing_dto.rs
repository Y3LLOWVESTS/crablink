//! RO:WHAT — Shared native pairing-begin DTOs and deterministic validation.
//! RO:WHY — Desktop, TV, and future native clients must review pairing truth with one rule owner.
//! RO:INTERACTS — thin Tauri pairing adapters and fixed-path native transports.
//! RO:INVARIANTS — fixed read-only scopes; strict JSON; backend challenge only; begin never creates a session.
//! RO:SECURITY — rejects unknown fields, malformed codes, invalid clocks, expired challenges, and wrong authority.
//! RO:TEST — request, device-name, response, authority, expiry, size, and retryability tests below.

#![forbid(unsafe_code)]

use serde::{Deserialize, Serialize};

pub const PAIRING_BEGIN_REQUEST_SCHEMA: &str = "crablink.tv.pairing-begin-request.v1";

pub const PAIRING_BEGIN_RESPONSE_SCHEMA: &str = "crablink.tv.pairing-begin-response.v1";

pub const PAIRING_CONTRACT_ERROR_SCHEMA: &str = "crablink.tv.pairing-contract-error.v1";

pub const MAX_PAIRING_BEGIN_RESPONSE_BYTES: usize = 8 * 1_024;

pub const MAX_DEVICE_NAME_BYTES: usize = 64;

pub const APPROVAL_AUTHORITY: &str = "companion-crablink-required";

const MIN_CHALLENGE_HANDLE_BYTES: usize = 8;

const MAX_CHALLENGE_HANDLE_BYTES: usize = 128;

pub const INITIAL_TV_SESSION_SCOPES: [&str; 7] = [
    "identity.read",
    "catalog.read",
    "content.read",
    "entitlement.read",
    "receipts.read",
    "confirmed_roc.read",
    "session.revoke_self",
];

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TvPairingBeginRequest {
    pub schema: &'static str,
    pub device_class: &'static str,
    pub device_name: String,
    pub environment_profile: &'static str,
    pub requested_scopes: Vec<&'static str>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TvPairingBeginResponse {
    pub schema: &'static str,
    pub state: &'static str,
    pub challenge_handle: String,
    pub pairing_code: String,
    pub expires_at: String,
    pub session_present: bool,
    pub approval_authority: &'static str,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TvPairingContractError {
    pub schema: &'static str,
    pub code: &'static str,
    pub retryable: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct TvPairingBeginWireResponse {
    schema: String,
    state: String,
    challenge_handle: String,
    pairing_code: String,
    expires_at: String,
    approval_authority: String,
}

#[must_use]
pub const fn pairing_contract_error(code: &'static str, retryable: bool) -> TvPairingContractError {
    TvPairingContractError {
        schema: PAIRING_CONTRACT_ERROR_SCHEMA,
        code,
        retryable,
    }
}

fn is_supported_environment_profile(value: &str) -> bool {
    matches!(value, "release-https" | "development-lan")
}

fn normalize_device_name(value: &str) -> Option<String> {
    let trimmed = value.trim();

    if trimmed.is_empty()
        || trimmed.len() > MAX_DEVICE_NAME_BYTES
        || trimmed.chars().any(char::is_control)
    {
        return None;
    }

    Some(trimmed.to_string())
}

fn is_valid_challenge_handle(value: &str) -> bool {
    let length = value.len();

    (MIN_CHALLENGE_HANDLE_BYTES..=MAX_CHALLENGE_HANDLE_BYTES).contains(&length)
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_'))
}

fn is_valid_pairing_code(value: &str) -> bool {
    value.len() == 6
        && value
            .bytes()
            .all(|byte| byte.is_ascii_uppercase() || (b'2'..=b'9').contains(&byte))
}

fn parse_two_digits(bytes: &[u8]) -> Option<u32> {
    if bytes.len() != 2 || !bytes.iter().all(|byte| byte.is_ascii_digit()) {
        return None;
    }

    Some(u32::from(bytes[0] - b'0') * 10 + u32::from(bytes[1] - b'0'))
}

fn parse_four_digits(bytes: &[u8]) -> Option<i64> {
    if bytes.len() != 4 || !bytes.iter().all(|byte| byte.is_ascii_digit()) {
        return None;
    }

    Some(
        bytes
            .iter()
            .fold(0_i64, |value, byte| value * 10 + i64::from(*byte - b'0')),
    )
}

fn is_leap_year(year: i64) -> bool {
    year % 4 == 0 && (year % 100 != 0 || year % 400 == 0)
}

fn days_in_month(year: i64, month: u32) -> Option<u32> {
    match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => Some(31),

        4 | 6 | 9 | 11 => Some(30),

        2 if is_leap_year(year) => Some(29),

        2 => Some(28),

        _ => None,
    }
}

fn is_valid_utc_timestamp(value: &str) -> bool {
    let bytes = value.as_bytes();

    if bytes.len() != 20
        || bytes[4] != b'-'
        || bytes[7] != b'-'
        || bytes[10] != b'T'
        || bytes[13] != b':'
        || bytes[16] != b':'
        || bytes[19] != b'Z'
    {
        return false;
    }

    let Some(year) = parse_four_digits(&bytes[0..4]) else {
        return false;
    };

    let Some(month) = parse_two_digits(&bytes[5..7]) else {
        return false;
    };

    let Some(day) = parse_two_digits(&bytes[8..10]) else {
        return false;
    };

    let Some(hour) = parse_two_digits(&bytes[11..13]) else {
        return false;
    };

    let Some(minute) = parse_two_digits(&bytes[14..16]) else {
        return false;
    };

    let Some(second) = parse_two_digits(&bytes[17..19]) else {
        return false;
    };

    (1970..=9999).contains(&year)
        && day > 0
        && days_in_month(year, month).is_some_and(|maximum| day <= maximum)
        && hour <= 23
        && minute <= 59
        && second <= 59
}

pub fn build_pairing_begin_request(
    environment_profile: &'static str,
    device_name: &str,
) -> Result<TvPairingBeginRequest, TvPairingContractError> {
    if !is_supported_environment_profile(environment_profile) {
        return Err(pairing_contract_error("gateway_profile_invalid", false));
    }

    let device_name = normalize_device_name(device_name)
        .ok_or_else(|| pairing_contract_error("device_name_invalid", false))?;

    Ok(TvPairingBeginRequest {
        schema: PAIRING_BEGIN_REQUEST_SCHEMA,
        device_class: "android-tv",
        device_name,
        environment_profile,
        requested_scopes: INITIAL_TV_SESSION_SCOPES.to_vec(),
    })
}

pub fn review_pairing_begin_response(
    status: u16,
    body: &[u8],
    now_utc: &str,
) -> Result<TvPairingBeginResponse, TvPairingContractError> {
    if body.len() > MAX_PAIRING_BEGIN_RESPONSE_BYTES {
        return Err(pairing_contract_error(
            "pairing_begin_response_too_large",
            false,
        ));
    }

    if !(200..300).contains(&status) {
        let retryable = status == 408 || status == 429 || status >= 500;

        return Err(pairing_contract_error(
            if retryable {
                "pairing_begin_unavailable"
            } else {
                "pairing_begin_rejected"
            },
            retryable,
        ));
    }

    if !is_valid_utc_timestamp(now_utc) {
        return Err(pairing_contract_error("pairing_clock_invalid", false));
    }

    let response: TvPairingBeginWireResponse = serde_json::from_slice(body)
        .map_err(|_| pairing_contract_error("pairing_begin_json_invalid", false))?;

    if response.schema != PAIRING_BEGIN_RESPONSE_SCHEMA {
        return Err(pairing_contract_error(
            "pairing_begin_schema_invalid",
            false,
        ));
    }

    if response.state != "waiting" {
        return Err(pairing_contract_error("pairing_begin_state_invalid", false));
    }

    if !is_valid_challenge_handle(&response.challenge_handle) {
        return Err(pairing_contract_error(
            "pairing_challenge_handle_invalid",
            false,
        ));
    }

    if !is_valid_pairing_code(&response.pairing_code) {
        return Err(pairing_contract_error("pairing_code_invalid", false));
    }

    if !is_valid_utc_timestamp(&response.expires_at) {
        return Err(pairing_contract_error("pairing_expiry_invalid", false));
    }

    if response.expires_at.as_str() <= now_utc {
        return Err(pairing_contract_error("pairing_challenge_expired", false));
    }

    if response.approval_authority != APPROVAL_AUTHORITY {
        return Err(pairing_contract_error(
            "pairing_approval_authority_invalid",
            false,
        ));
    }

    Ok(TvPairingBeginResponse {
        schema: PAIRING_BEGIN_RESPONSE_SCHEMA,
        state: "waiting",
        challenge_handle: response.challenge_handle,
        pairing_code: response.pairing_code,
        expires_at: response.expires_at,
        session_present: false,
        approval_authority: APPROVAL_AUTHORITY,
    })
}

#[cfg(test)]
mod tests {
    use super::{
        build_pairing_begin_request, review_pairing_begin_response, APPROVAL_AUTHORITY,
        INITIAL_TV_SESSION_SCOPES, MAX_DEVICE_NAME_BYTES, MAX_PAIRING_BEGIN_RESPONSE_BYTES,
    };

    const VALID_RESPONSE: &[u8] = br#"{
            "schema":"crablink.tv.pairing-begin-response.v1",
            "state":"waiting",
            "challengeHandle":"challenge_12345678",
            "pairingCode":"ABC234",
            "expiresAt":"2030-01-02T03:04:05Z",
            "approvalAuthority":"companion-crablink-required"
        }"#;

    #[test]
    fn request_normalizes_name_and_uses_fixed_read_only_scopes() {
        let request = build_pairing_begin_request("development-lan", "  Living Room TV  ")
            .expect("valid pairing request");

        assert_eq!(request.device_name, "Living Room TV",);

        assert_eq!(request.requested_scopes, INITIAL_TV_SESSION_SCOPES,);

        assert!(!request.requested_scopes.iter().any(|scope| {
            ["wallet", "ledger", "reward", "node", "operator", "publish"]
                .iter()
                .any(|forbidden| scope.contains(forbidden))
        },),);
    }

    #[test]
    fn request_rejects_invalid_profile_and_device_name() {
        let profile_error = build_pairing_begin_request("unreviewed", "Living Room TV")
            .expect_err("profile must be exact");

        assert_eq!(profile_error.code, "gateway_profile_invalid",);

        for invalid_name in ["", "   ", "Living\nRoom"] {
            let error = build_pairing_begin_request("release-https", invalid_name)
                .expect_err("invalid device name");

            assert_eq!(error.code, "device_name_invalid",);
        }

        let oversized = "x".repeat(MAX_DEVICE_NAME_BYTES + 1);

        assert_eq!(
            build_pairing_begin_request("release-https", &oversized,)
                .expect_err("oversized device name",)
                .code,
            "device_name_invalid",
        );
    }

    #[test]
    fn waiting_response_is_strict_and_sessionless() {
        let response = review_pairing_begin_response(201, VALID_RESPONSE, "2026-07-17T00:00:00Z")
            .expect("valid backend challenge");

        assert_eq!(response.state, "waiting",);

        assert_eq!(response.pairing_code, "ABC234",);

        assert!(!response.session_present,);

        assert_eq!(response.approval_authority, APPROVAL_AUTHORITY,);
    }

    #[test]
    fn oversize_unknown_fields_and_wrong_authority_reject() {
        let oversized = vec![b'x'; MAX_PAIRING_BEGIN_RESPONSE_BYTES + 1];

        assert_eq!(
            review_pairing_begin_response(200, &oversized, "2026-07-17T00:00:00Z",)
                .expect_err("oversize response",)
                .code,
            "pairing_begin_response_too_large",
        );

        let unknown = br#"{
            "schema":"crablink.tv.pairing-begin-response.v1",
            "state":"waiting",
            "challengeHandle":"challenge_12345678",
            "pairingCode":"ABC234",
            "expiresAt":"2030-01-02T03:04:05Z",
            "approvalAuthority":"companion-crablink-required",
            "sessionToken":"forbidden"
        }"#;

        assert_eq!(
            review_pairing_begin_response(200, unknown, "2026-07-17T00:00:00Z",)
                .expect_err("unknown field",)
                .code,
            "pairing_begin_json_invalid",
        );

        let wrong_authority = br#"{
            "schema":"crablink.tv.pairing-begin-response.v1",
            "state":"waiting",
            "challengeHandle":"challenge_12345678",
            "pairingCode":"ABC234",
            "expiresAt":"2030-01-02T03:04:05Z",
            "approvalAuthority":"tv-self-approved"
        }"#;

        assert_eq!(
            review_pairing_begin_response(200, wrong_authority, "2026-07-17T00:00:00Z",)
                .expect_err("wrong authority",)
                .code,
            "pairing_approval_authority_invalid",
        );
    }

    #[test]
    fn bad_code_expiry_and_status_retryability_reject() {
        let bad_code = br#"{
            "schema":"crablink.tv.pairing-begin-response.v1",
            "state":"waiting",
            "challengeHandle":"challenge_12345678",
            "pairingCode":"ABC10I",
            "expiresAt":"2030-01-02T03:04:05Z",
            "approvalAuthority":"companion-crablink-required"
        }"#;

        assert_eq!(
            review_pairing_begin_response(200, bad_code, "2026-07-17T00:00:00Z",)
                .expect_err("bad code",)
                .code,
            "pairing_code_invalid",
        );

        let expired = br#"{
            "schema":"crablink.tv.pairing-begin-response.v1",
            "state":"waiting",
            "challengeHandle":"challenge_12345678",
            "pairingCode":"ABC234",
            "expiresAt":"2020-01-02T03:04:05Z",
            "approvalAuthority":"companion-crablink-required"
        }"#;

        assert_eq!(
            review_pairing_begin_response(200, expired, "2026-07-17T00:00:00Z",)
                .expect_err("expired challenge",)
                .code,
            "pairing_challenge_expired",
        );

        let retryable = review_pairing_begin_response(503, &[], "not-consulted")
            .expect_err("transient response");

        assert_eq!(retryable.code, "pairing_begin_unavailable",);

        assert!(retryable.retryable,);

        let rejected = review_pairing_begin_response(403, &[], "not-consulted")
            .expect_err("permanent rejection");

        assert_eq!(rejected.code, "pairing_begin_rejected",);

        assert!(!rejected.retryable,);
    }
}
