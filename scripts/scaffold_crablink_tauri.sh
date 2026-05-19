#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

write_file() {
  local path="$1"
  if [[ -e "$path" ]]; then
    echo "skip existing: $path"
    return 0
  fi
  mkdir -p "$(dirname "$path")"
  cat > "$path"
  echo "created: $path"
}

mkdir -p \
  apps/crablink-tauri/src \
  apps/crablink-tauri/src/styles \
  apps/crablink-tauri/src/platform \
  apps/crablink-tauri/src/adapters \
  apps/crablink-tauri/src-tauri/src/commands \
  apps/crablink-tauri/src-tauri/src/gateway \
  apps/crablink-tauri/src-tauri/src/settings \
  apps/crablink-tauri/src-tauri/src/deeplink \
  apps/crablink-tauri/src-tauri/src/security \
  apps/crablink-tauri/src-tauri/capabilities \
  packages/crablink-core/src/app \
  packages/crablink-core/src/pages \
  packages/crablink-core/src/shared \
  packages/crablink-platform/src/contracts \
  packages/crablink-platform/src/memory \
  packages/crablink-platform/src/chrome \
  packages/crablink-platform/src/tauri \
  scripts

write_file "apps/crablink-tauri/package.json" <<'EOF'
{
  "name": "@crablink/crablink-tauri",
  "version": "0.1.0",
  "private": true,
  "description": "CrabLink Tauri native client scaffold.",
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1 --port 1420",
    "build": "vite build",
    "preview": "vite preview --host 127.0.0.1 --port 1420",
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build",
    "check": "npm run build && cargo check --manifest-path src-tauri/Cargo.toml"
  },
  "dependencies": {
    "@tauri-apps/api": "^2",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2",
    "@vitejs/plugin-react": "^4.3.0",
    "vite": "^5.4.0"
  }
}
EOF

write_file "apps/crablink-tauri/index.html" <<'EOF'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CrabLink Tauri</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
EOF

write_file "apps/crablink-tauri/vite.config.js" <<'EOF'
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  clearScreen: false,
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 1420,
    strictPort: true
  },
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    target: "es2021",
    outDir: "dist"
  }
});
EOF

write_file "apps/crablink-tauri/src/main.jsx" <<'EOF'
/**
 * RO:WHAT — Mounts the CrabLink Tauri React shell.
 * RO:WHY — Tauri-first app scaffold while preserving the Chrome proof client.
 * RO:INTERACTS — App.jsx, Tauri command bridge, future crablink-core package.
 * RO:INVARIANTS — React renders intent/state only; no wallet truth, receipt truth, or secrets here.
 * RO:SECURITY — no private keys, tokens, capabilities, or spend authority in React state.
 */

import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles/app.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
EOF

write_file "apps/crablink-tauri/src/App.jsx" <<'EOF'
/**
 * RO:WHAT — Minimal CrabLink Tauri launch screen and gateway-first diagnostics.
 * RO:WHY — Proves the native shell before migrating the full Chrome React app.
 * RO:INTERACTS — Tauri commands: app_diagnostics, read_settings, write_settings, health_check_gateway, resolve_crab_url_gateway.
 * RO:INVARIANTS — gateway-first; no fake balances; no fake receipts; no silent spend.
 * RO:SECURITY — command output is display-only and must remain redacted.
 */

import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

const DEFAULT_CRAB_URL = "crab://home";

function pretty(value) {
  return JSON.stringify(value, null, 2);
}

