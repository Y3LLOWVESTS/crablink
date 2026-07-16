import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();

const buildSrcRoot = path.join(
  root,
  "apps",
  "crablink-tv",
  "src-tauri",
  "gen",
  "android",
  "buildSrc",
  "src",
  "main",
  "java",
);

function findFile(directory, filename) {
  for (const entry of fs.readdirSync(directory, {
    withFileTypes: true,
  })) {
    const candidate = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      const nested = findFile(candidate, filename);

      if (nested) {
        return nested;
      }
    } else if (entry.name === filename) {
      return candidate;
    }
  }

  return null;
}

const buildTaskPath = findFile(buildSrcRoot, "BuildTask.kt");

if (!buildTaskPath) {
  throw new Error("Generated Android BuildTask.kt was not found.");
}

const buildTask = fs.readFileSync(buildTaskPath, "utf8");

const requiredCli =
  "../node_modules/@tauri-apps/cli/tauri.js";

if (!buildTask.includes(requiredCli)) {
  throw new Error(
    `BuildTask does not invoke the TV-local CLI: ${requiredCli}`,
  );
}

const ambiguousNodeInvocation =
  /(?:mutable)?listOf\(\s*"tauri"\s*,\s*"android"\s*,\s*"android-studio-script"/m;

if (ambiguousNodeInvocation.test(buildTask)) {
  throw new Error(
    "BuildTask still passes bare `tauri` to Node.",
  );
}

const localCliPath = path.join(
  root,
  "apps",
  "crablink-tv",
  "node_modules",
  "@tauri-apps",
  "cli",
  "tauri.js",
);

if (!fs.existsSync(localCliPath)) {
  throw new Error(
    `TV-local Tauri CLI entry point is missing: ${localCliPath}`,
  );
}

console.log("CrabLink TV Android BuildTask boundary passed.");
console.log(`BuildTask: ${buildTaskPath}`);
console.log(`CLI argument: ${requiredCli}`);
console.log(`Resolved CLI: ${localCliPath}`);
