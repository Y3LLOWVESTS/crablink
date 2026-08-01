#!/usr/bin/env bash

run_phase16e3b3c_device_runtime_acceptance() {
  local root=""
  local mode="${1:-run}"
  local apk=""
  local expected_device_os="Android 14"
  local expected_device_build="rk3539_box_32-user 14 UTT2.241219.001"
  local expected_abi="armeabi-v7a"
  local apk_sha256=""
  local apk_size_bytes=""
  local first_failure=""
  local failure_count=0
  local result=""

  if [ -f "apps/crablink-tv/package.json" ]; then
    root="$PWD"
  elif [ -f "/Users/mymac/Desktop/crablink/apps/crablink-tv/package.json" ]; then
    root="/Users/mymac/Desktop/crablink"
  else
    printf '%s\n' \
      "NATIVE_PASSPORT_PHASE16E3B3C_DEVICE_RUNTIME_ACCEPTANCE=RED" \
      "FAILURE_REASON=CRABLINK_REPOSITORY_NOT_FOUND" \
      "ANDROID_RUNTIME_EXECUTION=NOT_RUN"
    return 1
  fi

  cd "$root" || {
    printf '%s\n' \
      "NATIVE_PASSPORT_PHASE16E3B3C_DEVICE_RUNTIME_ACCEPTANCE=RED" \
      "FAILURE_REASON=CRABLINK_REPOSITORY_ENTER_FAILED" \
      "ANDROID_RUNTIME_EXECUTION=NOT_RUN"
    return 1
  }

  apk="$root/apps/crablink-tv/src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk"

  print_acceptance_plan() {
    printf '\n'
    printf '%s\n' \
      "============================================================" \
      "CrabLink TV Native Passport Phase 16E3B3C" \
      "Physical Device Prompt and Lifecycle Acceptance" \
      "============================================================" \
      "EXPECTED_DEVICE_OS=$expected_device_os" \
      "EXPECTED_DEVICE_BUILD=$expected_device_build" \
      "EXPECTED_ABI=$expected_abi" \
      "INSTALLATION_METHOD=USB" \
      "ADB_REQUIRED=NO" \
      "ACCEPTANCE_SCOPE=PROMPT_AND_LIFECYCLE_ONLY" \
      "OPERATIONAL_UNLOCK_PROOF=DEFERRED_TO_PHASE16F" \
      "REVOCATION_RUNTIME_PROOF=DEFERRED_TO_PHASE16F" \
      "FORBIDDEN_AUTHORITY_MATRIX=DEFERRED_TO_PHASE16F" \
      "" \
      "Device controls:" \
      "  MENU or F1 = explicit PIN enrollment/unlock" \
      "  INFO or F2 = explicit operational lock" \
      "" \
      "Required observations:" \
      "  1. Install the ARMv7 APK from USB." \
      "  2. Launch on the recorded Android TV device." \
      "  3. Confirm startup shows no automatic PIN prompt." \
      "  4. Confirm startup does not silently unlock." \
      "  5. Press MENU or F1 and observe native PIN enrollment." \
      "  6. Confirm the PIN must be entered twice." \
      "  7. Confirm mismatched entries fail closed." \
      "  8. Confirm successful enrollment does not auto-unlock." \
      "  9. Press MENU or F1 again and observe native unlock." \
      " 10. Cancel and confirm the flow remains locked." \
      " 11. Enter a wrong PIN and confirm no success state appears." \
      " 12. Enter the correct PIN and confirm the app stays stable." \
      " 13. Press INFO or F2 to invoke explicit lock." \
      " 14. Background and resume; confirm no automatic prompt/unlock." \
      " 15. Relaunch; confirm no automatic prompt/unlock." \
      " 16. Confirm there is no WebView PIN form." \
      " 17. Confirm no secret values are visibly disclosed." \
      "" \
      "Do not mark operational proof, revocation, or forbidden-authority" \
      "runtime acceptance complete in this phase."
  }

  record_result() {
    local key="$1"
    local prompt="$2"

    printf '\n%s\n' "$prompt"
    printf 'Enter PASS or FAIL: '

    if ! IFS= read -r result; then
      result="FAIL"
    fi

    case "$result" in
      PASS)
        printf '%s=PASS\n' "$key"
        ;;

      FAIL)
        printf '%s=FAIL\n' "$key"

        failure_count=$(
          failure_count + 1
        )

        if [ -z "$first_failure" ]; then
          first_failure="$key"
        fi
        ;;

      *)
        printf '%s=FAIL\n' "$key"
        printf '%s_INPUT=INVALID\n' "$key"

        failure_count=$(
          failure_count + 1
        )

        if [ -z "$first_failure" ]; then
          first_failure="$key"
        fi
        ;;
    esac
  }

  print_acceptance_plan

  if [ "$mode" = "--plan" ]; then
    printf '\n%s\n' \
      "NATIVE_PASSPORT_PHASE16E3B3C_DEVICE_RUNTIME_ACCEPTANCE=NOT_RUN" \
      "ANDROID_RUNTIME_EXECUTION=NOT_RUN" \
      "PLAN_ONLY=YES" \
      "NO_RUNTIME_CLAIM=YES" \
      "NEXT_ACTION=INSTALL_APK_AND_RUN_WITHOUT_PLAN_FLAG"
    return 0
  fi

  if [ "$mode" != "run" ]; then
    printf '\n%s\n' \
      "NATIVE_PASSPORT_PHASE16E3B3C_DEVICE_RUNTIME_ACCEPTANCE=RED" \
      "FAILURE_REASON=UNSUPPORTED_ARGUMENT" \
      "SUPPORTED_ARGUMENT=--plan" \
      "ANDROID_RUNTIME_EXECUTION=NOT_RUN"
    return 1
  fi

  if [ ! -s "$apk" ]; then
    printf '\n%s\n' \
      "NATIVE_PASSPORT_PHASE16E3B3C_DEVICE_RUNTIME_ACCEPTANCE=RED" \
      "FAILURE_REASON=ARMV7_APK_MISSING_OR_EMPTY" \
      "APK=$apk" \
      "ANDROID_RUNTIME_EXECUTION=NOT_RUN" \
      "NEXT_ACTION=BUILD_FRESH_ARMV7_APK"
    return 1
  fi

  if ! unzip -t "$apk" >/dev/null; then
    printf '\n%s\n' \
      "NATIVE_PASSPORT_PHASE16E3B3C_DEVICE_RUNTIME_ACCEPTANCE=RED" \
      "FAILURE_REASON=APK_ZIP_INTEGRITY_FAILED" \
      "APK=$apk" \
      "ANDROID_RUNTIME_EXECUTION=NOT_RUN"
    return 1
  fi

  if ! unzip -Z1 "$apk" |
    grep -Fxq \
      "lib/armeabi-v7a/libcrablink_tv_lib.so"
  then
    printf '\n%s\n' \
      "NATIVE_PASSPORT_PHASE16E3B3C_DEVICE_RUNTIME_ACCEPTANCE=RED" \
      "FAILURE_REASON=ARMV7_NATIVE_LIBRARY_ABSENT" \
      "APK=$apk" \
      "ANDROID_RUNTIME_EXECUTION=NOT_RUN"
    return 1
  fi

  if unzip -Z1 "$apk" |
    grep -Eq \
      '^lib/arm64-v8a/'
  then
    printf '\n%s\n' \
      "NATIVE_PASSPORT_PHASE16E3B3C_DEVICE_RUNTIME_ACCEPTANCE=RED" \
      "FAILURE_REASON=UNEXPECTED_ARM64_NATIVE_LIBRARY_PRESENT" \
      "APK=$apk" \
      "ANDROID_RUNTIME_EXECUTION=NOT_RUN"
    return 1
  fi

  apk_sha256="$(
    shasum -a 256 "$apk" |
      awk '{print $1}'
  )"

  apk_size_bytes="$(
    wc -c < "$apk" |
      tr -d ' '
  )"

  printf '\n%s\n' \
    "APK_PRECHECK=GREEN" \
    "APK=$apk" \
    "APK_ABI=$expected_abi" \
    "APK_SIZE_BYTES=$apk_size_bytes" \
    "APK_SHA256=$apk_sha256" \
    "PHYSICAL_OBSERVATIONS_BEGIN=YES"

  record_result \
    "APK_INSTALLED_BY_USB" \
    "Was this exact APK installed manually from USB?"

  record_result \
    "APP_LAUNCHED_ON_RECORDED_ANDROID_TV" \
    "Did the app launch on Android 14 build rk3539_box_32-user 14 UTT2.241219.001?"

  record_result \
    "STARTUP_PIN_PROMPT_ABSENT" \
    "On launch, was an automatic PIN prompt absent?"

  record_result \
    "STARTUP_SILENT_UNLOCK_ABSENT" \
    "On launch, was silent automatic unlock absent?"

  record_result \
    "EXPLICIT_ENROLLMENT_PROMPT_MENU_OR_F1" \
    "Did MENU or F1 explicitly open the native PIN enrollment prompt?"

  record_result \
    "PIN_CONFIRMATION_REQUIRED" \
    "Did enrollment require a second PIN entry for confirmation?"

  record_result \
    "MISMATCHED_CONFIRMATION_FAILS_CLOSED" \
    "Did mismatched PIN confirmation fail without enrolling or unlocking?"

  record_result \
    "ENROLLMENT_AUTOMATIC_UNLOCK_ABSENT" \
    "After matching enrollment entries, did the app remain locked until another explicit action?"

  record_result \
    "EXPLICIT_UNLOCK_PROMPT_MENU_OR_F1" \
    "After enrollment, did MENU or F1 explicitly open the native unlock prompt?"

  record_result \
    "CANCEL_REMAINS_LOCKED" \
    "Did cancelling the unlock prompt leave the flow locked with no success indication?"

  record_result \
    "WRONG_PIN_REMAINS_LOCKED" \
    "Did a wrong PIN leave the flow locked with no success indication?"

  record_result \
    "CORRECT_PIN_FLOW_STABLE" \
    "Did the correct-PIN path complete without crash, hang, or secret disclosure?"

  record_result \
    "EXPLICIT_LOCK_INFO_OR_F2" \
    "Did INFO or F2 invoke the explicit native lock action without crashing?"

  record_result \
    "BACKGROUND_RESUME_FAILS_CLOSED" \
    "After backgrounding and resuming, were automatic prompt and automatic unlock both absent?"

  record_result \
    "RELAUNCH_FAILS_CLOSED" \
    "After closing and relaunching, were automatic prompt and automatic unlock both absent?"

  record_result \
    "WEBVIEW_PIN_FORM_ABSENT" \
    "During all tests, was every PIN entry native with no WebView PIN form?"

  record_result \
    "VISIBLE_SECRET_DISCLOSURE_ABSENT" \
    "During all tests, were recovery material, keys, capabilities, and PIN values absent from visible UI?"

  printf '\n%s\n' \
    "PHYSICAL_OBSERVATIONS_COMPLETE=YES" \
    "FAILURE_COUNT=$failure_count"

  if [ "$failure_count" -ne 0 ]; then
    printf '%s\n' \
      "NATIVE_PASSPORT_PHASE16E3B3C_DEVICE_RUNTIME_ACCEPTANCE=RED" \
      "PHASE16E3B3C_ACCEPTANCE_SCOPE=PROMPT_AND_LIFECYCLE" \
      "ANDROID_RUNTIME_EXECUTION=PHYSICAL_DEVICE_ATTEMPTED" \
      "FIRST_FAILURE=$first_failure" \
      "OPERATIONAL_UNLOCK_PROOF=NOT_CLAIMED" \
      "REVOCATION_RUNTIME_PROOF=NOT_CLAIMED" \
      "FORBIDDEN_AUTHORITY_RUNTIME_PROOF=NOT_CLAIMED" \
      "NEXT_ACTION=FIX_FIRST_REPORTED_FAILURE"
    return 1
  fi

  printf '%s\n' \
    "NATIVE_PASSPORT_PHASE16E3B3C_DEVICE_RUNTIME_ACCEPTANCE=GREEN" \
    "PHASE16E3B3C_ACCEPTANCE_SCOPE=PROMPT_AND_LIFECYCLE" \
    "ANDROID_RUNTIME_EXECUTION=PHYSICAL_DEVICE" \
    "DEVICE_OS=$expected_device_os" \
    "DEVICE_BUILD=$expected_device_build" \
    "DEVICE_ABI=$expected_abi" \
    "INSTALLATION_METHOD=USB" \
    "ADB_USED=NO" \
    "EXPLICIT_ENROLLMENT_PROMPT=OBSERVED" \
    "PIN_CONFIRMATION=OBSERVED" \
    "MISMATCHED_CONFIRMATION=FAILED_CLOSED" \
    "ENROLLMENT_AUTOMATIC_UNLOCK=ABSENT" \
    "EXPLICIT_UNLOCK_PROMPT=OBSERVED" \
    "CANCEL=FAILED_CLOSED" \
    "WRONG_PIN=FAILED_CLOSED" \
    "CORRECT_PIN_FLOW=STABLE" \
    "EXPLICIT_LOCK=OBSERVED" \
    "BACKGROUND_RESUME=FAILED_CLOSED" \
    "RELAUNCH=FAILED_CLOSED" \
    "WEBVIEW_PIN_FORM=ABSENT" \
    "VISIBLE_SECRET_DISCLOSURE=ABSENT" \
    "OPERATIONAL_UNLOCK_PROOF=DEFERRED_TO_PHASE16F" \
    "REVOCATION_RUNTIME_PROOF=DEFERRED_TO_PHASE16F" \
    "FORBIDDEN_AUTHORITY_RUNTIME_PROOF=DEFERRED_TO_PHASE16F" \
    "PHASE16_COMPLETE=NO" \
    "NEXT_PATCH=NATIVE_PASSPORT_PHASE16F1_REDACTED_STATUS_SURFACE"

  return 0
}

run_phase16e3b3c_device_runtime_acceptance "$@"
