//! Strict redacted record review for delegated CrabLink TV authority.
//!
//! This module reviews public metadata describing an already verified
//! root-signed device authorization and narrow device-bound read capability.
//! It does not verify root signatures, issue capabilities, persist raw
//! capability material, sign requests, create sessions, or unlock secrets.

#![forbid(unsafe_code)]

use serde::{Deserialize, Serialize};

pub(crate) const TV_DELEGATED_AUTHORITY_RECORD_SCHEMA: &str =
    "crablink.tv.delegated-authority-record.v1";

pub(crate) const TV_DELEGATED_AUTHORITY_REVIEW_SCHEMA: &str =
    "crablink.tv.delegated-authority-review.v1";

pub(crate) const TV_DELEGATED_DEVICE_CLASS: &str = "tv_read_only";

pub(crate) const TV_DELEGATED_AUTHORIZATION_MODE: &str = "root-signed-device-authorization";

pub(crate) const TV_DELEGATED_CAPABILITY_BINDING: &str = "device-bound";

pub(crate) const TV_DELEGATED_PROOF_KEY_ALGORITHM: &str = "ed25519";

pub(crate) const TV_DELEGATED_AUTHORITY_STATE_AUTHORIZED_LOCKED: &str = "authorized_locked";

pub(crate) const TV_DELEGATED_AUTHORITY_STATE_REVOKED: &str = "revoked";

pub(crate) const TV_DELEGATED_AUTHORITY_STATE_EXPIRED: &str = "expired";

pub(crate) const TV_DELEGATED_READ_SCOPES: [&str; 7] = [
    "identity.read",
    "catalog.read",
    "content.read",
    "entitlement.read",
    "receipts.read",
    "confirmed_roc.read",
    "capability.revoke_self",
];

const MAX_AUTHORITY_RECORD_JSON_BYTES: usize = 16 * 1_024;

const LOWER_HEX_ID_BYTES: usize = 64;

