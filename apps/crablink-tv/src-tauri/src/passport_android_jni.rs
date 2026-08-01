//! Android-only JNI adapter for delegated TV device material.
//!
//! Rust generates the device key, Android Keystore seals it, and Android's
//! no-backup atomic store persists the sealed envelope plus redacted public
//! metadata. On restart, only that validated public metadata is hydrated back
//! into the Rust pairing runtime.

#![cfg(target_os = "android")]

use std::panic::{catch_unwind, AssertUnwindSafe};
use std::ptr;

use jni::objects::{JByteArray, JObject, JString, JValue};
use jni::sys::jstring;
use jni::JNIEnv;
use serde::{Deserialize, Serialize};

use crate::passport_tv_device_material::{
    generate_and_seal_tv_device_material, TvDeviceMaterialPublicRecordV1,
    TvDeviceMaterialRuntimeError, TvDeviceMaterialSealer, TvSealedDeviceMaterial,
};

use crate::passport_tv_pairing_runtime::{
    register_tv_pairing_public_device_record, register_tv_pairing_public_device_record_json,
};

use crate::passport_tv_authorization_replay::{
    review_android_authorization_replay_receipt, TvAuthorizationReplayDecision,
    TvAuthorizationReplayReceiptError,
};

use crate::passport_android_operational_material_port::{
    unlock_after_consumed_verified_ticket, TvAndroidOperationalJniError,
};

use crate::passport_tv_operational_unlock::{
    fail_closed_global_operational_unlock, TvOperationalUnlockReceiptV1,
    TV_OPERATIONAL_UNLOCK_RECEIPT_SCHEMA,
};

use crate::passport_tv_authority_runtime::{
    clear_global_tv_authority_runtime, hydrate_global_tv_authority_runtime,
    TvAuthorityRuntimeError, TV_DELEGATED_AUTHORITY_RUNTIME_SCHEMA,
};

const PROVISIONING_RECEIPT_SCHEMA: &str = "crablink.tv.passport-device-provisioning.v1";

const STORE_INSPECTION_SCHEMA: &str = "crablink.tv.passport-device-store-inspection.v1";

const STARTUP_HYDRATION_RECEIPT_SCHEMA: &str = "crablink.tv.passport-startup-hydration.v1";

struct AndroidJniDeviceMaterialSealer<'borrow, 'local> {
    env: &'borrow mut JNIEnv<'local>,

    bridge: &'borrow JObject<'local>,
}

