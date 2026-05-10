#!/usr/bin/env bash
# RO:WHAT — One-command local green-gate runner for CrabLink Chrome extension and gateway smokes.
# RO:WHY — Locks the proven image/site/profile/NEXT_LEVEL foundation before expanding to more asset primitives.
# RO:INTERACTS — scripts/check-chrome.sh, check-react-lane.sh, package-chrome.sh, smoke-local-gateway.sh, smoke-profile-gateway.sh, smoke-first-run-profile.sh, smoke-site-create-local.sh, make_codebundle.sh.
# RO:INVARIANTS — default path is non-mutating; ROC-spending/profile/first-run smokes require explicit opt-in env flags.
# RO:METRICS — delegates x-correlation-id/x-request-id to child smoke scripts.
# RO:CONFIG — CRABLINK_GREEN_RUN_*, CRABLINK_GREEN_MUTATING, CRABLINK_GREEN_MAKE_CODEBUNDLE, GATEWAY_URL.
# RO:SECURITY — no token persistence; no silent spend; paid upload/site create/profile claim/first-run only run when explicitly enabled.
# RO:TEST — run from crablink repo root with scripts/green-gate-local.sh.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

CRABLINK_GREEN_MUTATING="${CRABLINK_GREEN_MUTATING:-0}"

CRABLINK_GREEN_RUN_BOOTSTRAP="${CRABLINK_GREEN_RUN_BOOTSTRAP:-0}"
CRABLINK_GREEN_RUN_PROFILE_CLAIM="${CRABLINK_GREEN_RUN_PROFILE_CLAIM:-0}"
CRABLINK_GREEN_RUN_FIRST_RUN_PROFILE="${CRABLINK_GREEN_RUN_FIRST_RUN_PROFILE:-0}"
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
need_executable_script "scripts/check-react-lane.sh"
need_executable_script "scripts/package-chrome.sh"
need_executable_script "scripts/smoke-local-gateway.sh"
need_executable_script "scripts/smoke-profile-gateway.sh"
need_executable_script "scripts/smoke-first-run-profile.sh"
need_executable_script "scripts/smoke-site-create-local.sh"
need_executable_script "scripts/make_codebundle.sh"

echo "CrabLink local green gate"
echo "root:                  $ROOT"
echo "gateway:               ${GATEWAY_URL:-${CRABLINK_GATEWAY_URL:-http://127.0.0.1:8090}}"
echo "mutating shortcut:     $CRABLINK_GREEN_MUTATING"
echo "run bootstrap:         $CRABLINK_GREEN_RUN_BOOTSTRAP"
echo "run profile claim:     $CRABLINK_GREEN_RUN_PROFILE_CLAIM"
echo "run first-run profile: $CRABLINK_GREEN_RUN_FIRST_RUN_PROFILE"
echo "run known-good raw:    $CRABLINK_GREEN_RUN_KNOWN_GOOD"
echo "run paid image upload: $CRABLINK_GREEN_RUN_UPLOAD"
echo "run site create:       $CRABLINK_GREEN_RUN_SITE"
echo "image price expected:  $CRABLINK_GREEN_IMAGE_PRICE"
echo "site crab hard gate:   $CRABLINK_GREEN_SITE_REQUIRE_CRAB_RESOLVE"
echo "make codebundle:       $CRABLINK_GREEN_MAKE_CODEBUNDLE"
echo "react build/check:    1"

step "1. Static legacy extension checks" \
  scripts/check-chrome.sh

step "2. React/Vite lane checks" \
  scripts/check-react-lane.sh

step "3. Chrome package build" \
  scripts/package-chrome.sh

step "4. Non-mutating local gateway smoke" \
  scripts/smoke-local-gateway.sh

if [[ "$CRABLINK_GREEN_RUN_BOOTSTRAP" == "1" ]]; then
  step "5. Optional passport/bootstrap smoke" \
    env CRABLINK_SMOKE_RUN_BOOTSTRAP=1 scripts/smoke-local-gateway.sh
else
  skip "5. Optional passport/bootstrap smoke" "set CRABLINK_GREEN_RUN_BOOTSTRAP=1"
fi

if [[ "$CRABLINK_GREEN_RUN_PROFILE_CLAIM" == "1" ]]; then
  step "6. Optional gateway profile claim/read smoke" \
    scripts/smoke-profile-gateway.sh
else
  skip "6. Optional gateway profile claim/read smoke" "set CRABLINK_GREEN_RUN_PROFILE_CLAIM=1"
fi

if [[ "$CRABLINK_GREEN_RUN_FIRST_RUN_PROFILE" == "1" ]]; then
  step "7. Optional first-run passport + profile smoke" \
    scripts/smoke-first-run-profile.sh
else
  skip "7. Optional first-run passport + profile smoke" "set CRABLINK_GREEN_RUN_FIRST_RUN_PROFILE=1"
fi

if [[ "$CRABLINK_GREEN_RUN_KNOWN_GOOD" == "1" ]]; then
  step "8. Optional known-good raw preview smoke" \
    env CRABLINK_SMOKE_RUN_KNOWN_GOOD=1 scripts/smoke-local-gateway.sh
else
  skip "8. Optional known-good raw preview smoke" "set CRABLINK_GREEN_RUN_KNOWN_GOOD=1"
fi

if [[ "$CRABLINK_GREEN_RUN_UPLOAD" == "1" ]]; then
  step "9. Optional paid image upload smoke" \
    env \
      CRABLINK_SMOKE_EXPECT_IMAGE_PRICE="$CRABLINK_GREEN_IMAGE_PRICE" \
      CRABLINK_SMOKE_RUN_UPLOAD=1 \
      scripts/smoke-local-gateway.sh
else
  skip "9. Optional paid image upload smoke" "set CRABLINK_GREEN_RUN_UPLOAD=1 or CRABLINK_GREEN_MUTATING=1"
fi

if [[ "$CRABLINK_GREEN_RUN_SITE" == "1" ]]; then
  step "10. Optional site create/open smoke" \
    env \
      CRABLINK_SITE_REQUIRE_CRAB_RESOLVE="$CRABLINK_GREEN_SITE_REQUIRE_CRAB_RESOLVE" \
      scripts/smoke-site-create-local.sh
else
  skip "10. Optional site create/open smoke" "set CRABLINK_GREEN_RUN_SITE=1 or CRABLINK_GREEN_MUTATING=1"
fi

if [[ "$CRABLINK_GREEN_MAKE_CODEBUNDLE" == "1" ]]; then
  step "11. Regenerate codebundle" \
    scripts/make_codebundle.sh
else
  skip "11. Regenerate codebundle" "set CRABLINK_GREEN_MAKE_CODEBUNDLE=1"
fi

echo
echo "============================================================"
echo "CrabLink local green gate passed."
echo "============================================================"
echo
echo "Non-mutating gates proved:"
echo "- static legacy extension checks"
echo "- React/Vite lane checks"
echo "- Chrome package build"
echo "- gateway read/prepare route smoke"
echo
echo "Optional gated smokes run:"
echo "- bootstrap:         $CRABLINK_GREEN_RUN_BOOTSTRAP"
echo "- profile claim:     $CRABLINK_GREEN_RUN_PROFILE_CLAIM"
echo "- first-run profile: $CRABLINK_GREEN_RUN_FIRST_RUN_PROFILE"
echo "- known-good raw:    $CRABLINK_GREEN_RUN_KNOWN_GOOD"
echo "- paid image upload: $CRABLINK_GREEN_RUN_UPLOAD"
echo "- site create/open:  $CRABLINK_GREEN_RUN_SITE"