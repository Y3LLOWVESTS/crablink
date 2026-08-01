//! Local signing material for a delegated CrabLink TV device.
//!
//! The secret seed remains in zeroizing native memory and is passed directly
//! to an injected platform-sealing port. JNI, persistence, enrollment, and
//! public command wiring are deferred to later focused phases.

use ed25519_dalek::SigningKey;
use rand_core::{OsRng, RngCore};
use serde::Serialize;
use zeroize::Zeroizing;

pub const TV_DEVICE_MATERIAL_SCHEMA: &str = "crablink.tv.passport-device-material.v1";

pub const TV_DEVICE_CLASS: &str = "tv_read_only";

pub const TV_DEVICE_KEY_ALGORITHM: &str = "ed25519";

pub const TV_DEVICE_KEY_ASSOCIATED_DATA: &[u8] = b"crablink.tv.passport.device-key.v1";

pub const TV_DEVICE_KEY_BYTES: usize = 32;

pub const TV_ANDROID_SEALED_BLOB_VERSION: u8 = 1;

pub const TV_ANDROID_GCM_IV_BYTES: usize = 12;

pub const TV_ANDROID_GCM_TAG_BYTES: usize = 16;

#[cfg(any(test, target_os = "android"))]
const TV_ANDROID_SEALED_ENVELOPE_MAGIC: &[u8; 4] = b"CTV1";

#[cfg(any(test, target_os = "android"))]
const TV_ANDROID_SEALED_ENVELOPE_HEADER_BYTES: usize = 10;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TvDeviceMaterialRuntimeError {
    EntropyUnavailable,
    PlatformSealFailed,
    InvalidSealedMaterial,
}

/// Secret Ed25519 seed and its derived public key.
///
/// This type deliberately does not implement `Debug`, `Clone`, or `Serialize`.
pub struct TvDeviceSigningMaterial {
    seed: Zeroizing<[u8; TV_DEVICE_KEY_BYTES]>,
    public_key: [u8; TV_DEVICE_KEY_BYTES],
}

impl TvDeviceSigningMaterial {
    pub fn generate() -> Result<Self, TvDeviceMaterialRuntimeError> {
        let mut seed = Zeroizing::new([0_u8; TV_DEVICE_KEY_BYTES]);

        let mut rng = OsRng;

        rng.try_fill_bytes(&mut *seed)
            .map_err(|_| TvDeviceMaterialRuntimeError::EntropyUnavailable)?;

        let signing_key = SigningKey::from_bytes(&seed);

        let public_key = signing_key.verifying_key().to_bytes();

        Ok(Self { seed, public_key })
    }

    pub fn public_key_bytes(&self) -> &[u8; TV_DEVICE_KEY_BYTES] {
        &self.public_key
    }

    fn secret_seed_bytes(&self) -> &[u8; TV_DEVICE_KEY_BYTES] {
        &self.seed
    }
}

/// Opaque AES-GCM output produced by the platform-sealing port.
///
/// This type deliberately does not implement `Debug`, `Clone`, or `Serialize`.
pub struct TvSealedDeviceMaterial {
    version: u8,
    iv: Vec<u8>,
    ciphertext: Vec<u8>,
}

impl TvSealedDeviceMaterial {
    pub fn new(
        version: u8,
        iv: Vec<u8>,
        ciphertext: Vec<u8>,
    ) -> Result<Self, TvDeviceMaterialRuntimeError> {
        if version != TV_ANDROID_SEALED_BLOB_VERSION
            || iv.len() != TV_ANDROID_GCM_IV_BYTES
            || ciphertext.len() < TV_ANDROID_GCM_TAG_BYTES
        {
            return Err(TvDeviceMaterialRuntimeError::InvalidSealedMaterial);
        }

        Ok(Self {
            version,
            iv,
            ciphertext,
        })
    }

    pub fn version(&self) -> u8 {
        self.version
    }

