#!/usr/bin/env bash

# RO:WHAT — Records the human Phase 11B CrabLink desktop onboarding walkthrough.
# RO:WHY — Automated tests cannot prove that the native PIN and recovery windows visibly work for a human operator.
# RO:INTERACTS — Tauri development runtime, Native Passport commands, onboarding local storage, Passport drawer, and the built macOS app.
# RO:INVARIANTS — no phrase or PIN is entered into this terminal; final green requires explicit human confirmation of every checkpoint.
# RO:SECURITY — stop immediately if an existing Passport contains anything the operator intends to preserve.

phase11b_main() {
  local app_root
  local app_bundle
  local tauri_config
  local failures

  app_root="$(
    cd "$(dirname "$0")/.." &&
    pwd
  )" || return 1

  cd "$app_root" || return 1

  app_bundle="$app_root/src-tauri/target/release/bundle/macos/CrabLink.app"
  tauri_config="src-tauri/tauri.macos.dev-media.conf.json"
  failures=0

  phase11b_fail() {
    local label="$1"

    printf '%s\n' \
      "$label=RED"

    failures=$((failures + 1))
  }

  phase11b_pass() {
    local label="$1"

    printf '%s\n' \
      "$label=GREEN"
  }

  require_phase11b_pass() {
    local label="$1"
    local prompt="$2"
    local answer

    printf '\n%s\n' \
      "===== $label ====="

    printf '%s\n' \
      "$prompt"

    printf '%s' \
      "Type PASS after confirming this checkpoint, or RED to stop acceptance: "

    IFS= read -r answer

    if [ "$answer" = "PASS" ]; then
      phase11b_pass "$label"
      return 0
    fi

    phase11b_fail "$label"

    printf '%s\n' \
      "MANUAL_ACCEPTANCE_STOPPED_AT=$label"

    return 1
  }

  if [ "$(uname -s)" != "Darwin" ]; then
    printf '%s\n' \
      "ONBOARDING_PHASE11B_PREFLIGHT=RED"

    printf '%s\n' \
      "REASON=MACOS_REQUIRED"

    return 1
  fi

  if [ ! -d "$app_bundle" ]; then
    printf '%s\n' \
      "ONBOARDING_PHASE11B_PREFLIGHT=RED"

    printf 'REASON=MACOS_APP_BUNDLE_NOT_FOUND:%s\n' \
      "$app_bundle"

    return 1
  fi

  if [ ! -f "$tauri_config" ]; then
    printf '%s\n' \
      "ONBOARDING_PHASE11B_PREFLIGHT=RED"

    printf 'REASON=TAURI_CONFIG_NOT_FOUND:%s\n' \
      "$tauri_config"

    return 1
  fi

  printf '%s\n' \
    "ONBOARDING_PHASE11B_PREFLIGHT=GREEN"

  printf 'MACOS_APP_BUNDLE=%s\n' \
    "$app_bundle"

  printf '%s\n' \
    "MANUAL_RUNTIME=TAURI_DEV_EXPLICIT_BYPASS"

  printf '%s\n' \
    "RELEASE_APP_BUNDLE_ALREADY_AUTOMATED_GREEN=YES"

  printf '%s\n' \
    "USERNAME_AVAILABILITY_BACKEND_CONFIGURED=NO"

  printf '%s\n' \
    "USERNAME_DECISION_FOR_THIS_TEST=EXPLICIT_DEV_BYPASS"

  printf '%s\n' \
    "USERNAME_OWNERSHIP_CONFIRMED=NO"

  printf '%s\n' \
    "THIS_TEST_CREATES_A_REAL_LOCAL_TEMPORARY_PASSPORT=YES"

  printf '%s\n' \
    "THIS_TEST_ENDS_BY_CLEARING_THE_TEMPORARY_PASSPORT=YES"

  printf '%s\n' \
    "DO_NOT_CONTINUE_WITH_A_PASSPORT_YOU_INTEND_TO_KEEP=YES"

  printf '%s\n' \
    "DO_NOT_TYPE_THE_RECOVERY_PHRASE_IN_THIS_TERMINAL=YES"

  printf '%s\n' \
    "DO_NOT_SCREENSHOT_OR_PASTE_THE_RECOVERY_PHRASE=YES"

  printf '\n%s\n' \
    "Use a second Terminal window for the Tauri runtime:"

  printf '\n%s\n' \
    "cd $app_root"

  printf '%s\n' \
    "npm run tauri:dev -- --config $tauri_config"

  printf '\n%s\n' \
    "Before beginning the walkthrough, establish a clean development state:"

  cat <<'CHECKLIST'
