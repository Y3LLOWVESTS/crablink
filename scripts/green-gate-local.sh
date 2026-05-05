#!/usr/bin/env bash
# RO:WHAT — One-command local green-gate runner for CrabLink Chrome extension and gateway smokes.
# RO:WHY — Locks the proven image/site/NEXT_LEVEL foundation before expanding to post/comment/article primitives.
# RO:INTERACTS — scripts/check-chrome.sh, package-chrome.sh, smoke-local-gateway.sh, smoke-site-create-local.sh, make_codebundle.sh.
# RO:INVARIANTS — default path is non-mutating; ROC-spending smokes require explicit opt-in env flags.
# RO:METRICS — delegates x-correlation-id/x-request-id to child smoke scripts.
# RO:CONFIG — CRABLINK_GREEN_RUN_*, CRABLINK_GREEN_MUTATING, CRABLINK_GREEN_MAKE_CODEBUNDLE, GATEWAY_URL.
# RO:SECURITY — no token persistence; no silent spend; paid upload/site create only run when explicitly enabled.
# RO:TEST — run from crablink repo root with scripts/green-gate-local.sh.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

CRABLINK_GREEN_MUTATING="${CRABLINK_GREEN_MUTATING:-0}"

CRABLINK_GREEN_RUN_BOOTSTRAP="${CRABLINK_GREEN_RUN_BOOTSTRAP:-0}"
CRABLINK_GREEN_RUN_KNOWN_GOOD="${CRABLINK_GREEN_RUN_KNOWN_GOOD:-0}"
CRABLINK_GREEN_RUN_UPLOAD="${CRABLINK_GREEN_RUN_UPLOAD:-0}"
CRABLINK_GREEN_RUN_SITE="${CRABLINK_GREEN_RUN_SITE:-0}"

CRABLINK_GREEN_IMAGE_PRICE="${CRABLINK_GREEN_IMAGE_PRICE:-25}"
CRABLINK_GREEN_SITE_REQUIRE_CRAB_RESOLVE="${CRABLINK_GREEN_SITE_REQUIRE_CRAB_RESOLVE:-1}"
CRABLINK_GREEN_MAKE_CODEBUNDLE="${CRABLINK_GREEN_MAKE_CODEBUNDLE:-1}"

if [[ "$CRABLINK_GREEN_MUTATING" == "1" ]]; then
  CRABLINK_GREEN_RUN_UPLOAD="${CRABLINK_GREEN_RUN_UPLOAD:-1}"
  CRABLINK_GREEN_RUN_SITE="${CRABLINK_GREEN_RUN_SITE:-1}"

  if [[ "${CRABLINK_GREEN_RUN_UPLOAD}" != "1" ]]; then
    CRABLINK_GREEN_RUN_UPLOAD="1"
  fi

  if [[ "${CRABLINK_GREEN_RUN_SITE}" != "1" ]]; then
    CRABLINK_GREEN_RUN_SITE="1"
  fi
fi

cd "$ROOT"

need_file() {
  local file="$1"

  if [[ ! -f "$file" ]]; then
    echo "error: missing required file: $file"
    exit 1
  fi
}

need_executable_script() {
  local file="$1"
  need_file "$file"
  chmod +x "$file"
}

step() {
  local label="$1"
  shift

  echo
  echo "============================================================"
  echo "$label"
  echo "============================================================"
  "$@"
}

skip() {
  local label="$1"
  local reason="$2"

  echo
  echo "skip: $label"
  echo "reason: $reason"
}

need_executable_script "scripts/check-chrome.sh"
need_executable_script "scripts/package-chrome.sh"
need_executable_script "scripts/smoke-local-gateway.sh"
need_executable_script "scripts/smoke-site-create-local.sh"
need_executable_script "scripts/make_codebundle.sh"

