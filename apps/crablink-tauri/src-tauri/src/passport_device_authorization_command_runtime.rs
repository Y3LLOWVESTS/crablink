//! RO:WHAT — Orchestrates fresh root-confirmed signing of one Physical M1 desktop DeviceAuthorization.
//!
//! RO:WHY — A trusted unsigned authorization becomes authoritative only after a fresh native root confirmation, RecoveryRoot verification, canonical signing, and strict public verification.
//!
//! RO:INTERACTS — operational Passport session, native secret surface, platform-bound vault, unsigned desktop authorization context, `svc-passport` recovery signer, `ron-auth` strict verifier, and canonical `ron-proto` DTOs.
//!
//! RO:INVARIANTS — operational session must already be unlocked; every signing attempt requires a fresh native root PIN; cancellation precedes RecoveryRoot unseal; no persistent root-unlocked session exists.
//!
//! RO:METRICS — none; PINs, recovery factors, signatures, and authorization nonces are never logged here.
//!
//! RO:CONFIG — Physical M1 uses the already-reviewed private-beta network, environment, root epoch, expiry, gateway-profile, clock, and nonce policy.
//!
//! RO:SECURITY — native-only signing orchestration; no Tauri command, WebView secret DTO, secret persistence, authorization persistence, HTTP, capability issuance, username mutation, wallet, or ledger authority.
//!
//! RO:TEST — `tests/physical_m1_desktop_device_authorization_command_runtime.rs`.

#![forbid(unsafe_code)]

use crablink_native_core::gateway_profile::GatewayEnvironmentProfile;
use ron_auth::native_passport::{
    verify_device_authorization_v1_strict, DeviceAuthorizationVerificationContextV1,
};
use ron_proto::{
    DeviceAuthorizationV1, Ed25519PublicKeyHex as ProtoEd25519PublicKeyHex,
    NativePassportContextLabelV1, PassportIdV1 as ProtoPassportIdV1,
};
use svc_passport::native::{
    decode_native_platform_bound_vault_versioned, load_native_encrypted_vault,
    sign_native_recovery_device_authorization_v1, unseal_native_secret,
    verify_native_recovery_root_pin, NativeDevicePublicIdentityV1, NativePlatformSealer,
    NativeSecureCompartment, NativeVaultCryptoError, NativeVaultStore, RootPassportDescriptorV1,
};

use crate::{
    passport_device_authorization_runtime_context::{
        build_physical_m1_private_beta_root_admin_desktop_authorization_payload_with_sources,
        DesktopDeviceAuthorizationClock, DesktopDeviceAuthorizationNonceRandomSource,
        SystemDesktopDeviceAuthorizationClock, PHYSICAL_M1_PRIVATE_BETA_AUTHORIZATION_ENVIRONMENT,
        PHYSICAL_M1_PRIVATE_BETA_NETWORK_ID, PHYSICAL_M1_PRIVATE_BETA_ROOT_KEY_EPOCH,
    },
    passport_device_key_random_runtime::OsDesktopNativeDeviceKeyRandomSource,
    passport_operational_command_runtime::{
        DesktopNativeSecretSurfaceError, DesktopNativeSecretSurfaceOutcome,
        DesktopNativeSecretSurfacePort,
    },
    passport_operational_unlock_runtime::{
        DesktopOperationalVaultSessionState, DesktopOperationalVaultSessionStore,
    },
};

/// Physical M1 root-confirmed authorization orchestration marker.
pub const PHYSICAL_M1_ROOT_CONFIRMED_DEVICE_AUTHORIZATION_RUNTIME_LABEL: &str =
    "PHYSICAL_M1_ROOT_CONFIRMED_DEVICE_AUTHORIZATION_RUNTIME_V1";

/// Fail-closed root-confirmed authorization failure.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[non_exhaustive]
pub enum DesktopDeviceAuthorizationCommandRuntimeError {
    /// Native operational session state could not be inspected.
    OperationalSessionUnavailable,

    /// Passport must already have an operationally unlocked device session.
    OperationalUnlockRequired,

    /// Trusted unsigned runtime context could not be constructed.
    RuntimeContextRejected,

    /// Stored Passport vault could not be loaded.
    VaultLoadFailed,

    /// No stored Passport vault exists.
    NoStoredVault,

    /// Stored platform-bound vault failed strict decoding.
    VaultDecodeFailed,

    /// Native root-confirmation surface rejected input.
    RootConfirmationRejected,

    /// User cancelled the fresh root-confirmation ceremony.
    RootConfirmationCancelled,

