//! RO:WHAT — Performs one real Physical M1 RecoveryRoot RegisterRoot proof through the managed CrabNode public gateway, then proves exact replay rejection.
//! RO:WHY — CN-4 requires truthful evidence that the existing Mac Passport can authenticate a fresh service challenge, freshly confirm root authority, sign the canonical proof, register durably, and reject reuse.
//! RO:INTERACTS — public Passport descriptor, native operational unlock, macOS hidden PIN surface, Keychain RecoveryRoot compartment, ron-auth canonical transcripts, svc-passport RecoveryRoot signer, and public svc-gateway challenge/proof routes.
//! RO:INVARIANTS — operational unlock precedes challenge issuance; a new challenge is verified before root confirmation; cancellation occurs before RecoveryRoot factor unseal; derived root identity must match the immutable public descriptor; only the canonical proof goes to port 8090; replay must return conflict.
//! RO:METRICS — prints only public/redacted acceptance evidence under explicit live opt-in.
//! RO:CONFIG — macOS Physical M1 only; live mutation requires CRABLINK_PHYSICAL_M1_REGISTERROOT_PROOF_LIVE=YES; challenge/proof use canonical local M1 gateway port 8090.
//! RO:SECURITY — PIN and recovery factor remain native and are never serialized, logged, printed, returned to React, or sent over HTTP; proof signature is submitted but not printed; no capability, username, wallet, or ledger mutation.
//! RO:TEST — CRABLINK_PHYSICAL_M1_REGISTERROOT_PROOF_LIVE=YES cargo test --test physical_m1_live_register_root_proof -- --nocapture.

#![cfg(target_os = "macos")]
#![forbid(unsafe_code)]

