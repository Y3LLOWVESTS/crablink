//! Root-signed delegated-device authorization review for CrabLink TV.
//!
//! This module verifies an authorization created by the existing Passport root
//! authority. It never signs as the root, accesses root secret material,
//! creates capabilities, starts a session, or approves its own pairing request.

#![forbid(unsafe_code)]

use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use serde::{Deserialize, Serialize};

use crate::tv_passport_pairing::{
    review_tv_passport_pairing_request, TvPassportPairingRequestV1,
    TV_PASSPORT_PAIRING_AUTHORIZATION_MODE, TV_PASSPORT_PAIRING_DEVICE_CLASS,
    TV_PASSPORT_PAIRING_KEY_ALGORITHM, TV_PASSPORT_PAIRING_NONCE_HEX_LENGTH,
    TV_PASSPORT_PAIRING_PUBLIC_KEY_HEX_LENGTH, TV_PASSPORT_PAIRING_READ_SCOPES,
};

pub const TV_PASSPORT_ROOT_AUTHORIZATION_SCHEMA: &str = "crablink.tv.root-device-authorization.v1";

pub const TV_PASSPORT_ROOT_AUTHORIZATION_STATE: &str = "root_authorization_verified";

pub const TV_PASSPORT_ROOT_SIGNATURE_HEX_LENGTH: usize = 128;

pub const TV_PASSPORT_AUTHORIZATION_ID_PREFIX: &str = "b3:";

pub const MAX_TV_PASSPORT_ID_BYTES: usize = 192;

