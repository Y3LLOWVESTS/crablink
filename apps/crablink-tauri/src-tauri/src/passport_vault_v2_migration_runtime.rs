//! RO:WHAT — Desktop-native V2 orchestration for one-time V1-to-V2 migration and authenticated public device-identity reads from an already-unlocked native operational session.
//! RO:WHY — Physical M1 requires durable device-key custody, truthful migration classification, and a native-only way to recover the canonical public Device ID after restart without exporting VMK or seed.
//! RO:INTERACTS — svc-passport V1/V2 codecs, operational-device payload crypto, NativeVaultStore, NativeSecretBytes, the operational-session custody bridge, and the existing desktop OS CSPRNG adapter.
//! RO:INVARIANTS — migration starts only from valid V1; existing V2 is idempotent; candidate V2 is verified before write; every write attempt is followed by readback; public device identity requires authenticated V2 plus an unlocked native operational session; VMK and signing seed never leave native custody; no blind rollback after ambiguous storage failure.
//! RO:METRICS — none.
//! RO:CONFIG — desktop native runtime only.
//! RO:SECURITY — operational VMK and device seed remain Rust-native; no WebView DTO, filesystem implementation, PlatformSealer call, platform secure-storage mutation, root signing, capability issuance, username mutation, wallet mutation, or ledger mutation.
//! RO:TEST — tests/physical_m1_desktop_v1_to_v2_migration_runtime.rs.

use svc_passport::native::{
    decode_native_platform_bound_vault_versioned, decrypt_native_operational_device_payload_v1,
    derive_native_device_public_identity_v1, encode_native_platform_bound_vault_v2,
    encrypt_native_operational_device_payload_v1,
    generate_native_device_signing_seed_v1_with_random, load_native_encrypted_vault,
    prepare_native_platform_bound_vault_v1_to_v2_migration, write_native_encrypted_vault_atomic,
    NativeDeviceKeyRandomSource, NativeDevicePublicIdentityV1, NativeOperationalDevicePayloadV1,
    NativePlatformBoundVaultV2, NativePlatformBoundVaultVersioned, NativeSecretBytes,
    NativeVaultStore, PHASE6A_AEAD_NONCE_LEN,
};

use crate::passport_device_key_random_runtime::{
    OsDesktopNativeDeviceKeyRandomSource, PHYSICAL_M1_DESKTOP_DEVICE_OS_CSPRNG_LABEL,
};
use crate::passport_operational_unlock_runtime::DesktopOperationalVaultSessionStore;

