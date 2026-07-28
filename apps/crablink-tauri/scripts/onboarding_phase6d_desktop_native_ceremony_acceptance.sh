#!/usr/bin/env bash
set -u

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
  echo "ONBOARDING_PHASE6D_MANUAL_ACCEPTANCE=ABORTED"
  echo "REASON=TAURI_MANIFEST_NOT_FOUND"
  exit 1
fi

if [ ! -f "$tauri_config" ]; then
  echo "ONBOARDING_PHASE6D_MANUAL_ACCEPTANCE=ABORTED"
  echo "REASON=TAURI_CONFIG_NOT_FOUND"
  exit 1
fi

if [ "$(uname -s)" != "Darwin" ]; then
  echo "ONBOARDING_PHASE6D_MANUAL_ACCEPTANCE=ABORTED"
  echo "REASON=MACOS_DESKTOP_REQUIRED"
  exit 1
fi

echo "ONBOARDING_PHASE6D_MANUAL_ACCEPTANCE=READY"
echo "THIS_WILL_OPEN_NATIVE_RECOVERY_DIALOGS=TWICE"
echo "FIRST_DIALOG_EXPECTED=YES"
echo "SECOND_RUN_DIALOG_EXPECTED=NO"
echo "THIRD_DIALOG_AFTER_MARKER_CLEAR_EXPECTED=YES"
echo "WEBVIEW_SECRET_MATERIAL_EXPECTED=NO"
echo "ROOT_EXPORT_EXPECTED=NO"
echo "DISPLAYED_PHRASE_SOURCE=DETERMINISTIC_TEST_FIXTURE"
echo "DISPLAYED_PHRASE_IS_NOT_A_REAL_PASSPORT=YES"
echo "DO_NOT_USE_DISPLAYED_RECOVERY_WORDS=YES"
printf '%s' "Type RUN_PHASE6D to continue: "

read -r answer

if [ "$answer" != "RUN_PHASE6D" ]; then
  echo "ONBOARDING_PHASE6D_MANUAL_ACCEPTANCE=ABORTED"
  echo "REASON=OPERATOR_DID_NOT_CONFIRM"
  exit 2
fi

CRABLINK_PHASE6D_MANUAL_NATIVE_DIALOG=YES \
TAURI_CONFIG="$(
  cat "$tauri_config"
)" \
cargo test \
  --manifest-path "$manifest" \
  --lib \
  'passport_recovery_phrase_runtime::tests::phase6d_manual_desktop_native_ceremony_first_repeat_and_clear_reset' \
  -- \
  --ignored \
  --nocapture

rc="$?"

if [ "$rc" -eq 0 ]; then
  echo "ONBOARDING_PHASE6D_MANUAL_NATIVE_ACCEPTANCE=GREEN"
  echo "FIRST_RUN_NATIVE_DIALOG_ACCEPTANCE=GREEN"
  echo "SECOND_RUN_NO_DIALOG_ACCEPTANCE=GREEN"
  echo "PASSPORT_CLEAR_REENABLES_CEREMONY_ACCEPTANCE=GREEN"
  echo "WORDS_RETURNED_TO_WEBVIEW=NO"
  echo "ROOT_EXPORT=NO"
else
  echo "ONBOARDING_PHASE6D_MANUAL_NATIVE_ACCEPTANCE=RED"
  echo "NEXT_ACTION=FIX_FIRST_REPORTED_FAILURE"
fi

exit "$rc"
