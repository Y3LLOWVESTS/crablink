use std::{
    fs,
    path::PathBuf,
    sync::{
        atomic::{AtomicBool, AtomicUsize, Ordering},
        Mutex,
    },
};

use crablink_tauri_lib::{
    passport_clear_command_runtime::{
        clear_desktop_native_passport_with_platform_material_and_recovery_acknowledgement,
        DesktopNativePassportClearCommandState, ONBOARDING_PHASE11C2B_PLATFORM_SECRET_CLEAR_LABEL,
    },
    passport_operational_unlock_runtime::{
        unlock_desktop_native_passport_operational, DesktopOperationalVaultSessionState,
        DesktopOperationalVaultSessionStore,
    },
    passport_pending_operational_runtime::DesktopPendingOperationalSessionStore,
    passport_pending_recovery_runtime::DesktopPendingRecoverySessionStore,
    passport_platform_material_clear_runtime::{
        DesktopPlatformMaterialClearReview, DesktopPlatformMaterialClearer,
        DesktopPlatformMaterialEntryClearState,
    },
    passport_recovery_acknowledgement_store::{
        DesktopRecoveryAcknowledgementStoreError, DesktopRecoveryAcknowledgementStorePort,
    },
    passport_vault_create_runtime::create_desktop_native_passport_vault,
};

use svc_passport::native::{
    NativeEncryptedVaultV1, NativePlatformFamily, NativePlatformSealer, NativePlatformStorageError,
    NativePlatformStorageOperation, NativeSealedMaterialV1, NativeSecretBytes,
    NativeSecureCompartment, NativeVaultRecoveryOutcome, NativeVaultRemovalOutcome,
    NativeVaultStore,
};

const TEST_PIN: &[u8] = b"phase11c2b-clear-pin";

#[derive(Default)]
struct MemoryVaultStore {
    vault: Mutex<Option<NativeEncryptedVaultV1>>,
    remove_calls: AtomicUsize,
}

impl MemoryVaultStore {
    fn remove_calls(&self) -> usize {
        self.remove_calls.load(Ordering::SeqCst)
    }

    fn has_vault(&self) -> bool {
        self.vault.lock().expect("memory vault lock").is_some()
    }
}

impl NativeVaultStore for MemoryVaultStore {
    fn load_encrypted_vault(
        &self,
    ) -> Result<Option<NativeEncryptedVaultV1>, NativePlatformStorageError> {
        Ok(self.vault.lock().expect("memory vault lock").clone())
    }

    fn write_encrypted_vault_atomic(
        &self,
        vault: &NativeEncryptedVaultV1,
    ) -> Result<(), NativePlatformStorageError> {
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
        self.remove_calls.fetch_add(1, Ordering::SeqCst);

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

#[derive(Default)]
struct MemoryPlatformSealer {
    sealed: Mutex<Vec<(NativeSecureCompartment, NativeSecretBytes)>>,
}

impl NativePlatformSealer for MemoryPlatformSealer {
    fn platform_family(&self) -> NativePlatformFamily {
        NativePlatformFamily::MacosKeychain
    }

    fn seal(
        &self,
        compartment: NativeSecureCompartment,
        material: &NativeSecretBytes,
    ) -> Result<NativeSealedMaterialV1, NativePlatformStorageError> {
        let material_copy = NativeSecretBytes::new(material.as_slice().to_vec()).map_err(|_| {
            NativePlatformStorageError::BackendFailure {
                operation: NativePlatformStorageOperation::Seal,
            }
        })?;

        self.sealed
            .lock()
            .map_err(|_| NativePlatformStorageError::BackendFailure {
                operation: NativePlatformStorageOperation::Seal,
            })?
            .push((compartment, material_copy));

        NativeSealedMaterialV1::new(
            NativePlatformFamily::MacosKeychain,
            compartment,
            format!("memory://phase11c2b/{compartment:?}").into_bytes(),
        )
    }

    fn unseal(
        &self,
        sealed: &NativeSealedMaterialV1,
    ) -> Result<NativeSecretBytes, NativePlatformStorageError> {
        let materials =
            self.sealed
                .lock()
                .map_err(|_| NativePlatformStorageError::BackendFailure {
                    operation: NativePlatformStorageOperation::Unseal,
                })?;

        let (_, material) = materials
            .iter()
            .rev()
            .find(|(compartment, _)| *compartment == sealed.compartment)
            .ok_or(NativePlatformStorageError::BackendFailure {
                operation: NativePlatformStorageOperation::Unseal,
            })?;

        NativeSecretBytes::new(material.as_slice().to_vec()).map_err(|_| {
            NativePlatformStorageError::BackendFailure {
                operation: NativePlatformStorageOperation::Unseal,
            }
        })
    }
}

struct OrderedPlatformClearer<'a> {
    session: &'a DesktopOperationalVaultSessionStore,
    pending_recovery: &'a DesktopPendingRecoverySessionStore,
    pending_operational: &'a DesktopPendingOperationalSessionStore,
    review: DesktopPlatformMaterialClearReview,
    calls: AtomicUsize,
    preconditions_met: AtomicBool,
}

impl<'a> OrderedPlatformClearer<'a> {
    fn new(
        session: &'a DesktopOperationalVaultSessionStore,
        pending_recovery: &'a DesktopPendingRecoverySessionStore,
        pending_operational: &'a DesktopPendingOperationalSessionStore,
        review: DesktopPlatformMaterialClearReview,
    ) -> Self {
        Self {
            session,
            pending_recovery,
            pending_operational,
            review,
            calls: AtomicUsize::new(0),
            preconditions_met: AtomicBool::new(false),
        }
    }