const ROOT_AUTHORIZATION_TRANSCRIPT_DOMAIN: &[u8] =
    b"crablink.tv.root-device-authorization.transcript.v1";

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct TvPassportRootAuthorizationV1 {
    pub schema: String,
    pub authorization_id: String,
    pub authorization_mode: String,
    pub pairing_request_id: String,
    pub passport_id: String,
    pub root_public_key_hex: String,
    pub device_public_key_hex: String,
    pub device_class: String,
    pub key_algorithm: String,
    pub allowed_scopes: Vec<String>,
    pub nonce_hex: String,
    pub root_epoch: u64,
    pub issued_at_ms: u64,
    pub expires_at_ms: u64,
    pub root_admin_authorization_required: bool,
    pub companion_passport_pairing_required: bool,
    pub can_unlock_root: bool,
    pub can_authorize_devices: bool,
    pub can_issue_capabilities: bool,
    pub can_mutate_wallet_or_ledger: bool,
    pub root_signature_hex: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReviewedTvPassportRootAuthorizationV1 {
    pub schema: &'static str,
    pub state: &'static str,
    pub authorization_id: String,
    pub pairing_request_id: String,
    pub passport_id: String,
    pub allowed_scopes: Vec<String>,
    pub root_epoch: u64,
    pub issued_at_ms: u64,
    pub expires_at_ms: u64,
    pub root_signature_verified: bool,
    pub replay_consumed: bool,
    pub device_public_key_bound: bool,
    pub session_present: bool,
    pub capability_present: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TvPassportPairingReplayConsumeOutcome {
    Consumed,
    AlreadyConsumed,
    Unavailable,
}

pub trait TvPassportPairingReplayStore {
    fn consume_pairing_request_once(
        &self,
        pairing_request_id: &str,
    ) -> TvPassportPairingReplayConsumeOutcome;
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TvPassportRootAuthorizationReviewError {
    PairingRequestInvalid,
    PairingRequestNotYetValid,
    PairingRequestExpired,
    PassportIdInvalid,
    ExpectedRootPublicKeyInvalid,
    SchemaMismatch,
    AuthorizationModeMismatch,
    PairingRequestIdMismatch,
    PassportMismatch,
    RootPublicKeyMismatch,
    DevicePublicKeyMismatch,
    DeviceClassMismatch,
    KeyAlgorithmMismatch,
    ScopeSetMismatch,
    NonceMismatch,
    RootEpochInvalid,
    IssuedAtInvalid,
    AuthorizationNotYetValid,
    ExpiryInvalid,
    AuthorizationExpired,
    AuthorizationExceedsRequestExpiry,
    RootAdminRequirementMismatch,
    CompanionPairingRequirementMismatch,
    UnsafeAuthorityFlag,
    AuthorizationIdMismatch,
    RootSignatureMalformed,
    RootSignatureInvalid,
    ReplayDetected,
    ReplayStoreUnavailable,
}

pub fn tv_passport_root_authorization_signing_bytes(
    authorization: &TvPassportRootAuthorizationV1,
) -> Result<Vec<u8>, TvPassportRootAuthorizationReviewError> {
    validate_authorization_shape(authorization)?;

    let mut transcript = Vec::new();

    push_transcript_field(&mut transcript, ROOT_AUTHORIZATION_TRANSCRIPT_DOMAIN);

    push_transcript_field(&mut transcript, authorization.schema.as_bytes());

    push_transcript_field(&mut transcript, authorization.authorization_mode.as_bytes());

    push_transcript_field(&mut transcript, authorization.pairing_request_id.as_bytes());

    push_transcript_field(&mut transcript, authorization.passport_id.as_bytes());

    push_transcript_field(
        &mut transcript,
        authorization.root_public_key_hex.as_bytes(),
    );

    push_transcript_field(
        &mut transcript,
        authorization.device_public_key_hex.as_bytes(),
    );

    push_transcript_field(&mut transcript, authorization.device_class.as_bytes());

    push_transcript_field(&mut transcript, authorization.key_algorithm.as_bytes());

    push_transcript_field(&mut transcript, authorization.nonce_hex.as_bytes());

    for scope in &authorization.allowed_scopes {
        push_transcript_field(&mut transcript, scope.as_bytes());
    }

    transcript.extend_from_slice(&authorization.root_epoch.to_be_bytes());

    transcript.extend_from_slice(&authorization.issued_at_ms.to_be_bytes());

    transcript.extend_from_slice(&authorization.expires_at_ms.to_be_bytes());

    transcript.push(u8::from(authorization.root_admin_authorization_required));

    transcript.push(u8::from(authorization.companion_passport_pairing_required));

    transcript.push(u8::from(authorization.can_unlock_root));

    transcript.push(u8::from(authorization.can_authorize_devices));

    transcript.push(u8::from(authorization.can_issue_capabilities));

    transcript.push(u8::from(authorization.can_mutate_wallet_or_ledger));

    Ok(transcript)
}

pub fn tv_passport_root_authorization_id(
    authorization: &TvPassportRootAuthorizationV1,
) -> Result<String, TvPassportRootAuthorizationReviewError> {
    let transcript = tv_passport_root_authorization_signing_bytes(authorization)?;

    Ok(format!(
        "{TV_PASSPORT_AUTHORIZATION_ID_PREFIX}{}",
        blake3::hash(&transcript,).to_hex(),
    ))
}

pub fn review_and_consume_tv_passport_root_authorization<ReplayStore>(
    request: &TvPassportPairingRequestV1,
    authorization: &TvPassportRootAuthorizationV1,
    expected_passport_id: &str,
    expected_root_public_key_hex: &str,
    now_ms: u64,
    replay_store: &ReplayStore,
) -> Result<ReviewedTvPassportRootAuthorizationV1, TvPassportRootAuthorizationReviewError>
where
    ReplayStore: TvPassportPairingReplayStore,
{
    review_tv_passport_pairing_request(request)
        .map_err(|_| TvPassportRootAuthorizationReviewError::PairingRequestInvalid)?;

    if now_ms < request.issued_at_ms {
        return Err(TvPassportRootAuthorizationReviewError::PairingRequestNotYetValid);
    }

    if now_ms >= request.expires_at_ms {
        return Err(TvPassportRootAuthorizationReviewError::PairingRequestExpired);
    }

    validate_expected_passport_id(expected_passport_id)?;

    if !is_lower_hex(
        expected_root_public_key_hex,
        TV_PASSPORT_PAIRING_PUBLIC_KEY_HEX_LENGTH,
    ) {
        return Err(TvPassportRootAuthorizationReviewError::ExpectedRootPublicKeyInvalid);
    }

    validate_authorization_shape(authorization)?;

    if authorization.pairing_request_id != request.pairing_request_id {
        return Err(TvPassportRootAuthorizationReviewError::PairingRequestIdMismatch);
    }

    if authorization.passport_id != expected_passport_id {
        return Err(TvPassportRootAuthorizationReviewError::PassportMismatch);
    }

    if authorization.root_public_key_hex != expected_root_public_key_hex {
        return Err(TvPassportRootAuthorizationReviewError::RootPublicKeyMismatch);
    }

    if authorization.device_public_key_hex != request.device_public_key_hex {
        return Err(TvPassportRootAuthorizationReviewError::DevicePublicKeyMismatch);
    }

    if authorization.device_class != request.device_class {
        return Err(TvPassportRootAuthorizationReviewError::DeviceClassMismatch);
    }

    if authorization.key_algorithm != request.key_algorithm {
        return Err(TvPassportRootAuthorizationReviewError::KeyAlgorithmMismatch);
    }

    if !scopes_match_request(&authorization.allowed_scopes, &request.requested_scopes) {
        return Err(TvPassportRootAuthorizationReviewError::ScopeSetMismatch);
    }

    if authorization.nonce_hex != request.nonce_hex {
        return Err(TvPassportRootAuthorizationReviewError::NonceMismatch);
    }

    if authorization.issued_at_ms < request.issued_at_ms {
        return Err(TvPassportRootAuthorizationReviewError::IssuedAtInvalid);
    }

    if authorization.issued_at_ms > now_ms {
        return Err(TvPassportRootAuthorizationReviewError::AuthorizationNotYetValid);
    }

    if authorization.expires_at_ms <= authorization.issued_at_ms {
        return Err(TvPassportRootAuthorizationReviewError::ExpiryInvalid);
    }

    if authorization.expires_at_ms > request.expires_at_ms {
        return Err(TvPassportRootAuthorizationReviewError::AuthorizationExceedsRequestExpiry);
    }

    if now_ms >= authorization.expires_at_ms {
        return Err(TvPassportRootAuthorizationReviewError::AuthorizationExpired);
    }

    let expected_authorization_id = tv_passport_root_authorization_id(authorization)?;

    if authorization.authorization_id != expected_authorization_id {
        return Err(TvPassportRootAuthorizationReviewError::AuthorizationIdMismatch);
    }

    let root_public_key_bytes = decode_lower_hex::<32>(&authorization.root_public_key_hex)
        .ok_or(TvPassportRootAuthorizationReviewError::ExpectedRootPublicKeyInvalid)?;

    let root_signature_bytes = decode_lower_hex::<64>(&authorization.root_signature_hex)
        .ok_or(TvPassportRootAuthorizationReviewError::RootSignatureMalformed)?;

    let verifying_key = VerifyingKey::from_bytes(&root_public_key_bytes)
        .map_err(|_| TvPassportRootAuthorizationReviewError::ExpectedRootPublicKeyInvalid)?;

    let signature = Signature::from_bytes(&root_signature_bytes);

    let transcript = tv_passport_root_authorization_signing_bytes(authorization)?;

    verifying_key
        .verify(&transcript, &signature)
        .map_err(|_| TvPassportRootAuthorizationReviewError::RootSignatureInvalid)?;

    match replay_store.consume_pairing_request_once(&authorization.pairing_request_id) {
        TvPassportPairingReplayConsumeOutcome::Consumed => {}
        TvPassportPairingReplayConsumeOutcome::AlreadyConsumed => {
            return Err(TvPassportRootAuthorizationReviewError::ReplayDetected);
        }
        TvPassportPairingReplayConsumeOutcome::Unavailable => {
            return Err(TvPassportRootAuthorizationReviewError::ReplayStoreUnavailable);
        }
    }

    Ok(ReviewedTvPassportRootAuthorizationV1 {
        schema: TV_PASSPORT_ROOT_AUTHORIZATION_SCHEMA,
        state: TV_PASSPORT_ROOT_AUTHORIZATION_STATE,
        authorization_id: authorization.authorization_id.clone(),
        pairing_request_id: authorization.pairing_request_id.clone(),
        passport_id: authorization.passport_id.clone(),
        allowed_scopes: authorization.allowed_scopes.clone(),
        root_epoch: authorization.root_epoch,
        issued_at_ms: authorization.issued_at_ms,
        expires_at_ms: authorization.expires_at_ms,
        root_signature_verified: true,
        replay_consumed: true,
        device_public_key_bound: true,
        session_present: false,
        capability_present: false,
    })
}

fn validate_authorization_shape(
    authorization: &TvPassportRootAuthorizationV1,
) -> Result<(), TvPassportRootAuthorizationReviewError> {
    if authorization.schema != TV_PASSPORT_ROOT_AUTHORIZATION_SCHEMA {
        return Err(TvPassportRootAuthorizationReviewError::SchemaMismatch);
    }

    if authorization.authorization_mode != TV_PASSPORT_PAIRING_AUTHORIZATION_MODE {
        return Err(TvPassportRootAuthorizationReviewError::AuthorizationModeMismatch);
    }

    validate_expected_passport_id(&authorization.passport_id)?;

    if !is_lower_hex(
        &authorization.root_public_key_hex,
        TV_PASSPORT_PAIRING_PUBLIC_KEY_HEX_LENGTH,
    ) {
        return Err(TvPassportRootAuthorizationReviewError::ExpectedRootPublicKeyInvalid);
    }

    if !is_lower_hex(
        &authorization.device_public_key_hex,
        TV_PASSPORT_PAIRING_PUBLIC_KEY_HEX_LENGTH,
    ) {
        return Err(TvPassportRootAuthorizationReviewError::DevicePublicKeyMismatch);
    }

    if authorization.device_class != TV_PASSPORT_PAIRING_DEVICE_CLASS {
        return Err(TvPassportRootAuthorizationReviewError::DeviceClassMismatch);
    }

    if authorization.key_algorithm != TV_PASSPORT_PAIRING_KEY_ALGORITHM {
        return Err(TvPassportRootAuthorizationReviewError::KeyAlgorithmMismatch);
    }

    if !scopes_are_locked(&authorization.allowed_scopes) {
        return Err(TvPassportRootAuthorizationReviewError::ScopeSetMismatch);
    }

    if !is_lower_hex(
        &authorization.nonce_hex,
        TV_PASSPORT_PAIRING_NONCE_HEX_LENGTH,
    ) {
        return Err(TvPassportRootAuthorizationReviewError::NonceMismatch);
    }

    if authorization.root_epoch == 0 {
        return Err(TvPassportRootAuthorizationReviewError::RootEpochInvalid);
    }

    if authorization.issued_at_ms == 0 {
        return Err(TvPassportRootAuthorizationReviewError::IssuedAtInvalid);
    }

    if authorization.expires_at_ms <= authorization.issued_at_ms {
        return Err(TvPassportRootAuthorizationReviewError::ExpiryInvalid);
    }

    if !authorization.root_admin_authorization_required {
        return Err(TvPassportRootAuthorizationReviewError::RootAdminRequirementMismatch);
    }

    if authorization.companion_passport_pairing_required {
        return Err(TvPassportRootAuthorizationReviewError::CompanionPairingRequirementMismatch);
    }

    if authorization.can_unlock_root
        || authorization.can_authorize_devices
        || authorization.can_issue_capabilities
        || authorization.can_mutate_wallet_or_ledger
    {
        return Err(TvPassportRootAuthorizationReviewError::UnsafeAuthorityFlag);
    }

    Ok(())
}

fn validate_expected_passport_id(
    value: &str,
) -> Result<(), TvPassportRootAuthorizationReviewError> {
    if value.is_empty()
        || value.len() > MAX_TV_PASSPORT_ID_BYTES
        || value.trim() != value
        || !value.is_ascii()
        || value.bytes().any(|byte| byte.is_ascii_control())
    {
        return Err(TvPassportRootAuthorizationReviewError::PassportIdInvalid);
    }

    Ok(())
}

fn scopes_are_locked(scopes: &[String]) -> bool {
    scopes.len() == TV_PASSPORT_PAIRING_READ_SCOPES.len()
        && scopes
            .iter()
            .zip(TV_PASSPORT_PAIRING_READ_SCOPES)
            .all(|(actual, expected)| actual == expected)
}

fn scopes_match_request(authorization_scopes: &[String], request_scopes: &[&str]) -> bool {
    authorization_scopes.len() == request_scopes.len()
        && authorization_scopes
            .iter()
            .zip(request_scopes)
            .all(|(authorization_scope, request_scope)| authorization_scope == request_scope)
}

fn is_lower_hex(value: &str, expected_length: usize) -> bool {
    value.len() == expected_length
        && value
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
}

fn decode_lower_hex<const N: usize>(value: &str) -> Option<[u8; N]> {
    if !is_lower_hex(value, N * 2) {
        return None;
    }

    let bytes = value.as_bytes();

    let mut output = [0_u8; N];

    for index in 0..N {
        let high = decode_hex_nibble(bytes[index * 2])?;

        let low = decode_hex_nibble(bytes[index * 2 + 1])?;

        output[index] = (high << 4) | low;
    }

    Some(output)
}

fn decode_hex_nibble(byte: u8) -> Option<u8> {
    match byte {
        b'0'..=b'9' => Some(byte - b'0'),
        b'a'..=b'f' => Some(byte - b'a' + 10),
        _ => None,
    }
}

fn push_transcript_field(transcript: &mut Vec<u8>, value: &[u8]) {
    let length = u32::try_from(value.len()).expect("authorization transcript field is bounded");

    transcript.extend_from_slice(&length.to_be_bytes());

    transcript.extend_from_slice(value);
}

#[cfg(test)]
mod tests {
    use std::{
        collections::HashSet,
        sync::{Arc, Mutex},
        thread,
    };

    use ed25519_dalek::{Signer, SigningKey};

    use super::*;
    use crate::tv_passport_pairing::{
        build_tv_passport_pairing_request, TV_PASSPORT_PAIRING_TTL_MAX_MS,
    };

    const ISSUED_AT_MS: u64 = 1_800_000_000_000;

    const NOW_MS: u64 = ISSUED_AT_MS + 10_000;

    const PASSPORT_ID: &str = "passport:v1:test:ed25519:b3:phase16c2";

    #[derive(Default)]
    struct MemoryReplayStore {
        consumed: Mutex<HashSet<String>>,
        unavailable: bool,
    }

    impl TvPassportPairingReplayStore for MemoryReplayStore {
        fn consume_pairing_request_once(
            &self,
            pairing_request_id: &str,
        ) -> TvPassportPairingReplayConsumeOutcome {
            if self.unavailable {
                return TvPassportPairingReplayConsumeOutcome::Unavailable;
            }

            let mut consumed = self.consumed.lock().expect("test replay lock");

            if !consumed.insert(pairing_request_id.to_string()) {
                return TvPassportPairingReplayConsumeOutcome::AlreadyConsumed;
            }

            TvPassportPairingReplayConsumeOutcome::Consumed
        }
    }

    fn signing_key() -> SigningKey {
        SigningKey::from_bytes(&[7_u8; 32])
    }

    fn device_public_key_hex() -> String {
        "11".repeat(32)
    }

    fn nonce_hex() -> String {
        "22".repeat(32)
    }

    fn request() -> TvPassportPairingRequestV1 {
        build_tv_passport_pairing_request(
            &device_public_key_hex(),
            &nonce_hex(),
            ISSUED_AT_MS,
            ISSUED_AT_MS + TV_PASSPORT_PAIRING_TTL_MAX_MS,
        )
        .expect("valid pairing request")
    }

    fn signed_authorization(request: &TvPassportPairingRequestV1) -> TvPassportRootAuthorizationV1 {
        let signing_key = signing_key();

        let root_public_key_hex = encode_hex(signing_key.verifying_key().as_bytes());

        let mut authorization = TvPassportRootAuthorizationV1 {
            schema: TV_PASSPORT_ROOT_AUTHORIZATION_SCHEMA.to_string(),
            authorization_id: String::new(),
            authorization_mode: TV_PASSPORT_PAIRING_AUTHORIZATION_MODE.to_string(),
            pairing_request_id: request.pairing_request_id.clone(),
            passport_id: PASSPORT_ID.to_string(),
            root_public_key_hex,
            device_public_key_hex: request.device_public_key_hex.clone(),
            device_class: request.device_class.to_string(),
            key_algorithm: request.key_algorithm.to_string(),
            allowed_scopes: request
                .requested_scopes
                .iter()
                .map(|scope| (*scope).to_string())
                .collect(),
            nonce_hex: request.nonce_hex.clone(),
            root_epoch: 1,
            issued_at_ms: ISSUED_AT_MS + 1_000,
            expires_at_ms: ISSUED_AT_MS + TV_PASSPORT_PAIRING_TTL_MAX_MS,
            root_admin_authorization_required: true,
            companion_passport_pairing_required: false,
            can_unlock_root: false,
            can_authorize_devices: false,
            can_issue_capabilities: false,
            can_mutate_wallet_or_ledger: false,
            root_signature_hex: "00".repeat(64),
        };

        let transcript = tv_passport_root_authorization_signing_bytes(&authorization)
            .expect("authorization transcript");

        authorization.authorization_id = format!(
            "{TV_PASSPORT_AUTHORIZATION_ID_PREFIX}{}",
            blake3::hash(&transcript,).to_hex(),
        );

        authorization.root_signature_hex = encode_hex(&signing_key.sign(&transcript).to_bytes());

        authorization
    }

    fn expected_root_public_key_hex() -> String {
        encode_hex(signing_key().verifying_key().as_bytes())
    }

    fn encode_hex(bytes: &[u8]) -> String {
        const HEX: &[u8; 16] = b"0123456789abcdef";

        let mut output = String::with_capacity(bytes.len() * 2);

        for byte in bytes {
            output.push(char::from(HEX[usize::from(byte >> 4)]));

            output.push(char::from(HEX[usize::from(byte & 0x0f)]));
        }

        output
    }

    #[test]
    fn phase16c2_accepts_valid_root_authorization_once() {
        let request = request();

        let authorization = signed_authorization(&request);

        let replay_store = MemoryReplayStore::default();

        let reviewed = review_and_consume_tv_passport_root_authorization(
            &request,
            &authorization,
            PASSPORT_ID,
            &expected_root_public_key_hex(),
            NOW_MS,
            &replay_store,
        )
        .expect("valid root authorization");

        assert_eq!(reviewed.state, "root_authorization_verified",);

        assert!(reviewed.root_signature_verified,);

        assert!(reviewed.replay_consumed,);

        assert!(reviewed.device_public_key_bound,);

        assert!(!reviewed.session_present,);

        assert!(!reviewed.capability_present,);
    }

    #[test]
    fn phase16c2_rejects_replay_after_atomic_consumption() {
        let request = request();

        let authorization = signed_authorization(&request);

        let replay_store = MemoryReplayStore::default();

        review_and_consume_tv_passport_root_authorization(
            &request,
            &authorization,
            PASSPORT_ID,
            &expected_root_public_key_hex(),
            NOW_MS,
            &replay_store,
        )
        .expect("first review");

        assert_eq!(
            review_and_consume_tv_passport_root_authorization(
                &request,
                &authorization,
                PASSPORT_ID,
                &expected_root_public_key_hex(),
                NOW_MS,
                &replay_store,
            ),
            Err(TvPassportRootAuthorizationReviewError::ReplayDetected,),
        );
    }

    #[test]
    fn phase16c2_concurrent_duplicate_accepts_at_most_one() {
        let request = request();

        let authorization = signed_authorization(&request);

        let replay_store = Arc::new(MemoryReplayStore::default());

        let mut workers = Vec::new();

        for _ in 0..8 {
            let request = request.clone();

            let authorization = authorization.clone();

            let replay_store = Arc::clone(&replay_store);

            workers.push(thread::spawn(move || {
                review_and_consume_tv_passport_root_authorization(
                    &request,
                    &authorization,
                    PASSPORT_ID,
                    &expected_root_public_key_hex(),
                    NOW_MS,
                    replay_store.as_ref(),
                )
            }));
        }

        let results: Vec<_> = workers
            .into_iter()
            .map(|worker| worker.join().expect("review worker"))
            .collect();

        assert_eq!(results.iter().filter(|result| result.is_ok(),).count(), 1,);

        assert_eq!(
            results
                .iter()
                .filter(|result| {
                    matches!(
                        result,
                        Err(TvPassportRootAuthorizationReviewError::ReplayDetected)
                    )
                },)
                .count(),
            7,
        );
    }

    #[test]
    fn phase16c2_rejects_signature_and_root_key_mismatch() {
        let request = request();

        let replay_store = MemoryReplayStore::default();

        let mut bad_signature = signed_authorization(&request);

        bad_signature.root_signature_hex.replace_range(0..2, "ff");

        assert_eq!(
            review_and_consume_tv_passport_root_authorization(
                &request,
                &bad_signature,
                PASSPORT_ID,
                &expected_root_public_key_hex(),
                NOW_MS,
                &replay_store,
            ),
            Err(TvPassportRootAuthorizationReviewError::RootSignatureInvalid,),
        );

        let authorization = signed_authorization(&request);

        assert_eq!(
            review_and_consume_tv_passport_root_authorization(
                &request,
                &authorization,
                PASSPORT_ID,
                &"44".repeat(32),
                NOW_MS,
                &replay_store,
            ),
            Err(TvPassportRootAuthorizationReviewError::RootPublicKeyMismatch,),
        );
    }

    #[test]
    fn phase16c2_rejects_bound_field_mismatches() {
        let request = request();

        let replay_store = MemoryReplayStore::default();

        let mut wrong_device = signed_authorization(&request);

        wrong_device.device_public_key_hex = "33".repeat(32);

        assert_eq!(
            review_and_consume_tv_passport_root_authorization(
                &request,
                &wrong_device,
                PASSPORT_ID,
                &expected_root_public_key_hex(),
                NOW_MS,
                &replay_store,
            ),
            Err(TvPassportRootAuthorizationReviewError::DevicePublicKeyMismatch,),
        );

        let mut wrong_nonce = signed_authorization(&request);

        wrong_nonce.nonce_hex = "55".repeat(32);

        assert_eq!(
            review_and_consume_tv_passport_root_authorization(
                &request,
                &wrong_nonce,
                PASSPORT_ID,
                &expected_root_public_key_hex(),
                NOW_MS,
                &replay_store,
            ),
            Err(TvPassportRootAuthorizationReviewError::NonceMismatch,),
        );

        let mut wrong_scopes = signed_authorization(&request);

        wrong_scopes.allowed_scopes = vec!["wallet.spend".to_string()];

        assert_eq!(
            review_and_consume_tv_passport_root_authorization(
                &request,
                &wrong_scopes,
                PASSPORT_ID,
                &expected_root_public_key_hex(),
                NOW_MS,
                &replay_store,
            ),
            Err(TvPassportRootAuthorizationReviewError::ScopeSetMismatch,),
        );
    }

    #[test]
    fn phase16c2_rejects_expiry_unsafe_authority_and_unavailable_replay() {
        let request = request();

        let mut expired = signed_authorization(&request);

        expired.expires_at_ms = NOW_MS;

        assert_eq!(
            review_and_consume_tv_passport_root_authorization(
                &request,
                &expired,
                PASSPORT_ID,
                &expected_root_public_key_hex(),
                NOW_MS,
                &MemoryReplayStore::default(),
            ),
            Err(TvPassportRootAuthorizationReviewError::AuthorizationExpired,),
        );

        let mut unsafe_authority = signed_authorization(&request);

        unsafe_authority.can_authorize_devices = true;

        assert_eq!(
            review_and_consume_tv_passport_root_authorization(
                &request,
                &unsafe_authority,
                PASSPORT_ID,
                &expected_root_public_key_hex(),
                NOW_MS,
                &MemoryReplayStore::default(),
            ),
            Err(TvPassportRootAuthorizationReviewError::UnsafeAuthorityFlag,),
        );

        let unavailable_store = MemoryReplayStore {
            consumed: Mutex::new(HashSet::new()),
            unavailable: true,
        };

        assert_eq!(
            review_and_consume_tv_passport_root_authorization(
                &request,
                &signed_authorization(&request,),
                PASSPORT_ID,
                &expected_root_public_key_hex(),
                NOW_MS,
                &unavailable_store,
            ),
            Err(TvPassportRootAuthorizationReviewError::ReplayStoreUnavailable,),
        );
    }

    #[test]
    fn phase16c2_serialization_contains_no_private_material_or_fake_session() {
        let request = request();

        let authorization = signed_authorization(&request);

        let serialized = serde_json::to_string(&authorization).expect("authorization serializes");

        for forbidden in [
            "\"recoveryPhrase\"",
            "\"recoveryRoot\"",
            "\"rootPrivateKey\"",
            "\"rootAdminPrivateKey\"",
            "\"devicePrivateKey\"",
            "\"privateKey\"",
            "\"rawCapability\"",
            "\"walletAuthority\"",
            "\"ledgerAuthority\"",
            "\"sessionToken\"",
        ] {
            assert!(
                !serialized.contains(forbidden,),
                "authorization leaked {forbidden}",
            );
        }

        let reviewed = review_and_consume_tv_passport_root_authorization(
            &request,
            &authorization,
            PASSPORT_ID,
            &expected_root_public_key_hex(),
            NOW_MS,
            &MemoryReplayStore::default(),
        )
        .expect("reviewed authorization");

        let reviewed_serialized =
            serde_json::to_string(&reviewed).expect("reviewed authorization serializes");

        assert!(reviewed_serialized.contains("\"rootSignatureVerified\":true",),);

        assert!(reviewed_serialized.contains("\"replayConsumed\":true",),);

        assert!(reviewed_serialized.contains("\"sessionPresent\":false",),);

        assert!(reviewed_serialized.contains("\"capabilityPresent\":false",),);

        assert!(!reviewed_serialized.contains("rootSignatureHex",),);

        assert!(!reviewed_serialized.contains("rootPublicKeyHex",),);
    }
}
