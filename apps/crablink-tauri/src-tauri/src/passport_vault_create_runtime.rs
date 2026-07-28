//! RO:WHAT — Creates one platform-bound encrypted Native Passport vault from secure random factors, VMKs, salts, and XChaCha nonces.
//! RO:WHY — Phase 15R connects the Phase 15Q crypto contract to the selected desktop PlatformSealer and atomic VaultStore without exposing a frontend command.
//! RO:INTERACTS — svc-passport platform-bound vault envelope, PlatformSealer, DesktopAtomicVaultStore, Phase 15P stored status, and future native create UI.
//! RO:INVARIANTS — creation refuses an existing vault; validates PIN bounds before randomness or platform mutation; uses independent random material for both compartments; stores sealed factors plus encrypted wrapped VMKs atomically.
//! RO:SECURITY — no PIN persistence, root unlock, secret return DTO, Tauri command, WebView custody, capability issuance, signing, wallet mutation, or ledger mutation.
//! RO:TEST — tests/phase15r_platform_factor_and_vault_create_orchestration.rs.

use svc_passport::native::{
    encode_native_platform_bound_vault, load_native_encrypted_vault, seal_native_secret,
    wrap_native_compartment_vmk, write_native_encrypted_vault_atomic, NativePinWrappedVaultKeysV1,
    NativePlatformBoundVaultError, NativePlatformBoundVaultV1, NativePlatformFamily,
    NativePlatformSealer, NativePlatformStorageError, NativeSecretBytes, NativeSecureCompartment,
    NativeVaultCryptoError, NativeVaultStore, PHASE15Q_PLATFORM_FACTOR_BYTES,
    PHASE15Q_VAULT_MASTER_KEY_BYTES, PHASE6A_AEAD_NONCE_LEN, PHASE6A_KDF_SALT_LEN,
    PHASE6B_MAX_PIN_LENGTH, PHASE6B_MIN_PIN_LENGTH,
};

