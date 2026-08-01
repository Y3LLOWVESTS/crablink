//! Android-only JNI material port for delegated Passport operational unlock.
//!
//! This adapter consumes the short-lived verified-PIN ticket before requesting
//! Android Keystore unseal of the device key and narrow capability. Java secret
//! arrays are copied into zeroizing Rust memory and overwritten through JNI
//! before control returns to the operational-unlock runtime.
//!
//! This module intentionally has no exported JNI function. The next slice will
//! connect it to one redacted native entry point after this foundation compiles.

#![cfg(target_os = "android")]
#![forbid(unsafe_code)]
#![allow(dead_code)]

use jni::objects::{JByteArray, JObject};
use jni::JNIEnv;
use zeroize::Zeroizing;

use crate::passport_tv_operational_unlock::{
    unlock_global_after_verified_native_pin, TvOperationalMaterialPort,
    TvOperationalMaterialPortError, TvOperationalUnlockReceiptV1,
};

const VERIFIED_PIN_TICKET_BYTES: usize = 32;

const DEVICE_SIGNING_KEY_BYTES: usize = 32;

const MAX_NARROW_CAPABILITY_BYTES: usize = 64 * 1_024;

const JAVA_ARRAY_ZERO_CHUNK_BYTES: usize = 4 * 1_024;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum TvAndroidOperationalJniError {
    InvalidTimestamp,
    VerifiedTicketUnavailable,
    VerifiedTicketInvalid,
    VerifiedTicketClearFailed,
    OperationalUnlockFailed,
}

impl TvAndroidOperationalJniError {
    pub(crate) fn code(self) -> &'static str {
        match self {
            Self::InvalidTimestamp => "invalid_unlock_timestamp",

            Self::VerifiedTicketUnavailable => "verified_pin_ticket_unavailable",

            Self::VerifiedTicketInvalid => "verified_pin_ticket_invalid",

            Self::VerifiedTicketClearFailed => "verified_pin_ticket_clear_failed",

            Self::OperationalUnlockFailed => "operational_unlock_failed",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum JavaSecretArrayError {
    MethodCallFailed,
    NullArray,
    InvalidLength,
    ArrayTooLarge,
    ArrayReadFailed,
    ArrayClearFailed,
}

fn clear_pending_exception(env: &mut JNIEnv<'_>) {
    if env.exception_check().unwrap_or(false) {
        let _ = env.exception_clear();
    }
}

fn clear_java_byte_array(
    env: &mut JNIEnv<'_>,

    array: &JByteArray<'_>,

    array_length: usize,
) -> Result<(), JavaSecretArrayError> {
    let zero_chunk = [0_i8; JAVA_ARRAY_ZERO_CHUNK_BYTES];

    let mut offset = 0_usize;

    while offset < array_length {
        let remaining = array_length - offset;

        let chunk_length = remaining.min(zero_chunk.len());

        let start = i32::try_from(offset).map_err(|_| JavaSecretArrayError::InvalidLength)?;

        if env
            .set_byte_array_region(array, start, &zero_chunk[..chunk_length])
            .is_err()
        {
            clear_pending_exception(env);

            return Err(JavaSecretArrayError::ArrayClearFailed);
        }

        offset += chunk_length;
    }

    Ok(())
}

fn call_zeroizing_java_byte_array<'local>(
    env: &mut JNIEnv<'local>,

    target: &JObject<'local>,

    method_name: &str,

    maximum_bytes: usize,
) -> Result<Zeroizing<Vec<u8>>, JavaSecretArrayError> {
    let value = match env.call_method(target, method_name, "()[B", &[]) {
        Ok(value) => value,

        Err(_) => {
            clear_pending_exception(env);

            return Err(JavaSecretArrayError::MethodCallFailed);
        }
    };

    let object = match value.l() {
        Ok(object) => object,

        Err(_) => {
            clear_pending_exception(env);

            return Err(JavaSecretArrayError::MethodCallFailed);
        }
    };

    if object.is_null() {
        return Err(JavaSecretArrayError::NullArray);
    }

    let array = JByteArray::from(object);

    let raw_length = match env.get_array_length(&array) {
        Ok(length) => length,

        Err(_) => {
            clear_pending_exception(env);

            return Err(JavaSecretArrayError::InvalidLength);
        }
    };

    let array_length =
        usize::try_from(raw_length).map_err(|_| JavaSecretArrayError::InvalidLength)?;

    if array_length > maximum_bytes {
        clear_java_byte_array(env, &array, array_length)?;

        return Err(JavaSecretArrayError::ArrayTooLarge);
    }

    let converted = match env.convert_byte_array(&array) {
        Ok(bytes) => Zeroizing::new(bytes),

        Err(_) => {
            clear_pending_exception(env);

            let _ = clear_java_byte_array(env, &array, array_length);

            return Err(JavaSecretArrayError::ArrayReadFailed);
        }
    };

    if clear_java_byte_array(env, &array, array_length).is_err() {
        return Err(JavaSecretArrayError::ArrayClearFailed);
    }

    Ok(converted)
}

fn map_device_material_error(error: JavaSecretArrayError) -> TvOperationalMaterialPortError {
    match error {
        JavaSecretArrayError::NullArray
        | JavaSecretArrayError::InvalidLength
        | JavaSecretArrayError::ArrayTooLarge => {
            TvOperationalMaterialPortError::DeviceMaterialUnavailable
        }

        JavaSecretArrayError::MethodCallFailed
        | JavaSecretArrayError::ArrayReadFailed
        | JavaSecretArrayError::ArrayClearFailed => {
            TvOperationalMaterialPortError::PlatformUnsealFailed
        }
    }
}

fn map_capability_error(error: JavaSecretArrayError) -> TvOperationalMaterialPortError {
    match error {
        JavaSecretArrayError::NullArray
        | JavaSecretArrayError::InvalidLength
        | JavaSecretArrayError::ArrayTooLarge => {
            TvOperationalMaterialPortError::CapabilityUnavailable
        }

        JavaSecretArrayError::MethodCallFailed
        | JavaSecretArrayError::ArrayReadFailed
        | JavaSecretArrayError::ArrayClearFailed => {
            TvOperationalMaterialPortError::PlatformUnsealFailed
        }
    }
}

struct AndroidJniOperationalMaterialPort<'borrow, 'local> {
    env: &'borrow mut JNIEnv<'local>,

