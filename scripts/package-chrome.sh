#!/usr/bin/env bash
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

with zipfile.ZipFile(package, "w", compression=zipfile.ZIP_DEFLATED) as z:
    for path in chrome.rglob("*"):
        if path.is_file():
            z.write(path, path.relative_to(chrome))

print(f"wrote: {package}")
PY