    pub fn iv_len(&self) -> usize {
        self.iv.len()
    }

    pub fn ciphertext_len(&self) -> usize {
        self.ciphertext.len()
    }

    #[cfg(any(test, target_os = "android"))]
    pub(crate) fn to_android_envelope(&self) -> Result<Vec<u8>, TvDeviceMaterialRuntimeError> {
        let iv_length = u8::try_from(self.iv.len())
            .map_err(|_| TvDeviceMaterialRuntimeError::InvalidSealedMaterial)?;

        let ciphertext_length = u32::try_from(self.ciphertext.len())
            .map_err(|_| TvDeviceMaterialRuntimeError::InvalidSealedMaterial)?;

        let mut envelope = Vec::with_capacity(
            TV_ANDROID_SEALED_ENVELOPE_HEADER_BYTES + self.iv.len() + self.ciphertext.len(),
        );

        envelope.extend_from_slice(TV_ANDROID_SEALED_ENVELOPE_MAGIC);

        envelope.push(self.version);

        envelope.push(iv_length);

        envelope.extend_from_slice(&ciphertext_length.to_be_bytes());

        envelope.extend_from_slice(&self.iv);

        envelope.extend_from_slice(&self.ciphertext);

        Ok(envelope)
    }

    #[cfg(any(test, target_os = "android"))]
    pub(crate) fn from_android_envelope(
        envelope: &[u8],
    ) -> Result<Self, TvDeviceMaterialRuntimeError> {
        if envelope.len() < TV_ANDROID_SEALED_ENVELOPE_HEADER_BYTES {
            return Err(TvDeviceMaterialRuntimeError::InvalidSealedMaterial);
        }

        if envelope.get(0..4) != Some(TV_ANDROID_SEALED_ENVELOPE_MAGIC.as_slice()) {
            return Err(TvDeviceMaterialRuntimeError::InvalidSealedMaterial);
        }

        let version = *envelope
            .get(4)
            .ok_or(TvDeviceMaterialRuntimeError::InvalidSealedMaterial)?;

        let iv_length = usize::from(
            *envelope
                .get(5)
                .ok_or(TvDeviceMaterialRuntimeError::InvalidSealedMaterial)?,
        );

        let ciphertext_length_bytes: [u8; 4] = envelope
            .get(6..10)
            .ok_or(TvDeviceMaterialRuntimeError::InvalidSealedMaterial)?
            .try_into()
            .map_err(|_| TvDeviceMaterialRuntimeError::InvalidSealedMaterial)?;

        let ciphertext_length = u32::from_be_bytes(ciphertext_length_bytes) as usize;

        let iv_end = TV_ANDROID_SEALED_ENVELOPE_HEADER_BYTES
            .checked_add(iv_length)
            .ok_or(TvDeviceMaterialRuntimeError::InvalidSealedMaterial)?;

        let expected_end = iv_end
            .checked_add(ciphertext_length)
            .ok_or(TvDeviceMaterialRuntimeError::InvalidSealedMaterial)?;

        if expected_end != envelope.len() {
            return Err(TvDeviceMaterialRuntimeError::InvalidSealedMaterial);
        }

        let iv = envelope
            .get(TV_ANDROID_SEALED_ENVELOPE_HEADER_BYTES..iv_end)
            .ok_or(TvDeviceMaterialRuntimeError::InvalidSealedMaterial)?
            .to_vec();

        let ciphertext = envelope
            .get(iv_end..expected_end)
            .ok_or(TvDeviceMaterialRuntimeError::InvalidSealedMaterial)?
            .to_vec();

        Self::new(version, iv, ciphertext)
    }
}

