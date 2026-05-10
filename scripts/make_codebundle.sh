#!/usr/bin/env bash
# RO:WHAT — Builds a clean text-only CrabLink Chrome extension/refactor codebundle for review.
# RO:WHY — NEXT_LEVEL DX/GOV; future AI/code review needs deterministic, readable source bundles.
# RO:INTERACTS — root refactor docs/configs, extensions/chrome, shared, selected scripts, CODEBUNDLE_CHROME_EXTENSION.md.
# RO:INVARIANTS — text source only; no binary dumps; include current green-gate/smoke/scaffold scripts; source of truth remains repo files.
# RO:METRICS — reports text and binary counts in the generated bundle.
# RO:CONFIG — optional first arg sets output path.
# RO:SECURITY — excludes transient artifacts and avoids dumping binary/local junk into review bundles.
# RO:TEST — bash -n scripts/make_codebundle.sh && scripts/make_codebundle.sh.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="${1:-$ROOT/CODEBUNDLE_CHROME_EXTENSION.md}"
CHROME_DIR="$ROOT/extensions/chrome"
SHARED_DIR="$ROOT/shared"
DOCS_DIR="$ROOT/docs"

if [[ ! -d "$CHROME_DIR" ]]; then
  echo "error: expected Chrome extension folder at: $CHROME_DIR"
  exit 1
fi

if [[ ! -d "$SHARED_DIR" ]]; then
  echo "error: expected shared folder at: $SHARED_DIR"
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
  file="$(lower_path "$1")"

  case "$file" in
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
    *) echo "text" ;;
  esac
}

is_text_file() {
  local file
  file="$(lower_path "$1")"

  case "$file" in
    *.js|*.mjs|*.cjs|*.jsx|*.ts|*.mts|*.cts|*.tsx)
      return 0
      ;;
    *.json|*.jsonc|*.html|*.htm|*.css|*.md|*.markdown|*.sh|*.bash|*.zsh|*.txt|*.text|*.yml|*.yaml|*.toml|*.xml|*.svg)
      return 0
      ;;
    package.json|vite.config.js|vite.config.mjs|vite.config.cjs|eslint.config.js|prettier.config.js)
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
    CODEBUNDLE_CHROME_EXTENSION.md)
      return 0
      ;;
    dist/*|node_modules/*|coverage/*|.git/*|.vite/*)
      return 0
      ;;
    extensions/chrome/.DS_Store|extensions/chrome/assets/.DS_Store|extensions/chrome/assets/icons/.DS_Store)
      return 0
      ;;
    extensions/chrome/node_modules/*|extensions/chrome/dist/*|extensions/chrome/coverage/*|extensions/chrome/.vite/*)
      return 0
      ;;
    shared/node_modules/*|shared/dist/*|shared/coverage/*|shared/.vite/*)
      return 0
      ;;
    scripts/.DS_Store|shared/.DS_Store|docs/.DS_Store)
      return 0
      ;;
    *.zip|*.tar|*.tar.gz|*.tgz|*.map)
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
    "$ROOT/vite.config.js"
  do
    if [[ -f "$file" ]]; then
      echo "$file"
    fi
  done
}

selected_scripts() {
  for script in \
    "$ROOT/scripts/check-chrome.sh" \
    "$ROOT/scripts/check-react-lane.sh" \
    "$ROOT/scripts/package-chrome.sh" \
    "$ROOT/scripts/smoke-local-gateway.sh" \
    "$ROOT/scripts/smoke-profile-gateway.sh" \
    "$ROOT/scripts/smoke-first-run-profile.sh" \
    "$ROOT/scripts/smoke-site-create-local.sh" \
    "$ROOT/scripts/green-gate-local.sh" \
    "$ROOT/scripts/scaffold_crablink_refactor.sh" \
    "$ROOT/scripts/make_codebundle.sh"
  do
    if [[ -f "$script" ]]; then
      echo "$script"
    fi
  done
}

candidate_files() {
  selected_root_files

  if [[ -d "$DOCS_DIR" ]]; then
    find "$DOCS_DIR" \
      \( -name .git \
         -o -name node_modules \
         -o -name dist \
         -o -name coverage \
         -o -name .vite \
      \) -prune -o -type f -print 2>/dev/null
  fi

  find "$CHROME_DIR" "$SHARED_DIR" \
    \( -name .git \
       -o -name node_modules \
       -o -name dist \
       -o -name coverage \
       -o -name .vite \
    \) -prune -o -type f -print 2>/dev/null

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
  echo "# Code Bundle — CrabLink Chrome Extension"
  echo
  echo "> Generated for review/sharing. Source of truth remains the repo."
  echo "> Includes root refactor docs/configs, Chrome extension source, shared browser-client helpers, schemas, fixtures, and relevant scripts."
  echo "> Binary assets and OS/editor metadata are intentionally omitted from file-body dumps."
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
  echo "docs/"
  echo "extensions/chrome/"
  echo "shared/"
  echo "scripts/check-chrome.sh"
  echo "scripts/check-react-lane.sh"
  echo "scripts/package-chrome.sh"
  echo "scripts/smoke-local-gateway.sh"
  echo "scripts/smoke-profile-gateway.sh"
  echo "scripts/smoke-first-run-profile.sh"
  echo "scripts/smoke-site-create-local.sh"
  echo "scripts/green-gate-local.sh"
  echo "scripts/scaffold_crablink_refactor.sh"
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