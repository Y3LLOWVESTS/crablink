#!/usr/bin/env bash
set -euo pipefail

# RO:WHAT — Local CrabLink Tauri static/build check runner.
# RO:WHY — Keeps Tauri-first migration checks reproducible while preserving macOS media dev config.
# RO:INTERACTS — apps/crablink-tauri/package.json, Vite, Tauri Rust crate, macOS media config.
# RO:INVARIANTS — no app launch; no wallet mutation; no gateway mutation; Cargo check must match macos-private-api config.
# RO:SECURITY — installs declared npm deps only; does not print secrets or execute arbitrary user input.
# RO:TEST — bash scripts/check-tauri.sh.

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

npm run check:quickchain-boundary
npm run check:quickchain-paid-cache-boundary
npm run check:quickchain-readiness-boundary
npm run build
npm run check:rust:mac-media
