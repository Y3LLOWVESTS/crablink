//! RO:WHAT — Implements redacted desktop Native Passport status, lock, and operational-unlock trigger commands.
//! RO:WHY — Phase 15T connects persistent vault truth and native-only session truth without accepting secrets through WebView IPC.
//! RO:INTERACTS — passport_operational_command_runtime, AppState, svc-passport status review contracts, and the Tauri handler registry.
//! RO:INVARIANTS — status exposes NoPassport/Locked/OperationalUnlocked only; unlock has no PIN argument; lock drops only the in-memory operational session; no root unlock or storage mutation.
//! RO:SECURITY — React receives stable redacted labels only; PIN, VMK, platform factor, vault bytes, root material, device material, and raw capabilities never serialize.
//! RO:TEST — unit tests in this module plus tests/phase15t_operational_unlock_command_lock_and_status_bridge.rs.

use crate::{
    passport_clear_command_runtime::{
        DesktopNativePassportClearCommandState, NATIVE_PASSPORT_PHASE15AA_LABEL,
    },
    passport_create_command_runtime::{
        create_desktop_native_passport_from_native_surface_with_pending_factors,
        DesktopNativePassportCreateCommandState, NATIVE_PASSPORT_PHASE15W_LABEL,
    },
    passport_operational_command_runtime::{
        lock_desktop_native_passport_operational,
        unlock_desktop_native_passport_operational_from_native_surface_with_pending_operational,
        DesktopOperationalUnlockCommandState, NATIVE_PASSPORT_PHASE15T_LABEL,
    },
    passport_operational_unlock_runtime::DesktopOperationalVaultSessionState,
    passport_root_confirmation_command_runtime::{
        confirm_desktop_native_passport_root_from_native_surface,
        DesktopRootConfirmationCommandState, NATIVE_PASSPORT_PHASE15Z_LABEL,
    },
    passport_status_runtime::{inspect_stored_passport_status, StoredPassportStatus},
    state::AppState,
};
use tauri::State;

use serde::Serialize;
use svc_passport::native::{
    adapt_native_client_status_to_redacted_command_dto, review_native_client_command_inventory,
    review_native_client_status_command, NativeClientCommandInventoryDraftV1,
    NativeClientRedactedCommandDtoAdapterDraftV1, NativeClientStatusCapabilityState,
    NativeClientStatusCommandDraftV1, NativeClientStatusLockState,
    PHASE15A_CLIENT_STATUS_COMMAND_DOMAIN, PHASE15A_CLIENT_STATUS_COMMAND_VERSION,
    PHASE15A_PASSPORT_STATUS_COMMAND, PHASE15B_CLIENT_COMMAND_DENYLIST,
    PHASE15B_CLIENT_COMMAND_INVENTORY, PHASE15B_CLIENT_COMMAND_INVENTORY_DOMAIN,
    PHASE15B_CLIENT_COMMAND_INVENTORY_VERSION, PHASE15B_EXPECTED_COMMAND_COUNT,
    PHASE15B_EXPECTED_FORBIDDEN_COMMAND_COUNT, PHASE15C_REDACTED_COMMAND_DTO_ADAPTER_DOMAIN,
    PHASE15C_REDACTED_COMMAND_DTO_ADAPTER_VERSION, PHASE15C_REDACTED_DTO_TARGET,
};

pub const PASSPORT_STATUS_DTO_SCHEMA_V1: &str = "crablink.native-passport.status.v1";
pub const PASSPORT_STATUS_PROBLEM_SCHEMA_V1: &str = "crablink.native-passport.status-problem.v1";
pub const PASSPORT_LOCK_DTO_SCHEMA_V1: &str = "crablink.native-passport.lock.v1";
pub const PASSPORT_UNLOCK_OPERATIONAL_DTO_SCHEMA_V1: &str =
    "crablink.native-passport.unlock-operational.v1";

pub const PASSPORT_LOCK_COMMAND: &str = "passport_lock";
pub const PASSPORT_UNLOCK_OPERATIONAL_COMMAND: &str = "passport_unlock_operational";
pub const PASSPORT_CREATE_DTO_SCHEMA_V1: &str = "crablink.native-passport.create.v1";
pub const PASSPORT_CREATE_COMMAND: &str = "passport_create";
pub const PASSPORT_CLEAR_DTO_SCHEMA_V1: &str = "crablink.native-passport.clear.v1";
pub const PASSPORT_CLEAR_COMMAND: &str = "passport_clear";
pub const PASSPORT_ROOT_CONFIRMATION_DTO_SCHEMA_V1: &str =
    "crablink.native-passport.root-confirmation.v1";
