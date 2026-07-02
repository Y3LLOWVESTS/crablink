#!/usr/bin/env bash
# RO:WHAT — Builds a clean text-only CrabLink Tauri app codebundle for review.
# RO:WHY — Tauri-first DX/GOV; AI/code review needs deterministic native-app bundles separate from Chrome.
# RO:INTERACTS — apps/crablink-tauri, packages/crablink-core, packages/crablink-platform, docs/tauri, selected scripts, CODEBUNDLE_TAURI_APP.md.
# RO:INVARIANTS — text source only; no target/dist/node_modules dumps; Chrome proof bundle remains separate in make_codebundle_chrome.sh.
# RO:METRICS — reports text and binary counts in the generated bundle.
# RO:CONFIG — optional first arg sets output path.
# RO:SECURITY — excludes transient artifacts, secrets, local state, generated package-lock noise, and build output.
# RO:TEST — bash -n scripts/make_codebundle.sh && scripts/make_codebundle.sh.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="${1:-$ROOT/CODEBUNDLE_TAURI_APP.md}"

TAURI_APP_DIR="$ROOT/apps/crablink-tauri"
TAURI_DOCS_DIR="$ROOT/docs/tauri"
PACKAGES_DIR="$ROOT/packages"

if [[ ! -d "$TAURI_APP_DIR" ]]; then
  echo "error: expected Tauri app folder at: $TAURI_APP_DIR"
  exit 1
fi

timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

git_rev="unknown"
git_dirty="unknown"

if command -v git >/dev/null 2>&1 && git -C "$ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git_rev="$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo unknown)"

  if [[ -n "$(git -C "$ROOT" status --porcelain 2>/dev/null || true)" ]]; then
    git_dirty="dirty"
  else
    git_dirty="clean"
  fi
fi

lower_path() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]'
}

lang_for_file() {
  local file
  local base

  file="$(lower_path "$1")"
  base="$(basename "$file")"

  case "$base" in
    .gitignore)
      echo "text"
      return 0
      ;;
    cargo.lock)
      echo "toml"
      return 0
      ;;
  esac

  case "$file" in
    *.rs) echo "rust" ;;
    *.js|*.mjs|*.cjs|*.jsx) echo "javascript" ;;
    *.ts|*.mts|*.cts|*.tsx) echo "typescript" ;;
    *.json|*.jsonc) echo "json" ;;
    *.html|*.htm) echo "html" ;;
    *.css) echo "css" ;;
    *.md|*.markdown) echo "markdown" ;;
    *.sh|*.bash|*.zsh) echo "bash" ;;
    *.yml|*.yaml) echo "yaml" ;;
    *.toml) echo "toml" ;;
    *.txt|*.text) echo "text" ;;
    *.xml) echo "xml" ;;
    *.svg) echo "xml" ;;
    *.plist) echo "xml" ;;
    *) echo "text" ;;
  esac
}

is_text_file() {
  local file
  local base

  file="$(lower_path "$1")"
  base="$(basename "$file")"

  case "$base" in
    .gitignore|cargo.lock|cargo.toml|build.rs|package.json|vite.config.js|vite.config.mjs|vite.config.cjs|eslint.config.js|prettier.config.js)
      return 0
      ;;
  esac

  case "$file" in
    *.rs)
      return 0
      ;;
    *.js|*.mjs|*.cjs|*.jsx|*.ts|*.mts|*.cts|*.tsx)
      return 0
      ;;
    *.json|*.jsonc|*.html|*.htm|*.css|*.md|*.markdown|*.sh|*.bash|*.zsh|*.txt|*.text|*.yml|*.yaml|*.toml|*.xml|*.svg|*.plist)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

is_os_or_editor_junk() {
  local file="$1"
  local base
  base="$(basename "$file")"

  case "$base" in
    .DS_Store|Thumbs.db|desktop.ini|Icon$'\r'|*.swp|*.swo|*~)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

