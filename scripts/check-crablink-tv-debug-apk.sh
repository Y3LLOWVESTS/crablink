#!/usr/bin/env bash
set -euo pipefail

EXPECTED_ANDROID_ABI="${EXPECTED_ANDROID_ABI:-arm64-v8a}"

ROOT="/Users/mymac/Desktop/crablink"
TV_APP="$ROOT/apps/crablink-tv"
APK_OUTPUT_ROOT="$TV_APP/src-tauri/gen/android/app/build/outputs/apk"

export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$ANDROID_HOME}"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/build-tools/36.0.0:$ANDROID_HOME/platform-tools:$PATH"

APK_ANALYZER="$ANDROID_HOME/cmdline-tools/latest/bin/apkanalyzer"
APK_SIGNER="$ANDROID_HOME/build-tools/36.0.0/apksigner"
ZIPALIGN="$ANDROID_HOME/build-tools/36.0.0/zipalign"

for required_tool in \
  "$APK_ANALYZER" \
  "$APK_SIGNER" \
  "$ZIPALIGN"
do
  if [ ! -x "$required_tool" ]; then
    echo "ERROR: required Android inspection tool is missing:"
    echo "$required_tool"
    exit 1
  fi
done

if [ ! -d "$APK_OUTPUT_ROOT" ]; then
  echo "ERROR: APK output directory does not exist:"
  echo "$APK_OUTPUT_ROOT"
  exit 1
fi

APK="$(
  python3 - "$APK_OUTPUT_ROOT" <<'PY'
from pathlib import Path
import sys

root = Path(sys.argv[1])
apks = sorted(
    root.rglob("*.apk"),
    key=lambda candidate: candidate.stat().st_mtime,
    reverse=True,
)

if not apks:
    raise SystemExit(1)

print(apks[0])
PY
)" || {
  echo "ERROR: no generated APK was found beneath:"
  echo "$APK_OUTPUT_ROOT"
  exit 1
}

echo "============================================================"
echo " CrabLink TV debug APK acceptance"
echo "============================================================"

echo
echo "APK=$APK"
ls -lh "$APK"
file "$APK"

echo
echo "1. ZIP integrity"

unzip -t "$APK" >/dev/null
echo "APK_ZIP_INTEGRITY=GREEN"

echo
echo "2. Application summary"

"$APK_ANALYZER" apk summary "$APK"

APPLICATION_ID="$(
  "$APK_ANALYZER" manifest application-id "$APK"
)"

VERSION_NAME="$(
  "$APK_ANALYZER" manifest version-name "$APK"
)"

VERSION_CODE="$(
  "$APK_ANALYZER" manifest version-code "$APK"
)"

MIN_SDK="$(
  "$APK_ANALYZER" manifest min-sdk "$APK"
)"

TARGET_SDK="$(
  "$APK_ANALYZER" manifest target-sdk "$APK"
)"

DEBUGGABLE="$(
  "$APK_ANALYZER" manifest debuggable "$APK"
)"

echo "APPLICATION_ID=$APPLICATION_ID"
echo "VERSION_NAME=$VERSION_NAME"
echo "VERSION_CODE=$VERSION_CODE"
echo "MIN_SDK=$MIN_SDK"
echo "TARGET_SDK=$TARGET_SDK"
echo "DEBUGGABLE=$DEBUGGABLE"

if [ "$APPLICATION_ID" != "com.rustyonions.crablink.tv" ]; then
  echo "ERROR: unexpected application ID."
  exit 1
fi

if [ "$MIN_SDK" != "24" ]; then
  echo "ERROR: expected minimum SDK 24."
  exit 1
fi

if [ "$TARGET_SDK" != "36" ]; then
  echo "ERROR: expected target SDK 36."
  exit 1
fi

if [ "$DEBUGGABLE" != "true" ]; then
  echo "ERROR: first acceptance APK must be debuggable."
  exit 1
fi

echo
echo "3. Merged manifest inspection"

MANIFEST_XML="$(
  mktemp \
    "${TMPDIR:-/tmp}/crablink-tv-manifest.XXXXXX.xml"
)"

cleanup() {
  rm -f "$MANIFEST_XML"
}

trap cleanup EXIT

"$APK_ANALYZER" \
  manifest print \
  "$APK" \
  > "$MANIFEST_XML"

python3 - "$MANIFEST_XML" <<'PY'
from pathlib import Path
import sys
import xml.etree.ElementTree as ET

manifest_path = Path(sys.argv[1])
tree = ET.parse(manifest_path)
root = tree.getroot()

ANDROID = "{http://schemas.android.com/apk/res/android}"

assert root.attrib.get("package") == "com.rustyonions.crablink.tv"

permissions = {
    element.attrib.get(f"{ANDROID}name")
    for element in root.findall("uses-permission")
}

