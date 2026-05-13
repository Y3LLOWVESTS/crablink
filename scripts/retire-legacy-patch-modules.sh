#!/usr/bin/env bash
# RO:WHAT — Retire old vanilla CrabLink patch modules after React-primary cutover.
# RO:WHY — Removes late DOM patch/rescue scripts from page.html before moving them so Vite cannot fail on missing imports.
# RO:INTERACTS — extensions/chrome/src/page.html, old page-* patch modules, legacy/retired-vanilla, check scripts.
# RO:INVARIANTS — no hard delete; React-primary path remains root react.html; legacy page.html remains buildable.
# RO:SECURITY — file movement only; no network; no credentials; no backend mutation.
# RO:TEST — run this, then npm run build, check-react-lane, check-chrome, package-chrome, make_codebundle.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHROME_SRC="$ROOT/extensions/chrome/src"
PAGE_HTML="$CHROME_SRC/page.html"
RETIRED_DIR="$CHROME_SRC/legacy/retired-vanilla"

TARGETS=(
  "page-creator-route-guard.js"
  "page-lifecycle-settler.js"
  "page-next-level-panels.js"
  "page-music-rights.js"
  "page-stream-podcast-mode.js"
  "page-social-stubs.js"
)

cd "$ROOT"

if [[ ! -f "$PAGE_HTML" ]]; then
  echo "error: missing $PAGE_HTML"
  exit 1
fi

mkdir -p "$RETIRED_DIR"

python3 - "$PAGE_HTML" "${TARGETS[@]}" <<'PY'
import re
import sys
from pathlib import Path

page = Path(sys.argv[1])
targets = set(sys.argv[2:])
text = page.read_text(encoding="utf-8")
before = text

for target in targets:
    escaped = re.escape("./" + target)

    patterns = [
        rf"\n\s*<script\s+type=[\"']module[\"']\s+src=[\"']{escaped}[\"']\s*>\s*</script>\s*",
        rf"\n\s*<script\s+src=[\"']{escaped}[\"']\s+type=[\"']module[\"']\s*>\s*</script>\s*",
        rf"\n\s*<script\s+src=[\"']{escaped}[\"']\s*>\s*</script>\s*",
    ]

    for pattern in patterns:
        text = re.sub(pattern, "\n", text, flags=re.IGNORECASE)

if text != before:
    page.write_text(text, encoding="utf-8")

remaining = [target for target in targets if f'./{target}' in text]
if remaining:
    print("error: page.html still imports retired modules:", ", ".join(remaining))
    sys.exit(1)

print("page.html retire imports: ok")
PY

for target in "${TARGETS[@]}"; do
  src="$CHROME_SRC/$target"
  dst="$RETIRED_DIR/$target"

  if [[ -f "$dst" ]]; then
    echo "already retired: $target"
    continue
  fi

  if [[ ! -f "$src" ]]; then
    echo "already absent from src: $target"
    continue
  fi

  if git ls-files --error-unmatch "$src" >/dev/null 2>&1; then
    git mv "$src" "$dst"
  else
    mv "$src" "$dst"
  fi

  echo "retired: $target"
done

python3 - "$PAGE_HTML" "${TARGETS[@]}" <<'PY'
import sys
from pathlib import Path

page = Path(sys.argv[1])
targets = sys.argv[2:]
text = page.read_text(encoding="utf-8")

bad = [target for target in targets if f'./{target}' in text]
if bad:
    print("error: page.html still imports:", ", ".join(bad))
    sys.exit(1)

print("legacy patch module retire batch complete")
PY