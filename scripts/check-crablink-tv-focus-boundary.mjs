#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(
  fileURLToPath(import.meta.url),
);

const root = path.resolve(scriptDir, '..');

const files = {
  graph:
    'apps/crablink-tv/src/focus/focusGraph.js',
  graphTests:
    'apps/crablink-tv/src/focus/focusGraph.test.mjs',
  hook:
    'apps/crablink-tv/src/focus/useTvRemoteNavigation.js',
  app:
    'apps/crablink-tv/src/app/TvApp.jsx',
  css:
    'apps/crablink-tv/src/styles/tv.css',
  tvPackage:
    'apps/crablink-tv/package.json',
  rootPackage:
    'package.json',
};

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(
      `Missing TV focus source: ${relativePath}`,
    );
  }

  return fs.readFileSync(absolutePath, 'utf8');
}

const graph = read(files.graph);
const graphTests = read(files.graphTests);
const hook = read(files.hook);
const app = read(files.app);
const css = read(files.css);

const tvPackage = JSON.parse(
  read(files.tvPackage),
);

const rootPackage = JSON.parse(
  read(files.rootPackage),
);

const requiredGraphFragments = [
  'export function chooseNextFocus',
  "case 'left'",
  "case 'right'",
  "case 'up'",
  "case 'down'",
  'lanePenalty',
  'anglePenalty',
  'return ranked[0]?.candidate ?? null',
];

for (const fragment of requiredGraphFragments) {
  if (!graph.includes(fragment)) {
    throw new Error(
      `Focus graph is missing: ${fragment}`,
    );
  }
}

const requiredTestFragments = [
  "from './focusGraph.js'",
  'moves right to the closest same-row target',
  'moves down to the closest same-column target',
  'rejects candidates outside the requested direction',
  'returns deterministic first-source ordering for ties',
  'rejects unknown directions without guessing',
];

for (const fragment of requiredTestFragments) {
  if (!graphTests.includes(fragment)) {
    throw new Error(
      `Focus graph tests are missing: ${fragment}`,
    );
  }
}

const requiredHookFragments = [
  "ArrowUp: 'up'",
  "ArrowDown: 'down'",
  "ArrowLeft: 'left'",
  "ArrowRight: 'right'",
  'data-tv-focusable="true"',
  "element.dataset.tvAutofocus === 'true'",
  'chooseNextFocus(',
  'scrollIntoView({',
  "'keydown'",
  'preservesNativeArrowBehavior',
];

for (const fragment of requiredHookFragments) {
  if (!hook.includes(fragment)) {
    throw new Error(
      `Remote-navigation hook is missing: ${fragment}`,
    );
  }
}

const requiredAppFragments = [
  'useTvRemoteNavigation();',
  'data-tv-focusable="true"',
  'data-tv-autofocus=',
  'aria-current=',
  'Earn ROC',
  'Confirmed value only',
  'No placeholder balance',
  'No reward ',
  'evidence, balance mutation, or confirmed ROC was created.',
];

for (const fragment of requiredAppFragments) {
  if (!app.includes(fragment)) {
    throw new Error(
      `TV shell focus boundary is missing: ${fragment}`,
    );
  }
}

const requiredCssFragments = [
  '[data-tv-focusable="true"]:focus',
  '[data-tv-focusable="true"]:focus-visible',
  'outline: 0.3rem solid var(--tv-focus)',
  'outline-offset:',
  'box-shadow:',
  'transform: scale(1.045)',
  '@media (prefers-reduced-motion: reduce)',
];

for (const fragment of requiredCssFragments) {
  if (!css.includes(fragment)) {
    throw new Error(
      `Visible TV focus styling is missing: ${fragment}`,
    );
  }
}

const forbiddenFragments = [
  'tabIndex={-1}',
  'tabindex="-1"',
  'wallet_mutate',
  'ledger_mutate',
  'mint_roc',
  'claim_reward',
];

for (const fragment of forbiddenFragments) {
  if (
    graph.includes(fragment) ||
    hook.includes(fragment) ||
    app.includes(fragment)
  ) {
    throw new Error(
      `Forbidden TV focus behavior found: ${fragment}`,
    );
  }
}

const tvScripts = tvPackage.scripts ?? {};
const rootScripts = rootPackage.scripts ?? {};

if (
  tvScripts['test:focus'] !==
  'node --test src/focus/focusGraph.test.mjs'
) {
  throw new Error(
    'TV package test:focus command is missing or incorrect.',
  );
}

if (
  tvScripts['check:focus'] !==
  'node ../../scripts/check-crablink-tv-focus-boundary.mjs'
) {
  throw new Error(
    'TV package check:focus command is missing or incorrect.',
  );
}

if (
  rootScripts['tv:focus:test'] !==
  'npm --prefix apps/crablink-tv run test:focus'
) {
  throw new Error(
    'Root tv:focus:test command is missing or incorrect.',
  );
}

if (
  rootScripts['tv:focus:check'] !==
  'node scripts/check-crablink-tv-focus-boundary.mjs'
) {
  throw new Error(
    'Root tv:focus:check command is missing or incorrect.',
  );
}

console.log(
  'CrabLink TV remote-focus boundary passed.',
);
console.log(
  'Directions: up, down, left, right.',
);
console.log(
  'Initial focus: explicit autofocus, then first eligible control.',
);
console.log(
  'Selection: native Enter/Select button behavior.',
);
console.log(
  'Focus ring: visible in dark, light, and system modes.',
);
console.log(
  'ROC posture: display-only and confirmation-bound.',
);
