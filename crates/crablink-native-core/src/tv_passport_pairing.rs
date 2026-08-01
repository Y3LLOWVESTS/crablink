//! Deterministic public pairing-request contract for a delegated CrabLink TV.
//!
//! The request contains public device material only. It does not sign,
//! approve, consume, persist, or issue an authorization or capability.

use serde::Serialize;

pub const TV_PASSPORT_PAIRING_REQUEST_SCHEMA: &str = "crablink.tv.passport-pairing-request.v1";

pub const TV_PASSPORT_PAIRING_DEVICE_CLASS: &str = "tv_read_only";

pub const TV_PASSPORT_PAIRING_KEY_ALGORITHM: &str = "ed25519";

pub const TV_PASSPORT_PAIRING_AUTHORIZATION_MODE: &str = "root-signed-device-authorization";

pub const TV_PASSPORT_PAIRING_APPROVAL_STATE: &str = "pending_external_root_admin";

pub const TV_PASSPORT_PAIRING_TTL_MAX_MS: u64 = 5 * 60 * 1_000;

pub const TV_PASSPORT_PAIRING_PUBLIC_KEY_HEX_LENGTH: usize = 64;

pub const TV_PASSPORT_PAIRING_NONCE_HEX_LENGTH: usize = 64;

pub const TV_PASSPORT_PAIRING_READ_SCOPES: [&str; 7] = [
    "identity.read",
    "catalog.read",
    "content.read",
    "entitlement.read",
    "receipts.read",
    "confirmed_roc.read",
    "capability.revoke_self",
];

const PAIRING_TRANSCRIPT_DOMAIN: &[u8] = b"crablink.tv.passport-pairing-request.transcript.v1";

const SHORT_CODE_ALPHABET: &[u8; 32] = b"ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TvPassportPairingRequestV1 {
    pub schema: &'static str,
    pub pairing_request_id: String,
    pub device_public_key_hex: String,
    pub device_class: &'static str,
    pub key_algorithm: &'static str,
    pub requested_scopes: Vec<&'static str>,
    pub nonce_hex: String,
    pub issued_at_ms: u64,
    pub expires_at_ms: u64,
    pub short_verification_code: String,
    pub short_code_is_authority: bool,
    pub authorization_mode: &'static str,
    pub root_admin_authorization_required: bool,
    pub companion_passport_pairing_required: bool,
    pub approval_state: &'static str,
    pub authorization_present: bool,
    pub session_present: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TvPassportPairingRequestReviewError {
    PublicKeyInvalid,
    NonceInvalid,
    IssuedAtInvalid,
    ExpiryInvalid,
    ExpiryTooFar,
    SchemaMismatch,
    RequestIdMismatch,
    DeviceClassMismatch,
    KeyAlgorithmMismatch,
    ScopeSetMismatch,
    ShortCodeMismatch,
    ShortCodeAuthorityMismatch,
    AuthorizationModeMismatch,
    RootAdminRequirementMismatch,
    CompanionPairingRequirementMismatch,
    ApprovalStateMismatch,
    AuthorizationStateMismatch,
    SessionStateMismatch,
}

pub fn build_tv_passport_pairing_request(
    device_public_key_hex: &str,
    nonce_hex: &str,
    issued_at_ms: u64,
    expires_at_ms: u64,
) -> Result<TvPassportPairingRequestV1, TvPassportPairingRequestReviewError> {
    validate_public_inputs(
        device_public_key_hex,
        nonce_hex,
        issued_at_ms,
        expires_at_ms,
    )?;

    let digest = pairing_request_digest(
        device_public_key_hex,
        nonce_hex,
        issued_at_ms,
        expires_at_ms,
    );

    Ok(TvPassportPairingRequestV1 {
        schema: TV_PASSPORT_PAIRING_REQUEST_SCHEMA,
        pairing_request_id: format!("b3:{}", digest.to_hex()),
        device_public_key_hex: device_public_key_hex.to_string(),
        device_class: TV_PASSPORT_PAIRING_DEVICE_CLASS,
        key_algorithm: TV_PASSPORT_PAIRING_KEY_ALGORITHM,
        requested_scopes: TV_PASSPORT_PAIRING_READ_SCOPES.to_vec(),
        nonce_hex: nonce_hex.to_string(),
        issued_at_ms,
        expires_at_ms,
        short_verification_code: short_code_from_digest(&digest),
        short_code_is_authority: false,
        authorization_mode: TV_PASSPORT_PAIRING_AUTHORIZATION_MODE,
        root_admin_authorization_required: true,
        companion_passport_pairing_required: false,
        approval_state: TV_PASSPORT_PAIRING_APPROVAL_STATE,
        authorization_present: false,
        session_present: false,
    })
}