    /// Native secure-input surface was unavailable.
    NativeSecretSurfaceUnavailable,

    /// RecoveryRoot platform factor could not be unsealed.
    RecoveryFactorUnsealFailed,

    /// Root PIN was syntactically invalid or did not authenticate.
    RootPinRejected,

    /// RecoveryRoot PIN verification failed for another internal reason.
    RootPinVerificationFailed,

    /// Canonical recovery-factor DeviceAuthorization signing failed.
    RecoverySigningFailed,

    /// Trusted public verification context could not be constructed.
    TrustedVerificationContextInvalid,

    /// Newly signed public authorization failed strict verification.
    StrictVerificationFailed,
}

/// Perform one production Physical M1 private-beta root-confirmed
/// RootAdminDesktop authorization ceremony.
///
/// This function is native Rust only. It is deliberately not a Tauri command.
///
/// # Errors
///
/// Returns a fail-closed error unless the operational session is unlocked,
/// trusted unsigned context is valid, fresh native root confirmation succeeds,
/// RecoveryRoot authenticates, canonical signing succeeds, and strict public
/// verification accepts the result.
pub fn authorize_physical_m1_private_beta_root_admin_desktop<S, V, P>(
    vault_store: &V,
    sealer: &S,
    session_store: &DesktopOperationalVaultSessionStore,
    secret_surface: &P,
    root: &RootPassportDescriptorV1,
    device: &NativeDevicePublicIdentityV1,
    gateway_profile: GatewayEnvironmentProfile,
) -> Result<DeviceAuthorizationV1, DesktopDeviceAuthorizationCommandRuntimeError>
where
    S: NativePlatformSealer + ?Sized,
    V: NativeVaultStore + ?Sized,
    P: DesktopNativeSecretSurfacePort + ?Sized,
{
    authorize_physical_m1_private_beta_root_admin_desktop_with_sources(
        vault_store,
        sealer,
        session_store,
        secret_surface,
        root,
        device,
        gateway_profile,
        &OsDesktopNativeDeviceKeyRandomSource,
        &SystemDesktopDeviceAuthorizationClock,
    )
}

/// Injectable form of the Physical M1 root-confirmed authorization ceremony.
///
/// Randomness and time are injectable only for deterministic focused tests.
/// Device class and authorization scope ceiling remain trusted policy-owned.
///
/// # Errors
///
/// Returns the same fail-closed errors as
/// [`authorize_physical_m1_private_beta_root_admin_desktop`].
#[allow(clippy::too_many_arguments)]
pub fn authorize_physical_m1_private_beta_root_admin_desktop_with_sources<S, V, P, R, C>(
    vault_store: &V,
    sealer: &S,
    session_store: &DesktopOperationalVaultSessionStore,
    secret_surface: &P,
    root: &RootPassportDescriptorV1,
    device: &NativeDevicePublicIdentityV1,
    gateway_profile: GatewayEnvironmentProfile,
    random: &R,
    clock: &C,
) -> Result<DeviceAuthorizationV1, DesktopDeviceAuthorizationCommandRuntimeError>
where
    S: NativePlatformSealer + ?Sized,
    V: NativeVaultStore + ?Sized,
    P: DesktopNativeSecretSurfacePort + ?Sized,
    R: DesktopDeviceAuthorizationNonceRandomSource + ?Sized,
    C: DesktopDeviceAuthorizationClock + ?Sized,
{
    require_operational_session(session_store)?;

    let payload =
        build_physical_m1_private_beta_root_admin_desktop_authorization_payload_with_sources(
            root,
            device,
            gateway_profile,
            random,
            clock,
        )
        .map_err(|_| DesktopDeviceAuthorizationCommandRuntimeError::RuntimeContextRejected)?;

    let verification_now_ms = payload.issued_at_ms;

    let encrypted_vault = load_native_encrypted_vault(vault_store)
        .map_err(|_| DesktopDeviceAuthorizationCommandRuntimeError::VaultLoadFailed)?
        .ok_or(DesktopDeviceAuthorizationCommandRuntimeError::NoStoredVault)?;

    let versioned_vault = decode_native_platform_bound_vault_versioned(&encrypted_vault)
        .map_err(|_| DesktopDeviceAuthorizationCommandRuntimeError::VaultDecodeFailed)?;

    let vault = versioned_vault.base_v1();

    let root_pin = match secret_surface.request_root_confirmation_pin() {
        Ok(DesktopNativeSecretSurfaceOutcome::Secret(pin)) => pin,

        Ok(DesktopNativeSecretSurfaceOutcome::Rejected) => {
            return Err(DesktopDeviceAuthorizationCommandRuntimeError::RootConfirmationRejected);
        }

        Ok(DesktopNativeSecretSurfaceOutcome::Cancelled) => {
            return Err(DesktopDeviceAuthorizationCommandRuntimeError::RootConfirmationCancelled);
        }

        Ok(DesktopNativeSecretSurfaceOutcome::Unavailable)
        | Err(DesktopNativeSecretSurfaceError::Unavailable) => {
            return Err(
                DesktopDeviceAuthorizationCommandRuntimeError::NativeSecretSurfaceUnavailable,
            );
        }
    };

    let recovery_factor = unseal_native_secret(
        sealer,
        vault.platform_family(),
        NativeSecureCompartment::RecoveryRoot,
        vault.recovery_root_factor(),
    )
    .map_err(|_| DesktopDeviceAuthorizationCommandRuntimeError::RecoveryFactorUnsealFailed)?;

    match verify_native_recovery_root_pin(
        vault.wrapped_keys().recovery_root(),
        root_pin.as_slice(),
        &recovery_factor,
    ) {
        Ok(()) => {}

        Err(NativeVaultCryptoError::AuthenticationFailed)
        | Err(NativeVaultCryptoError::InvalidPinLength { .. }) => {
            return Err(DesktopDeviceAuthorizationCommandRuntimeError::RootPinRejected);
        }

        Err(_) => {
            return Err(DesktopDeviceAuthorizationCommandRuntimeError::RootPinVerificationFailed);
        }
    }

    let authorization = sign_native_recovery_device_authorization_v1(&recovery_factor, payload)
        .map_err(|_| DesktopDeviceAuthorizationCommandRuntimeError::RecoverySigningFailed)?;

    strict_verify_new_authorization(&authorization, root, verification_now_ms)?;

    Ok(authorization)
}