export default function App() {
  const [settings, setSettings] = useState(null);
  const [diagnostics, setDiagnostics] = useState(null);
  const [gatewayProbe, setGatewayProbe] = useState(null);
  const [resolveProbe, setResolveProbe] = useState(null);
  const [crabUrl, setCrabUrl] = useState(DEFAULT_CRAB_URL);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const gatewayUrl = useMemo(() => {
    return settings?.gateway_url || "http://127.0.0.1:8090";
  }, [settings]);

  async function loadInitial() {
    setError("");
    try {
      const [loadedSettings, loadedDiagnostics] = await Promise.all([
        invoke("read_settings"),
        invoke("app_diagnostics")
      ]);
      setSettings(loadedSettings);
      setDiagnostics(loadedDiagnostics);
      setCrabUrl(loadedSettings?.last_crab_url || DEFAULT_CRAB_URL);
    } catch (err) {
      setError(String(err));
    }
  }

  async function checkGateway() {
    setBusy(true);
    setError("");
    setGatewayProbe(null);
    try {
      setGatewayProbe(await invoke("health_check_gateway"));
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  async function resolveCrabUrl() {
    setBusy(true);
    setError("");
    setResolveProbe(null);
    try {
      const updated = {
        ...(settings || {}),
        gateway_url: gatewayUrl,
        last_crab_url: crabUrl
      };
      await invoke("write_settings", { settings: updated });
      setSettings(updated);
      setResolveProbe(await invoke("resolve_crab_url_gateway", { crabUrl }));
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  async function updateGatewayUrl(value) {
    const updated = {
      ...(settings || {}),
      gateway_url: value
    };
    setSettings(updated);
    try {
      await invoke("write_settings", { settings: updated });
    } catch (err) {
      setError(String(err));
    }
  }

  useEffect(() => {
    loadInitial();
  }, []);

  return (
    <main className="app-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">CrabLink Tauri</p>
          <h1>Native Rust-backed CrabLink scaffold</h1>
          <p className="lede">
            This is the first Tauri lane: gateway-first, display-only, and ready for the React shell migration.
          </p>
        </div>
        <div className="status-pill">Tauri-first</div>
      </section>

      {error ? (
        <section className="panel panel-danger">
          <h2>Error</h2>
          <pre>{error}</pre>
        </section>
      ) : null}

      <section className="grid">
        <article className="panel">
          <h2>Gateway mode</h2>
          <p>
            Default path: Tauri → configured svc-gateway → omnigate → RustyOnions services.
          </p>

          <label className="field">
            <span>Gateway URL</span>
            <input
              value={gatewayUrl}
              onChange={(event) => updateGatewayUrl(event.target.value)}
              spellCheck="false"
            />
          </label>

          <div className="actions">
            <button type="button" onClick={checkGateway} disabled={busy}>
              Check gateway
            </button>
            <button type="button" onClick={loadInitial} disabled={busy}>
              Reload settings
            </button>
          </div>

          {gatewayProbe ? <pre>{pretty(gatewayProbe)}</pre> : null}
        </article>

        <article className="panel">
          <h2>Resolve crab://</h2>
          <p>
            This proves route parity through the gateway before OAP, sidecar, vault, or offline-cache work.
          </p>

          <label className="field">
            <span>Crab URL</span>
            <input
              value={crabUrl}
              onChange={(event) => setCrabUrl(event.target.value)}
              spellCheck="false"
            />
          </label>

          <div className="actions">
            <button type="button" onClick={resolveCrabUrl} disabled={busy}>
              Resolve through gateway
            </button>
          </div>

          {resolveProbe ? <pre>{pretty(resolveProbe)}</pre> : null}
        </article>
      </section>

      <section className="grid">
        <article className="panel">
          <h2>Diagnostics</h2>
          <pre>{pretty(diagnostics || { status: "loading" })}</pre>
        </article>

        <article className="panel">
          <h2>Current settings</h2>
          <pre>{pretty(settings || { status: "loading" })}</pre>
        </article>
      </section>

      <section className="panel">
        <h2>Next migration target</h2>
        <ol>
          <li>Copy platform-neutral React shell into packages/crablink-core.</li>
          <li>Move Chrome storage/settings behind platform adapters.</li>
          <li>Preserve gateway route behavior before adding native-only powers.</li>
          <li>Keep paid actions explicit and receipts backend-derived or display-only.</li>
        </ol>
      </section>
    </main>
  );
}
EOF

write_file "apps/crablink-tauri/src/styles/app.css" <<'EOF'
/**
 * RO:WHAT — Minimal launch styling for the CrabLink Tauri scaffold.
 * RO:WHY — Provides a clean diagnostic shell before the full React migration.
 * RO:INTERACTS — App.jsx.
 * RO:INVARIANTS — display-only; no authority represented by style state.
 */

:root {
  color-scheme: dark;
  background: #08111f;
  color: #ecf7ff;
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 960px;
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(47, 181, 255, 0.20), transparent 32rem),
    radial-gradient(circle at bottom right, rgba(255, 135, 74, 0.14), transparent 30rem),
    #08111f;
}

button,
input {
  font: inherit;
}

button {
  border: 0;
  border-radius: 999px;
  padding: 0.75rem 1rem;
  cursor: pointer;
  background: #68d5ff;
  color: #06111d;
  font-weight: 800;
}

button:disabled {
  cursor: wait;
  opacity: 0.6;
}

input {
  width: 100%;
  border: 1px solid rgba(236, 247, 255, 0.18);
  border-radius: 0.8rem;
  padding: 0.8rem 0.9rem;
  background: rgba(2, 10, 20, 0.75);
  color: #ecf7ff;
}

pre {
  overflow: auto;
  max-height: 24rem;
  padding: 1rem;
  border-radius: 1rem;
  background: rgba(2, 10, 20, 0.72);
  border: 1px solid rgba(236, 247, 255, 0.10);
  color: #b9e8ff;
}

.app-shell {
  width: min(1180px, calc(100vw - 3rem));
  margin: 0 auto;
  padding: 2rem 0 4rem;
}

.hero-card,
.panel {
  border: 1px solid rgba(236, 247, 255, 0.12);
  background: rgba(10, 24, 42, 0.82);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(14px);
}

.hero-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 2rem;
  border-radius: 1.5rem;
  padding: 2rem;
  margin-bottom: 1rem;
}

.eyebrow {
  margin: 0 0 0.35rem;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.76rem;
  color: #68d5ff;
  font-weight: 800;
}

h1,
h2,
p {
  margin-top: 0;
}

h1 {
  margin-bottom: 0.75rem;
  font-size: clamp(2rem, 4vw, 3.8rem);
  line-height: 0.95;
}

h2 {
  margin-bottom: 0.75rem;
}

.lede {
  max-width: 58rem;
  color: #bdd4e4;
  font-size: 1.08rem;
  line-height: 1.6;
}

.status-pill {
  flex: 0 0 auto;
  border: 1px solid rgba(104, 213, 255, 0.45);
  background: rgba(104, 213, 255, 0.12);
  color: #9fe7ff;
  border-radius: 999px;
  padding: 0.55rem 0.85rem;
  font-weight: 800;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.panel {
  border-radius: 1.25rem;
  padding: 1.25rem;
}

.panel-danger {
  border-color: rgba(255, 107, 107, 0.4);
  background: rgba(89, 20, 30, 0.72);
  margin-bottom: 1rem;
}

.field {
  display: grid;
  gap: 0.5rem;
  margin: 1rem 0;
}

.field span {
  color: #bdd4e4;
  font-size: 0.9rem;
  font-weight: 700;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
  margin: 1rem 0;
}

ol {
  margin-bottom: 0;
  color: #c8dce8;
  line-height: 1.7;
}
EOF

write_file "apps/crablink-tauri/src/platform/platform.js" <<'EOF'
/**
 * RO:WHAT — Names the frontend platform boundary for CrabLink Tauri.
 * RO:WHY — Keeps React portable across Tauri, Chrome, and test memory adapters.
 * RO:INTERACTS — tauriPlatform.js, future packages/crablink-platform.
 * RO:INVARIANTS — React calls adapters, not raw authority surfaces.
 * RO:SECURITY — no secrets or spend authority are stored here.
 */

export const PLATFORM_KIND = "tauri";
EOF

write_file "apps/crablink-tauri/src/platform/tauriPlatform.js" <<'EOF'
/**
 * RO:WHAT — Thin Tauri invoke adapter for the scaffold app.
 * RO:WHY — Keeps direct invoke usage centralized until package adapters are migrated.
 * RO:INTERACTS — @tauri-apps/api/core, Tauri Rust commands.
 * RO:INVARIANTS — typed command names only; no raw shell/eval/native execution.
 * RO:SECURITY — command results must be redacted before display.
 */

import { invoke } from "@tauri-apps/api/core";

export function callTauri(command, args = {}) {
  return invoke(command, args);
}
EOF

write_file "apps/crablink-tauri/src/platform/memoryPlatform.js" <<'EOF'
/**
 * RO:WHAT — Test-only memory platform placeholder.
 * RO:WHY — Lets shared React code run without Chrome or Tauri during migration tests.
 * RO:INTERACTS — future platform contract tests.
 * RO:INVARIANTS — display/test state only; no backend truth.
 */

export function createMemoryPlatform() {
  return {
    kind: "memory",
    readSettings: async () => ({}),
    writeSettings: async () => undefined
  };
}
EOF

write_file "apps/crablink-tauri/src/adapters/settingsAdapter.js" <<'EOF'
/**
 * RO:WHAT — Frontend settings adapter placeholder for Tauri.
 * RO:WHY — Gives migrated React a stable settings boundary.
 * RO:INTERACTS — Tauri commands read_settings/write_settings.
 * RO:INVARIANTS — settings are local preferences, not wallet/ledger truth.
 */

import { callTauri } from "../platform/tauriPlatform.js";

export function readSettings() {
  return callTauri("read_settings");
}

export function writeSettings(settings) {
  return callTauri("write_settings", { settings });
}
EOF

write_file "apps/crablink-tauri/src/adapters/gatewayAdapter.js" <<'EOF'
/**
 * RO:WHAT — Frontend gateway adapter placeholder for Tauri.
 * RO:WHY — Keeps route calls gateway-first during migration.
 * RO:INTERACTS — Tauri commands health_check_gateway and resolve_crab_url_gateway.
 * RO:INVARIANTS — no direct wallet, ledger, storage, index, or omnigate calls from React.
 */

import { callTauri } from "../platform/tauriPlatform.js";

export function healthCheckGateway() {
  return callTauri("health_check_gateway");
}

export function resolveCrabUrlGateway(crabUrl) {
  return callTauri("resolve_crab_url_gateway", { crabUrl });
}
EOF

write_file "apps/crablink-tauri/src/adapters/deepLinkAdapter.js" <<'EOF'
/**
 * RO:WHAT — Deep-link adapter placeholder for future crab:// handling.
 * RO:WHY — Deep links are untrusted input and need a narrow validation boundary.
 * RO:INTERACTS — future Tauri deep-link commands.
 * RO:INVARIANTS — navigation input is not authority; validate before render.
 */

export function normalizeIncomingDeepLink(value) {
  return String(value || "").trim();
}
EOF

write_file "apps/crablink-tauri/src/adapters/receiptsAdapter.js" <<'EOF'
/**
 * RO:WHAT — Receipt display-cache adapter placeholder.
 * RO:WHY — Migrated UI needs receipts without inventing backend truth.
 * RO:INTERACTS — future receipt display cache and backend receipt DTOs.
 * RO:INVARIANTS — display-only cache; no fake receipts; no unlock from cache alone.
 */

export async function listRecentReceipts() {
  return [];
}
EOF

write_file "apps/crablink-tauri/src-tauri/Cargo.toml" <<'EOF'
[package]
name = "crablink-tauri"
version = "0.1.0"
description = "CrabLink Tauri native client"
authors = ["RustyOnions contributors"]
edition = "2021"
rust-version = "1.80"

[lib]
name = "crablink_tauri_lib"
crate-type = ["staticlib", "cdylib", "rlib"]

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tauri = { version = "2", features = [] }
reqwest = { version = "0.12", default-features = false, features = ["json", "rustls-tls"] }
urlencoding = "2"
EOF

write_file "apps/crablink-tauri/src-tauri/build.rs" <<'EOF'
fn main() {
    tauri_build::build();
}
EOF

write_file "apps/crablink-tauri/src-tauri/tauri.conf.json" <<'EOF'
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "CrabLink",
  "version": "0.1.0",
  "identifier": "com.rustyonions.crablink",
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devUrl": "http://127.0.0.1:1420",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "CrabLink",
        "width": 1280,
        "height": 860,
        "minWidth": 960,
        "minHeight": 640,
        "resizable": true,
        "fullscreen": false
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": "all"
  }
}
EOF

write_file "apps/crablink-tauri/src-tauri/capabilities/default.json" <<'EOF'
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Default CrabLink desktop capability set.",
  "windows": ["main"],
  "permissions": ["core:default"]
}
EOF

