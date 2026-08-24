//! RO:WHAT — Loads trusted Physical M1 Passport/device public identity from native state and invokes the root-confirmed DeviceAuthorization signer.
//!
//! RO:WHY — A WebView-triggered authorization must never choose the Passport identity, device identity, gateway posture, class, scopes, nonce, timing, or root material.
//!
//! RO:INTERACTS — durable public Passport descriptor store, authenticated V2 device-identity reader, native operational session, fixed private-beta gateway posture, and root-confirmed signing runtime.
//!
//! RO:INVARIANTS — public descriptor and V2 device identity are loaded inside native Rust; DevelopmentLan is fixed here; caller supplies no identity or authority fields.
//!
//! RO:METRICS — none; no identity, nonce, PIN, RecoveryRoot factor, or signature logging.
//!
//! RO:CONFIG — Physical M1 command bridge is restricted to the reviewed DevelopmentLan private-beta posture.
//!
//! RO:SECURITY — no Tauri command in this module, no WebView DTO parsing, no persistence of DeviceAuthorization, no HTTP, capability issuance, username mutation, wallet, or ledger authority.
//!
//! RO:TEST — `tests/physical_m1_desktop_device_authorization_command_bridge.rs`.

#![forbid(unsafe_code)]

use crablink_native_core::gateway_profile::GatewayEnvironmentProfile;
use ron_proto::DeviceAuthorizationV1;
use svc_passport::native::{NativePlatformSealer, NativeVaultStore};

use crate::{
    passport_device_authorization_command_runtime::{
        authorize_physical_m1_private_beta_root_admin_desktop,
        DesktopDeviceAuthorizationCommandRuntimeError,
    },
    passport_operational_command_runtime::DesktopNativeSecretSurfacePort,
    passport_operational_unlock_runtime::DesktopOperationalVaultSessionStore,
    passport_public_identity_store::DesktopPublicPassportDescriptorStore,
    passport_vault_v2_migration_runtime::{
        read_desktop_native_passport_session_device_public_identity,
        DesktopSessionDevicePublicIdentityError,
    },
};

/// Physical M1 native-state command bridge marker.
pub const PHYSICAL_M1_DEVICE_AUTHORIZATION_COMMAND_BRIDGE_LABEL: &str =
    "PHYSICAL_M1_DEVICE_AUTHORIZATION_COMMAND_BRIDGE_V1";

/// Fail-closed bridge failure safe enough to project into a redacted command state.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[non_exhaustive]
pub enum DesktopDeviceAuthorizationCommandBridgeError {
    /// Durable public Passport descriptor could not be read or validated.
    PublicDescriptorLoadFailed,

    /// No durable public Passport descriptor exists.
    PublicDescriptorMissing,

    /// Device identity cannot be read because the operational session is locked.
    OperationalUnlockRequired,

    /// Stored V2 device public identity could not be authenticated or read.
    DeviceIdentityUnavailable,

    /// Root-confirmed signing runtime rejected the operation.
    Authorization(DesktopDeviceAuthorizationCommandRuntimeError),
}

