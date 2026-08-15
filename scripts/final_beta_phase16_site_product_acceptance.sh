# RO:WHAT — Consolidated FINAL_BETA Phase 16 Site Product Acceptance runner.
# RO:WHY — Proves the complete safe Blog/Imageboard/Forum named-Site lifecycle with focused existing product, security, paid-receipt, gateway, manifest, and restart tests.
# RO:INTERACTS — CrabLink Tauri Site tests, paid-access truth checks, Vite, svc-gateway, omnigate, svc-index.
# RO:INVARIANTS — no fake Site truth; no custom code in normal mode; paid unlock requires backend truth; gateway proxy-only; restart uses real sled persistence.
# RO:METRICS — prints deterministic GREEN/RED phase labels only.
# RO:CONFIG — CRABLINK_ROOT and RUSTYONIONS_ROOT may override default local repo paths.
# RO:SECURITY — runner creates no wallet/ledger/Passport authority and performs no live network mutation.
# RO:TEST — run with: bash scripts/final_beta_phase16_site_product_acceptance.sh

CRABLINK_ROOT="${CRABLINK_ROOT:-/Users/mymac/Desktop/crablink}"
RUSTYONIONS_ROOT="${RUSTYONIONS_ROOT:-/Users/mymac/Desktop/RustyOnions}"
TAURI_ROOT="$CRABLINK_ROOT/apps/crablink-tauri"

phase16_failure_count=0
phase16_first_failure=""

run_phase16_step() {
  label="$1"
  working_dir="$2"
  shift 2

  printf '\n%s\n' \
    "=== $label ==="

  (
    cd "$working_dir" || return 1
    "$@"
  )

  step_rc="$?"

  if [ "$step_rc" -eq 0 ]; then
    printf '%s\n' \
      "GREEN=$label"

    return 0
  fi

  phase16_failure_count=$((phase16_failure_count + 1))

  if [ -z "$phase16_first_failure" ]; then
    phase16_first_failure="$label"
  fi

  printf '%s\n' \
    "RED=$label" \
    "STEP_RC=$step_rc"

  return "$step_rc"
}

if [ -d "$TAURI_ROOT" ]; then
  :
else
  printf '%s\n' \
    "FINAL_BETA_PHASE16_SITE_ACCEPTANCE=RED" \
    "REASON=CRABLINK_TAURI_ROOT_MISSING" \
    "ROOT=$TAURI_ROOT"

  return 1 2>/dev/null || true
fi

if [ -d "$RUSTYONIONS_ROOT" ]; then
  :
else
  printf '%s\n' \
    "FINAL_BETA_PHASE16_SITE_ACCEPTANCE=RED" \
    "REASON=RUSTYONIONS_ROOT_MISSING" \
    "ROOT=$RUSTYONIONS_ROOT"

  return 1 2>/dev/null || true
fi

printf '%s\n' \
  "FINAL_BETA_PHASE16_SITE_PRODUCT_ACCEPTANCE=START" \
  "BLOG_TARGET=YES" \
  "IMAGEBOARD_TARGET=YES" \
  "FORUM_TARGET=YES" \
  "CUSTOM_CODE_NORMAL_MODE_TARGET=NO" \
  "NAMED_SITE_RESOLUTION_TARGET=YES" \
  "PAID_SITE_RECEIPT_TARGET=YES" \
  "LIVE_NETWORK_MUTATION=NO" \
  "TAURI_RUST_BUILD=NO"

run_phase16_step \
  "PHASE16_BLOG_PRODUCT_LIFECYCLE" \
  "$TAURI_ROOT" \
  node --test \
    src/pages/site/blogTemplate.test.mjs \
    src/pages/site/siteBlogTemplateRegistration.test.mjs \
    src/pages/site/blogProductFlow.test.mjs \
    src/pages/site/blogReadPresentation.test.mjs \
    src/pages/site/siteBlogLifecycle.test.mjs

blog_rc="$?"

if [ "$blog_rc" -eq 0 ]; then
  :
else
  printf '%s\n' \
    "NEXT_ACTION=FIX_FIRST_PHASE16_BLOG_FAILURE"

  unset -f run_phase16_step
  unset phase16_failure_count
  unset phase16_first_failure
  unset blog_rc
  return 1 2>/dev/null || true
fi

run_phase16_step \
  "PHASE16_IMAGEBOARD_PRODUCT_LIFECYCLE" \
  "$TAURI_ROOT" \
  node --test \
    src/pages/site/siteImageboardTemplateRegistration.test.mjs \
    src/pages/site/imageboardModel.test.mjs \
    src/pages/site/imageboardProductFlow.test.mjs \
    src/pages/site/imageboardReadModel.test.mjs \
    src/pages/site/imageboardRelationReadModel.test.mjs \
    src/pages/site/imageboardReplyPreview.test.mjs \
    src/pages/site/imageboardReaderPresentation.test.mjs