    device_bridge: &'borrow JObject<'local>,

    authority_bridge: &'borrow JObject<'local>,
}

impl TvOperationalMaterialPort for AndroidJniOperationalMaterialPort<'_, '_> {
    fn unseal_device_signing_key(
        &mut self,
    ) -> Result<Zeroizing<Vec<u8>>, TvOperationalMaterialPortError> {
        call_zeroizing_java_byte_array(
            self.env,
            self.device_bridge,
            "unsealStoredDeviceKeyForNative",
            DEVICE_SIGNING_KEY_BYTES,
        )
        .map_err(map_device_material_error)
    }

    fn unseal_narrow_capability(
        &mut self,
    ) -> Result<Zeroizing<Vec<u8>>, TvOperationalMaterialPortError> {
        call_zeroizing_java_byte_array(
            self.env,
            self.authority_bridge,
            "unsealStoredNarrowCapabilityForNative",
            MAX_NARROW_CAPABILITY_BYTES,
        )
        .map_err(map_capability_error)
    }
}

fn map_verified_ticket_error(error: JavaSecretArrayError) -> TvAndroidOperationalJniError {
    match error {
        JavaSecretArrayError::ArrayClearFailed => {
            TvAndroidOperationalJniError::VerifiedTicketClearFailed
        }

        JavaSecretArrayError::MethodCallFailed
        | JavaSecretArrayError::NullArray
        | JavaSecretArrayError::InvalidLength
        | JavaSecretArrayError::ArrayTooLarge
        | JavaSecretArrayError::ArrayReadFailed => {
            TvAndroidOperationalJniError::VerifiedTicketUnavailable
        }
    }
}

pub(crate) fn unlock_after_consumed_verified_ticket<'local>(
    env: &mut JNIEnv<'local>,

    verifier_store: &JObject<'local>,

    device_bridge: &JObject<'local>,

    authority_bridge: &JObject<'local>,

    now_ms: u64,
) -> Result<TvOperationalUnlockReceiptV1, TvAndroidOperationalJniError> {
    if now_ms == 0 {
        return Err(TvAndroidOperationalJniError::InvalidTimestamp);
    }

    let verified_ticket = call_zeroizing_java_byte_array(
        env,
        verifier_store,
        "consumeVerifiedPinTicketForNative",
        VERIFIED_PIN_TICKET_BYTES,
    )
    .map_err(map_verified_ticket_error)?;

    if verified_ticket.len() != VERIFIED_PIN_TICKET_BYTES {
        return Err(TvAndroidOperationalJniError::VerifiedTicketInvalid);
    }

    drop(verified_ticket);

    let mut port = AndroidJniOperationalMaterialPort {
        env,

        device_bridge,

        authority_bridge,
    };

    unlock_global_after_verified_native_pin(now_ms, &mut port)
        .map_err(|_| TvAndroidOperationalJniError::OperationalUnlockFailed)
}
