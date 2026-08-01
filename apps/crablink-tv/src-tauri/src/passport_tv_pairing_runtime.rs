//! Native-only public pairing state for a delegated CrabLink TV.
//!
//! This runtime retains only a redacted device public record and a bounded
//! public pairing request. Android startup may hydrate that same redacted
//! record from the validated no-backup store. Device secrets, Passport root
//! material, authorizations, capabilities, and sessions never enter this
//! runtime.

#![forbid(unsafe_code)]

use std::sync::{OnceLock, RwLock};

use ed25519_dalek::VerifyingKey;
use rand_core::{OsRng, RngCore};
use serde::Deserialize;

use crablink_native_core::tv_passport_pairing::{
    build_tv_passport_pairing_request, TvPassportPairingRequestV1, TV_PASSPORT_PAIRING_TTL_MAX_MS,
};

use crate::passport_tv_device_material::{
    TvDeviceMaterialPublicRecordV1, TV_DEVICE_CLASS, TV_DEVICE_KEY_ALGORITHM,
    TV_DEVICE_MATERIAL_SCHEMA,
};

const MAX_STORED_PUBLIC_RECORD_JSON_BYTES: usize = 4 * 1_024;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum TvPassportPairingRuntimeError {
    PublicRecordInvalid,
    PublicRecordJsonInvalid,
    PublicRecordUnavailable,
    ClockInvalid,
    EntropyUnavailable,
    PairingRequestInvalid,
    RuntimeUnavailable,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
struct StoredTvDeviceMaterialPublicRecordV1 {
    schema: String,
    device_class: String,
    key_algorithm: String,
    public_key_hex: String,
    native_generation_state: String,
    sealing_state: String,
    persistence_state: String,
    android_jni_adapter_added: bool,
    private_material_exported: bool,
    webview_secret_returned: bool,
    recovery_root_present: bool,
    root_admin_key_present: bool,
    public_tauri_command_added: bool,
}

#[derive(Default)]
struct TvPassportPairingRuntimeState {
    public_record: Option<TvDeviceMaterialPublicRecordV1>,

    pending_request: Option<TvPassportPairingRequestV1>,
}

#[derive(Default)]
struct TvPassportPairingRuntime {
    state: RwLock<TvPassportPairingRuntimeState>,
}

static TV_PASSPORT_PAIRING_RUNTIME: OnceLock<TvPassportPairingRuntime> = OnceLock::new();

fn runtime() -> &'static TvPassportPairingRuntime {
    TV_PASSPORT_PAIRING_RUNTIME.get_or_init(TvPassportPairingRuntime::default)
}

#[cfg_attr(not(target_os = "android"), allow(dead_code))]
pub(crate) fn register_tv_pairing_public_device_record(
    public_record: TvDeviceMaterialPublicRecordV1,
) -> Result<(), TvPassportPairingRuntimeError> {
    runtime().register_public_device_record(public_record)
}

#[cfg_attr(not(target_os = "android"), allow(dead_code))]
pub(crate) fn register_tv_pairing_public_device_record_json(
    public_record_json: &str,
) -> Result<(), TvPassportPairingRuntimeError> {
    let public_record = decode_stored_tv_device_public_record_json(public_record_json)?;

    register_tv_pairing_public_device_record(public_record)
}

pub(crate) fn build_or_reuse_tv_passport_pairing_request(
    now_ms: u64,
) -> Result<TvPassportPairingRequestV1, TvPassportPairingRuntimeError> {
    runtime().build_or_reuse_pairing_request(now_ms)
}

impl TvPassportPairingRuntime {
    fn register_public_device_record(
        &self,
        public_record: TvDeviceMaterialPublicRecordV1,
    ) -> Result<(), TvPassportPairingRuntimeError> {
        if !is_accepted_public_device_record(&public_record) {
            return Err(TvPassportPairingRuntimeError::PublicRecordInvalid);
        }

        let mut state = self
            .state
            .write()
            .map_err(|_| TvPassportPairingRuntimeError::RuntimeUnavailable)?;

        let device_changed = state
            .public_record
            .as_ref()
            .is_some_and(|current| current.public_key_hex != public_record.public_key_hex);

        state.public_record = Some(public_record);

        if device_changed {
            state.pending_request = None;
        }

        Ok(())
    }

