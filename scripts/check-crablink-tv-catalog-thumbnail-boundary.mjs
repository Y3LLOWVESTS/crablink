#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing thumbnail source: ${relativePath}`);
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

const thumbnailModel = read('apps/crablink-tv/src/catalog/tvCatalogThumbnailModel.js');
const thumbnailExecutable = stripComments(thumbnailModel);
const thumbnailTest = read('apps/crablink-tv/src/catalog/tvCatalogThumbnailModel.test.mjs');
const catalogModel = read('apps/crablink-tv/src/catalog/tvCatalogModel.js');
const panel = read('apps/crablink-tv/src/catalog/TvHomeCatalogPanel.jsx');
const panelExecutable = stripComments(panel);
const css = read('apps/crablink-tv/src/styles/tv.css');
const tvPackage = JSON.parse(read('apps/crablink-tv/package.json'));
const rootPackage = JSON.parse(read('package.json'));
const makeCodebundle = read('scripts/make_codebundle.sh');
const codebundleBoundary = read('scripts/check-crablink-tv-codebundle-boundary.mjs');

requireFragments('thumbnail model', thumbnailModel, [
  'TV_CATALOG_THUMBNAIL_SCHEMA',
  'TV_CATALOG_THUMBNAIL_KIND',
  'TV_CATALOG_THUMBNAIL_LIMITS',
  'projectTvCatalogThumbnail',
  'resolveTvRouteInput',
  "reviewed.assetKind !== 'image'",
  'MAX_ROUTE_BYTES',
]);

requireFragments('thumbnail tests', thumbnailTest, [
  'catalog thumbnail constants are explicit and immutable',
  'image asset thumbnail routes become bounded frozen descriptors',
  'missing thumbnail remains truthful absent state',
  'non-image, foreign, malformed, and oversized thumbnails fail closed',
]);

requireFragments('catalog model thumbnail owner', catalogModel, [
  'normalizeThumbnail',
  "route.assetKind !== 'image'",
  'thumbnailCrabUrl',
]);

requireFragments('home catalog panel thumbnail integration', panel, [
  'projectTvCatalogThumbnail',
  'TV_CATALOG_THUMBNAIL_KIND',
  'CatalogCardThumbnail',
  'tv-catalog-thumbnail',
  'data-thumbnail-kind',
]);


if (/<\/span>\s*>\s*<CatalogCardThumbnail/u.test(panelExecutable)) {
  throw new Error('Home catalog panel contains a stray JSX greater-than marker before CatalogCardThumbnail.');
}

requireFragments('thumbnail CSS', css, [
  '.tv-catalog-thumbnail',
  '.tv-catalog-thumbnail--image-route',
  '.tv-catalog-thumbnail--absent',
  '.tv-catalog-thumbnail__preview',
]);

for (const [label, source] of [
  ['thumbnail model', thumbnailExecutable],
  ['home catalog panel', panelExecutable],
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

const tvScripts = tvPackage.scripts ?? {};
const rootScripts = rootPackage.scripts ?? {};

if (
  tvScripts['test:catalog-thumbnail'] !==
  'node --test src/catalog/tvCatalogThumbnailModel.test.mjs'
) {
  throw new Error('TV catalog-thumbnail test script is missing or incorrect.');
}

if (
  tvScripts['check:catalog-thumbnail'] !==
  'node ../../scripts/check-crablink-tv-catalog-thumbnail-boundary.mjs'
) {
  throw new Error('TV catalog-thumbnail boundary script is missing or incorrect.');
}

if (
  !String(tvScripts.check ?? '').includes(
    'npm run test:creator-browse-react && npm run check:creator-browse-react && npm run test:catalog-thumbnail && npm run check:catalog-thumbnail',
  )
) {
  throw new Error('TV acceptance does not run creator browse React then catalog thumbnails.');
}

if (
  rootScripts['tv:catalog-thumbnail:test'] !==
  'npm --prefix apps/crablink-tv run test:catalog-thumbnail'
) {
  throw new Error('Root catalog-thumbnail test script is missing or incorrect.');
}

if (
  rootScripts['tv:catalog-thumbnail:check'] !==
  'node scripts/check-crablink-tv-catalog-thumbnail-boundary.mjs'
) {
  throw new Error('Root catalog-thumbnail boundary script is missing or incorrect.');
}

for (const requiredPath of [
  'apps/crablink-tv/src/catalog/tvCatalogThumbnailModel.js',
  'apps/crablink-tv/src/catalog/tvCatalogThumbnailModel.test.mjs',
  'scripts/check-crablink-tv-catalog-thumbnail-boundary.mjs',
]) {
  if (
    !makeCodebundle.includes(requiredPath) &&
    !codebundleBoundary.includes(requiredPath)
  ) {
    throw new Error(`Future codebundle coverage missing: ${requiredPath}`);
  }
}

console.log('CrabLink TV catalog thumbnail boundary passed.');
console.log('Projection: catalog thumbnails are bounded descriptors from reviewed image asset routes.');
console.log('Rendering: Home cards display local badges, not raw image loads.');
console.log('Authority: no invoke, fetch, storage, image src, wallet, ledger, receipts, rewards, ROC, entitlement, or finality behavior was added.');
console.log('PHASE8D_BOUNDED_CATALOG_THUMBNAILS=GREEN');
console.log('NEXT_PATCH=PHASE9K_LIBRARY_VERIFIED_RENDER_DISPLAY');
