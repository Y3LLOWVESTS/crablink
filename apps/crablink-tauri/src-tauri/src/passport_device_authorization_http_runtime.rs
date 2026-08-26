//! RO:WHAT — Submits one strictly verified local Physical M1 DeviceAuthorization through the fixed public CrabNode gateway for durable svc-passport registration.
//! RO:WHY — Local root authorization is not network device truth until svc-passport independently verifies and durably registers the authorization.
//! RO:INTERACTS — AppState HTTP/settings, ron-proto DeviceAuthorizationV1, svc-gateway 8090, Omnigate, and the authoritative svc-passport device-authorization route.
//! RO:INVARIANTS — caller supplies only an already native-owned authorization; gateway is exactly loopback 8090; request body is the exact authorization wrapper; response is bounded and strict; no AppState lock crosses an await.
//! RO:METRICS — none; failures project only to stable redacted command states.
//! RO:CONFIG — controlled beta uses http://127.0.0.1:8090, /identity/passport/device/authorize, a 16 KiB response cap, and request timeout bounded to 30 seconds.
//! RO:SECURITY — only the public signed DeviceAuthorization crosses HTTP; PIN, RecoveryRoot, VMK, device secret, capability material, username authority, wallet authority, and ledger authority never enter this runtime.
//! RO:TEST — tests/physical_m1_device_authorization_http_boundary.rs plus physical Windows CN-4 acceptance.

#![forbid(unsafe_code)]

use std::time::Duration;

use ron_proto::DeviceAuthorizationV1;
use serde::{Deserialize, Serialize};

use crate::state::AppState;

pub const PHYSICAL_M1_DEVICE_AUTHORIZATION_HTTP_LABEL: &str =
    "PHYSICAL_M1_NATIVE_DEVICE_AUTHORIZATION_HTTP_V1";

pub const PHYSICAL_M1_DEVICE_AUTHORIZATION_GATEWAY_URL: &str = "http://127.0.0.1:8090";

const DEVICE_AUTHORIZATION_PATH: &str = "/identity/passport/device/authorize";

const DEVICE_AUTHORIZATION_RESULT_SCHEMA: &str =
    "svc-passport.native-device-authorization-result.v1";

const DEVICE_AUTHORIZATION_PROBLEM_SCHEMA: &str =
    "svc-passport.native-device-authorization-problem.v1";

const DEVICE_AUTHORIZATION_MAX_RESPONSE_BODY_BYTES: usize = 16 * 1024;