    fn build_or_reuse_pairing_request(
        &self,
        now_ms: u64,
    ) -> Result<TvPassportPairingRequestV1, TvPassportPairingRuntimeError> {
        if now_ms == 0 {
            return Err(TvPassportPairingRuntimeError::ClockInvalid);
        }

        let mut state = self
            .state
            .write()
            .map_err(|_| TvPassportPairingRuntimeError::RuntimeUnavailable)?;

        let public_key_hex = state
            .public_record
            .as_ref()
            .ok_or(TvPassportPairingRuntimeError::PublicRecordUnavailable)?
            .public_key_hex
            .clone();

        if let Some(pending) = state.pending_request.as_ref() {
            if now_ms < pending.issued_at_ms {
                return Err(TvPassportPairingRuntimeError::ClockInvalid);
            }

            if pending.device_public_key_hex == public_key_hex && now_ms < pending.expires_at_ms {
                return Ok(pending.clone());
            }
        }

        let expires_at_ms = now_ms
            .checked_add(TV_PASSPORT_PAIRING_TTL_MAX_MS)
            .ok_or(TvPassportPairingRuntimeError::ClockInvalid)?;

        let mut nonce = [0_u8; 32];

        let mut rng = OsRng;

        rng.try_fill_bytes(&mut nonce)
            .map_err(|_| TvPassportPairingRuntimeError::EntropyUnavailable)?;

        let request = build_tv_passport_pairing_request(
            &public_key_hex,
            &lower_hex(&nonce),
            now_ms,
            expires_at_ms,
        )
        .map_err(|_| TvPassportPairingRuntimeError::PairingRequestInvalid)?;

        state.pending_request = Some(request.clone());

        Ok(request)
    }
}

fn decode_stored_tv_device_public_record_json(
    public_record_json: &str,
) -> Result<TvDeviceMaterialPublicRecordV1, TvPassportPairingRuntimeError> {
    if public_record_json.is_empty()
        || public_record_json.len() > MAX_STORED_PUBLIC_RECORD_JSON_BYTES
    {
        return Err(TvPassportPairingRuntimeError::PublicRecordJsonInvalid);
    }

    let stored: StoredTvDeviceMaterialPublicRecordV1 = serde_json::from_str(public_record_json)
        .map_err(|_| TvPassportPairingRuntimeError::PublicRecordJsonInvalid)?;

    if stored.schema != TV_DEVICE_MATERIAL_SCHEMA
        || stored.device_class != TV_DEVICE_CLASS
        || stored.key_algorithm != TV_DEVICE_KEY_ALGORITHM
        || stored.native_generation_state != "generated_from_os_csprng"
        || stored.sealing_state != "sealed_by_android_keystore_jni"
        || stored.persistence_state != "stored_by_android_atomic_file"
        || !stored.android_jni_adapter_added
        || stored.private_material_exported
        || stored.webview_secret_returned
        || stored.recovery_root_present
        || stored.root_admin_key_present
        || stored.public_tauri_command_added
    {
        return Err(TvPassportPairingRuntimeError::PublicRecordInvalid);
    }

    let public_record = TvDeviceMaterialPublicRecordV1 {
        schema: TV_DEVICE_MATERIAL_SCHEMA,

        device_class: TV_DEVICE_CLASS,

        key_algorithm: TV_DEVICE_KEY_ALGORITHM,

        public_key_hex: stored.public_key_hex,

        native_generation_state: "generated_from_os_csprng",

        sealing_state: "sealed_by_android_keystore_jni",

        persistence_state: "stored_by_android_atomic_file",

        android_jni_adapter_added: true,

        private_material_exported: false,

        webview_secret_returned: false,

        recovery_root_present: false,

        root_admin_key_present: false,

        public_tauri_command_added: false,
    };

    if !is_accepted_public_device_record(&public_record) {
        return Err(TvPassportPairingRuntimeError::PublicRecordInvalid);
    }

    Ok(public_record)
}

fn is_accepted_public_device_record(public_record: &TvDeviceMaterialPublicRecordV1) -> bool {
    public_record.schema == TV_DEVICE_MATERIAL_SCHEMA
        && public_record.device_class == TV_DEVICE_CLASS
        && public_record.key_algorithm == TV_DEVICE_KEY_ALGORITHM
        && valid_ed25519_public_key_hex(&public_record.public_key_hex)
        && public_record.native_generation_state == "generated_from_os_csprng"
        && public_record.sealing_state == "sealed_by_android_keystore_jni"
        && public_record.persistence_state == "stored_by_android_atomic_file"
        && public_record.android_jni_adapter_added
        && !public_record.private_material_exported
        && !public_record.webview_secret_returned
        && !public_record.recovery_root_present
        && !public_record.root_admin_key_present
        && !public_record.public_tauri_command_added
}

