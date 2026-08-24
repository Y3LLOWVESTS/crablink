//! RO:WHAT — Finalizes the public identity of an existing desktop Native Passport into the immutable public descriptor sidecar.
//! RO:WHY — Physical M1 needs one root-derived canonical subject followed by restart-safe public reads that never repeatedly unseal RecoveryRoot.
//! RO:INTERACTS — NativeVaultStore, stored-Passport public-identity derivation, DesktopPublicPassportDescriptorStore, and later root-confirmed Tauri orchestration.
//! RO:INVARIANTS — a public descriptor is valid only while the Passport vault exists; an existing descriptor avoids RecoveryRoot access; first finalization derives once and persists with no-clobber semantics.
//! RO:SECURITY — no recovery phrase, factor, BIP-39 seed, signing seed, VMK, PIN, device key, capability, username, wallet, or ledger material is returned or persisted here.
//! RO:TEST — tests/physical_m1_identity_finalization_runtime.rs.

use svc_passport::native::{
    decode_native_platform_bound_vault_versioned, derive_native_recovery_public_identity_v1,
    load_native_encrypted_vault, unseal_native_secret, verify_native_recovery_root_pin,
    NativePlatformSealer, NativeSecureCompartment, NativeVaultCryptoError, NativeVaultStore,
    RootPassportDescriptorV1,
};

use crate::{
    passport_public_identity_runtime::{
        derive_stored_desktop_passport_public_identity, DesktopStoredPassportPublicIdentityState,
    },
    passport_public_identity_store::{
        DesktopPublicPassportDescriptorStore, PublicDescriptorPersistOutcome,
    },
};