impl TvDeviceMaterialSealer for AndroidJniDeviceMaterialSealer<'_, '_> {
    fn seal_device_key(
        &mut self,
        secret_seed: &[u8],
        associated_data: &[u8],
    ) -> Result<TvSealedDeviceMaterial, TvDeviceMaterialRuntimeError> {
        let secret_array = self
            .env
            .byte_array_from_slice(secret_seed)
            .map_err(|_| TvDeviceMaterialRuntimeError::PlatformSealFailed)?;

        let associated_data_array = self
            .env
            .byte_array_from_slice(associated_data)
            .map_err(|_| TvDeviceMaterialRuntimeError::PlatformSealFailed)?;

        let secret_object = JObject::from(secret_array);

        let associated_data_object = JObject::from(associated_data_array);

        let sealed_object = self
            .env
            .call_method(
                self.bridge,
                "sealDeviceKeyForNative",
                "([B[B)[B",
                &[
                    JValue::Object(&secret_object),
                    JValue::Object(&associated_data_object),
                ],
            )
            .and_then(|value| value.l())
            .map_err(|_| TvDeviceMaterialRuntimeError::PlatformSealFailed)?;

        let sealed_array = JByteArray::from(sealed_object);

        let sealed_bytes = self
            .env
            .convert_byte_array(&sealed_array)
            .map_err(|_| TvDeviceMaterialRuntimeError::PlatformSealFailed)?;

        TvSealedDeviceMaterial::from_android_envelope(&sealed_bytes)
    }
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct TvAndroidStoreInspectionV1 {
    schema: String,

    present: bool,

    atomic_file: bool,

    no_backup_directory: bool,

    public_record_bytes: usize,

    sealed_envelope_bytes: usize,

    private_material_exported: bool,

    webview_secret_returned: bool,

    recovery_root_present: bool,

    root_admin_key_present: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TvAndroidProvisioningReceiptV1<'a> {
    schema: &'static str,

    ok: bool,

    public_record: &'a TvDeviceMaterialPublicRecordV1,

    store: &'a TvAndroidStoreInspectionV1,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TvAndroidProvisioningErrorV1 {
    schema: &'static str,

    ok: bool,

    error: &'static str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TvAndroidStartupHydrationReceiptV1 {
    schema: &'static str,

    ok: bool,

    state: &'static str,

    public_record_present: bool,

    public_record_hydrated: bool,

    private_material_exported: bool,

    webview_secret_returned: bool,

    recovery_root_present: bool,

    root_admin_key_present: bool,

    authorization_present: bool,

    capability_present: bool,

    session_present: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TvAndroidStartupHydrationErrorV1 {
    schema: &'static str,

    ok: bool,

    state: &'static str,

    error: &'static str,

    private_material_exported: bool,

    webview_secret_returned: bool,

    authorization_present: bool,

    capability_present: bool,

    session_present: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TvAndroidAuthorityRuntimeHydrationErrorV1 {
    schema: &'static str,
    ok: bool,
    state: &'static str,
    error: &'static str,
    authority_present: bool,
    operationally_unlocked: bool,
    private_material_exported: bool,
    webview_secret_returned: bool,
    raw_authorization_returned: bool,
    raw_capability_returned: bool,
    session_present: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TvAndroidOperationalUnlockExportReceiptV1 {
    schema: &'static str,
    ok: bool,
    state: &'static str,
    operationally_unlocked: bool,
    device_proof_available: bool,
    device_material_present: bool,
    device_authorized: bool,
    capability_present: bool,
    device_revoked: bool,
    operational_material_present: bool,
    pin_stored: bool,
    pin_returned_to_webview: bool,
    raw_authorization_returned: bool,
    raw_capability_returned: bool,
    private_material_exported: bool,
    webview_secret_returned: bool,
    recovery_root_present: bool,
    root_admin_key_present: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct TvAndroidOperationalUnlockExportFailureV1 {
    schema: &'static str,
    ok: bool,
    state: &'static str,
    error: &'static str,
    operationally_unlocked: bool,
    device_proof_available: bool,
    device_material_present: bool,
    device_authorized: bool,
    capability_present: bool,
    device_revoked: bool,
    operational_material_present: bool,
    pin_stored: bool,
    pin_returned_to_webview: bool,
    raw_authorization_returned: bool,
    raw_capability_returned: bool,
    private_material_exported: bool,
    webview_secret_returned: bool,
    recovery_root_present: bool,
    root_admin_key_present: bool,
}

#[derive(Debug, Clone, Copy)]
enum TvAndroidJniProvisioningError {
    DeviceGeneration,
    AndroidSeal,
    SealedEnvelope,
    PublicRecordSerialization,
    AtomicStore,
    StoreReceipt,
    PairingRuntime,
}

impl TvAndroidJniProvisioningError {
    fn code(self) -> &'static str {
        match self {
            Self::DeviceGeneration => "device_generation_failed",

            Self::AndroidSeal => "android_keystore_seal_failed",

            Self::SealedEnvelope => "sealed_envelope_invalid",

            Self::PublicRecordSerialization => "public_record_serialization_failed",

            Self::AtomicStore => "android_atomic_store_failed",

            Self::StoreReceipt => "android_store_receipt_invalid",

            Self::PairingRuntime => "pairing_runtime_registration_failed",
        }
    }
}

#[derive(Debug, Clone, Copy)]
enum TvAndroidOperationalUnlockExportError {
    InvalidTimestamp,
    MaterialPort(TvAndroidOperationalJniError),
    JniException,
    ReceiptRejected,
    ReceiptSerialization,
    NativePanicBlocked,
}

impl TvAndroidOperationalUnlockExportError {
    fn code(self) -> &'static str {
        match self {
            Self::InvalidTimestamp => "invalid_unlock_timestamp",
            Self::MaterialPort(error) => error.code(),
            Self::JniException => "operational_unlock_jni_exception",
            Self::ReceiptRejected => "operational_unlock_receipt_rejected",
            Self::ReceiptSerialization => "redacted_native_failure",
            Self::NativePanicBlocked => "native_panic_blocked",
        }
    }
}

#[derive(Debug, Clone, Copy)]
enum TvAndroidStartupHydrationError {
    StoredPublicRecordRead,
    StoredPublicRecordInvalid,
}

#[derive(Debug, Clone, Copy)]
enum TvAndroidAuthorityRuntimeHydrationError {
    InvalidNow,
    StoredAuthorityRead,
    AuthorityRuntime(TvAuthorityRuntimeError),
    ReceiptSerialization,
}

impl TvAndroidAuthorityRuntimeHydrationError {
    fn code(self) -> &'static str {
        match self {
            Self::InvalidNow => "authority_runtime_now_invalid",
            Self::StoredAuthorityRead => "stored_authority_read_failed",
            Self::AuthorityRuntime(error) => error.code(),
            Self::ReceiptSerialization => "authority_runtime_receipt_serialization_failed",
        }
    }
}

impl TvAndroidStartupHydrationError {
    fn code(self) -> &'static str {
        match self {
            Self::StoredPublicRecordRead => "stored_public_record_read_failed",

            Self::StoredPublicRecordInvalid => "stored_public_record_invalid",
        }
    }
}

fn operational_unlock_receipt_is_reviewed(receipt: &TvOperationalUnlockReceiptV1) -> bool {
    receipt.schema == TV_OPERATIONAL_UNLOCK_RECEIPT_SCHEMA
        && receipt.operationally_unlocked
        && receipt.device_proof_available
        && receipt.device_material_present
        && receipt.device_authorized
        && receipt.capability_present
        && !receipt.device_revoked
        && receipt.device_key_bytes == 32
        && receipt.capability_bytes > 0
        && receipt.capability_bytes <= 64 * 1_024
        && receipt.operational_material_present
        && !receipt.pin_stored
        && !receipt.pin_returned_to_webview
        && !receipt.raw_authorization_returned
        && !receipt.raw_capability_returned
        && !receipt.private_material_exported
        && !receipt.recovery_root_present
        && !receipt.root_admin_key_present
}

fn unlock_operational_runtime_from_verified_ticket<'local>(
    env: &mut JNIEnv<'local>,

