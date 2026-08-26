//! RO:WHAT — Registers the locally owned Native Passport RecoveryRoot through the fixed CrabNode RegisterRoot challenge/proof flow.
//! RO:WHY — Physical desktop enrollment must make the locally finalized Passport root durable in svc-passport before a root-authorized device can become active network authority.
//! RO:INTERACTS — AppState gateway/settings, public Passport descriptor, operational session, native root-confirmation surface, platform RecoveryRoot compartment, RegisterRoot intent/trust verification, shared bounded cross-host proof-time normalization, ron-auth proof transcript, svc-passport RecoveryRoot signer, and public 8090 RegisterRoot routes.
//! RO:INVARIANTS — operational unlock and immutable public identity precede network I/O; gateway is exactly loopback 8090; the service challenge verifies before RecoveryRoot access; proof time may normalize only inside the reviewed cross-host skew and authenticated challenge window; root PIN and RecoveryRoot are dropped before proof submission; no AppState mutex, VMK, PIN, or RecoveryRoot borrow crosses an await.
//! RO:METRICS — none; failures project only to stable redacted classes.
//! RO:CONFIG — controlled beta uses http://127.0.0.1:8090, identity.read only, root epoch zero, a 16 KiB response cap, the existing request timeout bounded to 30 seconds, and the reviewed 5-second cross-host challenge clock-skew policy.
//! RO:SECURITY — no PIN, RecoveryRoot, VMK, root secret, signature, proof payload, Passport authority object, capability, username authority, wallet authority, or ledger authority is returned to React; no direct 9090/5307 client path exists.
//! RO:TEST — physical_m1_production_register_root_wiring.rs plus later physical Windows RegisterRoot acceptance.

#![forbid(unsafe_code)]

use std::time::{Duration, SystemTime, UNIX_EPOCH};

use ron_auth::native_passport::{
    passport_challenge_v1_transcript_b3_hex, RootRegistrationProofTranscriptV1,
};
use ron_proto::{
    B3DigestHex, Ed25519PublicKeyHex, NativePassportScopeV1, PassportChallengeV1, PassportIdV1,
};
use serde::{Deserialize, Serialize};
use svc_passport::native::{
    decode_native_platform_bound_vault_versioned, derive_native_recovery_public_identity_v1,
    load_native_encrypted_vault, sign_native_recovery_root_registration_proof_v1,
    unseal_native_secret, verify_native_recovery_root_pin, NativeSecureCompartment,
    PHASE8A_PROOF_CHALLENGE_CONTRACT_DOMAIN, PHASE8A_PROOF_CHALLENGE_CONTRACT_VERSION,
    PHASE8B_PROOF_CONTRACT_DOMAIN, PHASE8B_PROOF_CONTRACT_VERSION,
};

use crate::{
    passport_device_session_http_runtime::normalize_device_session_proof_created_at_ms,
    passport_operational_command_runtime::DesktopNativeSecretSurfaceOutcome,
    passport_operational_unlock_runtime::DesktopOperationalVaultSessionState,
    passport_register_root_intent::{
        physical_m1_register_root_operation_hash, PHYSICAL_M1_REGISTER_ROOT_KEY_EPOCH,
    },
    passport_register_root_trust::verify_physical_m1_register_root_challenge,
    state::AppState,
};

pub const PHYSICAL_M1_REGISTER_ROOT_HTTP_LABEL: &str = "PHYSICAL_M1_NATIVE_REGISTER_ROOT_HTTP_V1";

pub const PHYSICAL_M1_REGISTER_ROOT_GATEWAY_URL: &str = "http://127.0.0.1:8090";

const REGISTER_ROOT_CHALLENGE_PATH: &str = "/identity/passport/register/challenge";

const REGISTER_ROOT_PROOF_PATH: &str = "/identity/passport/register/proof";

const REGISTER_ROOT_RESULT_SCHEMA: &str = "svc-passport.native-register-root-proof-result.v1";