const PASSPORT_ID_PREFIX: &str = "passport:v1:main:ed25519:b3:";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum TvDelegatedAuthorityReviewError {
    InvalidInput,
    JsonInvalid,
    BindingMismatch,
    ScopeMismatch,
    PostureInvalid,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
struct StoredTvDelegatedAuthorityRecordV1 {
    schema: String,
    device_class: String,
    authorization_mode: String,
    passport_id: String,
    device_public_key_hex: String,
    authorization_id: String,
    capability_id: String,
    scopes: Vec<String>,
    authorization_root_epoch: u64,
    authorization_expires_at_ms: u64,
    capability_expires_at_ms: u64,
    refresh_not_after_ms: u64,
    revocation_version: u64,
    revoked: bool,
    capability_binding: String,
    proof_key_algorithm: String,
    authorization_material_sealed: bool,
    capability_material_sealed: bool,
    raw_authorization_returned: bool,
    raw_capability_returned: bool,
    webview_secret_returned: bool,
    recovery_root_present: bool,
    root_admin_key_present: bool,
    session_present: bool,
    operationally_unlocked: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TvDelegatedAuthorityReviewV1 {
    pub schema: &'static str,
    pub state: &'static str,
    pub authorization_present: bool,
    pub capability_present: bool,
    pub authorization_material_sealed: bool,
    pub capability_material_sealed: bool,
    pub device_bound: bool,
    pub passport_bound: bool,
    pub scope_count: usize,
    pub authorization_root_epoch: u64,
    pub authorization_expires_at_ms: u64,
    pub capability_expires_at_ms: u64,
    pub refresh_not_after_ms: u64,
    pub revocation_version: u64,
    pub revoked: bool,
    pub proof_key_algorithm: &'static str,
    pub raw_authorization_returned: bool,
    pub raw_capability_returned: bool,
    pub webview_secret_returned: bool,
    pub recovery_root_present: bool,
    pub root_admin_key_present: bool,
    pub session_present: bool,
    pub operationally_unlocked: bool,
}

pub(crate) fn review_stored_tv_delegated_authority_record(
    authority_record_json: &str,
    expected_passport_id: &str,
    expected_device_public_key_hex: &str,
    now_ms: u64,
) -> Result<TvDelegatedAuthorityReviewV1, TvDelegatedAuthorityReviewError> {
    if authority_record_json.is_empty()
        || authority_record_json.len() > MAX_AUTHORITY_RECORD_JSON_BYTES
        || now_ms == 0
        || !valid_passport_id(expected_passport_id)
        || !valid_lower_hex_id(expected_device_public_key_hex)
    {
        return Err(TvDelegatedAuthorityReviewError::InvalidInput);
    }

    let record: StoredTvDelegatedAuthorityRecordV1 = serde_json::from_str(authority_record_json)
        .map_err(|_| TvDelegatedAuthorityReviewError::JsonInvalid)?;

    if record.schema != TV_DELEGATED_AUTHORITY_RECORD_SCHEMA
        || record.device_class != TV_DELEGATED_DEVICE_CLASS
        || record.authorization_mode != TV_DELEGATED_AUTHORIZATION_MODE
        || record.capability_binding != TV_DELEGATED_CAPABILITY_BINDING
        || record.proof_key_algorithm != TV_DELEGATED_PROOF_KEY_ALGORITHM
    {
        return Err(TvDelegatedAuthorityReviewError::PostureInvalid);
    }

    if record.passport_id != expected_passport_id
        || record.device_public_key_hex != expected_device_public_key_hex
        || !valid_passport_id(&record.passport_id)
        || !valid_lower_hex_id(&record.device_public_key_hex)
        || !valid_lower_hex_id(&record.authorization_id)
        || !valid_lower_hex_id(&record.capability_id)
    {
        return Err(TvDelegatedAuthorityReviewError::BindingMismatch);
    }

    if !scopes_match_allowlist(&record.scopes) {
        return Err(TvDelegatedAuthorityReviewError::ScopeMismatch);
    }

    if record.authorization_root_epoch == 0
        || record.authorization_expires_at_ms == 0
        || record.capability_expires_at_ms == 0
        || record.refresh_not_after_ms == 0
        || record.capability_expires_at_ms > record.refresh_not_after_ms
        || record.refresh_not_after_ms > record.authorization_expires_at_ms
        || !record.authorization_material_sealed
        || !record.capability_material_sealed
        || record.raw_authorization_returned
        || record.raw_capability_returned
        || record.webview_secret_returned
        || record.recovery_root_present
        || record.root_admin_key_present
        || record.session_present
        || record.operationally_unlocked
    {
        return Err(TvDelegatedAuthorityReviewError::PostureInvalid);
    }

    let state = if record.revoked {
        TV_DELEGATED_AUTHORITY_STATE_REVOKED
    } else if record.authorization_expires_at_ms <= now_ms
        || record.capability_expires_at_ms <= now_ms
        || record.refresh_not_after_ms <= now_ms
    {
        TV_DELEGATED_AUTHORITY_STATE_EXPIRED
    } else {
        TV_DELEGATED_AUTHORITY_STATE_AUTHORIZED_LOCKED
    };

    Ok(TvDelegatedAuthorityReviewV1 {
        schema: TV_DELEGATED_AUTHORITY_REVIEW_SCHEMA,

        state,

        authorization_present: true,

        capability_present: true,

        authorization_material_sealed: true,

        capability_material_sealed: true,

        device_bound: true,

        passport_bound: true,

        scope_count: record.scopes.len(),

        authorization_root_epoch: record.authorization_root_epoch,

        authorization_expires_at_ms: record.authorization_expires_at_ms,

        capability_expires_at_ms: record.capability_expires_at_ms,

        refresh_not_after_ms: record.refresh_not_after_ms,

        revocation_version: record.revocation_version,

        revoked: record.revoked,

        proof_key_algorithm: TV_DELEGATED_PROOF_KEY_ALGORITHM,

        raw_authorization_returned: false,

        raw_capability_returned: false,

        webview_secret_returned: false,

        recovery_root_present: false,

        root_admin_key_present: false,

        session_present: false,

        operationally_unlocked: false,
    })
}

fn scopes_match_allowlist(scopes: &[String]) -> bool {
    scopes.len() == TV_DELEGATED_READ_SCOPES.len()
        && scopes
            .iter()
            .map(String::as_str)
            .eq(TV_DELEGATED_READ_SCOPES)
}

fn valid_passport_id(value: &str) -> bool {
    let Some(identifier) = value.strip_prefix(PASSPORT_ID_PREFIX) else {
        return false;
    };

    valid_lower_hex_id(identifier)
}

fn valid_lower_hex_id(value: &str) -> bool {
    value.len() == LOWER_HEX_ID_BYTES
        && value
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
}

#[cfg(test)]
mod tests {
    use serde_json::{json, Value};

    use super::*;

    const PASSPORT_ID: &str =
        "passport:v1:main:ed25519:b3:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

    const DEVICE_PUBLIC_KEY: &str =
        "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

    const AUTHORIZATION_ID: &str =
        "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";

    const CAPABILITY_ID: &str = "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";

    const NOW_MS: u64 = 1_800_000_000_000;

    fn valid_record() -> Value {
        json!({
            "schema":
                TV_DELEGATED_AUTHORITY_RECORD_SCHEMA,

            "deviceClass":
                TV_DELEGATED_DEVICE_CLASS,

            "authorizationMode":
                TV_DELEGATED_AUTHORIZATION_MODE,

            "passportId":
                PASSPORT_ID,

            "devicePublicKeyHex":
                DEVICE_PUBLIC_KEY,

            "authorizationId":
                AUTHORIZATION_ID,

            "capabilityId":
                CAPABILITY_ID,

            "scopes":
                TV_DELEGATED_READ_SCOPES,

            "authorizationRootEpoch":
                7,

            "authorizationExpiresAtMs":
                NOW_MS + 3_600_000,

            "capabilityExpiresAtMs":
                NOW_MS + 900_000,

            "refreshNotAfterMs":
                NOW_MS + 1_800_000,

            "revocationVersion":
                2,

            "revoked":
                false,

            "capabilityBinding":
                TV_DELEGATED_CAPABILITY_BINDING,

            "proofKeyAlgorithm":
                TV_DELEGATED_PROOF_KEY_ALGORITHM,

            "authorizationMaterialSealed":
                true,

            "capabilityMaterialSealed":
                true,

            "rawAuthorizationReturned":
                false,

            "rawCapabilityReturned":
                false,

            "webviewSecretReturned":
                false,

            "recoveryRootPresent":
                false,

            "rootAdminKeyPresent":
                false,

            "sessionPresent":
                false,

            "operationallyUnlocked":
                false
        })
    }

    #[test]
    fn phase16d1_accepts_exact_bound_authority_as_locked() {
        let review = review_stored_tv_delegated_authority_record(
            &valid_record().to_string(),
            PASSPORT_ID,
            DEVICE_PUBLIC_KEY,
            NOW_MS,
        )
        .expect("valid delegated authority record");

        assert_eq!(review.state, TV_DELEGATED_AUTHORITY_STATE_AUTHORIZED_LOCKED,);

        assert!(review.authorization_present,);

        assert!(review.capability_present,);

        assert!(review.device_bound,);

        assert!(review.passport_bound,);

        assert_eq!(review.scope_count, 7,);

        assert!(!review.session_present,);

        assert!(!review.operationally_unlocked,);
    }

    #[test]
    fn phase16d1_revoked_and_expired_records_fail_closed() {
        let mut revoked = valid_record();

        revoked["revoked"] = json!(true);

        let revoked_review = review_stored_tv_delegated_authority_record(
            &revoked.to_string(),
            PASSPORT_ID,
            DEVICE_PUBLIC_KEY,
            NOW_MS,
        )
        .expect("revoked record remains inspectable");

        assert_eq!(revoked_review.state, TV_DELEGATED_AUTHORITY_STATE_REVOKED,);

        assert!(revoked_review.revoked,);

        assert!(!revoked_review.operationally_unlocked,);

        let mut expired = valid_record();

        expired["capabilityExpiresAtMs"] = json!(NOW_MS);

        expired["refreshNotAfterMs"] = json!(NOW_MS);

        let expired_review = review_stored_tv_delegated_authority_record(
            &expired.to_string(),
            PASSPORT_ID,
            DEVICE_PUBLIC_KEY,
            NOW_MS,
        )
        .expect("expired record remains inspectable");

        assert_eq!(expired_review.state, TV_DELEGATED_AUTHORITY_STATE_EXPIRED,);

        assert!(!expired_review.operationally_unlocked,);
    }

    #[test]
    fn phase16d1_rejects_passport_device_and_identifier_mismatch() {
        let mut wrong_passport = valid_record();

        wrong_passport["passportId"] =
            json!(
                "passport:v1:main:ed25519:b3:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
            );

        assert_eq!(
            review_stored_tv_delegated_authority_record(
                &wrong_passport.to_string(),
                PASSPORT_ID,
                DEVICE_PUBLIC_KEY,
                NOW_MS,
            ),
            Err(TvDelegatedAuthorityReviewError::BindingMismatch,),
        );

        let mut wrong_device = valid_record();

        wrong_device["devicePublicKeyHex"] =
            json!("ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");

        assert_eq!(
            review_stored_tv_delegated_authority_record(
                &wrong_device.to_string(),
                PASSPORT_ID,
                DEVICE_PUBLIC_KEY,
                NOW_MS,
            ),
            Err(TvDelegatedAuthorityReviewError::BindingMismatch,),
        );

        let mut invalid_capability = valid_record();

        invalid_capability["capabilityId"] = json!("not-a-capability-id");

        assert_eq!(
            review_stored_tv_delegated_authority_record(
                &invalid_capability.to_string(),
                PASSPORT_ID,
                DEVICE_PUBLIC_KEY,
                NOW_MS,
            ),
            Err(TvDelegatedAuthorityReviewError::BindingMismatch,),
        );
    }

    #[test]
    fn phase16d1_rejects_scope_expansion_duplicates_and_reordering() {
        let mut expanded = valid_record();

        expanded["scopes"] = json!([
            "identity.read",
            "catalog.read",
            "content.read",
            "entitlement.read",
            "receipts.read",
            "confirmed_roc.read",
            "capability.revoke_self",
            "wallet.spend"
        ]);

        assert_eq!(
            review_stored_tv_delegated_authority_record(
                &expanded.to_string(),
                PASSPORT_ID,
                DEVICE_PUBLIC_KEY,
                NOW_MS,
            ),
            Err(TvDelegatedAuthorityReviewError::ScopeMismatch,),
        );

        let mut duplicated = valid_record();

        duplicated["scopes"] = json!([
            "identity.read",
            "catalog.read",
            "content.read",
            "entitlement.read",
            "receipts.read",
            "confirmed_roc.read",
            "identity.read"
        ]);

        assert_eq!(
            review_stored_tv_delegated_authority_record(
                &duplicated.to_string(),
                PASSPORT_ID,
                DEVICE_PUBLIC_KEY,
                NOW_MS,
            ),
            Err(TvDelegatedAuthorityReviewError::ScopeMismatch,),
        );

        let mut reordered = valid_record();

        reordered["scopes"] = json!([
            "catalog.read",
            "identity.read",
            "content.read",
            "entitlement.read",
            "receipts.read",
            "confirmed_roc.read",
            "capability.revoke_self"
        ]);

        assert_eq!(
            review_stored_tv_delegated_authority_record(
                &reordered.to_string(),
                PASSPORT_ID,
                DEVICE_PUBLIC_KEY,
                NOW_MS,
            ),
            Err(TvDelegatedAuthorityReviewError::ScopeMismatch,),
        );
    }

    #[test]
    fn phase16d1_redacted_review_exposes_no_raw_authority_material() {
        let review = review_stored_tv_delegated_authority_record(
            &valid_record().to_string(),
            PASSPORT_ID,
            DEVICE_PUBLIC_KEY,
            NOW_MS,
        )
        .expect("valid delegated authority record");

        let serialized = serde_json::to_string(&review).expect("serialize redacted review");

        for forbidden in [
            PASSPORT_ID,
            DEVICE_PUBLIC_KEY,
            AUTHORIZATION_ID,
            CAPABILITY_ID,
            "\"authorization\"",
            "\"capability\"",
            "\"privateKey\"",
            "\"recoveryPhrase\"",
            "\"rootPrivateKey\"",
            "\"sessionToken\"",
        ] {
            assert!(
                !serialized.contains(forbidden,),
                "redacted review leaked {forbidden}",
            );
        }

        assert!(serialized.contains("\"rawAuthorizationReturned\":false",),);

        assert!(serialized.contains("\"rawCapabilityReturned\":false",),);

        assert!(serialized.contains("\"operationallyUnlocked\":false",),);
    }
}
