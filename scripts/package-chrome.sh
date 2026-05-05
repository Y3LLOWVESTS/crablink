#!/usr/bin/env bash
# RO:WHAT — Packages the Chrome extension as a zip without macOS/editor junk.
# RO:WHY — Produce a clean review/install artifact from extensions/chrome.
# RO:INTERACTS — extensions/chrome, dist/crablink-extension-chrome.zip.
# RO:INVARIANTS — package extension files only; exclude .DS_Store and transient artifacts.
# RO:METRICS — none.
# RO:CONFIG — none.
# RO:SECURITY — does not include repo root secrets or local artifacts.
# RO:TEST — scripts/check-chrome.sh then scripts/package-chrome.sh.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHROME_DIR="$ROOT/extensions/chrome"
OUT="$ROOT/dist"
PACKAGE="$OUT/crablink-extension-chrome.zip"

mkdir -p "$OUT"

if ! command -v zip >/dev/null 2>&1; then
  echo "error: zip is required to package the Chrome extension"
  exit 1
fi

(
  cd "$CHROME_DIR"
  zip -qr "$PACKAGE" . \
    -x '*.DS_Store' \
    -x '__MACOSX/*' \
    -x '.git/*' \
    -x 'node_modules/*' \
    -x 'coverage/*' \
    -x 'dist/*'
)

echo "wrote: $PACKAGE"