write_file "apps/crablink-tauri/src-tauri/src/main.rs" <<'EOF'
//! RO:WHAT — Native entrypoint for the CrabLink Tauri app.
//! RO:WHY — Tauri-first client shell while Chrome remains proof/companion.
//! RO:INTERACTS — crablink_tauri_lib::run.
//! RO:INVARIANTS — no backend truth mutation here; no shell/eval/native escape hatch.
//! RO:SECURITY — secrets must not cross into React or logs.

fn main() {
    crablink_tauri_lib::run();
}
EOF

write_file "apps/crablink-tauri/src-tauri/src/lib.rs" <<'EOF'
//! RO:WHAT — Wires the CrabLink Tauri command bridge.
//! RO:WHY — Rust mediates native privilege; React owns display/user intent only.
//! RO:INTERACTS — commands, AppState, svc-gateway HTTP routes.
//! RO:INVARIANTS — gateway-first; no fake balances/receipts; no silent spend; no arbitrary execution.
//! RO:SECURITY — command outputs must be typed and redacted.

mod commands;
mod state;

use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            commands::diagnostics::app_diagnostics,
            commands::settings::read_settings,
            commands::settings::write_settings,
            commands::health::health_check_gateway,
            commands::resolve::resolve_crab_url_gateway,
        ])
        .run(tauri::generate_context!())
        .expect("error while running CrabLink Tauri");
}
EOF

