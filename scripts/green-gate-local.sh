#!/usr/bin/env bash
# RO:WHAT — One-command local green-gate runner for CrabLink React-primary extension.
# RO:WHY — Locks the refactor/product proof gate before deeper NEXT_LEVEL and QuickChain prerequisite work resumes.
# RO:INTERACTS — npm build, check-react-lane.sh, check-chrome.sh, package-chrome.sh, smoke scripts, make_codebundle.sh.
# RO:INVARIANTS — default path is non-mutating; paid image/site/profile/bootstrap/text publish smokes require explicit opt-in.
# RO:METRICS — child smoke scripts carry gateway correlation/request IDs where applicable.
# RO:CONFIG — CRABLINK_GREEN_RUN_*, CRABLINK_GREEN_MUTATING, CRABLINK_GREEN_MAKE_CODEBUNDLE, GATEWAY_URL.
# RO:SECURITY — no silent ROC spend; no token persistence; no direct internal-service calls from browser code.
# RO:TEST — run from repo root with bash scripts/green-gate-local.sh.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

CRABLINK_GREEN_MUTATING="${CRABLINK_GREEN_MUTATING:-0}"
CRABLINK_GREEN_RUN_GATEWAY="${CRABLINK_GREEN_RUN_GATEWAY:-0}"
CRABLINK_GREEN_RUN_KNOWN_GOOD="${CRABLINK_GREEN_RUN_KNOWN_GOOD:-0}"
CRABLINK_GREEN_RUN_UPLOAD="${CRABLINK_GREEN_RUN_UPLOAD:-0}"
CRABLINK_GREEN_RUN_SITE="${CRABLINK_GREEN_RUN_SITE:-0}"
CRABLINK_GREEN_RUN_PROFILE_CLAIM="${CRABLINK_GREEN_RUN_PROFILE_CLAIM:-0}"
CRABLINK_GREEN_RUN_FIRST_RUN_PROFILE="${CRABLINK_GREEN_RUN_FIRST_RUN_PROFILE:-0}"
CRABLINK_GREEN_RUN_TEXT_ASSETS="${CRABLINK_GREEN_RUN_TEXT_ASSETS:-0}"
CRABLINK_GREEN_RUN_TEXT_PUBLISH="${CRABLINK_GREEN_RUN_TEXT_PUBLISH:-0}"
CRABLINK_GREEN_MAKE_CODEBUNDLE="${CRABLINK_GREEN_MAKE_CODEBUNDLE:-1}"

CRABLINK_GREEN_IMAGE_PRICE="${CRABLINK_GREEN_IMAGE_PRICE:-25}"
CRABLINK_GREEN_SITE_REQUIRE_CRAB_RESOLVE="${CRABLINK_GREEN_SITE_REQUIRE_CRAB_RESOLVE:-1}"

if [[ "$CRABLINK_GREEN_MUTATING" == "1" ]]; then
  CRABLINK_GREEN_RUN_UPLOAD="1"
  CRABLINK_GREEN_RUN_SITE="1"
fi

if [[ "$CRABLINK_GREEN_RUN_TEXT_PUBLISH" == "1" ]]; then
  CRABLINK_GREEN_RUN_TEXT_ASSETS="1"
fi

