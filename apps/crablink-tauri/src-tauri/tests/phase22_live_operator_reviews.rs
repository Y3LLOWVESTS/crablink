//! RO:WHAT — Live Phase 22C moderation and persistence review against real Service Node state.
//! RO:WHY — Proves CrabLink's production review commands read and decide real runtime metadata.
//! RO:INTERACTS — Tauri review commands and macronode moderation/persistence HTTP routes.
//! RO:INVARIANTS — exact B3; bounded queues; explicit decisions; metadata-only, non-economic results.
//! RO:TEST — scripts/check-phase22-local-operator-reviews.sh.

use crablink_tauri_lib::phase22_test_support::{
    service_node_operator_moderation_decide, service_node_operator_moderation_pending,
    service_node_operator_persistence_decide, service_node_operator_persistence_pending,
    ServiceNodeModerationDecisionRequest, ServiceNodeModerationPendingRequest,
    ServiceNodePersistenceDecisionRequest, ServiceNodePersistencePendingRequest,
};
use reqwest::Client;
use serde::Serialize;
use serde_json::{json, Value};
use std::time::Duration;

const MODERATION_APPROVE_OBJECT: &str =
    "b3:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

const MODERATION_REJECT_OBJECT: &str =
    "b3:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

const PERSISTENCE_APPROVE_OBJECT: &str =
    "b3:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";

const PERSISTENCE_REJECT_OBJECT: &str =
    "b3:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd";

fn required_env(name: &str) -> String {
    std::env::var(name)
        .unwrap_or_else(|_| panic!("{name} must be supplied by the Phase 22C runner"))
}

fn moderation_pending_request(base_url: &str, token: &str) -> ServiceNodeModerationPendingRequest {
    ServiceNodeModerationPendingRequest {
        enabled: true,
        connection_mode: "local".to_string(),
        base_url: base_url.to_string(),
        admin_token: token.to_string(),
        limit: Some(8),
    }
}

fn moderation_decision_request(
    base_url: &str,
    token: &str,
    sequence: u64,
    action: &str,
) -> ServiceNodeModerationDecisionRequest {
    ServiceNodeModerationDecisionRequest {
        enabled: true,
        connection_mode: "local".to_string(),
        base_url: base_url.to_string(),
        admin_token: token.to_string(),
        sequence,
        action: action.to_string(),
    }
}

fn persistence_pending_request(
    base_url: &str,
    token: &str,
) -> ServiceNodePersistencePendingRequest {
    ServiceNodePersistencePendingRequest {
        enabled: true,
        connection_mode: "local".to_string(),
        base_url: base_url.to_string(),
        admin_token: token.to_string(),
        limit: Some(8),
    }
}

fn persistence_decision_request(
    base_url: &str,
    token: &str,
    object: &str,
    action: &str,
) -> ServiceNodePersistenceDecisionRequest {
    ServiceNodePersistenceDecisionRequest {
        enabled: true,
        connection_mode: "local".to_string(),
        base_url: base_url.to_string(),
        admin_token: token.to_string(),
        object: object.to_string(),
        action: action.to_string(),
    }
}

fn as_value(value: impl Serialize) -> Value {
    serde_json::to_value(value).expect("Phase 22C command result JSON")
}

fn assert_false_fields(value: &Value, fields: &[&str]) {
    for field in fields {
        assert_eq!(value[*field], false, "{field} must remain false",);
    }
}

fn moderation_sequence(queue: &Value, object: &str) -> u64 {
    queue["items"]
        .as_array()
        .expect("moderation items array")
        .iter()
        .find(|item| item["object"] == object)
        .and_then(|item| item["sequence"].as_u64())
        .unwrap_or_else(|| panic!("moderation queue did not contain {object}"))
}