    bridge: &JObject<'local>,

    now_ms: i64,
) -> Result<String, TvAndroidOperationalUnlockExportError> {
    let reviewed_now_ms = u64::try_from(now_ms)
        .ok()
        .filter(|value| *value > 0)
        .ok_or(TvAndroidOperationalUnlockExportError::InvalidTimestamp)?;

    let receipt =
        unlock_after_consumed_verified_ticket(env, bridge, bridge, bridge, reviewed_now_ms)
            .map_err(TvAndroidOperationalUnlockExportError::MaterialPort)?;

    if !operational_unlock_receipt_is_reviewed(&receipt) {
        return Err(TvAndroidOperationalUnlockExportError::ReceiptRejected);
    }

    serde_json::to_string(&TvAndroidOperationalUnlockExportReceiptV1 {
        schema: TV_OPERATIONAL_UNLOCK_RECEIPT_SCHEMA,
        ok: true,
        state: "operationally_unlocked",
        operationally_unlocked: receipt.operationally_unlocked,
        device_proof_available: receipt.device_proof_available,
        device_material_present: receipt.device_material_present,
        device_authorized: receipt.device_authorized,
        capability_present: receipt.capability_present,
        device_revoked: receipt.device_revoked,
        operational_material_present: receipt.operational_material_present,
        pin_stored: false,
        pin_returned_to_webview: false,
        raw_authorization_returned: false,
        raw_capability_returned: false,
        private_material_exported: false,
        webview_secret_returned: false,
        recovery_root_present: false,
        root_admin_key_present: false,
    })
    .map_err(|_| TvAndroidOperationalUnlockExportError::ReceiptSerialization)
}

