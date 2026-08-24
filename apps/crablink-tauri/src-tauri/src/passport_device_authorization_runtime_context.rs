//! RO:WHAT — Builds Physical M1 desktop DeviceAuthorization signing payloads from trusted native runtime facts.
//!
//! RO:WHY — Root authorization must bind an OS-generated nonce, native clock, reviewed private-beta network/environment, and epoch before any root-signing ceremony.
//!
//! RO:INTERACTS — `crablink_native_core::gateway_profile`, the existing desktop OS-CSPRNG adapter, `ron-proto` canonical authorization types, and `svc-passport` trusted payload builder.
//!
//! RO:INVARIANTS — only development-LAN may create the private-beta profile; root epoch is V1 epoch zero; authorization is durable until explicit revocation; class/scopes remain owned downstream by trusted policy.
//!
//! RO:METRICS — none; authorization nonces and timing material are never logged here.
//!
//! RO:CONFIG — Physical M1 private-beta profile uses `rustyonions-devnet` / `private-beta`; release profile remains unsupported until separately reviewed.
//!
//! RO:SECURITY — no WebView inputs, Tauri command, RecoveryRoot access, signing, persistence, HTTP, capability issuance, username mutation, wallet, or ledger authority.
//!
//! RO:TEST — `tests/physical_m1_desktop_device_authorization_runtime_context.rs`.

#![forbid(unsafe_code)]

use std::time::{SystemTime, UNIX_EPOCH};

use crablink_native_core::gateway_profile::GatewayEnvironmentProfile;
use ron_proto::{
    DeviceAuthorizationNonceV1, DeviceAuthorizationSigningPayloadV1, NativePassportContextLabelV1,
};
use svc_passport::native::{
    build_root_admin_desktop_device_authorization_payload_v1,
    NativeDeviceAuthorizationContextError, NativeDeviceKeyRandomSource,
    NativeDevicePublicIdentityV1, NativeRootAdminDesktopAuthorizationContextV1,
    RootPassportDescriptorV1,
};

use crate::passport_device_key_random_runtime::OsDesktopNativeDeviceKeyRandomSource;

/// Physical M1 private-beta authorization-runtime marker.
pub const PHYSICAL_M1_DESKTOP_DEVICE_AUTHORIZATION_RUNTIME_CONTEXT_LABEL: &str =
    "PHYSICAL_M1_DESKTOP_DEVICE_AUTHORIZATION_RUNTIME_CONTEXT_V1";

/// Reviewed private-beta Native Passport network identity for Physical M1.
pub const PHYSICAL_M1_PRIVATE_BETA_NETWORK_ID: &str = "rustyonions-devnet";

/// Reviewed private-beta Native Passport authorization environment.
pub const PHYSICAL_M1_PRIVATE_BETA_AUTHORIZATION_ENVIRONMENT: &str = "private-beta";

/// Private-beta V1 supports only the initial root-key epoch.
pub const PHYSICAL_M1_PRIVATE_BETA_ROOT_KEY_EPOCH: u64 = 0;

/// Root-signed device authorization is durable until explicit revocation.
///
/// Short-lived capability TTL remains a later server-enforced security layer.
pub const PHYSICAL_M1_PRIVATE_BETA_DEVICE_AUTHORIZATION_EXPIRES_AT_MS: Option<u64> = None;

/// Native desktop authorization-runtime failure.
#[derive(Debug, Clone, PartialEq, Eq)]
#[non_exhaustive]
pub enum DesktopDeviceAuthorizationRuntimeContextError {
    /// The current transport profile is not the reviewed private-beta LAN profile.
    UnsupportedGatewayProfile,

    /// OS randomness could not produce the authorization nonce.
    RandomnessUnavailable,

    /// Native wall clock was observed before the Unix epoch.
    ClockBeforeUnixEpoch,

    /// Native millisecond timestamp cannot fit the canonical V1 timestamp.
    ClockOverflow,

    /// Reviewed network/environment constants no longer satisfy protocol syntax.
    InvalidProductProfile,

    /// Trusted `svc-passport` context rejected the assembled runtime facts.
    TrustedContextRejected,

    /// Trusted `svc-passport` payload construction rejected identity or policy state.
    TrustedPayloadRejected,
}

/// Injectable nonce source for focused deterministic runtime tests.
pub trait DesktopDeviceAuthorizationNonceRandomSource {
    /// Fill exactly one canonical 16-byte authorization nonce.
    ///
    /// # Errors
    ///
    /// Returns [`DesktopDeviceAuthorizationRuntimeContextError::RandomnessUnavailable`]
    /// when native randomness is unavailable.
    fn fill_authorization_nonce(
        &self,
        output: &mut [u8; 16],
    ) -> Result<(), DesktopDeviceAuthorizationRuntimeContextError>;
}

