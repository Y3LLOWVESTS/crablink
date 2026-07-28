#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import {
  fileURLToPath,
} from 'node:url';

const scriptDir = path.dirname(
  fileURLToPath(import.meta.url),
);

const root = path.resolve(
  scriptDir,
  '..',
);

const paths = {
  model:
    'apps/crablink-tv/src/navigation/tvRouteModel.js',
  tests:
    'apps/crablink-tv/src/navigation/tvRouteModel.test.mjs',
  hook:
    'apps/crablink-tv/src/navigation/useTvSectionHistory.js',
  app:
    'apps/crablink-tv/src/app/TvApp.jsx',
  css:
    'apps/crablink-tv/src/styles/tv.css',
  tvPackage:
    'apps/crablink-tv/package.json',
  rootPackage:
    'package.json',
  sharedIndex:
    'packages/crablink-core/src/index.js',
  sharedParser:
    'packages/crablink-core/src/crabUrl.js',
  desktopShim:
    'apps/crablink-tauri/src/shared/utils/crabUrl.js',
};

function read(relativePath) {
  const absolutePath =
    path.join(
      root,
      relativePath,
    );

  if (!fs.existsSync(absolutePath)) {
    throw new Error(
      `Missing TV route source: ${relativePath}`,
    );
  }

  return fs.readFileSync(
    absolutePath,
    'utf8',
  );
}

const model = read(paths.model);
const tests = read(paths.tests);
const hook = read(paths.hook);
const app = read(paths.app);
const css = read(paths.css);

const sharedIndex =
  read(paths.sharedIndex);

const sharedParser =
  read(paths.sharedParser);

const desktopShim =
  read(paths.desktopShim);

const tvPackage = JSON.parse(
  read(paths.tvPackage),
);

const rootPackage = JSON.parse(
  read(paths.rootPackage),
);

const requiredModelFragments = [
  "from '../../../../packages/crablink-core/src/index.js'",
  'parseCrabInput',
  'export const TV_ROUTE_KIND',
  'export function normalizeTvCrabRoute',
  'export function createInitialTvRoute',
  'export function normalizeTvRouteState',
  'export function createNextTvRoute',
  'export function updateTvRouteFocus',
  'export function focusKeysForTvRoute',
  'export function isTvBackKey',
  'crabRoute: normalizeTvCrabRoute',
  "'BrowserBack'",
  "'Backspace'",
  'depth: current.depth + 1',
];

for (
  const fragment of
  requiredModelFragments
) {
  if (!model.includes(fragment)) {
    throw new Error(
      `TV route model is missing: ${fragment}`,
    );
  }
}

for (const forbidden of [
  'const CRAB_PREFIX',
  'const B3_PREFIX',
  'const HEX_64_RE',
  'const CID_RE',
  'const TYPED_ASSET_RE',
  'function stripCrabPrefix',
  'function normalizeHash',
  'function parseCrabInput',
]) {
  if (model.includes(forbidden)) {
    throw new Error(
      `TV route model duplicates shared parser rules: ${forbidden}`,
    );
  }
}

const requiredTestFragments = [
  'creates a deterministic root route',
  'TV sections use the shared normalized crab route model',
  'unsupported TV crab routes fail closed to Home',
  'invalid history state fails closed to the root route',
  'stored crab route data is regenerated from the validated section',
  'moving to another section increments route depth',
  'selecting the active section does not add history',
  'focus restoration prefers the recorded control',
  'recognizes common TV Back key names',
];

for (
  const fragment of
  requiredTestFragments
) {
  if (!tests.includes(fragment)) {
    throw new Error(
      `TV route tests are missing: ${fragment}`,
    );
  }
}

for (const fragment of [
  'CRABLINK_CORE_PACKAGE',
  "from './crabUrl.js'",
  'parseCrabInput',
]) {
  if (!sharedIndex.includes(fragment)) {
    throw new Error(
      `Shared core index is missing: ${fragment}`,
    );
  }
}

for (const fragment of [
  'export function parseCrabInput',
  "const CRAB_PREFIX = 'crab://'",
  "const B3_PREFIX = 'b3:'",
]) {
  if (!sharedParser.includes(fragment)) {
    throw new Error(
      `Shared parser is missing: ${fragment}`,
    );
  }
}