    fn calls(&self) -> usize {
        self.calls.load(Ordering::SeqCst)
    }

    fn preconditions_met(&self) -> bool {
        self.preconditions_met.load(Ordering::SeqCst)
    }
}

impl DesktopPlatformMaterialClearer for OrderedPlatformClearer<'_> {
    fn clear_platform_material(&self) -> DesktopPlatformMaterialClearReview {
        self.calls.fetch_add(1, Ordering::SeqCst);

        let preconditions_met = matches!(
            self.session.state(),
            Ok(DesktopOperationalVaultSessionState::Locked,),
        ) && matches!(
            self.pending_recovery.has_pending_recovery_factor(),
            Ok(false),
        ) && matches!(
            self.pending_operational.has_pending_operational_factor(),
            Ok(false),
        );

        self.preconditions_met
            .store(preconditions_met, Ordering::SeqCst);

        if preconditions_met {
            self.review
        } else {
            DesktopPlatformMaterialClearReview {
                recovery_root: DesktopPlatformMaterialEntryClearState::Failed,
                device_key: DesktopPlatformMaterialEntryClearState::Failed,
            }
        }
    }
}

struct TrackingAcknowledgementStore<'a> {
    store: &'a MemoryVaultStore,
    fail_clear: bool,
    clear_calls: AtomicUsize,
    vault_absent_when_called: AtomicBool,
}

impl<'a> TrackingAcknowledgementStore<'a> {
    fn available(store: &'a MemoryVaultStore) -> Self {
        Self {
            store,
            fail_clear: false,
            clear_calls: AtomicUsize::new(0),
            vault_absent_when_called: AtomicBool::new(false),
        }
    }

    fn failing(store: &'a MemoryVaultStore) -> Self {
        Self {
            store,
            fail_clear: true,
            clear_calls: AtomicUsize::new(0),
            vault_absent_when_called: AtomicBool::new(false),
        }
    }

    fn clear_calls(&self) -> usize {
        self.clear_calls.load(Ordering::SeqCst)
    }

    fn vault_absent_when_called(&self) -> bool {
        self.vault_absent_when_called.load(Ordering::SeqCst)
    }
}

impl DesktopRecoveryAcknowledgementStorePort for TrackingAcknowledgementStore<'_> {
    fn is_recovery_acknowledged(
        &self,
        _expected_fingerprint: &str,
    ) -> Result<bool, DesktopRecoveryAcknowledgementStoreError> {
        Ok(false)
    }

    fn record_recovery_acknowledgement(
        &self,
        _fingerprint: &str,
    ) -> Result<(), DesktopRecoveryAcknowledgementStoreError> {
        Ok(())
    }

    fn clear_recovery_acknowledgement(
        &self,
    ) -> Result<bool, DesktopRecoveryAcknowledgementStoreError> {
        self.clear_calls.fetch_add(1, Ordering::SeqCst);

        self.vault_absent_when_called
            .store(!self.store.has_vault(), Ordering::SeqCst);

        if self.fail_clear {
            Err(DesktopRecoveryAcknowledgementStoreError::BackendUnavailable)
        } else {
            Ok(true)
        }
    }
}