const DEVICE_AUTHORIZATION_MAX_REQUEST_TIMEOUT_MS: u64 = 30_000;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) struct DesktopDeviceAuthorizationHttpOutcomeV1 {
    pub newly_registered: bool,
    pub durable_generation: u64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[non_exhaustive]
pub(crate) enum DesktopDeviceAuthorizationServerProblemV1 {
    RootNotRegistered,
    AuthorizationRejected,
    AuthorizationConflict,
    ServiceUnavailable,
    TrustedTimeUnavailable,
    InvalidRequest,
    PayloadTooLarge,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[non_exhaustive]
pub(crate) enum DesktopDeviceAuthorizationHttpError {
    GatewaySettingsUnavailable,
    GatewayConfigurationRejected,
    InvalidRequestTimeout,
    RequestFailed,
    ResponseTooLarge,
    ResponseReadFailed,
    ResponseRejected,
    ServerProblem(DesktopDeviceAuthorizationServerProblemV1),
    DecodeFailed,
    ResultRejected,
}

impl DesktopDeviceAuthorizationHttpError {
    #[must_use]
    pub const fn state_label(self) -> &'static str {
        match self {
            Self::GatewaySettingsUnavailable
            | Self::InvalidRequestTimeout
            | Self::RequestFailed
            | Self::ResponseTooLarge
            | Self::ResponseReadFailed
            | Self::ResponseRejected
            | Self::ServerProblem(
                DesktopDeviceAuthorizationServerProblemV1::ServiceUnavailable
                | DesktopDeviceAuthorizationServerProblemV1::TrustedTimeUnavailable,
            ) => "unavailable",

            Self::GatewayConfigurationRejected
            | Self::ServerProblem(
                DesktopDeviceAuthorizationServerProblemV1::RootNotRegistered
                | DesktopDeviceAuthorizationServerProblemV1::AuthorizationRejected
                | DesktopDeviceAuthorizationServerProblemV1::AuthorizationConflict
                | DesktopDeviceAuthorizationServerProblemV1::InvalidRequest
                | DesktopDeviceAuthorizationServerProblemV1::PayloadTooLarge,
            )
            | Self::DecodeFailed
            | Self::ResultRejected => "authorization_failed",
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(deny_unknown_fields)]
struct DeviceAuthorizationRequestV1<'a> {
    authorization: &'a DeviceAuthorizationV1,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct DeviceAuthorizationResultV1 {
    schema: String,
    status: String,
    durable_generation: u64,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct DeviceAuthorizationProblemV1 {
    schema: String,
    code: String,
    message: String,
    retryable: bool,
}

/// Submit an already native-owned DeviceAuthorization through the real
/// CrabNode public ingress.
///
/// The authorization must come from the native persistence runtime. This
/// function does not create, sign, replace, or broaden authorization.
///
/// # Errors
///
/// Fails closed unless the configured gateway is exactly the controlled-beta
/// loopback gateway and svc-passport returns one exact accepted result.
pub(crate) async fn register_physical_m1_device_authorization(
    state: &AppState,
    authorization: &DeviceAuthorizationV1,
) -> Result<DesktopDeviceAuthorizationHttpOutcomeV1, DesktopDeviceAuthorizationHttpError> {
    let (gateway_url, timeout_ms) = {
        let settings = state
            .settings
            .lock()
            .map_err(|_| DesktopDeviceAuthorizationHttpError::GatewaySettingsUnavailable)?;

        (
            settings.gateway_url.trim_end_matches('/').to_owned(),
            settings
                .request_timeout_ms
                .min(DEVICE_AUTHORIZATION_MAX_REQUEST_TIMEOUT_MS),
        )
    };

    if gateway_url != PHYSICAL_M1_DEVICE_AUTHORIZATION_GATEWAY_URL {
        return Err(DesktopDeviceAuthorizationHttpError::GatewayConfigurationRejected);
    }

    if timeout_ms == 0 {
        return Err(DesktopDeviceAuthorizationHttpError::InvalidRequestTimeout);
    }

    let timeout = Duration::from_millis(timeout_ms);
    let client = state.http.clone();

    let request = DeviceAuthorizationRequestV1 { authorization };

    let response = client
        .post(format!("{gateway_url}{DEVICE_AUTHORIZATION_PATH}"))
        .timeout(timeout)
        .json(&request)
        .send()
        .await
        .map_err(|_| DesktopDeviceAuthorizationHttpError::RequestFailed)?;

    let status = response.status();

    let response_bytes = read_bounded_response_body(response).await?;

    if !status.is_success() {
        return Err(classify_rejected_response(&response_bytes));
    }

    let result: DeviceAuthorizationResultV1 = serde_json::from_slice(&response_bytes)
        .map_err(|_| DesktopDeviceAuthorizationHttpError::DecodeFailed)?;

    if result.schema != DEVICE_AUTHORIZATION_RESULT_SCHEMA {
        return Err(DesktopDeviceAuthorizationHttpError::ResultRejected);
    }

    let newly_registered = match result.status.as_str() {
        "registered" => true,
        "already_registered" => false,
        _ => {
            return Err(DesktopDeviceAuthorizationHttpError::ResultRejected);
        }
    };

    Ok(DesktopDeviceAuthorizationHttpOutcomeV1 {
        newly_registered,
        durable_generation: result.durable_generation,
    })
}

async fn read_bounded_response_body(
    mut response: reqwest::Response,
) -> Result<Vec<u8>, DesktopDeviceAuthorizationHttpError> {
    let mut output = Vec::new();

    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|_| DesktopDeviceAuthorizationHttpError::ResponseReadFailed)?
    {
        let next_len = output
            .len()
            .checked_add(chunk.len())
            .ok_or(DesktopDeviceAuthorizationHttpError::ResponseTooLarge)?;

        if next_len > DEVICE_AUTHORIZATION_MAX_RESPONSE_BODY_BYTES {
            return Err(DesktopDeviceAuthorizationHttpError::ResponseTooLarge);
        }

        output.extend_from_slice(&chunk);
    }

    Ok(output)
}

fn classify_rejected_response(response_bytes: &[u8]) -> DesktopDeviceAuthorizationHttpError {
    let Ok(problem) = serde_json::from_slice::<DeviceAuthorizationProblemV1>(response_bytes) else {
        return DesktopDeviceAuthorizationHttpError::ResponseRejected;
    };

    if problem.schema != DEVICE_AUTHORIZATION_PROBLEM_SCHEMA {
        return DesktopDeviceAuthorizationHttpError::ResponseRejected;
    }

    let _safe_response_metadata = (problem.message.as_str(), problem.retryable);

    let problem = match problem.code.as_str() {
        "passport_root_not_registered" => {
            DesktopDeviceAuthorizationServerProblemV1::RootNotRegistered
        }

        "device_authorization_rejected" => {
            DesktopDeviceAuthorizationServerProblemV1::AuthorizationRejected
        }

        "device_authorization_conflict" => {
            DesktopDeviceAuthorizationServerProblemV1::AuthorizationConflict
        }

        "device_authorization_service_unavailable" => {
            DesktopDeviceAuthorizationServerProblemV1::ServiceUnavailable
        }

        "trusted_time_unavailable" => {
            DesktopDeviceAuthorizationServerProblemV1::TrustedTimeUnavailable
        }

        "invalid_request" => DesktopDeviceAuthorizationServerProblemV1::InvalidRequest,

        "payload_too_large" => DesktopDeviceAuthorizationServerProblemV1::PayloadTooLarge,

        _ => {
            return DesktopDeviceAuthorizationHttpError::ResponseRejected;
        }
    };

    DesktopDeviceAuthorizationHttpError::ServerProblem(problem)
}
