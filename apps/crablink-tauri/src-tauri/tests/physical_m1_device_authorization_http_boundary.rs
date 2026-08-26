//! RO:WHAT — Locks the CN-4 CrabLink DeviceAuthorization public-8090 server-registration boundary.
//! RO:WHY — Windows physical acceptance must durably register its native authorization through the real CrabNode ingress before DeviceKey possession can succeed.
//! RO:INTERACTS — passport_device_authorization_http_runtime, the existing Tauri Passport command, AppState gateway settings, and module wiring.
//! RO:INVARIANTS — exact 8090 route only; local authorization exists before HTTP; zero WebView authority; bounded strict result; no direct internal service path or secret/economic authority.
//! RO:SECURITY — source-boundary test only; no live root/device secret, capability, username, wallet, or ledger mutation.
//! RO:TEST — cargo test --test physical_m1_device_authorization_http_boundary.

use std::{fs, path::PathBuf};

fn source(relative: &str) -> String {
    fs::read_to_string(PathBuf::from(env!("CARGO_MANIFEST_DIR")).join(relative))
        .unwrap_or_else(|error| panic!("failed to read {relative}: {error}"))
        .replace("\r\n", "\n")
}

#[test]
fn cn4_device_authorization_http_uses_only_public_8090_and_exact_contract() {
    let runtime = source("src/passport_device_authorization_http_runtime.rs");

    assert_eq!(runtime.matches("\"http://127.0.0.1:8090\"").count(), 1,);

    assert_eq!(runtime.matches("\"http://127.0.0.1:9090\"").count(), 0,);

    assert_eq!(runtime.matches("\"http://127.0.0.1:5307\"").count(), 0,);

    for required in [
        "\"/identity/passport/device/authorize\"",
        "\"svc-passport.native-device-authorization-result.v1\"",
        "\"svc-passport.native-device-authorization-problem.v1\"",
        "\"registered\"",
        "\"already_registered\"",
        "16 * 1024",
        "30_000",
        "authorization: &'a DeviceAuthorizationV1",
        ".json(&request)",
    ] {
        assert!(
            runtime.contains(required),
            "DeviceAuthorization HTTP runtime missing {required}",
        );
    }
}

#[test]
fn cn4_device_authorization_http_drops_settings_lock_before_network_await() {
    let runtime = source("src/passport_device_authorization_http_runtime.rs");

    let settings = runtime
        .find("let (gateway_url, timeout_ms) = {")
        .expect("settings scope");

    let client = runtime
        .find("let client = state.http.clone();")
        .expect("HTTP client clone");

    let send = runtime.find(".send()").expect("HTTP send");

    let await_marker = runtime[send..]
        .find(".await")
        .map(|offset| send + offset)
        .expect("HTTP await");

    assert!(settings < client);
    assert!(client < send);
    assert!(send < await_marker);

    for forbidden in [
        "passport_secret_surface",
        "unseal_native_secret",
        "request_root_confirmation_pin",
        "sign_native_recovery",
        "issue_capability(",
        "username.claim(",
        "wallet.spend(",
        "ledger.write(",
    ] {
        assert!(
            !runtime.contains(forbidden),
            "HTTP runtime gained forbidden authority {forbidden}",
        );
    }
}

#[test]
fn cn4_device_authorize_command_completes_local_authority_before_server_registration() {
    let commands = source("src/commands/passport.rs");

    let start = commands
        .find("pub async fn passport_authorize_device")
        .expect("async DeviceAuthorization command");

    let end = commands[start..]
        .find("\n/// Public redacted DeviceKey-possession command schema.")
        .map(|offset| start + offset)
        .expect("DeviceAuthorization command end");

    let command = &commands[start..end];

    let local = command
        .find("authorize_or_reuse_persisted_physical_m1_device_authorization")
        .expect("local authorization");

    let server = command
        .find("register_physical_m1_device_authorization")
        .expect("server registration");

    let network_await = command[server..]
        .find(".await")
        .map(|offset| server + offset)
        .expect("server registration await");

    assert!(local < server);
    assert!(server < network_await);

    assert!(command.contains("-> Result<"));
    assert!(command.contains("PassportDeviceAuthorizationCommandDtoV1",));
    assert!(command.contains("PassportStatusProblemV1"));

    assert!(command.contains("server_outcome.newly_registered",));

    assert!(command.contains("authorization_returned_to_webview: false",));

    assert!(command.contains("signature_returned_to_webview: false",));

    for forbidden in [
        "passport_id:",
        "device_id:",
        "public_key:",
        "pin:",
        "authorization: DeviceAuthorizationV1",
    ] {
        let signature = command.split("->").next().expect("command signature");

        assert!(
            !signature.contains(forbidden),
            "public command accepts forbidden input {forbidden}",
        );
    }
}

#[test]
fn cn4_device_authorization_http_module_is_wired_once() {
    let lib = source("src/lib.rs");

    assert_eq!(
        lib.matches("pub mod passport_device_authorization_http_runtime;",)
            .count(),
        1,
    );
}