write_file "apps/crablink-tauri/src-tauri/src/state.rs" <<'EOF'
//! RO:WHAT — In-memory Tauri app state for the first scaffold.
//! RO:WHY — Proves command boundaries before durable settings/vault/cache work.
//! RO:INTERACTS — command handlers.
//! RO:INVARIANTS — no lock across await; settings are preferences, not backend truth.
//! RO:SECURITY — no private keys, seeds, raw capabilities, or spend authority.

use serde::{Deserialize, Serialize};
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub gateway_url: String,
    pub request_timeout_ms: u64,
    pub run_mode: String,
    pub passport_label: String,
    pub wallet_account: String,
    pub theme: String,
    pub developer_diagnostics: bool,
    pub last_crab_url: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            gateway_url: "http://127.0.0.1:8090".to_string(),
            request_timeout_ms: 5000,
            run_mode: "gateway".to_string(),
            passport_label: "passport:main:dev".to_string(),
            wallet_account: "acct:main:dev".to_string(),
            theme: "dark".to_string(),
            developer_diagnostics: true,
            last_crab_url: "crab://home".to_string(),
        }
    }
}

pub struct AppState {
    pub settings: Mutex<AppSettings>,
    pub http: reqwest::Client,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            settings: Mutex::new(AppSettings::default()),
            http: reqwest::Client::new(),
        }
    }
}
EOF