impl DesktopDeviceAuthorizationCommandBridgeError {
    /// Stable, non-secret state suitable for the redacted Tauri DTO.
    #[must_use]
    pub const fn state_label(self) -> &'static str {
        match self {
            Self::PublicDescriptorLoadFailed => "public_identity_unavailable",
            Self::PublicDescriptorMissing => "public_identity_missing",
            Self::OperationalUnlockRequired => "operational_unlock_required",
            Self::DeviceIdentityUnavailable => "device_identity_unavailable",

            Self::Authorization(error) => match error {
                DesktopDeviceAuthorizationCommandRuntimeError::
                    OperationalSessionUnavailable => "unavailable",

                DesktopDeviceAuthorizationCommandRuntimeError::
                    OperationalUnlockRequired => "operational_unlock_required",

                DesktopDeviceAuthorizationCommandRuntimeError::
                    RuntimeContextRejected => "runtime_context_rejected",

                DesktopDeviceAuthorizationCommandRuntimeError::VaultLoadFailed
                | DesktopDeviceAuthorizationCommandRuntimeError::NoStoredVault
                | DesktopDeviceAuthorizationCommandRuntimeError::VaultDecodeFailed => {
                    "passport_unavailable"
                }

                DesktopDeviceAuthorizationCommandRuntimeError::
                    RootConfirmationRejected
                | DesktopDeviceAuthorizationCommandRuntimeError::RootPinRejected => {
                    "confirmation_rejected"
                }

                DesktopDeviceAuthorizationCommandRuntimeError::
                    RootConfirmationCancelled => "cancelled",

                DesktopDeviceAuthorizationCommandRuntimeError::
                    NativeSecretSurfaceUnavailable => "native_secret_surface_unavailable",

                DesktopDeviceAuthorizationCommandRuntimeError::
                    RecoveryFactorUnsealFailed
                | DesktopDeviceAuthorizationCommandRuntimeError::
                    RootPinVerificationFailed
                | DesktopDeviceAuthorizationCommandRuntimeError::RecoverySigningFailed => {
                    "authorization_failed"
                }

                DesktopDeviceAuthorizationCommandRuntimeError::
                    TrustedVerificationContextInvalid
                | DesktopDeviceAuthorizationCommandRuntimeError::
                    StrictVerificationFailed => "verification_failed",
            },
        }
    }

    /// Whether the dedicated native root-confirmation surface was reached.
    #[must_use]
    pub const fn native_secure_input_requested(self) -> bool {
        match self {
            Self::PublicDescriptorLoadFailed
            | Self::PublicDescriptorMissing
            | Self::OperationalUnlockRequired
            | Self::DeviceIdentityUnavailable => false,

            Self::Authorization(error) => matches!(
                error,
                DesktopDeviceAuthorizationCommandRuntimeError::
                    RootConfirmationRejected
                    | DesktopDeviceAuthorizationCommandRuntimeError::
                        RootConfirmationCancelled
                    | DesktopDeviceAuthorizationCommandRuntimeError::
                        NativeSecretSurfaceUnavailable
                    | DesktopDeviceAuthorizationCommandRuntimeError::
                        RecoveryFactorUnsealFailed
                    | DesktopDeviceAuthorizationCommandRuntimeError::
                        RootPinRejected
                    | DesktopDeviceAuthorizationCommandRuntimeError::
                        RootPinVerificationFailed
                    | DesktopDeviceAuthorizationCommandRuntimeError::
                        RecoverySigningFailed
                    | DesktopDeviceAuthorizationCommandRuntimeError::
                        TrustedVerificationContextInvalid
                    | DesktopDeviceAuthorizationCommandRuntimeError::
                        StrictVerificationFailed
            ),
        }
    }
}

/// Load all authority-bearing public identity from native state and perform
/// one fresh Physical M1 private-beta DeviceAuthorization ceremony.
///
/// The caller supplies no Passport ID, device ID, public key, class, scopes,
/// network/environment, root epoch, nonce, timestamp, expiry, or PIN.
///
/// # Errors
///
/// Fails closed when the durable public descriptor is missing/corrupt, the
/// authenticated V2 device identity cannot be read, or the root-confirmed
/// signing runtime rejects the ceremony.
pub fn authorize_physical_m1_device_from_native_state<S, V, P>(
    public_store: &DesktopPublicPassportDescriptorStore,
    vault_store: &V,
    sealer: &S,
    session_store: &DesktopOperationalVaultSessionStore,
    secret_surface: &P,
) -> Result<DeviceAuthorizationV1, DesktopDeviceAuthorizationCommandBridgeError>
where
    S: NativePlatformSealer + ?Sized,
    V: NativeVaultStore + ?Sized,
    P: DesktopNativeSecretSurfacePort + ?Sized,
{
    let root = public_store
        .load()
        .map_err(|_| DesktopDeviceAuthorizationCommandBridgeError::PublicDescriptorLoadFailed)?
        .ok_or(DesktopDeviceAuthorizationCommandBridgeError::PublicDescriptorMissing)?;

    let device =
        read_desktop_native_passport_session_device_public_identity(vault_store, session_store)
            .map_err(map_device_identity_error)?;

    authorize_physical_m1_private_beta_root_admin_desktop(
        vault_store,
        sealer,
        session_store,
        secret_surface,
        &root,
        &device,
        GatewayEnvironmentProfile::DevelopmentLan,
    )
    .map_err(DesktopDeviceAuthorizationCommandBridgeError::Authorization)
}

const fn map_device_identity_error(
    error: DesktopSessionDevicePublicIdentityError,
) -> DesktopDeviceAuthorizationCommandBridgeError {
    match error {
        DesktopSessionDevicePublicIdentityError::OperationalSessionUnavailable => {
            DesktopDeviceAuthorizationCommandBridgeError::OperationalUnlockRequired
        }

        DesktopSessionDevicePublicIdentityError::VaultLoadFailed
        | DesktopSessionDevicePublicIdentityError::NoStoredVault
        | DesktopSessionDevicePublicIdentityError::VaultDecodeFailed
        | DesktopSessionDevicePublicIdentityError::V2Required
        | DesktopSessionDevicePublicIdentityError::StoredV2AuthenticationFailed => {
            DesktopDeviceAuthorizationCommandBridgeError::DeviceIdentityUnavailable
        }
    }
}
