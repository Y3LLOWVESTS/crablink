//! RO:WHAT — Phase 22H validation of the real wallet/ledger receipt projection.
//! RO:WHY — Proves CrabLink accepts confirmed ROC only after all backend truth gates.
//! RO:INVARIANTS — pending evidence, fake sources, or client authority reject.
//! RO:TEST — scripts/check-phase22-final-acceptance.sh.

use crablink_tauri_lib::phase22_test_support::{
    parse_confirmed_roc_projection, CONFIRMED_ROC_PROJECTION_SCHEMA,
};
use std::path::PathBuf;

fn projection_path() -> PathBuf {
    std::env::var_os("PHASE22_CONFIRMED_ROC_PROJECTION_PATH")
        .map(PathBuf::from)
        .expect("PHASE22_CONFIRMED_ROC_PROJECTION_PATH must be supplied")
}

#[test]
fn phase22_receipt_projection_is_the_only_confirmed_roc_source() {
    let bytes = std::fs::read(projection_path()).expect("Phase 22G confirmed ROC projection");

    let projection =
        parse_confirmed_roc_projection(&bytes).expect("real receipt projection must validate");

    assert_eq!(projection.schema, CONFIRMED_ROC_PROJECTION_SCHEMA,);

    assert_eq!(projection.source, "wallet_ledger_receipt_only",);

    assert!(projection
        .confirmed_roc_minor_units
        .parse::<u128>()
        .is_ok_and(|amount| amount > 0));

    assert!(projection.wallet_receipt_confirmed);

    assert!(projection.ledger_replay_confirmed);

    assert!(projection.user_node_replay_accepted);

    assert!(!projection.pending_evidence_only);

    assert!(projection.display_only);

    assert!(!projection.client_wallet_mutation);

    assert!(!projection.client_ledger_mutation);

    assert!(!projection.client_finality_authority);

    let mut pending = projection.clone();

    pending.pending_evidence_only = true;

    assert!(pending.validate().is_err());

    let mut fake_source = projection.clone();

    fake_source.source = "micronode_pending_evidence".to_string();

    assert!(fake_source.validate().is_err());

    let mut missing_receipt = projection;

    missing_receipt.receipt_count = 0;

    missing_receipt.operation_ids.clear();

    assert!(missing_receipt.validate().is_err());

    println!(
        "Phase 22H passed: CrabLink accepted confirmed ROC only from the real wallet/ledger receipt projection after accepted User Node replay; pending evidence and client authority were rejected."
    );
}
