# RO:WHAT — Consolidated FINAL_BETA Phase 17 economic-product acceptance and repeatability runner.
# RO:WHY — Proves paid access, receipts, confirmed ROC, consumer presentation, retry/cancel safety, and repeatable product behavior before QuickChain activation.
# RO:INTERACTS — CrabLink paid-content checks, receipt UX checks, confirmed ROC boundary, consumer receipt presentation, Vite production build.
# RO:INVARIANTS — no silent spend; no failed-payment unlock; cancellation does not mutate; receipts/balances are backend-derived; local cache cannot unlock.
# RO:METRICS — prints deterministic GREEN/RED acceptance labels only.
# RO:CONFIG — CRABLINK_ROOT may override the default repo path.
# RO:SECURITY — no wallet, ledger, finality, Passport, QuickChain, ROX, or Solana mutation authority is added.
# RO:TEST — bash scripts/final_beta_phase17_economic_product_acceptance.sh

CRABLINK_ROOT="${CRABLINK_ROOT:-/Users/mymac/Desktop/crablink}"
TAURI_ROOT="$CRABLINK_ROOT/apps/crablink-tauri"

run_phase17_check() {
  label="$1"
  shift

  printf '\n%s\n' \
    "=== $label ==="

  "$@"
  rc="$?"

  if [ "$rc" -eq 0 ]; then
    printf '%s\n' \
      "GREEN=$label"
    return 0
  fi

  printf '%s\n' \
    "RED=$label" \
    "RC=$rc"

  return "$rc"
}

run_phase17_contract_pass() {
  pass="$1"

  printf '\n%s\n' \
    "=== PHASE17 REPEATABILITY PASS $pass ==="

  run_phase17_check \
    "PHASE17_PASS_${pass}_PAID_CONTENT" \
    npm run check:internal-roc-paid-content-boundary || return 1

  run_phase17_check \
    "PHASE17_PASS_${pass}_PAID_UX" \
    npm run check:internal-roc-stabilization-paid-ux || return 1

  run_phase17_check \
    "PHASE17_PASS_${pass}_BALANCE_REFRESH" \
    npm run check:internal-roc-stabilization-balance-refresh || return 1

  run_phase17_check \
    "PHASE17_PASS_${pass}_RENDER_LOCK" \
    npm run check:internal-roc-stabilization-render-lock || return 1

  run_phase17_check \
    "PHASE17_PASS_${pass}_WALLET_RECEIPT_UX" \
    npm run check:internal-roc-phase4-wallet-receipt-ux || return 1

  run_phase17_check \
    "PHASE17_PASS_${pass}_CONFIRM_CANCEL_FAILURE" \
    npm run check:internal-roc-phase4-confirmation-failure-ux || return 1

  run_phase17_check \
    "PHASE17_PASS_${pass}_CONFIRMED_ROC" \
    npm run check:phase22-confirmed-roc-boundary || return 1

  run_phase17_check \
    "PHASE17_PASS_${pass}_CONSUMER_RECEIPT_PRESENTATION" \
    node --test \
      src/pages/receipts/ReceiptsPage.consumerMode.source.test.mjs || return 1

  printf '%s\n' \
    "PHASE17_REPEATABILITY_PASS_${pass}=GREEN"

  return 0
}