fn redacted_operational_unlock_error_json(error: TvAndroidOperationalUnlockExportError) -> String {
    serde_json::to_string(&TvAndroidOperationalUnlockExportFailureV1 {
        schema: TV_OPERATIONAL_UNLOCK_RECEIPT_SCHEMA,
        ok: false,
        state: "failed_closed",
        error: error.code(),
        operationally_unlocked: false,
        device_proof_available: false,
        device_material_present: false,
        device_authorized: false,
        capability_present: false,
        device_revoked: false,
        operational_material_present: false,
        pin_stored: false,
        pin_returned_to_webview: false,
        raw_authorization_returned: false,
        raw_capability_returned: false,
        private_material_exported: false,
        webview_secret_returned: false,
        recovery_root_present: false,
        root_admin_key_present: false,
    })
    .unwrap_or_else(|_| {
        String::from(
            "{\"schema\":\"crablink.tv.operational-unlock.v1\",\"ok\":false,\"state\":\"failed_closed\",\"error\":\"redacted_native_failure\",\"operationallyUnlocked\":false,\"deviceProofAvailable\":false,\"deviceMaterialPresent\":false,\"deviceAuthorized\":false,\"capabilityPresent\":false,\"deviceRevoked\":false,\"operationalMaterialPresent\":false,\"pinStored\":false,\"pinReturnedToWebview\":false,\"rawAuthorizationReturned\":false,\"rawCapabilityReturned\":false,\"privateMaterialExported\":false,\"webviewSecretReturned\":false,\"recoveryRootPresent\":false,\"rootAdminKeyPresent\":false}",
        )
    })
}

fn clear_operational_unlock_jni_exception(env: &mut JNIEnv<'_>) -> bool {
    match env.exception_check() {
        Ok(false) => false,
        Ok(true) | Err(_) => {
            let _ = env.exception_clear();

            true
        }
    }
}

fn operational_unlock_java_string_or_null(env: &mut JNIEnv<'_>, payload: &str) -> jstring {
    match env.new_string(payload) {
        Ok(value) => value.into_raw(),
        Err(_) => {
            let _ = env.exception_clear();
            let _ = fail_closed_global_operational_unlock();

            ptr::null_mut()
        }
    }
}