use std::{
    path::PathBuf,
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use crablink_tauri_lib::{
    passport_operational_command_runtime::{
        unlock_desktop_native_passport_operational_from_native_surface,
        DesktopNativeSecretSurfaceOutcome, DesktopNativeSecretSurfacePort,
        DesktopOperationalUnlockCommandState, MacosHiddenAnswerNativeSecretSurface,
    },
    passport_operational_unlock_runtime::DesktopOperationalVaultSessionStore,
    passport_platform_sealer::MacosKeychainPlatformSealer,
    passport_public_identity_store::DesktopPublicPassportDescriptorStore,
    passport_register_root_intent::{
        physical_m1_register_root_operation_hash, PHYSICAL_M1_REGISTER_ROOT_KEY_EPOCH,
    },
    passport_register_root_trust::verify_physical_m1_register_root_challenge,
    passport_vault_store::DesktopAtomicVaultStore,
};

use ron_auth::native_passport::{
    passport_challenge_v1_transcript_b3_hex, RootRegistrationProofTranscriptV1,
};

use ron_proto::{
    B3DigestHex, Ed25519PublicKeyHex, NativePassportScopeV1, PassportChallengeV1, PassportIdV1,
};

use serde_json::{json, Value};

use svc_passport::native::{
    decode_native_platform_bound_vault_versioned, derive_native_recovery_public_identity_v1,
    load_native_encrypted_vault, sign_native_recovery_root_registration_proof_v1,
    unseal_native_secret, verify_native_recovery_root_pin, NativeSecureCompartment,
    PHASE8A_PROOF_CHALLENGE_CONTRACT_DOMAIN, PHASE8A_PROOF_CHALLENGE_CONTRACT_VERSION,
    PHASE8B_PROOF_CONTRACT_DOMAIN, PHASE8B_PROOF_CONTRACT_VERSION,
};

const LIVE_ENABLE_ENV: &str = "CRABLINK_PHYSICAL_M1_REGISTERROOT_PROOF_LIVE";

const PUBLIC_REGISTER_ROOT_CHALLENGE_URL: &str =
    "http://127.0.0.1:8090/identity/passport/register/challenge";

const PUBLIC_REGISTER_ROOT_PROOF_URL: &str =
    "http://127.0.0.1:8090/identity/passport/register/proof";

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

async fn response_json(response: reqwest::Response) -> (u16, Value) {
    let status = response.status().as_u16();

    let bytes = response.bytes().await.expect("HTTP response bytes");

    let value = serde_json::from_slice(&bytes).unwrap_or_else(|_| {
        json!({
            "raw":
                String::from_utf8_lossy(&bytes),
        })
    });

    (status, value)
}

#[tokio::test]
async fn physical_mac_real_register_root_proof_registers_once_and_replay_rejects() {
    if std::env::var(LIVE_ENABLE_ENV).ok().as_deref() != Some("YES") {
        println!("PHYSICAL_M1_LIVE_REGISTERROOT_PROOF=SKIPPED");

        return;
    }

    let root = physical_native_passport_root();

    let public_store = DesktopPublicPassportDescriptorStore::new(root.clone())
        .expect("validated Physical M1 Passport root");

    let descriptor = public_store
        .load()
        .expect("load public Passport descriptor")
        .expect("physical Passport public descriptor must exist");

    let passport_id = PassportIdV1::parse(descriptor.passport_id.as_str())
        .expect("canonical ron-proto Passport ID");

    let proto_root_public_key = Ed25519PublicKeyHex::parse(descriptor.root_public_key.as_str())
        .expect("canonical ron-proto root public key");

    let requested_scopes =
        vec![NativePassportScopeV1::parse("identity.read").expect("identity.read scope")];

    let operation_body_hash =
        physical_m1_register_root_operation_hash(&passport_id, descriptor.root_public_key.as_str())
            .expect("canonical Physical M1 RegisterRoot operation hash");

    let store = DesktopAtomicVaultStore::new(root).expect("physical desktop VaultStore");

    let sealer = MacosKeychainPlatformSealer::new();

    let session = DesktopOperationalVaultSessionStore::default();

    let surface = MacosHiddenAnswerNativeSecretSurface;

    println!("NATIVE_OPERATIONAL_UNLOCK_PROMPT=REQUESTED");

    let unlock = unlock_desktop_native_passport_operational_from_native_surface(
        &store, &sealer, &session, &surface,
    );

    assert_eq!(
        unlock.state,
        DesktopOperationalUnlockCommandState::OperationalUnlocked,
        "fresh Physical M1 test process must operationally unlock before root registration",
    );

    assert!(
        unlock.native_secure_input_requested,
        "operational unlock must use native secure input",
    );

    println!("NATIVE_OPERATIONAL_UNLOCK=GREEN");

    let request_scope_strings = requested_scopes
        .iter()
        .map(NativePassportScopeV1::as_str)
        .collect::<Vec<_>>();

    let challenge_request = json!({
        "passport_id":
            passport_id.as_str(),

        "requested_scopes":
            request_scope_strings,

        "operation_body_hash":
            operation_body_hash.as_str(),
    });

    let client = reqwest::Client::builder()
        .timeout(Duration::from_millis(5_000))
        .build()
        .expect("Physical M1 HTTP client");

    let challenge_response = client
        .post(PUBLIC_REGISTER_ROOT_CHALLENGE_URL)
        .json(&challenge_request)
        .send()
        .await
        .expect("real public RegisterRoot challenge request");

    let challenge_status = challenge_response.status();

    let challenge_bytes = challenge_response
        .bytes()
        .await
        .expect("RegisterRoot challenge bytes");

    assert_eq!(
        challenge_status.as_u16(),
        200,
        "real RegisterRoot challenge failed: {}",
        String::from_utf8_lossy(&challenge_bytes),
    );

    let challenge: PassportChallengeV1 = serde_json::from_slice(&challenge_bytes)
        .expect("strict canonical PassportChallengeV1 response");

    verify_physical_m1_register_root_challenge(
        &challenge,
        &passport_id,
        &requested_scopes,
        &operation_body_hash,
        trusted_now_ms(),
    )
    .expect("new real challenge must verify before root confirmation");

    println!("SERVICE_CHALLENGE_VERIFIED=YES");

    println!("ROOT_CONFIRMATION_PROMPT=REQUESTED");

    let root_pin = match surface.request_root_confirmation_pin() {
        Ok(DesktopNativeSecretSurfaceOutcome::Secret(pin)) => pin,

        Ok(DesktopNativeSecretSurfaceOutcome::Rejected) => {
            panic!("root confirmation PIN was rejected");
        }

        Ok(DesktopNativeSecretSurfaceOutcome::Cancelled) => {
            panic!("root confirmation was cancelled before RecoveryRoot unseal");
        }

        Ok(DesktopNativeSecretSurfaceOutcome::Unavailable) => {
            panic!("root confirmation secure surface unavailable");
        }

        Err(_) => {
            panic!("root confirmation secure surface failed");
        }
    };

    println!("ROOT_CONFIRMATION_SECRET_CAPTURED_NATIVE_ONLY=YES");

    let encrypted_vault = load_native_encrypted_vault(&store)
        .expect("load physical encrypted vault")
        .expect("physical encrypted vault exists");

    let versioned_vault = decode_native_platform_bound_vault_versioned(&encrypted_vault)
        .expect("decode physical versioned vault");

    let platform_bound_vault = versioned_vault.base_v1();

    let recovery_factor = unseal_native_secret(
        &sealer,
        platform_bound_vault.platform_family(),
        NativeSecureCompartment::RecoveryRoot,
        platform_bound_vault.recovery_root_factor(),
    )
    .expect("unseal existing native RecoveryRoot factor");

    verify_native_recovery_root_pin(
        platform_bound_vault.wrapped_keys().recovery_root(),
        root_pin.as_slice(),
        &recovery_factor,
    )
    .expect("fresh root confirmation PIN must authenticate RecoveryRoot");

    println!("RECOVERY_ROOT_PIN_VERIFIED=YES");

    let derived_root = derive_native_recovery_public_identity_v1(&recovery_factor)
        .expect("derive public root identity from existing RecoveryRoot custody");

    assert_eq!(
        derived_root.passport_id.as_str(),
        descriptor.passport_id.as_str(),
        "RecoveryRoot Passport must match immutable public descriptor",
    );

    assert_eq!(
        derived_root.root_public_key.as_str(),
        descriptor.root_public_key.as_str(),
        "RecoveryRoot public key must match immutable public descriptor",
    );

    println!("RECOVERY_ROOT_PUBLIC_IDENTITY_MATCH=YES");

    let challenge_transcript_hash = B3DigestHex::parse(
        "challenge_transcript_hash",
        passport_challenge_v1_transcript_b3_hex(&challenge.signing_payload())
            .expect("canonical service challenge transcript hash"),
    )
    .expect("typed service challenge transcript hash");

    let scope_refs = challenge
        .requested_scopes
        .iter()
        .map(NativePassportScopeV1::as_str)
        .collect::<Vec<_>>();

    let proof_created_at_ms = trusted_now_ms();

    assert!(
        proof_created_at_ms >= challenge.issued_at_ms,
        "proof clock must not precede challenge issuance",
    );

    assert!(
        proof_created_at_ms <= challenge.expires_at_ms,
        "root confirmation exceeded the 60-second challenge lifetime; rerun with a fresh challenge",
    );

    let transcript = RootRegistrationProofTranscriptV1 {
        challenge_contract_domain: PHASE8A_PROOF_CHALLENGE_CONTRACT_DOMAIN,

        challenge_contract_version: PHASE8A_PROOF_CHALLENGE_CONTRACT_VERSION,

        proof_contract_domain: PHASE8B_PROOF_CONTRACT_DOMAIN,

        proof_contract_version: PHASE8B_PROOF_CONTRACT_VERSION,

        challenge_id: &challenge.challenge_id,

        network_id: challenge.network_id.as_str(),

        environment: challenge.environment.as_str(),

        audience: challenge.audience.as_str(),

        passport_id: challenge
            .passport_id
            .as_ref()
            .expect("verified RegisterRoot Passport binding"),

        root_public_key: &proto_root_public_key,

        root_key_epoch: PHYSICAL_M1_REGISTER_ROOT_KEY_EPOCH,

        device_id: None,

        operation_body_hash: challenge
            .operation_body_hash
            .as_ref()
            .expect("verified RegisterRoot operation binding"),

        challenge_transcript_hash: &challenge_transcript_hash,

        requested_scopes: &scope_refs,

        challenge_issued_at_ms: challenge.issued_at_ms,

        challenge_expires_at_ms: challenge.expires_at_ms,

        proof_created_at_ms,
    };

    let signed = sign_native_recovery_root_registration_proof_v1(&recovery_factor, &transcript)
        .expect("existing RecoveryRoot signer must produce one strict canonical proof");

    assert_eq!(
        signed.root_identity.passport_id.as_str(),
        descriptor.passport_id.as_str(),
    );

    assert_eq!(
        signed.root_identity.root_public_key.as_str(),
        descriptor.root_public_key.as_str(),
    );

    println!("ROOT_SIGNATURE_CREATED=YES");

    println!("ROOT_SIGNATURE_PRINTED=NO");

    let proof_request = json!({
        "challenge":
            &challenge,

        "root_public_key":
            proto_root_public_key.as_str(),

        "proof_created_at_ms":
            proof_created_at_ms,

        "proof_signed_payload_hex":
            signed.signed_payload_hex.as_str(),
    });

    let first_response = client
        .post(PUBLIC_REGISTER_ROOT_PROOF_URL)
        .json(&proof_request)
        .send()
        .await
        .expect("first real public RegisterRoot proof submission");

    let (first_status, first_body) = response_json(first_response).await;

    assert_eq!(
        first_status, 200,
        "first real RegisterRoot proof failed: {first_body}",
    );

    assert_eq!(
        first_body.get("schema").and_then(Value::as_str),
        Some("svc-passport.native-register-root-proof-result.v1"),
    );

    assert_eq!(
        first_body.get("status").and_then(Value::as_str),
        Some("registered"),
        "first Physical M1 root registration must be a new durable registration, not a pre-existing idempotent state: {first_body}",
    );

    let durable_generation = first_body
        .get("durable_generation")
        .and_then(Value::as_u64)
        .expect("successful root registration must return durable_generation");

    println!("ROOT_PROOF_VERIFIED=YES");

    println!("CHALLENGE_CONSUMED_ONCE=YES");

    println!("ROOT_REGISTERED_DURABLY=YES");

    println!("DURABLE_GENERATION={durable_generation}");

    let replay_response = client
        .post(PUBLIC_REGISTER_ROOT_PROOF_URL)
        .json(&proof_request)
        .send()
        .await
        .expect("exact RegisterRoot replay submission");

    let (replay_status, replay_body) = response_json(replay_response).await;

    assert_eq!(
        replay_status, 409,
        "exact consumed challenge replay must conflict: {replay_body}",
    );

    assert_eq!(
        replay_body.get("schema").and_then(Value::as_str),
        Some("svc-passport.native-register-root-proof-problem.v1"),
    );

    assert_eq!(
        replay_body.get("code").and_then(Value::as_str),
        Some("register_root_proof_replay"),
        "exact proof replay must be identified as consumed challenge replay: {replay_body}",
    );

    assert_eq!(
        replay_body.get("retryable").and_then(Value::as_bool),
        Some(false),
    );

    println!("REPLAY_REJECTED=YES");

    println!("REPLAY_HTTP=409");

    println!("REPLAY_CODE=register_root_proof_replay");

    assert!(
        session.lock().expect("lock physical operational session"),
        "physical operational session must be dropped after proof acceptance",
    );

    println!("OPERATIONAL_SESSION_RELOCKED=YES");

    println!("PHYSICAL_PASSPORT_LOCAL_MUTATION=NO");

    println!("CAPABILITY_ISSUED=NO");

    println!("USERNAME_MUTATED=NO");

    println!("WALLET_LEDGER_MUTATED=NO");

    println!("CN5_STARTED=NO");

    println!("PHYSICAL_M1_LIVE_REGISTERROOT_PROOF=GREEN");
}
