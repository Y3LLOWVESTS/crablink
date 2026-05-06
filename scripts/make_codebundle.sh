#!/usr/bin/env bash
# RO:WHAT — Builds a clean text-only CrabLink Chrome extension codebundle for review.
# RO:WHY — NEXT_LEVEL DX/GOV; future AI/code review needs deterministic, readable source bundles.
# RO:INTERACTS — extensions/chrome, shared, selected scripts, CODEBUNDLE_CHROME_EXTENSION.md.
# RO:INVARIANTS — text source only; no binary dumps; no OS/editor metadata; source of truth remains repo files.
# RO:METRICS — none.
# RO:CONFIG — optional first arg sets output path.
# RO:SECURITY — excludes transient artifacts and avoids dumping binary/local junk into review bundles.
# RO:TEST — scripts/check-chrome.sh && scripts/package-chrome.sh && scripts/make_codebundle.sh.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="${1:-$ROOT/CODEBUNDLE_CHROME_EXTENSION.md}"
CHROME_DIR="$ROOT/extensions/chrome"
SHARED_DIR="$ROOT/shared"

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

lang_for_file() {
  case "$1" in
    *.js|*.mjs|*.cjs) echo "javascript" ;;
    *.json) echo "json" ;;
    *.html) echo "html" ;;
    *.css) echo "css" ;;
    *.md|*.markdown) echo "markdown" ;;
    *.sh) echo "bash" ;;
    *.yml|*.yaml) echo "yaml" ;;
    *.txt) echo "text" ;;
    *) echo "text" ;;
  esac
}

is_text_file() {
  case "$1" in
    *.js|*.mjs|*.cjs|*.json|*.html|*.css|*.md|*.markdown|*.sh|*.txt|*.yml|*.yaml)
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
    CODEBUNDLE_CHROME_EXTENSION.md|dist/*|node_modules/*|coverage/*|.git/*)
      return 0
      ;;
    extensions/chrome/.DS_Store|extensions/chrome/assets/.DS_Store|extensions/chrome/assets/icons/.DS_Store)
      return 0
      ;;
    extensions/chrome/node_modules/*|extensions/chrome/dist/*|extensions/chrome/coverage/*)
      return 0
      ;;
    shared/node_modules/*|shared/dist/*|shared/coverage/*)
      return 0
      ;;
    scripts/.DS_Store|shared/.DS_Store)
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

candidate_files() {
  find "$CHROME_DIR" "$SHARED_DIR" \
    \( -name .git \
       -o -name node_modules \
       -o -name dist \
       -o -name coverage \
    \) -prune -o -type f -print 2>/dev/null

  for script in \
    "$ROOT/scripts/check-chrome.sh" \
    "$ROOT/scripts/package-chrome.sh" \
    "$ROOT/scripts/smoke-local-gateway.sh" \
    "$ROOT/scripts/smoke-site-create-local.sh" \
    "$ROOT/scripts/green-gate-local.sh" \
    "$ROOT/scripts/make_codebundle.sh"
  do
    if [[ -f "$script" ]]; then
      echo "$script"
    fi
  done
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
  echo "> Includes Chrome extension source plus shared browser-client helpers, schemas, fixtures, and relevant scripts."
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
  echo "extensions/chrome/"
  echo "shared/"
  echo "scripts/check-chrome.sh"
  echo "scripts/package-chrome.sh"
  echo "scripts/smoke-local-gateway.sh"
  echo "scripts/smoke-site-create-local.sh"
  echo "scripts/green-gate-local.sh"
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