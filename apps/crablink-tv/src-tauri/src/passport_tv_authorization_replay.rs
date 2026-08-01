//! Reviews the redacted receipt returned by Android's durable authorization
//! replay store.
//!
//! The Android store persists only authorization IDs and expirations. It does
//! not store the signed authorization, Passport keys, capabilities, sessions,
//! recovery material, or device private material.

#![forbid(unsafe_code)]

use serde::Deserialize;

pub(crate) const TV_AUTHORIZATION_REPLAY_RECEIPT_SCHEMA: &str =
    "crablink.tv.passport-authorization-replay.v1";

const AUTHORIZATION_ID_HEX_BYTES: usize = 64;
const MAX_REPLAY_RECEIPT_JSON_BYTES: usize = 4 * 1_024;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum TvAuthorizationReplayDecision {
    Consumed,
    Replay,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum TvAuthorizationReplayReceiptError {
    InvalidRequest,
    #[cfg(target_os = "android")]
    PlatformCallFailed,
    ReceiptInvalid,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
struct AndroidAuthorizationReplayReceiptV1 {
    schema: String,
    authorization_id: String,
    expires_at_ms: u64,
    consumed: bool,
    replayed: bool,
    durable: bool,
    atomic_file: bool,
    no_backup_directory: bool,
    authorization_material_stored: bool,
    capability_present: bool,
    session_present: bool,
    private_material_exported: bool,
    webview_secret_returned: bool,
    recovery_root_present: bool,
    root_admin_key_present: bool,
}

pub(crate) fn review_android_authorization_replay_receipt(
    payload: &str,
    expected_authorization_id: &str,
    expected_expires_at_ms: u64,
) -> Result<TvAuthorizationReplayDecision, TvAuthorizationReplayReceiptError> {
    if !valid_authorization_id(expected_authorization_id)
        || expected_expires_at_ms == 0
        || payload.is_empty()
        || payload.len() > MAX_REPLAY_RECEIPT_JSON_BYTES
    {
        return Err(TvAuthorizationReplayReceiptError::InvalidRequest);
    }

    let receipt: AndroidAuthorizationReplayReceiptV1 = serde_json::from_str(payload)
        .map_err(|_| TvAuthorizationReplayReceiptError::ReceiptInvalid)?;

    if receipt.schema != TV_AUTHORIZATION_REPLAY_RECEIPT_SCHEMA
        || receipt.authorization_id != expected_authorization_id
        || receipt.expires_at_ms != expected_expires_at_ms
        || !receipt.durable
        || !receipt.atomic_file
        || !receipt.no_backup_directory
        || receipt.authorization_material_stored
        || receipt.capability_present
        || receipt.session_present
        || receipt.private_material_exported
        || receipt.webview_secret_returned
        || receipt.recovery_root_present
        || receipt.root_admin_key_present
        || receipt.consumed == receipt.replayed
    {
        return Err(TvAuthorizationReplayReceiptError::ReceiptInvalid);
    }

    if receipt.consumed {
        return Ok(TvAuthorizationReplayDecision::Consumed);
    }

    Ok(TvAuthorizationReplayDecision::Replay)
}

fn valid_authorization_id(value: &str) -> bool {
    value.len() == AUTHORIZATION_ID_HEX_BYTES
        && value
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    const AUTHORIZATION_ID: &str =
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

    const EXPIRES_AT_MS: u64 = 1_800_000_900_000;

    fn receipt(consumed: bool, replayed: bool) -> String {
        json!({
            "schema": TV_AUTHORIZATION_REPLAY_RECEIPT_SCHEMA,
            "authorizationId": AUTHORIZATION_ID,
            "expiresAtMs": EXPIRES_AT_MS,
            "consumed": consumed,
            "replayed": replayed,
            "durable": true,
            "atomicFile": true,
            "noBackupDirectory": true,
            "authorizationMaterialStored": false,
            "capabilityPresent": false,
            "sessionPresent": false,
            "privateMaterialExported": false,
            "webviewSecretReturned": false,
            "recoveryRootPresent": false,
            "rootAdminKeyPresent": false
        })
        .to_string()
    }

    #[test]
    fn phase16c4b_accepts_first_durable_consumption() {
        assert_eq!(
            review_android_authorization_replay_receipt(
                &receipt(true, false),
                AUTHORIZATION_ID,
                EXPIRES_AT_MS,
            ),
            Ok(TvAuthorizationReplayDecision::Consumed),
        );
    }

    #[test]
    fn phase16c4b_reports_durable_replay_without_accepting_twice() {
        assert_eq!(
            review_android_authorization_replay_receipt(
                &receipt(false, true),
                AUTHORIZATION_ID,
                EXPIRES_AT_MS,
            ),
            Ok(TvAuthorizationReplayDecision::Replay),
        );
    }

    #[test]
    fn phase16c4b_rejects_receipt_binding_or_posture_mismatch() {
        let mut value: serde_json::Value =
            serde_json::from_str(&receipt(true, false)).expect("valid receipt fixture");

        value["authorizationId"] =
            json!("bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");

        assert_eq!(
            review_android_authorization_replay_receipt(
                &value.to_string(),
                AUTHORIZATION_ID,
                EXPIRES_AT_MS,
            ),
            Err(TvAuthorizationReplayReceiptError::ReceiptInvalid),
        );

        value["authorizationId"] = json!(AUTHORIZATION_ID);
        value["durable"] = json!(false);

        assert_eq!(
            review_android_authorization_replay_receipt(
                &value.to_string(),
                AUTHORIZATION_ID,
                EXPIRES_AT_MS,
            ),
            Err(TvAuthorizationReplayReceiptError::ReceiptInvalid),
        );

        value["durable"] = json!(true);
        value["authorizationMaterialStored"] = json!(true);

        assert_eq!(
            review_android_authorization_replay_receipt(
                &value.to_string(),
                AUTHORIZATION_ID,
                EXPIRES_AT_MS,
            ),
            Err(TvAuthorizationReplayReceiptError::ReceiptInvalid),
        );
    }

    #[test]
    fn phase16c4b_rejects_unknown_fields_and_ambiguous_outcomes() {
        let mut unknown: serde_json::Value =
            serde_json::from_str(&receipt(true, false)).expect("valid receipt fixture");

        unknown["rawAuthorization"] = json!("forbidden");

        assert_eq!(
            review_android_authorization_replay_receipt(
                &unknown.to_string(),
                AUTHORIZATION_ID,
                EXPIRES_AT_MS,
            ),
            Err(TvAuthorizationReplayReceiptError::ReceiptInvalid),
        );

        assert_eq!(
            review_android_authorization_replay_receipt(
                &receipt(true, true),
                AUTHORIZATION_ID,
                EXPIRES_AT_MS,
            ),
            Err(TvAuthorizationReplayReceiptError::ReceiptInvalid),
        );

        assert_eq!(
            review_android_authorization_replay_receipt(
                &receipt(false, false),
                AUTHORIZATION_ID,
                EXPIRES_AT_MS,
            ),
            Err(TvAuthorizationReplayReceiptError::ReceiptInvalid),
        );
    }
}
