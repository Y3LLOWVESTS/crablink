//! RO:WHAT — Reuses or durably persists the strictly verified Physical M1 desktop DeviceAuthorizationV1.
//!
//! RO:WHY — A root authorization must survive restart without requesting another root signature, while corrupted or conflicting local authority fails closed.
//!
//! RO:INTERACTS — AppState, authenticated V2 device identity, immutable DeviceAuthorization sidecar storage, private-beta runtime constants, and the existing root-confirmed signing bridge.
//!
//! RO:INVARIANTS — an existing record is strictly reverified before reuse; signing happens only when no record exists; persistence happens only after the existing signing bridge succeeds; conflicting/corrupt records never trigger silent replacement.
//!
//! RO:METRICS — none.
//!
//! RO:CONFIG — Physical M1 private-beta network/environment/root epoch are reused from the reviewed desktop authorization runtime context.
//!
//! RO:SECURITY — no PIN, RecoveryRoot, device seed, signature, or full authorization crosses WebView IPC; no server registry, capability, username, wallet, or ledger mutation occurs here.
//!
//! RO:TEST — tests/physical_m1_device_authorization_persistence_lifecycle.rs plus the focused store/signing suites.

use std::time::{SystemTime, UNIX_EPOCH};

use ron_proto::DeviceAuthorizationV1;

use crate::{
    passport_device_authorization_command_bridge::{
        authorize_physical_m1_device_from_native_state,
        DesktopDeviceAuthorizationCommandBridgeError,
    },
    passport_device_authorization_runtime_context::{
        PHYSICAL_M1_PRIVATE_BETA_AUTHORIZATION_ENVIRONMENT, PHYSICAL_M1_PRIVATE_BETA_NETWORK_ID,
        PHYSICAL_M1_PRIVATE_BETA_ROOT_KEY_EPOCH,
    },
    passport_device_authorization_store::{
        DesktopDeviceAuthorizationVerificationContextV1, DeviceAuthorizationPersistOutcome,
    },
    passport_vault_v2_migration_runtime::read_desktop_native_passport_session_device_public_identity,
    state::AppState,
};

pub const PHYSICAL_M1_DEVICE_AUTHORIZATION_PERSISTENCE_RUNTIME_LABEL: &str =
    "PHYSICAL_M1_DEVICE_AUTHORIZATION_PERSISTENCE_RUNTIME_V1";

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DesktopPersistedDeviceAuthorizationOutcome {
    pub authorization: DeviceAuthorizationV1,
    pub native_secure_input_requested: bool,
    pub authorization_persisted: bool,
    pub newly_persisted: bool,
}

#[derive(Debug)]
#[non_exhaustive]
pub enum DesktopPersistedDeviceAuthorizationError {
    PublicDescriptorLoadFailed,
    PublicDescriptorMissing,
    DeviceIdentityUnavailable,
    ClockUnavailable,
    StoredAuthorizationRejected,
    Authorization(DesktopDeviceAuthorizationCommandBridgeError),
    AuthorizationPersistFailed,
}

impl DesktopPersistedDeviceAuthorizationError {
    #[must_use]
    pub fn state_label(&self) -> &'static str {
        match self {
            Self::Authorization(error) => error.state_label(),
            Self::PublicDescriptorLoadFailed
            | Self::PublicDescriptorMissing
            | Self::DeviceIdentityUnavailable
            | Self::ClockUnavailable
            | Self::StoredAuthorizationRejected
            | Self::AuthorizationPersistFailed => "unavailable",
        }
    }

    #[must_use]
    pub fn native_secure_input_requested(&self) -> bool {
        match self {
            Self::Authorization(error) => error.native_secure_input_requested(),
            Self::PublicDescriptorLoadFailed
            | Self::PublicDescriptorMissing
            | Self::DeviceIdentityUnavailable
            | Self::ClockUnavailable
            | Self::StoredAuthorizationRejected
            | Self::AuthorizationPersistFailed => false,
        }
    }
}