fn complete_removed_review() -> DesktopPlatformMaterialClearReview {
    DesktopPlatformMaterialClearReview {
        recovery_root: DesktopPlatformMaterialEntryClearState::Removed,
        device_key: DesktopPlatformMaterialEntryClearState::Removed,
    }
}

fn create_vault_and_unlock_session() -> (MemoryVaultStore, DesktopOperationalVaultSessionStore) {
    let store = MemoryVaultStore::default();

    let sealer = MemoryPlatformSealer::default();

    let session = DesktopOperationalVaultSessionStore::default();

    create_desktop_native_passport_vault(&store, &sealer, TEST_PIN)
        .expect("create Phase 11C2B vault");

    unlock_desktop_native_passport_operational(&store, &sealer, &session, TEST_PIN)
        .expect("unlock Phase 11C2B session");

    assert_eq!(
        session.state().expect("unlocked session state"),
        DesktopOperationalVaultSessionState::OperationalUnlocked,
    );

    (store, session)
}

fn stage_pending_factors(
    pending_recovery: &DesktopPendingRecoverySessionStore,
    pending_operational: &DesktopPendingOperationalSessionStore,
) {
    let recovery = NativeSecretBytes::new(b"phase11c2b-pending-recovery".to_vec())
        .expect("pending recovery factor");

    let operational = NativeSecretBytes::new(b"phase11c2b-pending-operational".to_vec())
        .expect("pending operational factor");

    pending_recovery
        .stage_recovery_factor(&recovery)
        .expect("stage pending recovery");

    pending_operational
        .stage_operational_factor(&operational)
        .expect("stage pending operational");
}

#[test]
fn onboarding_phase11c2b_success_orders_sessions_platform_vault_and_acknowledgement() {
    let (store, session) = create_vault_and_unlock_session();

    let pending_recovery = DesktopPendingRecoverySessionStore::default();

    let pending_operational = DesktopPendingOperationalSessionStore::default();

    stage_pending_factors(&pending_recovery, &pending_operational);

    let clearer = OrderedPlatformClearer::new(
        &session,
        &pending_recovery,
        &pending_operational,
        complete_removed_review(),
    );

    let acknowledgement = TrackingAcknowledgementStore::available(&store);

    let outcome = clear_desktop_native_passport_with_platform_material_and_recovery_acknowledgement(
        &store,
        &session,
        &pending_recovery,
        &pending_operational,
        &clearer,
        &acknowledgement,
    );

    assert_eq!(
        outcome.state,
        DesktopNativePassportClearCommandState::Cleared,
    );

    assert!(outcome.operational_session_dropped,);

    assert!(outcome.pending_recovery_session_dropped,);

    assert!(outcome.pending_operational_session_dropped,);

    assert!(outcome.platform_material_clear_completed,);

    assert!(outcome.platform_material_mutated,);

    assert!(outcome.encrypted_vault_removed,);

    assert!(outcome.recovery_acknowledgement_cleared,);

    assert!(outcome.session_changed(),);

    assert_eq!(clearer.calls(), 1,);

    assert!(clearer.preconditions_met(),);

    assert_eq!(store.remove_calls(), 1,);

    assert!(!store.has_vault(),);

    assert_eq!(acknowledgement.clear_calls(), 1,);

    assert!(acknowledgement.vault_absent_when_called(),);
}

#[test]
fn onboarding_phase11c2b_partial_platform_failure_preserves_vault_for_retry() {
    let (store, session) = create_vault_and_unlock_session();

    let pending_recovery = DesktopPendingRecoverySessionStore::default();

    let pending_operational = DesktopPendingOperationalSessionStore::default();

    stage_pending_factors(&pending_recovery, &pending_operational);

    let clearer = OrderedPlatformClearer::new(
        &session,
        &pending_recovery,
        &pending_operational,
        DesktopPlatformMaterialClearReview {
            recovery_root: DesktopPlatformMaterialEntryClearState::Removed,
            device_key: DesktopPlatformMaterialEntryClearState::Failed,
        },
    );

    let acknowledgement = TrackingAcknowledgementStore::available(&store);

    let outcome = clear_desktop_native_passport_with_platform_material_and_recovery_acknowledgement(
        &store,
        &session,
        &pending_recovery,
        &pending_operational,
        &clearer,
        &acknowledgement,
    );

    assert_eq!(
        outcome.state,
        DesktopNativePassportClearCommandState::Unavailable,
    );

    assert!(outcome.session_changed(),);

    assert!(!outcome.platform_material_clear_completed,);

    assert!(outcome.platform_material_mutated,);

    assert!(!outcome.encrypted_vault_removed,);

    assert_eq!(store.remove_calls(), 0,);

    assert!(store.has_vault(),);

    assert_eq!(acknowledgement.clear_calls(), 0,);

    assert!(clearer.preconditions_met(),);
}