echo "CrabLink local green gate"
echo "root:                  $ROOT"
echo "gateway:               ${GATEWAY_URL:-${CRABLINK_GATEWAY_URL:-http://127.0.0.1:8090}}"
echo "mutating shortcut:     $CRABLINK_GREEN_MUTATING"
echo "run bootstrap:         $CRABLINK_GREEN_RUN_BOOTSTRAP"
echo "run known-good raw:    $CRABLINK_GREEN_RUN_KNOWN_GOOD"
echo "run paid image upload: $CRABLINK_GREEN_RUN_UPLOAD"
echo "run site create:       $CRABLINK_GREEN_RUN_SITE"
echo "image price expected:  $CRABLINK_GREEN_IMAGE_PRICE"
echo "site crab hard gate:   $CRABLINK_GREEN_SITE_REQUIRE_CRAB_RESOLVE"
echo "make codebundle:       $CRABLINK_GREEN_MAKE_CODEBUNDLE"

step "1. Static extension checks" \
  scripts/check-chrome.sh

step "2. Chrome package build" \
  scripts/package-chrome.sh

step "3. Non-mutating local gateway smoke" \
  scripts/smoke-local-gateway.sh

if [[ "$CRABLINK_GREEN_RUN_BOOTSTRAP" == "1" ]]; then
  step "4. Optional passport/bootstrap smoke" \
    env CRABLINK_SMOKE_RUN_BOOTSTRAP=1 scripts/smoke-local-gateway.sh
else
  skip "4. Optional passport/bootstrap smoke" "set CRABLINK_GREEN_RUN_BOOTSTRAP=1"
fi

if [[ "$CRABLINK_GREEN_RUN_KNOWN_GOOD" == "1" ]]; then
  step "5. Optional known-good raw preview smoke" \
    env CRABLINK_SMOKE_RUN_KNOWN_GOOD=1 scripts/smoke-local-gateway.sh
else
  skip "5. Optional known-good raw preview smoke" "set CRABLINK_GREEN_RUN_KNOWN_GOOD=1"
fi

if [[ "$CRABLINK_GREEN_RUN_UPLOAD" == "1" ]]; then
  step "6. Optional paid image upload smoke" \
    env \
      CRABLINK_SMOKE_EXPECT_IMAGE_PRICE="$CRABLINK_GREEN_IMAGE_PRICE" \
      CRABLINK_SMOKE_RUN_UPLOAD=1 \
      scripts/smoke-local-gateway.sh
else
  skip "6. Optional paid image upload smoke" "set CRABLINK_GREEN_RUN_UPLOAD=1 or CRABLINK_GREEN_MUTATING=1"
fi

if [[ "$CRABLINK_GREEN_RUN_SITE" == "1" ]]; then
  step "7. Optional site create/open smoke" \
    env \
      CRABLINK_SITE_REQUIRE_CRAB_RESOLVE="$CRABLINK_GREEN_SITE_REQUIRE_CRAB_RESOLVE" \
      scripts/smoke-site-create-local.sh
else
  skip "7. Optional site create/open smoke" "set CRABLINK_GREEN_RUN_SITE=1 or CRABLINK_GREEN_MUTATING=1"
fi

if [[ "$CRABLINK_GREEN_MAKE_CODEBUNDLE" == "1" ]]; then
  step "8. Regenerate codebundle" \
    scripts/make_codebundle.sh
else
  skip "8. Regenerate codebundle" "set CRABLINK_GREEN_MAKE_CODEBUNDLE=1"
fi

echo
echo "============================================================"
echo "CrabLink local green gate passed."
echo "============================================================"
echo
echo "Non-mutating gates proved:"
echo "- static extension checks"
echo "- Chrome package build"
echo "- gateway read/prepare route smoke"
echo
echo "Optional mutating gates run:"
echo "- bootstrap:         $CRABLINK_GREEN_RUN_BOOTSTRAP"
echo "- known-good raw:    $CRABLINK_GREEN_RUN_KNOWN_GOOD"
echo "- paid image upload: $CRABLINK_GREEN_RUN_UPLOAD"
echo "- site create/open:  $CRABLINK_GREEN_RUN_SITE"