pub const NATIVE_PASSPORT_PHASE15R_LABEL: &str =
    "NATIVE_PASSPORT_PHASE15R_PLATFORM_FACTOR_AND_VAULT_CREATE_ORCHESTRATION";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DesktopNativePassportVaultCreateState {
    CreatedLocked,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DesktopNativePassportVaultCreateOutcome {
    pub state: DesktopNativePassportVaultCreateState,
    pub platform_family: NativePlatformFamily,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DesktopNativePassportVaultCreateError {
    VaultAlreadyExists,
    InvalidPinLength {
        actual: usize,
        minimum: usize,
        maximum: usize,
    },
    RandomnessUnavailable,
    PlatformStorageFailure,
    PendingRecoverySessionFailure,
    PendingOperationalSessionFailure,
    VaultCryptoFailure,
    PlatformBoundVaultFailure,
}

impl From<NativePlatformStorageError> for DesktopNativePassportVaultCreateError {
    fn from(_: NativePlatformStorageError) -> Self {
        Self::PlatformStorageFailure
    }
}

impl From<NativeVaultCryptoError> for DesktopNativePassportVaultCreateError {
    fn from(_: NativeVaultCryptoError) -> Self {
        Self::VaultCryptoFailure
    }
}

impl From<NativePlatformBoundVaultError> for DesktopNativePassportVaultCreateError {
    fn from(_: NativePlatformBoundVaultError) -> Self {
        Self::PlatformBoundVaultFailure
    }
}

pub trait NativeVaultRandomSource: Send + Sync {
    fn fill(&self, output: &mut [u8]) -> Result<(), ()>;
}

#[derive(Debug, Clone, Copy, Default)]
pub struct OsNativeVaultRandomSource;

impl NativeVaultRandomSource for OsNativeVaultRandomSource {
    fn fill(&self, output: &mut [u8]) -> Result<(), ()> {
        getrandom::fill(output).map_err(|_| ())
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DesktopNativePassportVaultCreatePosture {
    pub phase_label: &'static str,
    pub canonical_crypto_owner: &'static str,
    pub platform_adapter_owner: &'static str,
    pub secure_os_randomness_used: bool,
    pub existing_vault_overwrite_rejected: bool,
    pub pin_validated_before_side_effects: bool,
    pub independent_root_and_operational_factors: bool,
    pub independent_root_and_operational_vmks: bool,
    pub independent_salts_and_nonces: bool,
    pub platform_factors_sealed: bool,
    pub encrypted_vault_written_atomically: bool,
    pub created_state_is_locked: bool,
    pub public_create_command_added: bool,
    pub pin_persisted: bool,
    pub root_unlock_added: bool,
    pub secret_return_dto_added: bool,
    pub ron_kms_key_lifecycle_touched: bool,
    pub capability_issuance_added: bool,
    pub wallet_or_ledger_mutation_added: bool,
}

pub fn desktop_native_passport_vault_create_posture() -> DesktopNativePassportVaultCreatePosture {
    DesktopNativePassportVaultCreatePosture {
        phase_label: NATIVE_PASSPORT_PHASE15R_LABEL,
        canonical_crypto_owner: "svc-passport",
        platform_adapter_owner: "crablink-tauri",
        secure_os_randomness_used: true,
        existing_vault_overwrite_rejected: true,
        pin_validated_before_side_effects: true,
        independent_root_and_operational_factors: true,
        independent_root_and_operational_vmks: true,
        independent_salts_and_nonces: true,
        platform_factors_sealed: true,
        encrypted_vault_written_atomically: true,
        created_state_is_locked: true,
        public_create_command_added: false,
        pin_persisted: false,
        root_unlock_added: false,
        secret_return_dto_added: false,
        ron_kms_key_lifecycle_touched: false,
        capability_issuance_added: false,
        wallet_or_ledger_mutation_added: false,
    }
}

pub fn create_desktop_native_passport_vault<S, V>(
    store: &V,
    sealer: &S,
    pin: &[u8],
) -> Result<DesktopNativePassportVaultCreateOutcome, DesktopNativePassportVaultCreateError>
where
    S: NativePlatformSealer + ?Sized,
    V: NativeVaultStore + ?Sized,
{
    create_desktop_native_passport_vault_with_random(&OsNativeVaultRandomSource, store, sealer, pin)
}

pub fn create_desktop_native_passport_vault_with_random<R, S, V>(
    random: &R,
    store: &V,
    sealer: &S,
    pin: &[u8],
) -> Result<DesktopNativePassportVaultCreateOutcome, DesktopNativePassportVaultCreateError>
where
    R: NativeVaultRandomSource + ?Sized,
    S: NativePlatformSealer + ?Sized,
    V: NativeVaultStore + ?Sized,
{
    create_desktop_native_passport_vault_with_random_and_recovery_handoff(
        random,
        store,
        sealer,
        pin,
        |_| Ok(()),
    )
}

pub(crate) fn create_desktop_native_passport_vault_with_random_and_recovery_handoff<R, S, V, F>(
    random: &R,
    store: &V,
    sealer: &S,
    pin: &[u8],
    recovery_handoff: F,
) -> Result<DesktopNativePassportVaultCreateOutcome, DesktopNativePassportVaultCreateError>
where
    R: NativeVaultRandomSource + ?Sized,
    S: NativePlatformSealer + ?Sized,
    V: NativeVaultStore + ?Sized,
    F: FnOnce(&NativeSecretBytes) -> Result<(), DesktopNativePassportVaultCreateError>,
{
    create_desktop_native_passport_vault_with_random_and_factor_handoff(
        random,
        store,
        sealer,
        pin,
        |recovery_factor, _operational_factor| recovery_handoff(recovery_factor),
    )
}

pub(crate) fn create_desktop_native_passport_vault_with_random_and_factor_handoff<R, S, V, F>(
    random: &R,
    store: &V,
    sealer: &S,
    pin: &[u8],
    factor_handoff: F,
) -> Result<DesktopNativePassportVaultCreateOutcome, DesktopNativePassportVaultCreateError>
where
    R: NativeVaultRandomSource + ?Sized,
    S: NativePlatformSealer + ?Sized,
    V: NativeVaultStore + ?Sized,
    F: FnOnce(
        &NativeSecretBytes,
        &NativeSecretBytes,
    ) -> Result<(), DesktopNativePassportVaultCreateError>,
{
    if load_native_encrypted_vault(store)?.is_some() {
        return Err(DesktopNativePassportVaultCreateError::VaultAlreadyExists);
    }

    validate_create_pin(pin)?;

    let recovery_root_factor = random_secret(random, PHASE15Q_PLATFORM_FACTOR_BYTES)?;

    let operational_factor = random_secret(random, PHASE15Q_PLATFORM_FACTOR_BYTES)?;

    let recovery_root_vmk = random_secret(random, PHASE15Q_VAULT_MASTER_KEY_BYTES)?;

    let operational_vmk = random_secret(random, PHASE15Q_VAULT_MASTER_KEY_BYTES)?;

    let recovery_root_salt = random_array::<PHASE6A_KDF_SALT_LEN, _>(random)?;

    let operational_salt = random_array::<PHASE6A_KDF_SALT_LEN, _>(random)?;

    let recovery_root_nonce = random_array::<PHASE6A_AEAD_NONCE_LEN, _>(random)?;

    let operational_nonce = random_array::<PHASE6A_AEAD_NONCE_LEN, _>(random)?;

    let recovery_root_wrapped = wrap_native_compartment_vmk(
        NativeSecureCompartment::RecoveryRoot,
        pin,
        &recovery_root_factor,
        &recovery_root_salt,
        &recovery_root_nonce,
        &recovery_root_vmk,
    )?;

    let operational_wrapped = wrap_native_compartment_vmk(
        NativeSecureCompartment::DeviceKey,
        pin,
        &operational_factor,
        &operational_salt,
        &operational_nonce,
        &operational_vmk,
    )?;

    let wrapped_keys =
        NativePinWrappedVaultKeysV1::new(recovery_root_wrapped, operational_wrapped)?;

    factor_handoff(&recovery_root_factor, &operational_factor)?;

    let platform_family = sealer.platform_family();

    let sealed_recovery_root_factor = seal_native_secret(
        sealer,
        platform_family,
        NativeSecureCompartment::RecoveryRoot,
        &recovery_root_factor,
    )?;

    let sealed_operational_factor = seal_native_secret(
        sealer,
        platform_family,
        NativeSecureCompartment::DeviceKey,
        &operational_factor,
    )?;

    let platform_bound_vault = NativePlatformBoundVaultV1::new(
        platform_family,
        sealed_recovery_root_factor,
        sealed_operational_factor,
        wrapped_keys,
    )?;

    let encrypted_vault = encode_native_platform_bound_vault(&platform_bound_vault)?;

    write_native_encrypted_vault_atomic(store, &encrypted_vault)?;

    Ok(DesktopNativePassportVaultCreateOutcome {
        state: DesktopNativePassportVaultCreateState::CreatedLocked,
        platform_family,
    })
}

fn validate_create_pin(pin: &[u8]) -> Result<(), DesktopNativePassportVaultCreateError> {
    let minimum = usize::from(PHASE6B_MIN_PIN_LENGTH);

    let maximum = usize::from(PHASE6B_MAX_PIN_LENGTH);

    if pin.len() < minimum || pin.len() > maximum {
        return Err(DesktopNativePassportVaultCreateError::InvalidPinLength {
            actual: pin.len(),
            minimum,
            maximum,
        });
    }

    Ok(())
}

fn random_secret<R>(
    random: &R,
    length: usize,
) -> Result<NativeSecretBytes, DesktopNativePassportVaultCreateError>
where
    R: NativeVaultRandomSource + ?Sized,
{
    let mut bytes = vec![0u8; length];

    if random.fill(&mut bytes).is_err() {
        bytes.fill(0);

        return Err(DesktopNativePassportVaultCreateError::RandomnessUnavailable);
    }

    NativeSecretBytes::new(bytes).map_err(Into::into)
}

fn random_array<const N: usize, R>(
    random: &R,
) -> Result<[u8; N], DesktopNativePassportVaultCreateError>
where
    R: NativeVaultRandomSource + ?Sized,
{
    let mut bytes = [0u8; N];

    random
        .fill(&mut bytes)
        .map_err(|_| DesktopNativePassportVaultCreateError::RandomnessUnavailable)?;

    Ok(bytes)
}