write_file "apps/crablink-tauri/src-tauri/src/commands/mod.rs" <<'EOF'
//! RO:WHAT — Command module registry for CrabLink Tauri.
//! RO:WHY — Keeps native bridge small, typed, allowlisted, and testable.
//! RO:INTERACTS — diagnostics, settings, health, resolve.
//! RO:INVARIANTS — no run/execute/eval/shell/raw_* commands.

pub mod diagnostics;
pub mod health;
pub mod resolve;
pub mod settings;
EOF

write_file "apps/crablink-tauri/src-tauri/src/commands/diagnostics.rs" <<'EOF'
//! RO:WHAT — Redacted app diagnostics command.
//! RO:WHY — Lets React display local app status without leaking secrets.
//! RO:INTERACTS — Tauri frontend diagnostics panel.
//! RO:INVARIANTS — display-only; no stack traces or raw secret-bearing state.

use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct AppDiagnostics {
    pub schema: &'static str,
    pub app: &'static str,
    pub role: &'static str,
    pub primary_mode: &'static str,
    pub chrome_role: &'static str,
    pub oap_enabled: bool,
    pub sidecar_enabled: bool,
    pub vault_enabled: bool,
    pub offline_cache_enabled: bool,
    pub facet_execution_enabled: bool,
}

#[tauri::command]
pub async fn app_diagnostics() -> AppDiagnostics {
    AppDiagnostics {
        schema: "crablink.tauri.diagnostics.v1",
        app: "CrabLink Tauri",
        role: "primary native Rust-backed RON client",
        primary_mode: "gateway-first",
        chrome_role: "proof client / browser companion / gateway smoke surface",
        oap_enabled: false,
        sidecar_enabled: false,
        vault_enabled: false,
        offline_cache_enabled: false,
        facet_execution_enabled: false,
    }
}
EOF

write_file "apps/crablink-tauri/src-tauri/src/commands/settings.rs" <<'EOF'
//! RO:WHAT — Read/write local scaffold settings.
//! RO:WHY — Establishes a settings command boundary before durable storage.
//! RO:INTERACTS — AppState, React settings adapter.
//! RO:INVARIANTS — settings are local preferences; no wallet/ledger/receipt truth.
//! RO:SECURITY — rejects suspicious gateway URLs and newline-bearing fields.

use crate::state::{AppSettings, AppState};
use tauri::State;

fn validate_settings(settings: &AppSettings) -> Result<(), String> {
    let gateway = settings.gateway_url.trim();

    if !(gateway.starts_with("http://") || gateway.starts_with("https://")) {
        return Err("gateway_url must start with http:// or https://".to_string());
    }

    if gateway.contains('\n') || gateway.contains('\r') {
        return Err("gateway_url must not contain newlines".to_string());
    }

    if settings.request_timeout_ms == 0 || settings.request_timeout_ms > 30_000 {
        return Err("request_timeout_ms must be between 1 and 30000".to_string());
    }

    Ok(())
}

#[tauri::command]
pub async fn read_settings(state: State<'_, AppState>) -> Result<AppSettings, String> {
    let settings = state
        .settings
        .lock()
        .map_err(|_| "settings lock poisoned".to_string())?
        .clone();

    Ok(settings)
}

#[tauri::command]
pub async fn write_settings(
    state: State<'_, AppState>,
    settings: AppSettings,
) -> Result<AppSettings, String> {
    validate_settings(&settings)?;

    let mut guard = state
        .settings
        .lock()
        .map_err(|_| "settings lock poisoned".to_string())?;

    *guard = settings.clone();

    Ok(settings)
}
EOF

write_file "apps/crablink-tauri/src-tauri/src/commands/health.rs" <<'EOF'
//! RO:WHAT — Gateway health probe command.
//! RO:WHY — Verifies gateway-first runtime from the native app.
//! RO:INTERACTS — svc-gateway /healthz.
//! RO:INVARIANTS — no lock across await; no direct internal service calls.
//! RO:SECURITY — body is truncated for display.

use crate::state::AppState;
use serde::Serialize;
use std::time::Duration;
use tauri::State;

#[derive(Debug, Serialize)]
pub struct GatewayProbe {
    pub schema: &'static str,
    pub route: &'static str,
    pub url: String,
    pub ok: bool,
    pub status: u16,
    pub body_preview: String,
}

fn preview(input: &str) -> String {
    input.chars().take(512).collect()
}

fn normalize_base_url(value: &str) -> String {
    value.trim().trim_end_matches('/').to_string()
}

