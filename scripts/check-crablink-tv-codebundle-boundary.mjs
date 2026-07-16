#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const bundlePath = path.join(
  root,
  "CODEBUNDLE_TAURI_APP.md",
);

if (!fs.existsSync(bundlePath)) {
  throw new Error(
    `Codebundle does not exist: ${bundlePath}`,
  );
}

const bundle = fs.readFileSync(bundlePath, "utf8");

const treeHeading = "## File Tree";
const filesHeading = "## Files";

const treeStart = bundle.indexOf(treeHeading);
const filesStart = bundle.indexOf(
  filesHeading,
  treeStart + treeHeading.length,
);

if (treeStart < 0 || filesStart < 0) {
  throw new Error(
    "Codebundle file-tree section could not be parsed.",
  );
}

const fileTreeText = bundle.slice(
  treeStart + treeHeading.length,
  filesStart,
);

const treeEntries = new Set(
  fileTreeText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.length > 0 &&
        line !== "```text" &&
        line !== "```" &&
        !line.startsWith("# "),
    ),
);

const requiredEntries = [
  "assets/app-logo.png",
  "apps/crablink-tv/index.html",
  "apps/crablink-tv/package.json",
  "apps/crablink-tv/vite.config.js",
  "apps/crablink-tv/src/main.jsx",
  "apps/crablink-tv/src/app/TvApp.jsx",
  "apps/crablink-tv/src/focus/focusGraph.js",
  "apps/crablink-tv/src/focus/focusGraph.test.mjs",
  "apps/crablink-tv/src/focus/useTvRemoteNavigation.js",
  "apps/crablink-tv/src/styles/tv.css",
  "apps/crablink-tv/src-tauri/Cargo.toml",
  "apps/crablink-tv/src-tauri/tauri.conf.json",
  "apps/crablink-tv/src-tauri/capabilities/tv.json",
  "apps/crablink-tv/src-tauri/src/lib.rs",
  "apps/crablink-tv/src-tauri/src/commands/diagnostics.rs",
  "apps/crablink-tv/src-tauri/src/commands/settings.rs",
  "apps/crablink-tv/src-tauri/icons/icon.png",
  "apps/crablink-tv/src-tauri/gen/android/app/build.gradle.kts",
  "apps/crablink-tv/src-tauri/gen/android/app/src/main/AndroidManifest.xml",
  "apps/crablink-tv/src-tauri/gen/android/app/src/main/java/com/rustyonions/crablink/tv/MainActivity.kt",
  "apps/crablink-tv/src-tauri/gen/android/buildSrc/src/main/java/com/rustyonions/crablink/tv/kotlin/BuildTask.kt",
  "apps/crablink-tv/src-tauri/gen/android/gradle/wrapper/gradle-wrapper.properties",
  "apps/crablink-tv/src-tauri/gen/android/gradle/wrapper/gradle-wrapper.jar",
  "apps/crablink-tv/src-tauri/gen/android/gradlew",
  "apps/crablink-tv/src-tauri/gen/android/app/src/main/res/drawable-xhdpi/tv_banner.png",
  "scripts/check-crablink-tv-command-boundary.mjs",
  "scripts/check-crablink-tv-focus-boundary.mjs",
  "apps/crablink-tv/src/navigation/tvRouteModel.js",
  "apps/crablink-tv/src/navigation/tvRouteModel.test.mjs",
  "apps/crablink-tv/src/navigation/useTvSectionHistory.js",
  "scripts/check-crablink-tv-route-boundary.mjs",
  "apps/crablink-tv/src/settings/tvPreferences.js",
  "apps/crablink-tv/src/settings/tvPreferences.test.mjs",
  "apps/crablink-tv/src/settings/useTvPreferences.js",
  "apps/crablink-tv/src/settings/TvSettingsPanel.jsx",
  "scripts/check-crablink-tv-settings-boundary.mjs",
  "apps/crablink-tv/src/pairing/tvPairingViewModel.js",
  "apps/crablink-tv/src/pairing/tvPairingViewModel.test.mjs",
  "apps/crablink-tv/src/pairing/TvPairingPanel.jsx",
  "apps/crablink-tv/src-tauri/src/commands/gateway.rs",
  "apps/crablink-tv/src-tauri/src/commands/pairing.rs",
  "scripts/check-crablink-tv-pairing-boundary.mjs",
  "scripts/check-crablink-tv-android-tv-boundary.mjs",
  "scripts/check-crablink-tv-debug-apk.sh",
  "scripts/check-crablink-tv-theme-default.mjs",
  "scripts/check-crablink-tv-android-build-task.mjs",
  "scripts/check-crablink-tv-brand-assets.mjs",
  "scripts/check-crablink-tv-codebundle-boundary.mjs",
];