/// Native-only port implemented by the Android adapter in a later phase.
pub trait TvDeviceMaterialSealer {
    fn seal_device_key(
        &mut self,
        secret_seed: &[u8],
        associated_data: &[u8],
    ) -> Result<TvSealedDeviceMaterial, TvDeviceMaterialRuntimeError>;
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TvDeviceMaterialPublicRecordV1 {
    pub schema: &'static str,
    pub device_class: &'static str,
    pub key_algorithm: &'static str,
    pub public_key_hex: String,
    pub native_generation_state: &'static str,
    pub sealing_state: &'static str,
    pub persistence_state: &'static str,
    pub android_jni_adapter_added: bool,
    pub private_material_exported: bool,
    pub webview_secret_returned: bool,
    pub recovery_root_present: bool,
    pub root_admin_key_present: bool,
    pub public_tauri_command_added: bool,
}

/// Native provisioning output containing public metadata and opaque ciphertext.
///
/// This type deliberately does not implement `Debug`, `Clone`, or `Serialize`.
pub struct TvProvisionedDeviceMaterial {
    public_record: TvDeviceMaterialPublicRecordV1,
    sealed_material: TvSealedDeviceMaterial,
}

impl TvProvisionedDeviceMaterial {
    pub fn public_record(&self) -> &TvDeviceMaterialPublicRecordV1 {
        &self.public_record
    }

    pub fn sealed_material(&self) -> &TvSealedDeviceMaterial {
        &self.sealed_material
    }
}

pub fn generate_and_seal_tv_device_material(
    sealer: &mut dyn TvDeviceMaterialSealer,
) -> Result<TvProvisionedDeviceMaterial, TvDeviceMaterialRuntimeError> {
    let material = TvDeviceSigningMaterial::generate()?;

    let sealed_material =
        sealer.seal_device_key(material.secret_seed_bytes(), TV_DEVICE_KEY_ASSOCIATED_DATA)?;

    let public_record = TvDeviceMaterialPublicRecordV1 {
        schema: TV_DEVICE_MATERIAL_SCHEMA,

        device_class: TV_DEVICE_CLASS,

        key_algorithm: TV_DEVICE_KEY_ALGORITHM,

        public_key_hex: lower_hex(material.public_key_bytes()),

        native_generation_state: "generated_from_os_csprng",

        sealing_state: "sealed_by_injected_native_port",

        persistence_state: "pending_android_native_persistence",

        android_jni_adapter_added: false,

        private_material_exported: false,

        webview_secret_returned: false,

        recovery_root_present: false,

        root_admin_key_present: false,

        public_tauri_command_added: false,
    };

    Ok(TvProvisionedDeviceMaterial {
        public_record,
        sealed_material,
    })
}

fn lower_hex(bytes: &[u8]) -> String {
    const HEX: &[u8; 16] = b"0123456789abcdef";

    let mut output = String::with_capacity(bytes.len() * 2);

    for byte in bytes {
        output.push(HEX[(byte >> 4) as usize] as char);

        output.push(HEX[(byte & 0x0f) as usize] as char);
    }

    output
}

#[cfg(test)]
mod tests {
    use std::sync::Mutex;

    use super::*;

    #[derive(Debug, Clone, PartialEq, Eq)]
    struct SealObservation {
        secret_length: usize,
        associated_data: Vec<u8>,
    }

    #[derive(Default)]
    struct RecordingSealer {
        observations: Mutex<Vec<SealObservation>>,

        fail: bool,
    }

    impl RecordingSealer {
        fn failing() -> Self {
            Self {
                observations: Mutex::new(Vec::new()),

                fail: true,
            }
        }

        fn observations(&self) -> Vec<SealObservation> {
            self.observations
                .lock()
                .expect("recording sealer lock")
                .clone()
        }
    }