#[tauri::command]
pub async fn health_check_gateway(state: State<'_, AppState>) -> Result<GatewayProbe, String> {
    let (base_url, timeout_ms) = {
        let settings = state
            .settings
            .lock()
            .map_err(|_| "settings lock poisoned".to_string())?;

        (
            normalize_base_url(&settings.gateway_url),
            settings.request_timeout_ms.min(30_000),
        )
    };

    let url = format!("{base_url}/healthz");
    let client = state.http.clone();

    let response = client
        .get(&url)
        .timeout(Duration::from_millis(timeout_ms))
        .send()
        .await
        .map_err(|err| format!("gateway health request failed: {}", err))?;

    let status = response.status().as_u16();
    let body = response.text().await.unwrap_or_default();

    Ok(GatewayProbe {
        schema: "crablink.gateway.probe.v1",
        route: "/healthz",
        url,
        ok: (200..300).contains(&status),
        status,
        body_preview: preview(&body),
    })
}
EOF

write_file "apps/crablink-tauri/src-tauri/src/commands/resolve.rs" <<'EOF'
//! RO:WHAT — Gateway crab:// resolver command.
//! RO:WHY — Preserves proven route behavior before OAP/native-cache work.
//! RO:INTERACTS — svc-gateway /crab/resolve?url=...
//! RO:INVARIANTS — crab:// input is untrusted; no direct storage/index/omnigate calls.
//! RO:SECURITY — validates length/prefix and truncates response body for display.

use crate::state::AppState;
use serde::Serialize;
use std::time::Duration;
use tauri::State;

#[derive(Debug, Serialize)]
pub struct ResolveProbe {
    pub schema: &'static str,
    pub route: &'static str,
    pub crab_url: String,
    pub request_url: String,
    pub ok: bool,
    pub status: u16,
    pub body_preview: String,
}

fn preview(input: &str) -> String {
    input.chars().take(2048).collect()
}

fn normalize_base_url(value: &str) -> String {
    value.trim().trim_end_matches('/').to_string()
}

fn validate_crab_url(value: &str) -> Result<String, String> {
    let trimmed = value.trim();

    if trimmed.len() > 2048 {
        return Err("crab URL is too long".to_string());
    }

    if trimmed.contains('\n') || trimmed.contains('\r') {
        return Err("crab URL must not contain newlines".to_string());
    }

    if !trimmed.starts_with("crab://") {
        return Err("only crab:// URLs are accepted here".to_string());
    }

    Ok(trimmed.to_string())
}

#[tauri::command]
pub async fn resolve_crab_url_gateway(
    state: State<'_, AppState>,
    crab_url: String,
) -> Result<ResolveProbe, String> {
    let crab_url = validate_crab_url(&crab_url)?;

    let (base_url, timeout_ms) = {
        let settings = state
            .settings
            .lock()
            .map_err(|_| "settings lock poisoned".to_string())?;

        (
            normalize_base_url(&settings.gateway_url),
            settings.request_timeout_ms.min(30_000),
        )
    };

    let request_url = format!(
        "{base_url}/crab/resolve?url={}",
        urlencoding::encode(&crab_url)
    );

    let client = state.http.clone();

    let response = client
        .get(&request_url)
        .timeout(Duration::from_millis(timeout_ms))
        .send()
        .await
        .map_err(|err| format!("gateway resolve request failed: {}", err))?;

    let status = response.status().as_u16();
    let body = response.text().await.unwrap_or_default();

    Ok(ResolveProbe {
        schema: "crablink.gateway.resolve.v1",
        route: "/crab/resolve",
        crab_url,
        request_url,
        ok: (200..300).contains(&status),
        status,
        body_preview: preview(&body),
    })
}
EOF

write_file "apps/crablink-tauri/src-tauri/src/gateway/mod.rs" <<'EOF'
//! RO:WHAT — Placeholder module for future gateway client extraction.
//! RO:WHY — Keeps gateway-first behavior centralized as the Tauri app grows.
//! RO:INTERACTS — command handlers, svc-gateway public routes.
//! RO:INVARIANTS — no direct wallet/ledger/storage/index service calls from UI.
EOF

write_file "apps/crablink-tauri/src-tauri/src/settings/mod.rs" <<'EOF'
//! RO:WHAT — Placeholder module for future durable settings storage.
//! RO:WHY — Separates local preferences from backend truth.
//! RO:INTERACTS — AppState, settings commands.
//! RO:INVARIANTS — no private keys, seeds, raw capabilities, or spend authority.
EOF

write_file "apps/crablink-tauri/src-tauri/src/deeplink/mod.rs" <<'EOF'
//! RO:WHAT — Placeholder module for native crab:// deep-link handling.
//! RO:WHY — Deep links are untrusted input and require validation before navigation.
//! RO:INTERACTS — future OS deep-link plugin, route adapter.
//! RO:INVARIANTS — crab:// is navigation, not authority.
EOF

