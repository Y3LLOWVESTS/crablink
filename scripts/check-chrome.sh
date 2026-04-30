#!/usr/bin/env bash
# RO:WHAT — Local structural checker for the CrabLink Chrome extension.
# RO:WHY — Catch missing files, bad JSON, broad permissions, and obvious popup/client drift before packaging.
# RO:INTERACTS — extensions/chrome, shared/schemas, shared/fixtures.
# RO:INVARIANTS — minimal permissions; gateway-only; no broad host access; no old crab://b3/<hash> UX.
# RO:METRICS — none.
# RO:CONFIG — none.
# RO:SECURITY — blocks risky manifest permissions and broad host permissions.
# RO:TEST — run from crablink repo root with scripts/check-chrome.sh.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHROME_DIR="$ROOT/extensions/chrome"
SHARED_DIR="$ROOT/shared"

required_files=(
  "$CHROME_DIR/manifest.json"
  "$CHROME_DIR/src/background.js"
  "$CHROME_DIR/src/content.js"
  "$CHROME_DIR/src/popup.html"
  "$CHROME_DIR/src/popup.js"
  "$CHROME_DIR/src/options.html"
  "$CHROME_DIR/src/options.js"
  "$CHROME_DIR/src/styles.css"
  "$CHROME_DIR/src/ronClient.js"
  "$CHROME_DIR/src/storage.js"
  "$CHROME_DIR/src/crab.js"
  "$CHROME_DIR/assets/icons/icon16.png"
  "$CHROME_DIR/assets/icons/icon32.png"
  "$CHROME_DIR/assets/icons/icon48.png"
  "$CHROME_DIR/assets/icons/icon128.png"
  "$SHARED_DIR/schemas/asset-page.schema.json"
  "$SHARED_DIR/schemas/site-page.schema.json"
  "$SHARED_DIR/schemas/problem.schema.json"
  "$SHARED_DIR/schemas/extension-settings.schema.json"
  "$SHARED_DIR/schemas/identity-me.schema.json"
  "$SHARED_DIR/schemas/passport-bootstrap.schema.json"
  "$SHARED_DIR/schemas/wallet-balance.schema.json"
  "$SHARED_DIR/fixtures/asset-page.sample.json"
  "$SHARED_DIR/fixtures/site-page.sample.json"
  "$SHARED_DIR/fixtures/problem.not-found.json"
  "$SHARED_DIR/fixtures/problem.policy-denied.json"
  "$SHARED_DIR/fixtures/identity-me.empty.sample.json"
  "$SHARED_DIR/fixtures/identity-me.ready.sample.json"
  "$SHARED_DIR/fixtures/passport-bootstrap.sample.json"
  "$SHARED_DIR/fixtures/wallet-balance.sample.json"
)

for file in "${required_files[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "missing: $file"
    exit 1
  fi
done

python3 - "$ROOT" <<'PY'
import json
import sys
from pathlib import Path

root = Path(sys.argv[1])
chrome = root / "extensions" / "chrome"
shared = root / "shared"

def fail(msg: str) -> None:
    raise SystemExit(f"error: {msg}")

def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")