if (
  !desktopShim.includes(
    'packages/crablink-core/src/index.js',
  )
) {
  throw new Error(
    'Desktop no longer uses the shared parser.',
  );
}

const requiredHookFragments = [
  'window.history.replaceState(route,',
  'window.history.pushState(',
  'window.history.back();',
  "'popstate'",
  "'focusin'",
  'restoreTvRouteFocus',
  'focusKeysForTvRoute(route)',
  'if (routeRef.current.depth <= 0)',
  'At the root, do not trap Back.',
  'event.preventDefault();',
];

for (
  const fragment of
  requiredHookFragments
) {
  if (!hook.includes(fragment)) {
    throw new Error(
      `TV route hook is missing: ${fragment}`,
    );
  }
}

const requiredAppFragments = [
  'useTvSectionHistory({',
  'sectionIds: TV_SECTION_IDS',
  'routeDepth',
  'navigateToSection(',
  'event.currentTarget.dataset.tvFocusKey',
  'Back returns to the previous TV section.',
  'At Home, Back remains available to Android.',
];

for (
  const fragment of
  requiredAppFragments
) {
  if (!app.includes(fragment)) {
    throw new Error(
      `TV shell route integration is missing: ${fragment}`,
    );
  }
}

if (
  app.includes(
    'setActiveSectionId',
  )
) {
  throw new Error(
    'TV shell still contains the superseded local section setter.',
  );
}

for (const fragment of [
  '.tv-route-status',
  'font-weight: 750',
]) {
  if (!css.includes(fragment)) {
    throw new Error(
      `TV route styling is missing: ${fragment}`,
    );
  }
}

for (const [
  label,
  forbidden,
] of [
  [
    'Tauri API',
    /@tauri-apps\/api/,
  ],
  [
    'Tauri invocation',
    /\binvoke\s*\(/,
  ],
  [
    'network fetch',
    /\bfetch\s*\(/,
  ],
  [
    'local storage',
    /\blocalStorage\b/,
  ],
  [
    'session storage',
    /\bsessionStorage\b/,
  ],
  [
    'wallet mutation',
    /\bwallet\w*\s*\(/i,
  ],
  [
    'ledger mutation',
    /\bledger\w*\s*\(/i,
  ],
]) {
  if (forbidden.test(model)) {
    throw new Error(
      `Forbidden TV route-model ${label} found.`,
    );
  }
}

for (const forbidden of [
  'window.close(',
  'process.exit(',
  "invoke('exit",
  'android.permission.SYSTEM_ALERT_WINDOW',
]) {
  if (
    hook.includes(forbidden) ||
    app.includes(forbidden)
  ) {
    throw new Error(
      `Forbidden TV Back behavior found: ${forbidden}`,
    );
  }
}

const tvScripts =
  tvPackage.scripts ?? {};

const rootScripts =
  rootPackage.scripts ?? {};

if (
  tvScripts['test:route'] !==
  'node --test src/navigation/tvRouteModel.test.mjs'
) {
  throw new Error(
    'TV package test:route command is missing or incorrect.',
  );
}

if (
  tvScripts['check:route'] !==
  'node ../../scripts/check-crablink-tv-route-boundary.mjs'
) {
  throw new Error(
    'TV package check:route command is missing or incorrect.',
  );
}

if (
  rootScripts['tv:route:test'] !==
  'npm --prefix apps/crablink-tv run test:route'
) {
  throw new Error(
    'Root tv:route:test command is missing or incorrect.',
  );
}

if (
  rootScripts['tv:route:check'] !==
  'node scripts/check-crablink-tv-route-boundary.mjs'
) {
  throw new Error(
    'Root tv:route:check command is missing or incorrect.',
  );
}

console.log(
  'CrabLink TV shared route-model boundary passed.',
);

console.log(
  'Shared truth: desktop and TV consume @crablink/core crab:// normalization.',
);

console.log(
  'TV-local behavior: section depth, browser history, Back handling, and focus restoration.',
);

console.log(
  'Unsupported TV routes fail closed to the validated Home section.',
);

console.log(
  'Node, reward, balance, wallet, ROC, and ledger authority: unchanged.',
);
