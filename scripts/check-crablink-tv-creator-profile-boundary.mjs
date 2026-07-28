#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing creator profile source: ${relativePath}`);
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

const model = read('apps/crablink-tv/src/catalog/tvCreatorProfileModel.js');
const modelExecutable = stripComments(model);
const modelTest = read('apps/crablink-tv/src/catalog/tvCreatorProfileModel.test.mjs');
const panel = read('apps/crablink-tv/src/catalog/TvCreatorProfilePanel.jsx');
const panelExecutable = stripComments(panel);
const sourceTest = read('apps/crablink-tv/src/catalog/TvCreatorProfilePanel.source.test.mjs');
const app = read('apps/crablink-tv/src/app/TvApp.jsx');
const css = read('apps/crablink-tv/src/styles/tv.css');
const routeHandoff = read('apps/crablink-tv/src/catalog/tvCatalogRouteHandoff.js');
const thumbnailBoundary = read('scripts/check-crablink-tv-catalog-thumbnail-boundary.mjs');
const tvPackage = JSON.parse(read('apps/crablink-tv/package.json'));
const rootPackage = JSON.parse(read('package.json'));
const makeCodebundle = read('scripts/make_codebundle.sh');
const codebundleBoundary = read('scripts/check-crablink-tv-codebundle-boundary.mjs');

requireFragments('creator profile model', model, [
  'TV_CREATOR_PROFILE_SCHEMA',
  'TV_CREATOR_PROFILE_KIND',
  'TV_CREATOR_PROFILE_LIMITS',
  'createIdleTvCreatorProfile',
  'projectTvCreatorProfile',
  'resolveTvRouteInput',
  "item?.kind !== 'creator'",
  "reviewed.owner !== 'site'",
]);

requireFragments('creator profile tests', modelTest, [
  'creator profile constants and idle state are explicit and immutable',
  'catalog creator site routes become bounded creator profiles',
  'non-creator and non-site routes fail closed',
  'creator profile bounds text and return focus key',
]);

requireFragments('creator profile panel', panel, [
  'TvCreatorProfilePanel',
  'TV_CREATOR_PROFILE_KIND.READY',
  'tv-creator-profile-page',
  'creator-profile-close',
  'profileView.profileCrabUrl',
  'Back to creators',
]);

requireFragments('creator profile source tests', sourceTest, [
  'creator profile model reviews creator site routes without transport authority',
  'creator profile panel renders a local visible page and close control',
  'TV app routes creator cards to profile state while preserving catalog handoff for problems',
  'creator profile CSS exposes visible TV page and card surfaces',
]);

requireFragments('TV app creator profile integration', app, [
  'createIdleTvCreatorProfile',
  'projectTvCreatorProfile',
  'TvCreatorProfilePanel',
  'creatorProfileView',
  'setCreatorProfileView',
  "item?.kind === 'creator'",
  "handoff.route?.owner === 'site'",
  'onCreator={inspectCatalogItem}',
]);

requireFragments('route handoff still owns creator route review', routeHandoff, [
  "reviewed.owner === 'site'",
  "return 'home';",
]);

requireFragments('thumbnail boundary predecessor', thumbnailBoundary, [
  'PHASE8D_BOUNDED_CATALOG_THUMBNAILS=GREEN',
]);

requireFragments('creator profile CSS', css, [
  '.tv-creator-profile-page',
  '.tv-creator-profile-page__heading',
  '.tv-creator-profile-page__copy',
  '.tv-creator-profile-card',
  '.tv-creator-profile-card__label',
]);

for (const [label, source] of [
  ['creator profile model', modelExecutable],
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
    ['raw image element', /<img\b/u],
    ['raw source attribute', /\bsrc=/u],
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

if (/tv_creator_profile_read/u.test(app)) {
  throw new Error('TV app must not add a native creator profile read command.');
}

const tvScripts = tvPackage.scripts ?? {};
const rootScripts = rootPackage.scripts ?? {};

if (
  tvScripts['test:creator-profile'] !==
  'node --test src/catalog/tvCreatorProfileModel.test.mjs'
) {
  throw new Error('TV creator-profile model test script is missing or incorrect.');
}

if (
  tvScripts['test:creator-profile-react'] !==
  'node --test src/catalog/TvCreatorProfilePanel.source.test.mjs'
) {
  throw new Error('TV creator-profile React source test script is missing or incorrect.');
}

if (
  tvScripts['check:creator-profile'] !==
  'node ../../scripts/check-crablink-tv-creator-profile-boundary.mjs'
) {
  throw new Error('TV creator-profile boundary script is missing or incorrect.');
}

if (
  !String(tvScripts.check ?? '').includes(
    'npm run test:catalog-thumbnail && npm run check:catalog-thumbnail && npm run test:creator-profile && npm run test:creator-profile-react && npm run check:creator-profile',
  )
) {
  throw new Error('TV acceptance does not run thumbnail checks before creator profile checks.');
}

if (
  rootScripts['tv:creator-profile:test'] !==
  'npm --prefix apps/crablink-tv run test:creator-profile'
) {
  throw new Error('Root creator-profile test script is missing or incorrect.');
}

if (
  rootScripts['tv:creator-profile-react:test'] !==
  'npm --prefix apps/crablink-tv run test:creator-profile-react'
) {
  throw new Error('Root creator-profile React test script is missing or incorrect.');
}

if (
  rootScripts['tv:creator-profile:check'] !==
  'node scripts/check-crablink-tv-creator-profile-boundary.mjs'
) {
  throw new Error('Root creator-profile boundary script is missing or incorrect.');
}

for (const requiredPath of [
  'apps/crablink-tv/src/catalog/tvCreatorProfileModel.js',
  'apps/crablink-tv/src/catalog/tvCreatorProfileModel.test.mjs',
  'apps/crablink-tv/src/catalog/TvCreatorProfilePanel.jsx',
  'apps/crablink-tv/src/catalog/TvCreatorProfilePanel.source.test.mjs',
  'scripts/check-crablink-tv-creator-profile-boundary.mjs',
]) {
  if (
    !makeCodebundle.includes(requiredPath) &&
    !codebundleBoundary.includes(requiredPath)
  ) {
    throw new Error(`Future codebundle coverage missing: ${requiredPath}`);
  }
}

console.log('CrabLink TV creator profile boundary passed.');
console.log('Projection: creator cards become bounded local profile views only after reviewed site-route ownership.');
console.log('Rendering: Home exposes a visible creator profile page with a remote-focusable return control.');
console.log('Authority: no invoke, fetch, storage, image src, wallet, ledger, receipts, rewards, ROC, entitlement, or finality behavior was added.');
console.log('PHASE8E_CREATOR_PROFILE_PAGE_FOUNDATION=GREEN');
console.log('NEXT_PATCH=PHASE9K_LIBRARY_VERIFIED_RENDER_DISPLAY');