pub fn review_tv_passport_pairing_request(
    request: &TvPassportPairingRequestV1,
) -> Result<(), TvPassportPairingRequestReviewError> {
    validate_public_inputs(
        &request.device_public_key_hex,
        &request.nonce_hex,
        request.issued_at_ms,
        request.expires_at_ms,
    )?;

    if request.schema != TV_PASSPORT_PAIRING_REQUEST_SCHEMA {
        return Err(TvPassportPairingRequestReviewError::SchemaMismatch);
    }

    if request.device_class != TV_PASSPORT_PAIRING_DEVICE_CLASS {
        return Err(TvPassportPairingRequestReviewError::DeviceClassMismatch);
    }

    if request.key_algorithm != TV_PASSPORT_PAIRING_KEY_ALGORITHM {
        return Err(TvPassportPairingRequestReviewError::KeyAlgorithmMismatch);
    }

    if request.requested_scopes.as_slice() != TV_PASSPORT_PAIRING_READ_SCOPES {
        return Err(TvPassportPairingRequestReviewError::ScopeSetMismatch);
    }

    if request.short_code_is_authority {
        return Err(TvPassportPairingRequestReviewError::ShortCodeAuthorityMismatch);
    }

    if request.authorization_mode != TV_PASSPORT_PAIRING_AUTHORIZATION_MODE {
        return Err(TvPassportPairingRequestReviewError::AuthorizationModeMismatch);
    }

    if !request.root_admin_authorization_required {
        return Err(TvPassportPairingRequestReviewError::RootAdminRequirementMismatch);
    }

    if request.companion_passport_pairing_required {
        return Err(TvPassportPairingRequestReviewError::CompanionPairingRequirementMismatch);
    }

    if request.approval_state != TV_PASSPORT_PAIRING_APPROVAL_STATE {
        return Err(TvPassportPairingRequestReviewError::ApprovalStateMismatch);
    }

    if request.authorization_present {
        return Err(TvPassportPairingRequestReviewError::AuthorizationStateMismatch);
    }

    if request.session_present {
        return Err(TvPassportPairingRequestReviewError::SessionStateMismatch);
    }

    let digest = pairing_request_digest(
        &request.device_public_key_hex,
        &request.nonce_hex,
        request.issued_at_ms,
        request.expires_at_ms,
    );

    if request.pairing_request_id != format!("b3:{}", digest.to_hex()) {
        return Err(TvPassportPairingRequestReviewError::RequestIdMismatch);
    }

    if request.short_verification_code != short_code_from_digest(&digest) {
        return Err(TvPassportPairingRequestReviewError::ShortCodeMismatch);
    }

    Ok(())
}

fn validate_public_inputs(
    device_public_key_hex: &str,
    nonce_hex: &str,
    issued_at_ms: u64,
    expires_at_ms: u64,
) -> Result<(), TvPassportPairingRequestReviewError> {
    if !is_lower_hex(
        device_public_key_hex,
        TV_PASSPORT_PAIRING_PUBLIC_KEY_HEX_LENGTH,
    ) {
        return Err(TvPassportPairingRequestReviewError::PublicKeyInvalid);
    }

    if !is_lower_hex(nonce_hex, TV_PASSPORT_PAIRING_NONCE_HEX_LENGTH) {
        return Err(TvPassportPairingRequestReviewError::NonceInvalid);
    }

    if issued_at_ms == 0 {
        return Err(TvPassportPairingRequestReviewError::IssuedAtInvalid);
    }

    let lifetime = expires_at_ms
        .checked_sub(issued_at_ms)
        .ok_or(TvPassportPairingRequestReviewError::ExpiryInvalid)?;

    if lifetime == 0 {
        return Err(TvPassportPairingRequestReviewError::ExpiryInvalid);
    }

    if lifetime > TV_PASSPORT_PAIRING_TTL_MAX_MS {
        return Err(TvPassportPairingRequestReviewError::ExpiryTooFar);
    }

    Ok(())
}

