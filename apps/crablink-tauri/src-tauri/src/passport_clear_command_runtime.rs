//! RO:WHAT — Implements local desktop Native Passport clear/reset, including native sessions, platform material, encrypted vault, recovery acknowledgement, and the restart-safe public identity descriptor.
//! RO:WHY — Phase 15AA owns explicit local custody reset while Physical M1 extends that lifecycle so successful vault removal cannot leave an orphaned public identity descriptor.
//! RO:INTERACTS — NativeVaultStore removal, operational and pending session stores, DesktopPlatformMaterialClearer, DesktopPublicPassportDescriptorStore, recovery acknowledgement storage, commands/passport.rs, and passport_status.
//! RO:INVARIANTS — the descriptor-aware live wrapper clears public identity metadata before destructive custody cleanup; descriptor cleanup failure prevents custody mutation; if a later custody step fails the encrypted vault remains and the same descriptor can be deterministically regenerated; NotFound maps to NoPassport and failures remain redacted.
//! RO:SECURITY — clear accepts no PIN and returns no VMK, platform factor, recovery material, vault bytes, capabilities, username authority, wallet state, or ledger state; descriptor deletion is public-metadata cleanup only.
//! RO:TEST — tests/phase15aa_desktop_clear_command_bridge.rs, tests/onboarding_phase11c2b_fail_closed_clear_ordering.rs, and tests/physical_m1_authenticated_identity_finalization_runtime.rs.

use svc_passport::native::{
    remove_native_encrypted_vault, NativeVaultRemovalOutcome, NativeVaultStore,
};

use crate::{
    passport_operational_unlock_runtime::DesktopOperationalVaultSessionStore,
    passport_pending_operational_runtime::DesktopPendingOperationalSessionStore,
    passport_pending_recovery_runtime::DesktopPendingRecoverySessionStore,
    passport_platform_material_clear_runtime::DesktopPlatformMaterialClearer,
    passport_public_identity_store::DesktopPublicPassportDescriptorStore,
    passport_recovery_acknowledgement_store::DesktopRecoveryAcknowledgementStorePort,
};

pub const NATIVE_PASSPORT_PHASE15AA_LABEL: &str =
    "NATIVE_PASSPORT_PHASE15AA_DESKTOP_CLEAR_COMMAND_BRIDGE";

