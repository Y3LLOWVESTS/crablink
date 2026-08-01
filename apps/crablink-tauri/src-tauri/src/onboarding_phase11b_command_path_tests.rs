//! RO:WHAT — Proves one managed desktop AppState carries a newly created recovery factor directly into the first native recovery ceremony.
//! RO:WHY — Phase 11B must distinguish a real command-path handoff from lower-level helper tests before changing the onboarding architecture.
//! RO:INTERACTS — AppState, passport_create_command_runtime, passport_recovery_phrase_runtime, DesktopAtomicVaultStore, and native secret/sealer ports.
//! RO:INVARIANTS — one AppState; created_locked; pending factor present after create; native phrase surface called once; platform unseal never called.
//! RO:SECURITY — temporary vault only; fake native PIN; no macOS Keychain, WebView secret, root export, capability, username, wallet, or ledger mutation.
//! RO:TEST — cargo test --lib onboarding_phase11b_command_path_tests.

use std::sync::{
    atomic::{AtomicUsize, Ordering},
    Arc,
};

use svc_passport::native::{
    NativePlatformFamily, NativePlatformSealer, NativePlatformStorageError, NativeSealedMaterialV1,
    NativeSecretBytes, NativeSecureCompartment,
};

use crate::{
    passport_create_command_runtime::{
        create_desktop_native_passport_from_native_surface_with_pending_factors,
        create_desktop_native_passport_from_native_surface_with_pending_recovery,
        DesktopNativePassportCreateCommandState,
    },
    passport_operational_command_runtime::{
        unlock_desktop_native_passport_operational_from_native_surface_with_pending_operational,
        DesktopNativeRecoveryPhraseOutcome, DesktopNativeSecretSurfaceError,
        DesktopNativeSecretSurfaceOutcome, DesktopNativeSecretSurfacePort,
        DesktopOperationalUnlockCommandState,
    },
    passport_platform_material_clear_runtime::AlreadyAbsentDesktopPlatformMaterialClearer,
    passport_recovery_phrase_runtime::{
        run_desktop_recovery_ceremony_once_with_pending_recovery, DesktopRecoveryCeremonyOnceState,
    },
    passport_vault_store::DesktopAtomicVaultStore,
    state::AppState,
};

#[derive(Default)]
struct Phase11bCommandPathSealer {
    seal_calls: AtomicUsize,
    unseal_calls: AtomicUsize,
}

impl Phase11bCommandPathSealer {
    fn seal_calls(&self) -> usize {
        self.seal_calls.load(Ordering::SeqCst)
    }

    fn unseal_calls(&self) -> usize {
        self.unseal_calls.load(Ordering::SeqCst)
    }
}

impl NativePlatformSealer for Phase11bCommandPathSealer {
    fn platform_family(&self) -> NativePlatformFamily {
        NativePlatformFamily::MacosKeychain
    }

    fn seal(
        &self,
        compartment: NativeSecureCompartment,
        _secret: &NativeSecretBytes,
    ) -> Result<NativeSealedMaterialV1, NativePlatformStorageError> {
        self.seal_calls.fetch_add(1, Ordering::SeqCst);

        let reference = match compartment {
            NativeSecureCompartment::RecoveryRoot => {
                b"phase11b-command-path:recovery-root".to_vec()
            }

            NativeSecureCompartment::DeviceKey => b"phase11b-command-path:device-key".to_vec(),
        };

        NativeSealedMaterialV1::new(NativePlatformFamily::MacosKeychain, compartment, reference)
    }

    fn unseal(
        &self,
        _sealed: &NativeSealedMaterialV1,
    ) -> Result<NativeSecretBytes, NativePlatformStorageError> {
        self.unseal_calls.fetch_add(1, Ordering::SeqCst);

        panic!(
            "Phase 11B command path must not unseal \
             platform recovery material"
        );
    }
}

#[derive(Default)]
struct Phase11bCommandPathSurface {
    recovery_calls: AtomicUsize,
}

impl Phase11bCommandPathSurface {
    fn recovery_calls(&self) -> usize {
        self.recovery_calls.load(Ordering::SeqCst)
    }
}

impl DesktopNativeSecretSurfacePort for Phase11bCommandPathSurface {
    fn request_operational_pin(
        &self,
    ) -> Result<DesktopNativeSecretSurfaceOutcome, DesktopNativeSecretSurfaceError> {
        Ok(DesktopNativeSecretSurfaceOutcome::Secret(
            NativeSecretBytes::new(b"phase11b-command-path-pin".to_vec())
                .expect("bounded Phase 11B PIN"),
        ))
    }

    fn show_recovery_phrase(
        &self,
        _phrase: &str,
        _fingerprint: &str,
    ) -> Result<DesktopNativeRecoveryPhraseOutcome, DesktopNativeSecretSurfaceError> {
        self.recovery_calls.fetch_add(1, Ordering::SeqCst);

        Ok(DesktopNativeRecoveryPhraseOutcome::Acknowledged)
    }
}