imageboard_rc="$?"

if [ "$imageboard_rc" -eq 0 ]; then
  :
else
  printf '%s\n' \
    "NEXT_ACTION=FIX_FIRST_PHASE16_IMAGEBOARD_FAILURE"

  unset -f run_phase16_step
  unset phase16_failure_count
  unset phase16_first_failure
  unset blog_rc
  unset imageboard_rc
  return 1 2>/dev/null || true
fi

run_phase16_step \
  "PHASE16_FORUM_PRODUCT_LIFECYCLE" \
  "$TAURI_ROOT" \
  node --test \
    src/adapters/sitePublicationAdapter.test.mjs \
    src/pages/site/siteForumTemplateRegistration.test.mjs \
    src/pages/site/forumModel.test.mjs \
    src/pages/site/forumProductFlow.test.mjs \
    src/pages/site/forumSitePublicationReadModel.test.mjs \
    src/pages/site/forumPublicRead.test.mjs \
    src/pages/site/forumReaderPresentation.source.test.mjs

forum_rc="$?"

if [ "$forum_rc" -eq 0 ]; then
  :
else
  printf '%s\n' \
    "NEXT_ACTION=FIX_FIRST_PHASE16_FORUM_FAILURE"

  unset -f run_phase16_step
  unset phase16_failure_count
  unset phase16_first_failure
  unset blog_rc
  unset imageboard_rc
  unset forum_rc
  return 1 2>/dev/null || true
fi

run_phase16_step \
  "PHASE16_TEMPLATE_MIGRATION_SECURITY_SANDBOX" \
  "$TAURI_ROOT" \
  node --test \
    src/pages/site/siteStructuredTemplates.test.mjs \
    src/pages/site/siteTemplateEngine.test.mjs \
    src/pages/site/siteTemplateEngineCloseout.test.mjs \
    src/pages/site/siteTemplateProvenance.test.mjs \
    src/pages/site/siteThemePolicy.test.mjs \
    src/pages/site/siteCustomHtmlPolicy.test.mjs \
    src/pages/site/SiteGuidedSetup.customCodeBoundary.source.test.mjs \
    src/pages/site/siteDeclarativeEmbedPolicy.test.mjs \
    src/pages/site/siteSandboxSecurity.test.mjs

security_rc="$?"

if [ "$security_rc" -eq 0 ]; then
  :
else
  printf '%s\n' \
    "NEXT_ACTION=FIX_FIRST_PHASE16_SECURITY_OR_MIGRATION_FAILURE"

  unset -f run_phase16_step
  unset phase16_failure_count
  unset phase16_first_failure
  unset blog_rc
  unset imageboard_rc
  unset forum_rc
  unset security_rc
  return 1 2>/dev/null || true
fi

run_phase16_step \
  "PHASE16_PAID_SITE_RECEIPT_TRUTH" \
  "$CRABLINK_ROOT" \
  node scripts/check-internal-roc-stabilization-paid-ux.mjs

paid_truth_rc="$?"

if [ "$paid_truth_rc" -eq 0 ]; then
  :
else
  printf '%s\n' \
    "NEXT_ACTION=FIX_FIRST_PHASE16_PAID_RECEIPT_TRUTH_FAILURE"

  unset -f run_phase16_step
  unset phase16_failure_count
  unset phase16_first_failure
  unset blog_rc
  unset imageboard_rc
  unset forum_rc
  unset security_rc
  unset paid_truth_rc
  return 1 2>/dev/null || true
fi

run_phase16_step \
  "PHASE16_PAID_SITE_RENDER_LOCK" \
  "$CRABLINK_ROOT" \
  node scripts/check-internal-roc-stabilization-render-lock.mjs

render_lock_rc="$?"

if [ "$render_lock_rc" -eq 0 ]; then
  :
else
  printf '%s\n' \
    "NEXT_ACTION=FIX_FIRST_PHASE16_RENDER_LOCK_FAILURE"

  unset -f run_phase16_step
  unset phase16_failure_count
  unset phase16_first_failure
  unset blog_rc
  unset imageboard_rc
  unset forum_rc
  unset security_rc
  unset paid_truth_rc
  unset render_lock_rc
  return 1 2>/dev/null || true
fi

run_phase16_step \
  "PHASE16_FRONTEND_PRODUCTION_BUILD" \
  "$TAURI_ROOT" \
  npm run build

vite_rc="$?"

if [ "$vite_rc" -eq 0 ]; then
  :
else
  printf '%s\n' \
    "NEXT_ACTION=FIX_FIRST_PHASE16_FRONTEND_BUILD_FAILURE"

  unset -f run_phase16_step
  unset phase16_failure_count
  unset phase16_first_failure
  unset blog_rc
  unset imageboard_rc
  unset forum_rc
  unset security_rc
  unset paid_truth_rc
  unset render_lock_rc
  unset vite_rc
  return 1 2>/dev/null || true
