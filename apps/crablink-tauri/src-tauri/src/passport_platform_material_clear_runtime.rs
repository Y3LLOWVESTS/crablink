//! RO:WHAT — Defines the redacted desktop contract for deleting app-owned Passport platform material.
//! RO:WHY — Onboarding Phase 11 must clear platform secrets before vault removal so partial cleanup remains retryable.
//! RO:INTERACTS — platform sealer adapters, AppState, Passport clear runtime, and public redacted clear DTOs.
//! RO:INVARIANTS — both compartments are attempted independently; already absent is success; any failed compartment blocks completion.
//! RO:SECURITY — exposes state only; never exposes PIN, VMK, factor bytes, sealed references, account names, wallet, or ledger material.
//! RO:TEST — focused unit tests here and adapter tests beside each platform implementation.

use std::sync::Arc;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DesktopPlatformMaterialEntryClearState {
    Removed,
    AlreadyAbsent,
    Failed,
}

impl DesktopPlatformMaterialEntryClearState {
    pub fn succeeded(self) -> bool {
        !matches!(self, Self::Failed)
    }

    pub fn was_mutated(self) -> bool {
        matches!(self, Self::Removed)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DesktopPlatformMaterialClearReview {
    pub recovery_root: DesktopPlatformMaterialEntryClearState,
    pub device_key: DesktopPlatformMaterialEntryClearState,
}

impl DesktopPlatformMaterialClearReview {
    pub fn is_complete(self) -> bool {
        self.recovery_root.succeeded() && self.device_key.succeeded()
    }

    pub fn any_mutated(self) -> bool {
        self.recovery_root.was_mutated() || self.device_key.was_mutated()
    }
}

pub trait DesktopPlatformMaterialClearer: Send + Sync {
    fn clear_platform_material(&self) -> DesktopPlatformMaterialClearReview;
}

pub type SharedDesktopPlatformMaterialClearer = Arc<dyn DesktopPlatformMaterialClearer>;

#[derive(Debug, Default)]
pub struct AlreadyAbsentDesktopPlatformMaterialClearer;

impl DesktopPlatformMaterialClearer for AlreadyAbsentDesktopPlatformMaterialClearer {
    fn clear_platform_material(&self) -> DesktopPlatformMaterialClearReview {
        DesktopPlatformMaterialClearReview {
            recovery_root: DesktopPlatformMaterialEntryClearState::AlreadyAbsent,
            device_key: DesktopPlatformMaterialEntryClearState::AlreadyAbsent,
        }
    }
}

#[derive(Debug, Default)]
pub struct UnavailableDesktopPlatformMaterialClearer;

impl DesktopPlatformMaterialClearer for UnavailableDesktopPlatformMaterialClearer {
    fn clear_platform_material(&self) -> DesktopPlatformMaterialClearReview {
        DesktopPlatformMaterialClearReview {
            recovery_root: DesktopPlatformMaterialEntryClearState::Failed,
            device_key: DesktopPlatformMaterialEntryClearState::Failed,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn onboarding_phase11c1_platform_clear_review_is_redacted_and_truthful() {
        let complete = DesktopPlatformMaterialClearReview {
            recovery_root: DesktopPlatformMaterialEntryClearState::Removed,
            device_key: DesktopPlatformMaterialEntryClearState::AlreadyAbsent,
        };

        assert!(complete.is_complete());
        assert!(complete.any_mutated());

        let partial = DesktopPlatformMaterialClearReview {
            recovery_root: DesktopPlatformMaterialEntryClearState::Failed,
            device_key: DesktopPlatformMaterialEntryClearState::Removed,
        };

        assert!(!partial.is_complete());
        assert!(partial.any_mutated());

        let debug = format!("{complete:?}{partial:?}");

        for forbidden in [
            "recovery-root",
            "device-key",
            "com.rustyonions",
            "crablink-keychain:v1",
        ] {
            assert!(!debug.contains(forbidden));
        }
    }

    #[test]
    fn onboarding_phase11c2a_already_absent_clearer_is_complete_without_mutation() {
        let clearer = AlreadyAbsentDesktopPlatformMaterialClearer;
        let review = clearer.clear_platform_material();

        assert!(review.is_complete());
        assert!(!review.any_mutated());
        assert_eq!(
            review.recovery_root,
            DesktopPlatformMaterialEntryClearState::AlreadyAbsent,
        );
        assert_eq!(
            review.device_key,
            DesktopPlatformMaterialEntryClearState::AlreadyAbsent,
        );
    }

    #[test]
    fn onboarding_phase11c2a_unavailable_clearer_fails_closed() {
        let clearer = UnavailableDesktopPlatformMaterialClearer;
        let review = clearer.clear_platform_material();

        assert!(!review.is_complete());
        assert!(!review.any_mutated());
        assert_eq!(
            review.recovery_root,
            DesktopPlatformMaterialEntryClearState::Failed,
        );
        assert_eq!(
            review.device_key,
            DesktopPlatformMaterialEntryClearState::Failed,
        );
    }
}
