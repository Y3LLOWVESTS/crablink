//! RO:WHAT — Uses an already-unlocked desktop Native Passport V2 vault to sign one canonical DeviceSession proof without exporting VMK or DeviceKey seed.
//! RO:WHY — CN-4 physical possession must exercise the durable operational DeviceKey while preserving native-only custody.
//! RO:INTERACTS — DesktopOperationalVaultSessionStore, NativeVaultStore, V2 vault decoder, authenticated operational-device payload decryption, ron-auth DeviceSession transcript, and svc-passport purpose-specific DeviceKey signer.
//! RO:INVARIANTS — operational session must already be unlocked; stored vault must be authenticated V2; DeviceKey seed remains borrowed from the decrypted native payload; svc-passport independently revalidates transcript/device binding before signing.
//! RO:METRICS — none.
//! RO:CONFIG — desktop native runtime only.
//! RO:SECURITY — no VMK/seed export, generic signing, WebView DTO, Tauri command, PIN request, RecoveryRoot access, filesystem implementation, capability issuance, username mutation, wallet mutation, or ledger mutation.
//! RO:TEST — physical_m1_device_session_signing_boundary.rs; real physical success is proven by the subsequent CN-4 managed runtime acceptance.

#![forbid(unsafe_code)]

use ron_auth::native_passport::DeviceSessionProofTranscriptV1;
use ron_proto::Ed25519SignatureV1;
use svc_passport::native::{
    decode_native_platform_bound_vault_versioned, decrypt_native_operational_device_payload_v1,
    load_native_encrypted_vault, sign_native_device_session_proof_v1,
    NativePlatformBoundVaultVersioned, NativeVaultStore,
};

use crate::passport_operational_unlock_runtime::DesktopOperationalVaultSessionStore;

pub const PHYSICAL_M1_DESKTOP_DEVICE_SESSION_SIGNING_LABEL: &str =
    "PHYSICAL_M1_DESKTOP_DEVICE_SESSION_SIGNING_V1";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[non_exhaustive]
pub enum DesktopDeviceSessionSigningError {
    OperationalSessionUnavailable,
    VaultLoadFailed,
    NoStoredVault,
    VaultDecodeFailed,
    V2Required,
    OperationalPayloadAuthenticationFailed,
    DeviceSigningRejected,
}

/// Sign one canonical DeviceSession proof with the persisted operational
/// DeviceKey while all secret material remains in native custody.
///
/// The returned value is only the public Ed25519 signature.
///
/// # Errors
///
/// Fails closed if the operational session is locked, the durable vault cannot
/// be loaded/authenticated as V2, the operational payload cannot be decrypted,
/// or svc-passport rejects the transcript/device binding or signing operation.
pub fn sign_desktop_native_passport_device_session_proof<V>(
    store: &V,
    session_store: &DesktopOperationalVaultSessionStore,
    transcript: &DeviceSessionProofTranscriptV1<'_>,
) -> Result<Ed25519SignatureV1, DesktopDeviceSessionSigningError>
where
    V: NativeVaultStore + ?Sized,
{
    session_store
        .with_operational_vmk_for_device_session_signing(|operational_vmk| {
            sign_stored_v2_device_session_proof(store, operational_vmk, transcript)
        })
        .map_err(|_| DesktopDeviceSessionSigningError::OperationalSessionUnavailable)?
}

fn sign_stored_v2_device_session_proof<V>(
    store: &V,
    operational_vmk: &svc_passport::native::NativeSecretBytes,
    transcript: &DeviceSessionProofTranscriptV1<'_>,
) -> Result<Ed25519SignatureV1, DesktopDeviceSessionSigningError>
where
    V: NativeVaultStore + ?Sized,
{
    let encoded = load_native_encrypted_vault(store)
        .map_err(|_| DesktopDeviceSessionSigningError::VaultLoadFailed)?
        .ok_or(DesktopDeviceSessionSigningError::NoStoredVault)?;

    let versioned = decode_native_platform_bound_vault_versioned(&encoded)
        .map_err(|_| DesktopDeviceSessionSigningError::VaultDecodeFailed)?;

    let v2 = match versioned {
        NativePlatformBoundVaultVersioned::V2(v2) => v2,

        NativePlatformBoundVaultVersioned::V1(_) => {
            return Err(DesktopDeviceSessionSigningError::V2Required);
        }
    };

    let operational_payload = decrypt_native_operational_device_payload_v1(
        operational_vmk,
        v2.operational_device_payload(),
    )
    .map_err(|_| DesktopDeviceSessionSigningError::OperationalPayloadAuthenticationFailed)?;

    sign_native_device_session_proof_v1(operational_payload.device_signing_seed(), transcript)
        .map_err(|_| DesktopDeviceSessionSigningError::DeviceSigningRejected)
}
