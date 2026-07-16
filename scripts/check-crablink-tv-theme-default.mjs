import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const indexPath = path.join(
  process.cwd(),
  "apps",
  "crablink-tv",
  "index.html",
);

const source = fs.readFileSync(indexPath, "utf8");

const requiredFragments = [
  "CrabLink TV theme bootstrap: begin",
  "crablink.theme.mode",
  "new Set(['light', 'dark', 'system'])",
  "let mode = 'dark'",
  "dataset.themeMode = mode",
  "dataset.theme = resolvedTheme",
  'content="dark light"',
];

for (const fragment of requiredFragments) {
  if (!source.includes(fragment)) {
    throw new Error(
      `TV dark-default boundary is missing: ${fragment}`,
    );
  }
}

if (
  !source.includes(
    'data-theme="dark" data-theme-mode="dark"',
  )
) {
  throw new Error(
    "The pre-JavaScript HTML fallback is not dark.",
  );
}

console.log("CrabLink TV theme-default boundary passed.");
console.log("First-run default: dark.");
console.log("Supported choices: light, dark, system.");
console.log("Storage key: crablink.theme.mode.");