fn provision_and_store<'local>(
    env: &mut JNIEnv<'local>,

    bridge: &JObject<'local>,
) -> Result<String, TvAndroidJniProvisioningError> {
    let provisioned = {
        let mut sealer = AndroidJniDeviceMaterialSealer { env, bridge };

        generate_and_seal_tv_device_material(&mut sealer).map_err(|error| match error {
            TvDeviceMaterialRuntimeError::EntropyUnavailable => {
                TvAndroidJniProvisioningError::DeviceGeneration
            }

            TvDeviceMaterialRuntimeError::PlatformSealFailed => {
                TvAndroidJniProvisioningError::AndroidSeal
            }

            TvDeviceMaterialRuntimeError::InvalidSealedMaterial => {
                TvAndroidJniProvisioningError::SealedEnvelope
            }
        })?
    };

    let mut public_record = provisioned.public_record().clone();

    public_record.sealing_state = "sealed_by_android_keystore_jni";

    public_record.persistence_state = "stored_by_android_atomic_file";

    public_record.android_jni_adapter_added = true;

    let public_record_json = serde_json::to_string(&public_record)
        .map_err(|_| TvAndroidJniProvisioningError::PublicRecordSerialization)?;

    let sealed_envelope = provisioned
        .sealed_material()
        .to_android_envelope()
        .map_err(|_| TvAndroidJniProvisioningError::SealedEnvelope)?;

    let public_record_string = env
        .new_string(&public_record_json)
        .map_err(|_| TvAndroidJniProvisioningError::AtomicStore)?;

    let public_record_object = JObject::from(public_record_string);

    let sealed_array = env
        .byte_array_from_slice(&sealed_envelope)
        .map_err(|_| TvAndroidJniProvisioningError::AtomicStore)?;

    let sealed_object = JObject::from(sealed_array);

    let receipt_object = env
        .call_method(
            bridge,
            "storeDeviceMaterialForNative",
            "(Ljava/lang/String;[B)Ljava/lang/String;",
            &[
                JValue::Object(&public_record_object),
                JValue::Object(&sealed_object),
            ],
        )
        .and_then(|value| value.l())
        .map_err(|_| TvAndroidJniProvisioningError::AtomicStore)?;

    let receipt_string = JString::from(receipt_object);

    let receipt_json: String = env
        .get_string(&receipt_string)
        .map_err(|_| TvAndroidJniProvisioningError::StoreReceipt)?
        .into();

    let receipt: TvAndroidStoreInspectionV1 = serde_json::from_str(&receipt_json)
        .map_err(|_| TvAndroidJniProvisioningError::StoreReceipt)?;

    if receipt.schema != STORE_INSPECTION_SCHEMA
        || !receipt.present
        || !receipt.atomic_file
        || !receipt.no_backup_directory
        || receipt.public_record_bytes == 0
        || receipt.sealed_envelope_bytes != sealed_envelope.len()
        || receipt.private_material_exported
        || receipt.webview_secret_returned
        || receipt.recovery_root_present
        || receipt.root_admin_key_present
    {
        return Err(TvAndroidJniProvisioningError::StoreReceipt);
    }

    register_tv_pairing_public_device_record(public_record.clone())
        .map_err(|_| TvAndroidJniProvisioningError::PairingRuntime)?;

    serde_json::to_string(&TvAndroidProvisioningReceiptV1 {
        schema: PROVISIONING_RECEIPT_SCHEMA,

        ok: true,

        public_record: &public_record,

        store: &receipt,
    })
    .map_err(|_| TvAndroidJniProvisioningError::PublicRecordSerialization)
}

fn hydrate_stored_public_record<'local>(
    env: &mut JNIEnv<'local>,

    bridge: &JObject<'local>,
) -> Result<String, TvAndroidStartupHydrationError> {
    let public_record_object = env
        .call_method(
            bridge,
            "readStoredPublicRecordForNative",
            "()Ljava/lang/String;",
            &[],
        )
        .and_then(|value| value.l())
        .map_err(|_| TvAndroidStartupHydrationError::StoredPublicRecordRead)?;

    let public_record_string = JString::from(public_record_object);

    let public_record_json: String = env
        .get_string(&public_record_string)
        .map_err(|_| TvAndroidStartupHydrationError::StoredPublicRecordRead)?
        .into();

    if public_record_json.is_empty() {
        return Ok(startup_hydration_receipt_json("absent", false, false));
    }

    register_tv_pairing_public_device_record_json(&public_record_json)
        .map_err(|_| TvAndroidStartupHydrationError::StoredPublicRecordInvalid)?;

    Ok(startup_hydration_receipt_json(
        "public_record_hydrated",
        true,
        true,
    ))
}