impl DesktopDeviceAuthorizationNonceRandomSource for OsDesktopNativeDeviceKeyRandomSource {
    fn fill_authorization_nonce(
        &self,
        output: &mut [u8; 16],
    ) -> Result<(), DesktopDeviceAuthorizationRuntimeContextError> {
        NativeDeviceKeyRandomSource::fill(self, output)
            .map_err(|_| DesktopDeviceAuthorizationRuntimeContextError::RandomnessUnavailable)
    }
}

/// Injectable native millisecond clock.
pub trait DesktopDeviceAuthorizationClock {
    /// Return current Unix time in milliseconds.
    ///
    /// # Errors
    ///
    /// Returns a clock error when native time is before Unix epoch or exceeds
    /// the canonical V1 `u64` millisecond representation.
    fn now_ms(&self) -> Result<u64, DesktopDeviceAuthorizationRuntimeContextError>;
}

/// Production desktop system clock.
#[derive(Debug, Clone, Copy, Default)]
pub struct SystemDesktopDeviceAuthorizationClock;

impl DesktopDeviceAuthorizationClock for SystemDesktopDeviceAuthorizationClock {
    fn now_ms(&self) -> Result<u64, DesktopDeviceAuthorizationRuntimeContextError> {
        let elapsed = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|_| DesktopDeviceAuthorizationRuntimeContextError::ClockBeforeUnixEpoch)?;

        u64::try_from(elapsed.as_millis())
            .map_err(|_| DesktopDeviceAuthorizationRuntimeContextError::ClockOverflow)
    }
}

/// Build the production Physical M1 private-beta RootAdminDesktop signing
/// payload.
///
/// This function creates only unsigned public signing material. It cannot
/// unseal or use the Passport root.
///
/// # Errors
///
/// Returns a fail-closed error if the gateway profile is not the reviewed
/// development-LAN posture, native nonce/time generation fails, product
/// constants become invalid, or trusted `svc-passport` construction rejects
/// the public identity/context.
pub fn build_physical_m1_private_beta_root_admin_desktop_authorization_payload(
    root: &RootPassportDescriptorV1,
    device: &NativeDevicePublicIdentityV1,
    gateway_profile: GatewayEnvironmentProfile,
) -> Result<DeviceAuthorizationSigningPayloadV1, DesktopDeviceAuthorizationRuntimeContextError> {
    build_physical_m1_private_beta_root_admin_desktop_authorization_payload_with_sources(
        root,
        device,
        gateway_profile,
        &OsDesktopNativeDeviceKeyRandomSource,
        &SystemDesktopDeviceAuthorizationClock,
    )
}

/// Injectable implementation used by focused tests and the production wrapper.
///
/// # Errors
///
/// Returns the same fail-closed errors as
/// [`build_physical_m1_private_beta_root_admin_desktop_authorization_payload`].
pub fn build_physical_m1_private_beta_root_admin_desktop_authorization_payload_with_sources<R, C>(
    root: &RootPassportDescriptorV1,
    device: &NativeDevicePublicIdentityV1,
    gateway_profile: GatewayEnvironmentProfile,
    random: &R,
    clock: &C,
) -> Result<DeviceAuthorizationSigningPayloadV1, DesktopDeviceAuthorizationRuntimeContextError>
where
    R: DesktopDeviceAuthorizationNonceRandomSource + ?Sized,
    C: DesktopDeviceAuthorizationClock + ?Sized,
{
    if gateway_profile != GatewayEnvironmentProfile::DevelopmentLan {
        return Err(DesktopDeviceAuthorizationRuntimeContextError::UnsupportedGatewayProfile);
    }

    let network_id = NativePassportContextLabelV1::parse(PHYSICAL_M1_PRIVATE_BETA_NETWORK_ID)
        .map_err(|_| DesktopDeviceAuthorizationRuntimeContextError::InvalidProductProfile)?;

    let environment =
        NativePassportContextLabelV1::parse(PHYSICAL_M1_PRIVATE_BETA_AUTHORIZATION_ENVIRONMENT)
            .map_err(|_| DesktopDeviceAuthorizationRuntimeContextError::InvalidProductProfile)?;

    let mut nonce = [0_u8; 16];
    random.fill_authorization_nonce(&mut nonce)?;

    let issued_at_ms = clock.now_ms()?;

    let context = NativeRootAdminDesktopAuthorizationContextV1::new(
        network_id,
        environment,
        PHYSICAL_M1_PRIVATE_BETA_ROOT_KEY_EPOCH,
        DeviceAuthorizationNonceV1::from_bytes(nonce),
        issued_at_ms,
        PHYSICAL_M1_PRIVATE_BETA_DEVICE_AUTHORIZATION_EXPIRES_AT_MS,
    )
    .map_err(map_trusted_context_error)?;

    build_root_admin_desktop_device_authorization_payload_v1(root, device, context)
        .map_err(|_| DesktopDeviceAuthorizationRuntimeContextError::TrustedPayloadRejected)
}

fn map_trusted_context_error(
    _error: NativeDeviceAuthorizationContextError,
) -> DesktopDeviceAuthorizationRuntimeContextError {
    DesktopDeviceAuthorizationRuntimeContextError::TrustedContextRejected
}
