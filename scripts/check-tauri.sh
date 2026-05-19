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
