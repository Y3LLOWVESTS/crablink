//! Holds the redacted delegated-authority runtime used by CrabLink TV.
//!
//! Stored public authority records pass through the strict Phase 16D1 reviewer
//! before the runtime retains a redacted snapshot. Production proof use remains
//! locked until Phase 16E provides native operational unlock.

#![forbid(unsafe_code)]

#[cfg(target_os = "android")]
use std::sync::{Mutex, OnceLock};

use serde::{Deserialize, Serialize};

use crate::passport_tv_delegated_authority::{
    review_stored_tv_delegated_authority_record, TvDelegatedAuthorityReviewError,
    TvDelegatedAuthorityReviewV1, TV_DELEGATED_AUTHORITY_STATE_AUTHORIZED_LOCKED,
    TV_DELEGATED_AUTHORITY_STATE_EXPIRED, TV_DELEGATED_AUTHORITY_STATE_REVOKED,
    TV_DELEGATED_PROOF_KEY_ALGORITHM, TV_DELEGATED_READ_SCOPES,
};

use crate::passport_tv_operational_unlock::TvOperationalUnlockGrant;

pub(crate) const TV_DELEGATED_AUTHORITY_RUNTIME_SCHEMA: &str =
    "crablink.tv.delegated-authority-runtime.v1";

pub(crate) const TV_DEVICE_PROOF_PORT_SCHEMA: &str = "crablink.tv.device-proof-port.v1";

const RUNTIME_STATE_ABSENT: &str = "absent";
const MAX_AUTHORITY_RECORD_JSON_BYTES: usize = 16 * 1_024;
const LOWER_HEX_ID_BYTES: usize = 64;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum TvAuthorityRuntimeError {
    AuthorityRecordRejected,
    AuthorityAbsent,
    AuthorityRevoked,
    AuthorityExpired,
    ScopeDenied,
    ProofRequestInvalid,
    ProofRequestBeyondAuthority,
    RuntimeLocked,
    ProofPortFailed,
    ProofReceiptInvalid,

    #[cfg(target_os = "android")]
    RuntimeUnavailable,
}

impl TvAuthorityRuntimeError {
    #[cfg(target_os = "android")]
    pub(crate) fn code(self) -> &'static str {
        match self {
            Self::AuthorityRecordRejected => "authority_record_rejected",

            Self::AuthorityAbsent => "authority_absent",

            Self::AuthorityRevoked => "authority_revoked",

            Self::AuthorityExpired => "authority_expired",

            Self::ScopeDenied => "proof_scope_denied",

            Self::ProofRequestInvalid => "proof_request_invalid",

            Self::ProofRequestBeyondAuthority => "proof_request_beyond_authority",

            Self::RuntimeLocked => "authority_runtime_locked",

            Self::ProofPortFailed => "device_proof_port_failed",

            Self::ProofReceiptInvalid => "device_proof_receipt_invalid",

            Self::RuntimeUnavailable => "authority_runtime_unavailable",
        }
    }
}