#[test]
fn onboarding_phase11c2b_retry_accepts_prior_absence_and_removes_preserved_vault() {
    let (store, session) = create_vault_and_unlock_session();

    let pending_recovery = DesktopPendingRecoverySessionStore::default();

    let pending_operational = DesktopPendingOperationalSessionStore::default();

    let first_clearer = OrderedPlatformClearer::new(
        &session,
        &pending_recovery,
        &pending_operational,
        DesktopPlatformMaterialClearReview {
            recovery_root: DesktopPlatformMaterialEntryClearState::Removed,
            device_key: DesktopPlatformMaterialEntryClearState::Failed,
        },
    );

    let first_acknowledgement = TrackingAcknowledgementStore::available(&store);

    let first = clear_desktop_native_passport_with_platform_material_and_recovery_acknowledgement(
        &store,
        &session,
        &pending_recovery,
        &pending_operational,
        &first_clearer,
        &first_acknowledgement,
    );

    assert_eq!(
        first.state,
        DesktopNativePassportClearCommandState::Unavailable,
    );

    assert!(store.has_vault(),);

    let retry_clearer = OrderedPlatformClearer::new(
        &session,
        &pending_recovery,
        &pending_operational,
        DesktopPlatformMaterialClearReview {
            recovery_root: DesktopPlatformMaterialEntryClearState::AlreadyAbsent,
            device_key: DesktopPlatformMaterialEntryClearState::Removed,
        },
    );

    let retry_acknowledgement = TrackingAcknowledgementStore::available(&store);

    let retry = clear_desktop_native_passport_with_platform_material_and_recovery_acknowledgement(
        &store,
        &session,
        &pending_recovery,
        &pending_operational,
        &retry_clearer,
        &retry_acknowledgement,
    );

    assert_eq!(retry.state, DesktopNativePassportClearCommandState::Cleared,);

    assert!(retry.platform_material_clear_completed,);

    assert!(retry.platform_material_mutated,);

    assert!(retry.encrypted_vault_removed,);

    assert!(!store.has_vault(),);

    assert_eq!(store.remove_calls(), 1,);

    assert_eq!(retry_acknowledgement.clear_calls(), 1,);
}

#[test]
fn onboarding_phase11c2b_stale_platform_material_is_cleared_without_a_vault() {
    let store = MemoryVaultStore::default();

    let session = DesktopOperationalVaultSessionStore::default();

    let pending_recovery = DesktopPendingRecoverySessionStore::default();

    let pending_operational = DesktopPendingOperationalSessionStore::default();

    let clearer = OrderedPlatformClearer::new(
        &session,
        &pending_recovery,
        &pending_operational,
        complete_removed_review(),
    );

    let acknowledgement = TrackingAcknowledgementStore::available(&store);

    let outcome = clear_desktop_native_passport_with_platform_material_and_recovery_acknowledgement(
        &store,
        &session,
        &pending_recovery,
        &pending_operational,
        &clearer,
        &acknowledgement,
    );

    assert_eq!(
        outcome.state,
        DesktopNativePassportClearCommandState::NoPassport,
    );

    assert!(outcome.platform_material_clear_completed,);

    assert!(outcome.platform_material_mutated,);

    assert!(!outcome.encrypted_vault_removed,);

    assert_eq!(store.remove_calls(), 1,);

    assert_eq!(acknowledgement.clear_calls(), 1,);

    assert!(acknowledgement.vault_absent_when_called(),);
}

