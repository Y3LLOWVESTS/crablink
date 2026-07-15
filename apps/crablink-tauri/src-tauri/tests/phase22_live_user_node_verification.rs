//! RO:WHAT — Live Phase 22E2 Service Node → CrabLink → User Node verification proof.
//! RO:WHY — Proves authenticated OAP bytes become canonical pending micronode evidence.
//! RO:INTERACTS — CrabLink OAP bridge, macronode storage route, micronode verification queue.
//! RO:INVARIANTS — valid/mismatch/replay are distinct; pending evidence only; no economic authority.
//! RO:TEST — scripts/check-phase22-local-user-node-verification.sh.

use crablink_tauri_lib::phase22_test_support::{
    submit_user_node_object_verification, verify_service_object_with_user_node,
    UserNodeVerificationRequest, UserNodeVerificationSubmission,
};
use reqwest::Client;
use serde_json::Value;
use std::time::Duration;

const SEED_CID: &str = "b3:6437b3ac38465133ffb63b75273a8db548c558465d79db03fd359c6cd5bd9d85";

fn required_env(name: &str) -> String {
    std::env::var(name)
        .unwrap_or_else(|_| panic!("{name} must be supplied by the Phase 22E2 runner"))
}

fn assert_non_authority(value: &Value) {
    for field in [
        "accountingAccepted",
        "rewardEligible",
        "rewardTruth",
        "payoutAuthority",
        "walletMutation",
        "ledgerMutation",
    ] {
        assert_eq!(value[field], false, "{field} must remain false",);
    }

    assert_eq!(value["confirmedRocMinorUnits"], Value::Null,);

    for field in [
        "accounting_accepted",
        "reward_eligible",
        "reward_truth",
        "payout_authority",
        "wallet_mutation",
        "ledger_mutation",
    ] {
        assert_eq!(
            value["evidence"][field], false,
            "evidence.{field} must remain false",
        );
    }

    assert_eq!(value["evidence"]["evidence_only"], true,);
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
#[ignore = "live cross-repository Phase 22E2 smoke"]
async fn phase22_service_object_becomes_pending_user_node_evidence() {
    let service_node_url = required_env("PHASE22_SERVICE_NODE_URL");

    let storage_url = required_env("PHASE22_STORAGE_URL");

    let user_node_url = required_env("PHASE22_USER_NODE_URL");

    let client = Client::builder()
        .timeout(Duration::from_secs(8))
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .expect("Phase 22E2 client");

    let result = verify_service_object_with_user_node(
        client.clone(),
        5_000,
        UserNodeVerificationRequest {
            enabled: true,
            connection_mode: "local".to_string(),

            storage_base_url: storage_url,
            user_node_base_url: user_node_url.clone(),

            object: SEED_CID.to_string(),

            max_bytes: Some(1024),

            observed_at_ms: 1_700_000_000_001,

            nonce: "phase22e2-valid-nonce".to_string(),

            idempotency_key: "phase22e2-valid".to_string(),

            privacy_route_id: "relay:phase22e2".to_string(),
        },
    )
    .await
    .expect("authenticated OAP bytes must create pending User Node evidence");

    assert_eq!(result.object, SEED_CID,);

    assert_eq!(result.bytes, 3);

    assert!(result.service_node_bytes_verified);

    assert!(result.user_node_evidence_pending);

    assert_eq!(result.oap.body_bytes, b"abc",);

    assert_eq!(result.verification["fullDigestVerified"], true,);

    assert_eq!(result.verification["challengeRaised"], false,);

    assert_eq!(result.verification["evidence"]["result"], "verified_valid",);

    assert_non_authority(&result.verification);

    assert!(!result.accounting_accepted);

    assert!(!result.reward_eligible);

    assert!(!result.reward_truth);

    assert!(!result.payout_authority);

    assert!(!result.wallet_mutation);

    assert!(!result.ledger_mutation);

    assert!(result.receipt.is_none());

    assert!(result.confirmed_roc_minor_units.is_none());

    let challenge = submit_user_node_object_verification(
        client.clone(),
        5_000,
        UserNodeVerificationSubmission {
            user_node_base_url: user_node_url.clone(),

            object: SEED_CID.to_string(),

            bytes: b"abd".to_vec(),

            observed_at_ms: 1_700_000_000_002,

            nonce: "phase22e2-challenge-nonce".to_string(),

            idempotency_key: "phase22e2-challenge".to_string(),

            privacy_route_id: "relay:phase22e2".to_string(),
        },
    )
    .await
    .expect("digest mismatch must create challenge evidence");

    assert_eq!(challenge["fullDigestVerified"], false,);

    assert_eq!(challenge["challengeRaised"], true,);

    assert_eq!(challenge["evidence"]["result"], "challenge_raised",);

    assert_eq!(challenge["evidence"]["failure_reason"], "digest_mismatch",);

    assert_non_authority(&challenge);

    let replay_error = submit_user_node_object_verification(
        client.clone(),
        5_000,
        UserNodeVerificationSubmission {
            user_node_base_url: user_node_url.clone(),

            object: SEED_CID.to_string(),

            bytes: b"abd".to_vec(),

            observed_at_ms: 1_700_000_000_003,

            nonce: "phase22e2-replay-nonce".to_string(),

            idempotency_key: "phase22e2-challenge".to_string(),

            privacy_route_id: "relay:phase22e2".to_string(),
        },
    )
    .await
    .expect_err("duplicate idempotency key must reject");

    assert!(
        replay_error.contains("HTTP 409"),
        "unexpected replay error: {replay_error}",
    );

    assert!(
        replay_error.contains("duplicate_idempotency_key"),
        "replay error lost duplicate taxonomy: {replay_error}",
    );

    let pending: Value = client
        .get(format!(
            "{user_node_url}/api/v1/verification/pending?limit=8"
        ))
        .send()
        .await
        .expect("pending queue request")
        .error_for_status()
        .expect("pending queue success")
        .json()
        .await
        .expect("pending queue JSON");

    assert_eq!(pending["count"], 2);

    assert_eq!(pending["items"].as_array().expect("pending items").len(), 2,);

    assert_eq!(pending["evidenceOnly"], true,);

    assert_eq!(pending["accountingAccepted"], false,);

    assert_eq!(pending["rewardEligible"], false,);

    assert_eq!(pending["rewardTruth"], false,);

    assert_eq!(pending["payoutAuthority"], false,);

    assert_eq!(pending["walletMutation"], false,);

    assert_eq!(pending["ledgerMutation"], false,);

    assert_eq!(pending["confirmedRocMinorUnits"], Value::Null,);

    let user_status: Value = client
        .get(format!("{user_node_url}/api/v1/status"))
        .send()
        .await
        .expect("User Node status request")
        .error_for_status()
        .expect("User Node status success")
        .json()
        .await
        .expect("User Node status JSON");

    assert_eq!(
        user_status["passive_runtime"]["verification_queue"]["status"],
        "active",
    );

    assert_eq!(
        user_status["passive_runtime"]["verification_queue"]["pending_items"],
        2,
    );

    assert_eq!(
        user_status["passive_runtime"]["confirmed_roc_minor_units"],
        Value::Null,
    );

    let service_status: Value = client
        .get(format!("{service_node_url}/api/v1/status"))
        .send()
        .await
        .expect("Service Node status request")
        .error_for_status()
        .expect("Service Node status success")
        .json()
        .await
        .expect("Service Node status JSON");

    assert_eq!(service_status["wallet_execution_participant"], false,);

    assert_eq!(service_status["ledger_replay_enabled"], false,);

    assert_eq!(service_status["service_quorum_enabled"], false,);

    match service_status.get("economic_pipeline") {
        None | Some(Value::Null) => {
            // No economic projection means the Service Node reported no
            // wallet execution, ledger receipt, confirmed ROC, or finality.
        }
        Some(pipeline) => {
            assert_eq!(pipeline["wallet_execution_reported"], false,);

            assert_eq!(pipeline["ledger_receipt_reported"], false,);

            assert_eq!(pipeline["confirmed_roc_reported"], false,);

            assert_eq!(pipeline["finality_reported"], false,);

            assert_eq!(
                pipeline["operator_projection_authorizes_economic_mutation"],
                false,
            );

            assert_eq!(pipeline["epoch_payout_receipts"], Value::Null,);
        }
    }

    println!(
        "Phase 22E2 passed: CrabLink admitted the real Service Node object by full BLAKE3, created valid and challenge pending evidence in the real User Node, rejected replay, and created no accounting, reward, wallet, ledger, receipt, or confirmed-ROC authority."
    );
}