pub const PHYSICAL_M1_IDENTITY_FINALIZATION_LABEL: &str =
    "PHYSICAL_M1_DESKTOP_PASSPORT_IDENTITY_FINALIZATION_V1";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DesktopPassportIdentityFinalizationState {
    NoPassport,
    Finalized,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DesktopPassportIdentityFinalizationOutcome {
    pub state: DesktopPassportIdentityFinalizationState,
    pub public_identity: Option<RootPassportDescriptorV1>,
    pub derived_from_recovery_root: bool,
    pub recovery_root_unsealed: bool,
    pub public_descriptor_written: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DesktopPassportIdentityFinalizationError {
    VaultLoadFailed,
    PublicDescriptorLoadFailed,
    OrphanedPublicDescriptor,
    StoredIdentityDerivationFailed,
    VaultChangedDuringFinalization,
    DerivedIdentityMissing,
    PublicDescriptorPersistFailed,
    VaultDecodeFailed,
    RecoveryFactorUnsealFailed,
    RootPinRejected,
    RootPinVerificationFailed,
    IdentityDerivationFailed,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DesktopPassportIdentityFinalizationPosture {
    pub phase_label: &'static str,
    pub canonical_identity_owner: &'static str,
    pub platform_orchestration_owner: &'static str,
    pub vault_required_for_descriptor_use: bool,
    pub existing_descriptor_avoids_root_unseal: bool,
    pub first_finalization_derives_from_recovery_root: bool,
    pub public_descriptor_persisted: bool,
    pub public_tauri_command_added: bool,
    pub app_state_mutation_added: bool,
    pub frontend_secret_custody_added: bool,
    pub username_mutation_added: bool,
    pub wallet_or_ledger_mutation_added: bool,
}

pub fn desktop_passport_identity_finalization_posture() -> DesktopPassportIdentityFinalizationPosture
{
    DesktopPassportIdentityFinalizationPosture {
        phase_label: PHYSICAL_M1_IDENTITY_FINALIZATION_LABEL,
        canonical_identity_owner: "svc-passport",
        platform_orchestration_owner: "crablink-tauri",
        vault_required_for_descriptor_use: true,
        existing_descriptor_avoids_root_unseal: true,
        first_finalization_derives_from_recovery_root: true,
        public_descriptor_persisted: true,
        public_tauri_command_added: false,
        app_state_mutation_added: false,
        frontend_secret_custody_added: false,
        username_mutation_added: false,
        wallet_or_ledger_mutation_added: false,
    }
}

pub fn finalize_stored_desktop_passport_identity<S, V>(
    vault_store: &V,
    sealer: &S,
    public_store: &DesktopPublicPassportDescriptorStore,
) -> Result<DesktopPassportIdentityFinalizationOutcome, DesktopPassportIdentityFinalizationError>
where
    S: NativePlatformSealer + ?Sized,
    V: NativeVaultStore + ?Sized,
{
    let vault_present = load_native_encrypted_vault(vault_store)
        .map_err(|_| DesktopPassportIdentityFinalizationError::VaultLoadFailed)?
        .is_some();

    let existing = public_store
        .load()
        .map_err(|_| DesktopPassportIdentityFinalizationError::PublicDescriptorLoadFailed)?;

    if !vault_present {
        if existing.is_some() {
            return Err(DesktopPassportIdentityFinalizationError::OrphanedPublicDescriptor);
        }

        return Ok(DesktopPassportIdentityFinalizationOutcome {
            state: DesktopPassportIdentityFinalizationState::NoPassport,
            public_identity: None,
            derived_from_recovery_root: false,
            recovery_root_unsealed: false,
            public_descriptor_written: false,
        });
    }

    if let Some(existing) = existing {
        return Ok(DesktopPassportIdentityFinalizationOutcome {
            state: DesktopPassportIdentityFinalizationState::Finalized,
            public_identity: Some(existing),
            derived_from_recovery_root: false,
            recovery_root_unsealed: false,
            public_descriptor_written: false,
        });
    }

    let derived = derive_stored_desktop_passport_public_identity(vault_store, sealer)
        .map_err(|_| DesktopPassportIdentityFinalizationError::StoredIdentityDerivationFailed)?;

    if derived.state != DesktopStoredPassportPublicIdentityState::Available {
        return Err(DesktopPassportIdentityFinalizationError::VaultChangedDuringFinalization);
    }

    let descriptor = derived
        .public_identity
        .ok_or(DesktopPassportIdentityFinalizationError::DerivedIdentityMissing)?;

    let persist = public_store
        .persist_once(&descriptor)
        .map_err(|_| DesktopPassportIdentityFinalizationError::PublicDescriptorPersistFailed)?;

    Ok(DesktopPassportIdentityFinalizationOutcome {
        state: DesktopPassportIdentityFinalizationState::Finalized,
        public_identity: Some(descriptor),
        derived_from_recovery_root: true,
        recovery_root_unsealed: derived.recovery_root_unsealed,
        public_descriptor_written: matches!(persist, PublicDescriptorPersistOutcome::Written),
    })
}

/// Finalize the public identity of an existing Passport only after the native
/// RecoveryRoot PIN has been authenticated against the wrapped RecoveryRoot
/// VMK.
///
/// An already-finalized public descriptor is returned without RecoveryRoot
/// access. On first finalization the platform factor is unsealed exactly once,
/// the PIN is authenticated, the verified root VMK is immediately discarded
/// by `svc-passport`, and the same recovery factor is then used to derive the
/// canonical public identity.
pub fn finalize_stored_desktop_passport_identity_with_root_pin<S, V>(
    vault_store: &V,
    sealer: &S,
    public_store: &DesktopPublicPassportDescriptorStore,
    root_pin: &[u8],
) -> Result<DesktopPassportIdentityFinalizationOutcome, DesktopPassportIdentityFinalizationError>
where
    S: NativePlatformSealer + ?Sized,
    V: NativeVaultStore + ?Sized,
{
    let encrypted_vault = load_native_encrypted_vault(vault_store)
        .map_err(|_| DesktopPassportIdentityFinalizationError::VaultLoadFailed)?;

    let existing = public_store
        .load()
        .map_err(|_| DesktopPassportIdentityFinalizationError::PublicDescriptorLoadFailed)?;

    let Some(encrypted_vault) = encrypted_vault else {
        if existing.is_some() {
            return Err(DesktopPassportIdentityFinalizationError::OrphanedPublicDescriptor);
        }

        return Ok(DesktopPassportIdentityFinalizationOutcome {
            state: DesktopPassportIdentityFinalizationState::NoPassport,
            public_identity: None,
            derived_from_recovery_root: false,
            recovery_root_unsealed: false,
            public_descriptor_written: false,
        });
    };

    if let Some(existing) = existing {
        return Ok(DesktopPassportIdentityFinalizationOutcome {
            state: DesktopPassportIdentityFinalizationState::Finalized,
            public_identity: Some(existing),
            derived_from_recovery_root: false,
            recovery_root_unsealed: false,
            public_descriptor_written: false,
        });
    }

    let versioned_vault = decode_native_platform_bound_vault_versioned(&encrypted_vault)
        .map_err(|_| DesktopPassportIdentityFinalizationError::VaultDecodeFailed)?;

    let vault = versioned_vault.base_v1();

    let recovery_factor = unseal_native_secret(
        sealer,
        vault.platform_family(),
        NativeSecureCompartment::RecoveryRoot,
        vault.recovery_root_factor(),
    )
    .map_err(|_| DesktopPassportIdentityFinalizationError::RecoveryFactorUnsealFailed)?;

    match verify_native_recovery_root_pin(
        vault.wrapped_keys().recovery_root(),
        root_pin,
        &recovery_factor,
    ) {
        Ok(()) => {}
        Err(NativeVaultCryptoError::AuthenticationFailed)
        | Err(NativeVaultCryptoError::InvalidPinLength { .. }) => {
            return Err(DesktopPassportIdentityFinalizationError::RootPinRejected);
        }
        Err(_) => {
            return Err(DesktopPassportIdentityFinalizationError::RootPinVerificationFailed);
        }
    }

    let descriptor = derive_native_recovery_public_identity_v1(&recovery_factor)
        .map_err(|_| DesktopPassportIdentityFinalizationError::IdentityDerivationFailed)?;

    let persist = public_store
        .persist_once(&descriptor)
        .map_err(|_| DesktopPassportIdentityFinalizationError::PublicDescriptorPersistFailed)?;

    Ok(DesktopPassportIdentityFinalizationOutcome {
        state: DesktopPassportIdentityFinalizationState::Finalized,
        public_identity: Some(descriptor),
        derived_from_recovery_root: true,
        recovery_root_unsealed: true,
        public_descriptor_written: matches!(persist, PublicDescriptorPersistOutcome::Written),
    })
}