fn is_lower_hex(value: &str, expected_length: usize) -> bool {
    value.len() == expected_length
        && value
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
}

fn pairing_request_digest(
    device_public_key_hex: &str,
    nonce_hex: &str,
    issued_at_ms: u64,
    expires_at_ms: u64,
) -> blake3::Hash {
    let mut transcript = Vec::new();

    push_transcript_field(&mut transcript, PAIRING_TRANSCRIPT_DOMAIN);

    push_transcript_field(
        &mut transcript,
        TV_PASSPORT_PAIRING_REQUEST_SCHEMA.as_bytes(),
    );

    push_transcript_field(&mut transcript, TV_PASSPORT_PAIRING_DEVICE_CLASS.as_bytes());

    push_transcript_field(
        &mut transcript,
        TV_PASSPORT_PAIRING_KEY_ALGORITHM.as_bytes(),
    );

    push_transcript_field(&mut transcript, device_public_key_hex.as_bytes());

    push_transcript_field(&mut transcript, nonce_hex.as_bytes());

    push_transcript_field(
        &mut transcript,
        TV_PASSPORT_PAIRING_AUTHORIZATION_MODE.as_bytes(),
    );

    for scope in TV_PASSPORT_PAIRING_READ_SCOPES {
        push_transcript_field(&mut transcript, scope.as_bytes());
    }

    transcript.extend_from_slice(&issued_at_ms.to_be_bytes());

    transcript.extend_from_slice(&expires_at_ms.to_be_bytes());

    transcript.push(1);
    transcript.push(0);
    transcript.push(0);
    transcript.push(0);

    blake3::hash(&transcript)
}

fn push_transcript_field(transcript: &mut Vec<u8>, value: &[u8]) {
    let length = u32::try_from(value.len()).expect("pairing transcript field is bounded");

    transcript.extend_from_slice(&length.to_be_bytes());

    transcript.extend_from_slice(value);
}

fn short_code_from_digest(digest: &blake3::Hash) -> String {
    let bytes = digest.as_bytes();

    let value = u32::from_be_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]) >> 2;

    let mut output = String::with_capacity(6);

    for shift in (0_u32..6).rev() {
        let index = ((value >> (shift * 5)) & 31) as usize;

        output.push(char::from(SHORT_CODE_ALPHABET[index]));
    }

    output
}

#[cfg(test)]
mod tests {
    use super::*;

    const ISSUED_AT_MS: u64 = 1_800_000_000_000;

    fn public_key() -> String {
        "11".repeat(32)
    }

    fn nonce() -> String {
        "22".repeat(32)
    }

    fn request() -> TvPassportPairingRequestV1 {
        build_tv_passport_pairing_request(
            &public_key(),
            &nonce(),
            ISSUED_AT_MS,
            ISSUED_AT_MS + TV_PASSPORT_PAIRING_TTL_MAX_MS,
        )
        .expect("valid public pairing request")
    }

    #[test]
    fn phase16c1_builds_deterministic_public_pairing_request() {
        let first = request();
        let second = request();

        assert_eq!(first, second);
        assert_eq!(first.schema, TV_PASSPORT_PAIRING_REQUEST_SCHEMA,);
        assert_eq!(first.device_class, "tv_read_only",);
        assert_eq!(first.authorization_mode, "root-signed-device-authorization",);
        assert_eq!(first.requested_scopes, TV_PASSPORT_PAIRING_READ_SCOPES,);
        assert!(first.root_admin_authorization_required);
        assert!(!first.companion_passport_pairing_required);
        assert!(!first.short_code_is_authority);
        assert!(!first.authorization_present);
        assert!(!first.session_present);
        assert!(first.pairing_request_id.starts_with("b3:"),);
        assert_eq!(first.short_verification_code.len(), 6,);

        review_tv_passport_pairing_request(&first).expect("request must review");
    }