async fn seed_json(client: &Client, base_url: &str, token: &str, path: &str, body: Value) -> Value {
    let response = client
        .post(format!("{}{path}", base_url.trim_end_matches('/'),))
        .bearer_auth(token)
        .json(&body)
        .send()
        .await
        .expect("Phase 22C seed request");

    let status = response.status();

    let bytes = response.bytes().await.expect("Phase 22C seed response");

    assert!(
        status.is_success(),
        "seed request failed with HTTP {status}: {}",
        String::from_utf8_lossy(&bytes),
    );

    serde_json::from_slice(&bytes).expect("Phase 22C seed JSON")
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
#[ignore = "live cross-repository Phase 22C smoke"]
async fn phase22_crablink_reviews_real_runtime_metadata() {
    let base_url = required_env("PHASE22_SERVICE_NODE_URL");

    let admin_token = required_env("PHASE22_ADMIN_TOKEN");

    let client = Client::builder()
        .connect_timeout(Duration::from_secs(3))
        .timeout(Duration::from_secs(8))
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .expect("Phase 22C seed client");

    let wrong_moderation = service_node_operator_moderation_pending(moderation_pending_request(
        &base_url,
        "wrong-phase22-admin-token",
    ))
    .await
    .expect_err("wrong moderation credential must reject");

    assert!(
        wrong_moderation.contains("HTTP 401"),
        "unexpected moderation error: {wrong_moderation}",
    );

    for object in [MODERATION_APPROVE_OBJECT, MODERATION_REJECT_OBJECT] {
        let seeded = seed_json(
            &client,
            &base_url,
            &admin_token,
            "/api/v1/moderation/review/submit",
            json!({
                "object": object,
                "source": "operator_report",
                "reason": "abuse_report",
            }),
        )
        .await;

        assert_eq!(seeded["candidate"]["object"], object,);

        assert_eq!(seeded["candidate"]["state"], "pending_review",);

        assert_false_fields(
            &seeded,
            &[
                "policyMutation",
                "runtimeActivation",
                "storageDelete",
                "providerWithdrawal",
                "rewardFinality",
                "walletMutation",
                "ledgerMutation",
            ],
        );
    }

    let moderation_queue = as_value(
        service_node_operator_moderation_pending(moderation_pending_request(
            &base_url,
            &admin_token,
        ))
        .await
        .expect("live moderation queue"),
    );

    assert_eq!(moderation_queue["count"], 2);

    let approve_sequence = moderation_sequence(&moderation_queue, MODERATION_APPROVE_OBJECT);

    let reject_sequence = moderation_sequence(&moderation_queue, MODERATION_REJECT_OBJECT);

    let approved = as_value(
        service_node_operator_moderation_decide(moderation_decision_request(
            &base_url,
            &admin_token,
            approve_sequence,
            "approve",
        ))
        .await
        .expect("live moderation approval"),
    );

    assert_eq!(approved["action"], "approve_for_escalation",);

    assert_eq!(approved["candidate"]["state"], "approved_for_escalation",);

    assert_false_fields(
        &approved,
        &[
            "policyMutation",
            "runtimeActivation",
            "storageDelete",
            "providerWithdrawal",
            "rewardFinality",
            "walletMutation",
            "ledgerMutation",
        ],
    );

    let rejected = as_value(
        service_node_operator_moderation_decide(moderation_decision_request(
            &base_url,
            &admin_token,
            reject_sequence,
            "reject",
        ))
        .await
        .expect("live moderation rejection"),
    );

    assert_eq!(rejected["candidate"]["state"], "rejected",);

    assert_false_fields(
        &rejected,
        &[
            "policyMutation",
            "runtimeActivation",
            "storageDelete",
            "providerWithdrawal",
            "rewardFinality",
            "walletMutation",
            "ledgerMutation",
        ],
    );

    let final_moderation = as_value(
        service_node_operator_moderation_pending(moderation_pending_request(
            &base_url,
            &admin_token,
        ))
        .await
        .expect("final moderation queue"),
    );

    assert_eq!(final_moderation["count"], 0);
    assert_eq!(final_moderation["items"], json!([]));

    let wrong_persistence = service_node_operator_persistence_pending(persistence_pending_request(
        &base_url,
        "wrong-phase22-admin-token",
    ))
    .await
    .expect_err("wrong persistence credential must reject");

    assert!(
        wrong_persistence.contains("HTTP 401"),
        "unexpected persistence error: {wrong_persistence}",
    );

    for object in [PERSISTENCE_APPROVE_OBJECT, PERSISTENCE_REJECT_OBJECT] {
        let registered = seed_json(
            &client,
            &base_url,
            &admin_token,
            "/api/v1/persistence/register",
            json!({
                "object": object,
                "assetKind": "image",
            }),
        )
        .await;

        assert_eq!(registered["candidate"]["object"], object,);

        assert_eq!(registered["candidate"]["state"], "ephemeral_unvetted",);

        assert_eq!(registered["candidate"]["durableStorageEligible"], false,);

        assert_false_fields(
            &registered,
            &["durableBytesWritten", "walletMutation", "ledgerMutation"],
        );
    }

    let persistence_queue = as_value(
        service_node_operator_persistence_pending(persistence_pending_request(
            &base_url,
            &admin_token,
        ))
        .await
        .expect("live persistence queue"),
    );

    assert_eq!(persistence_queue["count"], 2);

    for (object, decision, final_state, eligible) in [
        (
            PERSISTENCE_APPROVE_OBJECT,
            "approve",
            "verified_persistent",
            true,
        ),
        (
            PERSISTENCE_REJECT_OBJECT,
            "reject",
            "operator_blocked",
            false,
        ),
    ] {
        let submitted = as_value(
            service_node_operator_persistence_decide(persistence_decision_request(
                &base_url,
                &admin_token,
                object,
                "submit",
            ))
            .await
            .expect("live persistence submission"),
        );

        assert_eq!(submitted["candidate"]["state"], "pending_review",);

        assert_eq!(submitted["candidate"]["durableStorageEligible"], false,);

        assert_false_fields(
            &submitted,
            &[
                "durableBytesWritten",
                "walletMutation",
                "ledgerMutation",
                "policyMutation",
                "runtimeActivation",
                "storageDelete",
                "providerWithdrawal",
                "rewardFinality",
                "externalFinality",
            ],
        );

        let decided = as_value(
            service_node_operator_persistence_decide(persistence_decision_request(
                &base_url,
                &admin_token,
                object,
                decision,
            ))
            .await
            .expect("live persistence decision"),
        );

        assert_eq!(decided["candidate"]["state"], final_state,);

        assert_eq!(decided["candidate"]["durableStorageEligible"], eligible,);

        assert_false_fields(
            &decided,
            &[
                "durableBytesWritten",
                "walletMutation",
                "ledgerMutation",
                "policyMutation",
                "runtimeActivation",
                "storageDelete",
                "providerWithdrawal",
                "rewardFinality",
                "externalFinality",
            ],
        );
    }

    let final_persistence = as_value(
        service_node_operator_persistence_pending(persistence_pending_request(
            &base_url,
            &admin_token,
        ))
        .await
        .expect("final persistence queue"),
    );

    assert_eq!(final_persistence["count"], 0);
    assert_eq!(final_persistence["items"], json!([]));

    println!(
        "Phase 22C passed: CrabLink read and decided live moderation and persistence metadata without creating policy, durability, provider, economic, or finality authority."
    );
}