fi

run_phase16_step \
  "PHASE16_GATEWAY_SITE_ROUTE_PROXY" \
  "$RUSTYONIONS_ROOT" \
  cargo test -p svc-gateway \
    --test product_routes_proxy \
    --test site_visit_routes_proxy

gateway_rc="$?"

if [ "$gateway_rc" -eq 0 ]; then
  :
else
  printf '%s\n' \
    "NEXT_ACTION=FIX_FIRST_PHASE16_GATEWAY_FAILURE"

  unset -f run_phase16_step
  unset phase16_failure_count
  unset phase16_first_failure
  unset blog_rc
  unset imageboard_rc
  unset forum_rc
  unset security_rc
  unset paid_truth_rc
  unset render_lock_rc
  unset vite_rc
  unset gateway_rc
  return 1 2>/dev/null || true
fi

run_phase16_step \
  "PHASE16_OMNIGATE_SITE_AND_RECEIPT" \
  "$RUSTYONIONS_ROOT" \
  cargo test -p omnigate \
    --test final_beta_phase16_site_manifest_shared \
    --test site_launch \
    --test site_visit

omnigate_rc="$?"

if [ "$omnigate_rc" -eq 0 ]; then
  :
else
  printf '%s\n' \
    "NEXT_ACTION=FIX_FIRST_PHASE16_OMNIGATE_FAILURE"

  unset -f run_phase16_step
  unset phase16_failure_count
  unset phase16_first_failure
  unset blog_rc
  unset imageboard_rc
  unset forum_rc
  unset security_rc
  unset paid_truth_rc
  unset render_lock_rc
  unset vite_rc
  unset gateway_rc
  unset omnigate_rc
  return 1 2>/dev/null || true
fi

run_phase16_step \
  "PHASE16_NAMED_SITE_RESTART_RECREATE" \
  "$RUSTYONIONS_ROOT" \
  cargo test -p svc-index \
    --features sled-store \
    --test final_beta_phase16_site_restart_persistence

restart_rc="$?"

if [ "$restart_rc" -eq 0 ]; then
  :
else
  printf '%s\n' \
    "NEXT_ACTION=FIX_FIRST_PHASE16_RESTART_FAILURE"

  unset -f run_phase16_step
  unset phase16_failure_count
  unset phase16_first_failure
  unset blog_rc
  unset imageboard_rc
  unset forum_rc
  unset security_rc
  unset paid_truth_rc
  unset render_lock_rc
  unset vite_rc
  unset gateway_rc
  unset omnigate_rc
  unset restart_rc
  return 1 2>/dev/null || true
fi

if [ "$phase16_failure_count" -eq 0 ]; then
  printf '\n%s\n' \
    "FINAL_BETA_PHASE16_SITE_ACCEPTANCE=GREEN" \
    "BLOG_END_TO_END=GREEN" \
    "IMAGEBOARD_END_TO_END=GREEN" \
    "FORUM_END_TO_END=GREEN" \
    "CUSTOM_CODE_NORMAL_MODE=NO" \
    "SCRIPTLESS_TEMPLATE_ENGINE=GREEN" \
    "TEMPLATE_UPDATE_MIGRATION=GREEN" \
    "MALICIOUS_INPUT_REJECTION=GREEN" \
    "SITE_SANDBOX=GREEN" \
    "GATEWAY_SITE_ROUTES=GREEN" \
    "SHARED_SITE_MANIFEST_PARSER=GREEN" \
    "NAMED_SITE_RESOLUTION=GREEN" \
    "NAMED_SITE_RESTART=GREEN" \
    "NAMED_SITE_RECREATE=GREEN" \
    "PAID_SITE_RECEIPT=GREEN" \
    "PAID_SITE_CACHE_ONLY_UNLOCK=NO" \
    "FRONTEND_PRODUCTION_BUILD=GREEN" \
    "LIVE_NETWORK_MUTATION=NO" \
    "TAURI_RUST_BUILD=NO" \
    "PHASE16_CONSOLIDATED_ACCEPTANCE=GREEN" \
    "NEXT_PHASE=FINAL_BETA_PHASE17_ECONOMIC_PRODUCT_STABILIZATION"
else
  printf '\n%s\n' \
    "FINAL_BETA_PHASE16_SITE_ACCEPTANCE=RED" \
    "FAILURE_COUNT=$phase16_failure_count" \
    "FIRST_FAILURE=$phase16_first_failure" \
    "NEXT_ACTION=FIX_FIRST_PHASE16_ACCEPTANCE_FAILURE"
fi

unset -f run_phase16_step
unset phase16_failure_count
unset phase16_first_failure
unset blog_rc
unset imageboard_rc
unset forum_rc
unset security_rc
unset paid_truth_rc
unset render_lock_rc
unset vite_rc
unset gateway_rc
unset omnigate_rc
unset restart_rc
