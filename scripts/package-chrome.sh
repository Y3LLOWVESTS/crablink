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
OUT="$ROOT/dist"
PACKAGE="$OUT/crablink-extension-chrome.zip"

mkdir -p "$OUT"

python3 - "$ROOT" "$PACKAGE" <<'PY'
import sys
import zipfile
from pathlib import Path

root = Path(sys.argv[1])
package = Path(sys.argv[2])
chrome = root / "extensions" / "chrome"

skip_names = {
    ".DS_Store",
    "Thumbs.db",
}
skip_dirs = {
    "__MACOSX",
    ".git",
    "node_modules",
    "coverage",
    "dist",
}

with zipfile.ZipFile(package, "w", compression=zipfile.ZIP_DEFLATED) as z:
    for path in sorted(chrome.rglob("*")):
        if not path.is_file():
            continue

        rel = path.relative_to(chrome)
        parts = set(rel.parts)

        if path.name in skip_names:
            continue

        if parts & skip_dirs:
            continue

        z.write(path, rel)

print(f"wrote: {package}")
PY