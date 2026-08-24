//! RO:WHAT — Runs one-time desktop recovery from immediate native memory or a PIN-authenticated stored RecoveryRoot after restart.
//! RO:WHY — Physical M1 must let an existing Passport owner record the real recovery phrase after an interrupted onboarding flow without recreating custody or exposing secrets to React.
//! RO:INTERACTS — svc-passport vault crypto and recovery derivation, NativeVaultStore, NativePlatformSealer, DesktopNativeSecretSurfacePort, pending recovery memory, and durable recovery acknowledgement.
//! RO:INVARIANTS — fresh-create recovery keeps the pending-memory fast path with no platform unseal; restart recovery checks durable acknowledgement first and requires verified root-PIN authority before first phrase display; only RecoveryRoot may be unsealed.
//! RO:SECURITY — PIN and phrase remain native-only; no PIN or phrase crosses WebView; RecoveryRoot is transient, verified root VMK is discarded by svc-passport, and no root export, capability, username, wallet, or ledger authority is added.
//! RO:TEST — focused unit tests below, Phase 11B command-path tests, public command wiring, and recoveryCeremony.test.mjs.

use svc_passport::native::{
    decode_native_platform_bound_vault_versioned, derive_native_recovery_mnemonic_indices,
    load_native_encrypted_vault, unseal_native_secret, with_native_recovery_mnemonic_phrase,
    NativePlatformSealer, NativeSecureCompartment, NativeVaultStore,
};

use crate::passport_operational_command_runtime::{
    DesktopNativeRecoveryPhraseOutcome, DesktopNativeSecretSurfacePort,
};

