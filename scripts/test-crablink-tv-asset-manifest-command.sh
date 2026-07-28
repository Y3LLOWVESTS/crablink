#!/usr/bin/env bash
# RO:WHAT — Runs focused CrabLink TV asset-manifest command tests with a temporary Tauri frontendDist.
# RO:WHY — Raw Tauri cargo tests require the configured dist path even for Rust command tests.
# RO:INTERACTS — apps/crablink-tv/src-tauri and apps/crablink-tv/dist.
# RO:INVARIANTS — creates dist only when absent and removes only the temporary dist it created.
# RO:SECURITY — no network, app build, package generation, wallet, ledger, or deployment behavior.
# RO:TEST — scripts/test-crablink-tv-asset-manifest-command.sh.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST="$ROOT/apps/crablink-tv/dist"
created_dist="NO"

cleanup() {
  if [[ "$created_dist" == "YES" ]]; then
    rm -rf "$DIST"
  fi
}

trap cleanup EXIT HUP INT TERM

printf '%s\n' \
  "CRABLINK_TV_ASSET_MANIFEST_COMMAND_TEST=STARTED"

if [[ ! -d "$DIST" ]]; then
  mkdir -p "$DIST"

  cat > "$DIST/index.html" <<'HTML'
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>CrabLink TV Rust command test</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
HTML

  created_dist="YES"

  printf '%s\n' \
    "TEMP_TAURI_FRONTEND_DIST_CREATED=YES"
else
  printf '%s\n' \
    "TEMP_TAURI_FRONTEND_DIST_CREATED=NO"
fi

cargo test \
  --manifest-path \
  "$ROOT/apps/crablink-tv/src-tauri/Cargo.toml" \
  --offline \
  commands::asset_manifest::tests

printf '%s\n' \
  "CRABLINK_TV_ASSET_MANIFEST_COMMAND_TEST=GREEN"
