//! RO:WHAT — Live Phase 22 lifecycle and degradation-isolation proof.
//! RO:WHY — Proves CrabLink observes independently managed nodes and degrades only the unavailable surface.
//! RO:INTERACTS — production local_node and operator_node status helpers, independently running macronode/micronode.
//! RO:INVARIANTS — client exit owns neither daemon; node loss is isolated; no pending evidence becomes confirmed ROC.
//! RO:TEST — scripts/check-phase22-local-lifecycle-isolation.sh.

use crablink_tauri_lib::phase22_test_support::{
    query_local_node_status, query_service_node_operator_status, LocalNodeRequest, LocalNodeStatus,
    ServiceNodeOperatorRequest, ServiceNodeOperatorStatus,
};
use reqwest::Client;
use std::time::Duration;

fn required_env(name: &str) -> String {
    std::env::var(name)
        .unwrap_or_else(|_| panic!("{name} must be supplied by the Phase 22F runner"))
}

fn client() -> Client {
    Client::builder()
        .timeout(Duration::from_secs(3))
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .expect("Phase 22F HTTP client")
}

fn service_request(base_url: &str, admin_token: &str) -> ServiceNodeOperatorRequest {
    ServiceNodeOperatorRequest {
        enabled: Some(true),
        connection_mode: Some("local".to_string()),
        base_url: Some(base_url.to_string()),
        admin_token: Some(admin_token.to_string()),
    }
}

fn user_request(base_url: &str) -> LocalNodeRequest {
    LocalNodeRequest {
        enabled: Some(true),
        base_url: Some(base_url.to_string()),
    }
}

async fn service_status(http: Client) -> ServiceNodeOperatorStatus {
    let base_url = required_env("PHASE22_SERVICE_NODE_URL");

    let admin_token = required_env("PHASE22_ADMIN_TOKEN");

    query_service_node_operator_status(http, 750, Some(service_request(&base_url, &admin_token)))
        .await
        .expect("Service Node status projection")
}

async fn user_status(http: Client) -> LocalNodeStatus {
    let base_url = required_env("PHASE22_USER_NODE_URL");

    query_local_node_status(http, 750, Some(user_request(&base_url)))
        .await
        .expect("User Node status projection")
}

fn assert_operator_non_authority(status: &ServiceNodeOperatorStatus) {
    assert!(status.read_only);

    assert!(!status.mutation_routes_exposed);

    assert!(!status.client_required_by_daemon);

    assert!(!status.daemon_started_by_client);

    assert!(!status.policy_mutation);
    assert!(!status.lifecycle_mutation);
    assert!(!status.wallet_mutation);
    assert!(!status.ledger_mutation);
    assert!(!status.registry_mutation);
    assert!(!status.quorum_mutation);
    assert!(!status.finality_authority);
}

fn assert_user_non_authority(status: &LocalNodeStatus) {
    assert!(!status.supervisor_enabled);
    assert!(!status.sidecar_enabled);

    assert!(!status.start_supported);
    assert!(!status.stop_supported);
    assert!(!status.restart_supported);

    assert!(!status.action_accepted);

    assert!(!status.wallet_mutation);
    assert!(!status.ledger_mutation);

    assert!(!status.wallet_execution_participant);

    assert!(!status.ledger_replay_enabled);

    assert!(status.confirmed_roc_minor_units.is_none());

    assert_eq!(status.confirmed_roc_source, "wallet_ledger_receipt_only",);
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
#[ignore = "live cross-repository Phase 22F smoke"]
async fn phase22_client_exit_leaves_both_nodes_independent() {
    let http = client();

    let service = service_status(http.clone()).await;

    assert_eq!(service.connection_state, "connected",);

    assert!(service.health.ok);
    assert!(service.ready.ok);
    assert!(service.status.ok);

    let service_node = service
        .service_node
        .as_ref()
        .expect("connected Operator status must project the Service Node");

    assert_eq!(service_node.node_role, "service_node",);

    assert!(service_node.headless_mode);

    assert!(!service_node.admin_ui_runtime_required);

    assert_operator_non_authority(&service);

    let user = user_status(http).await;

    assert_eq!(user.lifecycle_state, "active",);

    assert!(user.health.as_ref().is_some_and(|probe| probe.ok));

    assert!(user.ready.as_ref().is_some_and(|probe| probe.ok));

    assert!(user.node_status.is_some());
    assert!(user.privacy_mode);

    assert!(!user.public_inbound_enabled);

    assert_eq!(user.peer_ip_display, "forbidden",);

    assert!(user.verification_enabled);

    assert_eq!(user.verification_queue_status, "active",);

    assert!(!user.content_serving_enabled);

    assert_user_non_authority(&user);

    println!(
        "Phase 22F stage 1 passed: CrabLink attached to both independently managed nodes without gaining lifecycle or economic authority."
    );
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
#[ignore = "live cross-repository Phase 22F smoke"]
async fn phase22_service_node_loss_degrades_only_operator_surface() {
    let http = client();

    let service = service_status(http.clone()).await;

    assert_eq!(service.connection_state, "unavailable",);

    assert!(!service.health.ok);
    assert!(!service.ready.ok);
    assert!(!service.status.ok);

    assert!(service.service_node.is_none());

    assert_operator_non_authority(&service);

    let user = user_status(http).await;

    assert_eq!(user.lifecycle_state, "active",);

    assert!(user.health.as_ref().is_some_and(|probe| probe.ok));

    assert!(user.node_status.is_some());

    assert_eq!(user.verification_queue_status, "active",);

    assert_user_non_authority(&user);

    println!(
        "Phase 22F stage 2 passed: Service Node loss degraded only Operator status while the User Node remained healthy and non-authoritative."
    );
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
#[ignore = "live cross-repository Phase 22F smoke"]
async fn phase22_user_node_loss_degrades_only_user_surface() {
    let http = client();

    let service = service_status(http.clone()).await;

    assert_eq!(service.connection_state, "connected",);

    assert!(service.health.ok);
    assert!(service.ready.ok);
    assert!(service.status.ok);

    assert!(service.service_node.is_some());

    assert_operator_non_authority(&service);

    let user = user_status(http).await;

    assert_eq!(user.lifecycle_state, "degraded",);

    assert!(user.health.is_none());
    assert!(user.ready.is_none());

    assert!(user.node_status.is_none());

    assert_eq!(user.pending_evidence_items, 0,);

    assert_user_non_authority(&user);

    println!(
        "Phase 22F stage 3 passed: User Node loss degraded only User Node status while the Service Node remained connected and independently managed."
    );
}