fn hydrate_stored_authority_runtime<'local>(
    env: &mut JNIEnv<'local>,
    bridge: &JObject<'local>,
    now_ms: i64,
) -> Result<String, TvAndroidAuthorityRuntimeHydrationError> {
    let now_ms =
        u64::try_from(now_ms).map_err(|_| TvAndroidAuthorityRuntimeHydrationError::InvalidNow)?;

    if now_ms == 0 {
        return Err(TvAndroidAuthorityRuntimeHydrationError::InvalidNow);
    }

    let record_object = env
        .call_method(
            bridge,
            "readStoredDelegatedAuthorityPublicRecordForNative",
            "()Ljava/lang/String;",
            &[],
        )
        .and_then(|value| value.l())
        .map_err(|_| TvAndroidAuthorityRuntimeHydrationError::StoredAuthorityRead)?;

    let record_string = JString::from(record_object);

    let record_json: String = env
        .get_string(&record_string)
        .map_err(|_| TvAndroidAuthorityRuntimeHydrationError::StoredAuthorityRead)?
        .into();

    let snapshot = if record_json.is_empty() {
        clear_global_tv_authority_runtime()
            .map_err(TvAndroidAuthorityRuntimeHydrationError::AuthorityRuntime)?
    } else {
        hydrate_global_tv_authority_runtime(&record_json, now_ms)
            .map_err(TvAndroidAuthorityRuntimeHydrationError::AuthorityRuntime)?
    };

    serde_json::to_string(&snapshot)
        .map_err(|_| TvAndroidAuthorityRuntimeHydrationError::ReceiptSerialization)
}

#[allow(dead_code)]
pub(crate) fn consume_tv_authorization_replay<'local>(
    env: &mut JNIEnv<'local>,

    bridge: &JObject<'local>,

    authorization_id: &str,

    expires_at_ms: u64,

    now_ms: u64,
) -> Result<TvAuthorizationReplayDecision, TvAuthorizationReplayReceiptError> {
    if authorization_id.is_empty() || expires_at_ms == 0 || now_ms == 0 || expires_at_ms <= now_ms {
        return Err(TvAuthorizationReplayReceiptError::InvalidRequest);
    }

    let expires_at_ms = i64::try_from(expires_at_ms)
        .map_err(|_| TvAuthorizationReplayReceiptError::InvalidRequest)?;

    let now_ms =
        i64::try_from(now_ms).map_err(|_| TvAuthorizationReplayReceiptError::InvalidRequest)?;

    let authorization_id_string = env
        .new_string(authorization_id)
        .map_err(|_| TvAuthorizationReplayReceiptError::PlatformCallFailed)?;

    let authorization_id_object = JObject::from(authorization_id_string);

    let receipt_object = env
        .call_method(
            bridge,
            "consumeAuthorizationReplayForNative",
            "(Ljava/lang/String;JJ)Ljava/lang/String;",
            &[
                JValue::Object(&authorization_id_object),
                JValue::Long(expires_at_ms),
                JValue::Long(now_ms),
            ],
        )
        .and_then(|value| value.l())
        .map_err(|_| TvAuthorizationReplayReceiptError::PlatformCallFailed)?;

    let receipt_string = JString::from(receipt_object);

    let receipt_json: String = env
        .get_string(&receipt_string)
        .map_err(|_| TvAuthorizationReplayReceiptError::PlatformCallFailed)?
        .into();

    review_android_authorization_replay_receipt(
        &receipt_json,
        authorization_id,
        u64::try_from(expires_at_ms)
            .map_err(|_| TvAuthorizationReplayReceiptError::InvalidRequest)?,
    )
}

fn startup_hydration_receipt_json(
    state: &'static str,

    public_record_present: bool,

    public_record_hydrated: bool,
) -> String {
    serde_json::to_string(
        &TvAndroidStartupHydrationReceiptV1 {
            schema:
                STARTUP_HYDRATION_RECEIPT_SCHEMA,

            ok:
                true,

            state,

            public_record_present,

            public_record_hydrated,

            private_material_exported:
                false,

            webview_secret_returned:
                false,

            recovery_root_present:
                false,

            root_admin_key_present:
                false,

            authorization_present:
                false,

            capability_present:
                false,

            session_present:
                false,
        },
    )
    .unwrap_or_else(
        |_| {
            String::from(
                "{\"schema\":\"crablink.tv.passport-startup-hydration.v1\",\"ok\":false,\"state\":\"redacted_failure\",\"error\":\"receipt_serialization_failed\",\"privateMaterialExported\":false,\"webviewSecretReturned\":false,\"authorizationPresent\":false,\"capabilityPresent\":false,\"sessionPresent\":false}",
            )
        },
    )
}

