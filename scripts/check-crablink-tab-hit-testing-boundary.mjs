#!/usr/bin/env node
/**
 * RO:WHAT — Regression gate for inactive-tab pointer and keyboard isolation in the CrabLink Tauri shell.
 * RO:WHY — Prevents mounted background tabs and body portals from intercepting controls on the active route.
 * RO:INTERACTS — app/App.jsx, MakePreviewStudioChrome.jsx, MakeLinkedMediaComposerPopover.jsx, Shell.css, make.css.
 * RO:INVARIANTS — one interactive tab; inactive tab trees are inert; body portals render only for the active tab; toast gaps pass pointer input through.
 * RO:SECURITY — UI isolation only; no backend, wallet, receipt, storage, or node authority.
 * RO:TEST — npm run check:tab-hit-testing-boundary.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

const read = (relative) =>
  fs.readFileSync(
    path.join(root, relative),
    'utf8',
  );

const app = read(
  'apps/crablink-tauri/src/app/App.jsx',
);

const previewChrome = read(
  'apps/crablink-tauri/src/pages/make/MakePreviewStudioChrome.jsx',
);

const linkedMediaPopover = read(
  'apps/crablink-tauri/src/pages/make/MakeLinkedMediaComposerPopover.jsx',
);

const shellCss = read(
  'apps/crablink-tauri/src/app/shell/Shell.css',
);

const makeCss = read(
  'apps/crablink-tauri/src/pages/make/make.css',
);

assert.match(
  app,
  /isActiveTab:\s*Boolean\(active\)/,
  'RoutePane must expose the real active-tab state to mounted route pages.',
);

assert.match(
  app,
  /inert=\{active\s*\?\s*undefined\s*:\s*''\}/,
  'Inactive mounted route trees must be inert so fixed descendants cannot receive pointer or keyboard input.',
);

assert.match(
  previewChrome,
  /const isActiveTab = app\?\.isActiveTab !== false;/,
  'Make preview chrome must derive the active-tab boundary from the route app contract.',
);

assert.match(
  previewChrome,
  /if \(!isActiveTab && linkedMediaComposer\)\s*\{\s*closeLinkedMediaComposer\(\);\s*\}/s,
  'Make must close its linked-media composer when its tab becomes inactive.',
);

assert.match(
  previewChrome,
  /<MakeLinkedMediaComposerPopover\s+active=\{isActiveTab\}/s,
  'The body portal must receive an explicit active-tab gate.',
);

assert.match(
  linkedMediaPopover,
  /active = true,/,
  'The linked-media portal must accept an explicit active flag.',
);

assert.match(
  linkedMediaPopover,
  /if \(!active \|\| !linkedMediaComposer \|\| typeof document === 'undefined'\)/,
  'The linked-media body portal must not render for an inactive tab.',
);

assert.match(
  makeCss,
  /\.make-linked-media-popover-backdrop\s*\{[\s\S]*?position:\s*fixed;[\s\S]*?inset:\s*0;/,
  'The regression gate expects the known full-window Make portal backdrop to remain explicitly identified.',
);

assert.match(
  shellCss,
  /\.cl-toast-host\s*\{[\s\S]*?pointer-events:\s*none;/,
  'Toast host gaps must not intercept page or scrollbar input.',
);

assert.match(
  shellCss,
  /\.cl-toast\s*\{[\s\S]*?pointer-events:\s*auto;/,
  'Visible toast cards must remain dismissible after host hit-testing is disabled.',
);

console.log('CrabLink inactive-tab hit-testing boundary passed.');