1. Start the Tauri development app using the command above.
2. If an old onboarding screen appears, expand its development shell tools and open the shell.
3. Open the Passport chip and Passport drawer.
4. Select “Refresh native status.”
5. If a Passport exists that you intend to preserve, STOP and type RED.
6. If the Passport is disposable test material, select “Clear local Passport.”
7. Open Web Inspector in the development app:
   - press Command–Option–I, or
   - right-click and choose Inspect Element.
8. In the Console, run exactly:

for (const key of [
  'crablink.onboarding.v1',
  'crablink.onboarding.profile-draft.v1',
  'crablink.storage.v1',
  'crablink.public_profile.v1',
]) {
  localStorage.removeItem(key);
  sessionStorage.removeItem(key);
}

history.replaceState(
  null,
  '',
  `${location.pathname}#url=${encodeURIComponent('crab://home')}`,
);

location.reload();

9. Confirm the app reloads to the first-run Welcome screen.
CHECKLIST

  printf '\n%s\n' \
    "Native clean-state checkpoint:"

  printf '%s\n' \
    "After selecting Clear local Passport, select Refresh native status."

  printf '%s\n' \
    "Continue only when Native status is exactly no_passport."

  printf '%s' \
    "Type NATIVE_NO_PASSPORT after confirming that exact native status: "

  local native_preflight_confirmation
  IFS= read -r native_preflight_confirmation

  if [ "$native_preflight_confirmation" != "NATIVE_NO_PASSPORT" ]; then
    printf '%s\n' \
      "ONBOARDING_PHASE11B_NATIVE_PREFLIGHT=RED"

    printf '%s\n' \
      "ONBOARDING_PHASE11B_MANUAL_ACCEPTANCE=NOT_RUN"

    printf '%s\n' \
      "REASON=NATIVE_PASSPORT_NOT_CONFIRMED_ABSENT"

    return 1
  fi

  printf '%s\n' \
    "ONBOARDING_PHASE11B_NATIVE_PREFLIGHT=GREEN"

  printf '\n%s\n' \
    "Browser clean-state checkpoint:"

  printf '%s\n' \
    "Run the complete localStorage/sessionStorage cleanup shown above."

  printf '%s\n' \
    "Confirm Welcome appears with no stale username, profile, Passport, or route label."

  printf '%s' \
    "Type BROWSER_STATE_CLEAN after confirming the clean Welcome screen: "

  local browser_preflight_confirmation
  IFS= read -r browser_preflight_confirmation

  if [ "$browser_preflight_confirmation" != "BROWSER_STATE_CLEAN" ]; then
    printf '%s\n' \
      "ONBOARDING_PHASE11B_BROWSER_PREFLIGHT=RED"

    printf '%s\n' \
      "ONBOARDING_PHASE11B_MANUAL_ACCEPTANCE=NOT_RUN"

    printf '%s\n' \
      "REASON=BROWSER_DISPLAY_STATE_NOT_CONFIRMED_CLEAN"

    return 1
  fi

  printf '%s\n' \
    "ONBOARDING_PHASE11B_BROWSER_PREFLIGHT=GREEN"

  printf '\n%s' \
    "Type RUN_PHASE11B only after reading the destructive-test warning: "

  local start_confirmation
  IFS= read -r start_confirmation

  if [ "$start_confirmation" != "RUN_PHASE11B" ]; then
    printf '%s\n' \
      "ONBOARDING_PHASE11B_MANUAL_ACCEPTANCE=NOT_RUN"

    return 1
  fi

  require_phase11b_pass \
    "ONBOARDING_PHASE11B_CLEAN_WELCOME" \
    "Confirm the clean Welcome screen appears and the normal CrabLink shell is not mounted." ||
    return 1

  require_phase11b_pass \
    "ONBOARDING_PHASE11B_NO_BAKED_IDENTITY" \
    "Confirm there is no @skinnycrabby, Passport A, Passport B, visitor-b, dev wallet, or preselected username." ||
    return 1

  require_phase11b_pass \
    "ONBOARDING_PHASE11B_USERNAME_VALIDATION" \
    "Begin username selection. Confirm invalid syntax is rejected, then enter a unique valid disposable username." ||
    return 1

  require_phase11b_pass \
    "ONBOARDING_PHASE11B_USERNAME_TRUTH" \
    "Select Check availability. Confirm the app truthfully reports that availability is not configured and does not claim ownership." ||
    return 1

  require_phase11b_pass \
    "ONBOARDING_PHASE11B_DEV_AVAILABILITY_BYPASS" \
    "Select Bypass availability for dev. Confirm it is explicitly marked development-only and does not say the username is registered or confirmed." ||
    return 1

  require_phase11b_pass \
    "ONBOARDING_PHASE11B_NATIVE_PASSPORT_CREATE" \
    "Select Create local Passport. Confirm PIN entry appears in a native hidden-input window—not in the React/WebView page. Use a disposable test PIN." ||
    return 1

  require_phase11b_pass \
    "ONBOARDING_PHASE11B_CREATED_LOCKED" \
    "Confirm creation succeeds as a locked local Passport and no wallet, balance, capability, or backend identity success is claimed." ||
    return 1

  require_phase11b_pass \
    "ONBOARDING_PHASE11B_NATIVE_RECOVERY" \
    "Confirm the recovery phrase appears only in a native window with 24 ordered words and an optional fingerprint. Write it only on temporary paper; do not enter it here. Acknowledge it once." ||
    return 1

  require_phase11b_pass \
    "ONBOARDING_PHASE11B_REACT_SECRET_BOUNDARY" \
    "Confirm the React onboarding page never displays the recovery words and never contains a PIN input." ||
    return 1

  require_phase11b_pass \
    "ONBOARDING_PHASE11B_NATIVE_PIN_SETUP" \
    "Continue PIN setup. Confirm the operational PIN prompt is native. Enter the same disposable PIN and verify the profile step appears." ||
    return 1

  require_phase11b_pass \
    "ONBOARDING_PHASE11B_PROFILE_DECISION" \
    "Confirm both Save local profile draft and Skip are available. Execute one path and confirm no backend-confirmed profile claim appears." ||
    return 1

  require_phase11b_pass \
    "ONBOARDING_PHASE11B_COMPLETION_TRUTH" \
    "Confirm the completion page labels the username as a local draft, says network confirmation is absent, and lists no wallet/ledger/capability action." ||
    return 1

  require_phase11b_pass \
    "ONBOARDING_PHASE11B_HOME_HANDOFF" \
    "Select Finish setup and open CrabLink. Confirm the app lands on crab://home and the Passport chip shows the selected @username as a draft." ||
    return 1

  require_phase11b_pass \
    "ONBOARDING_PHASE11B_NORMAL_DRAWER_POSTURE" \
    "Open the Passport drawer. Confirm Creator A, Visitor B, starter ROC, automatic visitor mode, and dev labels are absent from the normal presentation." ||
    return 1

  printf '\n%s\n' \
    "Restart test:"

  cat <<'RESTART'
