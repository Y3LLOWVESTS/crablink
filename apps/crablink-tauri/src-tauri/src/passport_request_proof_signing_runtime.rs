//! RO:WHAT — Signs one canonical Native Passport username-claim request proof using the already-unlocked persisted desktop DeviceKey.
//! RO:WHY — CN-4 protected username mutation needs DeviceKey possession without exporting the operational VMK, DeviceKey seed, or a generic signing primitive.
//! RO:INTERACTS — DesktopOperationalVaultSessionStore, NativeVaultStore, authenticated V2 operational payload, PassportRequestProofV1, and svc-passport's purpose-specific username request-proof signer.
//! RO:INVARIANTS — operational session must already be unlocked; stored vault must authenticate as V2; DeviceKey seed stays borrowed; only the canonical username-claim proof signer may use it.
//! RO:METRICS — none.
//! RO:CONFIG — desktop native runtime only.
//! RO:SECURITY — no VMK/DeviceKey export, generic signing, WebView DTO, Tauri command, PIN request, RecoveryRoot access, capability issuance, username persistence, wallet, or ledger mutation.
//! RO:TEST — physical_m1_protected_username_http_boundary.rs plus svc-passport request-proof signer tests.

#![forbid(unsafe_code)]

use ron_proto::{Ed25519SignatureV1, PassportRequestProofV1};
use svc_passport::native::{
    decode_native_platform_bound_vault_versioned, decrypt_native_operational_device_payload_v1,
    load_native_encrypted_vault, sign_native_username_claim_request_proof_v1,
    NativePlatformBoundVaultVersioned, NativeVaultStore,
};

use crate::passport_operational_unlock_runtime::DesktopOperationalVaultSessionStore;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[non_exhaustive]
pub enum DesktopRequestProofSigningError {
    OperationalSessionUnavailable,
    VaultLoadFailed,
    NoStoredVault,
    VaultDecodeFailed,
    V2Required,
    OperationalPayloadAuthenticationFailed,
    RequestProofSigningRejected,
}

/// Sign one exact protected username request proof while DeviceKey material
/// remains entirely inside native V2 vault custody.
pub fn sign_desktop_native_passport_username_request_proof<V>(
    store: &V,
    session_store: &DesktopOperationalVaultSessionStore,
    proof: &PassportRequestProofV1,
) -> Result<Ed25519SignatureV1, DesktopRequestProofSigningError>
where
    V: NativeVaultStore + ?Sized,
{
    session_store
        .with_operational_vmk_for_request_proof_signing(|operational_vmk| {
            sign_stored_v2_username_request_proof(store, operational_vmk, proof)
        })
        .map_err(|_| DesktopRequestProofSigningError::OperationalSessionUnavailable)?
}

fn sign_stored_v2_username_request_proof<V>(
    store: &V,
    operational_vmk: &svc_passport::native::NativeSecretBytes,
    proof: &PassportRequestProofV1,
) -> Result<Ed25519SignatureV1, DesktopRequestProofSigningError>
where
    V: NativeVaultStore + ?Sized,
{
    let encoded = load_native_encrypted_vault(store)
        .map_err(|_| DesktopRequestProofSigningError::VaultLoadFailed)?
        .ok_or(DesktopRequestProofSigningError::NoStoredVault)?;

    let versioned = decode_native_platform_bound_vault_versioned(&encoded)
        .map_err(|_| DesktopRequestProofSigningError::VaultDecodeFailed)?;

    let v2 = match versioned {
        NativePlatformBoundVaultVersioned::V2(v2) => v2,

        NativePlatformBoundVaultVersioned::V1(_) => {
            return Err(DesktopRequestProofSigningError::V2Required);
        }
    };

    let operational_payload = decrypt_native_operational_device_payload_v1(
        operational_vmk,
        v2.operational_device_payload(),
    )
    .map_err(|_| DesktopRequestProofSigningError::OperationalPayloadAuthenticationFailed)?;

    sign_native_username_claim_request_proof_v1(operational_payload.device_signing_seed(), proof)
        .map_err(|_| DesktopRequestProofSigningError::RequestProofSigningRejected)
}
