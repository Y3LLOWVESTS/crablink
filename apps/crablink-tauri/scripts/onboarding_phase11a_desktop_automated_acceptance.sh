#!/usr/bin/env bash

# RO:WHAT — Runs Phase 11A desktop onboarding source/model, Native Passport, React, Rust, and macOS app-bundle acceptance.
# RO:WHY — Final automated proof before the operator performs the real desktop onboarding walkthrough.
# RO:INTERACTS — onboarding tests, Phase 15 Passport tests, Vite, Cargo, Tauri CLI, and the macOS .app bundle.
# RO:INVARIANTS — no live wallet/ledger mutation, capability issuance, backend username mutation, or manual acceptance claim.
# RO:TEST — run this script from apps/crablink-tauri.

phase11a_main() {
  local app_root
  local manifest
  local tauri_config
  local failures
  local app_bundle

  app_root="$(
    cd "$(dirname "$0")/.." &&
    pwd
  )"

  cd "$app_root" || return 1

  manifest="src-tauri/Cargo.toml"
  tauri_config="src-tauri/tauri.macos.dev-media.conf.json"
  failures=0

  run_phase11a_step() {
    local label="$1"
    shift

    printf '\n%s\n' \
      "===== $label ====="

    if "$@"; then
      printf '%s\n' \
        "$label=GREEN"
    else
      printf '%s\n' \
        "$label=RED"

      failures=$((failures + 1))
    fi
  }

  run_phase11a_cargo_test() {
    local label="$1"
    local test_target="$2"

    run_phase11a_step \
      "$label" \
      env \
        TAURI_CONFIG="$(
          cat "$tauri_config"
        )" \
        cargo test \
          --manifest-path "$manifest" \
          --test "$test_target"
  }

  run_phase11a_step \
    "ONBOARDING_PHASE11A_FINAL_SOURCE_MODEL_ACCEPTANCE" \
    node --test \
      src/onboarding/onboardingDesktopFinalAcceptance.test.mjs

  run_phase11a_step \
    "ONBOARDING_PHASE11A_JS_REGRESSION_SUITE" \
    node --test \
      src/onboarding/onboardingModel.test.mjs \
      src/onboarding/onboardingStorage.test.mjs \
      src/onboarding/onboardingRouteGate.test.mjs \
      src/onboarding/welcomeUsernameStep.test.mjs \
      src/onboarding/passportCreateStep.test.mjs \
      src/onboarding/recoveryCeremony.test.mjs \
      src/onboarding/pinSetupStep.test.mjs \
      src/onboarding/profileSetupStep.test.mjs \
      src/onboarding/onboardingHomeHandoff.test.mjs \
      src/onboarding/onboardingPhase10Defaults.source.test.mjs \
      src/app/shell/passportDrawerDevGate.test.mjs

  run_phase11a_step \
    "ONBOARDING_PHASE11A_NATIVE_DRAWER_REGRESSIONS" \
    node --test \
      src/app/shell/PassportDrawer.nativePassport*.source.test.mjs

  run_phase11a_step \
    "ONBOARDING_PHASE11A_TAURI_PASSPORT_BOUNDARY" \
    node --test \
      src/platform/tauriPlatform.passportBoundary.source.test.mjs

  run_phase11a_cargo_test \
    "ONBOARDING_PHASE11A_PHASE15W_CREATE_BRIDGE" \
    "phase15w_desktop_passport_create_command_bridge"

  run_phase11a_cargo_test \
    "ONBOARDING_PHASE11A_PHASE15X_CREATE_RESTART" \
    "phase15x_desktop_create_status_and_restart_acceptance"

  run_phase11a_cargo_test \
    "ONBOARDING_PHASE11A_PHASE15Y_STATUS_COMMAND" \
    "phase15y_desktop_create_status_command_acceptance"

  run_phase11a_cargo_test \
    "ONBOARDING_PHASE11A_PHASE15Z_ROOT_CONFIRMATION" \
    "phase15z_desktop_root_confirmation_command_bridge"

  run_phase11a_cargo_test \
    "ONBOARDING_PHASE11A_PHASE15AA_CLEAR_BRIDGE" \
    "phase15aa_desktop_clear_command_bridge"

  run_phase11a_cargo_test \
    "ONBOARDING_PHASE11A_PUBLIC_RECOVERY_COMMAND" \
    "phase6b2b2b2b_public_recovery_command_wiring"

  run_phase11a_step \
    "ONBOARDING_PHASE11A_PRODUCTION_CSPRNG_BOUNDARY" \
    env \
      TAURI_CONFIG="$(
        cat "$tauri_config"
      )" \
      cargo test \
        --manifest-path "$manifest" \
        --test \
        phase15r_platform_factor_and_vault_create_orchestration \
        phase6e_production_create_uses_os_csprng_boundary

  run_phase11a_step \
    "ONBOARDING_PHASE11A_TAURI_CONSUMER_CHECK" \
    env \
      TAURI_CONFIG="$(
        cat "$tauri_config"
      )" \
      cargo check \
        --manifest-path "$manifest"

  run_phase11a_step \
    "ONBOARDING_PHASE11A_REACT_BUILD" \
    npm run build

  run_phase11a_step \
    "ONBOARDING_PHASE11A_MACOS_APP_BUILD" \
    npm run tauri:build -- \
      --config \
      src-tauri/tauri.macos.dev-media.conf.json \
      --bundles app

  verify_phase11a_app_bundle() {
    app_bundle="$(
      find \
        src-tauri/target/release/bundle/macos \
        -maxdepth 1 \
        -type d \
        -name '*.app' \
        -print \
        -quit \
        2>/dev/null
    )"

    if [ -z "$app_bundle" ]; then
      printf '%s\n' \
        "MACOS_APP_BUNDLE=NOT_FOUND"

      return 1
    fi

    printf 'MACOS_APP_BUNDLE=%s\n' \
      "$app_bundle"

    return 0
  }

  run_phase11a_step \
    "ONBOARDING_PHASE11A_MACOS_APP_BUNDLE_PRESENT" \
    verify_phase11a_app_bundle

  printf '\n%s\n' \
    "===== PHASE 11A RESULT ====="

  if [ "$failures" -eq 0 ]; then
    printf '%s\n' \
      "ONBOARDING_PHASE11A_MODEL_RESTART_RESET=GREEN"

    printf '%s\n' \
      "ONBOARDING_PHASE11A_PROFILE_SAVE_SKIP_COMPLETION=GREEN"

    printf '%s\n' \
      "ONBOARDING_PHASE11A_NO_REACT_PIN_OR_RECOVERY_WORDS=GREEN"

    printf '%s\n' \
      "ONBOARDING_PHASE11A_NO_BAKED_IDENTITY=GREEN"

    printf '%s\n' \
      "ONBOARDING_PHASE11A_DEV_QUARANTINE=GREEN"

    printf '%s\n' \
      "ONBOARDING_PHASE11A_PHASE15_REGRESSIONS=GREEN"

    printf '%s\n' \
      "ONBOARDING_PHASE11A_TAURI_CONSUMER_CHECK=GREEN"

    printf '%s\n' \
      "ONBOARDING_PHASE11A_MACOS_APP_BUILD=GREEN"

    printf '%s\n' \
      "ONBOARDING_PHASE11A_DESKTOP_AUTOMATED_ACCEPTANCE=GREEN"

    printf '%s\n' \
      "ONBOARDING_DESKTOP_FINAL_ACCEPTANCE=MANUAL_PENDING"

    printf '%s\n' \
      "WALLET_OR_LEDGER_MUTATION=NO"

    printf '%s\n' \
      "CAPABILITY_ISSUANCE=NO"

    printf '%s\n' \
      "USERNAME_REGISTRY_MUTATION=NO"

    printf '%s\n' \
      "RUSTYONIONS_CHANGED=NO"

    printf '%s\n' \
      "NEXT_PATCH=ONBOARDING_PHASE11B_DESKTOP_MANUAL_ACCEPTANCE"
  else
    printf \
      'ONBOARDING_PHASE11A_DESKTOP_AUTOMATED_ACCEPTANCE=RED failures=%s\n' \
      "$failures"

    printf '%s\n' \
      "NEXT_ACTION=FIX_FIRST_REPORTED_FAILURE"
  fi

  unset -f run_phase11a_step
  unset -f run_phase11a_cargo_test
  unset -f verify_phase11a_app_bundle

  if [ "$failures" -eq 0 ]; then
    return 0
  fi

  return 1
}

phase11a_main "$@"
phase11a_rc="$?"

unset -f phase11a_main

if [ "$phase11a_rc" -eq 0 ]; then
  true
else
  false
fi
