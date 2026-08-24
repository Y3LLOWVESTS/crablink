//! RO:WHAT — Derives the public Native Passport identity from an existing stored desktop Passport vault.
//! RO:WHY — Physical M1 needs the actual locally owned Passport subject before CrabLink may attempt a backend username claim.
//! RO:INTERACTS — NativeVaultStore, NativePlatformSealer, platform-bound vault decoding, RecoveryRoot unseal, and svc-passport recovery-identity derivation.
//! RO:INVARIANTS — only RecoveryRoot is unsealed; no operational factor, VMK, PIN, recovery phrase, root signing seed, username, wallet, or ledger state participates.
//! RO:SECURITY — returns public identity material only; recovery material remains native-only and zeroizing; no Tauri command, WebView custody, storage mutation, capability issuance, or network mutation.
//! RO:TEST — tests/physical_m1_stored_passport_public_identity_runtime.rs.

use svc_passport::native::{
    decode_native_platform_bound_vault_versioned, derive_native_recovery_public_identity_v1,
    load_native_encrypted_vault, unseal_native_secret, NativePlatformSealer,
    NativeSecureCompartment, NativeVaultStore, RootPassportDescriptorV1,
};

pub const PHYSICAL_M1_STORED_PASSPORT_PUBLIC_IDENTITY_LABEL: &str =
    "PHYSICAL_M1_STORED_PASSPORT_PUBLIC_IDENTITY_RUNTIME_V1";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DesktopStoredPassportPublicIdentityState {
    NoPassport,
    Available,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DesktopStoredPassportPublicIdentityOutcome {
    pub state: DesktopStoredPassportPublicIdentityState,
    pub public_identity: Option<RootPassportDescriptorV1>,
    pub recovery_root_unsealed: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DesktopStoredPassportPublicIdentityError {
    VaultLoadFailed,
    VaultDecodeFailed,
    RecoveryFactorUnsealFailed,
    IdentityDerivationFailed,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DesktopStoredPassportPublicIdentityPosture {
    pub phase_label: &'static str,
    pub canonical_identity_owner: &'static str,
    pub platform_orchestration_owner: &'static str,
    pub stored_vault_required: bool,
    pub recovery_root_factor_unsealed: bool,
    pub operational_factor_unsealed: bool,
    pub root_vmk_unlocked: bool,
    pub recovery_phrase_returned: bool,
    pub recovery_factor_returned: bool,
    pub root_signing_material_returned: bool,
    pub public_tauri_command_added: bool,
    pub frontend_secret_custody_added: bool,
    pub vault_mutation_added: bool,
    pub username_mutation_added: bool,
    pub wallet_or_ledger_mutation_added: bool,
}

pub fn desktop_stored_passport_public_identity_posture(
) -> DesktopStoredPassportPublicIdentityPosture {
    DesktopStoredPassportPublicIdentityPosture {
        phase_label: PHYSICAL_M1_STORED_PASSPORT_PUBLIC_IDENTITY_LABEL,
        canonical_identity_owner: "svc-passport",
        platform_orchestration_owner: "crablink-tauri",
        stored_vault_required: true,
        recovery_root_factor_unsealed: true,
        operational_factor_unsealed: false,
        root_vmk_unlocked: false,
        recovery_phrase_returned: false,
        recovery_factor_returned: false,
        root_signing_material_returned: false,
        public_tauri_command_added: false,
        frontend_secret_custody_added: false,
        vault_mutation_added: false,
        username_mutation_added: false,
        wallet_or_ledger_mutation_added: false,
    }
}

/// Derive the public identity belonging to the existing stored desktop
/// Passport.
///
/// This runtime intentionally has no Tauri command. A later privileged caller
/// must decide when root-sensitive derivation is authorized. This function
/// performs no persistence or network mutation.
pub fn derive_stored_desktop_passport_public_identity<S, V>(
    store: &V,
    sealer: &S,
) -> Result<DesktopStoredPassportPublicIdentityOutcome, DesktopStoredPassportPublicIdentityError>
where
    S: NativePlatformSealer + ?Sized,
    V: NativeVaultStore + ?Sized,
{
    let Some(encrypted_vault) = load_native_encrypted_vault(store)
        .map_err(|_| DesktopStoredPassportPublicIdentityError::VaultLoadFailed)?
    else {
        return Ok(DesktopStoredPassportPublicIdentityOutcome {
            state: DesktopStoredPassportPublicIdentityState::NoPassport,
            public_identity: None,
            recovery_root_unsealed: false,
        });
    };

    let versioned_vault = decode_native_platform_bound_vault_versioned(&encrypted_vault)
        .map_err(|_| DesktopStoredPassportPublicIdentityError::VaultDecodeFailed)?;

    let vault = versioned_vault.base_v1();

    let recovery_factor = unseal_native_secret(
        sealer,
        vault.platform_family(),
        NativeSecureCompartment::RecoveryRoot,
        vault.recovery_root_factor(),
    )
    .map_err(|_| DesktopStoredPassportPublicIdentityError::RecoveryFactorUnsealFailed)?;

    let public_identity = derive_native_recovery_public_identity_v1(&recovery_factor)
        .map_err(|_| DesktopStoredPassportPublicIdentityError::IdentityDerivationFailed)?;

    Ok(DesktopStoredPassportPublicIdentityOutcome {
        state: DesktopStoredPassportPublicIdentityState::Available,
        public_identity: Some(public_identity),
        recovery_root_unsealed: true,
    })
}