1. Quit CrabLink completely.
2. Stop the Tauri development command if it returned to the terminal.
3. Run the same Tauri development command again.
4. Do not clear local storage.
RESTART

  require_phase11b_pass \
    "ONBOARDING_PHASE11B_RESTART_PERSISTENCE" \
    "Confirm the restarted app opens directly to the completed shell/home and preserves the local draft username without replaying recovery or PIN creation." ||
    return 1

  printf '\n%s\n' \
    "Destructive cleanup and reset:"

  cat <<'RESET'
1. Open the Passport drawer.
2. Refresh native status.
3. Select Clear local Passport.
4. Confirm native status becomes No Passport or Cleared.
5. Destroy the temporary paper recovery copy.
6. Open Web Inspector and run:

for (const key of [
  'crablink.onboarding.v1',
  'crablink.onboarding.profile-draft.v1',
  'crablink.storage.v1',
  'crablink.public_profile.v1',
]) {
  localStorage.removeItem(key);
  sessionStorage.removeItem(key);
}

history.replaceState(
  null,
  '',
  `${location.pathname}#url=${encodeURIComponent('crab://home')}`,
);

location.reload();
RESET

  require_phase11b_pass \
    "ONBOARDING_PHASE11B_NATIVE_CLEAR" \
    "Confirm the disposable encrypted local Passport vault was cleared and the session was dropped." ||
    return 1

  require_phase11b_pass \
    "ONBOARDING_PHASE11B_RESET_TO_WELCOME" \
    "Confirm clearing the redacted onboarding/settings records and reloading returns the app to a clean Welcome screen." ||
    return 1

  require_phase11b_pass \
    "ONBOARDING_PHASE11B_FINAL_CLEAN_STATE" \
    "Confirm the final Welcome screen again has no baked username, Passport A/B, visitor-b, starter ROC, React PIN field, or recovery words." ||
    return 1

  printf '\n%s\n' \
    "===== PHASE 11B RESULT ====="

  if [ "$failures" -eq 0 ]; then
    printf '%s\n' \
      "ONBOARDING_PHASE11B_WELCOME=GREEN"

    printf '%s\n' \
      "ONBOARDING_PHASE11B_USERNAME_AND_DEV_BYPASS=GREEN"

    printf '%s\n' \
      "ONBOARDING_PHASE11B_NATIVE_PASSPORT_CREATE=GREEN"

    printf '%s\n' \
      "ONBOARDING_PHASE11B_NATIVE_RECOVERY_CEREMONY=GREEN"

    printf '%s\n' \
      "ONBOARDING_PHASE11B_NATIVE_PIN_SETUP=GREEN"

    printf '%s\n' \
      "ONBOARDING_PHASE11B_PROFILE_AND_COMPLETION=GREEN"

    printf '%s\n' \
      "ONBOARDING_PHASE11B_HOME_HANDOFF=GREEN"

    printf '%s\n' \
      "ONBOARDING_PHASE11B_RESTART_PERSISTENCE=GREEN"

    printf '%s\n' \
      "ONBOARDING_PHASE11B_CLEAR_AND_RESET=GREEN"

    printf '%s\n' \
      "NO_REACT_PIN=YES"

    printf '%s\n' \
      "NO_REACT_RECOVERY_WORDS=YES"

    printf '%s\n' \
      "NO_BAKED_USERNAME=YES"

    printf '%s\n' \
      "NO_NORMAL_PASSPORT_A_B=YES"

    printf '%s\n' \
      "USERNAME_BACKEND_CONFIRMED=NO"

    printf '%s\n' \
      "PROFILE_BACKEND_CONFIRMED=NO"

    printf '%s\n' \
      "WALLET_OR_LEDGER_MUTATION=NO"

    printf '%s\n' \
      "CAPABILITY_ISSUANCE=NO"

    printf '%s\n' \
      "MANUAL_OPERATOR_CONFIRMED=YES"

    printf '%s\n' \
      "ONBOARDING_PHASE11B_DESKTOP_MANUAL_ACCEPTANCE=GREEN"

    printf '%s\n' \
      "ONBOARDING_DESKTOP_FINAL_ACCEPTANCE=GREEN"

    printf '%s\n' \
      "NEXT_PATCH=ONBOARDING_PHASE12_CROSS_PLATFORM_CONTRACT"

    return 0
  fi

  printf \
    'ONBOARDING_PHASE11B_DESKTOP_MANUAL_ACCEPTANCE=RED failures=%s\n' \
    "$failures"

  printf '%s\n' \
    "ONBOARDING_DESKTOP_FINAL_ACCEPTANCE=RED"

  printf '%s\n' \
    "NEXT_ACTION=FIX_FIRST_MANUAL_FAILURE"

  return 1
}

phase11b_main "$@"
phase11b_rc="$?"

unset -f phase11b_main

if [ "$phase11b_rc" -eq 0 ]; then
  true
else
  false
fi
