#!/usr/bin/env bash

set -u

phase11c3_main() {
  local app_root
  local manifest
  local tauri_config
  local app_bundle
  local signing_identity
  local keychain_service
  local recovery_account
  local device_account
  local failures
  local signature_details
  local designated_requirement

  app_root="$(
    cd "$(dirname "$0")/.." &&
    pwd
  )" || return 1

  cd "$app_root" || return 1

  manifest="src-tauri/Cargo.toml"
  tauri_config="src-tauri/tauri.macos.dev-media.conf.json"
  app_bundle="$app_root/src-tauri/target/release/bundle/macos/CrabLink.app"

  signing_identity="CrabLink Local Development Code Signing"

  keychain_service="com.rustyonions.crablink.native-passport.v1"
  recovery_account="recovery-root"
  device_account="device-key"

  failures=0

  phase11c3_fail() {
    local label="$1"

    printf '%s\n' \
      "$label=RED"

    failures=$((failures + 1))
  }

  phase11c3_pass() {
    local label="$1"

    printf '%s\n' \
      "$label=GREEN"
  }

  run_phase11c3_step() {
    local label="$1"
    shift

    printf '\n===== %s =====\n' \
      "$label"

    if "$@"; then
      phase11c3_pass "$label"
    else
      phase11c3_fail "$label"
    fi
  }

  require_phase11c3_pass() {
    local label="$1"
    local prompt="$2"
    local answer

    printf '\n===== %s =====\n' \
      "$label"

    printf '%s\n' \
      "$prompt"

    printf '%s' \
      "Type PASS after confirming this checkpoint, or RED to stop: "

    IFS= read -r answer

    if [ "$answer" = "PASS" ]; then
      phase11c3_pass "$label"
      return 0
    fi

    phase11c3_fail "$label"

    printf '%s\n' \
      "SIGNED_ACCEPTANCE_STOPPED_AT=$label"

    return 1
  }

  keychain_item_state() {
    local account="$1"
    local output
    local rc

    output="$(
      /usr/bin/security find-generic-password \
        -s "$keychain_service" \
        -a "$account" \
        2>&1
    )"
    rc="$?"

    if [ "$rc" -eq 0 ]; then
      printf '%s\n' "present"
      return 0
    fi

    if printf '%s\n' "$output" \
      | grep -qi 'could not be found'
    then
      printf '%s\n' "absent"
      return 0
    fi

    printf '%s\n' "error"
    return 1
  }

  require_keychain_state() {
    local expected="$1"
    local label="$2"
    local recovery_state
    local device_state

    recovery_state="$(
      keychain_item_state "$recovery_account"
    )" || recovery_state="error"

    device_state="$(
      keychain_item_state "$device_account"
    )" || device_state="error"

    printf '%s\n' \
      "${label}_RECOVERY_ROOT=$recovery_state" \
      "${label}_DEVICE_KEY=$device_state"

    if [ "$recovery_state" = "$expected" ] \
      && [ "$device_state" = "$expected" ]
    then
      printf '%s\n' \
        "${label}=GREEN"

      return 0
    fi

    printf '%s\n' \
      "${label}=RED" \
      "${label}_EXPECTED=$expected"

    return 1
  }

  if [ "$(uname -s)" != "Darwin" ]; then
    printf '%s\n' \
      "ONBOARDING_PHASE11C3_PREFLIGHT=RED" \
      "REASON=MACOS_REQUIRED"

    return 1
  fi

  if [ ! -f "$manifest" ] \
    || [ ! -f "$tauri_config" ]
  then
    printf '%s\n' \
      "ONBOARDING_PHASE11C3_PREFLIGHT=RED" \
      "REASON=REQUIRED_BUILD_INPUT_MISSING"

    return 1
  fi

  if ! /usr/bin/security find-identity \
    -v \
    -p codesigning \
    | grep -Fq "\"$signing_identity\""
  then
    printf '%s\n' \
      "ONBOARDING_PHASE11C3_PREFLIGHT=RED" \
      "REASON=LOCAL_SIGNING_IDENTITY_NOT_FOUND"

    return 1
  fi

  printf '%s\n' \
    "ONBOARDING_PHASE11C3_PREFLIGHT=GREEN" \
    "SIGNED_IDENTITY=$signing_identity" \
    "SIGNED_ACCEPTANCE_BUILD=LOCAL_ONLY" \
    "OFFICIAL_RELEASE_BUILD=NO" \
    "DO_NOT_TYPE_PIN_IN_TERMINAL=YES" \
    "DO_NOT_TYPE_RECOVERY_WORDS_IN_TERMINAL=YES" \
    "DO_NOT_DELETE_KEYCHAIN_ITEMS_MANUALLY=YES"

  run_phase11c3_step \
    "ONBOARDING_PHASE11C3_CLEAR_ORDERING_REGRESSION" \
    env \
      TAURI_CONFIG="$(
        cat "$tauri_config"
      )" \
      cargo test \
        --manifest-path "$manifest" \
        --test onboarding_phase11c2b_fail_closed_clear_ordering

  run_phase11c3_step \
    "ONBOARDING_PHASE11C3_FRONTEND_GATE_REGRESSIONS" \
    node --test \
      src/onboarding/startupPassportUnlockGate.test.mjs \
      src/onboarding/signedUsernameAcceptanceFlag.test.mjs \
      src/onboarding/onboardingRouteGate.test.mjs \
      src/onboarding/onboardingDesktopFinalAcceptance.test.mjs

  run_phase11c3_step \
    "ONBOARDING_PHASE11C3_RELEASE_CARGO_CHECK" \
    env \
      TAURI_CONFIG="$(
        cat "$tauri_config"
      )" \
      cargo check \
        --release \
        --manifest-path "$manifest"

  run_phase11c3_step \
    "ONBOARDING_PHASE11C3_SIGNED_APP_BUILD" \
    env \
      VITE_CRABLINK_SIGNED_ONBOARDING_ACCEPTANCE=1 \
      APPLE_SIGNING_IDENTITY="$signing_identity" \
      npm run tauri:build -- \
        --config "$tauri_config" \
        --bundles app

  if [ "$failures" -ne 0 ]; then
    printf '%s\n' \
      "ONBOARDING_PHASE11C3_SIGNED_ACCEPTANCE=RED" \
      "REASON=AUTOMATED_PREFLIGHT_FAILURE"

    return 1
  fi

  if [ ! -d "$app_bundle" ]; then
    printf '%s\n' \
      "ONBOARDING_PHASE11C3_SIGNED_APP_BUNDLE=RED" \
      "REASON=APP_BUNDLE_NOT_FOUND"

    return 1
  fi

  run_phase11c3_step \
    "ONBOARDING_PHASE11C3_STRICT_SIGNATURE" \
    /usr/bin/codesign \
      --verify \
      --deep \
      --strict \
      --verbose=4 \
      "$app_bundle"

  signature_details="$(
    /usr/bin/codesign \
      -dv \
      --verbose=4 \
      "$app_bundle" \
      2>&1
  )"

  if printf '%s\n' "$signature_details" \
      | grep -Fq "Identifier=com.rustyonions.crablink" \
    && printf '%s\n' "$signature_details" \
      | grep -Fq "Authority=$signing_identity"
  then
    phase11c3_pass \
      "ONBOARDING_PHASE11C3_SIGNED_IDENTITY"
  else
    phase11c3_fail \
      "ONBOARDING_PHASE11C3_SIGNED_IDENTITY"
  fi

  designated_requirement="$(
    /usr/bin/codesign \
      -dr - \
      "$app_bundle" \
      2>&1
  )"

  if printf '%s\n' "$designated_requirement" \
    | grep -Fq 'identifier "com.rustyonions.crablink"'
  then
    phase11c3_pass \
      "ONBOARDING_PHASE11C3_DESIGNATED_REQUIREMENT"
  else
    phase11c3_fail \
      "ONBOARDING_PHASE11C3_DESIGNATED_REQUIREMENT"
  fi

  if [ "$failures" -ne 0 ]; then
    printf '%s\n' \
      "ONBOARDING_PHASE11C3_SIGNED_ACCEPTANCE=RED" \
      "REASON=SIGNED_APP_VERIFICATION_FAILURE"

    return 1
  fi

  printf '\n%s\n' \
    "Launching the exact locally signed CrabLink bundle."

  /usr/bin/open -na "$app_bundle" || return 1

  require_phase11c3_pass \
    "ONBOARDING_PHASE11C3_SIGNED_LAUNCH" \
    "Confirm the exact signed release app opened, the development shell is absent, and no macOS authenticity warning appeared." ||
    return 1

  require_phase11c3_pass \
    "ONBOARDING_PHASE11C3_NATIVE_CLEAN_PREFLIGHT" \
    "Refresh Native Passport status. If a disposable Passport exists, clear it through CrabLink. When status becomes no_passport and the completed-onboarding gate appears, select “Reset completed onboarding and return to Welcome.” Confirm Welcome appears. Do not remove Keychain entries manually." ||
    return 1

  require_keychain_state \
    "absent" \
    "ONBOARDING_PHASE11C3_PRECREATE_KEYCHAIN_ABSENCE" ||
    return 1

  require_phase11c3_pass \
    "ONBOARDING_PHASE11C3_CLEAN_WELCOME" \
    "Confirm the clean Welcome screen is visible with no baked username, Passport A/B, visitor-b, starter ROC, PIN field, or recovery words." ||
    return 1

  require_phase11c3_pass \
    "ONBOARDING_PHASE11C3_SIGNED_USERNAME_BYPASS" \
    "Enter a disposable username and use the explicitly labeled signed-acceptance availability bypass. Confirm it does not claim registry ownership." ||
    return 1

  require_phase11c3_pass \
    "ONBOARDING_PHASE11C3_NATIVE_CREATE_PIN" \
    "Create the disposable local Passport. Confirm PIN input appears only in the native hidden-input surface. Do not enter the PIN in this terminal." ||
    return 1

  require_phase11c3_pass \
    "ONBOARDING_PHASE11C3_NATIVE_RECOVERY" \
    "Confirm a native window immediately shows 24 ordered recovery words from this new Passport, with no macOS login-Keychain password prompt. Record disposable words only on temporary paper and acknowledge once." ||
    return 1

  require_phase11c3_pass \
    "ONBOARDING_PHASE11C3_REACT_SECRET_BOUNDARY" \
    "Confirm React never displays, stores, logs, or requests the PIN or recovery words." ||
    return 1

  require_keychain_state \
    "present" \
    "ONBOARDING_PHASE11C3_POSTCREATE_KEYCHAIN_PRESENCE" ||
    return 1

  require_phase11c3_pass \
    "ONBOARDING_PHASE11C3_SAME_PROCESS_UNLOCK" \
    "Continue PIN setup using the same disposable PIN. Confirm same-process operational unlock succeeds without a macOS Keychain password prompt." ||
    return 1

  require_phase11c3_pass \
    "ONBOARDING_PHASE11C3_HOME_HANDOFF" \
    "Complete or skip the safe profile draft and confirm CrabLink reaches crab://home with a local-draft username and no wallet, ledger, capability, or backend-confirmed identity claim." ||
    return 1

  require_phase11c3_pass \
    "ONBOARDING_PHASE11C3_QUIT_FOR_RESTART" \
    "Quit CrabLink completely. Confirm the signed application is no longer running." ||
    return 1

  /usr/bin/open -na "$app_bundle" || return 1

  require_phase11c3_pass \
    "ONBOARDING_PHASE11C3_RESTART_PIN_GATE" \
    "Confirm restart does not mount the normal shell immediately and instead requests operational unlock through the native PIN surface." ||
    return 1

  require_phase11c3_pass \
    "ONBOARDING_PHASE11C3_RESTART_UNLOCK" \
    "Enter the same disposable PIN. Confirm the signed app unlocks through persistent platform storage without an authenticity warning or Mac login-password prompt." ||
    return 1

  require_phase11c3_pass \
    "ONBOARDING_PHASE11C3_PUBLIC_CLEAR" \
    "Open the Passport drawer, select Clear local Passport, and refresh status. Confirm the result is cleared or no_passport, with no PIN, phrase, root, wallet, or ledger request." ||
    return 1

  require_keychain_state \
    "absent" \
    "ONBOARDING_PHASE11C3_POSTCLEAR_KEYCHAIN_ABSENCE" ||
    return 1

  require_phase11c3_pass \
    "ONBOARDING_PHASE11C3_POSTCLEAR_NATIVE_STATE" \
    "Confirm Native Passport status remains no_passport and the completed shell cannot silently regain an operationally unlocked Passport." ||
    return 1

  printf '\n%s\n' \
    "Final browser-state cleanup:"

  printf '%s\n' \
    "Use the already accepted Phase 11B redacted browser/onboarding cleanup procedure." \
    "Do not manually delete Keychain entries." \
    "Quit CrabLink after cleanup, then type PASS."

  require_phase11c3_pass \
    "ONBOARDING_PHASE11C3_REDACTED_BROWSER_RESET" \
    "Confirm only redacted browser/onboarding display state was reset and the signed application was quit." ||
    return 1

  /usr/bin/open -na "$app_bundle" || return 1

  require_phase11c3_pass \
    "ONBOARDING_PHASE11C3_FINAL_SIGNED_WELCOME" \
    "Confirm the exact signed bundle now opens to a clean Welcome screen and Native Passport remains no_passport." ||
    return 1

  require_keychain_state \
    "absent" \
    "ONBOARDING_PHASE11C3_FINAL_KEYCHAIN_ABSENCE" ||
    return 1

  printf '\n===== PHASE 11C3 RESULT =====\n'

  printf '%s\n' \
    "ONBOARDING_PHASE11C3_SIGNED_APP_BUILD=GREEN" \
    "ONBOARDING_PHASE11C3_SIGNATURE_CONTINUITY=GREEN" \
    "ONBOARDING_PHASE11C3_CLEAN_CREATE=GREEN" \
    "ONBOARDING_PHASE11C3_NATIVE_RECOVERY=GREEN" \
    "ONBOARDING_PHASE11C3_SAME_PROCESS_UNLOCK=GREEN" \
    "ONBOARDING_PHASE11C3_RESTART_PIN_GATE=GREEN" \
    "ONBOARDING_PHASE11C3_RESTART_UNLOCK=GREEN" \
    "ONBOARDING_PHASE11C3_PLATFORM_SECRET_CLEAR=GREEN" \
    "ONBOARDING_PHASE11C3_KEYCHAIN_ABSENCE=GREEN" \
    "ONBOARDING_PHASE11C3_FINAL_CLEAN_WELCOME=GREEN" \
    "NO_REACT_PIN=YES" \
    "NO_REACT_RECOVERY_WORDS=YES" \
    "NO_MAC_LOGIN_PASSWORD_PROMPT=YES" \
    "USERNAME_BACKEND_CONFIRMED=NO" \
    "PROFILE_BACKEND_CONFIRMED=NO" \
    "WALLET_OR_LEDGER_MUTATION=NO" \
    "CAPABILITY_ISSUANCE=NO" \
    "ONBOARDING_PHASE11_SIGNED_CLEAN_CREATE_RESTART_UNLOCK_CLEAR=GREEN" \
    "ONBOARDING_PHASE11_PLATFORM_SECRET_CLEAR=GREEN" \
    "ONBOARDING_DESKTOP_FINAL_ACCEPTANCE=GREEN" \
    "NEXT_PATCH=ONBOARDING_PHASE12_CROSS_PLATFORM_CONTRACT" \
    "RUSTYONIONS_MUTATED=NO"

  return 0
}

phase11c3_main "$@"
phase11c3_rc="$?"

unset -f phase11c3_main

exit "$phase11c3_rc"
