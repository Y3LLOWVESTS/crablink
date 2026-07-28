//! RO:WHAT — Defines the first fixed desktop recovery-ceremony command contract.
//! RO:WHY — Onboarding Phase 6A needs a real native boundary before recovery-root generation exists.
//! RO:INTERACTS — NativeVaultStore, commands/passport.rs, passportAdapter.js, and RecoveryCeremonyStep.jsx.
//! RO:INVARIANTS — an existing vault is required; current runtime returns unavailable rather than fabricating recovery material or acknowledgement.
//! RO:SECURITY — no recovery material generation, display, export, logging, clipboard, WebView return, root unseal, capability issuance, username mutation, wallet mutation, or ledger mutation.
//! RO:TEST — module tests and src/onboarding/recoveryCeremony.test.mjs.

use svc_passport::native::{load_native_encrypted_vault, NativeVaultStore};

pub const ONBOARDING_PHASE6A_NATIVE_LABEL: &str = "ONBOARDING_PHASE6A_RECOVERY_CEREMONY_CONTRACT";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DesktopRecoveryCeremonyCommandState {
    NoPassport,
    Unavailable,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DesktopRecoveryCeremonyCommandOutcome {
    pub state: DesktopRecoveryCeremonyCommandState,
    pub shown: bool,
    pub acknowledged: bool,
    pub native_secure_surface_requested: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DesktopRecoveryCeremonyCommandPosture {
    pub phase_label: &'static str,
    pub public_command_added: bool,
    pub stored_vault_required: bool,
    pub recovery_generation_added: bool,
    pub native_phrase_surface_added: bool,
    pub acknowledgement_added: bool,
    pub phrase_returned_to_webview: bool,
    pub root_export_added: bool,
    pub fake_success_rejected: bool,
    pub wallet_or_ledger_mutation_added: bool,
}

pub fn desktop_recovery_ceremony_command_posture() -> DesktopRecoveryCeremonyCommandPosture {
    DesktopRecoveryCeremonyCommandPosture {
        phase_label: ONBOARDING_PHASE6A_NATIVE_LABEL,
        public_command_added: true,
        stored_vault_required: true,
        recovery_generation_added: false,
        native_phrase_surface_added: false,
        acknowledgement_added: false,
        phrase_returned_to_webview: false,
        root_export_added: false,
        fake_success_rejected: true,
        wallet_or_ledger_mutation_added: false,
    }
}

pub fn begin_desktop_recovery_ceremony<V>(store: &V) -> DesktopRecoveryCeremonyCommandOutcome
where
    V: NativeVaultStore + ?Sized,
{
    match load_native_encrypted_vault(store) {
        Ok(Some(_encrypted_vault)) => {
            recovery_outcome(DesktopRecoveryCeremonyCommandState::Unavailable)
        }
        Ok(None) => recovery_outcome(DesktopRecoveryCeremonyCommandState::NoPassport),
        Err(_) => recovery_outcome(DesktopRecoveryCeremonyCommandState::Unavailable),
    }
}

fn recovery_outcome(
    state: DesktopRecoveryCeremonyCommandState,
) -> DesktopRecoveryCeremonyCommandOutcome {
    DesktopRecoveryCeremonyCommandOutcome {
        state,
        shown: false,
        acknowledged: false,
        native_secure_surface_requested: false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    use svc_passport::native::{
        NativeEncryptedVaultV1, NativePlatformStorageError, NativeVaultRecoveryOutcome,
        NativeVaultRemovalOutcome,
    };

    struct FixtureVaultStore {
        present: bool,
    }

    impl NativeVaultStore for FixtureVaultStore {
        fn load_encrypted_vault(
            &self,
        ) -> Result<Option<NativeEncryptedVaultV1>, NativePlatformStorageError> {
            if self.present {
                return Ok(Some(
                    NativeEncryptedVaultV1::new(b"phase6a-existing-vault".to_vec())
                        .expect("bounded encrypted vault fixture"),
                ));
            }

            Ok(None)
        }

        fn write_encrypted_vault_atomic(
            &self,
            _vault: &NativeEncryptedVaultV1,
        ) -> Result<(), NativePlatformStorageError> {
            Ok(())
        }

        fn recover_interrupted_write(
            &self,
        ) -> Result<NativeVaultRecoveryOutcome, NativePlatformStorageError> {
            Ok(NativeVaultRecoveryOutcome::NoRecoveryNeeded)
        }

        fn remove_encrypted_vault(
            &self,
        ) -> Result<NativeVaultRemovalOutcome, NativePlatformStorageError> {
            Ok(NativeVaultRemovalOutcome::NotFound)
        }
    }

    #[test]
    fn phase6a_existing_vault_fails_closed_until_real_recovery_runtime_exists() {
        let outcome = begin_desktop_recovery_ceremony(&FixtureVaultStore { present: true });

        assert_eq!(
            outcome.state,
            DesktopRecoveryCeremonyCommandState::Unavailable,
        );

        assert!(!outcome.shown);
        assert!(!outcome.acknowledged);
        assert!(!outcome.native_secure_surface_requested);
    }

    #[test]
    fn phase6a_absent_vault_never_starts_a_ceremony() {
        let outcome = begin_desktop_recovery_ceremony(&FixtureVaultStore { present: false });

        assert_eq!(
            outcome.state,
            DesktopRecoveryCeremonyCommandState::NoPassport,
        );

        assert!(!outcome.shown);
        assert!(!outcome.acknowledged);
    }

    #[test]
    fn phase6a_posture_rejects_fake_recovery_success() {
        let posture = desktop_recovery_ceremony_command_posture();

        assert_eq!(posture.phase_label, ONBOARDING_PHASE6A_NATIVE_LABEL,);

        assert!(posture.public_command_added);
        assert!(posture.stored_vault_required);
        assert!(posture.fake_success_rejected);

        assert!(!posture.recovery_generation_added);

        assert!(!posture.native_phrase_surface_added);

        assert!(!posture.acknowledgement_added);
        assert!(!posture.phrase_returned_to_webview);
        assert!(!posture.root_export_added);

        assert!(!posture.wallet_or_ledger_mutation_added);
    }
}
