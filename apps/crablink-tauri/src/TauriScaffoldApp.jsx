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