is_excluded_path() {
  local rel="$1"

  case "$rel" in
    CODEBUNDLE_TAURI_APP.md|CODEBUNDLE_CHROME_EXTENSION.md)
      return 0
      ;;

    # npm lockfiles are tracked in Git but too noisy for AI review bundles.
    package-lock.json|apps/*/package-lock.json|packages/*/package-lock.json)
      return 0
      ;;

    .git/*|node_modules/*|dist/*|build/*|coverage/*|target/*|.vite/*|.turbo/*)
      return 0
      ;;

    apps/*/node_modules/*|apps/*/dist/*|apps/*/build/*|apps/*/coverage/*|apps/*/.vite/*|apps/*/.turbo/*)
      return 0
      ;;

    apps/*/src-tauri/target/*|apps/*/src-tauri/gen/*|apps/*/src-tauri/.tauri/*)
      return 0
      ;;

    packages/*/node_modules/*|packages/*/dist/*|packages/*/build/*|packages/*/coverage/*|packages/*/.vite/*|packages/*/.turbo/*)
      return 0
      ;;

    docs/tauri/dump/*)
      return 0
      ;;

    scripts/.DS_Store|docs/.DS_Store|docs/tauri/.DS_Store|packages/.DS_Store)
      return 0
      ;;

    *.zip|*.tar|*.tar.gz|*.tgz|*.map)
      return 0
      ;;

    *.sqlite|*.sqlite3|*.db|*.db-shm|*.db-wal|*.sled|*.redb|*.rocksdb)
      return 0
      ;;

    *.pem|*.key|*.p12|*.pfx|*.crt|*.csr|*.token|*.secret)
      return 0
      ;;

    *)
      return 1
      ;;
  esac
}

relative_path() {
  local abs="$1"
  echo "${abs#$ROOT/}"
}

file_size() {
  if stat -f "%z" "$1" >/dev/null 2>&1; then
    stat -f "%z" "$1"
  else
    stat -c "%s" "$1"
  fi
}

hash_file() {
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{print $1}'
  elif command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  else
    echo "sha256-unavailable"
  fi
}

selected_root_files() {
  for file in \
    "$ROOT/README.md" \
    "$ROOT/CHANGELOG.md" \
    "$ROOT/SECURITY.md" \
    "$ROOT/CONTRIBUTING.md" \
    "$ROOT/package.json" \
    "$ROOT/vite.config.js" \
    "$ROOT/.gitignore"
  do
    if [[ -f "$file" ]]; then
      echo "$file"
    fi
  done
}

selected_scripts() {
  for script in \
    "$ROOT/scripts/check-tauri.sh" \
    "$ROOT/scripts/check-quickchain-client-boundary.mjs" \
    "$ROOT/scripts/check-quickchain-paid-cache-boundary.mjs" \
    "$ROOT/scripts/check-internal-roc-paid-content-boundary.mjs" \
    "$ROOT/scripts/check-internal-roc-stabilization-paid-ux.mjs" \
    "$ROOT/scripts/check-internal-roc-stabilization-balance-refresh.mjs" \
    "$ROOT/scripts/check-internal-roc-stabilization-render-lock.mjs" \
    "$ROOT/scripts/check-internal-roc-stabilization-tauri-park.mjs" \
    "$ROOT/scripts/check-internal-roc-phase2-replay-visibility.mjs" \
    "$ROOT/scripts/check-internal-roc-phase4-wallet-receipt-ux.mjs" \
    "$ROOT/scripts/check-internal-roc-phase4-confirmation-failure-ux.mjs" \
    "$ROOT/scripts/check-quickchain-readiness-boundary.mjs" \
    "$ROOT/scripts/check-quickchain-phase1-client-interlock.mjs" \
    "$ROOT/scripts/check-quickchain-phase2-client-replay-boundary.mjs" \
    "$ROOT/scripts/check-quickchain-phase2-committee-boundary.mjs" \
    "$ROOT/scripts/check-quickchain-phase3-client-validator-boundary.mjs" \
    "$ROOT/scripts/check-quickchain-phase3-client-lifecycle-boundary.mjs" \
    "$ROOT/scripts/check-quickchain-phase4-client-bond-boundary.mjs" \
    "$ROOT/scripts/check-quickchain-phase4-client-bond-dispute-boundary.mjs" \
    "$ROOT/scripts/check-quickchain-phase4-client-bond-enforcement-boundary.mjs" \
    "$ROOT/scripts/check-quickchain-phase5-client-anchor-boundary.mjs" \
    "$ROOT/scripts/check-quickchain-phase5-client-da-fallback-boundary.mjs" \
    "$ROOT/scripts/check-quickchain-phase5-client-external-posture-boundary.mjs" \
    "$ROOT/scripts/dev-quickchain-tauri-park.sh" \
    "$ROOT/scripts/dev-internal-roc-beta-phase4-preflight.sh" \
    "$ROOT/scripts/dev-internal-roc-stabilization-paid-ux-preflight.sh" \
    "$ROOT/scripts/dev-internal-roc-stabilization-balance-refresh-preflight.sh" \
    "$ROOT/scripts/dev-internal-roc-stabilization-render-lock-preflight.sh" \
    "$ROOT/scripts/dev-internal-roc-stabilization-tauri-park.sh" \
    "$ROOT/scripts/smoke-tauri-local-gateway.sh" \
    "$ROOT/scripts/migrate_chrome_react_to_tauri.sh" \
    "$ROOT/scripts/scaffold_crablink_tauri.sh" \
    "$ROOT/scripts/make_codebundle.sh"
  do
    if [[ -f "$script" ]]; then
      echo "$script"
    fi
  done
}

candidate_files() {
  selected_root_files

  if [[ -d "$TAURI_DOCS_DIR" ]]; then
    find "$TAURI_DOCS_DIR" \
      \( -name .git \
         -o -name node_modules \
         -o -name dist \
         -o -name build \
         -o -name coverage \
         -o -name .vite \
         -o -name dump \
      \) -prune -o -type f -print 2>/dev/null
  fi

  find "$TAURI_APP_DIR" \
    \( -name .git \
       -o -name node_modules \
       -o -name dist \
       -o -name build \
       -o -name coverage \
       -o -name .vite \
       -o -name .turbo \
       -o -name target \
       -o -name gen \
       -o -name .tauri \
    \) -prune -o -type f -print 2>/dev/null

  if [[ -d "$PACKAGES_DIR" ]]; then
    find "$PACKAGES_DIR" \
      \( -name .git \
         -o -name node_modules \
         -o -name dist \
         -o -name build \
         -o -name coverage \
         -o -name .vite \
         -o -name .turbo \
      \) -prune -o -type f -print 2>/dev/null
  fi

  selected_scripts
}

included_files() {
  local abs
  local rel

  candidate_files | sort -u | while IFS= read -r abs; do
    if [[ ! -f "$abs" ]]; then
      continue
    fi

    if is_os_or_editor_junk "$abs"; then
      continue
    fi

    rel="$(relative_path "$abs")"

    if is_excluded_path "$rel"; then
      continue
    fi

    echo "$abs"
  done
}

text_files() {
  local abs

  included_files | while IFS= read -r abs; do
    if is_text_file "$abs"; then
      echo "$abs"
    fi
  done | sort
}

binary_files() {
  local abs

  included_files | while IFS= read -r abs; do
    if ! is_text_file "$abs"; then
      echo "$abs"
    fi
  done | sort
}

count_stream() {
  awk 'END { print NR + 0 }'
}

append_file_body() {
  local abs="$1"
  local rel
  local lang

  rel="$(relative_path "$abs")"
  lang="$(lang_for_file "$abs")"

  {
    echo
    echo "---"
    echo
    echo "## \`$rel\`"
    echo
    echo "\`\`\`\`$lang"
    cat "$abs"
    echo
    echo "\`\`\`\`"
  } >> "$OUT"
}

append_binary_summary() {
  local abs="$1"
  local rel

  rel="$(relative_path "$abs")"

  {
    echo "- \`$rel\`"
    echo "  - Size bytes: $(file_size "$abs")"
    echo "  - SHA-256: $(hash_file "$abs")"
  } >> "$OUT"
}

emit_file_tree() {
  {
    echo '```text'

    text_files | while IFS= read -r abs; do
      relative_path "$abs"
    done

    if [[ "$(binary_files | count_stream)" != "0" ]]; then
      echo
      echo "# Binary assets omitted from file-body dump:"
      binary_files | while IFS= read -r abs; do
        relative_path "$abs"
      done
    fi

    echo '```'
  } >> "$OUT"
}

text_count="$(text_files | count_stream)"
binary_count="$(binary_files | count_stream)"

{
  echo "<!-- Generated by scripts/make_codebundle.sh on $timestamp -->"
  echo "# Code Bundle — CrabLink Tauri App"
  echo
  echo "> Generated for review/sharing. Source of truth remains the repo."
  echo "> Includes Tauri app source, Tauri Rust command bridge, Tauri IDBs, platform/core migration packages, and selected Tauri scripts."
  echo "> Excludes Chrome extension source, node_modules, dist, target, transient state, secrets, generated npm lockfile bodies, and binary file bodies."
  echo
  echo "- Root: $ROOT"
  echo "- Generated: $timestamp"
  echo "- Git: $git_rev ($git_dirty)"
  echo "- Text files: $text_count"
  echo "- Binary assets omitted: $binary_count"
  echo
  echo "## Scope"
  echo
  echo '```text'
  echo "README.md"
  echo "CHANGELOG.md"
  echo "SECURITY.md"
  echo "CONTRIBUTING.md"
  echo "package.json"
  echo "vite.config.js"
  echo ".gitignore"
  echo "docs/tauri/"
  echo "apps/crablink-tauri/"
  echo "packages/crablink-core/"
  echo "packages/crablink-platform/"
  echo "scripts/check-tauri.sh"
  echo "scripts/check-quickchain-client-boundary.mjs"
  echo "scripts/check-quickchain-paid-cache-boundary.mjs"
  echo "scripts/check-internal-roc-paid-content-boundary.mjs"
  echo "scripts/check-internal-roc-phase2-replay-visibility.mjs"
  echo "scripts/check-internal-roc-phase4-wallet-receipt-ux.mjs"
  echo "scripts/check-internal-roc-phase4-confirmation-failure-ux.mjs"
  echo "scripts/check-quickchain-readiness-boundary.mjs"
  echo "scripts/check-quickchain-phase1-client-interlock.mjs"
  echo "scripts/check-quickchain-phase2-client-replay-boundary.mjs"
  echo "scripts/check-quickchain-phase2-committee-boundary.mjs"
  echo "scripts/check-quickchain-phase3-client-validator-boundary.mjs"
  echo "scripts/check-quickchain-phase3-client-lifecycle-boundary.mjs"
  echo "scripts/check-quickchain-phase4-client-bond-boundary.mjs"
  echo "scripts/check-quickchain-phase4-client-bond-dispute-boundary.mjs"
  echo "scripts/check-quickchain-phase4-client-bond-enforcement-boundary.mjs"
  echo "scripts/check-quickchain-phase5-client-anchor-boundary.mjs"
  echo "scripts/check-quickchain-phase5-client-da-fallback-boundary.mjs"
  echo "scripts/check-quickchain-phase5-client-external-posture-boundary.mjs"
  echo "scripts/dev-quickchain-tauri-park.sh"
  echo "scripts/dev-internal-roc-beta-phase4-preflight.sh"
  echo "scripts/smoke-tauri-local-gateway.sh"
  echo "scripts/scaffold_crablink_tauri.sh"
  echo "scripts/migrate_chrome_react_to_tauri.sh"
  echo "scripts/make_codebundle.sh"
  echo '```'
  echo
  echo "## File Tree"
  echo
} > "$OUT"

emit_file_tree

{
  echo
  echo "## Files"
} >> "$OUT"

text_files | while IFS= read -r abs; do
  append_file_body "$abs"
done

if [[ "$binary_count" != "0" ]]; then
  {
    echo
    echo "---"
    echo
    echo "## Binary assets omitted"
    echo
    echo "_Binary files are intentionally not embedded in this Markdown codebundle._"
    echo
  } >> "$OUT"

  binary_files | while IFS= read -r abs; do
    append_binary_summary "$abs"
  done
fi

echo "wrote: $OUT"
