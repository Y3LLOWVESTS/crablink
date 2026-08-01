#!/usr/bin/env node

/**
 * RO:WHAT — Classifies and verifies the CrabLink FINAL_BETA Phase 0 baseline.
 * RO:WHY — Locks the desktop-first scope before runtime product work begins.
 * RO:INTERACTS — FINAL_BETA.MD, FINAL_BETA_NOTES.md, CrabLink desktop/TV,
 *                sibling RustyOnions and ROX Anchor repositories.
 * RO:INVARIANTS — Read-only; no runtime mutation; no secrets; truthful labels.
 * RO:METRICS — Prints deterministic GREEN/RED inventory records only.
 * RO:CONFIG — RUSTYONIONS_ROOT and ROX_ANCHOR_ROOT may override default paths.
 * RO:SECURITY — Reads source markers only and never emits private material.
 * RO:TEST — Run directly with Node from the CrabLink repository root.
 */

import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const rustyonionsRoot =
  process.env.RUSTYONIONS_ROOT ??
  "/Users/mymac/Desktop/RustyOnions";
const roxAnchorRoot =
  process.env.ROX_ANCHOR_ROOT ??
  "/Users/mymac/Desktop/rox-anchor";

let failures = 0;

function absolute(relativePath) {
  return path.join(repoRoot, relativePath);
}

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

function pass(label, detail = "YES") {
  console.log(`${label}=${detail}`);
}

function fail(label, detail) {
  failures += 1;
  console.error(`${label}=RED:${detail}`);
}

function requirePath(label, filePath) {
  if (fs.existsSync(filePath)) {
    pass(label, "PRESENT");
    return true;
  }

  fail(label, `MISSING:${filePath}`);
  return false;
}

function requireContains(label, filePath, expected) {
  const source = readFile(filePath);

  if (source === null) {
    fail(label, `SOURCE_MISSING:${filePath}`);
    return;
  }

  if (source.includes(expected)) {
    pass(label, "PRESENT");
    return;
  }

  fail(label, `MARKER_MISSING:${expected}`);
}

console.log("FINAL_BETA_PHASE0_INVENTORY=STARTED");
console.log("CHECK_MODE=READ_ONLY");
console.log("RUNTIME_MUTATION=NO");
console.log("RUSTYONIONS_MUTATION=NO");
console.log("MOBILE_RUNTIME_MUTATION=NO");

console.log("\n=== FOUNDATION ===");

requirePath(
  "APPS_CRABLINK_TAURI",
  absolute("apps/crablink-tauri"),
);
requirePath(
  "PACKAGES_CRABLINK_CORE",
  absolute("packages/crablink-core"),
);
requirePath(
  "PACKAGES_CRABLINK_PLATFORM",
  absolute("packages/crablink-platform"),
);
requirePath(
  "CRATES_CRABLINK_NATIVE_CORE",
  absolute("crates/crablink-native-core"),
);
requirePath(
  "CRABLINK_TV_SOURCE",
  absolute("apps/crablink-tv"),
);
requirePath(
  "CRABLINK_ANDROID_PARKED_SCAFFOLD",
  absolute("apps/crablink-android"),
);

console.log("\n=== PLAN AND NOTES ===");

const finalBetaPlan = absolute("FINAL_BETA.MD");
const finalBetaNotes = absolute("FINAL_BETA_NOTES.md");

requirePath("FINAL_BETA_PLAN", finalBetaPlan);
requirePath("FINAL_BETA_NOTES", finalBetaNotes);

requireContains(
  "FINAL_BETA_LOCAL_FOLLOWING_ADDENDUM",
  finalBetaPlan,
  "FINAL_BETA_LOCAL_FOLLOWING_QUICKCHAIN_ADDENDUM_V1",
);
requireContains(
  "FOLLOWING_LIST_LOCAL_OWNER",
  finalBetaPlan,
  "FOLLOWING_LIST_OWNER=LOCAL_CRABLINK_APP",
);
requireContains(
  "FOLLOWING_LIST_LOCAL_STORAGE",
  finalBetaPlan,
  "FOLLOWING_LIST_DEFAULT_STORAGE=LOCAL_DEVICE_STORAGE",
);
requireContains(
  "PUBLIC_FOLLOWER_COUNT_FORBIDDEN",
  finalBetaPlan,
  "PUBLIC_FOLLOWER_COUNT=FORBIDDEN",
);
requireContains(
  "PUBLIC_FOLLOWING_COUNT_FORBIDDEN",
  finalBetaPlan,
  "PUBLIC_FOLLOWING_COUNT=FORBIDDEN",
);
requireContains(
  "LOCAL_FIRST_FEED_COMPOSITION",
  finalBetaPlan,
  "HOME_FEED_COMPOSITION=LOCAL_FIRST",
);
requireContains(
  "NETWORK_HYDRATED_FEED",
  finalBetaPlan,
  "HOME_FEED_CONTENT_SOURCE=PUBLIC_NETWORK_TIMELINES",
);
requireContains(
  "QUICKCHAIN_REWARD_CONTINUITY",
  finalBetaPlan,
  "QUICKCHAIN_REWARD_EVIDENCE=NOT_SCOPED_OUT",
);
requireContains(
  "CREATOR_REWARD_PIPELINE_REQUIRED",
  finalBetaPlan,
  "CREATOR_REWARD_PIPELINE=REQUIRED",
);
requireContains(
  "CACHE_ONLY_REWARD_FINALITY_FORBIDDEN",
  finalBetaPlan,
  "CACHE_ONLY_REWARD_FINALITY=FORBIDDEN",
);