impl From<TvDelegatedAuthorityReviewError> for TvAuthorityRuntimeError {
    fn from(_: TvDelegatedAuthorityReviewError) -> Self {
        Self::AuthorityRecordRejected
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TvAuthorityRuntimeSnapshotV1 {
    pub schema: &'static str,

    pub state: &'static str,

    pub authority_present: bool,

    pub authorization_present: bool,

    pub capability_present: bool,

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

    pub operationally_unlocked: bool,

    pub device_proof_available: bool,

    pub raw_authorization_returned: bool,

    pub raw_capability_returned: bool,

    pub private_material_exported: bool,

    pub webview_secret_returned: bool,

    pub recovery_root_present: bool,

    pub root_admin_key_present: bool,

    pub session_present: bool,
}

impl TvAuthorityRuntimeSnapshotV1 {
    fn absent() -> Self {
        Self {
            schema: TV_DELEGATED_AUTHORITY_RUNTIME_SCHEMA,

            state: RUNTIME_STATE_ABSENT,

            authority_present: false,

            authorization_present: false,

            capability_present: false,

            device_bound: false,

            passport_bound: false,

            scope_count: 0,

            authorization_root_epoch: 0,

            authorization_expires_at_ms: 0,

            capability_expires_at_ms: 0,

            refresh_not_after_ms: 0,

            revocation_version: 0,

            revoked: false,

            proof_key_algorithm: TV_DELEGATED_PROOF_KEY_ALGORITHM,

            operationally_unlocked: false,

            device_proof_available: false,

            raw_authorization_returned: false,

            raw_capability_returned: false,

            private_material_exported: false,

            webview_secret_returned: false,

            recovery_root_present: false,

            root_admin_key_present: false,

            session_present: false,
        }
    }

    fn from_review(review: TvDelegatedAuthorityReviewV1) -> Self {
        Self {
            schema: TV_DELEGATED_AUTHORITY_RUNTIME_SCHEMA,

            state: review.state,

            authority_present: true,

            authorization_present: review.authorization_present,

            capability_present: review.capability_present,

            device_bound: review.device_bound,

            passport_bound: review.passport_bound,

            scope_count: review.scope_count,

            authorization_root_epoch: review.authorization_root_epoch,

            authorization_expires_at_ms: review.authorization_expires_at_ms,

            capability_expires_at_ms: review.capability_expires_at_ms,

            refresh_not_after_ms: review.refresh_not_after_ms,

            revocation_version: review.revocation_version,

            revoked: review.revoked,

            proof_key_algorithm: review.proof_key_algorithm,

            operationally_unlocked: false,

            device_proof_available: false,

            raw_authorization_returned: false,

            raw_capability_returned: false,

            private_material_exported: false,

            webview_secret_returned: false,

            recovery_root_present: false,

            root_admin_key_present: false,

            session_present: false,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct TvDeviceProofPortRequestV1 {
    pub schema: &'static str,

    pub request_id: String,

    pub scope: String,

    pub issued_at_ms: u64,

    pub expires_at_ms: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TvDeviceProofPortReceiptV1 {
    pub schema: &'static str,

    pub request_id: String,

    pub proof_created: bool,

    pub proof_key_algorithm: &'static str,

    pub proof_bytes: usize,

    pub raw_authorization_returned: bool,

    pub raw_capability_returned: bool,

    pub private_material_exported: bool,

    pub webview_secret_returned: bool,
}

pub(crate) trait TvDeviceProofPort {
    fn request_device_proof(
        &mut self,

        request: &TvDeviceProofPortRequestV1,
    ) -> Result<TvDeviceProofPortReceiptV1, TvAuthorityRuntimeError>;
}

#[derive(Debug)]
pub(crate) struct TvDelegatedAuthorityRuntime {
    snapshot: TvAuthorityRuntimeSnapshotV1,
}

impl Default for TvDelegatedAuthorityRuntime {
    fn default() -> Self {
        Self {
            snapshot: TvAuthorityRuntimeSnapshotV1::absent(),
        }
    }
}

impl TvDelegatedAuthorityRuntime {
    pub(crate) fn hydrate(
        &mut self,

        authority_record_json: &str,

        now_ms: u64,
    ) -> Result<TvAuthorityRuntimeSnapshotV1, TvAuthorityRuntimeError> {
        self.clear();

        let bindings = authority_bindings(authority_record_json)?;

        let review = review_stored_tv_delegated_authority_record(
            authority_record_json,
            &bindings.passport_id,
            &bindings.device_public_key_hex,
            now_ms,
        )?;

        self.snapshot = TvAuthorityRuntimeSnapshotV1::from_review(review);

        Ok(self.snapshot.clone())
    }

    pub(crate) fn clear(&mut self) -> TvAuthorityRuntimeSnapshotV1 {
        self.snapshot = TvAuthorityRuntimeSnapshotV1::absent();

        self.snapshot.clone()
    }

    pub(crate) fn snapshot(&self) -> TvAuthorityRuntimeSnapshotV1 {
        self.snapshot.clone()
    }

    pub(crate) fn request_device_proof<P: TvDeviceProofPort>(
        &self,

        request: &TvDeviceProofPortRequestV1,

        now_ms: u64,

        port: &mut P,
    ) -> Result<TvDeviceProofPortReceiptV1, TvAuthorityRuntimeError> {
        validate_proof_request(request, now_ms)?;

        let snapshot = &self.snapshot;

        if !snapshot.authority_present {
            return Err(TvAuthorityRuntimeError::AuthorityAbsent);
        }

        if snapshot.revoked || snapshot.state == TV_DELEGATED_AUTHORITY_STATE_REVOKED {
            return Err(TvAuthorityRuntimeError::AuthorityRevoked);
        }

        if snapshot.state == TV_DELEGATED_AUTHORITY_STATE_EXPIRED
            || snapshot.authorization_expires_at_ms <= now_ms
            || snapshot.capability_expires_at_ms <= now_ms
            || snapshot.refresh_not_after_ms <= now_ms
        {
            return Err(TvAuthorityRuntimeError::AuthorityExpired);
        }

        if snapshot.state != TV_DELEGATED_AUTHORITY_STATE_AUTHORIZED_LOCKED {
            return Err(TvAuthorityRuntimeError::AuthorityRecordRejected);
        }

        if !TV_DELEGATED_READ_SCOPES.contains(&request.scope.as_str()) {
            return Err(TvAuthorityRuntimeError::ScopeDenied);
        }

        if request.expires_at_ms > snapshot.authorization_expires_at_ms
            || request.expires_at_ms > snapshot.capability_expires_at_ms
            || request.expires_at_ms > snapshot.refresh_not_after_ms
        {
            return Err(TvAuthorityRuntimeError::ProofRequestBeyondAuthority);
        }

        if !snapshot.operationally_unlocked {
            return Err(TvAuthorityRuntimeError::RuntimeLocked);
        }

        let receipt = port
            .request_device_proof(request)
            .map_err(|_| TvAuthorityRuntimeError::ProofPortFailed)?;

        validate_proof_receipt(&receipt, request)?;

        Ok(receipt)
    }

    pub(crate) fn unlock_with_native_grant(
        &mut self,
        grant: &TvOperationalUnlockGrant,
        now_ms: u64,
    ) -> Result<TvAuthorityRuntimeSnapshotV1, TvAuthorityRuntimeError> {
        let snapshot = &mut self.snapshot;

        if !grant.allows_device_proof() || now_ms == 0 {
            return Err(TvAuthorityRuntimeError::ProofPortFailed);
        }

        if !snapshot.authority_present {
            return Err(TvAuthorityRuntimeError::AuthorityAbsent);
        }

        if snapshot.revoked || snapshot.state == TV_DELEGATED_AUTHORITY_STATE_REVOKED {
            return Err(TvAuthorityRuntimeError::AuthorityRevoked);
        }

        if snapshot.state == TV_DELEGATED_AUTHORITY_STATE_EXPIRED
            || snapshot.authorization_expires_at_ms <= now_ms
            || snapshot.capability_expires_at_ms <= now_ms
            || snapshot.refresh_not_after_ms <= now_ms
        {
            return Err(TvAuthorityRuntimeError::AuthorityExpired);
        }

        if snapshot.state != TV_DELEGATED_AUTHORITY_STATE_AUTHORIZED_LOCKED
            || !snapshot.authorization_present
            || !snapshot.capability_present
            || !snapshot.device_bound
            || !snapshot.passport_bound
        {
            return Err(TvAuthorityRuntimeError::AuthorityRecordRejected);
        }

        snapshot.operationally_unlocked = true;

        snapshot.device_proof_available = true;

        snapshot.session_present = true;

        Ok(snapshot.clone())
    }

    pub(crate) fn lock_operational_state(&mut self) -> TvAuthorityRuntimeSnapshotV1 {
        self.snapshot.operationally_unlocked = false;

        self.snapshot.device_proof_available = false;

        self.snapshot.session_present = false;

        self.snapshot.clone()
    }

    #[cfg(test)]
    fn unlock_for_test(&mut self) {
        if self.snapshot.authority_present
            && self.snapshot.state == TV_DELEGATED_AUTHORITY_STATE_AUTHORIZED_LOCKED
            && !self.snapshot.revoked
        {
            self.snapshot.operationally_unlocked = true;

            self.snapshot.device_proof_available = true;
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TvAuthorityRecordBindingsV1 {
    passport_id: String,

    device_public_key_hex: String,
}

fn authority_bindings(
    authority_record_json: &str,
) -> Result<TvAuthorityRecordBindingsV1, TvAuthorityRuntimeError> {
    if authority_record_json.is_empty()
        || authority_record_json.len() > MAX_AUTHORITY_RECORD_JSON_BYTES
    {
        return Err(TvAuthorityRuntimeError::AuthorityRecordRejected);
    }

    let value: serde_json::Value = serde_json::from_str(authority_record_json)
        .map_err(|_| TvAuthorityRuntimeError::AuthorityRecordRejected)?;

    let object = value
        .as_object()
        .ok_or(TvAuthorityRuntimeError::AuthorityRecordRejected)?;

    let passport_id = object
        .get("passportId")
        .and_then(serde_json::Value::as_str)
        .ok_or(TvAuthorityRuntimeError::AuthorityRecordRejected)?;

    let device_public_key_hex = object
        .get("devicePublicKeyHex")
        .and_then(serde_json::Value::as_str)
        .ok_or(TvAuthorityRuntimeError::AuthorityRecordRejected)?;

    Ok(TvAuthorityRecordBindingsV1 {
        passport_id: passport_id.to_owned(),

        device_public_key_hex: device_public_key_hex.to_owned(),
    })
}

fn validate_proof_request(
    request: &TvDeviceProofPortRequestV1,

    now_ms: u64,
) -> Result<(), TvAuthorityRuntimeError> {
    if request.schema != TV_DEVICE_PROOF_PORT_SCHEMA
        || !valid_lower_hex_id(&request.request_id)
        || request.scope.is_empty()
        || now_ms == 0
        || request.issued_at_ms == 0
        || request.expires_at_ms == 0
        || request.issued_at_ms > now_ms
        || request.expires_at_ms <= now_ms
        || request.issued_at_ms >= request.expires_at_ms
    {
        return Err(TvAuthorityRuntimeError::ProofRequestInvalid);
    }

    Ok(())
}

fn validate_proof_receipt(
    receipt: &TvDeviceProofPortReceiptV1,

    request: &TvDeviceProofPortRequestV1,
) -> Result<(), TvAuthorityRuntimeError> {
    if receipt.schema != TV_DEVICE_PROOF_PORT_SCHEMA
        || receipt.request_id != request.request_id
        || !receipt.proof_created
        || receipt.proof_key_algorithm != TV_DELEGATED_PROOF_KEY_ALGORITHM
        || receipt.proof_bytes == 0
        || receipt.raw_authorization_returned
        || receipt.raw_capability_returned
        || receipt.private_material_exported
        || receipt.webview_secret_returned
    {
        return Err(TvAuthorityRuntimeError::ProofReceiptInvalid);
    }

    Ok(())
}

fn valid_lower_hex_id(value: &str) -> bool {
    value.len() == LOWER_HEX_ID_BYTES
        && value
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
}

#[cfg(target_os = "android")]
static GLOBAL_TV_AUTHORITY_RUNTIME: OnceLock<Mutex<TvDelegatedAuthorityRuntime>> = OnceLock::new();

#[cfg(target_os = "android")]
pub(crate) fn global_tv_authority_runtime() -> &'static Mutex<TvDelegatedAuthorityRuntime> {
    GLOBAL_TV_AUTHORITY_RUNTIME.get_or_init(|| Mutex::new(TvDelegatedAuthorityRuntime::default()))
}

#[cfg(target_os = "android")]
pub(crate) fn hydrate_global_tv_authority_runtime(
    authority_record_json: &str,

    now_ms: u64,
) -> Result<TvAuthorityRuntimeSnapshotV1, TvAuthorityRuntimeError> {
    let mut runtime = global_tv_authority_runtime()
        .lock()
        .map_err(|_| TvAuthorityRuntimeError::RuntimeUnavailable)?;

    runtime.hydrate(authority_record_json, now_ms)
}

#[cfg(target_os = "android")]
pub(crate) fn clear_global_tv_authority_runtime(
) -> Result<TvAuthorityRuntimeSnapshotV1, TvAuthorityRuntimeError> {
    let mut runtime = global_tv_authority_runtime()
        .lock()
        .map_err(|_| TvAuthorityRuntimeError::RuntimeUnavailable)?;

    Ok(runtime.clear())
}

#[cfg(test)]
mod tests {
    use serde_json::{json, Value};

    use super::*;

    use crate::passport_tv_delegated_authority::{
        TV_DELEGATED_AUTHORITY_RECORD_SCHEMA, TV_DELEGATED_AUTHORIZATION_MODE,
        TV_DELEGATED_CAPABILITY_BINDING, TV_DELEGATED_DEVICE_CLASS,
    };

    const PASSPORT_ID:
        &str =
        "passport:v1:main:ed25519:b3:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

    const DEVICE_PUBLIC_KEY: &str =
        "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

    const AUTHORIZATION_ID: &str =
        "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";

    const CAPABILITY_ID: &str = "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";

    const REQUEST_ID: &str = "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

    const NOW_MS: u64 = 1_800_000_000_000;

    fn valid_record() -> Value {
        json!(
            {
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
                    NOW_MS +
                        3_600_000,

                "capabilityExpiresAtMs":
                    NOW_MS +
                        900_000,

                "refreshNotAfterMs":
                    NOW_MS +
                        1_800_000,

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
            }
        )
    }

    fn proof_request() -> TvDeviceProofPortRequestV1 {
        TvDeviceProofPortRequestV1 {
            schema: TV_DEVICE_PROOF_PORT_SCHEMA,

            request_id: REQUEST_ID.to_owned(),

            scope: "content.read".to_owned(),

            issued_at_ms: NOW_MS - 1,

            expires_at_ms: NOW_MS + 60_000,
        }
    }

    #[derive(Default)]
    struct RecordingProofPort {
        calls: usize,
    }

    impl TvDeviceProofPort for RecordingProofPort {
        fn request_device_proof(
            &mut self,

            request: &TvDeviceProofPortRequestV1,
        ) -> Result<TvDeviceProofPortReceiptV1, TvAuthorityRuntimeError> {
            self.calls += 1;

            Ok(TvDeviceProofPortReceiptV1 {
                schema: TV_DEVICE_PROOF_PORT_SCHEMA,

                request_id: request.request_id.clone(),

                proof_created: true,

                proof_key_algorithm: TV_DELEGATED_PROOF_KEY_ALGORITHM,

                proof_bytes: 64,

                raw_authorization_returned: false,

                raw_capability_returned: false,

                private_material_exported: false,

                webview_secret_returned: false,
            })
        }
    }

    #[test]
    fn phase16d3_hydrates_valid_authority_as_locked_runtime() {
        let mut runtime = TvDelegatedAuthorityRuntime::default();

        let snapshot = runtime
            .hydrate(&valid_record().to_string(), NOW_MS)
            .expect("valid authority should hydrate");

        assert_eq!(
            snapshot.state,
            TV_DELEGATED_AUTHORITY_STATE_AUTHORIZED_LOCKED,
        );

        assert!(snapshot.authority_present,);

        assert!(snapshot.authorization_present,);

        assert!(snapshot.capability_present,);

        assert!(!snapshot.operationally_unlocked,);

        assert!(!snapshot.device_proof_available,);

        assert!(!snapshot.raw_authorization_returned,);

        assert!(!snapshot.raw_capability_returned,);

        assert!(!snapshot.private_material_exported,);

        assert!(!snapshot.webview_secret_returned,);
    }

    #[test]
    fn phase16d3_revoked_and_expired_authority_block_proofs() {
        let request = proof_request();

        let mut port = RecordingProofPort::default();

        let mut revoked_runtime = TvDelegatedAuthorityRuntime::default();

        let mut revoked = valid_record();

        revoked["revoked"] = json!(true);

        revoked_runtime
            .hydrate(&revoked.to_string(), NOW_MS)
            .expect("revoked authority remains inspectable");

        assert_eq!(
            revoked_runtime.request_device_proof(&request, NOW_MS, &mut port,),
            Err(TvAuthorityRuntimeError::AuthorityRevoked,),
        );

        let mut expired_runtime = TvDelegatedAuthorityRuntime::default();

        let mut expired = valid_record();

        expired["capabilityExpiresAtMs"] = json!(NOW_MS);

        expired["refreshNotAfterMs"] = json!(NOW_MS);

        expired_runtime
            .hydrate(&expired.to_string(), NOW_MS)
            .expect("expired authority remains inspectable");

        assert_eq!(
            expired_runtime.request_device_proof(&request, NOW_MS, &mut port,),
            Err(TvAuthorityRuntimeError::AuthorityExpired,),
        );

        assert_eq!(port.calls, 0,);
    }

    #[test]
    fn phase16d3_invalid_hydration_clears_prior_runtime_authority() {
        let mut runtime = TvDelegatedAuthorityRuntime::default();

        runtime
            .hydrate(&valid_record().to_string(), NOW_MS)
            .expect("valid authority should hydrate");

        let mut invalid = valid_record();

        invalid["scopes"] = json!(["wallet.spend"]);

        assert_eq!(
            runtime.hydrate(&invalid.to_string(), NOW_MS,),
            Err(TvAuthorityRuntimeError::AuthorityRecordRejected,),
        );

        let snapshot = runtime.snapshot();

        assert_eq!(snapshot.state, RUNTIME_STATE_ABSENT,);

        assert!(!snapshot.authority_present,);

        assert!(!snapshot.operationally_unlocked,);
    }

    #[test]
    fn phase16d3_locked_runtime_never_invokes_device_proof_port() {
        let mut runtime = TvDelegatedAuthorityRuntime::default();

        runtime
            .hydrate(&valid_record().to_string(), NOW_MS)
            .expect("valid authority should hydrate");

        let mut port = RecordingProofPort::default();

        assert_eq!(
            runtime.request_device_proof(&proof_request(), NOW_MS, &mut port,),
            Err(TvAuthorityRuntimeError::RuntimeLocked,),
        );

        assert_eq!(port.calls, 0,);
    }

    #[test]
    fn phase16d3_device_proof_port_accepts_only_after_test_unlock() {
        let mut runtime = TvDelegatedAuthorityRuntime::default();

        runtime
            .hydrate(&valid_record().to_string(), NOW_MS)
            .expect("valid authority should hydrate");

        runtime.unlock_for_test();

        let mut port = RecordingProofPort::default();

        let receipt = runtime
            .request_device_proof(&proof_request(), NOW_MS, &mut port)
            .expect("test-only unlock should permit proof port");

        assert_eq!(port.calls, 1,);

        assert!(receipt.proof_created,);

        assert_eq!(receipt.proof_bytes, 64,);

        assert!(!receipt.private_material_exported,);

        assert!(!receipt.webview_secret_returned,);
    }
}
