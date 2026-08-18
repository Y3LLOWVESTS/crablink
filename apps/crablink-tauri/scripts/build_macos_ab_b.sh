#!/usr/bin/env bash
set -euo pipefail

cd "$(
  cd "$(
    dirname "$0"
  )/.."
  pwd
)"

BUNDLE_SOURCE="src-tauri/target/release/bundle/macos/CrabLink B.app"
BUNDLE_DESTINATION="$HOME/Desktop/CrabLink B.app"

AVAILABLE_KB="$(
  df -Pk . |
    awk 'NR == 2 {print $4}'
)"

MINIMUM_KB=4194304

if [ "$AVAILABLE_KB" -lt "$MINIMUM_KB" ]; then
  printf '%s\n' \
    "CRABLINK_AB_B_BUILD=RED" \
    "FAILURE=LESS_THAN_4_GIB_FREE_DISK" \
    "AVAILABLE_KB=$AVAILABLE_KB"

  exit 1
fi

printf '%s\n' \
  "=== CRABLINK MACOS A/B B BUILD ===" \
  "VARIANT=B" \
  "PRODUCT_NAME=CrabLink B" \
  "BUNDLE_IDENTIFIER=com.rustyonions.crablink.ab-b" \
  "KEYCHAIN_SERVICE=com.rustyonions.crablink.ab-b.native-passport.v1" \
  "LOCAL_STATE_ISOLATED_FROM_A=YES" \
  "NETWORK_BACKEND_SHARED=YES" \
  "SIGNED_ACCEPTANCE_BUILD=YES" \
  "PUBLIC_RELEASE_BUILD=NO"

CRABLINK_DESKTOP_AB_VARIANT=b \
VITE_CRABLINK_SIGNED_ONBOARDING_ACCEPTANCE=1 \
APPLE_SIGNING_IDENTITY="CrabLink Local Development Code Signing" \
CARGO_INCREMENTAL=0 \
npm run tauri:build -- \
  --config \
  src-tauri/tauri.macos.ab-b.conf.json \
  --bundles app

test -d "$BUNDLE_SOURCE"

IDENTIFIER="$(
  /usr/libexec/PlistBuddy \
    -c 'Print :CFBundleIdentifier' \
    "$BUNDLE_SOURCE/Contents/Info.plist"
)"

test "$IDENTIFIER" = \
  "com.rustyonions.crablink.ab-b"

/usr/bin/codesign \
  --verify \
  --deep \
  --strict \
  --verbose=2 \
  "$BUNDLE_SOURCE"

rm -rf "$BUNDLE_DESTINATION"

/usr/bin/ditto \
  "$BUNDLE_SOURCE" \
  "$BUNDLE_DESTINATION"

/usr/bin/codesign \
  --verify \
  --deep \
  --strict \
  --verbose=2 \
  "$BUNDLE_DESTINATION"

printf '%s\n' \
  "CRABLINK_AB_B_BUILD=GREEN" \
  "CRABLINK_B_APP=$BUNDLE_DESTINATION" \
  "CRABLINK_B_IDENTIFIER=$IDENTIFIER" \
  "CRABLINK_B_KEYCHAIN_NAMESPACE=ISOLATED" \
  "CRABLINK_B_APP_DATA_NAMESPACE=ISOLATED" \
  "CRABLINK_A_STATE_MUTATED=NO" \
  "NEXT_ACTION=LAUNCH_CRABLINK_B"