pub const PASSPORT_UNLOCK_ROOT_COMMAND: &str = "passport_unlock_root";
pub const PASSPORT_RECOVERY_CEREMONY_DTO_SCHEMA_V1: &str =
    "crablink.native-passport.recovery-ceremony.v1";
pub const PASSPORT_RECOVERY_CEREMONY_COMMAND: &str = "passport_recovery_ceremony";

const PASSPORT_STATUS_REQUESTER: &str = "crablink-tauri:passport-status";
const PASSPORT_STATUS_SURFACE: &str = "crablink-desktop";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct PassportStatusFacts {
    lock_state: NativeClientStatusLockState,
    capability_state: NativeClientStatusCapabilityState,
    has_passport_identifier: bool,
    has_device_identifier: bool,
    has_confirmed_username: bool,
    native_runtime_ready: bool,
}

impl PassportStatusFacts {
    fn no_passport() -> Self {
        Self {
            lock_state: NativeClientStatusLockState::NoPassport,
            capability_state: NativeClientStatusCapabilityState::Absent,
            has_passport_identifier: false,
            has_device_identifier: false,
            has_confirmed_username: false,
            native_runtime_ready: false,
        }
    }

    fn stored_locked() -> Self {
        Self {
            lock_state: NativeClientStatusLockState::Locked,
            capability_state: NativeClientStatusCapabilityState::Absent,
            has_passport_identifier: false,
            has_device_identifier: false,
            has_confirmed_username: false,
            native_runtime_ready: false,
        }
    }

