#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import {
  fileURLToPath,
} from 'node:url';

const root = path.resolve(
  path.dirname(
    fileURLToPath(import.meta.url),
  ),
  '..',
);

const paths = {
  coreMetadata:
    'packages/crablink-core/src/routeMetadata.js',
  coreTests:
    'packages/crablink-core/src/routeMetadata.test.mjs',
  coreIndex:
    'packages/crablink-core/src/index.js',
  corePackage:
    'packages/crablink-core/package.json',
  desktopRegistry:
    'apps/crablink-tauri/src/app/routeRegistry.js',
  desktopRouter:
    'apps/crablink-tauri/src/app/router.js',
  desktopTests:
    'apps/crablink-tauri/src/app/routeMetadata.shared.test.mjs',
  desktopPackage:
    'apps/crablink-tauri/package.json',
  tvMetadata:
    'apps/crablink-tv/src/navigation/tvRouteMetadata.js',
  tvTests:
    'apps/crablink-tv/src/navigation/tvRouteModel.test.mjs',
  tvApp:
    'apps/crablink-tv/src/app/TvApp.jsx',
  tvPackage:
    'apps/crablink-tv/package.json',
  rootPackage:
    'package.json',
};

function read(relativePath) {
  const absolute =
    path.join(root, relativePath);

  if (!fs.existsSync(absolute)) {
    throw new Error(
      `Missing route-metadata source: ${relativePath}`,
    );
  }

  return fs.readFileSync(
    absolute,
    'utf8',
  );
}

const coreMetadata =
  read(paths.coreMetadata);

const coreTests =
  read(paths.coreTests);

const coreIndex =
  read(paths.coreIndex);

const desktopRegistry =
  read(paths.desktopRegistry);

const desktopRouter =
  read(paths.desktopRouter);

const desktopTests =
  read(paths.desktopTests);

const tvMetadata =
  read(paths.tvMetadata);

const tvTests =
  read(paths.tvTests);

const tvApp =
  read(paths.tvApp);

const corePackage =
  JSON.parse(read(paths.corePackage));

const desktopPackage =
  JSON.parse(read(paths.desktopPackage));

const tvPackage =
  JSON.parse(read(paths.tvPackage));

const rootPackage =
  JSON.parse(read(paths.rootPackage));

for (const marker of [
  'export function normalizeRouteKind',
  'export function routeKindLabel',
  'export function assetKindLabel',
  'export function resolveAssetRouteOwner',
  'export function describeAssetKind',
  "chat: 'Chat Room'",
  "make: 'Make Studio'",
]) {
  if (!coreMetadata.includes(marker)) {
    throw new Error(
      `Shared route metadata is missing: ${marker}`,
    );
  }
}

for (const marker of [
  "from './routeMetadata.js'",
  'routeKindLabel',
  'assetKindLabel',
  'resolveAssetRouteOwner',
]) {
  if (!coreIndex.includes(marker)) {
    throw new Error(
      `Shared-core index is missing: ${marker}`,
    );
  }
}

for (const marker of [
  'provides canonical route labels',
  'formats generic snake and kebab route labels',
  'accepts bounded caller-owned display overrides',
  'provides canonical typed-asset labels',
  'maps supported asset kinds to their route owners',
  'maps unsupported asset kinds to the asset fallback',
  'describes asset kinds with immutable display truth',
]) {
  if (!coreTests.includes(marker)) {
    throw new Error(
      `Shared route-metadata test is missing: ${marker}`,
    );
  }
}

for (const marker of [
  'routeKindLabel as sharedRouteKindLabel',
  'export const routeKindLabel',
]) {
  if (!desktopRegistry.includes(marker)) {
    throw new Error(
      `Desktop route registry is missing: ${marker}`,
    );
  }
}

for (const forbidden of [
  'export function routeKindLabel',
  "value === 'notFound'",
  "value === 'make'",
]) {
  if (desktopRegistry.includes(forbidden)) {
    throw new Error(
      `Desktop route-label duplication remains: ${forbidden}`,
    );
  }
}

for (const marker of [
  'assetKindLabel',
  'resolveAssetRouteOwner',
  'BUILT_IN_ROUTE_KINDS',
  'title: assetKindLabel(assetKind)',
]) {
  if (!desktopRouter.includes(marker)) {
    throw new Error(
      `Desktop typed-asset mapping is missing: ${marker}`,
    );
  }
}

for (const forbidden of [
  'function titleForKind',
  'const typedRouteOwner = {',
  "title: 'Chat Room'",
]) {
  if (desktopRouter.includes(forbidden)) {
    throw new Error(
      `Desktop route-metadata duplication remains: ${forbidden}`,
    );
  }
}

