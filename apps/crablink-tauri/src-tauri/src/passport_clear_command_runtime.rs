//! RO:WHAT — Removes the desktop Native Passport encrypted vault and drops native-only operational session material.
//! RO:WHY — Phase 15AA adds explicit local Passport clear/reset behavior without exposing secrets or pretending to mutate backend identity, wallet, ledger, capabilities, or usernames.
//! RO:INTERACTS — NativeVaultStore removal contract, DesktopOperationalVaultSessionStore, commands/passport.rs, and passport_status.
//! RO:INVARIANTS — clear locks/drops operational session material before storage removal; removal touches only the encrypted vault store; NotFound maps to NoPassport; failures are redacted.
//! RO:SECURITY — no PIN, VMK, platform factor, recovery-root material, vault bytes, capability material, wallet, or ledger state is returned or created.
//! RO:TEST — tests/phase15aa_desktop_clear_command_bridge.rs.

use svc_passport::native::{
    remove_native_encrypted_vault, NativeVaultRemovalOutcome, NativeVaultStore,
};

use crate::passport_operational_unlock_runtime::DesktopOperationalVaultSessionStore;

pub const NATIVE_PASSPORT_PHASE15AA_LABEL: &str =
    "NATIVE_PASSPORT_PHASE15AA_DESKTOP_CLEAR_COMMAND_BRIDGE";

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
