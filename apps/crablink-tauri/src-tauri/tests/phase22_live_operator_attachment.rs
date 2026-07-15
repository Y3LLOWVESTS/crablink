//! RO:WHAT — Live Phase 22 proof that CrabLink's native Operator bridge attaches to an independent Service Node.
//! RO:WHY — Proves the real Tauri status and signed-binding code against real macronode HTTP behavior.
//! RO:INTERACTS — operator_node, operator_reward_binding, macronode status/auth/reward-binding routes.
//! RO:INVARIANTS — explicit local mode; ephemeral credential; no daemon start; no registry/wallet/ledger/finality claim.
//! RO:TEST — run through scripts/check-phase22-local-operator-attachment.sh.

use crablink_tauri_lib::phase22_test_support::{
    query_service_node_operator_status, submit_service_node_reward_binding,
    ServiceNodeOperatorRequest, ServiceNodeRewardBindingRequest,
};

const REWARD_RECIPIENT: &str = "@operator";

fn required_env(name: &str) -> String {
    std::env::var(name).unwrap_or_else(|_| panic!("{name} must be supplied by the Phase 22 runner"))
}

fn status_request(base_url: &str, admin_token: &str) -> ServiceNodeOperatorRequest {
    ServiceNodeOperatorRequest {
        enabled: Some(true),
        connection_mode: Some("local".to_string()),
        base_url: Some(base_url.to_string()),
        admin_token: Some(admin_token.to_string()),
    }
}

fn binding_request(base_url: &str, admin_token: &str) -> ServiceNodeRewardBindingRequest {
    ServiceNodeRewardBindingRequest {
        enabled: true,
        connection_mode: "local".to_string(),
        base_url: base_url.to_string(),
        admin_token: admin_token.to_string(),
        reward_recipient_display_address: REWARD_RECIPIENT.to_string(),
    }
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
#[ignore = "live cross-repository Phase 22 smoke"]
async fn phase22_crablink_attaches_and_submits_signed_binding() {
    let base_url = required_env("PHASE22_SERVICE_NODE_URL");

    let admin_token = required_env("PHASE22_ADMIN_TOKEN");

    let http = reqwest::Client::new();

    let attached = query_service_node_operator_status(
        http.clone(),
        5_000,
        Some(status_request(&base_url, &admin_token)),
    )
    .await
    .expect("CrabLink Operator status must attach to live macronode");

    assert_eq!(attached.connection_state, "connected");

    assert!(attached.health.ok);
    assert!(attached.ready.ok);
    assert!(attached.status.ok);
    assert!(attached.credential_supplied);
    assert!(!attached.credential_persisted);
    assert!(attached.read_only);
    assert!(!attached.mutation_routes_exposed);
    assert!(!attached.client_required_by_daemon);
    assert!(!attached.daemon_started_by_client);
    assert!(!attached.policy_mutation);
    assert!(!attached.lifecycle_mutation);
    assert!(!attached.wallet_mutation);
    assert!(!attached.ledger_mutation);
    assert!(!attached.registry_mutation);
    assert!(!attached.quorum_mutation);
    assert!(!attached.finality_authority);

    let service_node = attached
        .service_node
        .expect("connected status must contain canonical Service Node projection");

    assert_eq!(service_node.profile, "macronode");
    assert_eq!(service_node.node_role, "service_node");

    assert!(service_node.ready);
    assert!(service_node.headless_mode);

    assert!(!service_node.admin_ui_runtime_required);

    assert!(!service_node.public_inbound_enabled);

    assert_eq!(
        service_node.user_ip_publication,
        "not_applicable_service_node",
    );

    assert!(!service_node.ledger_receipt_reported);

    assert!(!service_node.confirmed_roc_reported);

    assert!(service_node.confirmed_issuance_evidence.is_none());

    assert!(!service_node.external_finality_reported);

    assert!(!service_node.operator_projection_authorizes_state_change);

    assert!(!service_node.operator_projection_authorizes_economic_mutation);

    let unauthorized =
        submit_service_node_reward_binding(binding_request(&base_url, "wrong-phase22-admin-token"))
            .await
            .expect_err("wrong administrator credential must be rejected");

    assert!(
        unauthorized.contains("HTTP 401"),
        "unexpected unauthorized error: {unauthorized}",
    );

    let binding = submit_service_node_reward_binding(binding_request(&base_url, &admin_token))
        .await
        .expect("CrabLink signed binding must be accepted by live macronode");

    assert_eq!(binding.state, "bound");

    assert_eq!(
        binding.reward_recipient_display_address.as_deref(),
        Some(REWARD_RECIPIENT),
    );

    assert!(binding.signed_intent_verified);

    assert_eq!(
        binding.intent_signer_kind.as_deref(),
        Some("admin_bearer_blake3_keyed_v1"),
    );

    assert!(!binding.registry_finality);
    assert!(!binding.wallet_mutation);
    assert!(!binding.ledger_mutation);
    assert!(binding.confirmed_roc.is_none());

    let refreshed = query_service_node_operator_status(
        http,
        5_000,
        Some(status_request(&base_url, &admin_token)),
    )
    .await
    .expect("CrabLink Operator status must refresh after binding");

    let refreshed_node = refreshed
        .service_node
        .expect("refreshed status must contain canonical Service Node projection");

    assert_eq!(refreshed_node.reward_binding_state, "bound",);

    assert_eq!(
        refreshed_node.reward_recipient_display_address.as_deref(),
        Some(REWARD_RECIPIENT),
    );

    assert!(!refreshed_node.ledger_receipt_reported);

    assert!(!refreshed_node.confirmed_roc_reported);

    assert!(refreshed_node.confirmed_issuance_evidence.is_none());

    println!(
        "Phase 22B passed: CrabLink attached to the independent Service Node and submitted a verified signed reward binding without creating economic authority."
    );
}