for (const marker of [
  'desktop route labels delegate to shared core',
  'desktop typed video uses the shared asset mapping',
  'desktop unknown asset kinds fail to the generic asset owner',
  'desktop chat assets retain the Chat Room owner and label',
  'desktop route registry and shared owner selection agree',
  'desktop asset labels are the shared display values',
]) {
  if (!desktopTests.includes(marker)) {
    throw new Error(
      `Desktop route-metadata test is missing: ${marker}`,
    );
  }
}

for (const marker of [
  'TV_ROUTE_LABEL_OVERRIDES',
  "earn: 'Earn ROC'",
  'export function tvRouteLabel',
]) {
  if (!tvMetadata.includes(marker)) {
    throw new Error(
      `TV route metadata is missing: ${marker}`,
    );
  }
}

for (const marker of [
  "tvRouteLabel('home')",
  "tvRouteLabel('earn')",
  "tvRouteLabel('library')",
  "tvRouteLabel('pair')",
  "tvRouteLabel('settings')",
]) {
  if (!tvApp.includes(marker)) {
    throw new Error(
      `TV section does not use shared labels: ${marker}`,
    );
  }
}

for (const marker of [
  'TV route labels use shared core',
  'TV keeps the intentional Earn ROC override',
]) {
  if (!tvTests.includes(marker)) {
    throw new Error(
      `TV route-label test is missing: ${marker}`,
    );
  }
}

const coreScripts =
  corePackage.scripts ?? {};

const desktopScripts =
  desktopPackage.scripts ?? {};

const tvScripts =
  tvPackage.scripts ?? {};

const rootScripts =
  rootPackage.scripts ?? {};

if (
  coreScripts['test:route-metadata'] !==
  'node --test src/routeMetadata.test.mjs'
) {
  throw new Error(
    'Core route-metadata test script changed.',
  );
}

if (
  coreScripts['check:route-metadata'] !==
  'node ../../scripts/check-crablink-route-metadata-boundary.mjs'
) {
  throw new Error(
    'Core route-metadata boundary script changed.',
  );
}

if (
  !coreScripts.check?.includes(
    'npm run check:route-metadata',
  )
) {
  throw new Error(
    'Core standard acceptance omits route metadata.',
  );
}

if (
  desktopScripts['test:route-metadata'] !==
  'node --test src/app/routeMetadata.shared.test.mjs'
) {
  throw new Error(
    'Desktop route-metadata test script changed.',
  );
}

if (
  !desktopScripts.check?.includes(
    'npm run check:route-metadata',
  )
) {
  throw new Error(
    'Desktop standard acceptance omits route metadata.',
  );
}

if (
  tvScripts['check:route-metadata'] !==
  'node ../../scripts/check-crablink-route-metadata-boundary.mjs'
) {
  throw new Error(
    'TV route-metadata boundary script changed.',
  );
}

if (
  !tvScripts.check?.includes(
    'npm run check:route-metadata',
  )
) {
  throw new Error(
    'TV standard acceptance omits route metadata.',
  );
}

for (const scriptName of [
  'core:route-metadata:test',
  'core:route-metadata:boundary:check',
  'core:route-metadata:check',
  'core:desktop:route-metadata:test',
  'core:desktop:route-metadata:check',
  'tv:route-metadata:check',
]) {
  if (!rootScripts[scriptName]) {
    throw new Error(
      `Root route-metadata script is missing: ${scriptName}`,
    );
  }
}

for (const [
  label,
  forbidden,
] of [
  ['Chrome API', /\bchrome\s*\./],
  ['Tauri API', /@tauri-apps\/api/],
  ['Tauri invocation', /\binvoke\s*\(/],
  ['browser window', /\bwindow\s*\./],
  ['DOM document', /\bdocument\s*\./],
  ['network fetch', /\bfetch\s*\(/],
  ['local storage', /\blocalStorage\b/],
  ['session storage', /\bsessionStorage\b/],
]) {
  if (forbidden.test(coreMetadata)) {
    throw new Error(
      `Forbidden shared route-metadata ${label} found.`,
    );
  }
}

console.log(
  'CrabLink shared route-metadata boundary passed.',
);

console.log(
  'Route labels: one platform-neutral formatter with bounded caller overrides.',
);

console.log(
  'Asset kinds: one label and route-owner mapping used by desktop.',
);

console.log(
  'TV labels: shared formatter with only the intentional Earn ROC override.',
);

console.log(
  'Pages, history, focus, transport, storage, wallet, receipt, ROC, and ledger authority remain local or absent.',
);
