#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing creator profile acceptance source: ${relativePath}`);
  }

  return fs.readFileSync(absolutePath, 'utf8');
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/^\s*\/\/.*$/gmu, '');
}

function requireFragments(label, source, fragments) {
  for (const fragment of fragments) {
    if (!source.includes(fragment)) {
      throw new Error(`${label} missing: ${fragment}`);
    }
  }
}

function sliceAround(source, marker, radius = 900) {
  const index = source.indexOf(marker);

  if (index === -1) {
    throw new Error(`Missing app polish marker: ${marker}`);
  }

  return source.slice(
    Math.max(0, index - radius),
    index + marker.length + radius,
  );
}

const app = read('apps/crablink-tv/src/app/TvApp.jsx');
const panel = read('apps/crablink-tv/src/catalog/TvCreatorProfilePanel.jsx');
const panelExecutable = stripComments(panel);
const appProfilePolishExecutable = stripComments(
  [
    sliceAround(app, 'focusRequest={creatorProfileFocusRequest}'),
    sliceAround(app, 'refreshHomeCatalogWithProfileFocus', 1600),
    sliceAround(app, 'dataset.tvReturnFocusKey', 1200),
  ].join('\n'),
);
const acceptanceTest = read('apps/crablink-tv/src/catalog/TvCreatorProfileAcceptance.source.test.mjs');
const css = read('apps/crablink-tv/src/styles/tv.css');
const focusBoundary = read('scripts/check-crablink-tv-creator-profile-focus-boundary.mjs');
const profileBoundary = read('scripts/check-crablink-tv-creator-profile-boundary.mjs');
const browseBoundary = read('scripts/check-crablink-tv-creator-browse-react-boundary.mjs');
const thumbnailBoundary = read('scripts/check-crablink-tv-catalog-thumbnail-boundary.mjs');
const tvPackage = JSON.parse(read('apps/crablink-tv/package.json'));
const rootPackage = JSON.parse(read('package.json'));
const makeCodebundle = read('scripts/make_codebundle.sh');
const codebundleBoundary = read('scripts/check-crablink-tv-codebundle-boundary.mjs');

requireFragments('creator profile panel polish', panel, [
  'focusRequest',
  'creatorProfileFocusCopy',
  'TV_CREATOR_PROFILE_FOCUS_KIND.RETURN',
  'TV_CREATOR_PROFILE_FOCUS_REASON.PROFILE_OPENED',
  'TV_CREATOR_PROFILE_FOCUS_REASON.PROFILE_CLOSED',
  'TV_CREATOR_PROFILE_FOCUS_REASON.CATALOG_REFRESH',
  'tv-creator-profile-status',
  'data-tv-profile-focus-kind',
  'profile-focus-refresh',
  'Return focus target',
]);

requireFragments('TV app polish integration', app, [
  'creatorProfileFocusRequest',
  'focusRequest={creatorProfileFocusRequest}',
  'refreshHomeCatalogWithProfileFocus',
  'dataset.tvReturnFocusKey',
]);

requireFragments('creator profile acceptance source test', acceptanceTest, [
  'creator profile panel exposes visible focus and refresh status',
  'TV app passes the bounded profile focus request into the profile panel',
  'creator profile polish CSS exposes status surfaces',
  'creator profile polish keeps transport and authority absent in the new surface',
  'appProfilePolishExecutable',
]);

requireFragments('creator profile polish CSS', css, [
  '.tv-creator-profile-status',
  '.tv-creator-profile-status__label',
  '.tv-creator-profile-status__value',
  '.tv-creator-profile-status--return',
]);

for (const [label, source] of [
  ['creator profile app polish slice', appProfilePolishExecutable],
  ['creator profile panel', panelExecutable],
]) {
  for (const [forbiddenLabel, pattern] of [
    ['native invoke', /\binvoke\s*\(/u],
    ['network fetch', /\bfetch\s*\(/u],
    ['automatic interval', /\bsetInterval\s*\(/u],
    ['automatic timer', /\bsetTimeout\s*\(/u],
    ['local storage', /\blocalStorage\b/u],
    ['session storage', /\bsessionStorage\b/u],
    ['indexed storage', /\bindexedDB\b/u],
    ['wallet authority', /\bwallet\b/iu],
    ['ledger authority', /\bledger\b/iu],
    ['finality authority', /\bfinality\b/iu],
    ['native creator profile read', /tv_creator_profile_read/u],
  ]) {
    if (pattern.test(source)) {
      throw new Error(`${label} acquired forbidden ${forbiddenLabel}.`);
    }
  }
}

for (const [label, source] of [
  ['creator profile focus boundary', focusBoundary],
  ['creator profile boundary', profileBoundary],
  ['creator browse boundary', browseBoundary],
  ['catalog thumbnail boundary', thumbnailBoundary],
]) {
  requireFragments(label, source, [
    'NEXT_PATCH=PHASE9K_LIBRARY_VERIFIED_RENDER_DISPLAY',
  ]);
}

const tvScripts = tvPackage.scripts ?? {};
const rootScripts = rootPackage.scripts ?? {};

if (
  tvScripts['test:creator-profile-acceptance'] !==
  'node --test src/catalog/TvCreatorProfileAcceptance.source.test.mjs'
) {
  throw new Error('TV creator-profile-acceptance test script is missing or incorrect.');
}

if (
  tvScripts['check:creator-profile-acceptance'] !==
  'node ../../scripts/check-crablink-tv-creator-profile-acceptance-boundary.mjs'
) {
  throw new Error('TV creator-profile-acceptance boundary script is missing or incorrect.');
}

if (
  !String(tvScripts.check ?? '').includes(
    'npm run test:creator-profile-focus && npm run check:creator-profile-focus && npm run test:creator-profile-acceptance && npm run check:creator-profile-acceptance',
  )
) {
  throw new Error('TV acceptance does not run creator profile polish after focus checks.');
}

if (
  rootScripts['tv:creator-profile-acceptance:test'] !==
  'npm --prefix apps/crablink-tv run test:creator-profile-acceptance'
) {
  throw new Error('Root creator-profile-acceptance test script is missing or incorrect.');
}

if (
  rootScripts['tv:creator-profile-acceptance:check'] !==
  'node scripts/check-crablink-tv-creator-profile-acceptance-boundary.mjs'
) {
  throw new Error('Root creator-profile-acceptance boundary script is missing or incorrect.');
}

for (const requiredPath of [
  'apps/crablink-tv/src/catalog/TvCreatorProfileAcceptance.source.test.mjs',
  'scripts/check-crablink-tv-creator-profile-acceptance-boundary.mjs',
]) {
  if (
    !makeCodebundle.includes(requiredPath) &&
    !codebundleBoundary.includes(requiredPath)
  ) {
    throw new Error(`Future codebundle coverage missing: ${requiredPath}`);
  }
}

console.log('CrabLink TV creator profile acceptance polish boundary passed.');
console.log('Profile page: visible focus/refresh status is rendered from bounded local focus requests.');
console.log('Return path: Home passes creator profile focus state into the profile page without adding transport.');
console.log('Authority: no invoke, fetch, storage, wallet, ledger, native profile read, or finality behavior was added in the profile polish surface.');
console.log('PHASE8G_CREATOR_PROFILE_ACCEPTANCE_POLISH=GREEN');
console.log('NEXT_PATCH=PHASE9K_LIBRARY_VERIFIED_RENDER_DISPLAY');