const REGISTER_ROOT_MAX_RESPONSE_BODY_BYTES: usize = 16 * 1024;
const REGISTER_ROOT_MAX_REQUEST_TIMEOUT_MS: u64 = 30_000;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DesktopRegisterRootHttpOutcomeV1 {
    pub service_challenge_verified: bool,
    pub root_registered: bool,
    pub newly_registered: bool,
    pub recovery_root_unsealed: bool,
    pub durable_generation: u64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[non_exhaustive]
pub enum DesktopRegisterRootHttpError {
    OperationalUnlockRequired,
    PublicDescriptorLoadFailed,
    PublicDescriptorMissing,
    ProtocolIdentityConversionFailed,
    OperationHashFailed,
    GatewaySettingsUnavailable,
    GatewayConfigurationRejected,
    InvalidRequestTimeout,
    ChallengeRequestFailed,
    ChallengeResponseRejected,
    ChallengeResponseTooLarge,
    ChallengeResponseReadFailed,
    ChallengeDecodeFailed,
    ChallengeClockUnavailable,
    ChallengeTrustRejected,
    RootConfirmationRejected,
    RootConfirmationCancelled,
    NativeSecretSurfaceUnavailable,
    VaultLoadFailed,
    NoStoredVault,
    VaultDecodeFailed,
    RecoveryFactorUnsealFailed,
    RootPinRejected,
    RootIdentityDerivationFailed,
    RootIdentityMismatch,
    ChallengeHashFailed,
    ProofClockUnavailable,
    ProofTimeOutsideChallenge,
    RootSigningFailed,
    ProofRequestFailed,
    ProofResponseRejected,
    ProofResponseTooLarge,
    ProofResponseReadFailed,
    ProofDecodeFailed,
    ProofResultRejected,
}

impl DesktopRegisterRootHttpError {
    #[must_use]
    pub const fn state_label(self) -> &'static str {
        match self {
            Self::OperationalUnlockRequired => "operational_unlock_required",

            Self::RootConfirmationRejected => "confirmation_rejected",

            Self::RootConfirmationCancelled => "cancelled",

            Self::GatewaySettingsUnavailable
            | Self::InvalidRequestTimeout
            | Self::ChallengeRequestFailed
            | Self::ChallengeResponseTooLarge
            | Self::ChallengeResponseReadFailed
            | Self::ChallengeClockUnavailable
            | Self::ProofClockUnavailable
            | Self::ProofRequestFailed
            | Self::ProofResponseTooLarge
            | Self::ProofResponseReadFailed => "root_registration_service_unavailable",

            Self::NativeSecretSurfaceUnavailable
            | Self::PublicDescriptorLoadFailed
            | Self::PublicDescriptorMissing
            | Self::VaultLoadFailed
            | Self::NoStoredVault
            | Self::VaultDecodeFailed
            | Self::RecoveryFactorUnsealFailed => "unavailable",

            Self::ProtocolIdentityConversionFailed
            | Self::OperationHashFailed
            | Self::GatewayConfigurationRejected
            | Self::ChallengeResponseRejected
            | Self::ChallengeDecodeFailed
            | Self::ChallengeTrustRejected
            | Self::RootPinRejected
            | Self::RootIdentityDerivationFailed
            | Self::RootIdentityMismatch
            | Self::ChallengeHashFailed
            | Self::ProofTimeOutsideChallenge
            | Self::RootSigningFailed
            | Self::ProofResponseRejected
            | Self::ProofDecodeFailed
            | Self::ProofResultRejected => "root_registration_rejected",
        }
    }

    #[must_use]
    pub const fn native_secure_input_requested(self) -> bool {
        matches!(
            self,
            Self::RootConfirmationRejected
                | Self::RootConfirmationCancelled
                | Self::NativeSecretSurfaceUnavailable
                | Self::VaultLoadFailed
                | Self::NoStoredVault
                | Self::VaultDecodeFailed
                | Self::RecoveryFactorUnsealFailed
                | Self::RootPinRejected
                | Self::RootIdentityDerivationFailed
                | Self::RootIdentityMismatch
                | Self::ChallengeHashFailed
                | Self::ProofClockUnavailable
                | Self::ProofTimeOutsideChallenge
                | Self::RootSigningFailed
                | Self::ProofRequestFailed
                | Self::ProofResponseRejected
                | Self::ProofResponseTooLarge
                | Self::ProofResponseReadFailed
                | Self::ProofDecodeFailed
                | Self::ProofResultRejected
        )
    }

    #[must_use]
    pub const fn recovery_root_unsealed(self) -> bool {
        matches!(
            self,
            Self::RootPinRejected
                | Self::RootIdentityDerivationFailed
                | Self::RootIdentityMismatch
                | Self::ChallengeHashFailed
                | Self::ProofClockUnavailable
                | Self::ProofTimeOutsideChallenge
                | Self::RootSigningFailed
                | Self::ProofRequestFailed
                | Self::ProofResponseRejected
                | Self::ProofResponseTooLarge
                | Self::ProofResponseReadFailed
                | Self::ProofDecodeFailed
                | Self::ProofResultRejected
        )
    }
}