#[test]
fn onboarding_phase11c2b_acknowledgement_failure_is_retryable_after_vault_removal() {
    let (store, session) = create_vault_and_unlock_session();

    let pending_recovery = DesktopPendingRecoverySessionStore::default();

    let pending_operational = DesktopPendingOperationalSessionStore::default();

    let first_clearer = OrderedPlatformClearer::new(
        &session,
        &pending_recovery,
        &pending_operational,
        complete_removed_review(),
    );

    let failing_acknowledgement = TrackingAcknowledgementStore::failing(&store);

    let first = clear_desktop_native_passport_with_platform_material_and_recovery_acknowledgement(
        &store,
        &session,
        &pending_recovery,
        &pending_operational,
        &first_clearer,
        &failing_acknowledgement,
    );

    assert_eq!(
        first.state,
        DesktopNativePassportClearCommandState::Unavailable,
    );

    assert!(first.platform_material_clear_completed,);

    assert!(first.encrypted_vault_removed,);

    assert!(!first.recovery_acknowledgement_cleared,);

    assert!(!store.has_vault(),);

    assert!(failing_acknowledgement.vault_absent_when_called(),);

    let retry_clearer = OrderedPlatformClearer::new(
        &session,
        &pending_recovery,
        &pending_operational,
        DesktopPlatformMaterialClearReview {
            recovery_root: DesktopPlatformMaterialEntryClearState::AlreadyAbsent,
            device_key: DesktopPlatformMaterialEntryClearState::AlreadyAbsent,
        },
    );

    let retry_acknowledgement = TrackingAcknowledgementStore::available(&store);

    let retry = clear_desktop_native_passport_with_platform_material_and_recovery_acknowledgement(
        &store,
        &session,
        &pending_recovery,
        &pending_operational,
        &retry_clearer,
        &retry_acknowledgement,
    );

    assert_eq!(
        retry.state,
        DesktopNativePassportClearCommandState::NoPassport,
    );

    assert!(retry.platform_material_clear_completed,);

    assert!(!retry.platform_material_mutated,);

    assert!(retry.recovery_acknowledgement_cleared,);
}

fn function_block<'a>(source: &'a str, name: &str) -> &'a str {
    let marker = format!("pub fn {name}");

    let start = source
        .find(&marker)
        .unwrap_or_else(|| panic!("function missing: {name}"));

    let opening = source[start..]
        .find('{')
        .map(|offset| start + offset)
        .unwrap_or_else(|| panic!("opening brace missing: {name}"));

    let mut depth = 0usize;

    for (offset, character) in source[opening..].char_indices() {
        match character {
            '{' => {
                depth += 1;
            }
            '}' => {
                depth -= 1;

                if depth == 0 {
                    return &source[start..opening + offset + 1];
                }
            }
            _ => {}
        }
    }

    panic!("closing brace missing: {name}");
}

#[test]
fn onboarding_phase11c2b_public_command_and_runtime_order_are_locked() {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));

    let runtime = fs::read_to_string(root.join("src/passport_clear_command_runtime.rs"))
        .expect("Phase 11C2B runtime source");

    let commands = fs::read_to_string(root.join("src/commands/passport.rs"))
        .expect("Phase 11C2B command source");

    let runtime_function = function_block(
        &runtime,
        "clear_desktop_native_passport_with_platform_material_and_recovery_acknowledgement",
    );

    let command_function = function_block(&commands, "passport_clear");

    let ordered_markers = [
        "session_store.lock()",
        "clear_pending_recovery_factor()",
        "clear_pending_operational_factor()",
        "clear_platform_material()",
        "remove_native_encrypted_vault(store)",
        "clear_recovery_acknowledgement()",
    ];

    let mut previous = 0usize;

    for (index, marker) in ordered_markers.iter().enumerate() {
        let position = runtime_function
            .find(marker)
            .unwrap_or_else(|| panic!("runtime ordering marker missing: {marker}"));

        if index > 0 {
            assert!(position > previous, "runtime marker out of order: {marker}",);
        }

        previous = position;
    }

    for required in [
        "passport_pending_recovery_session",
        "passport_pending_operational_session",
        "passport_platform_material_clearer",
        "passport_recovery_acknowledgement_store",
        "ONBOARDING_PHASE11C2B_PLATFORM_SECRET_CLEAR_LABEL",
        "session_changed: outcome.session_changed()",
        "outcome.encrypted_vault_removed",
        "outcome.platform_material_mutated",
    ] {
        assert!(
            command_function.contains(required),
            "public clear command missing {required}",
        );
    }

    assert_eq!(
        ONBOARDING_PHASE11C2B_PLATFORM_SECRET_CLEAR_LABEL,
        "ONBOARDING_PHASE11C2B_PLATFORM_SECRET_CLEAR",
    );

    for forbidden in [
        "pin:",
        "phrase:",
        "seed_phrase",
        "private_key",
        "secret_material_returned: true",
        "recovery_root_unsealed: true",
        "wallet_or_ledger_mutated: true",
    ] {
        assert!(
            !command_function.contains(forbidden),
            "public clear command contains forbidden {forbidden}",
        );
    }
}