fn require_operational_session(
    session_store: &DesktopOperationalVaultSessionStore,
) -> Result<(), DesktopDeviceAuthorizationCommandRuntimeError> {
    match session_store.state() {
        Ok(DesktopOperationalVaultSessionState::OperationalUnlocked) => Ok(()),

        Ok(
            DesktopOperationalVaultSessionState::Locked
            | DesktopOperationalVaultSessionState::Unlocking,
        ) => Err(DesktopDeviceAuthorizationCommandRuntimeError::OperationalUnlockRequired),

        Err(_) => Err(DesktopDeviceAuthorizationCommandRuntimeError::OperationalSessionUnavailable),
    }
}

fn strict_verify_new_authorization(
    authorization: &DeviceAuthorizationV1,
    root: &RootPassportDescriptorV1,
    verification_now_ms: u64,
) -> Result<(), DesktopDeviceAuthorizationCommandRuntimeError> {
    let trusted_passport_id =
        ProtoPassportIdV1::parse(root.passport_id.as_str()).map_err(|_| {
            DesktopDeviceAuthorizationCommandRuntimeError::TrustedVerificationContextInvalid
        })?;

    let trusted_root_public_key = ProtoEd25519PublicKeyHex::parse(root.root_public_key.as_str())
        .map_err(|_| {
            DesktopDeviceAuthorizationCommandRuntimeError::TrustedVerificationContextInvalid
        })?;

    let expected_network_id =
        NativePassportContextLabelV1::parse(PHYSICAL_M1_PRIVATE_BETA_NETWORK_ID).map_err(|_| {
            DesktopDeviceAuthorizationCommandRuntimeError::TrustedVerificationContextInvalid
        })?;

    let expected_environment =
        NativePassportContextLabelV1::parse(PHYSICAL_M1_PRIVATE_BETA_AUTHORIZATION_ENVIRONMENT)
            .map_err(|_| {
                DesktopDeviceAuthorizationCommandRuntimeError::TrustedVerificationContextInvalid
            })?;

    verify_device_authorization_v1_strict(
        authorization,
        DeviceAuthorizationVerificationContextV1 {
            trusted_passport_id: &trusted_passport_id,
            trusted_root_public_key: &trusted_root_public_key,
            trusted_root_key_epoch: PHYSICAL_M1_PRIVATE_BETA_ROOT_KEY_EPOCH,
            expected_network_id: &expected_network_id,
            expected_environment: &expected_environment,
            now_ms: verification_now_ms,
            max_clock_skew_ms: 0,
        },
    )
    .map_err(|_| DesktopDeviceAuthorizationCommandRuntimeError::StrictVerificationFailed)
}