    fn operational_unlocked() -> Self {
        Self {
            lock_state: NativeClientStatusLockState::OperationalUnlocked,
            capability_state: NativeClientStatusCapabilityState::Absent,
            has_passport_identifier: false,
            has_device_identifier: false,
            has_confirmed_username: false,
            native_runtime_ready: true,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PassportStatusDtoV1 {
    pub schema: &'static str,
    pub command_name: &'static str,
    pub source_phase_label: &'static str,
    pub state: &'static str,
    pub capability_state: &'static str,
    pub passport_identifier: &'static str,
    pub device_identifier: &'static str,
    pub username_handle: &'static str,
    pub capability_material: &'static str,
    pub redacted: bool,
    pub native_runtime_ready: bool,
    pub development_identity_compatibility_only: bool,
    pub read_only: bool,
    pub unlock_performed: bool,
    pub platform_sealer_accessed: bool,
    pub runtime_io_performed: bool,
    pub storage_mutated: bool,
    pub wallet_or_ledger_mutated: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PassportStatusProblemV1 {
    pub schema: &'static str,
    pub code: &'static str,
    pub message: &'static str,
    pub retryable: bool,
    pub redacted: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PassportOperationalCommandDtoV1 {
    pub schema: &'static str,
    pub command_name: &'static str,
    pub source_phase_label: &'static str,
    pub state: &'static str,
    pub redacted: bool,
    pub native_secure_input_requested: bool,
    pub pin_received_from_webview: bool,
    pub secret_material_returned: bool,
    pub session_changed: bool,
    pub encrypted_vault_mutated: bool,
    pub platform_material_mutated: bool,
    pub recovery_root_unsealed: bool,
    pub wallet_or_ledger_mutated: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PassportRecoveryCeremonyDtoV1 {
    pub schema: &'static str,
    pub command_name: &'static str,
    pub source_phase_label: &'static str,
    pub state: &'static str,
    pub shown: bool,
    pub acknowledged: bool,
    pub redacted: bool,
    pub recovery_fingerprint: &'static str,
    pub native_secure_surface_requested: bool,
    pub words_returned_to_webview: bool,
    pub secret_material_returned: bool,
    pub recovery_root_exported: bool,
    pub wallet_or_ledger_mutated: bool,
}

fn unavailable_problem() -> PassportStatusProblemV1 {
    PassportStatusProblemV1 {
        schema: PASSPORT_STATUS_PROBLEM_SCHEMA_V1,
        code: "passport_status_unavailable",
        message: "Native Passport status could not be reviewed.",
        retryable: false,
        redacted: true,
    }
}

fn lock_state_label(state: NativeClientStatusLockState) -> &'static str {
    match state {
        NativeClientStatusLockState::NoPassport => "no_passport",
        NativeClientStatusLockState::Locked => "locked",
        NativeClientStatusLockState::OperationalUnlocked => "operational_unlocked",
        NativeClientStatusLockState::RootUnlocked => "root_unlocked",
    }
}

fn capability_state_label(state: NativeClientStatusCapabilityState) -> &'static str {
    match state {
        NativeClientStatusCapabilityState::Absent => "absent",
        NativeClientStatusCapabilityState::PresentRedacted => "present_redacted",
        NativeClientStatusCapabilityState::Expired => "expired",
        NativeClientStatusCapabilityState::Revoked => "revoked",
    }
}

fn build_passport_status(
    facts: PassportStatusFacts,
) -> Result<PassportStatusDtoV1, PassportStatusProblemV1> {
    let status = review_native_client_status_command(NativeClientStatusCommandDraftV1 {
        contract_domain: PHASE15A_CLIENT_STATUS_COMMAND_DOMAIN,
        contract_version: PHASE15A_CLIENT_STATUS_COMMAND_VERSION,
        command_name: PHASE15A_PASSPORT_STATUS_COMMAND,
        requester_label: PASSPORT_STATUS_REQUESTER,
        surface_label: PASSPORT_STATUS_SURFACE,
        native_feature_enabled: true,
        desktop_surface: true,
        redacted_dto_required: true,
        latest_completed_phase_label: NATIVE_PASSPORT_PHASE15T_LABEL,
        lock_state: facts.lock_state,
        capability_state: facts.capability_state,
        has_passport_identifier: facts.has_passport_identifier,
        has_device_identifier: facts.has_device_identifier,
        has_confirmed_username: facts.has_confirmed_username,
        route_acceptance_green: true,
        local_status_inspection_green: true,
        exposes_recovery_words: false,
        exposes_root_signing_material: false,
        exposes_device_signing_material: false,
        exposes_capability_material: false,
        exposes_vault_material: false,
        requests_unlock: false,
        requests_root_confirmation: false,
        requests_platform_sealer_unseal: false,
        requests_runtime_io: false,
        requests_storage_mutation: false,
        requests_wallet_or_ledger_mutation: false,
        requests_arbitrary_scope_issue: false,
        requests_policy_disable: false,
    })
    .map_err(|_| unavailable_problem())?;

    // Phase 15B remains the fixed command policy contract. The live
    // `passport_status` function does not broaden the inventory or authorize
    // any other command.
    let inventory = review_native_client_command_inventory(
        NativeClientCommandInventoryDraftV1 {
            contract_domain: PHASE15B_CLIENT_COMMAND_INVENTORY_DOMAIN,
            contract_version: PHASE15B_CLIENT_COMMAND_INVENTORY_VERSION,
            requester_label: PASSPORT_STATUS_REQUESTER,
            surface_label: PASSPORT_STATUS_SURFACE,
            native_feature_enabled: true,
            desktop_surface: true,
            status_command_contract_green: true,
            command_inventory_count: PHASE15B_EXPECTED_COMMAND_COUNT,
            forbidden_command_count: PHASE15B_EXPECTED_FORBIDDEN_COMMAND_COUNT,
            expected_inventory_included: true,
            forbidden_inventory_included: true,
            redacted_react_dtos_required: true,
            secrets_to_react_allowed: false,
            live_tauri_wiring_requested: false,
            lifecycle_runtime_requested: false,
            unlock_runtime_requested: false,
            proof_capability_username_runtime_requested: false,
            arbitrary_scope_issue_requested: false,
            policy_disable_requested: false,
            platform_sealer_unseal_requested: false,
            runtime_io_requested: false,
            storage_mutation_requested: false,
            wallet_or_ledger_mutation_requested: false,
        },
        PHASE15B_CLIENT_COMMAND_INVENTORY,
        PHASE15B_CLIENT_COMMAND_DENYLIST,
    )
    .map_err(|_| unavailable_problem())?;

    let envelope = adapt_native_client_status_to_redacted_command_dto(
        NativeClientRedactedCommandDtoAdapterDraftV1 {
            contract_domain: PHASE15C_REDACTED_COMMAND_DTO_ADAPTER_DOMAIN,
            contract_version: PHASE15C_REDACTED_COMMAND_DTO_ADAPTER_VERSION,
            requester_label: PASSPORT_STATUS_REQUESTER,
            target_label: PHASE15C_REDACTED_DTO_TARGET,
            command_name: PHASE15A_PASSPORT_STATUS_COMMAND,
            status_decision_reviewed: true,
            inventory_decision_reviewed: true,
            command_allowlisted: true,
            command_forbidden: false,
            redacted_react_dto_required: true,
            exposes_identifier_material: false,
            exposes_secret_material: false,
            exposes_capability_material: false,
            exposes_vault_material: false,
            requests_live_tauri_command: false,
            requests_unlock_runtime: false,
            requests_platform_sealer_unseal: false,
            requests_runtime_io: false,
            requests_storage_mutation: false,
            requests_wallet_or_ledger_mutation: false,
        },
        &status,
        &inventory,
    )
    .map_err(|_| unavailable_problem())?;

    Ok(PassportStatusDtoV1 {
        schema: PASSPORT_STATUS_DTO_SCHEMA_V1,
        command_name: envelope.command_name,
        source_phase_label: NATIVE_PASSPORT_PHASE15T_LABEL,
        state: lock_state_label(envelope.lock_state),
        capability_state: capability_state_label(envelope.capability_state),
        passport_identifier: envelope.redacted_passport_identifier,
        device_identifier: envelope.redacted_device_identifier,
        username_handle: envelope.redacted_username_handle,
        capability_material: envelope.redacted_capability_material,
        redacted: envelope.redacted_react_dto,
        native_runtime_ready: facts.native_runtime_ready,
        development_identity_compatibility_only: true,
        read_only: true,
        unlock_performed: false,
        platform_sealer_accessed: false,
        runtime_io_performed: false,
        storage_mutated: false,
        wallet_or_ledger_mutated: false,
    })
}

/// Return the current redacted Native Passport status.
#[tauri::command]
pub fn passport_status(
    state: State<'_, AppState>,
) -> Result<PassportStatusDtoV1, PassportStatusProblemV1> {
    let stored_status = inspect_stored_passport_status(&state.passport_vault_store)
        .map_err(|_| unavailable_problem())?;

    let facts = match stored_status {
        StoredPassportStatus::NoPassport => PassportStatusFacts::no_passport(),
        StoredPassportStatus::Locked => match state
            .passport_operational_session
            .state()
            .map_err(|_| unavailable_problem())?
        {
            DesktopOperationalVaultSessionState::OperationalUnlocked => {
                PassportStatusFacts::operational_unlocked()
            }
            DesktopOperationalVaultSessionState::Locked
            | DesktopOperationalVaultSessionState::Unlocking => {
                PassportStatusFacts::stored_locked()
            }
        },
    };

    build_passport_status(facts)
}

/// Clear the local desktop Native Passport vault and drop native-only session material.
#[tauri::command]
pub fn passport_clear(
    state: State<'_, AppState>,
) -> Result<PassportOperationalCommandDtoV1, PassportStatusProblemV1> {
    let passport_operational_session = &state.passport_operational_session;

    let outcome =
        crate::passport_clear_command_runtime::
            clear_desktop_native_passport_with_recovery_acknowledgement(
                &state.passport_vault_store,
                passport_operational_session,
                &state
                    .passport_recovery_acknowledgement_store,
            );

    let pending_recovery_session_dropped = state
        .passport_pending_recovery_session
        .clear_pending_recovery_factor()
        .map_err(|_| unavailable_problem())?;

    let pending_operational_session_dropped = state
        .passport_pending_operational_session
        .clear_pending_operational_factor()
        .map_err(|_| unavailable_problem())?;

    let state_label = match outcome.state {
        DesktopNativePassportClearCommandState::Cleared => "cleared",
        DesktopNativePassportClearCommandState::NoPassport => "no_passport",
        DesktopNativePassportClearCommandState::Unavailable => "unavailable",
    };

    Ok(PassportOperationalCommandDtoV1 {
        schema: PASSPORT_CLEAR_DTO_SCHEMA_V1,
        command_name: PASSPORT_CLEAR_COMMAND,
        source_phase_label: NATIVE_PASSPORT_PHASE15AA_LABEL,
        state: state_label,
        redacted: true,
        native_secure_input_requested: false,
        pin_received_from_webview: false,
        secret_material_returned: false,
        session_changed: outcome.session_dropped
            || pending_recovery_session_dropped
            || pending_operational_session_dropped,
        encrypted_vault_mutated: outcome.encrypted_vault_removed,
        platform_material_mutated: false,
        recovery_root_unsealed: false,
        wallet_or_ledger_mutated: false,
    })
}

/// Confirm a root-sensitive desktop Native Passport action through the native owner.
#[tauri::command]
pub fn passport_unlock_root(
    state: State<'_, AppState>,
) -> Result<PassportOperationalCommandDtoV1, PassportStatusProblemV1> {
    let outcome = confirm_desktop_native_passport_root_from_native_surface(
        &state.passport_vault_store,
        &state.passport_operational_session,
        state.passport_secret_surface.as_ref(),
    );

    let state_label = match outcome.state {
        DesktopRootConfirmationCommandState::NoPassport => "no_passport",
        DesktopRootConfirmationCommandState::OperationalUnlockRequired => {
            "operational_unlock_required"
        }
        DesktopRootConfirmationCommandState::ConfirmationRejected => "confirmation_rejected",
        DesktopRootConfirmationCommandState::Cancelled => "cancelled",
        DesktopRootConfirmationCommandState::Unavailable => "unavailable",
    };

    Ok(PassportOperationalCommandDtoV1 {
        schema: PASSPORT_ROOT_CONFIRMATION_DTO_SCHEMA_V1,
        command_name: PASSPORT_UNLOCK_ROOT_COMMAND,
        source_phase_label: NATIVE_PASSPORT_PHASE15Z_LABEL,
        state: state_label,
        redacted: true,
        native_secure_input_requested: outcome.native_secure_input_requested,
        pin_received_from_webview: false,
        secret_material_returned: false,
        session_changed: false,
        encrypted_vault_mutated: false,
        platform_material_mutated: false,
        recovery_root_unsealed: false,
        wallet_or_ledger_mutated: false,
    })
}

/// Begin the native-only Passport recovery ceremony.
///
/// Phase 6A intentionally returns `unavailable` for an existing vault until
/// svc-passport owns real recovery-root generation and the platform shell owns
/// an audited display-and-acknowledgement surface.
#[tauri::command]
pub fn passport_recovery_ceremony(
    state: State<'_, AppState>,
) -> Result<PassportRecoveryCeremonyDtoV1, PassportStatusProblemV1> {
    let runtime =
        crate::passport_recovery_phrase_runtime::
            run_desktop_recovery_ceremony_once_with_pending_recovery(
                &state.passport_vault_store,
                state.passport_platform_sealer
                    .as_ref(),
                state.passport_secret_surface
                    .as_ref(),
                &state
                    .passport_recovery_acknowledgement_store,
                &state
                    .passport_pending_recovery_session,
            );

    let (
        state_label,
        shown,
        acknowledged,
        recovery_fingerprint_present,
        native_secure_surface_requested,
    ) = match runtime {
        Ok(outcome) => {
            let state_label =
                match outcome.state {
                    crate::passport_recovery_phrase_runtime::
                        DesktopRecoveryCeremonyOnceState::
                            NoPassport =>
                    {
                        "no_passport"
                    }
                    crate::passport_recovery_phrase_runtime::
                        DesktopRecoveryCeremonyOnceState::
                            Acknowledged =>
                    {
                        "acknowledged"
                    }
                    crate::passport_recovery_phrase_runtime::
                        DesktopRecoveryCeremonyOnceState::
                            AlreadyAcknowledged =>
                    {
                        "already_acknowledged"
                    }
                    crate::passport_recovery_phrase_runtime::
                        DesktopRecoveryCeremonyOnceState::
                            Cancelled =>
                    {
                        "cancelled"
                    }
                    crate::passport_recovery_phrase_runtime::
                        DesktopRecoveryCeremonyOnceState::
                            Unavailable =>
                    {
                        "unavailable"
                    }
                };

            (
                state_label,
                outcome.shown,
                outcome.acknowledged,
                outcome.recovery_fingerprint_present,
                outcome.native_secure_surface_requested,
            )
        }
        Err(_) => ("unavailable", false, false, false, false),
    };

    Ok(PassportRecoveryCeremonyDtoV1 {
        schema: PASSPORT_RECOVERY_CEREMONY_DTO_SCHEMA_V1,
        command_name: PASSPORT_RECOVERY_CEREMONY_COMMAND,
        source_phase_label:
            crate::passport_recovery_phrase_runtime::ONBOARDING_PHASE6B2B2B2_NATIVE_LABEL,
        state: state_label,
        shown,
        acknowledged,
        redacted: true,
        recovery_fingerprint: if recovery_fingerprint_present {
            "REDACTED"
        } else {
            "ABSENT"
        },
        native_secure_surface_requested,
        words_returned_to_webview: false,
        secret_material_returned: false,
        recovery_root_exported: false,
        wallet_or_ledger_mutated: false,
    })
}

/// Create a locked desktop Native Passport vault through the native secret-surface owner.
#[tauri::command]
pub fn passport_create(
    state: State<'_, AppState>,
) -> Result<PassportOperationalCommandDtoV1, PassportStatusProblemV1> {
    let outcome = create_desktop_native_passport_from_native_surface_with_pending_factors(
        &state.passport_vault_store,
        state.passport_platform_sealer.as_ref(),
        state.passport_secret_surface.as_ref(),
        &state.passport_pending_recovery_session,
        &state.passport_pending_operational_session,
    );

    let state_label = match outcome.state {
        DesktopNativePassportCreateCommandState::CreatedLocked => "created_locked",
        DesktopNativePassportCreateCommandState::AlreadyExists => "already_exists",
        DesktopNativePassportCreateCommandState::CreateRejected => "create_rejected",
        DesktopNativePassportCreateCommandState::Cancelled => "cancelled",
        DesktopNativePassportCreateCommandState::Unavailable => "unavailable",
    };

    Ok(PassportOperationalCommandDtoV1 {
        schema: PASSPORT_CREATE_DTO_SCHEMA_V1,
        command_name: PASSPORT_CREATE_COMMAND,
        source_phase_label: NATIVE_PASSPORT_PHASE15W_LABEL,
        state: state_label,
        redacted: true,
        native_secure_input_requested: outcome.native_secure_input_requested,
        pin_received_from_webview: false,
        secret_material_returned: false,
        session_changed: false,
        encrypted_vault_mutated: matches!(
            outcome.state,
            DesktopNativePassportCreateCommandState::CreatedLocked
        ),
        platform_material_mutated: matches!(
            outcome.state,
            DesktopNativePassportCreateCommandState::CreatedLocked
        ),
        recovery_root_unsealed: false,
        wallet_or_ledger_mutated: false,
    })
}

/// Drop any in-memory operational Native Passport session material.
#[tauri::command]
pub fn passport_lock(
    state: State<'_, AppState>,
) -> Result<PassportOperationalCommandDtoV1, PassportStatusProblemV1> {
    let outcome = lock_desktop_native_passport_operational(&state.passport_operational_session)
        .map_err(|_| unavailable_problem())?;

    Ok(PassportOperationalCommandDtoV1 {
        schema: PASSPORT_LOCK_DTO_SCHEMA_V1,
        command_name: PASSPORT_LOCK_COMMAND,
        source_phase_label: NATIVE_PASSPORT_PHASE15T_LABEL,
        state: if outcome.session_dropped {
            "locked"
        } else {
            "already_locked"
        },
        redacted: true,
        native_secure_input_requested: false,
        pin_received_from_webview: false,
        secret_material_returned: false,
        session_changed: outcome.session_dropped,
        encrypted_vault_mutated: false,
        platform_material_mutated: false,
        recovery_root_unsealed: false,
        wallet_or_ledger_mutated: false,
    })
}

/// Trigger operational unlock through the native secret-surface owner.
///
/// This command intentionally accepts no PIN or secret argument. Production
/// returns `unavailable` until a reviewed platform-native PIN prompt replaces
/// the truthful unavailable adapter owned by AppState.
#[tauri::command]
pub fn passport_unlock_operational(
    state: State<'_, AppState>,
) -> Result<PassportOperationalCommandDtoV1, PassportStatusProblemV1> {
    let outcome =
        unlock_desktop_native_passport_operational_from_native_surface_with_pending_operational(
            &state.passport_vault_store,
            state.passport_platform_sealer.as_ref(),
            &state.passport_operational_session,
            state.passport_secret_surface.as_ref(),
            &state.passport_pending_operational_session,
        );

    let state_label = match outcome.state {
        DesktopOperationalUnlockCommandState::NoPassport => "no_passport",
        DesktopOperationalUnlockCommandState::OperationalUnlocked => "operational_unlocked",
        DesktopOperationalUnlockCommandState::AlreadyUnlocked => "already_unlocked",
        DesktopOperationalUnlockCommandState::UnlockRejected => "unlock_rejected",
        DesktopOperationalUnlockCommandState::Cancelled => "cancelled",
        DesktopOperationalUnlockCommandState::Unavailable => "unavailable",
    };

    Ok(PassportOperationalCommandDtoV1 {
        schema: PASSPORT_UNLOCK_OPERATIONAL_DTO_SCHEMA_V1,
        command_name: PASSPORT_UNLOCK_OPERATIONAL_COMMAND,
        source_phase_label: NATIVE_PASSPORT_PHASE15T_LABEL,
        state: state_label,
        redacted: true,
        native_secure_input_requested: outcome.native_secure_input_requested,
        pin_received_from_webview: false,
        secret_material_returned: false,
        session_changed: matches!(
            outcome.state,
            DesktopOperationalUnlockCommandState::OperationalUnlocked
        ),
        encrypted_vault_mutated: false,
        platform_material_mutated: false,
        recovery_root_unsealed: false,
        wallet_or_ledger_mutated: false,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn facts_for(
        lock_state: NativeClientStatusLockState,
        capability_state: NativeClientStatusCapabilityState,
    ) -> PassportStatusFacts {
        PassportStatusFacts {
            lock_state,
            capability_state,
            has_passport_identifier: lock_state != NativeClientStatusLockState::NoPassport,
            has_device_identifier: lock_state != NativeClientStatusLockState::NoPassport,
            has_confirmed_username: lock_state != NativeClientStatusLockState::NoPassport,
            native_runtime_ready: lock_state != NativeClientStatusLockState::NoPassport,
        }
    }

    #[test]
    fn passport_status_projects_truthful_no_passport_facts() {
        let status = build_passport_status(PassportStatusFacts::no_passport())
            .expect("Phase 15F passport_status command");

        assert_eq!(status.schema, PASSPORT_STATUS_DTO_SCHEMA_V1);
        assert_eq!(status.command_name, PHASE15A_PASSPORT_STATUS_COMMAND);
        assert_eq!(status.source_phase_label, NATIVE_PASSPORT_PHASE15T_LABEL);
        assert_eq!(status.state, "no_passport");
        assert_eq!(status.capability_state, "absent");
        assert_eq!(status.passport_identifier, "ABSENT");
        assert_eq!(status.device_identifier, "ABSENT");
        assert_eq!(status.username_handle, "ABSENT");
        assert_eq!(status.capability_material, "ABSENT");
        assert!(status.redacted);
        assert!(!status.native_runtime_ready);
        assert!(status.development_identity_compatibility_only);
        assert!(status.read_only);
        assert!(!status.unlock_performed);
        assert!(!status.platform_sealer_accessed);
        assert!(!status.runtime_io_performed);
        assert!(!status.storage_mutated);
        assert!(!status.wallet_or_ledger_mutated);
    }

    #[test]
    fn passport_status_projects_all_safe_lock_states() {
        let cases = [
            (
                NativeClientStatusLockState::NoPassport,
                NativeClientStatusCapabilityState::Absent,
                "no_passport",
            ),
            (
                NativeClientStatusLockState::Locked,
                NativeClientStatusCapabilityState::Expired,
                "locked",
            ),
            (
                NativeClientStatusLockState::OperationalUnlocked,
                NativeClientStatusCapabilityState::PresentRedacted,
                "operational_unlocked",
            ),
            (
                NativeClientStatusLockState::RootUnlocked,
                NativeClientStatusCapabilityState::PresentRedacted,
                "root_unlocked",
            ),
        ];

        for (lock_state, capability_state, expected_state) in cases {
            let status = build_passport_status(facts_for(lock_state, capability_state))
                .expect("safe lock-state projection");

            assert_eq!(status.state, expected_state);
            assert!(status.redacted);
            assert!(status.read_only);
            assert!(!status.unlock_performed);
            assert!(!status.platform_sealer_accessed);
            assert!(!status.runtime_io_performed);
            assert!(!status.storage_mutated);
            assert!(!status.wallet_or_ledger_mutated);
        }
    }

    #[test]
    fn passport_status_redacts_all_present_material() {
        let status = build_passport_status(facts_for(
            NativeClientStatusLockState::OperationalUnlocked,
            NativeClientStatusCapabilityState::PresentRedacted,
        ))
        .expect("redacted operational status");

        assert_eq!(status.passport_identifier, "REDACTED");
        assert_eq!(status.device_identifier, "REDACTED");
        assert_eq!(status.username_handle, "REDACTED");
        assert_eq!(status.capability_material, "REDACTED");
    }

    #[test]
    fn passport_status_serializes_only_the_bounded_dto() {
        let status = build_passport_status(facts_for(
            NativeClientStatusLockState::RootUnlocked,
            NativeClientStatusCapabilityState::PresentRedacted,
        ))
        .expect("serializable redacted root status");

        let value = serde_json::to_value(status).expect("status JSON");

        assert_eq!(
            value.get("state").and_then(|value| value.as_str()),
            Some("root_unlocked")
        );
        assert_eq!(
            value
                .get("passportIdentifier")
                .and_then(|value| value.as_str()),
            Some("REDACTED")
        );
        assert_eq!(
            value
                .get("capabilityMaterial")
                .and_then(|value| value.as_str()),
            Some("REDACTED")
        );
        assert_eq!(
            value
                .get("runtimeIoPerformed")
                .and_then(|value| value.as_bool()),
            Some(false)
        );
    }

    #[test]
    fn passport_status_is_registered_once_in_the_tauri_handler() {
        let lib_source = include_str!("../lib.rs");

        for registry_entry in [
            "commands::passport::passport_status,",
            "commands::passport::passport_create,",
            "commands::passport::passport_clear,",
            "commands::passport::passport_lock,",
            "commands::passport::passport_unlock_operational,",
            "commands::passport::passport_unlock_root,",
        ] {
            assert_eq!(
                lib_source.matches(registry_entry).count(),
                1,
                "{registry_entry} must be registered exactly once"
            );
        }

        assert!(lib_source.contains("commands::identity::identity_me_gateway,"));

        for forbidden_command in [
            "passport_get_seed_to_webview",
            "passport_export_private_key",
            "passport_get_device_private_key",
            "passport_get_raw_capability",
            "passport_issue_arbitrary_scope",
            "passport_disable_policy",
        ] {
            assert!(
                !lib_source.contains(forbidden_command),
                "forbidden Passport command must not enter the Tauri registry: {forbidden_command}"
            );
        }
    }

    #[test]
    fn phase15t_operational_status_claims_no_unimplemented_identity_material() {
        let status = build_passport_status(PassportStatusFacts::operational_unlocked())
            .expect("operational runtime status");

        assert_eq!(status.state, "operational_unlocked");
        assert_eq!(status.passport_identifier, "ABSENT");
        assert_eq!(status.device_identifier, "ABSENT");
        assert_eq!(status.username_handle, "ABSENT");
        assert_eq!(status.capability_material, "ABSENT");
        assert!(status.native_runtime_ready);
    }
}

#[cfg(test)]
mod phase15p_tests {
    use super::*;

    #[test]
    fn phase15p_stored_encrypted_vault_projects_locked_redacted_status() {
        let status = build_passport_status(PassportStatusFacts::stored_locked())
            .expect("stored locked status");

        let encoded = serde_json::to_string(&status).expect("status JSON");

        assert!(encoded.contains("\"locked\""));
        assert!(encoded.contains("\"absent\""));

        for forbidden in [
            "phase15p-bounded-encrypted-vault",
            "recovery words",
            "signing material",
            "raw capability",
            "vault material",
        ] {
            assert!(
                !encoded.contains(forbidden),
                "redacted status leaked {forbidden}"
            );
        }
    }
}