run_final_beta_phase17_economic_product_acceptance() {
  if [ -d "$TAURI_ROOT" ]; then
    :
  else
    printf '%s\n' \
      "FINAL_BETA_PHASE17_ECONOMIC_PRODUCT=RED" \
      "REASON=TAURI_ROOT_MISSING" \
      "ROOT=$TAURI_ROOT"
    return 1
  fi

  cd "$TAURI_ROOT" || return 1

  printf '%s\n' \
    "FINAL_BETA_PHASE17_ECONOMIC_PRODUCT_ACCEPTANCE=START" \
    "REPEATABILITY_PASSES=2" \
    "LIVE_NETWORK_MUTATION=NO" \
    "CARGO_TEST_RUN=NO" \
    "TAURI_BUILD_RUN=NO"

  run_phase17_contract_pass 1
  pass_one_rc="$?"

  if [ "$pass_one_rc" -eq 0 ]; then
    :
  else
    printf '%s\n' \
      "FINAL_BETA_PHASE17_ECONOMIC_PRODUCT=RED" \
      "REPEATABILITY_PASS_1=RED" \
      "REPEATABILITY_PASS_2=NOT_RUN" \
      "FRONTEND_PRODUCTION_BUILD=NOT_RUN" \
      "NEXT_ACTION=FIX_FIRST_PHASE17_REPEATABILITY_FAILURE"
    return "$pass_one_rc"
  fi

  run_phase17_contract_pass 2
  pass_two_rc="$?"

  if [ "$pass_two_rc" -eq 0 ]; then
    :
  else
    printf '%s\n' \
      "FINAL_BETA_PHASE17_ECONOMIC_PRODUCT=RED" \
      "REPEATABILITY_PASS_1=GREEN" \
      "REPEATABILITY_PASS_2=RED" \
      "FRONTEND_PRODUCTION_BUILD=NOT_RUN" \
      "NEXT_ACTION=FIX_FIRST_PHASE17_REPEATABILITY_FAILURE"
    return "$pass_two_rc"
  fi

  run_phase17_check \
    "PHASE17_FRONTEND_PRODUCTION_BUILD" \
    npm run build

  build_rc="$?"

  if [ "$build_rc" -eq 0 ]; then
    :
  else
    printf '%s\n' \
      "FINAL_BETA_PHASE17_ECONOMIC_PRODUCT=RED" \
      "REPEATABILITY_PASS_1=GREEN" \
      "REPEATABILITY_PASS_2=GREEN" \
      "FRONTEND_PRODUCTION_BUILD=RED" \
      "NEXT_ACTION=FIX_FIRST_PHASE17_BUILD_FAILURE"
    return "$build_rc"
  fi

  printf '\n%s\n' \
    "FINAL_BETA_PHASE17_ECONOMIC_PRODUCT=GREEN" \
    "WALLET_ROC_DISPLAY=GREEN" \
    "RECEIPT_LIST_DETAIL=GREEN" \
    "PENDING_CONFIRMED_FAILED_STATES=GREEN" \
    "STALE_OFFLINE_LABELS=GREEN" \
    "RECEIPT_SOURCE_LABELS=GREEN" \
    "CONFIRMED_ROC_REFRESH=GREEN" \
    "SILENT_SPEND=NO" \
    "EXPLICIT_CONFIRMATION=YES" \
    "FAILED_PAYMENT_UNLOCK=NO" \
    "CANCELLED_PAYMENT_MUTATION=NO" \
    "IDEMPOTENT_RETRY=GREEN" \
    "RECEIPT_BACKEND_DERIVED=YES" \
    "CONFIRMED_ROC_BACKEND_DERIVED=YES" \
    "RECEIPT_CACHE_DISPLAY_ONLY=YES" \
    "CACHE_ONLY_UNLOCK=NO" \
    "CONSUMER_RECEIPT_PRESENTATION=GREEN" \
    "ADVANCED_RECEIPT_DETAIL_NORMAL_MODE=NO" \
    "REPEATABILITY_PASS_1=GREEN" \
    "REPEATABILITY_PASS_2=GREEN" \
    "FRONTEND_PRODUCTION_BUILD=GREEN" \
    "LIVE_NETWORK_MUTATION=NO" \
    "CARGO_TEST_RUN=NO" \
    "TAURI_BUILD_RUN=NO" \
    "NEXT_PHASE=FINAL_BETA_PHASE18_QUICKCHAIN_ACTIVATION_FOUNDATION"

  return 0
}

run_final_beta_phase17_economic_product_acceptance