fn phase11b_command_path_root() -> std::path::PathBuf {
    static NEXT: AtomicUsize = AtomicUsize::new(0);

    std::env::temp_dir().join(format!(
        "crablink-phase11b-command-path-{}-{}",
        std::process::id(),
        NEXT.fetch_add(1, Ordering::SeqCst,),
    ))
}

#[test]
fn phase11b_one_app_state_create_then_recovery_uses_pending_native_memory() {
    let root = phase11b_command_path_root();

    let _ = std::fs::remove_dir_all(&root);

    let vault_store =
        DesktopAtomicVaultStore::new(root.clone()).expect("Phase 11B temporary vault store");

    let sealer = Arc::new(Phase11bCommandPathSealer::default());

    let surface = Arc::new(Phase11bCommandPathSurface::default());

    let state = AppState::with_native_passport_runtime_and_secret_surface(
        vault_store,
        sealer.clone(),
        Arc::new(AlreadyAbsentDesktopPlatformMaterialClearer),
        surface.clone(),
    );

    let create = create_desktop_native_passport_from_native_surface_with_pending_factors(
        &state.passport_vault_store,
        state.passport_platform_sealer.as_ref(),
        state.passport_secret_surface.as_ref(),
        &state.passport_pending_recovery_session,
        &state.passport_pending_operational_session,
    );

    assert_eq!(
        create.state,
        DesktopNativePassportCreateCommandState::CreatedLocked,
    );

    assert_eq!(sealer.seal_calls(), 2,);

    assert!(state
        .passport_pending_recovery_session
        .has_pending_recovery_factor()
        .expect("pending recovery after create",),);

    let recovery = run_desktop_recovery_ceremony_once_with_pending_recovery(
        &state.passport_vault_store,
        state.passport_platform_sealer.as_ref(),
        state.passport_secret_surface.as_ref(),
        &state.passport_recovery_acknowledgement_store,
        &state.passport_pending_recovery_session,
    )
    .expect(
        "Phase 11B recovery ceremony \
             from the same AppState",
    );

    assert_eq!(
        recovery.state,
        DesktopRecoveryCeremonyOnceState::Acknowledged,
    );

    assert_eq!(surface.recovery_calls(), 1,);

    assert_eq!(sealer.unseal_calls(), 0,);

    assert!(state
        .passport_pending_operational_session
        .has_pending_operational_factor()
        .expect("pending operational factor after create",),);

    let unlock =
        unlock_desktop_native_passport_operational_from_native_surface_with_pending_operational(
            &state.passport_vault_store,
            state.passport_platform_sealer.as_ref(),
            &state.passport_operational_session,
            state.passport_secret_surface.as_ref(),
            &state.passport_pending_operational_session,
        );

    assert_eq!(
        unlock.state,
        DesktopOperationalUnlockCommandState::OperationalUnlocked,
    );

    assert_eq!(sealer.unseal_calls(), 0,);

    assert!(!state
        .passport_pending_operational_session
        .has_pending_operational_factor()
        .expect("pending operational factor consumed after unlock",),);

    assert!(!state
        .passport_pending_recovery_session
        .has_pending_recovery_factor()
        .expect(
            "pending recovery consumed \
                 after acknowledgement",
        ),);

    drop(state);

    let _ = std::fs::remove_dir_all(root);
}

#[test]
fn phase11b_missing_pending_recovery_fails_closed_without_platform_unseal() {
    let root = phase11b_command_path_root();

    let _ = std::fs::remove_dir_all(&root);

    let vault_store =
        DesktopAtomicVaultStore::new(root.clone()).expect("Phase 11B temporary vault store");

    let sealer = Arc::new(Phase11bCommandPathSealer::default());

    let surface = Arc::new(Phase11bCommandPathSurface::default());

    let state = AppState::with_native_passport_runtime_and_secret_surface(
        vault_store,
        sealer.clone(),
        Arc::new(AlreadyAbsentDesktopPlatformMaterialClearer),
        surface.clone(),
    );

    let create = create_desktop_native_passport_from_native_surface_with_pending_recovery(
        &state.passport_vault_store,
        state.passport_platform_sealer.as_ref(),
        state.passport_secret_surface.as_ref(),
        &state.passport_pending_recovery_session,
    );

    assert_eq!(
        create.state,
        DesktopNativePassportCreateCommandState::CreatedLocked,
    );

    state
        .passport_pending_recovery_session
        .clear_pending_recovery_factor()
        .expect("simulate interrupted onboarding handoff");

    let recovery = run_desktop_recovery_ceremony_once_with_pending_recovery(
        &state.passport_vault_store,
        state.passport_platform_sealer.as_ref(),
        state.passport_secret_surface.as_ref(),
        &state.passport_recovery_acknowledgement_store,
        &state.passport_pending_recovery_session,
    )
    .expect("missing pending recovery must fail closed");

    assert_eq!(
        recovery.state,
        DesktopRecoveryCeremonyOnceState::Unavailable,
    );

    assert!(!recovery.shown);
    assert!(!recovery.acknowledged);

    assert!(!recovery.native_secure_surface_requested,);

    assert_eq!(surface.recovery_calls(), 0,);

    assert_eq!(sealer.unseal_calls(), 0,);

    drop(state);

    let _ = std::fs::remove_dir_all(root);
}