fn valid_ed25519_public_key_hex(value: &str) -> bool {
    decode_lower_hex_32(value).is_some_and(|bytes| VerifyingKey::from_bytes(&bytes).is_ok())
}

fn decode_lower_hex_32(value: &str) -> Option<[u8; 32]> {
    if value.len() != 64
        || !value
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
    {
        return None;
    }

    let bytes = value.as_bytes();

    let mut output = [0_u8; 32];

    for index in 0..32 {
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

fn lower_hex(bytes: &[u8]) -> String {
    const HEX: &[u8; 16] = b"0123456789abcdef";

    let mut output = String::with_capacity(bytes.len() * 2);

    for byte in bytes {
        output.push(char::from(HEX[usize::from(byte >> 4)]));

        output.push(char::from(HEX[usize::from(byte & 0x0f)]));
    }

    output
}

#[cfg(test)]
mod tests {
    use ed25519_dalek::SigningKey;
    use serde_json::json;

    use super::*;

    fn public_record(seed_byte: u8) -> TvDeviceMaterialPublicRecordV1 {
        let signing_key = SigningKey::from_bytes(&[seed_byte; 32]);

        TvDeviceMaterialPublicRecordV1 {
            schema: TV_DEVICE_MATERIAL_SCHEMA,

            device_class: TV_DEVICE_CLASS,

            key_algorithm: TV_DEVICE_KEY_ALGORITHM,

            public_key_hex: lower_hex(signing_key.verifying_key().as_bytes()),

            native_generation_state: "generated_from_os_csprng",

            sealing_state: "sealed_by_android_keystore_jni",

            persistence_state: "stored_by_android_atomic_file",

            android_jni_adapter_added: true,

            private_material_exported: false,

            webview_secret_returned: false,

            recovery_root_present: false,

            root_admin_key_present: false,

            public_tauri_command_added: false,
        }
    }

    fn public_record_json(seed_byte: u8) -> String {
        serde_json::to_string(&public_record(seed_byte)).expect("serialize public record")
    }

    #[test]
    fn phase16c3_rejects_missing_or_unsafe_public_record() {
        let runtime = TvPassportPairingRuntime::default();

        assert_eq!(
            runtime.build_or_reuse_pairing_request(1_800_000_000_000,),
            Err(TvPassportPairingRuntimeError::PublicRecordUnavailable,),
        );

        let mut unsafe_record = public_record(9);

        unsafe_record.root_admin_key_present = true;

        assert_eq!(
            runtime.register_public_device_record(unsafe_record,),
            Err(TvPassportPairingRuntimeError::PublicRecordInvalid,),
        );
    }

    #[test]
    fn phase16c3_builds_request_from_registered_native_public_key() {
        let runtime = TvPassportPairingRuntime::default();

        let public_record = public_record(9);

        runtime
            .register_public_device_record(public_record.clone())
            .expect("register public record");

        let request = runtime
            .build_or_reuse_pairing_request(1_800_000_000_000)
            .expect("build pairing request");

        assert_eq!(request.device_public_key_hex, public_record.public_key_hex,);

        assert_eq!(request.device_class, "tv_read_only",);

        assert_eq!(
            request.authorization_mode,
            "root-signed-device-authorization",
        );

        assert!(request.root_admin_authorization_required,);

        assert!(!request.companion_passport_pairing_required,);

        assert!(!request.short_code_is_authority,);

        assert!(!request.authorization_present,);

        assert!(!request.session_present,);
    }

    #[test]
    fn phase16c3_reuses_unexpired_request_without_nonce_churn() {
        let runtime = TvPassportPairingRuntime::default();

        runtime
            .register_public_device_record(public_record(9))
            .expect("register public record");

        let first = runtime
            .build_or_reuse_pairing_request(1_800_000_000_000)
            .expect("first request");

        let second = runtime
            .build_or_reuse_pairing_request(first.issued_at_ms + 1)
            .expect("reused request");

        assert_eq!(first, second,);
    }

    #[test]
    fn phase16c3_replaces_expired_request_and_changed_device_key() {
        let runtime = TvPassportPairingRuntime::default();

        runtime
            .register_public_device_record(public_record(9))
            .expect("register first public record");

        let first = runtime
            .build_or_reuse_pairing_request(1_800_000_000_000)
            .expect("first request");

        let after_expiry = runtime
            .build_or_reuse_pairing_request(first.expires_at_ms)
            .expect("replacement after expiry");

        assert_ne!(first.pairing_request_id, after_expiry.pairing_request_id,);

        assert!(after_expiry.issued_at_ms >= first.expires_at_ms,);

        runtime
            .register_public_device_record(public_record(10))
            .expect("register replacement public record");

        let changed_device = runtime
            .build_or_reuse_pairing_request(after_expiry.issued_at_ms + 1)
            .expect("replacement for changed device");

        assert_ne!(
            after_expiry.device_public_key_hex,
            changed_device.device_public_key_hex,
        );

        assert_ne!(
            after_expiry.pairing_request_id,
            changed_device.pairing_request_id,
        );
    }

    #[test]
    fn phase16c3_public_runtime_serialization_contains_no_secret_material() {
        let runtime = TvPassportPairingRuntime::default();

        runtime
            .register_public_device_record(public_record(9))
            .expect("register public record");

        let request = runtime
            .build_or_reuse_pairing_request(1_800_000_000_000)
            .expect("pairing request");

        let serialized = serde_json::to_string(&request).expect("serialize request");

        for forbidden in [
            "recoveryPhrase",
            "recoveryRoot",
            "rootPrivateKey",
            "rootAdminKey",
            "devicePrivateKey",
            "secretSeed",
            "sealedEnvelope",
            "rawCapability",
            "sessionToken",
        ] {
            assert!(
                !serialized.contains(forbidden,),
                "public pairing request leaked {forbidden}",
            );
        }
    }

    #[test]
    fn phase16c4_hydrates_valid_stored_public_record_json() {
        let decoded = decode_stored_tv_device_public_record_json(&public_record_json(21))
            .expect("decode stored public record");

        let runtime = TvPassportPairingRuntime::default();

        runtime
            .register_public_device_record(decoded.clone())
            .expect("register hydrated public record");

        let request = runtime
            .build_or_reuse_pairing_request(1_800_000_100_000)
            .expect("build request after hydration");

        assert_eq!(request.device_public_key_hex, decoded.public_key_hex,);

        assert!(!request.authorization_present,);

        assert!(!request.session_present,);
    }

    #[test]
    fn phase16c4_rejects_unknown_or_unsafe_stored_public_record_json() {
        let mut unknown = serde_json::to_value(public_record(22)).expect("public record value");

        unknown["unexpectedAuthority"] = json!(true);

        assert_eq!(
            decode_stored_tv_device_public_record_json(&unknown.to_string(),),
            Err(TvPassportPairingRuntimeError::PublicRecordJsonInvalid,),
        );

        let mut unsafe_record =
            serde_json::to_value(public_record(22)).expect("public record value");

        unsafe_record["rootAdminKeyPresent"] = json!(true);

        assert_eq!(
            decode_stored_tv_device_public_record_json(&unsafe_record.to_string(),),
            Err(TvPassportPairingRuntimeError::PublicRecordInvalid,),
        );

        assert_eq!(
            decode_stored_tv_device_public_record_json("",),
            Err(TvPassportPairingRuntimeError::PublicRecordJsonInvalid,),
        );
    }

    #[test]
    fn phase16c4_changed_hydrated_key_invalidates_pending_request() {
        let runtime = TvPassportPairingRuntime::default();

        let first_record = decode_stored_tv_device_public_record_json(&public_record_json(23))
            .expect("first stored public record");

        runtime
            .register_public_device_record(first_record)
            .expect("register first hydrated record");

        let first = runtime
            .build_or_reuse_pairing_request(1_800_000_200_000)
            .expect("first request");

        let second_record = decode_stored_tv_device_public_record_json(&public_record_json(24))
            .expect("second stored public record");

        runtime
            .register_public_device_record(second_record)
            .expect("register replacement hydrated record");

        let second = runtime
            .build_or_reuse_pairing_request(first.issued_at_ms + 1)
            .expect("replacement request");

        assert_ne!(first.device_public_key_hex, second.device_public_key_hex,);

        assert_ne!(first.pairing_request_id, second.pairing_request_id,);
    }
}