    #[test]
    fn phase16c1_distinct_nonce_changes_request_id_and_short_code() {
        let first = request();

        let second = build_tv_passport_pairing_request(
            &public_key(),
            &"33".repeat(32),
            ISSUED_AT_MS,
            ISSUED_AT_MS + TV_PASSPORT_PAIRING_TTL_MAX_MS,
        )
        .expect("second request");

        assert_ne!(first.pairing_request_id, second.pairing_request_id,);

        assert_ne!(
            first.short_verification_code,
            second.short_verification_code,
        );
    }

    #[test]
    fn phase16c1_rejects_bad_public_key_nonce_and_expiry() {
        assert_eq!(
            build_tv_passport_pairing_request("ABC", &nonce(), ISSUED_AT_MS, ISSUED_AT_MS + 1,)
                .err(),
            Some(TvPassportPairingRequestReviewError::PublicKeyInvalid,),
        );

        assert_eq!(
            build_tv_passport_pairing_request(
                &public_key(),
                "not-a-nonce",
                ISSUED_AT_MS,
                ISSUED_AT_MS + 1,
            )
            .err(),
            Some(TvPassportPairingRequestReviewError::NonceInvalid,),
        );

        assert_eq!(
            build_tv_passport_pairing_request(&public_key(), &nonce(), ISSUED_AT_MS, ISSUED_AT_MS,)
                .err(),
            Some(TvPassportPairingRequestReviewError::ExpiryInvalid,),
        );

        assert_eq!(
            build_tv_passport_pairing_request(
                &public_key(),
                &nonce(),
                ISSUED_AT_MS,
                ISSUED_AT_MS + TV_PASSPORT_PAIRING_TTL_MAX_MS + 1,
            )
            .err(),
            Some(TvPassportPairingRequestReviewError::ExpiryTooFar,),
        );
    }

    #[test]
    fn phase16c1_rejects_mismatched_request_fields() {
        let mut wrong_id = request();
        wrong_id.pairing_request_id = format!("b3:{}", "00".repeat(32));

        assert_eq!(
            review_tv_passport_pairing_request(&wrong_id,),
            Err(TvPassportPairingRequestReviewError::RequestIdMismatch,),
        );

        let mut wrong_code = request();
        wrong_code.short_verification_code = String::from("AAAAAA");

        assert_eq!(
            review_tv_passport_pairing_request(&wrong_code,),
            Err(TvPassportPairingRequestReviewError::ShortCodeMismatch,),
        );

        let mut wrong_scope = request();
        wrong_scope.requested_scopes = vec!["wallet.spend"];

        assert_eq!(
            review_tv_passport_pairing_request(&wrong_scope,),
            Err(TvPassportPairingRequestReviewError::ScopeSetMismatch,),
        );

        let mut self_approved = request();
        self_approved.authorization_present = true;

        assert_eq!(
            review_tv_passport_pairing_request(&self_approved,),
            Err(TvPassportPairingRequestReviewError::AuthorizationStateMismatch,),
        );
    }

    #[test]
    fn phase16c1_serialization_contains_public_material_only() {
        let serialized = serde_json::to_string(&request()).expect("request serializes");

        for forbidden in [
            "\"recoveryPhrase\"",
            "\"recoveryRoot\"",
            "\"rootPrivateKey\"",
            "\"rootAdminKey\"",
            "\"devicePrivateKey\"",
            "\"privateKey\"",
            "\"rawCapability\"",
            "\"walletAuthority\"",
            "\"ledgerAuthority\"",
        ] {
            assert!(
                !serialized.contains(forbidden),
                "public request leaked {forbidden}",
            );
        }

        assert!(serialized.contains("\"rootAdminAuthorizationRequired\":true",),);

        assert!(serialized.contains("\"companionPassportPairingRequired\":false",),);

        assert!(serialized.contains("\"shortCodeIsAuthority\":false",),);

        assert!(serialized.contains("\"authorizationPresent\":false",),);

        assert!(serialized.contains("\"sessionPresent\":false",),);
    }
}