write_file "apps/crablink-tauri/src-tauri/src/security/mod.rs" <<'EOF'
//! RO:WHAT — Placeholder module for redaction/security helpers.
//! RO:WHY — Command bridge must not leak secrets, raw errors, stack traces, or capabilities.
//! RO:INTERACTS — command handlers and diagnostics.
//! RO:INVARIANTS — fail closed; redact before returning to React.
EOF

write_file "packages/crablink-core/package.json" <<'EOF'
{
  "name": "@crablink/core",
  "version": "0.1.0",
  "private": true,
  "description": "Platform-neutral CrabLink React core migration target.",
  "type": "module",
  "main": "src/index.js"
}
EOF

write_file "packages/crablink-core/README.md" <<'EOF'
# @crablink/core

Platform-neutral React core migration target.

Move React shell, routes, pages, shared components, embeds, manifests, receipts, themes, and utilities here after the Tauri window scaffold is green.

Do not import `chrome.*` or `@tauri-apps/api` from this package.
EOF

write_file "packages/crablink-core/src/index.js" <<'EOF'
/**
 * RO:WHAT — Entry placeholder for the platform-neutral CrabLink React core.
 * RO:WHY — Gives the Tauri migration a stable package target before file moves.
 * RO:INTERACTS — future app shell, route registry, pages, shared components.
 * RO:INVARIANTS — no Chrome APIs; no Tauri APIs; no backend authority.
 */

export const CRABLINK_CORE_PACKAGE = "@crablink/core";
EOF

write_file "packages/crablink-platform/package.json" <<'EOF'
{
  "name": "@crablink/platform",
  "version": "0.1.0",
  "private": true,
  "description": "CrabLink platform adapter contracts for Chrome, Tauri, and tests.",
  "type": "module",
  "main": "src/index.js"
}
EOF

write_file "packages/crablink-platform/README.md" <<'EOF'
# @crablink/platform

Adapter contracts and implementations for CrabLink platforms.

- `contracts/` defines platform-neutral ports.
- `chrome/` wraps Chrome extension APIs.
- `tauri/` wraps Tauri invoke APIs.
- `memory/` supports tests and static previews.

Shared React code should depend on these contracts rather than importing platform APIs directly.
EOF

write_file "packages/crablink-platform/src/index.js" <<'EOF'
/**
 * RO:WHAT — Entry placeholder for CrabLink platform adapters.
 * RO:WHY — Keeps Chrome and Tauri APIs behind swappable contracts.
 * RO:INTERACTS — contracts, chrome adapter, tauri adapter, memory adapter.
 * RO:INVARIANTS — no ambient authority; no fake balances; no fake receipts.
 */

export const CRABLINK_PLATFORM_PACKAGE = "@crablink/platform";
EOF

write_file "packages/crablink-platform/src/contracts/settingsPort.js" <<'EOF'
/**
 * RO:WHAT — Settings adapter contract.
 * RO:WHY — Shared React needs settings without knowing Chrome or Tauri storage.
 * RO:INTERACTS — chromeSettingsAdapter, tauriSettingsAdapter, memorySettingsAdapter.
 * RO:INVARIANTS — settings are preferences, not backend truth.
 */

export function createSettingsPort({ readSettings, writeSettings }) {
  if (typeof readSettings !== "function" || typeof writeSettings !== "function") {
    throw new TypeError("settings port requires readSettings and writeSettings");
  }

  return Object.freeze({ readSettings, writeSettings });
}
EOF

write_file "packages/crablink-platform/src/contracts/gatewayPort.js" <<'EOF'
/**
 * RO:WHAT — Gateway adapter contract.
 * RO:WHY — Shared React must stay gateway-first without owning transport details.
 * RO:INTERACTS — Chrome/Tauri gateway adapters and svc-gateway public routes.
 * RO:INVARIANTS — no direct wallet, ledger, storage, index, or omnigate calls.
 */

export function createGatewayPort(methods) {
  const required = ["health", "ready", "resolveCrabUrl"];

  for (const name of required) {
    if (typeof methods?.[name] !== "function") {
      throw new TypeError(`gateway port missing ${name}`);
    }
  }

  return Object.freeze({ ...methods });
}
EOF

write_file "packages/crablink-platform/src/contracts/walletPort.js" <<'EOF'
/**
 * RO:WHAT — Wallet display/action contract.
 * RO:WHY — Keeps paid flows explicit and backend-derived across platforms.
 * RO:INTERACTS — gateway wallet routes, future paid prepare/confirm adapters.
 * RO:INVARIANTS — no fake balances; no silent spend; no direct ledger mutation.
 */

export function createWalletPort(methods) {
  const required = ["getBalance"];

  for (const name of required) {
    if (typeof methods?.[name] !== "function") {
      throw new TypeError(`wallet port missing ${name}`);
    }
  }

  return Object.freeze({ ...methods });
}
EOF

