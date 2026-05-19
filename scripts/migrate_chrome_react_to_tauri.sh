#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

CHROME_SRC="extensions/chrome/src"
TAURI_SRC="apps/crablink-tauri/src"

if [[ ! -d "$CHROME_SRC/app" ]]; then
  echo "missing $CHROME_SRC/app" >&2
  exit 1
fi

if [[ ! -d "apps/crablink-tauri" ]]; then
  echo "missing apps/crablink-tauri; run the Tauri scaffold first" >&2
  exit 1
fi

mkdir -p "$TAURI_SRC"

echo "Copying Chrome React migration lane into Tauri..."
echo "Chrome source: $CHROME_SRC"
echo "Tauri target:  $TAURI_SRC"
echo

# Keep the old Tauri diagnostic scaffold around for reference.
if [[ -f "$TAURI_SRC/App.jsx" && ! -f "$TAURI_SRC/TauriScaffoldApp.jsx" ]]; then
  cp "$TAURI_SRC/App.jsx" "$TAURI_SRC/TauriScaffoldApp.jsx"
  echo "backed up scaffold App.jsx -> TauriScaffoldApp.jsx"
fi

if [[ -d "$TAURI_SRC/styles" && ! -d "$TAURI_SRC/styles-scaffold" ]]; then
  cp -R "$TAURI_SRC/styles" "$TAURI_SRC/styles-scaffold"
  echo "backed up scaffold styles -> styles-scaffold"
fi

# Copy route-owned React app folders.
rsync -a --delete "$CHROME_SRC/app/" "$TAURI_SRC/app/"
rsync -a --delete "$CHROME_SRC/pages/" "$TAURI_SRC/pages/"
rsync -a --delete "$CHROME_SRC/shared/" "$TAURI_SRC/shared/"

# Copy helper files that the React lane may import through relative paths.
for file in crab.js storage.js ronClient.js styles.css; do
  if [[ -f "$CHROME_SRC/$file" ]]; then
    cp "$CHROME_SRC/$file" "$TAURI_SRC/$file"
    echo "copied helper: $file"
  fi
done

# Copy visual assets used by shell/components.
mkdir -p "$TAURI_SRC/assets"
if [[ -d "extensions/chrome/assets/icons" ]]; then
  rsync -a --delete "extensions/chrome/assets/icons/" "$TAURI_SRC/assets/icons/"
fi

# The copied app/main.jsx expects to live inside src/app and owns createRoot().
# Keep the Tauri Vite entry tiny and import the copied React entry.
cat > "$TAURI_SRC/main.jsx" <<'EOF'
/**
 * RO:WHAT — Tauri Vite entry that mounts the copied CrabLink React shell.
 * RO:WHY — Restores the proven route-owned React frontend inside the native Tauri host.
 * RO:INTERACTS — app/main.jsx copied from extensions/chrome/src/app/main.jsx.
 * RO:INVARIANTS — React remains display/user intent only; backend truth stays behind svc-gateway/Tauri commands.
 * RO:SECURITY — no private keys, wallet truth, ledger truth, fake receipts, or silent spend here.
 */

import './app/main.jsx';
EOF

echo
echo "Running Tauri frontend build..."
cd "$ROOT/apps/crablink-tauri"
npm run build

echo
echo "Migration copy complete."
echo
echo "Next:"
echo "  cd /Users/mymac/Desktop/crablink/apps/crablink-tauri"
echo "  npm run tauri:dev"