    impl TvDeviceMaterialSealer for RecordingSealer {
        fn seal_device_key(
            &mut self,
            secret_seed: &[u8],
            associated_data: &[u8],
        ) -> Result<TvSealedDeviceMaterial, TvDeviceMaterialRuntimeError> {
            self.observations
                .lock()
                .expect("recording sealer lock")
                .push(SealObservation {
                    secret_length: secret_seed.len(),

                    associated_data: associated_data.to_vec(),
                });

            if self.fail {
                return Err(TvDeviceMaterialRuntimeError::PlatformSealFailed);
            }

            TvSealedDeviceMaterial::new(
                TV_ANDROID_SEALED_BLOB_VERSION,
                vec![0x41; TV_ANDROID_GCM_IV_BYTES],
                vec![0x73; TV_DEVICE_KEY_BYTES + TV_ANDROID_GCM_TAG_BYTES],
            )
        }
    }

    #[test]
    fn phase16b3a_generates_distinct_valid_ed25519_device_keys() {
        let first = TvDeviceSigningMaterial::generate().expect("first device key");

        let second = TvDeviceSigningMaterial::generate().expect("second device key");

        assert_ne!(first.public_key_bytes(), second.public_key_bytes(),);

        assert!(ed25519_dalek::VerifyingKey::from_bytes(first.public_key_bytes(),).is_ok(),);

        assert!(ed25519_dalek::VerifyingKey::from_bytes(second.public_key_bytes(),).is_ok(),);
    }

    #[test]
    fn phase16b3a_seals_once_with_locked_associated_data() {
        let mut sealer = RecordingSealer::default();

        let provisioned =
            generate_and_seal_tv_device_material(&mut sealer).expect("device provisioning");

        assert_eq!(
            sealer.observations(),
            vec![SealObservation {
                secret_length: TV_DEVICE_KEY_BYTES,

                associated_data: TV_DEVICE_KEY_ASSOCIATED_DATA.to_vec(),
            },],
        );

        assert_eq!(
            provisioned.sealed_material().version(),
            TV_ANDROID_SEALED_BLOB_VERSION,
        );

        assert_eq!(
            provisioned.sealed_material().iv_len(),
            TV_ANDROID_GCM_IV_BYTES,
        );

        assert_eq!(
            provisioned.sealed_material().ciphertext_len(),
            TV_DEVICE_KEY_BYTES + TV_ANDROID_GCM_TAG_BYTES,
        );
    }

    #[test]
    fn phase16b3a_public_record_is_redacted_and_truthful() {
        let mut sealer = RecordingSealer::default();

        let provisioned =
            generate_and_seal_tv_device_material(&mut sealer).expect("device provisioning");

        let public = provisioned.public_record();

        assert_eq!(public.schema, TV_DEVICE_MATERIAL_SCHEMA,);

        assert_eq!(public.device_class, TV_DEVICE_CLASS,);

        assert_eq!(public.key_algorithm, TV_DEVICE_KEY_ALGORITHM,);

        assert_eq!(public.public_key_hex.len(), 64,);

        assert!(public.public_key_hex.bytes().all(|byte| matches!(
            byte,
            b'0'..=b'9'
                | b'a'..=b'f'
        ),),);

        assert_eq!(public.native_generation_state, "generated_from_os_csprng",);

        assert_eq!(public.sealing_state, "sealed_by_injected_native_port",);

        assert_eq!(
            public.persistence_state,
            "pending_android_native_persistence",
        );

        assert!(!public.android_jni_adapter_added,);

        assert!(!public.private_material_exported,);

        assert!(!public.webview_secret_returned,);

        assert!(!public.recovery_root_present,);

        assert!(!public.root_admin_key_present,);

        assert!(!public.public_tauri_command_added,);
    }

    #[test]
    fn phase16b3a_platform_sealing_failure_fails_closed() {
        let mut sealer = RecordingSealer::failing();

        let result = generate_and_seal_tv_device_material(&mut sealer);

        assert_eq!(
            result.err(),
            Some(TvDeviceMaterialRuntimeError::PlatformSealFailed,),
        );

        assert_eq!(sealer.observations().len(), 1,);
    }

