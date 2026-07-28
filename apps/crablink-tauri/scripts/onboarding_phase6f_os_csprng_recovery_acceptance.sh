#!/usr/bin/env bash

# RO:WHAT — Opens recovery dialogs for two independently created temporary OS-CSPRNG-backed Passport vaults.
# RO:WHY — Security acceptance proving the production create wrapper does not reproduce deterministic recovery material.
# RO:INTERACTS — passport_vault_create_runtime, passport_recovery_phrase_runtime, native macOS recovery surface, cargo test.
# RO:INVARIANTS — temporary memory adapters only; no real vault, Keychain, WebView secret, root export, wallet, or ledger mutation.
# RO:SECURITY — displayed words are disposable test material and must not be used as a real recovery phrase.
# RO:TEST — ignored Phase 6F Rust unit test selected below.

set -u

phase6f_main() {
  local script_dir
  local app_root
  local crate
  local manifest
  local tauri_config
  local answer
  local rc

  script_dir="$(
    cd "$(dirname "$0")" &&
    pwd
  )"

  app_root="$(
    cd "$script_dir/.." &&
    pwd
  )"

  crate="$app_root/src-tauri"
  manifest="$crate/Cargo.toml"
  tauri_config="$crate/tauri.macos.dev-media.conf.json"

  if [ ! -f "$manifest" ]; then
    printf '%s\n' \
      "ONBOARDING_PHASE6F_MANUAL_ACCEPTANCE=ABORTED"
    printf '%s\n' \
      "REASON=TAURI_MANIFEST_NOT_FOUND"
    return 1
  fi

  if [ ! -f "$tauri_config" ]; then
    printf '%s\n' \
      "ONBOARDING_PHASE6F_MANUAL_ACCEPTANCE=ABORTED"
    printf '%s\n' \
      "REASON=TAURI_CONFIG_NOT_FOUND"
    return 1
  fi

  if [ "$(uname -s)" != "Darwin" ]; then
    printf '%s\n' \
      "ONBOARDING_PHASE6F_MANUAL_ACCEPTANCE=ABORTED"
    printf '%s\n' \
      "REASON=MACOS_DESKTOP_REQUIRED"
    return 1
  fi

  printf '%s\n' \
    "ONBOARDING_PHASE6F_MANUAL_ACCEPTANCE=READY"

  printf '%s\n' \
    "THIS_WILL_OPEN_NATIVE_RECOVERY_DIALOGS=TWICE"

  printf '%s\n' \
    "DIALOG_ONE_SOURCE=TEMPORARY_OS_CSPRNG_VAULT_A"

  printf '%s\n' \
    "DIALOG_TWO_SOURCE=TEMPORARY_OS_CSPRNG_VAULT_B"

  printf '%s\n' \
    "PHRASES_AND_FINGERPRINTS_MUST_DIFFER=YES"

  printf '%s\n' \
    "CLICK_I_WROTE_IT_DOWN_ONCE_PER_DIALOG=YES"

  printf '%s\n' \
    "REAL_USER_VAULT_TOUCHED=NO"

  printf '%s\n' \
    "MACOS_KEYCHAIN_TOUCHED=NO"

  printf '%s\n' \
    "PERSISTENT_APP_DATA_TOUCHED=NO"

  printf '%s\n' \
    "WEBVIEW_SECRET_MATERIAL_EXPECTED=NO"

  printf '%s\n' \
    "ROOT_EXPORT_EXPECTED=NO"

  printf '%s\n' \
    "DISPLAYED_PHRASES_ARE_DISPOSABLE_TEST_MATERIAL=YES"

  printf '%s\n' \
    "DO_NOT_USE_DISPLAYED_RECOVERY_WORDS=YES"

  printf '%s' \
    "Type RUN_PHASE6F to continue: "

  read -r answer

  if [ "$answer" != "RUN_PHASE6F" ]; then
    printf '%s\n' \
      "ONBOARDING_PHASE6F_MANUAL_ACCEPTANCE=ABORTED"
    printf '%s\n' \
      "REASON=OPERATOR_DID_NOT_CONFIRM"
    return 2
  fi

  CRABLINK_PHASE6F_MANUAL_OS_CSPRNG=YES \
  TAURI_CONFIG="$(
    cat "$tauri_config"
  )" \
  cargo test \
    --manifest-path "$manifest" \
    --lib \
    'passport_recovery_phrase_runtime::tests::phase6f_manual_os_csprng_two_passports_have_distinct_recovery_phrases' \
    -- \
    --ignored \
    --nocapture

  rc="$?"

  if [ "$rc" -eq 0 ]; then
    printf '%s\n' \
      "ONBOARDING_PHASE6F_MANUAL_ACCEPTANCE=GREEN"

    printf '%s\n' \
      "TWO_TEMPORARY_OS_CSPRNG_VAULTS_CREATED=YES"

    printf '%s\n' \
      "TWO_NATIVE_RECOVERY_DIALOGS_SHOWN=YES"

    printf '%s\n' \
      "RECOVERY_FINGERPRINTS_DISTINCT=GREEN"

    printf '%s\n' \
      "PRODUCTION_OS_RANDOM_CREATE_WRAPPER_USED=YES"

    printf '%s\n' \
      "REAL_USER_VAULT_TOUCHED=NO"

    printf '%s\n' \
      "MACOS_KEYCHAIN_TOUCHED=NO"

    printf '%s\n' \
      "WORDS_RETURNED_TO_WEBVIEW=NO"

    printf '%s\n' \
      "ROOT_EXPORT=NO"

    printf '%s\n' \
      "WALLET_OR_LEDGER_MUTATION=NO"
  else
    printf '%s\n' \
      "ONBOARDING_PHASE6F_MANUAL_ACCEPTANCE=RED"

    printf '%s\n' \
      "NEXT_ACTION=FIX_FIRST_REPORTED_FAILURE"
  fi

  return "$rc"
}

phase6f_main "$@"
phase6f_rc="$?"

unset -f phase6f_main

if [ "$phase6f_rc" -ne 0 ]; then
  false
else
  true
fi