fn redacted_error_json(error: TvAndroidJniProvisioningError) -> String {
    serde_json::to_string(
        &TvAndroidProvisioningErrorV1 {
            schema:
                PROVISIONING_RECEIPT_SCHEMA,

            ok:
                false,

            error:
                error.code(),
        },
    )
    .unwrap_or_else(
        |_| {
            String::from(
                "{\"schema\":\"crablink.tv.passport-device-provisioning.v1\",\"ok\":false,\"error\":\"redacted_native_failure\"}",
            )
        },
    )
}

fn redacted_hydration_error_json(error: TvAndroidStartupHydrationError) -> String {
    serde_json::to_string(
        &TvAndroidStartupHydrationErrorV1 {
            schema:
                STARTUP_HYDRATION_RECEIPT_SCHEMA,

            ok:
                false,

            state:
                "failed_closed",

            error:
                error.code(),

            private_material_exported:
                false,

            webview_secret_returned:
                false,

            authorization_present:
                false,

            capability_present:
                false,

            session_present:
                false,
        },
    )
    .unwrap_or_else(
        |_| {
            String::from(
                "{\"schema\":\"crablink.tv.passport-startup-hydration.v1\",\"ok\":false,\"state\":\"failed_closed\",\"error\":\"redacted_native_failure\",\"privateMaterialExported\":false,\"webviewSecretReturned\":false,\"authorizationPresent\":false,\"capabilityPresent\":false,\"sessionPresent\":false}",
            )
        },
    )
}

fn redacted_authority_runtime_hydration_error_json(
    error: TvAndroidAuthorityRuntimeHydrationError,
) -> String {
    serde_json::to_string(&TvAndroidAuthorityRuntimeHydrationErrorV1 {
        schema: TV_DELEGATED_AUTHORITY_RUNTIME_SCHEMA,
        ok: false,
        state: "failed_closed",
        error: error.code(),
        authority_present: false,
        operationally_unlocked: false,
        private_material_exported: false,
        webview_secret_returned: false,
        raw_authorization_returned: false,
        raw_capability_returned: false,
        session_present: false,
    })
    .unwrap_or_else(|_| String::from(
        "{\"schema\":\"crablink.tv.delegated-authority-runtime.v1\",\"ok\":false,\"state\":\"failed_closed\",\"error\":\"redacted_native_failure\",\"authorityPresent\":false,\"operationallyUnlocked\":false,\"privateMaterialExported\":false,\"webviewSecretReturned\":false,\"rawAuthorizationReturned\":false,\"rawCapabilityReturned\":false,\"sessionPresent\":false}"
    ))
}

fn java_string_or_null(env: &mut JNIEnv<'_>, payload: &str) -> jstring {
    match env.new_string(payload) {
        Ok(value) => value.into_raw(),

        Err(_) => ptr::null_mut(),
    }
}

#[no_mangle]
pub extern "system" fn Java_com_rustyonions_crablink_tv_TvPassportDeviceMaterialBridge_provisionAndStore<
    'local,
>(
    mut env: JNIEnv<'local>,

    bridge: JObject<'local>,
) -> jstring {
    let result = catch_unwind(AssertUnwindSafe(|| provision_and_store(&mut env, &bridge)));

    if env.exception_check().unwrap_or(false) {
        let _ = env.exception_clear();
    }

    let payload =
        match result {
            Ok(
                Ok(
                    receipt,
                ),
            ) =>
                receipt,

            Ok(
                Err(
                    error,
                ),
            ) =>
                redacted_error_json(
                    error,
                ),

            Err(_) =>
                String::from(
                    "{\"schema\":\"crablink.tv.passport-device-provisioning.v1\",\"ok\":false,\"error\":\"native_panic_blocked\"}",
                ),
        };

    java_string_or_null(&mut env, &payload)
}