#[derive(Debug, Serialize)]
#[serde(deny_unknown_fields)]
struct RegisterRootChallengeRequestV1 {
    passport_id: PassportIdV1,
    requested_scopes: Vec<NativePassportScopeV1>,
    operation_body_hash: B3DigestHex,
}

#[derive(Debug, Serialize)]
#[serde(deny_unknown_fields)]
struct RegisterRootProofRequestV1 {
    challenge: PassportChallengeV1,
    root_public_key: Ed25519PublicKeyHex,
    proof_created_at_ms: u64,
    proof_signed_payload_hex: String,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct RegisterRootProofResultV1 {
    schema: String,
    status: String,
    durable_generation: u64,
}

/// Register the already-finalized local Passport root through the real public
/// CrabNode ingress.
///
/// This function accepts no caller-controlled authority. The Passport ID and
/// root public key come from the durable native descriptor; scope, gateway,
/// root epoch, proof context, and signing material are fixed or native-owned.
///
/// # Errors
///
/// Fails closed unless the operational session is unlocked, the local public
/// descriptor is valid, the 8090 service challenge verifies against pinned
/// trust, native root confirmation succeeds, RecoveryRoot identity matches the
/// immutable descriptor, and svc-passport durably accepts the proof.
pub async fn register_physical_m1_root(
    state: &AppState,
) -> Result<DesktopRegisterRootHttpOutcomeV1, DesktopRegisterRootHttpError> {
    let session_state = state
        .passport_operational_session
        .state()
        .map_err(|_| DesktopRegisterRootHttpError::OperationalUnlockRequired)?;

    if session_state != DesktopOperationalVaultSessionState::OperationalUnlocked {
        return Err(DesktopRegisterRootHttpError::OperationalUnlockRequired);
    }

    let descriptor = state
        .passport_public_identity_store
        .load()
        .map_err(|_| DesktopRegisterRootHttpError::PublicDescriptorLoadFailed)?
        .ok_or(DesktopRegisterRootHttpError::PublicDescriptorMissing)?;

    let passport_id = PassportIdV1::parse(descriptor.passport_id.as_str())
        .map_err(|_| DesktopRegisterRootHttpError::ProtocolIdentityConversionFailed)?;

    let proto_root_public_key = Ed25519PublicKeyHex::parse(descriptor.root_public_key.as_str())
        .map_err(|_| DesktopRegisterRootHttpError::ProtocolIdentityConversionFailed)?;

    let requested_scopes = vec![NativePassportScopeV1::parse("identity.read")
        .map_err(|_| DesktopRegisterRootHttpError::ProtocolIdentityConversionFailed)?];

    let operation_body_hash =
        physical_m1_register_root_operation_hash(&passport_id, descriptor.root_public_key.as_str())
            .map_err(|_| DesktopRegisterRootHttpError::OperationHashFailed)?;

    let (gateway_url, timeout_ms) = {
        let settings = state
            .settings
            .lock()
            .map_err(|_| DesktopRegisterRootHttpError::GatewaySettingsUnavailable)?;

        (
            settings.gateway_url.trim_end_matches('/').to_owned(),
            settings
                .request_timeout_ms
                .min(REGISTER_ROOT_MAX_REQUEST_TIMEOUT_MS),
        )
    };

    if gateway_url != PHYSICAL_M1_REGISTER_ROOT_GATEWAY_URL {
        return Err(DesktopRegisterRootHttpError::GatewayConfigurationRejected);
    }

    if timeout_ms == 0 {
        return Err(DesktopRegisterRootHttpError::InvalidRequestTimeout);
    }

    let timeout = Duration::from_millis(timeout_ms);
    let client = state.http.clone();

    let challenge_request = RegisterRootChallengeRequestV1 {
        passport_id: passport_id.clone(),
        requested_scopes: requested_scopes.clone(),
        operation_body_hash: operation_body_hash.clone(),
    };

    let challenge_response = client
        .post(format!("{gateway_url}{REGISTER_ROOT_CHALLENGE_PATH}"))
        .timeout(timeout)
        .json(&challenge_request)
        .send()
        .await
        .map_err(|_| DesktopRegisterRootHttpError::ChallengeRequestFailed)?;

    if !challenge_response.status().is_success() {
        return Err(DesktopRegisterRootHttpError::ChallengeResponseRejected);
    }

    let challenge_bytes = read_bounded_response_body(
        challenge_response,
        DesktopRegisterRootHttpError::ChallengeResponseReadFailed,
        DesktopRegisterRootHttpError::ChallengeResponseTooLarge,
    )
    .await?;

    let challenge: PassportChallengeV1 = serde_json::from_slice(&challenge_bytes)
        .map_err(|_| DesktopRegisterRootHttpError::ChallengeDecodeFailed)?;

    let challenge_verify_now_ms =
        current_unix_time_ms(DesktopRegisterRootHttpError::ChallengeClockUnavailable)?;

    verify_physical_m1_register_root_challenge(
        &challenge,
        &passport_id,
        &requested_scopes,
        &operation_body_hash,
        challenge_verify_now_ms,
    )
    .map_err(|_| DesktopRegisterRootHttpError::ChallengeTrustRejected)?;

    let root_pin = match state
        .passport_secret_surface
        .request_root_confirmation_pin()
    {
        Ok(DesktopNativeSecretSurfaceOutcome::Secret(pin)) => pin,

        Ok(DesktopNativeSecretSurfaceOutcome::Rejected) => {
            return Err(DesktopRegisterRootHttpError::RootConfirmationRejected);
        }

        Ok(DesktopNativeSecretSurfaceOutcome::Cancelled) => {
            return Err(DesktopRegisterRootHttpError::RootConfirmationCancelled);
        }

        Ok(DesktopNativeSecretSurfaceOutcome::Unavailable) | Err(_) => {
            return Err(DesktopRegisterRootHttpError::NativeSecretSurfaceUnavailable);
        }
    };

    let encrypted_vault = load_native_encrypted_vault(&state.passport_vault_store)
        .map_err(|_| DesktopRegisterRootHttpError::VaultLoadFailed)?
        .ok_or(DesktopRegisterRootHttpError::NoStoredVault)?;

    let versioned_vault = decode_native_platform_bound_vault_versioned(&encrypted_vault)
        .map_err(|_| DesktopRegisterRootHttpError::VaultDecodeFailed)?;

    let platform_bound_vault = versioned_vault.base_v1();

    let recovery_factor = unseal_native_secret(
        state.passport_platform_sealer.as_ref(),
        platform_bound_vault.platform_family(),
        NativeSecureCompartment::RecoveryRoot,
        platform_bound_vault.recovery_root_factor(),
    )
    .map_err(|_| DesktopRegisterRootHttpError::RecoveryFactorUnsealFailed)?;

    verify_native_recovery_root_pin(
        platform_bound_vault.wrapped_keys().recovery_root(),
        root_pin.as_slice(),
        &recovery_factor,
    )
    .map_err(|_| DesktopRegisterRootHttpError::RootPinRejected)?;

    drop(root_pin);

    let derived_root = derive_native_recovery_public_identity_v1(&recovery_factor)
        .map_err(|_| DesktopRegisterRootHttpError::RootIdentityDerivationFailed)?;

    if derived_root.passport_id.as_str() != descriptor.passport_id.as_str()
        || derived_root.root_public_key.as_str() != descriptor.root_public_key.as_str()
    {
        return Err(DesktopRegisterRootHttpError::RootIdentityMismatch);
    }

    let challenge_hash_text = passport_challenge_v1_transcript_b3_hex(&challenge.signing_payload())
        .map_err(|_| DesktopRegisterRootHttpError::ChallengeHashFailed)?;

    let challenge_transcript_hash =
        B3DigestHex::parse("challenge_transcript_hash", challenge_hash_text)
            .map_err(|_| DesktopRegisterRootHttpError::ChallengeHashFailed)?;

    let proof_created_at_ms = normalize_device_session_proof_created_at_ms(
        challenge.issued_at_ms,
        challenge.expires_at_ms,
        current_unix_time_ms(DesktopRegisterRootHttpError::ProofClockUnavailable)?,
    )
    .map_err(|_| DesktopRegisterRootHttpError::ProofTimeOutsideChallenge)?;

    let scope_refs = challenge
        .requested_scopes
        .iter()
        .map(NativePassportScopeV1::as_str)
        .collect::<Vec<_>>();

    let transcript = RootRegistrationProofTranscriptV1 {
        challenge_contract_domain: PHASE8A_PROOF_CHALLENGE_CONTRACT_DOMAIN,

        challenge_contract_version: PHASE8A_PROOF_CHALLENGE_CONTRACT_VERSION,

        proof_contract_domain: PHASE8B_PROOF_CONTRACT_DOMAIN,

        proof_contract_version: PHASE8B_PROOF_CONTRACT_VERSION,

        challenge_id: &challenge.challenge_id,

        network_id: challenge.network_id.as_str(),

        environment: challenge.environment.as_str(),

        audience: challenge.audience.as_str(),

        passport_id: challenge
            .passport_id
            .as_ref()
            .ok_or(DesktopRegisterRootHttpError::ChallengeTrustRejected)?,

        root_public_key: &proto_root_public_key,

        root_key_epoch: PHYSICAL_M1_REGISTER_ROOT_KEY_EPOCH,

        device_id: None,

        operation_body_hash: challenge
            .operation_body_hash
            .as_ref()
            .ok_or(DesktopRegisterRootHttpError::ChallengeTrustRejected)?,

        challenge_transcript_hash: &challenge_transcript_hash,

        requested_scopes: &scope_refs,

        challenge_issued_at_ms: challenge.issued_at_ms,

        challenge_expires_at_ms: challenge.expires_at_ms,

        proof_created_at_ms,
    };

    let signed = sign_native_recovery_root_registration_proof_v1(&recovery_factor, &transcript)
        .map_err(|_| DesktopRegisterRootHttpError::RootSigningFailed)?;

    if signed.root_identity.passport_id.as_str() != descriptor.passport_id.as_str()
        || signed.root_identity.root_public_key.as_str() != descriptor.root_public_key.as_str()
    {
        return Err(DesktopRegisterRootHttpError::RootIdentityMismatch);
    }

    let proof_signed_payload_hex = signed.signed_payload_hex.as_str().to_owned();

    drop(signed);
    drop(recovery_factor);

    let proof_request = RegisterRootProofRequestV1 {
        challenge,
        root_public_key: proto_root_public_key,
        proof_created_at_ms,
        proof_signed_payload_hex,
    };

    let proof_response = client
        .post(format!("{gateway_url}{REGISTER_ROOT_PROOF_PATH}"))
        .timeout(timeout)
        .json(&proof_request)
        .send()
        .await
        .map_err(|_| DesktopRegisterRootHttpError::ProofRequestFailed)?;

    if !proof_response.status().is_success() {
        return Err(DesktopRegisterRootHttpError::ProofResponseRejected);
    }

    let proof_bytes = read_bounded_response_body(
        proof_response,
        DesktopRegisterRootHttpError::ProofResponseReadFailed,
        DesktopRegisterRootHttpError::ProofResponseTooLarge,
    )
    .await?;

    let result: RegisterRootProofResultV1 = serde_json::from_slice(&proof_bytes)
        .map_err(|_| DesktopRegisterRootHttpError::ProofDecodeFailed)?;

    if result.schema != REGISTER_ROOT_RESULT_SCHEMA {
        return Err(DesktopRegisterRootHttpError::ProofResultRejected);
    }

    let newly_registered = match result.status.as_str() {
        "registered" => true,
        "already_registered" => false,
        _ => {
            return Err(DesktopRegisterRootHttpError::ProofResultRejected);
        }
    };

    Ok(DesktopRegisterRootHttpOutcomeV1 {
        service_challenge_verified: true,
        root_registered: true,
        newly_registered,
        recovery_root_unsealed: true,
        durable_generation: result.durable_generation,
    })
}

async fn read_bounded_response_body(
    mut response: reqwest::Response,
    read_error: DesktopRegisterRootHttpError,
    size_error: DesktopRegisterRootHttpError,
) -> Result<Vec<u8>, DesktopRegisterRootHttpError> {
    let mut output = Vec::new();

    while let Some(chunk) = response.chunk().await.map_err(|_| read_error)? {
        let next_len = output.len().checked_add(chunk.len()).ok_or(size_error)?;

        if next_len > REGISTER_ROOT_MAX_RESPONSE_BODY_BYTES {
            return Err(size_error);
        }

        output.extend_from_slice(&chunk);
    }

    Ok(output)
}

fn current_unix_time_ms(
    error: DesktopRegisterRootHttpError,
) -> Result<u64, DesktopRegisterRootHttpError> {
    let elapsed = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|_| error)?;

    let millis = u64::try_from(elapsed.as_millis()).map_err(|_| error)?;

    if millis == 0 {
        return Err(error);
    }

    Ok(millis)
}
