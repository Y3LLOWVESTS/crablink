#!/usr/bin/env bash
# RO:WHAT — Retire old vanilla profile/catalog polish modules after React-primary profile shell is green.
# RO:WHY — Moves old catalog/polish/alt UI helpers out of active page.html while keeping core legacy profile/site/image fallback intact.
# RO:INTERACTS — page.html, page-local-catalog.js, page-profile-polish.js, page-alt-vault.js, check scripts, legacy/retired-vanilla.
# RO:INVARIANTS — no hard delete; no site/image paid-flow deletion; core legacy fallback remains buildable.
# RO:SECURITY — file movement and static-check updates only; no backend calls; no wallet mutation.
# RO:TEST — run this script, then bash scripts/green-gate-local.sh and manual staged-extension smoke.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHROME_SRC="$ROOT/extensions/chrome/src"
PAGE_HTML="$CHROME_SRC/page.html"
RETIRED_DIR="$CHROME_SRC/legacy/retired-vanilla"
CHECK_CHROME="$ROOT/scripts/check-chrome.sh"
CHECK_REACT="$ROOT/scripts/check-react-lane.sh"

TARGETS=(
  "page-local-catalog.js"
  "page-profile-polish.js"
  "page-alt-vault.js"
)

cd "$ROOT"

for file in "$PAGE_HTML" "$CHECK_CHROME" "$CHECK_REACT"; do
  if [[ ! -f "$file" ]]; then
    echo "error: missing required file: $file"
    exit 1
  fi
done

mkdir -p "$RETIRED_DIR"

python3 - "$PAGE_HTML" "$CHECK_CHROME" "$CHECK_REACT" "${TARGETS[@]}" <<'PY'
from pathlib import Path
import re
import sys

page_html = Path(sys.argv[1])
check_chrome = Path(sys.argv[2])
check_react = Path(sys.argv[3])
targets = list(sys.argv[4:])

def remove_script_tags(path: Path, targets: list[str]) -> None:
    text = path.read_text(encoding="utf-8")
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
        path.write_text(text, encoding="utf-8")

def patch_check_script(path: Path, targets: list[str]) -> None:
    text = path.read_text(encoding="utf-8")

    # These files should no longer be required as active page.html imports.
    for target in targets:
        text = text.replace(f"  './{target}',\n", "")

    retired_block = "".join(f"  '{target}',\n" for target in targets)
    forbidden_block = "".join(f"  './{target}',\n" for target in targets)

    # Add to the existing retired-file target checks.
    if retired_block not in text:
        anchors = [
            "  'page-podcast-draft.js',\n",
            "  'page-social-stubs.js',\n",
            "  'page-stream-podcast-mode.js',\n",
        ]
        for anchor in anchors:
            if anchor in text:
                text = text.replace(anchor, anchor + retired_block, 1)
                break
        else:
            raise SystemExit(f"error: could not find retired target anchor in {path}")

    # Add to page.html forbidden import checks.
    if forbidden_block not in text:
        anchors = [
            "  './page-podcast-draft.js',\n",
            "  './page-social-stubs.js',\n",
            "  './page-stream-podcast-mode.js',\n",
        ]
        for anchor in anchors:
            if anchor in text:
                text = text.replace(anchor, anchor + forbidden_block, 1)
                break
        else:
            raise SystemExit(f"error: could not find forbidden import anchor in {path}")

    path.write_text(text, encoding="utf-8")

remove_script_tags(page_html, targets)
patch_check_script(check_chrome, targets)
patch_check_script(check_react, targets)

page_text = page_html.read_text(encoding="utf-8")
bad_page_imports = [target for target in targets if f"./{target}" in page_text]
if bad_page_imports:
    raise SystemExit("error: page.html still imports: " + ", ".join(bad_page_imports))

for check_path in [check_chrome, check_react]:
    text = check_path.read_text(encoding="utf-8")

    missing_forbidden = [target for target in targets if f"'./{target}'," not in text]
    missing_retired = [target for target in targets if f"'{target}'," not in text]

    if missing_forbidden:
        raise SystemExit(f"error: {check_path} missing forbidden retired imports: {', '.join(missing_forbidden)}")

    if missing_retired:
        raise SystemExit(f"error: {check_path} missing retired file checks: {', '.join(missing_retired)}")

print("page.html + static checks patched for profile-polish retirement")
PY

for target in "${TARGETS[@]}"; do
  src="$CHROME_SRC/$target"
  dst="$RETIRED_DIR/$target"

  if [[ -f "$dst" ]]; then
    echo "already retired: $target"
    continue
  fi

  if [[ ! -f "$src" ]]; then
    echo "already absent from active src: $target"
    continue
  fi

  if git ls-files --error-unmatch "$src" >/dev/null 2>&1; then
    git mv "$src" "$dst"
  else
    mv "$src" "$dst"
  fi

  echo "retired: $target"
done

python3 - "$PAGE_HTML" "$CHECK_CHROME" "$CHECK_REACT" "$CHROME_SRC" "$RETIRED_DIR" "${TARGETS[@]}" <<'PY'
from pathlib import Path
import sys

page_html = Path(sys.argv[1])
check_chrome = Path(sys.argv[2])
check_react = Path(sys.argv[3])
chrome_src = Path(sys.argv[4])
retired_dir = Path(sys.argv[5])
targets = list(sys.argv[6:])

page_text = page_html.read_text(encoding="utf-8")

bad_imports = [target for target in targets if f"./{target}" in page_text]
if bad_imports:
    raise SystemExit("error: page.html still imports: " + ", ".join(bad_imports))

bad_active = [target for target in targets if (chrome_src / target).exists()]
if bad_active:
    raise SystemExit("error: files still active in src: " + ", ".join(bad_active))

missing_retired = [target for target in targets if not (retired_dir / target).exists()]
if missing_retired:
    raise SystemExit("error: retired files missing from legacy/retired-vanilla: " + ", ".join(missing_retired))

for check_path in [check_chrome, check_react]:
    text = check_path.read_text(encoding="utf-8")
    missing_forbidden = [target for target in targets if f"'./{target}'," not in text]
    missing_retired = [target for target in targets if f"'{target}'," not in text]

    if missing_forbidden:
        raise SystemExit(f"error: {check_path} missing forbidden checks: {', '.join(missing_forbidden)}")

    if missing_retired:
        raise SystemExit(f"error: {check_path} missing retired file checks: {', '.join(missing_retired)}")

print("legacy profile-polish retirement complete")
PY