pub const ONBOARDING_PHASE6B2B2_NATIVE_LABEL: &str =
    "ONBOARDING_PHASE6B2B2_RECOVERY_RUNTIME_WIRING";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DesktopRecoveryPhraseRuntimeState {
    NoPassport,
    Acknowledged,
    Cancelled,
    Unavailable,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DesktopRecoveryPhraseRuntimeOutcome {
    pub state: DesktopRecoveryPhraseRuntimeState,
    pub shown: bool,
    pub acknowledged: bool,
    pub recovery_fingerprint: Option<String>,
    pub native_secure_surface_requested: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DesktopRecoveryPhraseRuntimeError {
    VaultLoadFailed,
    VaultDecodeFailed,
    RecoveryFactorUnsealFailed,
    MnemonicIndexDerivationFailed,
    MnemonicWordMappingFailed,
    NativeSurfaceFailed,
}

pub fn run_desktop_recovery_phrase_runtime<S, V, P>(
    store: &V,
    sealer: &S,
    surface: &P,
) -> Result<DesktopRecoveryPhraseRuntimeOutcome, DesktopRecoveryPhraseRuntimeError>
where
    S: NativePlatformSealer + ?Sized,
    V: NativeVaultStore + ?Sized,
    P: DesktopNativeSecretSurfacePort + ?Sized,
{
    let Some(encrypted_vault) = load_native_encrypted_vault(store)
        .map_err(|_| DesktopRecoveryPhraseRuntimeError::VaultLoadFailed)?
    else {
        return Ok(no_passport_outcome());
    };

    let versioned_vault = decode_native_platform_bound_vault_versioned(&encrypted_vault)
        .map_err(|_| DesktopRecoveryPhraseRuntimeError::VaultDecodeFailed)?;

    let platform_bound_vault = versioned_vault.base_v1();

    let recovery_factor = unseal_native_secret(
        sealer,
        platform_bound_vault.platform_family(),
        NativeSecureCompartment::RecoveryRoot,
        platform_bound_vault.recovery_root_factor(),
    )
    .map_err(|_| DesktopRecoveryPhraseRuntimeError::RecoveryFactorUnsealFailed)?;

    let indices = derive_native_recovery_mnemonic_indices(&recovery_factor)
        .map_err(|_| DesktopRecoveryPhraseRuntimeError::MnemonicIndexDerivationFailed)?;

    let surface_result = with_native_recovery_mnemonic_phrase(&indices, |phrase, fingerprint| {
        surface
            .show_recovery_phrase(phrase, fingerprint)
            .map(|outcome| (outcome, fingerprint.to_owned()))
    })
    .map_err(|_| DesktopRecoveryPhraseRuntimeError::MnemonicWordMappingFailed)?;

    let (surface_outcome, fingerprint) =
        surface_result.map_err(|_| DesktopRecoveryPhraseRuntimeError::NativeSurfaceFailed)?;

    Ok(match surface_outcome {
        DesktopNativeRecoveryPhraseOutcome::Acknowledged => DesktopRecoveryPhraseRuntimeOutcome {
            state: DesktopRecoveryPhraseRuntimeState::Acknowledged,
            shown: true,
            acknowledged: true,
            recovery_fingerprint: Some(fingerprint),
            native_secure_surface_requested: true,
        },
        DesktopNativeRecoveryPhraseOutcome::Cancelled => DesktopRecoveryPhraseRuntimeOutcome {
            state: DesktopRecoveryPhraseRuntimeState::Cancelled,
            shown: true,
            acknowledged: false,
            recovery_fingerprint: None,
            native_secure_surface_requested: true,
        },
        DesktopNativeRecoveryPhraseOutcome::Unavailable => DesktopRecoveryPhraseRuntimeOutcome {
            state: DesktopRecoveryPhraseRuntimeState::Unavailable,
            shown: false,
            acknowledged: false,
            recovery_fingerprint: None,
            native_secure_surface_requested: true,
        },
    })
}

fn no_passport_outcome() -> DesktopRecoveryPhraseRuntimeOutcome {
    DesktopRecoveryPhraseRuntimeOutcome {
        state: DesktopRecoveryPhraseRuntimeState::NoPassport,
        shown: false,
        acknowledged: false,
        recovery_fingerprint: None,
        native_secure_surface_requested: false,
    }
}

pub const ONBOARDING_PHASE6B2B2B2_NATIVE_LABEL: &str =
    "ONBOARDING_PHASE6B2B2B2_RUNTIME_CLEAR_FOUNDATION";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DesktopRecoveryCeremonyOnceState {
    NoPassport,
    Acknowledged,
    AlreadyAcknowledged,
    Rejected,
    Cancelled,
    Unavailable,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DesktopRecoveryCeremonyOnceOutcome {
    pub state: DesktopRecoveryCeremonyOnceState,
    pub shown: bool,
    pub acknowledged: bool,
    pub recovery_fingerprint_present: bool,
    pub native_secure_surface_requested: bool,
    pub acknowledgement_marker_written: bool,
    pub repeat_display_rejected: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DesktopRecoveryCeremonyOnceError {
    VaultLoadFailed,
    VaultDecodeFailed,
    RecoveryFactorUnsealFailed,
    MnemonicIndexDerivationFailed,
    MnemonicWordMappingFailed,
    AcknowledgementReadFailed,
    AcknowledgementWriteFailed,
    PendingRecoverySessionFailed,
    NativeSurfaceFailed,
}

pub fn run_desktop_recovery_ceremony_once<S, V, P, A>(
    store: &V,
    sealer: &S,
    surface: &P,
    acknowledgement_store: &A,
) -> Result<DesktopRecoveryCeremonyOnceOutcome, DesktopRecoveryCeremonyOnceError>
where
    S: svc_passport::native::NativePlatformSealer + ?Sized,
    V: svc_passport::native::NativeVaultStore + ?Sized,
    P: crate::passport_operational_command_runtime::DesktopNativeSecretSurfacePort + ?Sized,
    A: crate::passport_recovery_acknowledgement_store::DesktopRecoveryAcknowledgementStorePort
        + ?Sized,
{
    let Some(encrypted_vault) = svc_passport::native::load_native_encrypted_vault(store)
        .map_err(|_| DesktopRecoveryCeremonyOnceError::VaultLoadFailed)?
    else {
        return Ok(no_passport_ceremony_once_outcome());
    };

    let versioned_vault =
        svc_passport::native::decode_native_platform_bound_vault_versioned(&encrypted_vault)
            .map_err(|_| DesktopRecoveryCeremonyOnceError::VaultDecodeFailed)?;

    let platform_bound_vault = versioned_vault.base_v1();

    let recovery_factor = svc_passport::native::unseal_native_secret(
        sealer,
        platform_bound_vault.platform_family(),
        svc_passport::native::NativeSecureCompartment::RecoveryRoot,
        platform_bound_vault.recovery_root_factor(),
    )
    .map_err(|_| DesktopRecoveryCeremonyOnceError::RecoveryFactorUnsealFailed)?;

    run_desktop_recovery_ceremony_for_factor(&recovery_factor, surface, acknowledgement_store)
}

pub fn run_desktop_recovery_ceremony_once_with_pending_recovery<S, V, P, A>(
    store: &V,
    _sealer: &S,
    surface: &P,
    acknowledgement_store: &A,
    pending_recovery_session:
        &crate::passport_pending_recovery_runtime::
            DesktopPendingRecoverySessionStore,
) -> Result<DesktopRecoveryCeremonyOnceOutcome, DesktopRecoveryCeremonyOnceError>
where
    S: svc_passport::native::NativePlatformSealer + ?Sized,
    V: svc_passport::native::NativeVaultStore + ?Sized,
    P: crate::passport_operational_command_runtime::DesktopNativeSecretSurfacePort + ?Sized,
    A: crate::passport_recovery_acknowledgement_store::DesktopRecoveryAcknowledgementStorePort
        + ?Sized,
{
    let _pending_present_at_start = pending_recovery_session
        .has_pending_recovery_factor()
        .map_err(|_| DesktopRecoveryCeremonyOnceError::PendingRecoverySessionFailed)?;

    let Some(encrypted_vault) = svc_passport::native::load_native_encrypted_vault(store)
        .map_err(|_| DesktopRecoveryCeremonyOnceError::VaultLoadFailed)?
    else {
        pending_recovery_session
            .clear_pending_recovery_factor()
            .map_err(|_| DesktopRecoveryCeremonyOnceError::PendingRecoverySessionFailed)?;

        return Ok(no_passport_ceremony_once_outcome());
    };

    svc_passport::native::decode_native_platform_bound_vault_versioned(&encrypted_vault)
        .map_err(|_| DesktopRecoveryCeremonyOnceError::VaultDecodeFailed)?;

    let pending_factor = pending_recovery_session
        .take_pending_recovery_factor()
        .map_err(|_| DesktopRecoveryCeremonyOnceError::PendingRecoverySessionFailed)?;

    if let Some(recovery_factor) = pending_factor {
        let outcome = run_desktop_recovery_ceremony_for_factor(
            &recovery_factor,
            surface,
            acknowledgement_store,
        );

        match outcome {
            Ok(outcome)
                if matches!(
                    outcome.state,
                    DesktopRecoveryCeremonyOnceState::Acknowledged
                        | DesktopRecoveryCeremonyOnceState::AlreadyAcknowledged
                ) =>
            {
                Ok(outcome)
            }

            Ok(outcome) => {
                pending_recovery_session
                    .restore_recovery_factor(recovery_factor)
                    .map_err(|_| DesktopRecoveryCeremonyOnceError::PendingRecoverySessionFailed)?;

                Ok(outcome)
            }

            Err(error) => {
                pending_recovery_session
                    .restore_recovery_factor(recovery_factor)
                    .map_err(|_| DesktopRecoveryCeremonyOnceError::PendingRecoverySessionFailed)?;

                Err(error)
            }
        }
    } else {
        Ok(DesktopRecoveryCeremonyOnceOutcome {
            state: DesktopRecoveryCeremonyOnceState::Unavailable,
            shown: false,
            acknowledged: false,
            recovery_fingerprint_present: false,
            native_secure_surface_requested: false,
            acknowledgement_marker_written: false,
            repeat_display_rejected: false,
        })
    }
}

pub fn run_desktop_recovery_ceremony_once_with_pending_or_authenticated_stored_recovery<
    S,
    V,
    P,
    A,
>(
    store: &V,
    sealer: &S,
    surface: &P,
    acknowledgement_store: &A,
    pending_recovery_session:
        &crate::passport_pending_recovery_runtime::
            DesktopPendingRecoverySessionStore,
) -> Result<DesktopRecoveryCeremonyOnceOutcome, DesktopRecoveryCeremonyOnceError>
where
    S: svc_passport::native::NativePlatformSealer + ?Sized,
    V: svc_passport::native::NativeVaultStore + ?Sized,
    P: crate::passport_operational_command_runtime::DesktopNativeSecretSurfacePort + ?Sized,
    A: crate::passport_recovery_acknowledgement_store::DesktopRecoveryAcknowledgementStorePort
        + ?Sized,
{
    let pending_present = pending_recovery_session
        .has_pending_recovery_factor()
        .map_err(|_| DesktopRecoveryCeremonyOnceError::PendingRecoverySessionFailed)?;

    if pending_present {
        return run_desktop_recovery_ceremony_once_with_pending_recovery(
            store,
            sealer,
            surface,
            acknowledgement_store,
            pending_recovery_session,
        );
    }

    let Some(encrypted_vault) = svc_passport::native::load_native_encrypted_vault(store)
        .map_err(|_| DesktopRecoveryCeremonyOnceError::VaultLoadFailed)?
    else {
        return Ok(no_passport_ceremony_once_outcome());
    };

    let versioned_vault =
        svc_passport::native::decode_native_platform_bound_vault_versioned(&encrypted_vault)
            .map_err(|_| DesktopRecoveryCeremonyOnceError::VaultDecodeFailed)?;

    let platform_bound_vault = versioned_vault.base_v1();

    let recovery_factor = svc_passport::native::unseal_native_secret(
        sealer,
        platform_bound_vault.platform_family(),
        svc_passport::native::NativeSecureCompartment::RecoveryRoot,
        platform_bound_vault.recovery_root_factor(),
    )
    .map_err(|_| DesktopRecoveryCeremonyOnceError::RecoveryFactorUnsealFailed)?;

    if recovery_acknowledgement_already_present(&recovery_factor, acknowledgement_store)? {
        return Ok(DesktopRecoveryCeremonyOnceOutcome {
            state: DesktopRecoveryCeremonyOnceState::AlreadyAcknowledged,
            shown: false,
            acknowledged: true,
            recovery_fingerprint_present: true,
            native_secure_surface_requested: false,
            acknowledgement_marker_written: false,
            repeat_display_rejected: true,
        });
    }

    let root_pin =
        match surface
            .request_root_confirmation_pin()
        {
            Ok(
                crate::passport_operational_command_runtime::
                    DesktopNativeSecretSurfaceOutcome::
                        Secret(pin),
            ) => pin,

            Ok(
                crate::passport_operational_command_runtime::
                    DesktopNativeSecretSurfaceOutcome::
                        Rejected,
            ) => {
                return Ok(
                    restart_recovery_input_outcome(
                        DesktopRecoveryCeremonyOnceState::
                            Rejected,
                    ),
                );
            }

            Ok(
                crate::passport_operational_command_runtime::
                    DesktopNativeSecretSurfaceOutcome::
                        Cancelled,
            ) => {
                return Ok(
                    restart_recovery_input_outcome(
                        DesktopRecoveryCeremonyOnceState::
                            Cancelled,
                    ),
                );
            }

            Ok(
                crate::passport_operational_command_runtime::
                    DesktopNativeSecretSurfaceOutcome::
                        Unavailable,
            )
            | Err(_) => {
                return Ok(
                    restart_recovery_input_outcome(
                        DesktopRecoveryCeremonyOnceState::
                            Unavailable,
                    ),
                );
            }
        };

    match svc_passport::native::verify_native_recovery_root_pin(
        platform_bound_vault.wrapped_keys().recovery_root(),
        root_pin.as_slice(),
        &recovery_factor,
    ) {
        Ok(()) => {}

        Err(svc_passport::native::NativeVaultCryptoError::AuthenticationFailed)
        | Err(svc_passport::native::NativeVaultCryptoError::InvalidPinLength { .. }) => {
            return Ok(restart_recovery_input_outcome(
                DesktopRecoveryCeremonyOnceState::Rejected,
            ));
        }

        Err(_) => {
            return Ok(restart_recovery_input_outcome(
                DesktopRecoveryCeremonyOnceState::Unavailable,
            ));
        }
    }

    match run_desktop_recovery_ceremony_for_factor(&recovery_factor, surface, acknowledgement_store)
    {
        Ok(outcome) => Ok(outcome),

        Err(_) => Ok(restart_recovery_input_outcome(
            DesktopRecoveryCeremonyOnceState::Unavailable,
        )),
    }
}

fn recovery_acknowledgement_already_present<A>(
    recovery_factor: &svc_passport::native::NativeSecretBytes,
    acknowledgement_store: &A,
) -> Result<bool, DesktopRecoveryCeremonyOnceError>
where
    A: crate::passport_recovery_acknowledgement_store::DesktopRecoveryAcknowledgementStorePort
        + ?Sized,
{
    let indices = svc_passport::native::derive_native_recovery_mnemonic_indices(recovery_factor)
        .map_err(|_| DesktopRecoveryCeremonyOnceError::MnemonicIndexDerivationFailed)?;

    let result = svc_passport::native::with_native_recovery_mnemonic_phrase(
        &indices,
        |_phrase, fingerprint| acknowledgement_store.is_recovery_acknowledged(fingerprint),
    )
    .map_err(|_| DesktopRecoveryCeremonyOnceError::MnemonicWordMappingFailed)?;

    result.map_err(|_| DesktopRecoveryCeremonyOnceError::AcknowledgementReadFailed)
}

fn restart_recovery_input_outcome(
    state: DesktopRecoveryCeremonyOnceState,
) -> DesktopRecoveryCeremonyOnceOutcome {
    DesktopRecoveryCeremonyOnceOutcome {
        state,
        shown: false,
        acknowledged: false,
        recovery_fingerprint_present: false,
        native_secure_surface_requested: true,
        acknowledgement_marker_written: false,
        repeat_display_rejected: false,
    }
}

fn no_passport_ceremony_once_outcome() -> DesktopRecoveryCeremonyOnceOutcome {
    DesktopRecoveryCeremonyOnceOutcome {
        state: DesktopRecoveryCeremonyOnceState::NoPassport,
        shown: false,
        acknowledged: false,
        recovery_fingerprint_present: false,
        native_secure_surface_requested: false,
        acknowledgement_marker_written: false,
        repeat_display_rejected: false,
    }
}

fn run_desktop_recovery_ceremony_for_factor<P, A>(
    recovery_factor: &svc_passport::native::NativeSecretBytes,
    surface: &P,
    acknowledgement_store: &A,
) -> Result<DesktopRecoveryCeremonyOnceOutcome, DesktopRecoveryCeremonyOnceError>
where
    P: crate::passport_operational_command_runtime::DesktopNativeSecretSurfacePort + ?Sized,
    A: crate::passport_recovery_acknowledgement_store::DesktopRecoveryAcknowledgementStorePort
        + ?Sized,
{
    let indices = svc_passport::native::derive_native_recovery_mnemonic_indices(recovery_factor)
        .map_err(|_| DesktopRecoveryCeremonyOnceError::MnemonicIndexDerivationFailed)?;

    svc_passport::native::with_native_recovery_mnemonic_phrase(&indices, |phrase, fingerprint| {
        match acknowledgement_store.is_recovery_acknowledged(fingerprint) {
            Ok(true) => {
                return Ok(DesktopRecoveryCeremonyOnceOutcome {
                    state: DesktopRecoveryCeremonyOnceState::AlreadyAcknowledged,
                    shown: false,
                    acknowledged: true,
                    recovery_fingerprint_present: true,
                    native_secure_surface_requested: false,
                    acknowledgement_marker_written: false,
                    repeat_display_rejected: true,
                });
            }

            Ok(false) => {}

            Err(_) => {
                return Err(DesktopRecoveryCeremonyOnceError::AcknowledgementReadFailed);
            }
        }

        let surface_outcome = surface
            .show_recovery_phrase(phrase, fingerprint)
            .map_err(|_| DesktopRecoveryCeremonyOnceError::NativeSurfaceFailed)?;

        match surface_outcome {
                    crate::passport_operational_command_runtime::
                        DesktopNativeRecoveryPhraseOutcome::
                            Acknowledged =>
                    {
                        acknowledgement_store
                            .record_recovery_acknowledgement(
                                fingerprint,
                            )
                            .map_err(
                                |_| {
                                    DesktopRecoveryCeremonyOnceError::
                                        AcknowledgementWriteFailed
                                },
                            )?;

                        Ok(
                            DesktopRecoveryCeremonyOnceOutcome {
                                state:
                                    DesktopRecoveryCeremonyOnceState::
                                        Acknowledged,
                                shown: true,
                                acknowledged: true,
                                recovery_fingerprint_present:
                                    true,
                                native_secure_surface_requested:
                                    true,
                                acknowledgement_marker_written:
                                    true,
                                repeat_display_rejected:
                                    false,
                            },
                        )
                    }

                    crate::passport_operational_command_runtime::
                        DesktopNativeRecoveryPhraseOutcome::
                            Cancelled =>
                    {
                        Ok(
                            DesktopRecoveryCeremonyOnceOutcome {
                                state:
                                    DesktopRecoveryCeremonyOnceState::
                                        Cancelled,
                                shown: true,
                                acknowledged: false,
                                recovery_fingerprint_present:
                                    false,
                                native_secure_surface_requested:
                                    true,
                                acknowledgement_marker_written:
                                    false,
                                repeat_display_rejected:
                                    false,
                            },
                        )
                    }

                    crate::passport_operational_command_runtime::
                        DesktopNativeRecoveryPhraseOutcome::
                            Unavailable =>
                    {
                        Ok(
                            DesktopRecoveryCeremonyOnceOutcome {
                                state:
                                    DesktopRecoveryCeremonyOnceState::
                                        Unavailable,
                                shown: false,
                                acknowledged: false,
                                recovery_fingerprint_present:
                                    false,
                                native_secure_surface_requested:
                                    true,
                                acknowledgement_marker_written:
                                    false,
                                repeat_display_rejected:
                                    false,
                            },
                        )
                    }
                }
    })
    .map_err(|_| DesktopRecoveryCeremonyOnceError::MnemonicWordMappingFailed)?
}

#[cfg(test)]
mod tests {
    use std::sync::{
        atomic::{AtomicU8, AtomicUsize, Ordering},
        Mutex,
    };

    use super::*;

    use svc_passport::native::{
        NativeEncryptedVaultV1, NativePlatformFamily, NativePlatformStorageError,
        NativePlatformStorageOperation, NativeSealedMaterialV1, NativeSecretBytes,
        NativeVaultRecoveryOutcome, NativeVaultRemovalOutcome,
    };

    use crate::{
        passport_operational_command_runtime::{
            DesktopNativeSecretSurfaceError, DesktopNativeSecretSurfaceOutcome,
        },
        passport_pending_recovery_runtime::DesktopPendingRecoverySessionStore,
        passport_vault_create_runtime::{
            create_desktop_native_passport_vault, create_desktop_native_passport_vault_with_random,
            create_desktop_native_passport_vault_with_random_and_recovery_handoff,
            DesktopNativePassportVaultCreateError, NativeVaultRandomSource,
        },
    };

    const TEST_PIN: &[u8] = b"phase6b2b2-local-pin";

    struct DeterministicRandomSource {
        next: AtomicU8,
    }

    impl DeterministicRandomSource {
        fn new() -> Self {
            Self {
                next: AtomicU8::new(0x11),
            }
        }
    }

    impl NativeVaultRandomSource for DeterministicRandomSource {
        fn fill(&self, output: &mut [u8]) -> Result<(), ()> {
            let seed = self.next.fetch_add(1, Ordering::SeqCst);

            for (index, slot) in output.iter_mut().enumerate() {
                let index = index as u8;

                *slot = seed
                    .wrapping_add(index.wrapping_mul(73))
                    .rotate_left(u32::from(index % 7))
                    ^ 0xa7;
            }

            Ok(())
        }
    }

    #[derive(Default)]
    struct MemoryVaultStore {
        vault: Mutex<Option<NativeEncryptedVaultV1>>,
        load_calls: AtomicUsize,
        write_calls: AtomicUsize,
    }

    impl MemoryVaultStore {
        fn load_calls(&self) -> usize {
            self.load_calls.load(Ordering::SeqCst)
        }

        fn write_calls(&self) -> usize {
            self.write_calls.load(Ordering::SeqCst)
        }
    }

    impl NativeVaultStore for MemoryVaultStore {
        fn load_encrypted_vault(
            &self,
        ) -> Result<Option<NativeEncryptedVaultV1>, NativePlatformStorageError> {
            self.load_calls.fetch_add(1, Ordering::SeqCst);

            Ok(self.vault.lock().expect("memory vault lock").clone())
        }

        fn write_encrypted_vault_atomic(
            &self,
            vault: &NativeEncryptedVaultV1,
        ) -> Result<(), NativePlatformStorageError> {
            self.write_calls.fetch_add(1, Ordering::SeqCst);

            *self.vault.lock().expect("memory vault lock") = Some(vault.clone());

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
            let removed = self
                .vault
                .lock()
                .expect("memory vault lock")
                .take()
                .is_some();

            Ok(if removed {
                NativeVaultRemovalOutcome::Removed
            } else {
                NativeVaultRemovalOutcome::NotFound
            })
        }
    }

    struct MemoryPlatformSealer {
        family: NativePlatformFamily,
        recovery_root: Mutex<Option<Vec<u8>>>,
        operational: Mutex<Option<Vec<u8>>>,
        unsealed_compartments: Mutex<Vec<NativeSecureCompartment>>,
    }

    impl MemoryPlatformSealer {
        fn new(family: NativePlatformFamily) -> Self {
            Self {
                family,
                recovery_root: Mutex::new(None),
                operational: Mutex::new(None),
                unsealed_compartments: Mutex::new(Vec::new()),
            }
        }

        fn slot(&self, compartment: NativeSecureCompartment) -> &Mutex<Option<Vec<u8>>> {
            match compartment {
                NativeSecureCompartment::RecoveryRoot => &self.recovery_root,
                NativeSecureCompartment::DeviceKey => &self.operational,
            }
        }

        fn reference(compartment: NativeSecureCompartment) -> &'static [u8] {
            match compartment {
                NativeSecureCompartment::RecoveryRoot => b"memory://recovery-root",
                NativeSecureCompartment::DeviceKey => b"memory://operational",
            }
        }

        fn unsealed_compartments(&self) -> Vec<NativeSecureCompartment> {
            self.unsealed_compartments
                .lock()
                .expect("unsealed compartment lock")
                .clone()
        }
    }

    impl NativePlatformSealer for MemoryPlatformSealer {
        fn platform_family(&self) -> NativePlatformFamily {
            self.family
        }

        fn seal(
            &self,
            compartment: NativeSecureCompartment,
            secret: &NativeSecretBytes,
        ) -> Result<NativeSealedMaterialV1, NativePlatformStorageError> {
            *self.slot(compartment).lock().map_err(|_| {
                NativePlatformStorageError::BackendFailure {
                    operation: NativePlatformStorageOperation::Seal,
                }
            })? = Some(secret.as_slice().to_vec());

            NativeSealedMaterialV1::new(
                self.family,
                compartment,
                Self::reference(compartment).to_vec(),
            )
        }

        fn unseal(
            &self,
            sealed: &NativeSealedMaterialV1,
        ) -> Result<NativeSecretBytes, NativePlatformStorageError> {
            if sealed.platform_family != self.family {
                return Err(NativePlatformStorageError::PlatformFamilyMismatch {
                    expected: self.family,
                    actual: sealed.platform_family,
                });
            }

            if sealed.as_slice() != Self::reference(sealed.compartment) {
                return Err(NativePlatformStorageError::BackendFailure {
                    operation: NativePlatformStorageOperation::Unseal,
                });
            }

            self.unsealed_compartments
                .lock()
                .map_err(|_| NativePlatformStorageError::BackendFailure {
                    operation: NativePlatformStorageOperation::Unseal,
                })?
                .push(sealed.compartment);

            let secret = self
                .slot(sealed.compartment)
                .lock()
                .map_err(|_| NativePlatformStorageError::BackendFailure {
                    operation: NativePlatformStorageOperation::Unseal,
                })?
                .clone()
                .ok_or(NativePlatformStorageError::BackendFailure {
                    operation: NativePlatformStorageOperation::Unseal,
                })?;

            NativeSecretBytes::new(secret)
        }
    }

    struct FailingUnsealSealer {
        family: NativePlatformFamily,
    }

    impl NativePlatformSealer for FailingUnsealSealer {
        fn platform_family(&self) -> NativePlatformFamily {
            self.family
        }

        fn seal(
            &self,
            _compartment: NativeSecureCompartment,
            _secret: &NativeSecretBytes,
        ) -> Result<NativeSealedMaterialV1, NativePlatformStorageError> {
            Err(NativePlatformStorageError::BackendFailure {
                operation: NativePlatformStorageOperation::Seal,
            })
        }

        fn unseal(
            &self,
            _sealed: &NativeSealedMaterialV1,
        ) -> Result<NativeSecretBytes, NativePlatformStorageError> {
            Err(NativePlatformStorageError::BackendFailure {
                operation: NativePlatformStorageOperation::Unseal,
            })
        }
    }

    struct RecordingRecoverySurface {
        outcome: DesktopNativeRecoveryPhraseOutcome,
        calls: AtomicUsize,
        word_count: Mutex<Option<usize>>,
        fingerprint: Mutex<Option<String>>,
    }

    impl RecordingRecoverySurface {
        fn new(outcome: DesktopNativeRecoveryPhraseOutcome) -> Self {
            Self {
                outcome,
                calls: AtomicUsize::new(0),
                word_count: Mutex::new(None),
                fingerprint: Mutex::new(None),
            }
        }

        fn calls(&self) -> usize {
            self.calls.load(Ordering::SeqCst)
        }

        fn word_count(&self) -> Option<usize> {
            *self.word_count.lock().expect("word-count lock")
        }

        fn fingerprint(&self) -> Option<String> {
            self.fingerprint.lock().expect("fingerprint lock").clone()
        }
    }

    impl DesktopNativeSecretSurfacePort for RecordingRecoverySurface {
        fn request_operational_pin(
            &self,
        ) -> Result<DesktopNativeSecretSurfaceOutcome, DesktopNativeSecretSurfaceError> {
            Ok(DesktopNativeSecretSurfaceOutcome::Unavailable)
        }

        fn show_recovery_phrase(
            &self,
            phrase: &str,
            fingerprint: &str,
        ) -> Result<DesktopNativeRecoveryPhraseOutcome, DesktopNativeSecretSurfaceError> {
            self.calls.fetch_add(1, Ordering::SeqCst);

            *self.word_count.lock().expect("word-count lock") =
                Some(phrase.split_ascii_whitespace().count());

            *self.fingerprint.lock().expect("fingerprint lock") = Some(fingerprint.to_owned());

            Ok(self.outcome)
        }
    }

    struct AuthenticatedStoredRecoverySurface {
        pin: Vec<u8>,
        phrase_outcome: DesktopNativeRecoveryPhraseOutcome,
        pin_calls: AtomicUsize,
        phrase_calls: AtomicUsize,
    }

    impl AuthenticatedStoredRecoverySurface {
        fn new(pin: &[u8], phrase_outcome: DesktopNativeRecoveryPhraseOutcome) -> Self {
            Self {
                pin: pin.to_vec(),
                phrase_outcome,
                pin_calls: AtomicUsize::new(0),
                phrase_calls: AtomicUsize::new(0),
            }
        }

        fn pin_calls(&self) -> usize {
            self.pin_calls.load(Ordering::SeqCst)
        }

        fn phrase_calls(&self) -> usize {
            self.phrase_calls.load(Ordering::SeqCst)
        }
    }

    impl DesktopNativeSecretSurfacePort for AuthenticatedStoredRecoverySurface {
        fn request_operational_pin(
            &self,
        ) -> Result<DesktopNativeSecretSurfaceOutcome, DesktopNativeSecretSurfaceError> {
            self.pin_calls.fetch_add(1, Ordering::SeqCst);

            Ok(DesktopNativeSecretSurfaceOutcome::Secret(
                NativeSecretBytes::new(self.pin.clone()).expect("bounded stored recovery PIN"),
            ))
        }

        fn show_recovery_phrase(
            &self,
            _phrase: &str,
            _fingerprint: &str,
        ) -> Result<DesktopNativeRecoveryPhraseOutcome, DesktopNativeSecretSurfaceError> {
            self.phrase_calls.fetch_add(1, Ordering::SeqCst);

            Ok(self.phrase_outcome)
        }
    }

    fn populated_vault() -> (MemoryVaultStore, MemoryPlatformSealer) {
        let random = DeterministicRandomSource::new();
        let store = MemoryVaultStore::default();
        let sealer = MemoryPlatformSealer::new(NativePlatformFamily::MacosKeychain);

        create_desktop_native_passport_vault_with_random(&random, &store, &sealer, TEST_PIN)
            .expect("create deterministic platform-bound vault");

        (store, sealer)
    }

    #[test]
    fn phase6b2b2_absent_vault_never_unseals_or_requests_surface() {
        let store = MemoryVaultStore::default();

        let sealer = FailingUnsealSealer {
            family: NativePlatformFamily::MacosKeychain,
        };

        let surface =
            RecordingRecoverySurface::new(DesktopNativeRecoveryPhraseOutcome::Acknowledged);

        let outcome = run_desktop_recovery_phrase_runtime(&store, &sealer, &surface)
            .expect("absent vault result");

        assert_eq!(
            outcome,
            DesktopRecoveryPhraseRuntimeOutcome {
                state: DesktopRecoveryPhraseRuntimeState::NoPassport,
                shown: false,
                acknowledged: false,
                recovery_fingerprint: None,
                native_secure_surface_requested: false,
            },
        );

        assert_eq!(store.load_calls(), 1);
        assert_eq!(store.write_calls(), 0);
        assert_eq!(surface.calls(), 0);
    }

    #[test]
    fn phase6b2b2_real_recovery_factor_reaches_native_acknowledgement() {
        let (store, sealer) = populated_vault();

        let surface =
            RecordingRecoverySurface::new(DesktopNativeRecoveryPhraseOutcome::Acknowledged);

        let outcome = run_desktop_recovery_phrase_runtime(&store, &sealer, &surface)
            .expect("real recovery ceremony runtime");

        assert_eq!(
            outcome.state,
            DesktopRecoveryPhraseRuntimeState::Acknowledged,
        );
        assert!(outcome.shown);
        assert!(outcome.acknowledged);
        assert!(outcome.native_secure_surface_requested);

        assert_eq!(
            outcome.recovery_fingerprint.as_ref().map(String::len),
            Some(16),
        );

        assert_eq!(surface.calls(), 1);
        assert_eq!(surface.word_count(), Some(24));
        assert_eq!(surface.fingerprint(), outcome.recovery_fingerprint,);

        assert_eq!(
            sealer.unsealed_compartments(),
            vec![NativeSecureCompartment::RecoveryRoot],
        );

        assert_eq!(store.write_calls(), 1);
    }

    #[test]
    fn phase6b2b2_native_cancel_remains_unacknowledged() {
        let (store, sealer) = populated_vault();

        let surface = RecordingRecoverySurface::new(DesktopNativeRecoveryPhraseOutcome::Cancelled);

        let outcome = run_desktop_recovery_phrase_runtime(&store, &sealer, &surface)
            .expect("cancelled recovery ceremony runtime");

        assert_eq!(outcome.state, DesktopRecoveryPhraseRuntimeState::Cancelled,);
        assert!(outcome.shown);
        assert!(!outcome.acknowledged);
        assert!(outcome.recovery_fingerprint.is_none());
        assert!(outcome.native_secure_surface_requested);
        assert_eq!(surface.calls(), 1);

        assert_eq!(
            sealer.unsealed_compartments(),
            vec![NativeSecureCompartment::RecoveryRoot],
        );
    }

    #[test]
    fn phase6b2b2_unseal_failure_never_requests_native_surface() {
        let (store, _creation_sealer) = populated_vault();

        let sealer = FailingUnsealSealer {
            family: NativePlatformFamily::MacosKeychain,
        };

        let surface =
            RecordingRecoverySurface::new(DesktopNativeRecoveryPhraseOutcome::Acknowledged);

        assert_eq!(
            run_desktop_recovery_phrase_runtime(&store, &sealer, &surface,),
            Err(DesktopRecoveryPhraseRuntimeError::RecoveryFactorUnsealFailed,),
        );

        assert_eq!(surface.calls(), 0);
    }

    #[test]
    fn phase6b2b2_source_has_no_command_serialization_or_secret_return() {
        let source = include_str!("passport_recovery_phrase_runtime.rs");

        let production_source = source
            .split_once("#[cfg(test)]")
            .map(|(production, _tests)| production)
            .expect("test-only boundary must exist");

        let production_code = production_source
            .lines()
            .filter(|line| !line.trim_start().starts_with("//"))
            .collect::<Vec<_>>()
            .join("\n");

        for required in [
            "load_native_encrypted_vault",
            "decode_native_platform_bound_vault",
            "NativeSecureCompartment::RecoveryRoot",
            "derive_native_recovery_mnemonic_indices",
            "with_native_recovery_mnemonic_phrase",
            "show_recovery_phrase",
        ] {
            assert!(
                production_code.contains(required),
                "production runtime missing {required}",
            );
        }

        for forbidden in [
            "#[tauri::command]",
            "serde::Serialize",
            "serde::Deserialize",
            "println!",
            "eprintln!",
            "tracing::",
            "write_native_encrypted_vault_atomic",
            "remove_native_encrypted_vault",
            "clipboard",
            "localStorage",
            "sessionStorage",
            "recovery_phrase: String",
            "phrase_words",
            "wallet_or_ledger_mutated: true",
            "recovery_root_exported: true",
        ] {
            assert!(
                !production_code.contains(forbidden),
                "production runtime contains forbidden {forbidden}",
            );
        }
    }

    struct MemoryRecoveryAcknowledgementStore {
        fingerprint: Mutex<Option<String>>,
        read_calls: AtomicUsize,
        write_calls: AtomicUsize,
        fail_reads: bool,
        fail_writes: bool,
    }

    impl MemoryRecoveryAcknowledgementStore {
        fn available() -> Self {
            Self {
                fingerprint: Mutex::new(None),
                read_calls: AtomicUsize::new(0),
                write_calls: AtomicUsize::new(0),
                fail_reads: false,
                fail_writes: false,
            }
        }

        fn failing_reads() -> Self {
            Self {
                fail_reads: true,
                ..Self::available()
            }
        }

        fn failing_writes() -> Self {
            Self {
                fail_writes: true,
                ..Self::available()
            }
        }

        fn write_calls(&self) -> usize {
            self.write_calls.load(Ordering::SeqCst)
        }

        fn fingerprint(&self) -> Option<String> {
            self.fingerprint
                .lock()
                .expect("acknowledgement fingerprint lock")
                .clone()
        }
    }

    impl crate::passport_recovery_acknowledgement_store::DesktopRecoveryAcknowledgementStorePort
        for MemoryRecoveryAcknowledgementStore
    {
        fn is_recovery_acknowledged(
            &self,
            expected_fingerprint: &str,
        ) -> Result<
            bool,
            crate::passport_recovery_acknowledgement_store::
                DesktopRecoveryAcknowledgementStoreError,
        >{
            self.read_calls.fetch_add(1, Ordering::SeqCst);

            if self.fail_reads {
                return Err(
                    crate::passport_recovery_acknowledgement_store::
                        DesktopRecoveryAcknowledgementStoreError::
                            BackendUnavailable,
                );
            }

            let stored = self
                .fingerprint
                .lock()
                .expect("acknowledgement fingerprint lock");

            match stored.as_deref() {
                None => Ok(false),
                Some(value)
                    if value
                        == expected_fingerprint =>
                {
                    Ok(true)
                }
                Some(_) => Err(
                    crate::passport_recovery_acknowledgement_store::
                        DesktopRecoveryAcknowledgementStoreError::
                            FingerprintMismatch,
                ),
            }
        }

        fn record_recovery_acknowledgement(
            &self,
            fingerprint: &str,
        ) -> Result<
            (),
            crate::passport_recovery_acknowledgement_store::
                DesktopRecoveryAcknowledgementStoreError,
        >{
            self.write_calls.fetch_add(1, Ordering::SeqCst);

            if self.fail_writes {
                return Err(
                    crate::passport_recovery_acknowledgement_store::
                        DesktopRecoveryAcknowledgementStoreError::
                            BackendUnavailable,
                );
            }

            let mut stored = self
                .fingerprint
                .lock()
                .expect("acknowledgement fingerprint lock");

            match stored.as_deref() {
                None => {
                    *stored =
                        Some(
                            fingerprint.to_owned(),
                        );

                    Ok(())
                }
                Some(value)
                    if value == fingerprint =>
                {
                    Err(
                        crate::passport_recovery_acknowledgement_store::
                            DesktopRecoveryAcknowledgementStoreError::
                                AlreadyAcknowledged,
                    )
                }
                Some(_) => Err(
                    crate::passport_recovery_acknowledgement_store::
                        DesktopRecoveryAcknowledgementStoreError::
                            FingerprintMismatch,
                ),
            }
        }

        fn clear_recovery_acknowledgement(
            &self,
        ) -> Result<
            bool,
            crate::passport_recovery_acknowledgement_store::
                DesktopRecoveryAcknowledgementStoreError,
        >{
            Ok(self
                .fingerprint
                .lock()
                .expect("acknowledgement fingerprint lock")
                .take()
                .is_some())
        }
    }

    #[test]
    fn phase6b2b2b2_first_ack_writes_marker_and_second_attempt_rejects_display() {
        let (store, sealer) = populated_vault();

        let surface =
            RecordingRecoverySurface::new(DesktopNativeRecoveryPhraseOutcome::Acknowledged);

        let acknowledgement_store = MemoryRecoveryAcknowledgementStore::available();

        let first =
            run_desktop_recovery_ceremony_once(&store, &sealer, &surface, &acknowledgement_store)
                .expect("first recovery acknowledgement");

        assert_eq!(first.state, DesktopRecoveryCeremonyOnceState::Acknowledged,);

        assert!(first.shown);
        assert!(first.acknowledged);
        assert!(first.recovery_fingerprint_present);
        assert!(first.native_secure_surface_requested);
        assert!(first.acknowledgement_marker_written);
        assert!(!first.repeat_display_rejected);

        assert_eq!(surface.calls(), 1);
        assert_eq!(acknowledgement_store.write_calls(), 1,);

        let stored_fingerprint = acknowledgement_store
            .fingerprint()
            .expect("stored recovery fingerprint");

        assert_eq!(stored_fingerprint.len(), 16,);

        let second =
            run_desktop_recovery_ceremony_once(&store, &sealer, &surface, &acknowledgement_store)
                .expect("repeat recovery review");

        assert_eq!(
            second.state,
            DesktopRecoveryCeremonyOnceState::AlreadyAcknowledged,
        );

        assert!(!second.shown);
        assert!(second.acknowledged);
        assert!(second.recovery_fingerprint_present);
        assert!(!second.native_secure_surface_requested);
        assert!(!second.acknowledgement_marker_written);
        assert!(second.repeat_display_rejected);

        assert_eq!(surface.calls(), 1);
        assert_eq!(acknowledgement_store.write_calls(), 1,);
    }

    #[test]
    fn phase6b2b2b2_cancel_never_writes_acknowledgement_marker() {
        let (store, sealer) = populated_vault();

        let surface = RecordingRecoverySurface::new(DesktopNativeRecoveryPhraseOutcome::Cancelled);

        let acknowledgement_store = MemoryRecoveryAcknowledgementStore::available();

        let outcome =
            run_desktop_recovery_ceremony_once(&store, &sealer, &surface, &acknowledgement_store)
                .expect("cancelled recovery ceremony");

        assert_eq!(outcome.state, DesktopRecoveryCeremonyOnceState::Cancelled,);

        assert!(outcome.shown);
        assert!(!outcome.acknowledged);
        assert!(!outcome.recovery_fingerprint_present);
        assert!(outcome.native_secure_surface_requested);
        assert!(!outcome.acknowledgement_marker_written);

        assert_eq!(surface.calls(), 1);
        assert_eq!(acknowledgement_store.write_calls(), 0,);

        assert!(acknowledgement_store.fingerprint().is_none());
    }

    #[test]
    fn phase6b2b2b2_ack_read_failure_prevents_native_display() {
        let (store, sealer) = populated_vault();

        let surface =
            RecordingRecoverySurface::new(DesktopNativeRecoveryPhraseOutcome::Acknowledged);

        let acknowledgement_store = MemoryRecoveryAcknowledgementStore::failing_reads();

        assert_eq!(
            run_desktop_recovery_ceremony_once(&store, &sealer, &surface, &acknowledgement_store,),
            Err(DesktopRecoveryCeremonyOnceError::AcknowledgementReadFailed,),
        );

        assert_eq!(surface.calls(), 0);
        assert_eq!(acknowledgement_store.write_calls(), 0,);
    }

    #[test]
    fn phase6b2b2b2_ack_write_failure_fails_closed_after_native_confirmation() {
        let (store, sealer) = populated_vault();

        let surface =
            RecordingRecoverySurface::new(DesktopNativeRecoveryPhraseOutcome::Acknowledged);

        let acknowledgement_store = MemoryRecoveryAcknowledgementStore::failing_writes();

        assert_eq!(
            run_desktop_recovery_ceremony_once(&store, &sealer, &surface, &acknowledgement_store,),
            Err(DesktopRecoveryCeremonyOnceError::AcknowledgementWriteFailed,),
        );

        assert_eq!(surface.calls(), 1);
        assert_eq!(acknowledgement_store.write_calls(), 1,);

        assert!(acknowledgement_store.fingerprint().is_none());
    }

    struct Phase6DManualTempRoot {
        root: std::path::PathBuf,
    }

    impl Phase6DManualTempRoot {
        fn new() -> Self {
            let mut root = std::env::temp_dir();

            let nanos = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .expect("system clock before UNIX epoch")
                .as_nanos();

            root.push(format!(
                "crablink-phase6d-native-recovery-{}-{nanos}",
                std::process::id()
            ));

            Self { root }
        }
    }

    impl Drop for Phase6DManualTempRoot {
        fn drop(&mut self) {
            let _ = std::fs::remove_dir_all(&self.root);
        }
    }

    #[test]
    #[ignore = "requires a live macOS desktop session and manual native recovery-dialog acknowledgement"]
    fn phase6d_manual_desktop_native_ceremony_first_repeat_and_clear_reset() {
        if std::env::var("CRABLINK_PHASE6D_MANUAL_NATIVE_DIALOG")
            .ok()
            .as_deref()
            != Some("YES")
        {
            panic!(
                "set CRABLINK_PHASE6D_MANUAL_NATIVE_DIALOG=YES and run scripts/onboarding_phase6d_desktop_native_ceremony_acceptance.sh"
            );
        }

        let (store, sealer) = populated_vault();

        let marker_root = Phase6DManualTempRoot::new();

        let acknowledgement_store =
            crate::passport_recovery_acknowledgement_store::
                DesktopRecoveryAcknowledgementStore::new(
                    &marker_root.root,
                );

        let surface =
            crate::passport_operational_command_runtime::new_desktop_native_secret_surface();

        let first = run_desktop_recovery_ceremony_once(
            &store,
            &sealer,
            surface.as_ref(),
            &acknowledgement_store,
        )
        .expect("first native recovery ceremony");

        assert_eq!(first.state, DesktopRecoveryCeremonyOnceState::Acknowledged,);
        assert!(first.shown);
        assert!(first.acknowledged);
        assert!(first.recovery_fingerprint_present);
        assert!(first.native_secure_surface_requested);
        assert!(first.acknowledgement_marker_written);
        assert!(!first.repeat_display_rejected);

        let second = run_desktop_recovery_ceremony_once(
            &store,
            &sealer,
            surface.as_ref(),
            &acknowledgement_store,
        )
        .expect("repeat native recovery ceremony");

        assert_eq!(
            second.state,
            DesktopRecoveryCeremonyOnceState::AlreadyAcknowledged,
        );
        assert!(!second.shown);
        assert!(second.acknowledged);
        assert!(second.recovery_fingerprint_present);
        assert!(!second.native_secure_surface_requested);
        assert!(!second.acknowledgement_marker_written);
        assert!(second.repeat_display_rejected);

        let marker_removed =
            crate::passport_recovery_acknowledgement_store::
                DesktopRecoveryAcknowledgementStorePort::
                    clear_recovery_acknowledgement(
                        &acknowledgement_store,
                    )
                    .expect("clear recovery acknowledgement marker");

        assert!(marker_removed);

        let third = run_desktop_recovery_ceremony_once(
            &store,
            &sealer,
            surface.as_ref(),
            &acknowledgement_store,
        )
        .expect("native recovery ceremony after marker reset");

        assert_eq!(third.state, DesktopRecoveryCeremonyOnceState::Acknowledged,);
        assert!(third.shown);
        assert!(third.acknowledged);
        assert!(third.recovery_fingerprint_present);
        assert!(third.native_secure_surface_requested);
        assert!(third.acknowledgement_marker_written);
        assert!(!third.repeat_display_rejected);
    }

    #[test]
    #[ignore = "requires a live macOS desktop session and manual acknowledgement of two OS-CSPRNG-backed recovery dialogs"]
    fn phase6f_manual_os_csprng_two_passports_have_distinct_recovery_phrases() {
        if std::env::var("CRABLINK_PHASE6F_MANUAL_OS_CSPRNG")
            .ok()
            .as_deref()
            != Some("YES")
        {
            panic!(
                "set CRABLINK_PHASE6F_MANUAL_OS_CSPRNG=YES and run scripts/onboarding_phase6f_os_csprng_recovery_acceptance.sh"
            );
        }

        let store_a = MemoryVaultStore::default();

        let sealer_a = MemoryPlatformSealer::new(NativePlatformFamily::MacosKeychain);

        create_desktop_native_passport_vault(&store_a, &sealer_a, TEST_PIN)
            .expect("create OS-CSPRNG-backed temporary Passport A vault");

        let store_b = MemoryVaultStore::default();

        let sealer_b = MemoryPlatformSealer::new(NativePlatformFamily::MacosKeychain);

        create_desktop_native_passport_vault(&store_b, &sealer_b, TEST_PIN)
            .expect("create OS-CSPRNG-backed temporary Passport B vault");

        let surface =
            crate::passport_operational_command_runtime::new_desktop_native_secret_surface();

        println!("PHASE6F_OPENING_TEMPORARY_PASSPORT_A_RECOVERY_DIALOG=YES");

        let first = run_desktop_recovery_phrase_runtime(&store_a, &sealer_a, surface.as_ref())
            .expect("show OS-CSPRNG-backed temporary Passport A recovery phrase");

        assert_eq!(first.state, DesktopRecoveryPhraseRuntimeState::Acknowledged,);

        assert!(first.shown);
        assert!(first.acknowledged);
        assert!(first.native_secure_surface_requested);

        let first_fingerprint = first
            .recovery_fingerprint
            .expect("temporary Passport A recovery fingerprint");

        println!("PHASE6F_PASSPORT_A_FINGERPRINT={first_fingerprint}");

        println!("PHASE6F_OPENING_TEMPORARY_PASSPORT_B_RECOVERY_DIALOG=YES");

        let second = run_desktop_recovery_phrase_runtime(&store_b, &sealer_b, surface.as_ref())
            .expect("show OS-CSPRNG-backed temporary Passport B recovery phrase");

        assert_eq!(
            second.state,
            DesktopRecoveryPhraseRuntimeState::Acknowledged,
        );

        assert!(second.shown);
        assert!(second.acknowledged);
        assert!(second.native_secure_surface_requested);

        let second_fingerprint = second
            .recovery_fingerprint
            .expect("temporary Passport B recovery fingerprint");

        println!("PHASE6F_PASSPORT_B_FINGERPRINT={second_fingerprint}");

        assert_ne!(
            first_fingerprint,
            second_fingerprint,
            "two independently created OS-CSPRNG-backed temporary Passports must not share a recovery fingerprint",
        );

        assert_eq!(
            sealer_a.unsealed_compartments(),
            vec![NativeSecureCompartment::RecoveryRoot,],
        );

        assert_eq!(
            sealer_b.unsealed_compartments(),
            vec![NativeSecureCompartment::RecoveryRoot,],
        );

        println!("ONBOARDING_PHASE6F_OS_CSPRNG_DISTINCT_RECOVERY=GREEN");

        println!("TEMPORARY_PASSPORT_A_AND_B_FINGERPRINTS_DIFFER=YES");

        println!("PRODUCTION_OS_RANDOM_CREATE_WRAPPER_USED=YES");

        println!("REAL_USER_VAULT_TOUCHED=NO");

        println!("MACOS_KEYCHAIN_TOUCHED=NO");

        println!("WORDS_RETURNED_TO_WEBVIEW=NO");

        println!("ROOT_EXPORT=NO");

        println!("WALLET_OR_LEDGER_MUTATION=NO");
    }

    #[test]
    fn physical_m1_restart_recovery_authenticates_stored_root_before_phrase_and_resumes_ack() {
        let (store, sealer) = populated_vault();

        let pending = DesktopPendingRecoverySessionStore::default();

        let surface = AuthenticatedStoredRecoverySurface::new(
            TEST_PIN,
            DesktopNativeRecoveryPhraseOutcome::Acknowledged,
        );

        let acknowledgement_store = MemoryRecoveryAcknowledgementStore::available();

        let first =
            run_desktop_recovery_ceremony_once_with_pending_or_authenticated_stored_recovery(
                &store,
                &sealer,
                &surface,
                &acknowledgement_store,
                &pending,
            )
            .expect("authenticated stored recovery");

        assert_eq!(first.state, DesktopRecoveryCeremonyOnceState::Acknowledged,);

        assert!(first.shown);
        assert!(first.acknowledged);

        assert_eq!(surface.pin_calls(), 1);
        assert_eq!(surface.phrase_calls(), 1);

        assert_eq!(acknowledgement_store.write_calls(), 1,);

        let second =
            run_desktop_recovery_ceremony_once_with_pending_or_authenticated_stored_recovery(
                &store,
                &sealer,
                &surface,
                &acknowledgement_store,
                &pending,
            )
            .expect("durably acknowledged stored recovery");

        assert_eq!(
            second.state,
            DesktopRecoveryCeremonyOnceState::AlreadyAcknowledged,
        );

        assert!(!second.shown);
        assert!(second.acknowledged);

        assert!(!second.native_secure_surface_requested,);

        assert!(second.repeat_display_rejected);

        assert_eq!(
            surface.pin_calls(),
            1,
            "durable acknowledgement must avoid another root PIN prompt",
        );

        assert_eq!(
            surface.phrase_calls(),
            1,
            "durable acknowledgement must avoid repeat phrase display",
        );

        assert_eq!(acknowledgement_store.write_calls(), 1,);

        assert_eq!(
            sealer.unsealed_compartments(),
            vec![
                NativeSecureCompartment::RecoveryRoot,
                NativeSecureCompartment::RecoveryRoot,
            ],
        );
    }

    #[test]
    fn physical_m1_restart_recovery_rejects_wrong_root_pin_without_phrase() {
        let (store, sealer) = populated_vault();

        let pending = DesktopPendingRecoverySessionStore::default();

        let surface = AuthenticatedStoredRecoverySurface::new(
            b"phase6b2b2-wrong-pin",
            DesktopNativeRecoveryPhraseOutcome::Acknowledged,
        );

        let acknowledgement_store = MemoryRecoveryAcknowledgementStore::available();

        let outcome =
            run_desktop_recovery_ceremony_once_with_pending_or_authenticated_stored_recovery(
                &store,
                &sealer,
                &surface,
                &acknowledgement_store,
                &pending,
            )
            .expect("wrong root PIN must fail closed");

        assert_eq!(outcome.state, DesktopRecoveryCeremonyOnceState::Rejected,);

        assert!(!outcome.shown);
        assert!(!outcome.acknowledged);

        assert!(outcome.native_secure_surface_requested,);

        assert_eq!(surface.pin_calls(), 1);
        assert_eq!(surface.phrase_calls(), 0);

        assert_eq!(acknowledgement_store.write_calls(), 0,);

        assert_eq!(
            sealer.unsealed_compartments(),
            vec![NativeSecureCompartment::RecoveryRoot,],
        );
    }

    #[test]
    fn physical_m1_restart_recovery_preserves_pending_memory_fast_path_without_pin_or_unseal() {
        let random = DeterministicRandomSource::new();

        let store = MemoryVaultStore::default();

        let sealer = MemoryPlatformSealer::new(NativePlatformFamily::MacosKeychain);

        let pending = DesktopPendingRecoverySessionStore::default();

        create_desktop_native_passport_vault_with_random_and_recovery_handoff(
            &random,
            &store,
            &sealer,
            TEST_PIN,
            |recovery_factor| {
                pending.stage_recovery_factor(recovery_factor).map_err(|_| {
                    DesktopNativePassportVaultCreateError::PendingRecoverySessionFailure
                })
            },
        )
        .expect("create vault with pending recovery");

        let surface =
            RecordingRecoverySurface::new(DesktopNativeRecoveryPhraseOutcome::Acknowledged);

        let acknowledgement_store = MemoryRecoveryAcknowledgementStore::available();

        let outcome =
            run_desktop_recovery_ceremony_once_with_pending_or_authenticated_stored_recovery(
                &store,
                &sealer,
                &surface,
                &acknowledgement_store,
                &pending,
            )
            .expect("pending-memory recovery");

        assert_eq!(
            outcome.state,
            DesktopRecoveryCeremonyOnceState::Acknowledged,
        );

        assert_eq!(surface.calls(), 1);

        assert!(
            sealer.unsealed_compartments().is_empty(),
            "fresh-create recovery must preserve the no-platform-unseal fast path",
        );
    }

    #[test]
    fn phase11b_pending_recovery_avoids_platform_unseal_and_drops_after_acknowledgement() {
        let random = DeterministicRandomSource::new();

        let store = MemoryVaultStore::default();

        let sealer = MemoryPlatformSealer::new(NativePlatformFamily::MacosKeychain);

        let pending = DesktopPendingRecoverySessionStore::default();

        create_desktop_native_passport_vault_with_random_and_recovery_handoff(
            &random,
            &store,
            &sealer,
            TEST_PIN,
            |recovery_factor| {
                pending.stage_recovery_factor(recovery_factor).map_err(|_| {
                    DesktopNativePassportVaultCreateError::PendingRecoverySessionFailure
                })
            },
        )
        .expect("create vault and stage pending recovery factor");

        let surface =
            RecordingRecoverySurface::new(DesktopNativeRecoveryPhraseOutcome::Acknowledged);

        let acknowledgement_store = MemoryRecoveryAcknowledgementStore::available();

        let outcome = run_desktop_recovery_ceremony_once_with_pending_recovery(
            &store,
            &sealer,
            &surface,
            &acknowledgement_store,
            &pending,
        )
        .expect("pending recovery ceremony");

        assert_eq!(
            outcome.state,
            DesktopRecoveryCeremonyOnceState::Acknowledged,
        );

        assert_eq!(surface.calls(), 1,);

        assert!(
            sealer.unsealed_compartments().is_empty(),
            "immediate recovery must not unseal the Keychain-backed factor",
        );

        assert!(!pending
            .has_pending_recovery_factor()
            .expect("pending state after acknowledgement",),);
    }

    #[test]
    fn phase11b_cancel_restores_pending_recovery_for_retry_without_platform_unseal() {
        let random = DeterministicRandomSource::new();

        let store = MemoryVaultStore::default();

        let sealer = MemoryPlatformSealer::new(NativePlatformFamily::MacosKeychain);

        let pending = DesktopPendingRecoverySessionStore::default();

        create_desktop_native_passport_vault_with_random_and_recovery_handoff(
            &random,
            &store,
            &sealer,
            TEST_PIN,
            |recovery_factor| {
                pending.stage_recovery_factor(recovery_factor).map_err(|_| {
                    DesktopNativePassportVaultCreateError::PendingRecoverySessionFailure
                })
            },
        )
        .expect("create vault and stage pending recovery factor");

        let cancelled_surface =
            RecordingRecoverySurface::new(DesktopNativeRecoveryPhraseOutcome::Cancelled);

        let acknowledgement_store = MemoryRecoveryAcknowledgementStore::available();

        let cancelled = run_desktop_recovery_ceremony_once_with_pending_recovery(
            &store,
            &sealer,
            &cancelled_surface,
            &acknowledgement_store,
            &pending,
        )
        .expect("cancelled pending recovery ceremony");

        assert_eq!(cancelled.state, DesktopRecoveryCeremonyOnceState::Cancelled,);

        assert!(pending
            .has_pending_recovery_factor()
            .expect("pending state after cancellation",),);

        assert!(sealer.unsealed_compartments().is_empty(),);

        let acknowledged_surface =
            RecordingRecoverySurface::new(DesktopNativeRecoveryPhraseOutcome::Acknowledged);

        let acknowledged = run_desktop_recovery_ceremony_once_with_pending_recovery(
            &store,
            &sealer,
            &acknowledged_surface,
            &acknowledgement_store,
            &pending,
        )
        .expect("acknowledged pending recovery retry");

        assert_eq!(
            acknowledged.state,
            DesktopRecoveryCeremonyOnceState::Acknowledged,
        );

        assert!(
            sealer.unsealed_compartments().is_empty(),
            "recovery retry must continue using native pending memory",
        );

        assert!(!pending
            .has_pending_recovery_factor()
            .expect("pending state after retry acknowledgement",),);
    }

    #[test]
    fn phase6e_manual_recovery_fixture_has_diverse_entropy_and_words() {
        let random = DeterministicRandomSource::new();

        let mut bytes = vec![0u8; 32];

        random
            .fill(&mut bytes)
            .expect("deterministic fixture random source should fill");

        let unique_bytes = bytes
            .iter()
            .copied()
            .collect::<std::collections::BTreeSet<u8>>();

        assert!(
            unique_bytes.len() >= 24,
            "manual recovery fixture must not be a repeated-byte pattern",
        );

        let recovery_factor =
            NativeSecretBytes::new(bytes).expect("bounded manual recovery fixture");

        let indices =
            svc_passport::native::derive_native_recovery_mnemonic_indices(&recovery_factor)
                .expect("diverse manual fixture should map to recovery indices");

        let phrase = svc_passport::native::with_native_recovery_mnemonic_phrase(
            &indices,
            |phrase, _fingerprint| phrase.to_string(),
        )
        .expect("diverse manual fixture should map to recovery words");

        let words = phrase.split_whitespace().collect::<Vec<&str>>();

        assert_eq!(words.len(), 24);

        let unique_words = words
            .iter()
            .copied()
            .collect::<std::collections::BTreeSet<&str>>();

        assert!(
            unique_words.len() >= 16,
            "manual native recovery fixture must look visibly non-patterned",
        );

        assert!(
            !phrase.contains("baby mass dust captain baby mass dust captain"),
            "manual fixture must not display the old repeated phrase pattern",
        );
    }
}
