//! RO:WHAT — Phase 23 privacy-route-unavailable chaos drill.
//! RO:WHY — An unavailable privacy-compatible OAP route must fail before
//! CrabLink submits bytes to the User Node verification queue.
//! RO:INTERACTS — production OAP fetch, User Node verification bridge,
//! loopback HTTP, opaque privacy-route identity, and bounded errors.
//! RO:INVARIANTS — exactly one configured OAP route is attempted; no direct
//! or public fallback; no User Node request after upstream failure.
//! RO:SECURITY — no evidence insertion, accounting acceptance, reward truth,
//! payout authority, wallet/ledger mutation, receipt, confirmed ROC, or
//! finality.
//! RO:TEST — cargo test --test phase23_privacy_relay_unavailable.

use crablink_tauri_lib::phase22_test_support::{
    verify_service_object_with_user_node, UserNodeVerificationRequest,
};
use reqwest::Client;
use std::{
    io::{ErrorKind, Read, Write},
    net::TcpListener,
    sync::{
        atomic::{AtomicUsize, Ordering},
        mpsc, Arc,
    },
    thread,
    time::Duration,
};

const OBJECT: &str = "b3:6437b3ac38465133ffb63b75273a8db548c558465d79db03fd359c6cd5bd9d85";

fn spawn_unavailable_privacy_route() -> (String, Arc<AtomicUsize>, thread::JoinHandle<String>) {
    let listener = TcpListener::bind("127.0.0.1:0").expect("privacy route listener must bind");

    let address = listener
        .local_addr()
        .expect("privacy route address must resolve");

    let hits = Arc::new(AtomicUsize::new(0));
    let thread_hits = Arc::clone(&hits);

    let handle = thread::spawn(move || {
        let (mut stream, _) = listener
            .accept()
            .expect("privacy route must accept the OAP request");

        stream
            .set_read_timeout(Some(Duration::from_secs(2)))
            .expect("privacy route read timeout must configure");

        let mut request_bytes = [0_u8; 16 * 1024];

        let read = stream
            .read(&mut request_bytes)
            .expect("privacy route must read the OAP request");

        thread_hits.fetch_add(1, Ordering::SeqCst);

        let body = "privacy relay unavailable";

        let response = format!(
            "HTTP/1.1 503 Service Unavailable\r\n\
             Content-Type: text/plain\r\n\
             Content-Length: {}\r\n\
             Connection: close\r\n\
             \r\n\
             {body}",
            body.len(),
        );

        stream
            .write_all(response.as_bytes())
            .expect("privacy route must write its truthful failure");

        String::from_utf8_lossy(&request_bytes[..read]).into_owned()
    });

    (format!("http://{address}"), hits, handle)
}

fn spawn_user_node_contact_guard() -> (
    String,
    Arc<AtomicUsize>,
    mpsc::Sender<()>,
    thread::JoinHandle<()>,
) {
    let listener = TcpListener::bind("127.0.0.1:0").expect("User Node contact guard must bind");

    listener
        .set_nonblocking(true)
        .expect("User Node contact guard must be nonblocking");

    let address = listener
        .local_addr()
        .expect("User Node contact guard address must resolve");

    let hits = Arc::new(AtomicUsize::new(0));
    let thread_hits = Arc::clone(&hits);
    let (stop_tx, stop_rx) = mpsc::channel();

    let handle = thread::spawn(move || loop {
        match listener.accept() {
            Ok((mut stream, _)) => {
                thread_hits.fetch_add(1, Ordering::SeqCst);

                let body = "unexpected User Node contact";

                let response = format!(
                    "HTTP/1.1 500 Internal Server Error\r\n\
                     Content-Type: text/plain\r\n\
                     Content-Length: {}\r\n\
                     Connection: close\r\n\
                     \r\n\
                     {body}",
                    body.len(),
                );

                stream
                    .write_all(response.as_bytes())
                    .expect("contact guard response must write");
            }
            Err(error) if error.kind() == ErrorKind::WouldBlock => {}
            Err(error) => {
                panic!("User Node contact guard failed: {error}");
            }
        }

        if stop_rx.try_recv().is_ok() {
            break;
        }

        thread::sleep(Duration::from_millis(5));
    });

    (format!("http://{address}"), hits, stop_tx, handle)
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn unavailable_privacy_route_fails_before_user_node_submission() {
    let (privacy_route_url, privacy_route_hits, privacy_route_handle) =
        spawn_unavailable_privacy_route();

    let (user_node_url, user_node_hits, user_node_stop, user_node_handle) =
        spawn_user_node_contact_guard();

    let client = Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .expect("Phase 23J HTTP client must build");

    let error = verify_service_object_with_user_node(
        client,
        2_000,
        UserNodeVerificationRequest {
            enabled: true,
            connection_mode: "local".to_string(),

            storage_base_url: privacy_route_url,
            user_node_base_url: user_node_url,

            object: OBJECT.to_string(),
            max_bytes: Some(1_024),

            observed_at_ms: 1_700_000_023_000,

            nonce: "phase23j-privacy-route-nonce".to_string(),

            idempotency_key: "phase23j-privacy-route-unavailable".to_string(),

            privacy_route_id: "relay:phase23j".to_string(),
        },
    )
    .await
    .expect_err("unavailable privacy route must stop verification");

    assert!(
        error.contains("OAP OBJ_GET returned HTTP 503"),
        "unexpected privacy-route error: {error}",
    );

    assert!(
        error.contains("privacy relay unavailable"),
        "privacy-route failure reason must remain truthful: {error}",
    );

    let request = privacy_route_handle
        .join()
        .expect("privacy route thread must finish");

    assert!(
        request.starts_with("POST /oap/obj-get "),
        "CrabLink must use the production OAP route: {request:?}",
    );

    assert_eq!(
        privacy_route_hits.load(Ordering::SeqCst),
        1,
        "CrabLink must make exactly one configured OAP attempt",
    );

    user_node_stop
        .send(())
        .expect("User Node contact guard must stop");

    user_node_handle
        .join()
        .expect("User Node contact guard thread must finish");

    assert_eq!(
        user_node_hits.load(Ordering::SeqCst),
        0,
        "upstream privacy-route failure must occur before \
         User Node verification submission",
    );

    println!(
        "Phase 23J passed: an unavailable privacy route returned a \
         truthful failure, CrabLink made one configured OAP attempt, \
         did not fall back to a direct or public route, did not contact \
         the User Node verification queue, and created no evidence, \
         reward, wallet, ledger, receipt, confirmed-ROC, or finality \
         authority."
    );
}