pub const PHYSICAL_M1_DESKTOP_V1_TO_V2_MIGRATION_LABEL: &str =
    "PHYSICAL_M1_DESKTOP_V1_TO_V2_MIGRATION_V1";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DesktopSessionV1ToV2MigrationError {
    OperationalSessionUnavailable,
    Migration(DesktopV1ToV2MigrationError),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DesktopSessionDevicePublicIdentityError {
    OperationalSessionUnavailable,
    VaultLoadFailed,
    NoStoredVault,
    VaultDecodeFailed,
    V2Required,
    StoredV2AuthenticationFailed,
}

/// Read only the canonical public identity of the persisted V2 device key.
///
/// The operational VMK remains inside the native operational session and is
/// borrowed only through the crate-private synchronous custody closure.
/// Neither the VMK nor the signing seed is returned.
pub fn read_desktop_native_passport_session_device_public_identity<V>(
    store: &V,
    session_store: &DesktopOperationalVaultSessionStore,
) -> Result<NativeDevicePublicIdentityV1, DesktopSessionDevicePublicIdentityError>
where
    V: NativeVaultStore + ?Sized,
{
    session_store
        .with_operational_vmk_for_vault_migration(|operational_vmk| {
            read_stored_v2_device_public_identity(store, operational_vmk)
        })
        .map_err(|_| DesktopSessionDevicePublicIdentityError::OperationalSessionUnavailable)?
}

fn read_stored_v2_device_public_identity<V>(
    store: &V,
    operational_vmk: &NativeSecretBytes,
) -> Result<NativeDevicePublicIdentityV1, DesktopSessionDevicePublicIdentityError>
where
    V: NativeVaultStore + ?Sized,
{
    let encoded = load_native_encrypted_vault(store)
        .map_err(|_| DesktopSessionDevicePublicIdentityError::VaultLoadFailed)?
        .ok_or(DesktopSessionDevicePublicIdentityError::NoStoredVault)?;

    let versioned = decode_native_platform_bound_vault_versioned(&encoded)
        .map_err(|_| DesktopSessionDevicePublicIdentityError::VaultDecodeFailed)?;

    let v2 = match versioned {
        NativePlatformBoundVaultVersioned::V2(v2) => v2,
        NativePlatformBoundVaultVersioned::V1(_) => {
            return Err(DesktopSessionDevicePublicIdentityError::V2Required);
        }
    };

    validate_stored_v2(&v2, operational_vmk)
        .map_err(|_| DesktopSessionDevicePublicIdentityError::StoredV2AuthenticationFailed)
}

/// Migrate using the VMK already held by the native operational session.
///
/// This does not accept a PIN, platform factor, VMK, or secret material from
/// React/Tauri command arguments.
pub fn migrate_desktop_native_passport_session_v1_to_v2<V>(
    store: &V,
    session_store: &DesktopOperationalVaultSessionStore,
) -> Result<DesktopV1ToV2MigrationOutcome, DesktopSessionV1ToV2MigrationError>
where
    V: NativeVaultStore + ?Sized,
{
    migrate_desktop_native_passport_session_v1_to_v2_with_random(
        &OsDesktopNativeDeviceKeyRandomSource,
        store,
        session_store,
    )
}

/// Injectable session-owned migration path used by focused fixtures.
///
/// The operational VMK remains owned by `DesktopOperationalVaultSessionStore`.
/// The migration engine receives only a temporary borrowed reference through
/// the crate-private synchronous custody closure.
pub fn migrate_desktop_native_passport_session_v1_to_v2_with_random<R, V>(
    random: &R,
    store: &V,
    session_store: &DesktopOperationalVaultSessionStore,
) -> Result<DesktopV1ToV2MigrationOutcome, DesktopSessionV1ToV2MigrationError>
where
    R: NativeDeviceKeyRandomSource + ?Sized,
    V: NativeVaultStore + ?Sized,
{
    session_store
        .with_operational_vmk_for_vault_migration(|operational_vmk| {
            migrate_desktop_native_passport_v1_to_v2_with_random(random, store, operational_vmk)
        })
        .map_err(|_| DesktopSessionV1ToV2MigrationError::OperationalSessionUnavailable)?
        .map_err(DesktopSessionV1ToV2MigrationError::Migration)
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DesktopV1ToV2MigrationOutcome {
    /// V1 was replaced and the candidate V2 was read back and validated.
    Migrated,
    /// A valid authenticated V2 was already stored; no random generation or write occurred.
    AlreadyV2,
    /// The store returned a write error, but readback observed and validated the exact V2 candidate.
    ///
    /// This is intentionally distinct from `Migrated`: a final durability
    /// sync may have failed even though the replacement is currently visible.
    V2ObservedAfterWriteError,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DesktopV1ToV2MigrationError {
    NoStoredVault,
    InitialVaultLoadFailed,
    StoredVaultDecodeFailed,
    StoredV2AuthenticationFailed,
    DeviceKeyGenerationFailed,
    DeviceIdentityValidationFailed,
    NonceGenerationFailed,
    OperationalPayloadConstructionFailed,
    OperationalPayloadEncryptionFailed,
    CandidatePreparationFailed,
    CandidateEncodingFailed,
    WriteFailedOriginalV1Preserved,
    PostWriteReadbackFailed,
    PostWriteVerificationFailed,
    PostWriteStateAmbiguous,
}

/// Normal desktop entrypoint.
///
/// Randomness is delegated to the same direct OS CSPRNG adapter already used
/// by Native Passport device-key generation.
pub fn migrate_desktop_native_passport_v1_to_v2<V>(
    store: &V,
    operational_vmk: &NativeSecretBytes,
) -> Result<DesktopV1ToV2MigrationOutcome, DesktopV1ToV2MigrationError>
where
    V: NativeVaultStore + ?Sized,
{
    migrate_desktop_native_passport_v1_to_v2_with_random(
        &OsDesktopNativeDeviceKeyRandomSource,
        store,
        operational_vmk,
    )
}

/// Injectable form used by focused tests.
///
/// The random source is invoked once for the 32-byte device signing seed and
/// once for the 24-byte XChaCha20-Poly1305 nonce. No persistence occurs until
/// the complete V2 candidate has passed its pure encode/decode verification.
pub fn migrate_desktop_native_passport_v1_to_v2_with_random<R, V>(
    random: &R,
    store: &V,
    operational_vmk: &NativeSecretBytes,
) -> Result<DesktopV1ToV2MigrationOutcome, DesktopV1ToV2MigrationError>
where
    R: NativeDeviceKeyRandomSource + ?Sized,
    V: NativeVaultStore + ?Sized,
{
    let original = load_native_encrypted_vault(store)
        .map_err(|_| DesktopV1ToV2MigrationError::InitialVaultLoadFailed)?
        .ok_or(DesktopV1ToV2MigrationError::NoStoredVault)?;

    let versioned = decode_native_platform_bound_vault_versioned(&original)
        .map_err(|_| DesktopV1ToV2MigrationError::StoredVaultDecodeFailed)?;

    let base_v1 = match versioned {
        NativePlatformBoundVaultVersioned::V1(v1) => v1,

        NativePlatformBoundVaultVersioned::V2(v2) => {
            validate_stored_v2(&v2, operational_vmk)?;

            return Ok(DesktopV1ToV2MigrationOutcome::AlreadyV2);
        }
    };

    let device_signing_seed = generate_native_device_signing_seed_v1_with_random(random)
        .map_err(|_| DesktopV1ToV2MigrationError::DeviceKeyGenerationFailed)?;

    derive_native_device_public_identity_v1(&device_signing_seed)
        .map_err(|_| DesktopV1ToV2MigrationError::DeviceIdentityValidationFailed)?;

    let operational_payload = NativeOperationalDevicePayloadV1::new(device_signing_seed)
        .map_err(|_| DesktopV1ToV2MigrationError::OperationalPayloadConstructionFailed)?;

    let mut nonce = [0u8; PHASE6A_AEAD_NONCE_LEN];

    random
        .fill(&mut nonce)
        .map_err(|_| DesktopV1ToV2MigrationError::NonceGenerationFailed)?;

    let encrypted_payload =
        encrypt_native_operational_device_payload_v1(operational_vmk, &nonce, &operational_payload)
            .map_err(|_| DesktopV1ToV2MigrationError::OperationalPayloadEncryptionFailed)?;

    let candidate =
        prepare_native_platform_bound_vault_v1_to_v2_migration(&base_v1, &encrypted_payload)
            .map_err(|_| DesktopV1ToV2MigrationError::CandidatePreparationFailed)?;

    let candidate_encoded = encode_native_platform_bound_vault_v2(&candidate)
        .map_err(|_| DesktopV1ToV2MigrationError::CandidateEncodingFailed)?;

    let write_result = write_native_encrypted_vault_atomic(store, &candidate_encoded);

    // A write error does not tell us whether atomic replacement occurred.
    // Always read the authoritative stored state back before classifying it.
    let observed = load_native_encrypted_vault(store)
        .map_err(|_| DesktopV1ToV2MigrationError::PostWriteReadbackFailed)?
        .ok_or(DesktopV1ToV2MigrationError::PostWriteStateAmbiguous)?;

    if observed.as_slice() == candidate_encoded.as_slice() {
        let observed_version = decode_native_platform_bound_vault_versioned(&observed)
            .map_err(|_| DesktopV1ToV2MigrationError::PostWriteVerificationFailed)?;

        let observed_v2 = match observed_version {
            NativePlatformBoundVaultVersioned::V2(v2) => v2,
            NativePlatformBoundVaultVersioned::V1(_) => {
                return Err(DesktopV1ToV2MigrationError::PostWriteVerificationFailed);
            }
        };

        validate_stored_v2(&observed_v2, operational_vmk)
            .map_err(|_| DesktopV1ToV2MigrationError::PostWriteVerificationFailed)?;

        return if write_result.is_ok() {
            Ok(DesktopV1ToV2MigrationOutcome::Migrated)
        } else {
            Ok(DesktopV1ToV2MigrationOutcome::V2ObservedAfterWriteError)
        };
    }

    if observed.as_slice() == original.as_slice() {
        return if write_result.is_err() {
            Err(DesktopV1ToV2MigrationError::WriteFailedOriginalV1Preserved)
        } else {
            Err(DesktopV1ToV2MigrationError::PostWriteVerificationFailed)
        };
    }

    Err(DesktopV1ToV2MigrationError::PostWriteStateAmbiguous)
}

fn validate_stored_v2(
    vault: &NativePlatformBoundVaultV2,
    operational_vmk: &NativeSecretBytes,
) -> Result<NativeDevicePublicIdentityV1, DesktopV1ToV2MigrationError> {
    let operational_payload = decrypt_native_operational_device_payload_v1(
        operational_vmk,
        vault.operational_device_payload(),
    )
    .map_err(|_| DesktopV1ToV2MigrationError::StoredV2AuthenticationFailed)?;

    let identity =
        derive_native_device_public_identity_v1(operational_payload.device_signing_seed())
            .map_err(|_| DesktopV1ToV2MigrationError::StoredV2AuthenticationFailed)?;

    if identity.device_public_key != *operational_payload.device_public_key() {
        return Err(DesktopV1ToV2MigrationError::StoredV2AuthenticationFailed);
    }

    Ok(identity)
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DesktopV1ToV2MigrationPosture {
    pub phase_label: &'static str,
    pub desktop_csprng_label: &'static str,
    pub v1_to_v2_runtime_added: bool,
    pub readback_after_every_write_attempt: bool,
    pub already_v2_idempotent: bool,
    pub blind_rollback_added: bool,
    pub platform_sealer_used: bool,
    pub root_material_used: bool,
    pub public_tauri_command_added: bool,
    pub frontend_secret_dto_added: bool,
    pub username_mutation_added: bool,
    pub wallet_or_ledger_mutation_added: bool,
}

pub fn desktop_v1_to_v2_migration_posture() -> DesktopV1ToV2MigrationPosture {
    DesktopV1ToV2MigrationPosture {
        phase_label: PHYSICAL_M1_DESKTOP_V1_TO_V2_MIGRATION_LABEL,
        desktop_csprng_label: PHYSICAL_M1_DESKTOP_DEVICE_OS_CSPRNG_LABEL,
        v1_to_v2_runtime_added: true,
        readback_after_every_write_attempt: true,
        already_v2_idempotent: true,
        blind_rollback_added: false,
        platform_sealer_used: false,
        root_material_used: false,
        public_tauri_command_added: false,
        frontend_secret_dto_added: false,
        username_mutation_added: false,
        wallet_or_ledger_mutation_added: false,
    }
}
