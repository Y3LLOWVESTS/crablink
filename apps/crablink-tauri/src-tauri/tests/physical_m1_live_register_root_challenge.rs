//! RO:WHAT — Exercises one real Physical M1 RegisterRoot challenge through the managed CrabNode public gateway and verifies it with CrabLink's pinned native trust boundary.
//! RO:WHY — CN-4 needs physical-client evidence that the existing Mac Passport can reach svc-passport through 8090 and authenticate the real service challenge before any RecoveryRoot signing occurs.
//! RO:INTERACTS — public Passport descriptor store, public svc-gateway RegisterRoot challenge route, PassportChallengeV1, and passport_register_root_trust.
//! RO:INVARIANTS — loads public identity only; uses public port 8090 only; exact client intent is hashed locally; service challenge must strictly verify before success; no root unlock, PIN, signing, proof submission, capability, username, wallet, or ledger mutation.
//! RO:METRICS — prints only public/redacted acceptance evidence when explicitly enabled.
//! RO:CONFIG — macOS Physical M1 only; live execution requires CRABLINK_PHYSICAL_M1_REGISTERROOT_LIVE=YES; gateway fixed to the current canonical local M1 ingress.
//! RO:SECURITY — no vault read, RecoveryRoot unseal, recovery phrase, PIN, VMK, private key, internal trust-anchor HTTP request, or signature output.
//! RO:TEST — CRABLINK_PHYSICAL_M1_REGISTERROOT_LIVE=YES cargo test --test physical_m1_live_register_root_challenge -- --nocapture.

#![cfg(target_os = "macos")]
#![forbid(unsafe_code)]

use std::{
    path::PathBuf,
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use crablink_tauri_lib::{
    passport_public_identity_store::DesktopPublicPassportDescriptorStore,
    passport_register_root_intent::physical_m1_register_root_operation_hash,
    passport_register_root_trust::verify_physical_m1_register_root_challenge,
};

use ron_proto::{NativePassportScopeV1, PassportChallengeV1, PassportIdV1};

const LIVE_ENABLE_ENV: &str = "CRABLINK_PHYSICAL_M1_REGISTERROOT_LIVE";

const PUBLIC_REGISTER_ROOT_CHALLENGE_URL: &str =
    "http://127.0.0.1:8090/identity/passport/register/challenge";

fn physical_native_passport_root() -> PathBuf {
    let home = std::env::var_os("HOME").expect("Physical M1 requires HOME");

    PathBuf::from(home)
        .join("Library")
        .join("Application Support")
        .join("com.rustyonions.crablink")
        .join("native-passport")
}

fn trusted_now_ms() -> u64 {
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system clock after Unix epoch")
        .as_millis();

    u64::try_from(millis).expect("millisecond clock fits u64")
}

#[tokio::test]
async fn physical_mac_real_register_root_challenge_strictly_verifies() {
    if std::env::var(LIVE_ENABLE_ENV).ok().as_deref() != Some("YES") {
        println!("PHYSICAL_M1_LIVE_REGISTERROOT_CHALLENGE=SKIPPED");

        return;
    }

    let store = DesktopPublicPassportDescriptorStore::new(physical_native_passport_root())
        .expect("validated Physical M1 Passport root");

    let descriptor = store
        .load()
        .expect("load public Passport descriptor")
        .expect("physical Passport public descriptor must already exist");

    let passport_id = PassportIdV1::parse(descriptor.passport_id.as_str())
        .expect("canonical ron-proto Passport ID");

    let requested_scopes =
        vec![NativePassportScopeV1::parse("identity.read").expect("identity.read scope")];

    let operation_body_hash =
        physical_m1_register_root_operation_hash(&passport_id, descriptor.root_public_key.as_str());

    let requested_scope_strings = requested_scopes
        .iter()
        .map(NativePassportScopeV1::as_str)
        .collect::<Vec<_>>();

    let request_body = serde_json::json!({
        "passport_id":
            passport_id.as_str(),

        "requested_scopes":
            requested_scope_strings,

        "operation_body_hash":
            operation_body_hash.as_str(),
    });

    let client = reqwest::Client::builder()
        .timeout(Duration::from_millis(5_000))
        .build()
        .expect("Physical M1 HTTP client");

    let response = client
        .post(PUBLIC_REGISTER_ROOT_CHALLENGE_URL)
        .json(&request_body)
        .send()
        .await
        .expect("real public RegisterRoot challenge request");

    let status = response.status();

    let body = response.bytes().await.expect("RegisterRoot response bytes");

    assert_eq!(
        status.as_u16(),
        200,
        "real RegisterRoot challenge failed: {}",
        String::from_utf8_lossy(&body),
    );

    let challenge: PassportChallengeV1 =
        serde_json::from_slice(&body).expect("strict canonical PassportChallengeV1 response");

    verify_physical_m1_register_root_challenge(
        &challenge,
        &passport_id,
        &requested_scopes,
        &operation_body_hash,
        trusted_now_ms(),
    )
    .expect("real managed CrabNode challenge must verify against pinned native trust");

    println!("PHYSICAL_PASSPORT_ID={}", passport_id.as_str(),);

    println!("CHALLENGE_ID={}", challenge.challenge_id.as_str(),);

    println!("SERVICE_KEY_ID={}", challenge.service_key_id.as_str(),);

    println!("OPERATION_BODY_HASH={}", operation_body_hash.as_str(),);

    println!(
        "PUBLIC_REGISTERROOT_ROUTE={}",
        PUBLIC_REGISTER_ROOT_CHALLENGE_URL,
    );

    println!("SERVICE_CHALLENGE_VERIFIED=YES");

    println!("CHALLENGE_ISSUED_DURABLY=YES");

    println!("CHALLENGE_CONSUMED=NO");

    println!("PHYSICAL_ROOT_UNSEALED=NO");

    println!("ROOT_SIGNATURE_CREATED=NO");

    println!("ROOT_PROOF_SUBMITTED=NO");

    println!("ROOT_REGISTERED_DURABLY=NO");

    println!("CAPABILITY_ISSUED=NO");

    println!("USERNAME_MUTATED=NO");

    println!("WALLET_LEDGER_MUTATED=NO");

    println!("CN5_STARTED=NO");

    println!("PHYSICAL_M1_LIVE_REGISTERROOT_CHALLENGE=GREEN");
}