def load_json(path: Path):
    try:
        with path.open("r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as exc:
        fail(f"invalid JSON in {path}: {exc}")

manifest = load_json(chrome / "manifest.json")

if manifest.get("manifest_version") != 3:
    fail("manifest_version must be 3")

permissions = set(manifest.get("permissions", []))
allowed_permissions = {"storage", "activeTab"}
unexpected_permissions = permissions - allowed_permissions
if unexpected_permissions:
    fail(f"unexpected Chrome permissions: {sorted(unexpected_permissions)}")

host_permissions = set(manifest.get("host_permissions", []))
allowed_hosts = {"http://127.0.0.1:*/*", "http://localhost:*/*"}
unexpected_hosts = host_permissions - allowed_hosts
if unexpected_hosts:
    fail(f"unexpected host permissions: {sorted(unexpected_hosts)}")

blocked_permissions = {
    "<all_urls>",
    "tabs",
    "history",
    "cookies",
    "downloads",
    "webRequest",
    "webRequestBlocking",
    "nativeMessaging",
    "unlimitedStorage",
    "clipboardRead",
}
bad_permissions = permissions & blocked_permissions
if bad_permissions:
    fail(f"blocked permissions present: {sorted(bad_permissions)}")

popup_html = read_text(chrome / "src" / "popup.html")
popup_js = read_text(chrome / "src" / "popup.js")
ron_client = read_text(chrome / "src" / "ronClient.js")
storage_js = read_text(chrome / "src" / "storage.js")
crab_js = read_text(chrome / "src" / "crab.js")
options_html = read_text(chrome / "src" / "options.html")
options_js = read_text(chrome / "src" / "options.js")

required_popup_ids = [
    "nodeBadge",
    "gatewayUrl",
    "passportSubject",
    "walletAccount",
    "rocBalance",
    "checkNodeButton",
    "refreshIdentityButton",
    "openOptionsButton",
    "passportBadge",
    "createPassportButton",
    "refreshBalanceButton",
    "diagnosticsBadge",
    "diagnosticsList",
    "runDiagnosticsButton",
    "crabInput",
    "defaultAssetKind",
    "resolveButton",
    "resultJson",
]
for item in required_popup_ids:
    if f'id="{item}"' not in popup_html:
        fail(f"popup.html missing id={item}")

required_popup_refs = [
    "runDiagnostics",
    "diagnosticDefinitions",
    "client.getIdentity",
    "client.getWalletBalance",
    "client.getB3Asset",
    "client.resolveCrab",
    "client.bootstrapPassport",
]
for item in required_popup_refs:
    if item not in popup_js:
        fail(f"popup.js missing expected reference: {item}")

required_client_methods = [
    "getHealth()",
    "getReady()",
    "getIdentity()",
    "bootstrapPassport(",
    "getWalletBalance(",
    "resolveCrab(",
    "getB3Asset(",
    "resolveSite(",
]
for item in required_client_methods:
    if item not in ron_client:
        fail(f"ronClient.js missing method token: {item}")

required_storage_tokens = [
    "SETTINGS_SCHEMA_VERSION = 2",
    "saveIdentityState",
    "saveBalanceState",
    "extractIdentityState",
    "extractBalanceState",
]
for item in required_storage_tokens:
    if item not in storage_js:
        fail(f"storage.js missing token: {item}")

if "crab://b3/" in crab_js or "crab://b3/" in popup_js or "crab://b3/" in popup_html:
    fail("old crab://b3/<hash> public URL form found")

if "crab://<hash>.image" not in popup_html:
    fail("popup placeholder should preserve crab://<hash>.image style")

required_option_ids = [
    "gatewayUrl",
    "requestTimeoutMs",
    "passportSubject",
    "walletAccount",
    "rocBalanceDisplay",
    "authToken",
    "requireSpendConfirm",
    "devMode",
    "testGatewayButton",
    "refreshIdentityButton",
    "createPassportButton",
    "clearIdentityButton",
    "clearTokenButton",
    "saveButton",
    "resetButton",
]
for item in required_option_ids:
    if f'id="{item}"' not in options_html:
        fail(f"options.html missing id={item}")

for item in ["clearIdentityState", "clearDevToken", "client.bootstrapPassport", "client.getIdentity"]:
    if item not in options_js:
        fail(f"options.js missing token: {item}")

for path in list((shared / "schemas").glob("*.json")) + list((shared / "fixtures").glob("*.json")):
    load_json(path)

print("json/structure checks: ok")
PY

if command -v node >/dev/null 2>&1; then
  node --check "$CHROME_DIR/src/background.js"
  node --check "$CHROME_DIR/src/content.js"
  node --check "$CHROME_DIR/src/crab.js"
  node --check "$CHROME_DIR/src/ronClient.js"
  node --check "$CHROME_DIR/src/storage.js"
  node --check "$CHROME_DIR/src/popup.js"
  node --check "$CHROME_DIR/src/options.js"
  echo "javascript syntax checks: ok"
else
  echo "warning: node not found; skipped JavaScript syntax checks"
fi

echo "CrabLink Chrome extension checks passed."