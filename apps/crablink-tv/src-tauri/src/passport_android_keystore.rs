//! Reviews the canonical svc-passport Android Keystore contract and reports
//! truthful CrabLink TV native-target readiness.
//!
//! This module performs contract review and redacted inspection only. It does
//! not generate keys, store secrets, invoke Android APIs, expose a Tauri
//! command, issue capabilities, or return secret material to the WebView.

use serde::Serialize;
use svc_passport::native::{
    review_native_platform_sealer_contract_draft, NativePlatformFamily,
    NativePlatformSealerContractDescriptorV1, NativePlatformSealerContractDraftV1,
    NativeSecureCompartment, PHASE5A_PLATFORM_SEALER_CONTRACT_DOMAIN,
};

pub const TV_ANDROID_KEYSTORE_INSPECTION_SCHEMA: &str =
    "crablink.tv.android-keystore-inspection.v1";

pub const TV_ANDROID_KEYSTORE_PROVIDER: &str = "AndroidKeyStore";

pub const TV_ANDROID_KEYSTORE_DEVICE_SEALER_ALIAS: &str =
    "com.rustyonions.crablink.tv.passport.device-sealer.v1";

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TvAndroidKeystoreInspectionV1 {
    pub schema: &'static str,
    pub platform_family: &'static str,
    pub target_os: &'static str,
    pub android_target: bool,
    pub contract_state: &'static str,
    pub adapter_state: &'static str,
    pub provider_name: &'static str,
    pub device_sealer_alias: &'static str,
    pub android_keystore_required: bool,
    pub device_compartment_only: bool,
    pub local_device_protection_required: bool,
    pub hardware_backing_preferred: bool,
    pub strongbox_required: bool,
    pub plaintext_fallback_allowed: bool,
    pub recovery_root_storage_allowed: bool,
    pub root_admin_key_storage_allowed: bool,
    pub secret_export_allowed: bool,
    pub webview_secret_return_allowed: bool,
    pub android_platform_bridge_added: bool,
    pub secret_storage_added: bool,
    pub device_key_generation_added: bool,
    pub delegated_authorization_storage_added: bool,
    pub public_tauri_command_added: bool,
}

pub fn review_tv_android_keystore_contract() -> Result<
    NativePlatformSealerContractDescriptorV1,
    svc_passport::native::NativePlatformSealerContractReviewError,
> {
    review_native_platform_sealer_contract_draft(NativePlatformSealerContractDraftV1 {
        contract_domain: PHASE5A_PLATFORM_SEALER_CONTRACT_DOMAIN,
        platform_family: NativePlatformFamily::AndroidKeystore,
        requested_compartments: vec![NativeSecureCompartment::DeviceKey],
        includes_platform_sealer_implementation: false,
        stores_secret_material: false,
        exports_material: false,
        requests_vault_unlock: false,
        requests_encryption_or_decryption: false,
        requests_wallet_or_ledger_mutation: false,
    })
}