need_file() {
  local file="$1"

  if [[ ! -f "$file" ]]; then
    echo "error: missing required file: $file"
    exit 1
  fi
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

need_file "package.json"
need_file "vite.config.js"
need_file "scripts/check-react-lane.sh"
need_file "scripts/check-chrome.sh"
need_file "scripts/package-chrome.sh"
need_file "scripts/make_codebundle.sh"
need_file "scripts/smoke-local-gateway.sh"
need_file "scripts/smoke-profile-gateway.sh"
need_file "scripts/smoke-first-run-profile.sh"
need_file "scripts/smoke-site-create-local.sh"
need_file "scripts/smoke-text-assets-local.sh"

echo "CrabLink React-primary green gate"
echo "root:                         $ROOT"
echo "gateway:                      ${GATEWAY_URL:-${CRABLINK_GATEWAY_URL:-http://127.0.0.1:8090}}"
echo "mutating smokes:              $CRABLINK_GREEN_MUTATING"
echo "gateway smoke:                $CRABLINK_GREEN_RUN_GATEWAY"
echo "known-good asset smoke:       $CRABLINK_GREEN_RUN_KNOWN_GOOD"
echo "paid image upload smoke:      $CRABLINK_GREEN_RUN_UPLOAD"
echo "site create smoke:            $CRABLINK_GREEN_RUN_SITE"
echo "profile claim smoke:          $CRABLINK_GREEN_RUN_PROFILE_CLAIM"
echo "first-run profile smoke:      $CRABLINK_GREEN_RUN_FIRST_RUN_PROFILE"
echo "text asset prepare smoke:     $CRABLINK_GREEN_RUN_TEXT_ASSETS"
echo "text asset publish smoke:     $CRABLINK_GREEN_RUN_TEXT_PUBLISH"
echo "make codebundle:              $CRABLINK_GREEN_MAKE_CODEBUNDLE"

step "Vite build" npm run build

step "React lane static/build contract check" env CRABLINK_REACT_SKIP_BUILD=1 bash scripts/check-react-lane.sh

step "Chrome extension static contract check" bash scripts/check-chrome.sh

if [[ "$CRABLINK_GREEN_RUN_GATEWAY" == "1" ]]; then
  step "Gateway smoke" bash scripts/smoke-local-gateway.sh
else
  skip "Gateway smoke" "set CRABLINK_GREEN_RUN_GATEWAY=1 when the RustyOnions stack is running"
fi

if [[ "$CRABLINK_GREEN_RUN_TEXT_ASSETS" == "1" ]]; then
  if [[ "$CRABLINK_GREEN_RUN_TEXT_PUBLISH" == "1" ]]; then
    step "Text asset publish smoke" env CRABLINK_TEXT_RUN_PUBLISH=1 bash scripts/smoke-text-assets-local.sh
  else
    step "Text asset prepare smoke" bash scripts/smoke-text-assets-local.sh
  fi
else
  skip "Text asset smoke" "set CRABLINK_GREEN_RUN_TEXT_ASSETS=1 for prepare, or CRABLINK_GREEN_RUN_TEXT_PUBLISH=1 for publish"
fi

if [[ "$CRABLINK_GREEN_RUN_KNOWN_GOOD" == "1" ]]; then
  step "Known-good asset smoke" env CRABLINK_SMOKE_RUN_KNOWN_GOOD=1 bash scripts/smoke-local-gateway.sh
else
  skip "Known-good asset smoke" "set CRABLINK_GREEN_RUN_KNOWN_GOOD=1 and CRABLINK_SMOKE_KNOWN_GOOD_CRAB_URL=crab://..."
fi

if [[ "$CRABLINK_GREEN_RUN_UPLOAD" == "1" ]]; then
  step "Paid image upload smoke" env \
    CRABLINK_SMOKE_RUN_UPLOAD=1 \
    CRABLINK_SMOKE_EXPECT_IMAGE_PRICE="$CRABLINK_GREEN_IMAGE_PRICE" \
    bash scripts/smoke-local-gateway.sh
else
  skip "Paid image upload smoke" "set CRABLINK_GREEN_RUN_UPLOAD=1, or CRABLINK_GREEN_MUTATING=1"
fi

if [[ "$CRABLINK_GREEN_RUN_SITE" == "1" ]]; then
  step "Site create smoke" env \
    CRABLINK_SITE_REQUIRE_CRAB_RESOLVE="$CRABLINK_GREEN_SITE_REQUIRE_CRAB_RESOLVE" \
    bash scripts/smoke-site-create-local.sh
else
  skip "Site create smoke" "set CRABLINK_GREEN_RUN_SITE=1, or CRABLINK_GREEN_MUTATING=1"
fi

if [[ "$CRABLINK_GREEN_RUN_PROFILE_CLAIM" == "1" ]]; then
  step "Profile gateway smoke" bash scripts/smoke-profile-gateway.sh
else
  skip "Profile gateway smoke" "set CRABLINK_GREEN_RUN_PROFILE_CLAIM=1 when profile backend routes are ready"
fi

if [[ "$CRABLINK_GREEN_RUN_FIRST_RUN_PROFILE" == "1" ]]; then
  step "First-run profile smoke" bash scripts/smoke-first-run-profile.sh
else
  skip "First-run profile smoke" "set CRABLINK_GREEN_RUN_FIRST_RUN_PROFILE=1 when first-run profile routes are ready"
fi

step "Package staged Chrome extension" bash scripts/package-chrome.sh

if [[ "$CRABLINK_GREEN_MAKE_CODEBUNDLE" == "1" ]]; then
  step "Regenerate codebundle" bash scripts/make_codebundle.sh
else
  skip "Codebundle generation" "set CRABLINK_GREEN_MAKE_CODEBUNDLE=1 to regenerate CODEBUNDLE_CHROME_EXTENSION.md"
fi

need_file "dist/chrome-src/react.html"
need_file "dist/chrome-src/page.html"
need_file "dist/chrome-extension-staging/react.html"
need_file "dist/chrome-extension-staging/page.html"
need_file "dist/crablink-extension-chrome.zip"

echo
echo "============================================================"
echo "CrabLink green gate passed"
echo "============================================================"
echo "Load unpacked from:"
echo "  $ROOT/dist/chrome-extension-staging"
echo
echo "Manual staged-extension smoke routes:"
echo "  crab://home"
echo "  crab://library"
echo "  crab://quickchain"
echo "  crab://text"
echo "  crab://site"
echo "  crab://image"
echo "  crab://profile"
echo "  crab://music"
echo "  crab://lyrics"
echo "  crab://article"
echo "  crab://post"
echo "  crab://comment"
echo "  crab://video"
echo "  crab://stream"
echo "  crab://podcast"
echo "  crab://ad"
echo "  crab://algo"
echo "  crab://code"
echo "  crab://game"
echo "  crab://definitely-missing-site"
echo
echo "Final manual proof items:"
echo "  1. Toolbar opens root react.html, not src/react.html."
echo "  2. Passport drawer opens."
echo "  3. Balance chip refreshes without fake ledger truth."
echo "  4. crab://text tracks post/comment/article local proof only after real typed URLs exist."
echo "  5. crab://quickchain remains LOCKED until replay/accounting/rewarder gates are proven."