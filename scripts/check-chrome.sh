#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHROME_DIR="$ROOT/extensions/chrome"

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
)

for file in "${required_files[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "missing: $file"
    exit 1
  fi
done

echo "CrabLink Chrome extension scaffold looks complete."
