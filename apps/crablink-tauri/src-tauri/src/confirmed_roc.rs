//! RO:WHAT — Desktop compatibility surface for shared confirmed-ROC validation.
//! RO:WHY — Phase 22 imports remain stable while the pure rules live in crablink-native-core.
//! RO:INTERACTS — crablink_native_core and phase22_test_support.
//! RO:INVARIANTS — re-export only; no duplicate validation or Tauri authority.
//! RO:SECURITY — no wallet/ledger mutation, receipt creation, or finality authority.
//! RO:TEST — tests/phase22_confirmed_roc_projection.rs.

pub use crablink_native_core::confirmed_roc::{
    parse_confirmed_roc_projection, ConfirmedRocProjectionV1, CONFIRMED_ROC_PROJECTION_SCHEMA,
    CONFIRMED_ROC_PROJECTION_VERSION,
};