pub const ONBOARDING_PHASE11C2B_PLATFORM_SECRET_CLEAR_LABEL: &str =
    "ONBOARDING_PHASE11C2B_PLATFORM_SECRET_CLEAR";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DesktopNativePassportClearCommandState {
    Cleared,
    NoPassport,
    Unavailable,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DesktopNativePassportClearCommandOutcome {
    pub state: DesktopNativePassportClearCommandState,
    pub session_dropped: bool,
    pub encrypted_vault_removed: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DesktopNativePassportCompleteClearOutcome {
    pub state: DesktopNativePassportClearCommandState,
    pub operational_session_dropped: bool,
    pub pending_recovery_session_dropped: bool,
    pub pending_operational_session_dropped: bool,
    pub platform_material_clear_completed: bool,
    pub platform_material_mutated: bool,
    pub encrypted_vault_removed: bool,
    pub recovery_acknowledgement_cleared: bool,
}

impl DesktopNativePassportCompleteClearOutcome {
    pub fn session_changed(self) -> bool {
        self.operational_session_dropped
            || self.pending_recovery_session_dropped
            || self.pending_operational_session_dropped
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DesktopNativePassportClearCommandPosture {
    pub phase_label: &'static str,
    pub public_clear_command_added: bool,
    pub operational_session_dropped_first: bool,
    pub encrypted_vault_remove_contract_reused: bool,
    pub not_found_maps_to_no_passport: bool,
    pub status_after_clear_is_no_passport: bool,
    pub native_secure_input_requested: bool,
    pub pin_received_from_webview: bool,
    pub secret_material_returned: bool,
    pub platform_sealer_accessed: bool,
    pub recovery_root_unsealed: bool,
    pub root_vmk_unlocked: bool,
    pub capability_issuance_added: bool,
    pub username_mutation_added: bool,
    pub wallet_or_ledger_mutation_added: bool,
}

pub fn desktop_native_passport_clear_command_posture() -> DesktopNativePassportClearCommandPosture {
    DesktopNativePassportClearCommandPosture {
        phase_label: NATIVE_PASSPORT_PHASE15AA_LABEL,
        public_clear_command_added: true,
        operational_session_dropped_first: true,
        encrypted_vault_remove_contract_reused: true,
        not_found_maps_to_no_passport: true,
        status_after_clear_is_no_passport: true,
        native_secure_input_requested: false,
        pin_received_from_webview: false,
        secret_material_returned: false,
        platform_sealer_accessed: false,
        recovery_root_unsealed: false,
        root_vmk_unlocked: false,
        capability_issuance_added: false,
        username_mutation_added: false,
        wallet_or_ledger_mutation_added: false,
    }
}

pub fn clear_desktop_native_passport<V>(
    store: &V,
    session_store: &DesktopOperationalVaultSessionStore,
) -> DesktopNativePassportClearCommandOutcome
where
    V: NativeVaultStore + ?Sized,
{
    let session_dropped = match session_store.lock() {
        Ok(dropped) => dropped,
        Err(_) => {
            return DesktopNativePassportClearCommandOutcome {
                state: DesktopNativePassportClearCommandState::Unavailable,
                session_dropped: false,
                encrypted_vault_removed: false,
            };
        }
    };

    match remove_native_encrypted_vault(store) {
        Ok(NativeVaultRemovalOutcome::Removed) => DesktopNativePassportClearCommandOutcome {
            state: DesktopNativePassportClearCommandState::Cleared,
            session_dropped,
            encrypted_vault_removed: true,
        },
        Ok(NativeVaultRemovalOutcome::NotFound) => DesktopNativePassportClearCommandOutcome {
            state: DesktopNativePassportClearCommandState::NoPassport,
            session_dropped,
            encrypted_vault_removed: false,
        },
        Err(_) => DesktopNativePassportClearCommandOutcome {
            state: DesktopNativePassportClearCommandState::Unavailable,
            session_dropped,
            encrypted_vault_removed: false,
        },
    }
}

pub fn clear_desktop_native_passport_with_recovery_acknowledgement<V, A>(
    store: &V,
    session_store: &DesktopOperationalVaultSessionStore,
    acknowledgement_store: &A,
) -> DesktopNativePassportClearCommandOutcome
where
    V: NativeVaultStore + ?Sized,
    A: crate::passport_recovery_acknowledgement_store::DesktopRecoveryAcknowledgementStorePort
        + ?Sized,
{
    let outcome = clear_desktop_native_passport(store, session_store);

    if outcome.state == DesktopNativePassportClearCommandState::Unavailable {
        return outcome;
    }

    match acknowledgement_store.clear_recovery_acknowledgement() {
        Ok(_) => outcome,
        Err(_) => DesktopNativePassportClearCommandOutcome {
            state: DesktopNativePassportClearCommandState::Unavailable,
            session_dropped: outcome.session_dropped,
            encrypted_vault_removed: outcome.encrypted_vault_removed,
        },
    }
}

pub fn clear_desktop_native_passport_with_platform_material_and_recovery_acknowledgement<V, A, P>(
    store: &V,
    session_store: &DesktopOperationalVaultSessionStore,
    pending_recovery_store: &DesktopPendingRecoverySessionStore,
    pending_operational_store: &DesktopPendingOperationalSessionStore,
    platform_material_clearer: &P,
    acknowledgement_store: &A,
) -> DesktopNativePassportCompleteClearOutcome
where
    V: NativeVaultStore + ?Sized,
    A: DesktopRecoveryAcknowledgementStorePort + ?Sized,
    P: DesktopPlatformMaterialClearer + ?Sized,
{
    let operational_session_dropped = match session_store.lock() {
        Ok(dropped) => dropped,
        Err(_) => {
            return DesktopNativePassportCompleteClearOutcome {
                state: DesktopNativePassportClearCommandState::Unavailable,
                operational_session_dropped: false,
                pending_recovery_session_dropped: false,
                pending_operational_session_dropped: false,
                platform_material_clear_completed: false,
                platform_material_mutated: false,
                encrypted_vault_removed: false,
                recovery_acknowledgement_cleared: false,
            };
        }
    };

    let pending_recovery_session_dropped =
        match pending_recovery_store.clear_pending_recovery_factor() {
            Ok(dropped) => dropped,
            Err(_) => {
                return DesktopNativePassportCompleteClearOutcome {
                    state: DesktopNativePassportClearCommandState::Unavailable,
                    operational_session_dropped,
                    pending_recovery_session_dropped: false,
                    pending_operational_session_dropped: false,
                    platform_material_clear_completed: false,
                    platform_material_mutated: false,
                    encrypted_vault_removed: false,
                    recovery_acknowledgement_cleared: false,
                };
            }
        };

    let pending_operational_session_dropped =
        match pending_operational_store.clear_pending_operational_factor() {
            Ok(dropped) => dropped,
            Err(_) => {
                return DesktopNativePassportCompleteClearOutcome {
                    state: DesktopNativePassportClearCommandState::Unavailable,
                    operational_session_dropped,
                    pending_recovery_session_dropped,
                    pending_operational_session_dropped: false,
                    platform_material_clear_completed: false,
                    platform_material_mutated: false,
                    encrypted_vault_removed: false,
                    recovery_acknowledgement_cleared: false,
                };
            }
        };

    let platform_review = platform_material_clearer.clear_platform_material();

    let platform_material_mutated = platform_review.any_mutated();

    if !platform_review.is_complete() {
        return DesktopNativePassportCompleteClearOutcome {
            state: DesktopNativePassportClearCommandState::Unavailable,
            operational_session_dropped,
            pending_recovery_session_dropped,
            pending_operational_session_dropped,
            platform_material_clear_completed: false,
            platform_material_mutated,
            encrypted_vault_removed: false,
            recovery_acknowledgement_cleared: false,
        };
    }

    let (cleared_state, encrypted_vault_removed) = match remove_native_encrypted_vault(store) {
        Ok(NativeVaultRemovalOutcome::Removed) => {
            (DesktopNativePassportClearCommandState::Cleared, true)
        }
        Ok(NativeVaultRemovalOutcome::NotFound) => {
            (DesktopNativePassportClearCommandState::NoPassport, false)
        }
        Err(_) => {
            return DesktopNativePassportCompleteClearOutcome {
                state: DesktopNativePassportClearCommandState::Unavailable,
                operational_session_dropped,
                pending_recovery_session_dropped,
                pending_operational_session_dropped,
                platform_material_clear_completed: true,
                platform_material_mutated,
                encrypted_vault_removed: false,
                recovery_acknowledgement_cleared: false,
            };
        }
    };

    let recovery_acknowledgement_cleared =
        match acknowledgement_store.clear_recovery_acknowledgement() {
            Ok(cleared) => cleared,
            Err(_) => {
                return DesktopNativePassportCompleteClearOutcome {
                    state: DesktopNativePassportClearCommandState::Unavailable,
                    operational_session_dropped,
                    pending_recovery_session_dropped,
                    pending_operational_session_dropped,
                    platform_material_clear_completed: true,
                    platform_material_mutated,
                    encrypted_vault_removed,
                    recovery_acknowledgement_cleared: false,
                };
            }
        };

    DesktopNativePassportCompleteClearOutcome {
        state: cleared_state,
        operational_session_dropped,
        pending_recovery_session_dropped,
        pending_operational_session_dropped,
        platform_material_clear_completed: true,
        platform_material_mutated,
        encrypted_vault_removed,
        recovery_acknowledgement_cleared,
    }
}

/// Complete local Passport clear including its durable public descriptor.
///
/// Public metadata is removed before destructive custody cleanup. If public
/// descriptor cleanup fails, platform material and the encrypted vault remain
/// untouched by this wrapper.
pub fn clear_desktop_native_passport_with_public_identity_platform_material_and_recovery_acknowledgement<
    V,
    A,
    P,
>(
    store: &V,
    session_store: &DesktopOperationalVaultSessionStore,
    pending_recovery_store: &DesktopPendingRecoverySessionStore,
    pending_operational_store: &DesktopPendingOperationalSessionStore,
    platform_material_clearer: &P,
    acknowledgement_store: &A,
    public_identity_store: &DesktopPublicPassportDescriptorStore,
) -> DesktopNativePassportCompleteClearOutcome
where
    V: NativeVaultStore + ?Sized,
    A: DesktopRecoveryAcknowledgementStorePort + ?Sized,
    P: DesktopPlatformMaterialClearer + ?Sized,
{
    if public_identity_store.clear().is_err() {
        return DesktopNativePassportCompleteClearOutcome {
            state: DesktopNativePassportClearCommandState::Unavailable,
            operational_session_dropped: false,
            pending_recovery_session_dropped: false,
            pending_operational_session_dropped: false,
            platform_material_clear_completed: false,
            platform_material_mutated: false,
            encrypted_vault_removed: false,
            recovery_acknowledgement_cleared: false,
        };
    }

    clear_desktop_native_passport_with_platform_material_and_recovery_acknowledgement(
        store,
        session_store,
        pending_recovery_store,
        pending_operational_store,
        platform_material_clearer,
        acknowledgement_store,
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn phase15aa_posture_clears_local_vault_without_secret_or_root_surface() {
        let posture = desktop_native_passport_clear_command_posture();

        assert_eq!(posture.phase_label, NATIVE_PASSPORT_PHASE15AA_LABEL);
        assert!(posture.public_clear_command_added);
        assert!(posture.operational_session_dropped_first);
        assert!(posture.encrypted_vault_remove_contract_reused);
        assert!(posture.not_found_maps_to_no_passport);
        assert!(posture.status_after_clear_is_no_passport);
        assert!(!posture.native_secure_input_requested);
        assert!(!posture.pin_received_from_webview);
        assert!(!posture.secret_material_returned);
        assert!(!posture.platform_sealer_accessed);
        assert!(!posture.recovery_root_unsealed);
        assert!(!posture.root_vmk_unlocked);
        assert!(!posture.capability_issuance_added);
        assert!(!posture.username_mutation_added);
        assert!(!posture.wallet_or_ledger_mutation_added);
    }

    struct Phase6B2B2B2EmptyVaultStore;

    impl svc_passport::native::NativeVaultStore for Phase6B2B2B2EmptyVaultStore {
        fn load_encrypted_vault(
            &self,
        ) -> Result<
            Option<svc_passport::native::NativeEncryptedVaultV1>,
            svc_passport::native::NativePlatformStorageError,
        > {
            Ok(None)
        }

        fn write_encrypted_vault_atomic(
            &self,
            _vault: &svc_passport::native::NativeEncryptedVaultV1,
        ) -> Result<(), svc_passport::native::NativePlatformStorageError> {
            Ok(())
        }

        fn recover_interrupted_write(
            &self,
        ) -> Result<
            svc_passport::native::NativeVaultRecoveryOutcome,
            svc_passport::native::NativePlatformStorageError,
        > {
            Ok(svc_passport::native::NativeVaultRecoveryOutcome::NoRecoveryNeeded)
        }

        fn remove_encrypted_vault(
            &self,
        ) -> Result<
            svc_passport::native::NativeVaultRemovalOutcome,
            svc_passport::native::NativePlatformStorageError,
        > {
            Ok(svc_passport::native::NativeVaultRemovalOutcome::NotFound)
        }
    }

    struct Phase6B2B2B2ClearAcknowledgementStore {
        fail: bool,
        clear_calls: std::sync::atomic::AtomicUsize,
    }

    impl Phase6B2B2B2ClearAcknowledgementStore {
        fn available() -> Self {
            Self {
                fail: false,
                clear_calls: std::sync::atomic::AtomicUsize::new(0),
            }
        }

        fn failing() -> Self {
            Self {
                fail: true,
                clear_calls: std::sync::atomic::AtomicUsize::new(0),
            }
        }

        fn clear_calls(&self) -> usize {
            self.clear_calls.load(std::sync::atomic::Ordering::SeqCst)
        }
    }

    impl crate::passport_recovery_acknowledgement_store::DesktopRecoveryAcknowledgementStorePort
        for Phase6B2B2B2ClearAcknowledgementStore
    {
        fn is_recovery_acknowledged(
            &self,
            _expected_fingerprint: &str,
        ) -> Result<
            bool,
            crate::passport_recovery_acknowledgement_store::
                DesktopRecoveryAcknowledgementStoreError,
        >{
            Ok(false)
        }

        fn record_recovery_acknowledgement(
            &self,
            _fingerprint: &str,
        ) -> Result<
            (),
            crate::passport_recovery_acknowledgement_store::
                DesktopRecoveryAcknowledgementStoreError,
        >{
            Ok(())
        }

        fn clear_recovery_acknowledgement(
            &self,
        ) -> Result<
            bool,
            crate::passport_recovery_acknowledgement_store::
                DesktopRecoveryAcknowledgementStoreError,
        >{
            self.clear_calls
                .fetch_add(1, std::sync::atomic::Ordering::SeqCst);

            if self.fail {
                Err(
                    crate::passport_recovery_acknowledgement_store::
                        DesktopRecoveryAcknowledgementStoreError::
                            BackendUnavailable,
                )
            } else {
                Ok(true)
            }
        }
    }

    #[test]
    fn phase6b2b2b2_clear_no_passport_resets_stale_ack_marker() {
        let store = Phase6B2B2B2EmptyVaultStore;

        let session = DesktopOperationalVaultSessionStore::default();

        let acknowledgement_store = Phase6B2B2B2ClearAcknowledgementStore::available();

        let outcome = clear_desktop_native_passport_with_recovery_acknowledgement(
            &store,
            &session,
            &acknowledgement_store,
        );

        assert_eq!(
            outcome.state,
            DesktopNativePassportClearCommandState::NoPassport,
        );

        assert_eq!(acknowledgement_store.clear_calls(), 1,);
    }

    #[test]
    fn phase6b2b2b2_clear_marker_failure_maps_to_unavailable() {
        let store = Phase6B2B2B2EmptyVaultStore;

        let session = DesktopOperationalVaultSessionStore::default();

        let acknowledgement_store = Phase6B2B2B2ClearAcknowledgementStore::failing();

        let outcome = clear_desktop_native_passport_with_recovery_acknowledgement(
            &store,
            &session,
            &acknowledgement_store,
        );

        assert_eq!(
            outcome.state,
            DesktopNativePassportClearCommandState::Unavailable,
        );

        assert_eq!(acknowledgement_store.clear_calls(), 1,);
    }
}
