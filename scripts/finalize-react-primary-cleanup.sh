#!/usr/bin/env bash
# RO:WHAT — Finalize CrabLink React-primary cleanup by retiring the remaining old vanilla page lane.
# RO:WHY — Leaves React as the only active browser UI while preserving page.html as a tiny compatibility redirect.
# RO:INTERACTS — page.html, page.js, page.css, remaining page-* files, check scripts, package-chrome.sh.
# RO:INVARIANTS — no hard delete; old files move to legacy/retired-vanilla; root react.html remains primary.
# RO:SECURITY — no backend calls; no wallet mutation; no direct-service changes.
# RO:TEST — run this, then bash scripts/green-gate-local.sh and reload staged extension.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHROME_SRC="$ROOT/extensions/chrome/src"
RETIRED_DIR="$CHROME_SRC/legacy/retired-vanilla"
PAGE_HTML="$CHROME_SRC/page.html"

cd "$ROOT"

if [[ ! -d "$CHROME_SRC" ]]; then
  echo "error: missing $CHROME_SRC"
  exit 1
fi

mkdir -p "$RETIRED_DIR"

cat > "$PAGE_HTML" <<'HTML'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>CrabLink compatibility redirect</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <!--
      RO:WHAT — Compatibility redirect from the retired vanilla lane to the React-primary CrabLink browser.
      RO:WHY — Keeps old page.html URLs from white-screening while removing the old active vanilla app.
      RO:INTERACTS — react.html, background.js, popup.js, package-chrome.sh.
      RO:INVARIANTS — no wallet calls; no backend calls; no fake state; redirect only.
      RO:SECURITY — no untrusted content rendering; no extension privilege handoff.
    -->
    <style>
      :root {
        color-scheme: light dark;
        font-family:
          Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
          sans-serif;
        background: #0a0a0a;
        color: #f7f7f7;
      }

      body {
        min-height: 100vh;
        margin: 0;
        display: grid;
        place-items: center;
      }

      main {
        width: min(520px, calc(100vw - 32px));
        border: 1px solid rgba(255, 255, 255, 0.16);
        border-radius: 22px;
        padding: 24px;
        background: rgba(255, 255, 255, 0.06);
        box-shadow: 0 20px 80px rgba(0, 0, 0, 0.45);
      }

      h1 {
        margin: 0 0 8px;
        font-size: 22px;
      }

      p {
        margin: 0;
        color: #cfcfcf;
        line-height: 1.5;
      }
    </style>
  </head>

  <body>
    <main>
      <h1>Opening CrabLink React…</h1>
      <p>The old vanilla browser lane has been retired. This compatibility page redirects to the React browser.</p>
    </main>

    <script type="module">
      const params = new URLSearchParams(window.location.search);
      const target = params.get("url") || "crab://site";
      const safeTarget = String(target || "crab://site").trim() || "crab://site";

      const reactUrl =
        typeof chrome !== "undefined" && chrome.runtime?.getURL
          ? chrome.runtime.getURL("react.html")
          : new URL("./react.html", window.location.href).href;

      const next = new URL(reactUrl);
      next.searchParams.set("url", safeTarget);

      window.location.replace(next.href);
    </script>
  </body>
</html>
HTML

shopt -s nullglob

TARGETS=(
  "$CHROME_SRC/page.js"
  "$CHROME_SRC/page.css"
  "$CHROME_SRC"/page-*.js
  "$CHROME_SRC"/page-*.css
)

for src in "${TARGETS[@]}"; do
  if [[ ! -f "$src" ]]; then
    continue
  fi

  name="$(basename "$src")"
  dst="$RETIRED_DIR/$name"

  if [[ -f "$dst" ]]; then
    echo "already retired: $name"
    continue
  fi

  if git ls-files --error-unmatch "$src" >/dev/null 2>&1; then
    git mv "$src" "$dst"
  else
    mv "$src" "$dst"
  fi

  echo "retired: $name"
done

python3 - "$CHROME_SRC" "$PAGE_HTML" "$RETIRED_DIR" <<'PY'
from pathlib import Path
import sys

chrome_src = Path(sys.argv[1])
page_html = Path(sys.argv[2])
retired_dir = Path(sys.argv[3])

active_bad = []
for pattern in ["page.js", "page.css", "page-*.js", "page-*.css"]:
    active_bad.extend(path.name for path in chrome_src.glob(pattern))

if active_bad:
    raise SystemExit("error: old active vanilla files still present: " + ", ".join(sorted(active_bad)))

page_text = page_html.read_text(encoding="utf-8")
for forbidden in ["./page.js", "./page-", "./page.css"]:
    if forbidden in page_text:
        raise SystemExit(f"error: page.html still references retired vanilla token: {forbidden}")

for required in ["react.html", "compatibility redirect", "window.location.replace"]:
    if required not in page_text:
        raise SystemExit(f"error: page.html missing compatibility redirect token: {required}")

if not retired_dir.exists():
    raise SystemExit("error: retired-vanilla directory missing")

print("React-primary final cleanup complete")
PY