pub fn inspect_tv_android_keystore() -> TvAndroidKeystoreInspectionV1 {
    let contract_ready = match review_tv_android_keystore_contract() {
        Ok(descriptor) => {
            descriptor.platform_family == NativePlatformFamily::AndroidKeystore
                && descriptor.secure_compartments.len() == 1
                && descriptor.secure_compartments[0] == NativeSecureCompartment::DeviceKey
                && descriptor.contract_only
        }
        Err(_) => false,
    };

    let android_target = cfg!(target_os = "android");

    TvAndroidKeystoreInspectionV1 {
        schema: TV_ANDROID_KEYSTORE_INSPECTION_SCHEMA,
        platform_family: "android_keystore",
        target_os: std::env::consts::OS,
        android_target,
        contract_state: if contract_ready {
            "contract_ready"
        } else {
            "contract_rejected"
        },
        adapter_state: if android_target {
            "android_target_bridge_pending"
        } else {
            "non_android_inspection_host"
        },
        provider_name: TV_ANDROID_KEYSTORE_PROVIDER,
        device_sealer_alias: TV_ANDROID_KEYSTORE_DEVICE_SEALER_ALIAS,
        android_keystore_required: true,
        device_compartment_only: true,
        local_device_protection_required: true,
        hardware_backing_preferred: true,
        strongbox_required: false,
        plaintext_fallback_allowed: false,
        recovery_root_storage_allowed: false,
        root_admin_key_storage_allowed: false,
        secret_export_allowed: false,
        webview_secret_return_allowed: false,
        android_platform_bridge_added: false,
        secret_storage_added: false,
        device_key_generation_added: false,
        delegated_authorization_storage_added: false,
        public_tauri_command_added: false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::Value;
    use svc_passport::native::NativePlatformSealerContractReviewError;

    #[test]
    fn phase16b1_canonical_contract_accepts_android_device_compartment_only() {
        let descriptor = review_tv_android_keystore_contract().expect("contract must review");

        assert_eq!(
            descriptor.platform_family,
            NativePlatformFamily::AndroidKeystore
        );

        assert_eq!(
            descriptor.secure_compartments,
            vec![NativeSecureCompartment::DeviceKey]
        );

        assert!(descriptor.contract_only);
    }

    #[test]
    fn phase16b1_inspection_reports_truthful_target_and_pending_bridge() {
        let inspection = inspect_tv_android_keystore();

        assert_eq!(inspection.android_target, cfg!(target_os = "android"));
        assert_eq!(inspection.target_os, std::env::consts::OS);
        assert_eq!(inspection.contract_state, "contract_ready");

        if cfg!(target_os = "android") {
            assert_eq!(inspection.adapter_state, "android_target_bridge_pending");
        } else {
            assert_eq!(inspection.adapter_state, "non_android_inspection_host");
        }

        assert!(!inspection.android_platform_bridge_added);
        assert!(!inspection.secret_storage_added);
        assert!(!inspection.device_key_generation_added);
        assert!(!inspection.public_tauri_command_added);
    }

    #[test]
    fn phase16b1_inspection_forbids_plaintext_root_export_and_webview_secrets() {
        let inspection = inspect_tv_android_keystore();

        assert!(inspection.android_keystore_required);
        assert!(inspection.device_compartment_only);
        assert!(inspection.local_device_protection_required);
        assert!(inspection.hardware_backing_preferred);
        assert!(!inspection.strongbox_required);
        assert!(!inspection.plaintext_fallback_allowed);
        assert!(!inspection.recovery_root_storage_allowed);
        assert!(!inspection.root_admin_key_storage_allowed);
        assert!(!inspection.secret_export_allowed);
        assert!(!inspection.webview_secret_return_allowed);
    }

    #[test]
    fn phase16b1_canonical_review_rejects_runtime_secret_storage_claims() {
        let result =
            review_native_platform_sealer_contract_draft(NativePlatformSealerContractDraftV1 {
                contract_domain: PHASE5A_PLATFORM_SEALER_CONTRACT_DOMAIN,
                platform_family: NativePlatformFamily::AndroidKeystore,
                requested_compartments: vec![NativeSecureCompartment::DeviceKey],
                includes_platform_sealer_implementation: false,
                stores_secret_material: true,
                exports_material: false,
                requests_vault_unlock: false,
                requests_encryption_or_decryption: false,
                requests_wallet_or_ledger_mutation: false,
            });

        assert_eq!(
            result,
            Err(NativePlatformSealerContractReviewError::UnsafePlatformSealerAuthorityFlag)
        );
    }

    #[test]
    fn phase16b1_serialized_inspection_contains_only_redacted_public_facts() {
        let value =
            serde_json::to_value(inspect_tv_android_keystore()).expect("inspection serializes");

        let object = value
            .as_object()
            .expect("inspection must serialize as an object");

        for forbidden_field in [
            "pin",
            "recoveryPhrase",
            "recoveryRoot",
            "rootAdminKey",
            "privateKey",
            "devicePrivateKey",
            "rawCapability",
            "secretBytes",
            "sealedBytes",
        ] {
            assert!(
                !object.contains_key(forbidden_field),
                "forbidden field: {forbidden_field}"
            );
        }

        assert_eq!(
            value.get("plaintextFallbackAllowed"),
            Some(&Value::Bool(false))
        );

        assert_eq!(
            value.get("webviewSecretReturnAllowed"),
            Some(&Value::Bool(false))
        );
    }
}
