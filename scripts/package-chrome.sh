#!/usr/bin/env bash
# RO:WHAT — Packages a Chrome extension staging directory with protected legacy and built React lanes.
# RO:WHY — Lets old src/page.html stay protected while react.html runs from a real chrome-extension:// origin.
# RO:INTERACTS — extensions/chrome, dist/chrome-src, dist/chrome-extension-staging, dist/crablink-extension-chrome.zip.
# RO:INVARIANTS — include manifest icons; include Vite react.html/assets; exclude repo secrets, node_modules, and editor junk.
# RO:METRICS — none.
# RO:CONFIG — CRABLINK_PACKAGE_SKIP_BUILD=1 reuses an existing dist/chrome-src build.
# RO:SECURITY — does not package local tokens, private keys, repo root artifacts, or external service secrets.
# RO:TEST — npm run build; scripts/check-react-lane.sh; scripts/check-chrome.sh; scripts/package-chrome.sh.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHROME_DIR="$ROOT/extensions/chrome"
OUT="$ROOT/dist"
VITE_OUT="$OUT/chrome-src"
STAGE="$OUT/chrome-extension-staging"
PACKAGE="$OUT/crablink-extension-chrome.zip"

mkdir -p "$OUT"

if ! command -v zip >/dev/null 2>&1; then
  echo "error: zip is required to package the Chrome extension"
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "error: python3 is required to prepare the staging directory"
  exit 1
fi

if [[ "${CRABLINK_PACKAGE_SKIP_BUILD:-0}" != "1" ]]; then
  npm run build
fi

python3 - "$ROOT" "$CHROME_DIR" "$VITE_OUT" "$STAGE" "$PACKAGE" <<'PY'
from pathlib import Path
import shutil
import sys

root = Path(sys.argv[1])
chrome_dir = Path(sys.argv[2])
vite_out = Path(sys.argv[3])
stage = Path(sys.argv[4])
package = Path(sys.argv[5])

required = [
    chrome_dir / "manifest.json",
    chrome_dir / "src" / "background.js",
    chrome_dir / "src" / "options.html",
    chrome_dir / "src" / "options.js",
    chrome_dir / "assets" / "icons" / "icon16.png",
    chrome_dir / "assets" / "icons" / "icon32.png",
    chrome_dir / "assets" / "icons" / "icon48.png",
    chrome_dir / "assets" / "icons" / "icon128.png",
    vite_out / "react.html",
    vite_out / "page.html",
    vite_out / "assets",
]

missing = [str(path) for path in required if not path.exists()]
if missing:
    raise SystemExit("error: package input missing:\n" + "\n".join(missing))

if stage.exists():
    shutil.rmtree(stage)

if package.exists():
    package.unlink()

stage.mkdir(parents=True, exist_ok=True)

ignore = shutil.ignore_patterns(
    ".DS_Store",
    "__MACOSX",
    ".git",
    "node_modules",
    "coverage",
    "dist",
)

# Copy only the extension source tree pieces Chrome needs.
shutil.copy2(chrome_dir / "manifest.json", stage / "manifest.json")

for dirname in ("src", "assets", "docs", "test"):
    src = chrome_dir / dirname
    if src.exists():
        dst = stage / dirname
        if dst.exists():
            shutil.rmtree(dst)
        shutil.copytree(src, dst, ignore=ignore)

readme = chrome_dir / "README.md"
if readme.exists():
    shutil.copy2(readme, stage / "README.md")

# Overlay built Vite entries at extension root.
# This makes root /react.html work and lets Vite's /assets/... references resolve.
for name in ("react.html", "page.html"):
    shutil.copy2(vite_out / name, stage / name)

vite_assets_dst = stage / "assets" / "vite"
if vite_assets_dst.exists():
    shutil.rmtree(vite_assets_dst)
shutil.copytree(vite_out / "assets", vite_assets_dst)

# Also place a root assets copy for Vite builds that reference /assets/... directly.
# Preserve extension icons by merging, not replacing, the existing assets directory.
root_vite_assets_dst = stage / "assets"
for item in (vite_out / "assets").iterdir():
    target = root_vite_assets_dst / item.name
    if target.exists():
        if target.is_dir():
            shutil.rmtree(target)
        else:
            target.unlink()
    if item.is_dir():
        shutil.copytree(item, target)
    else:
        shutil.copy2(item, target)

# Final manifest-critical checks.
final_required = [
    stage / "manifest.json",
    stage / "assets" / "icons" / "icon16.png",
    stage / "assets" / "icons" / "icon32.png",
    stage / "assets" / "icons" / "icon48.png",
    stage / "assets" / "icons" / "icon128.png",
    stage / "src" / "background.js",
    stage / "src" / "options.html",
    stage / "react.html",
    stage / "page.html",
]

final_missing = [str(path.relative_to(stage)) for path in final_required if not path.exists()]
if final_missing:
    raise SystemExit("error: staged extension is incomplete:\n" + "\n".join(final_missing))

print(f"wrote staging: {stage}")
print("staged icon files:")
for icon in sorted((stage / "assets" / "icons").glob("*.png")):
    print(f"  {icon.relative_to(stage)}")
PY

(
  cd "$STAGE"
  zip -qr "$PACKAGE" . \
    -x '*.DS_Store' \
    -x '__MACOSX/*' \
    -x '.git/*' \
    -x 'node_modules/*' \
    -x 'coverage/*'
)

echo "wrote: $PACKAGE"
echo "load unpacked for React extension-origin testing: $STAGE"