pub fn authorize_or_reuse_persisted_physical_m1_device_authorization(
    state: &AppState,
) -> Result<DesktopPersistedDeviceAuthorizationOutcome, DesktopPersistedDeviceAuthorizationError> {
    let public_identity = state
        .passport_public_identity_store
        .load()
        .map_err(|_| DesktopPersistedDeviceAuthorizationError::PublicDescriptorLoadFailed)?
        .ok_or(DesktopPersistedDeviceAuthorizationError::PublicDescriptorMissing)?;

    let device_identity = read_desktop_native_passport_session_device_public_identity(
        &state.passport_vault_store,
        &state.passport_operational_session,
    )
    .map_err(|_| DesktopPersistedDeviceAuthorizationError::DeviceIdentityUnavailable)?;

    let now_ms = current_unix_time_ms()?;

    let stored_verification_context = DesktopDeviceAuthorizationVerificationContextV1 {
        trusted_root: &public_identity,
        expected_device: &device_identity,
        expected_network_id: PHYSICAL_M1_PRIVATE_BETA_NETWORK_ID,
        expected_environment: PHYSICAL_M1_PRIVATE_BETA_AUTHORIZATION_ENVIRONMENT,
        trusted_root_key_epoch: PHYSICAL_M1_PRIVATE_BETA_ROOT_KEY_EPOCH,
        now_ms,
        max_clock_skew_ms: 0,
    };

    let existing = state
        .passport_device_authorization_store
        .load_verified(stored_verification_context)
        .map_err(|_| DesktopPersistedDeviceAuthorizationError::StoredAuthorizationRejected)?;

    if let Some(authorization) = existing {
        return Ok(DesktopPersistedDeviceAuthorizationOutcome {
            authorization,
            native_secure_input_requested: false,
            authorization_persisted: true,
            newly_persisted: false,
        });
    }

    let authorization = authorize_physical_m1_device_from_native_state(
        &state.passport_public_identity_store,
        &state.passport_vault_store,
        state.passport_platform_sealer.as_ref(),
        &state.passport_operational_session,
        state.passport_secret_surface.as_ref(),
    )
    .map_err(DesktopPersistedDeviceAuthorizationError::Authorization)?;

    let persisted_public_identity = state
        .passport_public_identity_store
        .load()
        .map_err(|_| DesktopPersistedDeviceAuthorizationError::PublicDescriptorLoadFailed)?
        .ok_or(DesktopPersistedDeviceAuthorizationError::PublicDescriptorMissing)?;

    let persisted_device_identity = read_desktop_native_passport_session_device_public_identity(
        &state.passport_vault_store,
        &state.passport_operational_session,
    )
    .map_err(|_| DesktopPersistedDeviceAuthorizationError::DeviceIdentityUnavailable)?;

    let persist_now_ms = current_unix_time_ms()?;

    let persistence_verification_context = DesktopDeviceAuthorizationVerificationContextV1 {
        trusted_root: &persisted_public_identity,
        expected_device: &persisted_device_identity,
        expected_network_id: PHYSICAL_M1_PRIVATE_BETA_NETWORK_ID,
        expected_environment: PHYSICAL_M1_PRIVATE_BETA_AUTHORIZATION_ENVIRONMENT,
        trusted_root_key_epoch: PHYSICAL_M1_PRIVATE_BETA_ROOT_KEY_EPOCH,
        now_ms: persist_now_ms,
        max_clock_skew_ms: 0,
    };

    let persist_outcome = state
        .passport_device_authorization_store
        .persist_verified_once(&authorization, persistence_verification_context)
        .map_err(|_| DesktopPersistedDeviceAuthorizationError::AuthorizationPersistFailed)?;

    Ok(DesktopPersistedDeviceAuthorizationOutcome {
        authorization,
        native_secure_input_requested: true,
        authorization_persisted: true,
        newly_persisted: matches!(persist_outcome, DeviceAuthorizationPersistOutcome::Written),
    })
}

fn current_unix_time_ms() -> Result<u64, DesktopPersistedDeviceAuthorizationError> {
    let elapsed = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|_| DesktopPersistedDeviceAuthorizationError::ClockUnavailable)?;

    u64::try_from(elapsed.as_millis())
        .map_err(|_| DesktopPersistedDeviceAuthorizationError::ClockUnavailable)
}