    #[test]
    fn phase16b3a_public_serialization_contains_no_secret_material() {
        let mut sealer = RecordingSealer::default();

        let provisioned =
            generate_and_seal_tv_device_material(&mut sealer).expect("device provisioning");

        let serialized =
            serde_json::to_string(provisioned.public_record()).expect("serialize public record");

        for forbidden in [
            "\"signingSeed\"",
            "\"privateKey\"",
            "\"secretSeed\"",
            "\"sealedBlob\"",
            "\"ciphertext\"",
            "\"iv\"",
            "\"recoveryPhrase\"",
            "\"rootPrivateKey\"",
        ] {
            assert!(
                !serialized.contains(forbidden,),
                "public record leaked {forbidden}",
            );
        }

        assert!(serialized.contains("\"publicKeyHex\"",),);

        assert!(serialized.contains("\"privateMaterialExported\":false",),);

        assert!(serialized.contains("\"webviewSecretReturned\":false",),);
    }

    #[test]
    fn phase16b3a_rejects_malformed_android_sealed_material() {
        assert_eq!(
            TvSealedDeviceMaterial::new(
                2,
                vec![0_u8; TV_ANDROID_GCM_IV_BYTES],
                vec![0_u8; TV_ANDROID_GCM_TAG_BYTES],
            )
            .err(),
            Some(TvDeviceMaterialRuntimeError::InvalidSealedMaterial,),
        );

        assert_eq!(
            TvSealedDeviceMaterial::new(
                TV_ANDROID_SEALED_BLOB_VERSION,
                vec![0_u8; 8],
                vec![0_u8; TV_ANDROID_GCM_TAG_BYTES],
            )
            .err(),
            Some(TvDeviceMaterialRuntimeError::InvalidSealedMaterial,),
        );
    }

    #[test]
    fn phase16b3b_android_sealed_envelope_roundtrips() {
        let original = TvSealedDeviceMaterial::new(
            TV_ANDROID_SEALED_BLOB_VERSION,
            vec![0x21; TV_ANDROID_GCM_IV_BYTES],
            vec![0x42; TV_DEVICE_KEY_BYTES + TV_ANDROID_GCM_TAG_BYTES],
        )
        .expect("valid sealed material");

        let envelope = original
            .to_android_envelope()
            .expect("encode Android envelope");

        let decoded = TvSealedDeviceMaterial::from_android_envelope(&envelope)
            .expect("decode Android envelope");

        assert_eq!(decoded.version(), TV_ANDROID_SEALED_BLOB_VERSION,);

        assert_eq!(decoded.iv_len(), TV_ANDROID_GCM_IV_BYTES,);

        assert_eq!(
            decoded.ciphertext_len(),
            TV_DEVICE_KEY_BYTES + TV_ANDROID_GCM_TAG_BYTES,
        );

        assert_eq!(
            envelope.get(0..4),
            Some(TV_ANDROID_SEALED_ENVELOPE_MAGIC.as_slice(),),
        );
    }

    #[test]
    fn phase16b3b_android_sealed_envelope_rejects_corruption() {
        let original = TvSealedDeviceMaterial::new(
            TV_ANDROID_SEALED_BLOB_VERSION,
            vec![0x21; TV_ANDROID_GCM_IV_BYTES],
            vec![0x42; TV_DEVICE_KEY_BYTES + TV_ANDROID_GCM_TAG_BYTES],
        )
        .expect("valid sealed material");

        let mut envelope = original
            .to_android_envelope()
            .expect("encode Android envelope");

        let truncated = &envelope[..envelope.len() - 1];

        assert_eq!(
            TvSealedDeviceMaterial::from_android_envelope(truncated,).err(),
            Some(TvDeviceMaterialRuntimeError::InvalidSealedMaterial,),
        );

        envelope[0] = 0;

        assert_eq!(
            TvSealedDeviceMaterial::from_android_envelope(&envelope,).err(),
            Some(TvDeviceMaterialRuntimeError::InvalidSealedMaterial,),
        );
    }
}