const missingEntries = requiredEntries.filter(
  (entry) => !treeEntries.has(entry),
);

if (missingEntries.length > 0) {
  throw new Error(
    "CrabLink TV codebundle entries are missing:\n" +
      missingEntries
        .map((entry) => `- ${entry}`)
        .join("\n"),
  );
}

const requiredTextBodies = [
  "apps/crablink-tv/package.json",
  "apps/crablink-tv/src/app/TvApp.jsx",
  "apps/crablink-tv/src/focus/focusGraph.js",
  "apps/crablink-tv/src/focus/focusGraph.test.mjs",
  "apps/crablink-tv/src/focus/useTvRemoteNavigation.js",
  "apps/crablink-tv/src/navigation/tvRouteModel.js",
  "apps/crablink-tv/src/navigation/tvRouteModel.test.mjs",
  "apps/crablink-tv/src/navigation/useTvSectionHistory.js",
  "scripts/check-crablink-tv-route-boundary.mjs",
  "apps/crablink-tv/src/settings/tvPreferences.js",
  "apps/crablink-tv/src/settings/tvPreferences.test.mjs",
  "apps/crablink-tv/src/settings/useTvPreferences.js",
  "apps/crablink-tv/src/settings/TvSettingsPanel.jsx",
  "scripts/check-crablink-tv-settings-boundary.mjs",
  "apps/crablink-tv/src/pairing/tvPairingViewModel.js",
  "apps/crablink-tv/src/pairing/tvPairingViewModel.test.mjs",
  "apps/crablink-tv/src/pairing/TvPairingPanel.jsx",
  "apps/crablink-tv/src-tauri/src/commands/gateway.rs",
  "apps/crablink-tv/src-tauri/src/commands/pairing.rs",
  "scripts/check-crablink-tv-pairing-boundary.mjs",
  "apps/crablink-tv/src-tauri/Cargo.toml",
  "apps/crablink-tv/src-tauri/gen/android/app/build.gradle.kts",
  "apps/crablink-tv/src-tauri/gen/android/app/src/main/AndroidManifest.xml",
  "apps/crablink-tv/src-tauri/gen/android/app/src/main/java/com/rustyonions/crablink/tv/MainActivity.kt",
  "apps/crablink-tv/src-tauri/gen/android/buildSrc/src/main/java/com/rustyonions/crablink/tv/kotlin/BuildTask.kt",
  "apps/crablink-tv/src-tauri/gen/android/gradle/wrapper/gradle-wrapper.properties",
  "apps/crablink-tv/src-tauri/gen/android/gradlew",
];

for (const textPath of requiredTextBodies) {
  const bodyMarker = `## \`${textPath}\``;

  if (!bundle.includes(bodyMarker)) {
    throw new Error(
      `Expected a text body for ${textPath}.`,
    );
  }
}

const forbiddenTreeFragments = [
  "apps/crablink-tv/node_modules/",
  "apps/crablink-tv/dist/",
  "apps/crablink-tv/src-tauri/target/",
  "apps/crablink-tv/src-tauri/gen/android/.gradle/",
  "apps/crablink-tv/src-tauri/gen/android/.kotlin/",
  "apps/crablink-tv/src-tauri/gen/android/app/build/",
  "apps/crablink-tv/src-tauri/gen/android/build/",
  "apps/crablink-tv/src-tauri/gen/android/app/src/main/jniLibs/",
  "apps/crablink-tv/src-tauri/gen/android/local.properties",
  "artifacts/crablink-tv/",
];

for (const fragment of forbiddenTreeFragments) {
  if (fileTreeText.includes(fragment)) {
    throw new Error(
      `Generated or machine-local path leaked into bundle: ${fragment}`,
    );
  }
}

const tvEntryCount = [...treeEntries].filter(
  (entry) =>
    entry.startsWith("apps/crablink-tv/") ||
    entry.startsWith("scripts/check-crablink-tv") ||
    entry.startsWith("assets/app-logo."),
).length;

console.log("CrabLink TV codebundle boundary passed.");
console.log(`Bundle: ${bundlePath}`);
console.log(`TV-related entries: ${tvEntryCount}`);
console.log("TV frontend source: included.");
console.log("TV Rust source: included.");
console.log("Owned Android project source: included.");
console.log("Kotlin and Gradle bodies: included.");
console.log("Brand assets: summarized by size and digest.");
console.log("Compiled APKs, targets, Gradle state, and JNI links: excluded.");