#[no_mangle]
pub extern "system" fn Java_com_rustyonions_crablink_tv_TvPassportDeviceMaterialBridge_hydrateStoredPublicRecord<
    'local,
>(
    mut env: JNIEnv<'local>,

    bridge: JObject<'local>,
) -> jstring {
    let result = catch_unwind(AssertUnwindSafe(|| {
        hydrate_stored_public_record(&mut env, &bridge)
    }));

    if env.exception_check().unwrap_or(false) {
        let _ = env.exception_clear();
    }

    let payload =
        match result {
            Ok(
                Ok(
                    receipt,
                ),
            ) =>
                receipt,

            Ok(
                Err(
                    error,
                ),
            ) =>
                redacted_hydration_error_json(
                    error,
                ),

            Err(_) =>
                String::from(
                    "{\"schema\":\"crablink.tv.passport-startup-hydration.v1\",\"ok\":false,\"state\":\"failed_closed\",\"error\":\"native_panic_blocked\",\"privateMaterialExported\":false,\"webviewSecretReturned\":false,\"authorizationPresent\":false,\"capabilityPresent\":false,\"sessionPresent\":false}",
                ),
        };

    java_string_or_null(&mut env, &payload)
}

#[no_mangle]
pub extern "system" fn Java_com_rustyonions_crablink_tv_TvPassportDelegatedAuthorityBridge_hydrateStoredAuthorityForNative<
    'local,
>(
    mut env: JNIEnv<'local>,
    bridge: JObject<'local>,
    now_ms: i64,
) -> jstring {
    let result = catch_unwind(AssertUnwindSafe(|| {
        hydrate_stored_authority_runtime(&mut env, &bridge, now_ms)
    }));

    if env.exception_check().unwrap_or(false) {
        let _ = env.exception_clear();
    }

    let payload = match result {
        Ok(Ok(receipt)) => receipt,

        Ok(Err(error)) => {
            let _ = clear_global_tv_authority_runtime();

            redacted_authority_runtime_hydration_error_json(error)
        }

        Err(_) => {
            let _ = clear_global_tv_authority_runtime();

            String::from(
                "{\"schema\":\"crablink.tv.delegated-authority-runtime.v1\",\"ok\":false,\"state\":\"failed_closed\",\"error\":\"native_panic_blocked\",\"authorityPresent\":false,\"operationallyUnlocked\":false,\"privateMaterialExported\":false,\"webviewSecretReturned\":false,\"rawAuthorizationReturned\":false,\"rawCapabilityReturned\":false,\"sessionPresent\":false}"
            )
        }
    };

    java_string_or_null(&mut env, &payload)
}

#[no_mangle]
pub extern "system" fn Java_com_rustyonions_crablink_tv_TvPassportOperationalUnlockBridge_unlockAfterVerifiedNativePin<
    'local,
>(
    mut env: JNIEnv<'local>,
    bridge: JObject<'local>,
    now_ms: i64,
) -> jstring {
    let result = catch_unwind(AssertUnwindSafe(|| {
        unlock_operational_runtime_from_verified_ticket(&mut env, &bridge, now_ms)
    }));

    let pending_exception = clear_operational_unlock_jni_exception(&mut env);

    let payload = if pending_exception {
        let _ = fail_closed_global_operational_unlock();

        redacted_operational_unlock_error_json(TvAndroidOperationalUnlockExportError::JniException)
    } else {
        match result {
            Ok(Ok(receipt)) => receipt,
            Ok(Err(error)) => {
                let _ = fail_closed_global_operational_unlock();

                redacted_operational_unlock_error_json(error)
            }
            Err(_) => {
                let _ = fail_closed_global_operational_unlock();

                redacted_operational_unlock_error_json(
                    TvAndroidOperationalUnlockExportError::NativePanicBlocked,
                )
            }
        }
    };

    operational_unlock_java_string_or_null(&mut env, &payload)
}
