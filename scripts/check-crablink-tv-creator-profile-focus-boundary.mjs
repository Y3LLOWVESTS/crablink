#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing profile focus source: ${relativePath}`);
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

const model = read('apps/crablink-tv/src/catalog/tvCreatorProfileFocusModel.js');
const modelExecutable = stripComments(model);
const modelTest = read('apps/crablink-tv/src/catalog/tvCreatorProfileFocusModel.test.mjs');
const profileBoundary = read('scripts/check-crablink-tv-creator-profile-boundary.mjs');
const browseBoundary = read('scripts/check-crablink-tv-creator-browse-react-boundary.mjs');
const thumbnailBoundary = read('scripts/check-crablink-tv-catalog-thumbnail-boundary.mjs');
const app = read('apps/crablink-tv/src/app/TvApp.jsx');
const appExecutable = stripComments(app);
const tvPackage = JSON.parse(read('apps/crablink-tv/package.json'));
const rootPackage = JSON.parse(read('package.json'));
const makeCodebundle = read('scripts/make_codebundle.sh');
const codebundleBoundary = read('scripts/check-crablink-tv-codebundle-boundary.mjs');

requireFragments('creator profile focus model', model, [
  'TV_CREATOR_PROFILE_FOCUS_SCHEMA',
  'TV_CREATOR_PROFILE_FOCUS_KIND',
  'TV_CREATOR_PROFILE_FOCUS_REASON',
  'TV_CREATOR_PROFILE_FOCUS_LIMITS',
  'normalizeTvCreatorProfileFocusKey',
  'createIdleTvCreatorProfileFocusRequest',
  'createTvCreatorProfileFocusRequest',
  'SAFE_FOCUS_KEY',
]);

requireFragments('creator profile focus tests', modelTest, [
  'creator profile focus constants and idle request are explicit and immutable',
  'valid creator profile focus keys produce frozen return requests',
  'unsafe or empty focus keys fall back to creator browse search',
  'catalog refresh focus request uses explicit refresh reason',
]);

requireFragments('TV app focus integration', app, [
  "import { useEffect, useState } from 'react';",
  'createIdleTvCreatorProfileFocusRequest',
  'createTvCreatorProfileFocusRequest',
  'TV_CREATOR_PROFILE_FOCUS_KIND.RETURN',
  'TV_CREATOR_PROFILE_FOCUS_REASON.PROFILE_OPENED',
  'TV_CREATOR_PROFILE_FOCUS_REASON.PROFILE_CLOSED',
  'TV_CREATOR_PROFILE_FOCUS_REASON.CATALOG_REFRESH',
  'creatorProfileFocusRequest',
  'setCreatorProfileFocusRequest',
  'document.querySelectorAll',
  '[data-tv-focus-key]',
  'dataset.tvFocusKey',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'dataset.tvReturnFocusKey',
  'refreshHomeCatalogWithProfileFocus',
  'onRefresh={refreshHomeCatalogWithProfileFocus}',
]);

requireFragments('creator profile boundary predecessor', profileBoundary, [
  'PHASE8E_CREATOR_PROFILE_PAGE_FOUNDATION=GREEN',
  'NEXT_PATCH=PHASE9K_LIBRARY_VERIFIED_RENDER_DISPLAY',
]);

requireFragments('creator browse boundary next marker refresh', browseBoundary, [
  'NEXT_PATCH=PHASE9K_LIBRARY_VERIFIED_RENDER_DISPLAY',
]);

requireFragments('thumbnail boundary next marker refresh', thumbnailBoundary, [
  'NEXT_PATCH=PHASE9K_LIBRARY_VERIFIED_RENDER_DISPLAY',
]);

for (const [label, source] of [
  ['creator profile focus model', modelExecutable],
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
    ['receipt authority', /\breceipt\b/iu],
    ['reward authority', /\breward\b/iu],
    ['ROC authority', /\broc\b/iu],
    ['entitlement authority', /\bentitlement\b/iu],
    ['finality authority', /\bfinality\b/iu],
  ]) {
    if (pattern.test(source)) {
      throw new Error(`${label} acquired forbidden ${forbiddenLabel}.`);
    }
  }
}

for (const pattern of [
  /\binvoke\s*\(/u,
  /\bfetch\s*\(/u,
  /\bsetInterval\s*\(/u,
  /\bsetTimeout\s*\(/u,
  /\blocalStorage\b/u,
  /\bsessionStorage\b/u,
  /\bindexedDB\b/u,
  /tv_creator_profile_read/u,
]) {
  if (pattern.test(appExecutable)) {
    throw new Error(`TV app acquired forbidden focus behavior: ${pattern}`);
  }
}

const tvScripts = tvPackage.scripts ?? {};
const rootScripts = rootPackage.scripts ?? {};

if (
  tvScripts['test:creator-profile-focus'] !==
  'node --test src/catalog/tvCreatorProfileFocusModel.test.mjs'
) {
  throw new Error('TV creator-profile-focus test script is missing or incorrect.');
}

if (
  tvScripts['check:creator-profile-focus'] !==
  'node ../../scripts/check-crablink-tv-creator-profile-focus-boundary.mjs'
) {
  throw new Error('TV creator-profile-focus boundary script is missing or incorrect.');
}

if (
  !String(tvScripts.check ?? '').includes(
    'npm run test:creator-profile && npm run test:creator-profile-react && npm run check:creator-profile && npm run test:creator-profile-focus && npm run check:creator-profile-focus',
  )
) {
  throw new Error('TV acceptance does not run creator profile focus after creator profile checks.');
}

if (
  rootScripts['tv:creator-profile-focus:test'] !==
  'npm --prefix apps/crablink-tv run test:creator-profile-focus'
) {
  throw new Error('Root creator-profile-focus test script is missing or incorrect.');
}

if (
  rootScripts['tv:creator-profile-focus:check'] !==
  'node scripts/check-crablink-tv-creator-profile-focus-boundary.mjs'
) {
  throw new Error('Root creator-profile-focus boundary script is missing or incorrect.');
}

for (const requiredPath of [
  'apps/crablink-tv/src/catalog/tvCreatorProfileFocusModel.js',
  'apps/crablink-tv/src/catalog/tvCreatorProfileFocusModel.test.mjs',
  'scripts/check-crablink-tv-creator-profile-focus-boundary.mjs',
]) {
  if (
    !makeCodebundle.includes(requiredPath) &&
    !codebundleBoundary.includes(requiredPath)
  ) {
    throw new Error(`Future codebundle coverage missing: ${requiredPath}`);
  }
}

console.log('CrabLink TV creator profile focus boundary passed.');
console.log('Return focus: creator profile close requests bounded focus restoration to the originating creator card.');
console.log('Refresh: Home catalog refresh preserves a bounded creator-profile focus request without adding new transport.');
console.log('Authority: no invoke, fetch, storage, wallet, ledger, receipts, rewards, ROC, entitlement, or finality behavior was added.');
console.log('PHASE8F_PROFILE_RETURN_FOCUS_AND_REFRESH=GREEN');
console.log('NEXT_PATCH=PHASE9K_LIBRARY_VERIFIED_RENDER_DISPLAY');
