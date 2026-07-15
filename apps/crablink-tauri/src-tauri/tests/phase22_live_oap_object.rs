//! RO:WHAT — Live Phase 22D proof for CrabLink native OAP retrieval.
//! RO:WHY — Fetches the real Service Node seeded object and rejects corrupted copies of the live OAP stream.
//! RO:INTERACTS — CrabLink OAP command, macronode, embedded svc-storage, micronode lifecycle.
//! RO:INVARIANTS — full BLAKE3 before admission; no policy, persistence, provider, reward, wallet, or ledger mutation.
//! RO:TEST — scripts/check-phase22-local-oap-object.sh.

use crablink_tauri_lib::phase22_test_support::{
    build_oap_obj_get_request_wire, fetch_service_node_oap_object, verify_oap_object_stream,
    ServiceNodeOapObjectFetchRequest,
};
use reqwest::Client;
use serde_json::Value;

const SEED_BYTES: &[u8] = b"abc";

const SEED_CID: &str = "b3:6437b3ac38465133ffb63b75273a8db548c558465d79db03fd359c6cd5bd9d85";

fn required_env(name: &str) -> String {
    std::env::var(name).unwrap_or_else(|_| {
        panic!(
            "{name} must be supplied by \
                 the Phase 22D runner"
        )
    })
}

fn find_subsequence(haystack: &[u8], needle: &[u8]) -> Option<usize> {
    haystack
        .windows(needle.len())
        .position(|window| window == needle)
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
#[ignore = "live cross-repository Phase 22D smoke"]
async fn phase22_crablink_fetches_and_verifies_live_oap_object() {
    let admin_base = required_env("PHASE22_SERVICE_NODE_URL");

    let storage_base = required_env("PHASE22_STORAGE_URL");

    let client = Client::new();

    let status: Value = client
        .get(format!("{admin_base}/api/v1/status"))
        .send()
        .await
        .expect("Service Node status request")
        .error_for_status()
        .expect("Service Node status success")
        .json()
        .await
        .expect("Service Node status JSON");

    assert_eq!(status["oap"]["protocol"], "oap/1",);

    assert_eq!(status["oap"]["object_fetch_active"], true,);

    assert_eq!(status["oap"]["full_digest_verification_active"], true,);

    let fetched = fetch_service_node_oap_object(
        client.clone(),
        5_000,
        ServiceNodeOapObjectFetchRequest {
            enabled: true,
            connection_mode: "local".to_string(),
            storage_base_url: storage_base.clone(),
            object: SEED_CID.to_string(),
            max_bytes: Some(1024),
        },
    )
    .await
    .expect("CrabLink native OAP fetch");

    assert_eq!(fetched.protocol, "oap/1",);

    assert_eq!(fetched.route, "/oap/obj-get",);

    assert_eq!(fetched.object, SEED_CID,);

    assert_eq!(fetched.body_bytes, SEED_BYTES,);

    assert_eq!(fetched.bytes, 3);

    assert_eq!(fetched.calculated_cid, SEED_CID,);

    assert!(fetched.full_digest_verified);

    assert_eq!(fetched.frame_limit_bytes, 1024 * 1024,);

    assert_eq!(fetched.chunk_limit_bytes, 64 * 1024,);

    assert!(!fetched.policy_mutation);

    assert!(!fetched.persistence_mutation);

    assert!(!fetched.provider_mutation);

    assert!(!fetched.reward_finality);

    assert!(!fetched.wallet_mutation);

    assert!(!fetched.ledger_mutation);

    assert!(fetched.confirmed_roc.is_none());

    let tenant_id = 0x22D_u128;
    let corr_id = 0x22D_u64;

    let request_wire = build_oap_obj_get_request_wire(SEED_CID, tenant_id, corr_id)
        .expect("raw live OBJ_GET wire");

    let response = client
        .post(format!("{storage_base}/oap/obj-get"))
        .header("content-type", "application/oap")
        .header("accept", "application/oap")
        .body(request_wire)
        .send()
        .await
        .expect("raw live OAP request")
        .error_for_status()
        .expect("raw live OAP success");

    let live_wire = response
        .bytes()
        .await
        .expect("raw live OAP response")
        .to_vec();

    let verified = verify_oap_object_stream(SEED_CID, tenant_id, corr_id, &live_wire, 1024)
        .expect("real live wire must verify");

    assert_eq!(verified, SEED_BYTES,);

    let mut corrupted = live_wire.clone();

    let encoded_seed = b"[97,98,99]";

    let position = find_subsequence(&corrupted, encoded_seed).expect(
        "live DATA frame must contain \
         seeded byte array",
    );

    // Preserve JSON validity and frame length while changing
    // one authenticated object byte from 97 to 87.
    corrupted[position + 1] = b'8';

    let corruption_error = verify_oap_object_stream(SEED_CID, tenant_id, corr_id, &corrupted, 1024)
        .expect_err("corrupted live stream must reject");

    assert!(
        corruption_error.contains("BLAKE3 digest mismatch"),
        "unexpected corruption error: \
         {corruption_error}",
    );

    let mut truncated = live_wire;

    truncated.pop();

    let truncation_error = verify_oap_object_stream(SEED_CID, tenant_id, corr_id, &truncated, 1024)
        .expect_err("truncated live stream must reject");

    assert!(
        truncation_error.contains("incomplete frame"),
        "unexpected truncation error: \
         {truncation_error}",
    );

    println!(
        "Phase 22D passed: CrabLink fetched the real Service Node object over OAP/1, admitted only the full BLAKE3-verified bytes, and rejected corrupted and truncated live streams."
    );
}