console.log("\n=== DESKTOP BASELINE ===");

const homeSource = absolute(
  "apps/crablink-tauri/src/pages/home/HomePage.jsx",
);
const profileSource = absolute(
  "apps/crablink-tauri/src/pages/profile/ProfilePublicView.jsx",
);
const siteSetupSource = absolute(
  "apps/crablink-tauri/src/pages/site/SiteGuidedSetup.jsx",
);
const siteTemplatesSource = absolute(
  "apps/crablink-tauri/src/pages/site/siteTemplates.js",
);

requireContains(
  "HOME_ROUTE_SMOKE_DASHBOARD",
  homeSource,
  "Route Smoke Dashboard",
);
requireContains(
  "HOME_MANUAL_SMOKE_SEQUENCE",
  homeSource,
  "Manual smoke sequence",
);
requireContains(
  "HOME_LOCAL_PROOF_DASHBOARD",
  homeSource,
  "Local proof memory, not backend authority",
);
requireContains(
  "PUBLIC_PROFILE_READ_ONLY_BASELINE",
  profileSource,
  "This page is read-only",
);
requireContains(
  "SITE_HTML_IMPORT_BASELINE",
  siteSetupSource,
  "Import HTML",
);
requireContains(
  "SITE_ROOT_HTML_EDITOR_BASELINE",
  siteSetupSource,
  'label="Root HTML"',
);
requireContains(
  "SITE_REFERENCE_GRAPH_TEMPLATE_BASELINE",
  siteTemplatesSource,
  "Reference Graph Smoke",
);
requireContains(
  "SITE_CREATOR_LANDING_TEMPLATE_BASELINE",
  siteTemplatesSource,
  "Creator Landing",
);
requireContains(
  "SITE_IMAGE_SHOWCASE_TEMPLATE_BASELINE",
  siteTemplatesSource,
  "Image Showcase",
);

console.log("\n=== QUICKCHAIN BOUNDARIES ===");

for (const relativePath of [
  "docs/tauri/QUICKCHAIN_CLIENT_BOUNDARY.md",
  "docs/tauri/QUICKCHAIN_READINESS_BOUNDARY.md",
  "docs/tauri/QUICKCHAIN_PHASE5_CLIENT_ANCHOR_BOUNDARY.md",
  "docs/tauri/QUICKCHAIN_PHASE5_CLIENT_DA_FALLBACK_BOUNDARY.md",
  "docs/tauri/QUICKCHAIN_PHASE5_CLIENT_EXTERNAL_POSTURE_BOUNDARY.md",
  "scripts/check-quickchain-client-boundary.mjs",
]) {
  requirePath(
    `QUICKCHAIN_SOURCE_${relativePath
      .replaceAll("/", "_")
      .replaceAll(".", "_")
      .toUpperCase()}`,
    absolute(relativePath),
  );
}

pass(
  "QUICKCHAIN_PRIVATE_MULTI_NODE_RUNTIME",
  "NOT_YET_PROVEN_BY_PHASE0",
);

console.log("\n=== RUSTYONIONS BASELINE ===");

const feedFacet = path.join(
  rustyonionsRoot,
  "crates/micronode/src/facets/feed.rs",
);
const graphFacet = path.join(
  rustyonionsRoot,
  "crates/micronode/src/facets/graph.rs",
);

requirePath("RUSTYONIONS_REPOSITORY", rustyonionsRoot);
requireContains(
  "RUSTYONIONS_FEED_FACET_STUB",
  feedFacet,
  "Stub only; no runtime behavior yet",
);
requireContains(
  "RUSTYONIONS_GRAPH_FACET_STUB",
  graphFacet,
  "Stub only; no runtime behavior yet",
);

console.log("\n=== ROX ANCHOR FOUNDATION ===");

requirePath("ROX_ANCHOR_REPOSITORY", roxAnchorRoot);

for (const relativePath of [
  "README.md",
  "TODO.md",
  "IDB.md",
  "BUILD_PLAN.md",
  "Cargo.toml",
  "Anchor.toml",
]) {
  requirePath(
    `ROX_ANCHOR_${relativePath
      .replaceAll(".", "_")
      .toUpperCase()}`,
    path.join(roxAnchorRoot, relativePath),
  );
}

console.log("\n=== RESULT ===");

if (failures === 0) {
  console.log("FINAL_BETA_PHASE0_INVENTORY=GREEN");
  console.log("FAILURE_COUNT=0");
  console.log("RUNTIME_BEHAVIOR_CHANGED=NO");
  console.log("RUSTYONIONS_MUTATED=NO");
  console.log("MOBILE_RUNTIME_MUTATED=NO");
  console.log(
    "NEXT_PHASE=FINAL_BETA_PHASE1_CLEAN_DESKTOP_BASELINE",
  );
  process.exitCode = 0;
} else {
  console.error("FINAL_BETA_PHASE0_INVENTORY=RED");
  console.error(`FAILURE_COUNT=${failures}`);
  console.error("RUNTIME_BEHAVIOR_CHANGED=NO");
  console.error("RUSTYONIONS_MUTATED=NO");
  console.error("MOBILE_RUNTIME_MUTATED=NO");
  console.error("NEXT_ACTION=FIX_FIRST_REPORTED_FAILURE");
  process.exitCode = 1;
}