write_file "packages/crablink-platform/src/contracts/receiptsPort.js" <<'EOF'
/**
 * RO:WHAT — Receipt display-cache contract.
 * RO:WHY — Shared React can show recent receipts without inventing truth.
 * RO:INTERACTS — backend receipt DTOs, local display cache.
 * RO:INVARIANTS — cache is display-only; paid unlock requires backend receipt path.
 */

export function createReceiptsPort(methods) {
  const required = ["listRecentReceipts"];

  for (const name of required) {
    if (typeof methods?.[name] !== "function") {
      throw new TypeError(`receipts port missing ${name}`);
    }
  }

  return Object.freeze({ ...methods });
}
EOF

write_file "packages/crablink-platform/src/contracts/deepLinkPort.js" <<'EOF'
/**
 * RO:WHAT — Deep-link adapter contract.
 * RO:WHY — crab:// OS/browser input must be validated before route navigation.
 * RO:INTERACTS — Tauri deep link handler, Chrome route input.
 * RO:INVARIANTS — crab:// is navigation, not authority.
 */

export function createDeepLinkPort(methods) {
  const required = ["subscribe"];

  for (const name of required) {
    if (typeof methods?.[name] !== "function") {
      throw new TypeError(`deep-link port missing ${name}`);
    }
  }

  return Object.freeze({ ...methods });
}
EOF

write_file "packages/crablink-platform/src/contracts/diagnosticsPort.js" <<'EOF'
/**
 * RO:WHAT — Diagnostics adapter contract.
 * RO:WHY — Shared UI can display runtime status without leaking secrets.
 * RO:INTERACTS — Tauri diagnostics command, Chrome health proof.
 * RO:INVARIANTS — redacted display-only diagnostics.
 */

export function createDiagnosticsPort(methods) {
  const required = ["getDiagnostics"];

  for (const name of required) {
    if (typeof methods?.[name] !== "function") {
      throw new TypeError(`diagnostics port missing ${name}`);
    }
  }

  return Object.freeze({ ...methods });
}
EOF

write_file "packages/crablink-platform/src/memory/memorySettingsAdapter.js" <<'EOF'
/**
 * RO:WHAT — In-memory settings adapter for tests and static previews.
 * RO:WHY — Lets shared React run without Chrome or Tauri.
 * RO:INTERACTS — settingsPort contract.
 * RO:INVARIANTS — test/display state only.
 */

export function createMemorySettingsAdapter(initialSettings = {}) {
  let settings = { ...initialSettings };

  return {
    async readSettings() {
      return { ...settings };
    },
    async writeSettings(nextSettings) {
      settings = { ...nextSettings };
      return { ...settings };
    }
  };
}
EOF

write_file "packages/crablink-platform/src/chrome/README.md" <<'EOF'
# Chrome adapter lane

Move Chrome-specific wrappers here later.

Allowed:
- chrome.storage wrappers
- extension page/open behavior
- Chrome proof-client compatibility helpers

Forbidden in shared core:
- direct `chrome.*` imports
EOF

write_file "packages/crablink-platform/src/tauri/README.md" <<'EOF'
# Tauri adapter lane

Move Tauri invoke wrappers here later.

Allowed:
- typed invoke wrappers
- native settings adapter
- deep-link adapter
- diagnostics adapter

Forbidden:
- raw shell/eval/native execution commands
- secret-bearing outputs to React
EOF

write_file "scripts/check-tauri.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP="$ROOT/apps/crablink-tauri"

if [[ ! -d "$APP" ]]; then
  echo "missing apps/crablink-tauri; run scripts/scaffold_crablink_tauri.sh first" >&2
  exit 1
fi

cd "$APP"

if [[ ! -d node_modules ]]; then
  npm install
fi

npm run build
cargo check --manifest-path src-tauri/Cargo.toml
EOF

chmod +x scripts/check-tauri.sh

write_file "scripts/smoke-tauri-local-gateway.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

GATEWAY_URL="${GATEWAY_URL:-http://127.0.0.1:8090}"

echo "CrabLink Tauri local gateway smoke"
echo "gateway: $GATEWAY_URL"

curl -fsS "$GATEWAY_URL/healthz" >/dev/null
curl -fsS "$GATEWAY_URL/readyz" >/dev/null || {
  echo "warning: /readyz is not green; continuing because dev stacks may expose health first" >&2
}

echo "gateway smoke: ok"
EOF

chmod +x scripts/smoke-tauri-local-gateway.sh

echo
echo "CrabLink Tauri scaffold complete."
echo
echo "Next commands:"
echo "  bash scripts/check-tauri.sh"
echo "  cd apps/crablink-tauri"
echo "  npm run tauri:dev"
echo
echo "Chrome proof files were not moved or overwritten."