expected_permissions = {
    "android.permission.INTERNET",
    (
        "com.rustyonions.crablink.tv."
        "DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION"
    ),
}

assert permissions == expected_permissions, permissions

features = {
    element.attrib.get(f"{ANDROID}name"):
        element.attrib.get(f"{ANDROID}required", "true")
    for element in root.findall("uses-feature")
}

assert features.get("android.software.leanback") == "true", features
assert features.get("android.hardware.touchscreen") == "false", features

application = root.find("application")
assert application is not None

banner = application.attrib.get(f"{ANDROID}banner", "")

assert banner, "Merged manifest does not declare an application banner."

# apkanalyzer may print the symbolic resource name or the compiled
# Android resource-table reference, such as @ref/0x7f0700e7.
assert (
    "tv_banner" in banner
    or banner.startswith("@ref/")
    or banner.startswith("@drawable/")
), banner

activities = application.findall("activity")
assert activities

main_activity = None

for activity in activities:
    name = activity.attrib.get(f"{ANDROID}name", "")

    if name.endswith("MainActivity"):
        main_activity = activity
        break

assert main_activity is not None, (
    "MainActivity was not found in the merged manifest."
)

orientation = main_activity.attrib.get(
    f"{ANDROID}screenOrientation",
    "",
)

# apkanalyzer may emit either the symbolic Android value or the compiled
# integer enum. ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE is integer 0.
valid_landscape_values = {
    "landscape",
    "0",
}

categories = {
    category.attrib.get(f"{ANDROID}name")
    for intent_filter in main_activity.findall("intent-filter")
    for category in intent_filter.findall("category")
}

print(f"MERGED_PACKAGE={root.attrib.get('package')}")
print(f"MERGED_PERMISSIONS={sorted(permissions)}")
print(f"MERGED_FEATURES={features}")
print(f"MERGED_BANNER={banner}")
print(
    "MERGED_MAIN_ACTIVITY="
    f"{main_activity.attrib.get(f'{ANDROID}name', '')}"
)
print(f"MERGED_ORIENTATION={orientation}")
print(f"MERGED_CATEGORIES={sorted(categories)}")

assert orientation in valid_landscape_values, (
    "Expected landscape orientation as `landscape` or compiled value `0`; "
    f"received {orientation!r}."
)

assert "android.intent.category.LAUNCHER" in categories, (
    "Standard Android launcher category is missing."
)

assert "android.intent.category.LEANBACK_LAUNCHER" in categories, (
    "Android TV Leanback launcher category is missing."
)

print("MERGED_MANIFEST_STATUS=GREEN")
print("PERMISSIONS=restricted-and-expected")
print("LEANBACK_REQUIRED=true")
print("TOUCHSCREEN_REQUIRED=false")
print("ORIENTATION=landscape")
print("TV_BANNER=present")
PY

echo
echo "4. Packaged Android TV banner resource"

BANNER_ENTRY="$(
  unzip -Z1 "$APK" |
    grep -E '^res/drawable[^/]*/tv_banner\.(png|webp)$' |
    head -n 1 ||
    true
)"

if [ -z "$BANNER_ENTRY" ]; then
  echo "ERROR: packaged TV banner resource was not found in the APK."
  exit 1
fi

echo "APK_TV_BANNER_ENTRY=$BANNER_ENTRY"
echo "APK_TV_BANNER_STATUS=GREEN"

echo
echo "5. Native ABI contents"

ABI_LIST="$(
  unzip -Z1 "$APK" |
    awk -F/ '
      $1 == "lib" && NF >= 3 {
        print $2
      }
    ' |
    sort -u
)"

echo "APK_ABIS=$ABI_LIST"

if [ "$ABI_LIST" != "$EXPECTED_ANDROID_ABI" ]; then
  echo "ERROR: unexpected APK ABI."
  echo "EXPECTED_ANDROID_ABI=$EXPECTED_ANDROID_ABI"
  echo "ACTUAL_ANDROID_ABI=$ABI_LIST"
  exit 1
fi

echo
echo "$EXPECTED_ANDROID_ABI native libraries:"

unzip -Z1 "$APK" |
  grep -E "^lib/$EXPECTED_ANDROID_ABI/[^/]+\\.so$"

echo
echo "6. APK signing verification"

"$APK_SIGNER" \
  verify \
  --verbose \
  --print-certs \
  "$APK"

echo
echo "7. ZIP alignment verification"

"$ZIPALIGN" \
  -c \
  -v \
  4 \
  "$APK"

echo
echo "8. Artifact digest"

shasum -a 256 "$APK"

echo
echo "============================================================"
echo "CRABLINK_TV_DEBUG_APK_STATUS=GREEN"
echo "CRABLINK_TV_DEBUG_APK=$APK"
echo "CRABLINK_TV_DEBUG_APK_ABI=$EXPECTED_ANDROID_ABI"
echo "============================================================"
