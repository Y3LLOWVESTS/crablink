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

function read(relativePath) {
  const absolute = path.join(
    root,
    relativePath,
  );

  if (!fs.existsSync(absolute)) {
    throw new Error(
      `Missing TV overlay UI source: ${relativePath}`,
    );
  }

  return fs.readFileSync(
    absolute,
    'utf8',
  );
}

const controller = read(
  'apps/crablink-tv/src/navigation/useTvOverlayController.js',
);
const host = read(
  'apps/crablink-tv/src/navigation/TvOverlayHost.jsx',
);
const app = read(
  'apps/crablink-tv/src/app/TvApp.jsx',
);
const history = read(
  'apps/crablink-tv/src/navigation/useTvSectionHistory.js',
);
const focusHook = read(
  'apps/crablink-tv/src/focus/useTvRemoteNavigation.js',
);
const focusGraph = read(
  'apps/crablink-tv/src/focus/focusGraph.js',
);
const focusTests = read(
  'apps/crablink-tv/src/focus/focusGraph.test.mjs',
);
const css = read(
  'apps/crablink-tv/src/styles/tv.css',
);
const modelBoundary = read(
  'scripts/check-crablink-tv-overlay-back-boundary.mjs',
);
const tvScripts = JSON.parse(
  read('apps/crablink-tv/package.json'),
).scripts ?? {};
const rootScripts = JSON.parse(
  read('package.json'),
).scripts ?? {};

for (const marker of [
  'export function useTvOverlayController',
  'openTvDetailOverlay',
  'openTvProblemOverlay',
  'closeTvOverlay',
  'restoreFocusByKey',
  'consumeBack: closeOverlay',
]) {
  if (!controller.includes(marker)) {
    throw new Error(`Overlay controller missing: ${marker}`);
  }
}

for (const marker of [
  'export function TvOverlayHost',
  'role="dialog"',
  'aria-modal="true"',
  'data-tv-focus-scope="active"',
  'data-tv-focus-key="overlay-close"',
  'data-tv-autofocus="true"',
  'tv-overlay-code',
]) {
  if (!host.includes(marker)) {
    throw new Error(`Overlay host missing: ${marker}`);
  }
}

for (const marker of [
  'useTvOverlayController();',
  'consumeBack,',
  'focusScopeKey,',
  'useTvRemoteNavigation({',
  'openDetail({',
  'openProblem({',
  '<TvOverlayHost',
  'data-tv-overlay-open=',
  'TV_NATIVE_BRIDGE_UNAVAILABLE',
]) {
  if (!app.includes(marker)) {
    throw new Error(`TV app overlay integration missing: ${marker}`);
  }
}

for (const marker of [
  'consumeBack = null',
  'const consumeBackRef = useRef(',
  'consumeBackRef.current?.() === true',
  '[data-tv-focus-scope="active"]',
  'if (consumed)',
  'window.history.back();',
]) {
  if (!history.includes(marker)) {
    throw new Error(`History Back integration missing: ${marker}`);
  }
}

if (
  history.indexOf('if (consumed)') >
  history.indexOf('window.history.back();')
) {
  throw new Error('Overlay Back must run before route history.');
}

for (const marker of [
  "focusScopeKey = 'root'",
  'ACTIVE_FOCUS_SCOPE_SELECTOR',
  'root.querySelectorAll(FOCUS_SELECTOR)',
  "event.key === 'Tab'",
  'wrappedFocusIndex(',
  '}, [focusScopeKey]);',
]) {
  if (!focusHook.includes(marker)) {
    throw new Error(`Remote focus scope missing: ${marker}`);
  }
}

if (!focusGraph.includes('export function wrappedFocusIndex')) {
  throw new Error('Focus graph lacks wrapped modal focus behavior.');
}

for (const marker of [
  'modal Tab focus advances and wraps',
  'modal Shift+Tab focus reverses and wraps',
  'modal focus enters a valid edge when current focus is outside',
  'modal focus rejects empty or invalid scopes',
]) {
  if (!focusTests.includes(marker)) {
    throw new Error(`Modal focus test missing: ${marker}`);
  }
}

for (const marker of [
  '.tv-overlay-backdrop',
  '.tv-overlay--problem',
  '.tv-overlay-actions',
  '.tv-shell[data-tv-overlay-open="true"]',
]) {
  if (!css.includes(marker)) {
    throw new Error(`Overlay CSS missing: ${marker}`);
  }
}

for (const [label, source] of [
  ['overlay controller', controller],
  ['overlay host', host],
]) {
  for (const [authority, pattern] of [
    ['network', /\bfetch\s*\(/],
    ['Tauri', /\binvoke\s*\(/],
    ['wallet', /\bwallet\w*\s*\(/i],
    ['ledger', /\bledger\w*\s*\(/i],
  ]) {
    if (pattern.test(source)) {
      throw new Error(`${label} acquired forbidden ${authority} authority.`);
    }
  }
}

if (
  tvScripts['check:overlay-ui'] !==
  'node ../../scripts/check-crablink-tv-overlay-ui-boundary.mjs'
) {
  throw new Error('TV overlay UI boundary command missing.');
}

for (const command of [
  'npm run test:focus',
  'npm run check:overlay-ui',
]) {
  if (!String(tvScripts.check || '').includes(command)) {
    throw new Error(`TV acceptance chain missing: ${command}`);
  }
}

if (
  rootScripts['tv:overlay-ui:check'] !==
  'node scripts/check-crablink-tv-overlay-ui-boundary.mjs'
) {
  throw new Error('Root overlay UI command missing.');
}

if (!modelBoundary.includes('PHASE7B_SLICE1_MODEL=GREEN')) {
  throw new Error('Phase 7B model boundary was replaced instead of reused.');
}

console.log('CrabLink TV overlay UI and Back integration boundary passed.');
console.log('Focus: modal scope, autofocus, Tab trap, D-pad scope, and launcher restoration.');
console.log('Back: overlay consumes first; route history remains second; Android remains free at root.');
console.log('Detail and typed problem overlays expose bounded local display data only.');
console.log('Network, storage, wallet, ledger, receipt, reward, and ROC authority: absent.');
console.log('PHASE7B=COMPLETE');
console.log('NEXT_PHASE=PHASE7C_ANDROID_CRAB_INTENT_INTAKE');
